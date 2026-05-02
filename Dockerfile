# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./ 
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# Stage 2: Serve
FROM node:22-slim

WORKDIR /app

# Install 'serve' and 'curl' for healthchecks
RUN apt-get update && apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g serve

# Copy only the build output from the builder stage
COPY --from=builder /app/build ./build

# Run as non-root user for security
USER node

ENV PORT=8001
EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8001}/ || exit 1

# Shell form so $PORT is honored at runtime (Railway, Fly, etc. inject it).
CMD serve build -l ${PORT:-8001}
