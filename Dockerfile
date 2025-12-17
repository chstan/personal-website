FROM node:18-slim

WORKDIR /app

# Enable Yarn 3.1.1
COPY .yarn ./.yarn
COPY .yarnrc.yml package.json yarn.lock ./
RUN corepack enable && yarn install --immutable

# Copy the rest of the application
COPY . .

# Build the frontend
RUN yarn build

# Set permissions for scripts
RUN chmod +x scripts/run_continuously.sh

EXPOSE 8001

CMD ["yarn", "run-in-container"]