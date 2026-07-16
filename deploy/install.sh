#!/usr/bin/env bash
# =============================================================================
# QUA-MES production installer (Ubuntu/Debian server, run from the REPO ROOT).
#
#   sudo bash deploy/install.sh
#
# TLS: the domains sit behind CLOUDFLARE — SSL terminates at the Cloudflare
# edge, so NO certificate is issued here. nginx serves plain HTTP on :80 to
# Cloudflare (SSL mode "Flexible" works as-is; for "Full (strict)" install a
# Cloudflare Origin Certificate — see deploy/README.md and the commented 443
# blocks in the nginx confs).
#
# What it does:
#   1. Checks docker + compose, installs nginx if missing.
#   2. Verifies the loopback ports 3020/3021 are free (the forbidden ports
#      8090, 3010, 5432, 3000, 1337, 9000, 9001, 6379 are never used).
#   3. Creates .env.prod from .env.prod.example with generated secrets.
#   4. Builds + starts the stack (docker-compose.prod.yml):
#        - db / minio / pgadmin: NO host ports (docker network only)
#        - backend  -> 127.0.0.1:3020, frontend -> 127.0.0.1:3021
#   5. Installs the nginx sites for
#        quanta-mes-api.durdumehmetkeskin.space  -> 127.0.0.1:3020
#        quanta-mes.durdumehmetkeskin.space      -> 127.0.0.1:3021
#      and reloads nginx.
#   6. Smoke-tests both vhosts locally (Host header) + best-effort via
#      Cloudflare.
#
# Prereq: both DNS records exist in Cloudflare (proxied/orange cloud) and
# point at this server; the repo (with the logo/ folder) is on the server.
# =============================================================================
set -euo pipefail

API_DOMAIN="quanta-mes-api.durdumehmetkeskin.space"
APP_DOMAIN="quanta-mes.durdumehmetkeskin.space"
BACKEND_PORT=3020
FRONTEND_PORT=3021
COMPOSE=(docker compose -p quanta-mes -f docker-compose.prod.yml --env-file .env.prod)

log()  { echo -e "\e[1;32m[quanta-mes]\e[0m $*"; }
fail() { echo -e "\e[1;31m[quanta-mes] HATA:\e[0m $*" >&2; exit 1; }

[[ -f docker-compose.prod.yml ]] || fail "Repo kökünden çalıştırın (docker-compose.prod.yml bulunamadı)."
[[ $EUID -eq 0 ]] || fail "root/sudo ile çalıştırın."

# --- 1. prerequisites --------------------------------------------------------
command -v docker >/dev/null || fail "docker kurulu değil (https://docs.docker.com/engine/install/)."
docker compose version >/dev/null 2>&1 || fail "docker compose plugin kurulu değil."
if ! command -v nginx >/dev/null; then
  log "nginx kuruluyor..."
  apt-get update -qq && apt-get install -y -qq nginx
fi

# --- 2. port safety ----------------------------------------------------------
for p in $BACKEND_PORT $FRONTEND_PORT; do
  if ss -ltn "sport = :$p" | grep -q LISTEN; then
    fail "Port $p kullanımda — .env.prod'da BACKEND_HOST_PORT/FRONTEND_HOST_PORT'u ve nginx conf'larını birlikte değiştirin."
  fi
done
log "Loopback portları boş: $BACKEND_PORT (api), $FRONTEND_PORT (frontend)."

# --- 3. .env.prod ------------------------------------------------------------
if [[ ! -f .env.prod ]]; then
  log ".env.prod oluşturuluyor (güçlü rastgele parolalarla)..."
  gen() { openssl rand -base64 33 | tr -d '/+=' | cut -c1-24; }
  DB_PW="$(gen)"; ADMIN_PW="$(gen)"; MINIO_PW="$(gen)"; PGADMIN_PW="$(gen)"
  JWT="$(openssl rand -base64 48 | tr -d '\n')"
  sed -e "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PW}|" \
      -e "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" \
      -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PW}|" \
      -e "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=${MINIO_PW}|" \
      -e "s|^PGADMIN_PASSWORD=.*|PGADMIN_PASSWORD=${PGADMIN_PW}|" \
      .env.prod.example > .env.prod
  chmod 600 .env.prod
  log "Admin girişi: ADMIN_EMAIL / ADMIN_PASSWORD .env.prod içinde — kaydedin!"
