# syntax=docker/dockerfile:1

# ---- base : Node + OpenSSL (requis par le moteur Prisma) ----
FROM node:22-bookworm-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- build : toutes les dépendances, client Prisma, compilation TypeScript ----
FROM base AS build
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p . && rm -rf dist/src/tests dist/prisma

# ---- prod-deps : uniquement les dépendances de production ----
# --omit=optional : @prisma/client déclare le CLI « prisma » comme dépendance de pair optionnelle ;
# sans ce drapeau, tout le CLI (outil de dev, 120 Mo, avec ses vulnérabilités) finit dans l'image.
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts

# ---- runtime : image finale, minimale, sans outils de build ----
FROM base AS runtime
ENV NODE_ENV=production PORT=3000
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/src/server.js"]
