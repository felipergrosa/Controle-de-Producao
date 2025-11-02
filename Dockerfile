# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json ./
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
COPY package.json ./
COPY patches ./patches
# Dependências de compilação necessárias para mysql2
RUN apk add --no-cache python3 make g++
RUN pnpm install --prod --no-frozen-lockfile

FROM base AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./package.json
EXPOSE 5000
CMD ["node", "dist/index.js"]
