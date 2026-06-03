FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/src apps/api/src
COPY apps/web apps/web
COPY migrations migrations

RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web apps/web
COPY --from=build /app/migrations migrations
COPY apps/api/docker-entrypoint.sh /usr/local/bin/etna-api-entrypoint

RUN chmod +x /usr/local/bin/etna-api-entrypoint

EXPOSE 3000

CMD ["etna-api-entrypoint"]