else
  log ".env.prod zaten var — dokunulmadı."
fi

# --- 4. build + start the stack ----------------------------------------------
log "Docker imajları derleniyor ve stack başlatılıyor (ilk derleme uzun sürer)..."
"${COMPOSE[@]}" up -d --build

log "Backend'in ayağa kalkması bekleniyor..."
for i in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:${BACKEND_PORT}/docs"; then break; fi
  [[ $i -eq 60 ]] && fail "Backend 5 dakikada ayağa kalkmadı: ${COMPOSE[*]} logs backend"
  sleep 5
done
log "Backend hazır (migrations + seed otomatik uygulandı)."

# --- 5. nginx sites ------------------------------------------------------------
log "nginx konfigürasyonları kuruluyor..."
install -m 644 deploy/nginx/quanta-mes-ratelimit.conf /etc/nginx/conf.d/quanta-mes-ratelimit.conf
# Cloudflare arkasında gerçek istemci IP'sini geri kazan (rate limit + loglar
# ziyaretçi IP'sine göre işlesin). Sunucuda zaten CF real-ip tanımlıysa ve
# nginx -t "duplicate" hatası verirse bu dosyayı silmeniz yeterli.
install -m 644 deploy/nginx/quanta-mes-cloudflare-realip.conf /etc/nginx/conf.d/quanta-mes-cloudflare-realip.conf
for d in "$API_DOMAIN" "$APP_DOMAIN"; do
  install -m 644 "deploy/nginx/${d}.conf" "/etc/nginx/sites-available/${d}.conf"
  ln -sf "/etc/nginx/sites-available/${d}.conf" "/etc/nginx/sites-enabled/${d}.conf"
done
nginx -t || fail "nginx -t başarısız — conf'ları kontrol edin."
systemctl reload nginx
log "nginx yeniden yüklendi: http://${API_DOMAIN} + http://${APP_DOMAIN}"

# --- 6. smoke test --------------------------------------------------------------
# TLS Cloudflare'de sonlanır; origin nginx :80'de servis eder. Önce vhost'ları
# yerel olarak (Host başlığıyla) doğrula, sonra Cloudflare üzerinden dene.
api_local=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${API_DOMAIN}" "http://127.0.0.1/docs" || true)
app_local=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${APP_DOMAIN}" "http://127.0.0.1/" || true)
log "Yerel vhost testi: API /docs -> ${api_local}, frontend / -> ${app_local} (ikisi de 200 olmalı)."
api_cf=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 "https://${API_DOMAIN}/docs" || true)
app_cf=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 "https://${APP_DOMAIN}/" || true)
log "Cloudflare üzerinden: API -> ${api_cf}, frontend -> ${app_cf} (DNS/proxy hazırsa 200)."

cat <<EOF

============================================================
 QUA-MES kurulumu tamam.
   Frontend : https://${APP_DOMAIN}
   API      : https://${API_DOMAIN}/api   (Swagger: /docs)
   Admin    : .env.prod içindeki ADMIN_EMAIL / ADMIN_PASSWORD

 SSL Cloudflare'de sonlanır (origin :80). Cloudflare panelinde:
   - Her iki kayıt Proxied (turuncu bulut) olmalı.
   - SSL/TLS modu "Flexible" bu haliyle çalışır; "Full (strict)" için
     Cloudflare Origin Certificate kurun (deploy/README.md).

 db / minio / pgadmin dışarıya KAPALI (yalnız docker network).
 Loglar    : ${COMPOSE[*]} logs -f backend
 Güncelleme: git pull && ${COMPOSE[*]} up -d --build
============================================================
EOF
