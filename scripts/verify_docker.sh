#!/bin/bash
set -e

echo "🐳 Building Docker image..."
pnpm docker:build

echo "🚀 Starting container..."
# Run container in background, mapping port 8001
# Use -p 8001:8001 explicitly.
CONTAINER_ID=$(docker run -d -p 8001:8001 personal_website)

# Function to clean up container on exit
cleanup() {
  echo "🧹 Cleaning up..."
  docker stop $CONTAINER_ID > /dev/null
  docker rm $CONTAINER_ID > /dev/null
}
trap cleanup EXIT

echo "⏳ Waiting for server to start (with retries)..."
MAX_RETRIES=30
COUNT=0
SUCCESS=0

until [ $COUNT -ge $MAX_RETRIES ]; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001 | grep 200 > /dev/null; then
    SUCCESS=1
    break
  fi
  COUNT=$((COUNT+1))
  sleep 1
done

if [ $SUCCESS -eq 1 ]; then
  echo "✅ Success! Site is serving 200 OK."
else
  echo "❌ Failure! Site did not return 200 OK after $MAX_RETRIES seconds."
  echo "--- DOCKER LOGS ---"
  docker logs $CONTAINER_ID
  exit 1
fi