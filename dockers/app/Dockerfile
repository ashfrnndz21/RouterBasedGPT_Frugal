# Multi-stage build for FrugalAIGpt Application (without Ollama)
FROM node:24.5.0-slim AS builder

RUN apt-get update && apt-get install -y python3 python3-pip sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /home/frugalaigpt

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY tsconfig.json next.config.mjs next-env.d.ts postcss.config.js drizzle.config.ts tailwind.config.ts ./
COPY src ./src
COPY public ./public
COPY drizzle ./drizzle

RUN mkdir -p /home/frugalaigpt/data
RUN yarn build

RUN yarn add --dev @vercel/ncc
RUN yarn ncc build ./src/lib/db/migrate.ts -o migrator

# Final stage - Application only (no Ollama)
FROM node:24.5.0-slim

RUN apt-get update && apt-get install -y python3 python3-pip sqlite3 curl && rm -rf /var/lib/apt/lists/*

WORKDIR /home/frugalaigpt

# Copy built application from builder
COPY --from=builder /home/frugalaigpt/public ./public
COPY --from=builder /home/frugalaigpt/.next/static ./public/_next/static
COPY --from=builder /home/frugalaigpt/.next/standalone ./
COPY --from=builder /home/frugalaigpt/data ./data
COPY drizzle ./drizzle
COPY --from=builder /home/frugalaigpt/migrator/build ./build
COPY --from=builder /home/frugalaigpt/migrator/index.js ./migrate.js

# Create necessary directories
RUN mkdir -p /home/frugalaigpt/uploads /home/frugalaigpt/data

# Copy entrypoint script
COPY dockers/app/entrypoint.sh /home/frugalaigpt/entrypoint.sh
RUN chmod +x /home/frugalaigpt/entrypoint.sh
RUN sed -i 's/\r$//' /home/frugalaigpt/entrypoint.sh || true

# Expose application port
EXPOSE 3000

# Set environment variables
ENV DATA_DIR=/home/frugalaigpt
ENV NODE_ENV=production

# Health check - wait for app to start, then check health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["/home/frugalaigpt/entrypoint.sh"]
