# 🚀 Deployment Guide

This document outlines how to deploy and publish the `pocketbase-zod-generator` package.

## 📋 Prerequisites

Before deploying, ensure you have:

1. **NPM Account**: [Create account](https://www.npmjs.com/signup) if needed
2. **NPM Access Token**: Generate automation token from [npmjs.com](https://www.npmjs.com/settings/tokens)
3. **GitHub Repository**: With Actions enabled
4. **Repository Secrets**: Configure required secrets

## 🔐 Required Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### `NPM_TOKEN`
```bash
# Get this from npmjs.com → Account → Access Tokens
# Create "Automation" token with "Publish" permission
```

### Repository Permissions
Ensure the repository has:
- **Actions**: Read and write permissions
- **Contents**: Write permissions (for creating releases)
- **Metadata**: Read permissions

## 🎯 Deployment Methods

### Method 1: Automated Release (Recommended)

#### Via GitHub Actions UI
1. Go to your repository → **Actions** tab
2. Select **"Release"** workflow
3. Click **"Run workflow"**
4. Configure options:
   - **Release type**: `patch` | `minor` | `major`
   - **Dry run**: `false` (or `true` to test first)
5. Click **"Run workflow"**

#### Via Command Line
```bash
# Bump version and trigger release
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.0 → 0.2.0  
npm version major   # 0.1.0 → 1.0.0

# This automatically:
# 1. Updates package.json version
# 2. Creates git tag
# 3. Pushes to GitHub
# 4. Triggers release workflow
```

### Method 2: Manual Release

```bash
# 1. Update version
npm version patch

# 2. Build the package
npm run build

# 3. Test the package
npm pack --dry-run

# 4. Publish to npm
npm publish

# 5. Create GitHub release manually
gh release create v$(node -p "require('./package.json').version") \
  --title "Release v$(node -p "require('./package.json').version")" \
  --notes "See CHANGELOG.md for details"
```

### Method 3: Tag-Based Release

```bash
# Create and push version tag
git tag v1.0.0
git push origin v1.0.0

# This triggers the release workflow automatically
```

## 📦 Release Process

The automated release process includes:

1. **Version Validation**: Ensures version is valid and unique
2. **Build & Test**: Compiles TypeScript and runs tests
3. **Changelog Update**: Automatically updates CHANGELOG.md
4. **NPM Publishing**: Publishes to npm registry
5. **GitHub Release**: Creates GitHub release with notes
6. **Verification**: Runs post-release verification tests

## 🔍 Pre-Release Checklist

Before releasing, verify:

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] CLI works: `node dist/cli.js --help`
- [ ] Package is correctly configured: `npm pack --dry-run`
- [ ] CHANGELOG.md is updated
- [ ] README.md is current
- [ ] Version number follows [SemVer](https://semver.org/)

## 🧪 Testing Releases

### Dry Run Release
```bash
# Test release without publishing
npm publish --dry-run

# Or use GitHub Actions dry-run option
```

### Pre-Release Versions
```bash
# Create pre-release version
npm version prerelease --preid=beta
# Example: 1.0.0 → 1.0.1-beta.0

# Publish with beta tag
npm publish --tag beta
```

### Local Testing
```bash
# Test installation locally
npm pack
npm install -g ./pocketbase-zod-generator-*.tgz
pocketbase-zod-generator --help
```

## 📊 Post-Release Verification

After release, verify:

1. **NPM Package**: Check [npmjs.com/package/pocketbase-zod-generator](https://www.npmjs.com/package/pocketbase-zod-generator)
2. **GitHub Release**: Verify release appears in GitHub
3. **Installation**: Test `npm install -g pocketbase-zod-generator`
4. **Functionality**: Test CLI and programmatic usage

## 🚨 Troubleshooting

### Common Issues

**"Version already exists"**
```bash
# Check current published version
npm view pocketbase-zod-generator version

# Bump to next version
npm version patch
```

**"Authentication failed"**
```bash
# Verify NPM_TOKEN is correctly set in GitHub secrets
# Check token permissions on npmjs.com
```

**"Build fails in CI"**
```bash
# Test locally first
npm ci
npm run build
npm test
```

**"Release workflow doesn't trigger"**
```bash
# Check tag format (must be v*.*.*)
git tag -l
git push origin --tags
```

### Recovery Steps

**Rollback Release**
```bash
# Unpublish from npm (within 24 hours)
npm unpublish pocketbase-zod-generator@1.0.0

# Delete GitHub release
gh release delete v1.0.0

# Delete git tag
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
```

## 📈 Monitoring

### Release Metrics
- **Download Stats**: [npm-stat.com](https://npm-stat.com/charts.html?package=pocketbase-zod-generator)
- **Bundle Size**: [bundlephobia.com](https://bundlephobia.com/package/pocketbase-zod-generator)
- **Dependencies**: [deps.dev](https://deps.dev/npm/pocketbase-zod-generator)

### GitHub Insights
- Monitor Actions workflow success rate
- Track issue/PR activity post-release
- Review download/usage statistics

## 🔄 Maintenance Releases

### Patch Releases (Bug Fixes)
```bash
npm version patch
# Automatically deploys via CI/CD
```

### Minor Releases (New Features)
```bash
npm version minor
# Update README.md with new features
# Update examples if needed
```

### Major Releases (Breaking Changes)
```bash
npm version major
# Update CHANGELOG.md with migration guide
# Update README.md with new API
# Consider deprecation notices
```

## 📞 Support

If you encounter deployment issues:

1. **Check workflow logs** in GitHub Actions
2. **Review this guide** for common solutions
3. **Open an issue** with deployment logs
4. **Contact maintainers** for urgent issues

---

**Happy Deploying! 🚀**