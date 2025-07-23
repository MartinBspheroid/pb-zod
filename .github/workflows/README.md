# GitHub Actions Workflows

Simple and streamlined CI/CD for pocketbase-zod-generator.

## 🔄 Workflows

### CI (`ci.yml`)
- **Triggers**: Push to main, Pull Requests to main
- **Purpose**: Build and test the project
- **Steps**: Install → Build → Test CLI

### Release (`release.yml`)  
- **Triggers**: Version tags (`v*`)
- **Purpose**: Publish to npm and create GitHub releases
- **Steps**: Install → Build → Publish → Release

## 📦 Release Process

1. Update version in package.json
2. Create and push a git tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. The release workflow automatically publishes to npm and creates a GitHub release

## 🔧 Required Secrets

- `NPM_TOKEN`: npm automation token for publishing