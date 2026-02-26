# ── Base ──
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ── Dependencies ──
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile

# ── Build shared ──
FROM deps AS build-shared
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
RUN pnpm --filter @pm-valet/shared build

# ── Build API ──
FROM build-shared AS api
COPY packages/server/ packages/server/
COPY data/ data/
RUN pnpm --filter @pm-valet/server build
EXPOSE 3001
CMD ["node", "packages/server/dist/index.js"]

# ── Build Web ──
FROM build-shared AS build-web
COPY packages/web/ packages/web/
RUN pnpm --filter @pm-valet/web build

FROM nginx:alpine AS web
COPY --from=build-web /app/packages/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
