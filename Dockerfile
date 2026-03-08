FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . .

FROM oven/bun:latest

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/instructions.txt ./instructions.txt
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD bun -e "fetch('http://localhost:3000/up').then(r => r.status === 200 ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]