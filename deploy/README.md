# QUA-MES Production Deploy

Hedef: tek Ubuntu/Debian sunucu, host **nginx**, docker compose stack.
**SSL Cloudflare'de sonlanır** (alan adı Cloudflare'e bağlı, sertifika oradan)
— sunucuda Let's Encrypt/certbot YOKTUR; origin nginx :80'de HTTP servis eder.

| Bileşen  | Erişim |
| -------- | ------ |
| Frontend | https://quanta-mes.durdumehmetkeskin.space → 127.0.0.1:3021 |
| API      | https://quanta-mes-api.durdumehmetkeskin.space → 127.0.0.1:3020 (Swagger `/docs`) |
| Postgres / MinIO / pgAdmin | **Host portu YOK** — yalnız docker network |

Sunucuda kullanılan portlarla (8090, 3010, 5432, 3000, 1337, 9000, 9001, 6379)
çakışmamak için loopback portları **3020/3021** seçildi (`.env.prod` ile
değiştirilebilir; nginx conf'larını da güncelleyin).

## Kurulum

```bash
# 1. Cloudflare DNS: iki kaydı sunucu IP'sine yönlendirin, PROXIED (turuncu
#    bulut) olsun:
#    quanta-mes.durdumehmetkeskin.space     -> <sunucu IP>
#    quanta-mes-api.durdumehmetkeskin.space -> <sunucu IP>

# 2. Repoyu sunucuya kopyalayın (logo/ klasörü dahil), köküne geçin
git clone <repo> quanta-mes && cd quanta-mes   # veya rsync/scp

# 3. Kurulum scripti (root)
sudo bash deploy/install.sh
```

Script; `.env.prod`'u güçlü rastgele parolalarla üretir (admin parolası dahil —
**`.env.prod`'u saklayın, paylaşmayın**), stack'i derleyip başlatır
(migrasyonlar + admin/rapor seed'leri boot'ta otomatik), nginx sitelerini kurar
ve vhost'ları test eder.

## Cloudflare SSL

- **Flexible** (tarayıcı→CF https, CF→origin http:80): kurulum bu haliyle
  çalışır, ekstra adım yok.
- **Full (strict)** önerilir (CF→origin da şifreli): Cloudflare panelinden
  *SSL/TLS → Origin Server → Create Certificate* ile bir **Origin Certificate**
  üretin, `/etc/ssl/cloudflare/quanta-mes-origin.pem` + `.key` olarak koyun ve
  iki site conf'unun sonundaki yorumlu 443 bloklarını açıp
  `nginx -t && systemctl reload nginx`.
- `conf.d/quanta-mes-cloudflare-realip.conf` gerçek ziyaretçi IP'sini geri
  kazandırır (rate limit + loglar CF edge IP'sine değil istemciye göre işler);
  sunucuda zaten CF real-ip tanımlıysa ve `nginx -t` "duplicate" derse bu
  dosyayı silin. IP listesi: https://www.cloudflare.com/ips/

## İşletme

```bash
alias qm='docker compose -p quanta-mes -f docker-compose.prod.yml --env-file .env.prod'
qm logs -f backend          # loglar
qm up -d --build            # güncelleme (git pull sonrası)
qm exec db psql -U quanta_mes -d p_mes   # veritabanı konsolu
```

- `VITE_API_URL` build sırasında gömülür — API alan adı değişirse
  `qm up -d --build frontend` şart.
- pgAdmin'e geçici erişim: `docker-compose.prod.yml`'de pgadmin'e
  `127.0.0.1:5050:80` portunu ekleyip `qm up -d pgadmin`, işiniz bitince geri
  alın; ya da SSH tüneli kullanın.
- Yedek: `qm exec db pg_dump -U quanta_mes p_mes > yedek.sql` + `miniodata`
  volume'u.
