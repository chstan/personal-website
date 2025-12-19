# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies (cached if package.json/lockfile don't change)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# Stage 2: Serve
FROM node:22-slim

WORKDIR /app

# Install 'serve' globally in the runner stage (lightweight)
RUN npm install -g serve

# Copy only the build output from the builder stage
COPY --from=builder /app/build ./build

# Run as non-root user for security
USER node

EXPOSE 8001

CMD ["serve", "build", "-l", "8001"]