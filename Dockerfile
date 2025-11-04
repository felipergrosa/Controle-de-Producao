# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
# Dependências de compilação necessárias para mysql2
RUN apk add --no-cache python3 make g++
RUN pnpm install --no-frozen-lockfile

FROM deps AS build
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm build

FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
# Dependências de compilação necessárias para mysql2
RUN apk add --no-cache python3 make g++
# Instalar todas as dependências (incluindo vite) pois o servidor precisa delas em runtime
RUN pnpm install --no-frozen-lockfile

FROM base AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./package.json
# Copiar apenas migrations SQL (o script migrate.js já está compilado em dist/)
COPY --from=build /app/migrations ./migrations
EXPOSE 5000
CMD ["node", "dist/index.js"]
