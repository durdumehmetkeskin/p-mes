# --- build stage: compile TypeScript to dist/ ---
FROM node:22-slim AS build
WORKDIR /app
# The build stage never launches Chromium, so skip puppeteer's bundled download.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime stage: production deps + compiled output only ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Use the OS Chromium for jsreport's chrome-pdf / html-to-xlsx recipes instead
# of puppeteer's bundled build (which lacks the slim image's shared libs).
# Turkish reports need real fonts (dejavu/liberation/noto) or glyphs render as
# boxes. The code passes --no-sandbox in production.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto-core \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
# Entrypoint seeds the admin + report templates then starts the API. In
# production the app also runs pending migrations on boot (migrationsRun=true).
ENTRYPOINT ["./docker-entrypoint.sh"]
