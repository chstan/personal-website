#!/bin/bash
set -e

echo "🐳 Building Docker image..."
pnpm docker:build

echo "🚀 Starting container..."
# Run container in background, mapping port 8001
CONTAINER_ID=$(docker run -d -p 8001:8001 personal_website)

# Function to clean up container on exit
cleanup() {
  echo "🧹 Cleaning up..."
  docker stop $CONTAINER_ID
  docker rm $CONTAINER_ID
}
trap cleanup EXIT

echo "⏳ Waiting for server to start..."
sleep 5

echo "mw Testing endpoint..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001 | grep 200 > /dev/null; then
  echo "✅ Success! Site is serving 200 OK."
else
  echo "❌ Failure! Site did not return 200 OK."
  docker logs $CONTAINER_ID
  exit 1
fi
