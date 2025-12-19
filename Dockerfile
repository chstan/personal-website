FROM node:18-slim

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package management files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the frontend
RUN pnpm build

# Set permissions for scripts
RUN chmod +x scripts/run_continuously.sh

EXPOSE 8001

CMD ["pnpm", "run-in-container"]