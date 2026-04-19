# apps/web/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
RUN npm i -g pnpm@9

FROM base AS builder
COPY . .
RUN pnpm install
WORKDIR /app/apps/web
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
ENV PORT 3000
CMD ["node", "apps/web/server.js"]
