# GitHub Actions Workflows

This directory contains automated workflows for CI/CD, security, and maintenance.

## 🔄 Workflows Overview

### [`ci.yml`](./ci.yml) - Continuous Integration
**Triggers**: Push to main/develop, Pull Requests to main
**Purpose**: Validates code quality, runs tests, and ensures builds work across Node.js versions

**Jobs**:
- **test**: Runs on Node.js 18.x, 20.x, 22.x matrix
  - Install dependencies
  - Run linting (when configured)
  - Run tests
  - Build project
  - Verify build artifacts
  - Test CLI functionality

- **build-check**: Creates package tarball and uploads as artifact

### [`release.yml`](./release.yml) - Automated Publishing
**Triggers**: Version tags (`v*.*.*`), Manual workflow dispatch
**Purpose**: Automates npm publishing and GitHub releases

**Features**:
- Manual version bumping (patch/minor/major)
- Automatic changelog generation
- Dry-run capability for testing
- npm publishing with authentication
- GitHub release creation
- Post-release notifications

**Manual Usage**:
```bash
# In GitHub Actions UI:
# 1. Go to Actions → Release
# 2. Click "Run workflow"
# 3. Choose release type
# 4. Optionally enable dry-run
```

### [`npm-audit.yml`](./npm-audit.yml) - Security Monitoring
**Triggers**: Weekly schedule (Mondays 9 AM UTC), package.json changes, Manual dispatch
**Purpose**: Monitors dependencies for security vulnerabilities

**Features**:
- Automated security auditing
- Outdated package detection
- Audit report generation
- PR comments for security issues
- Weekly security reports

### [`dependency-update.yml`](./dependency-update.yml) - Dependency Management
**Triggers**: Monthly schedule (1st day 9 AM UTC), Manual dispatch
**Purpose**: Keeps dependencies up-to-date automatically

**Features**:
- Automated dependency updates
- Test verification after updates
- Automatic PR creation
- Change detection and validation

## 🔧 Required Secrets

Configure these secrets in your GitHub repository:

### `NPM_TOKEN`
- **Purpose**: Publishing to npm registry
- **How to get**: 
  1. Go to [npmjs.com](https://www.npmjs.com) → Account → Access Tokens
  2. Create "Automation" token
  3. Add to GitHub: Settings → Secrets and variables → Actions

### `GITHUB_TOKEN` 
- **Purpose**: Creating releases, commenting on PRs
- **Note**: Automatically provided by GitHub Actions

## 📋 Workflow Files Explained

### Setting Up NPM Publishing

1. **Create npm account** and generate access token
2. **Add NPM_TOKEN secret** to GitHub repository
3. **Push a version tag** or **run release workflow manually**

```bash
# Method 1: Tag-based release
git tag v1.0.0
git push origin v1.0.0

# Method 2: npm version (creates tag automatically)
npm version patch
# This triggers the release workflow
```

### Customizing Workflows

#### Changing Node.js Versions
Edit the matrix in `ci.yml`:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x, latest]
```

#### Adjusting Security Scan Frequency
Edit the cron schedule in `npm-audit.yml`:
```yaml
schedule:
  # Daily at 9 AM UTC
  - cron: '0 9 * * *'
```

#### Modifying Dependency Update Schedule
Edit the cron schedule in `dependency-update.yml`:
```yaml
schedule:
  # Weekly on Sundays
  - cron: '0 9 * * 0'
```

## 🚨 Troubleshooting

### Common Issues

**NPM Publishing Fails**:
- Verify NPM_TOKEN is correctly set
- Check if version already exists on npm
- Ensure package.json version is valid

**Tests Fail in CI**:
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Test locally first: `npm ci && npm test`

**Release Workflow Doesn't Trigger**:
- Ensure tag follows `v*.*.*` pattern
- Check workflow permissions
- Verify GITHUB_TOKEN has necessary permissions

### Debugging Workflows

1. **Check workflow logs** in GitHub Actions tab
2. **Test locally** before pushing:
   ```bash
   npm ci
   npm run build
   npm test
   ```
3. **Use dry-run mode** for release testing
4. **Check secrets configuration** in repository settings

## 📊 Monitoring

### Workflow Status
- ✅ All workflows should pass on main branch
- 🔍 Check Actions tab for workflow history
- 📧 Enable email notifications for failures

### Release Monitoring
- 📦 Verify package appears on [npmjs.com](https://www.npmjs.com/package/pocketbase-zod-generator)
- 🏷️ Check GitHub releases are created
- 📈 Monitor download statistics

## 🔄 Maintenance

### Regular Tasks
- Review dependency update PRs monthly
- Check security audit reports weekly  
- Update Node.js versions in CI matrix annually
- Review and update workflow configurations as needed

### Updating Workflows
1. Test changes in a fork first
2. Use semantic commit messages
3. Document changes in this README
4. Monitor first runs after updates