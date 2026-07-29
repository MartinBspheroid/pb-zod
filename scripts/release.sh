#!/bin/bash

# Simple release script for local development
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

RELEASE_TYPE=${1:-patch}

echo "🚀 Starting release process..."

# Ensure we're on main branch
if [ "$(git branch --show-current)" != "main" ]; then
    echo "❌ Please switch to main branch first"
    exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Please commit all changes first"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Run tests and build
echo "🧪 Running tests..."
npm test

echo "🔨 Building project..."
npm run build

# Update version
echo "📝 Bumping version ($RELEASE_TYPE)..."
npm version $RELEASE_TYPE --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
echo "📦 New version: $NEW_VERSION"

# Create tag and push
echo "🏷️ Creating git tag..."
git add package.json
git commit -m "chore: bump version to v$NEW_VERSION"
git tag "v$NEW_VERSION"

echo "📤 Pushing to GitHub..."
git push origin main --follow-tags

echo "✅ Release v$NEW_VERSION completed!"
echo "🎯 GitHub Actions will handle publishing to npm"
echo "🔗 Monitor progress: https://github.com/MartinBspheroid/pb-zod/actions"