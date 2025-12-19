#!/bin/bash
if [ -z "$(git status --porcelain)" ]
then 
    echo "Clean working directory. Tagging..."
else 
    echo "You have uncommitted changes. Please commit them."
    exit 1 || return 1
fi

echo "Rebuilding image..."
pnpm docker:build

echo "Requesting DockerHub credentials..."
docker login

GIT_HASH="$(git rev-parse --short HEAD)"
docker tag personal_website:latest chstan/personal-website:$GIT_HASH
docker push chstan/personal-website:$GIT_HASH
