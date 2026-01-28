#!/bin/bash
set -e

# 1. Check for clean working directory
if [ -z "$(git status --porcelain)" ]
then 
    echo "✅ Clean working directory."
else 
    echo "❌ You have uncommitted changes. Please commit them."
    exit 1
fi

# 2. Run Pre-commit hooks (Build, Lint, Type-check, Verify Docker, Playwright)
echo "🛠️ Running pre-commit hooks..."
bash .husky/pre-commit

# 3. Docker Login
echo "🔑 Requesting DockerHub credentials..."
docker login

# 4. Tag and Push
GIT_HASH="$(git rev-parse --short HEAD)"
IMAGE_NAME="chstan/personal-website"

echo "🏷️ Tagging and pushing $IMAGE_NAME:$GIT_HASH..."
docker tag personal_website:latest $IMAGE_NAME:$GIT_HASH
docker push $IMAGE_NAME:$GIT_HASH

echo "🏷️ Tagging and pushing $IMAGE_NAME:latest..."
docker tag personal_website:latest $IMAGE_NAME:latest
docker push $IMAGE_NAME:latest

echo "🎉 Done!"
