# --- build stage: produce the static SPA bundle ---
FROM node:22-slim AS build
WORKDIR /app
# API base URL is baked into the bundle at build time (Vite). The browser runs
# on the host, so it must reach the backend on the host-published port.
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
# Refine + React 19 has peer-dep conflicts that strict resolution rejects.
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# --- runtime stage: serve the static files as a single-page app ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
# -s = SPA fallback so client-side routes (/login, /users, ...) work on reload.
CMD ["serve", "-s", "dist", "-l", "3000"]
