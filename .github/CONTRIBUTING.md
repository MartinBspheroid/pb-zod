# Contributing to PocketBase Zod Generator

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- Git

### Development Setup
```bash
# Clone the repository
git clone https://github.com/martinblasko/pocketbase-zod-generator.git
cd pocketbase-zod-generator

# Install dependencies
npm install

# Build the project
npm run build

# Test the CLI
npm run dev -- --help
```

## 📋 Development Workflow

### Making Changes
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test your changes: `npm run build && npm test`
5. Commit your changes: `git commit -m "feat: your feature description"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Create a Pull Request

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## 🔧 Development Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build the TypeScript project |
| `npm run clean` | Clean the dist directory |
| `npm run dev` | Run the CLI in development mode |
| `npm test` | Run tests |
| `npm run lint` | Run linting (when configured) |

## 📦 Release Process

### Automated Releases
Releases are automated through GitHub Actions:

1. **Manual Release**: Use the GitHub Actions "Release" workflow
   - Go to Actions → Release → Run workflow
   - Choose release type (patch/minor/major)
   - Optionally run as dry-run first

2. **Tag-based Release**: Push a version tag
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

### Manual Release (Maintainers)
```bash
# Bump version
npm version patch|minor|major

# This automatically:
# - Updates package.json version
# - Creates a git tag
# - Pushes to GitHub
# - Triggers the release workflow
```

## 🔍 CI/CD Pipelines

### Continuous Integration (`ci.yml`)
- **Trigger**: Push to main/develop, PRs to main
- **Matrix**: Tests on Node.js 18.x, 20.x, 22.x
- **Steps**: Install → Lint → Test → Build → Verify

### Release Pipeline (`release.yml`)
- **Trigger**: Version tags, manual workflow dispatch
- **Steps**: Build → Test → Publish to npm → Create GitHub release

### Security Audit (`npm-audit.yml`)
- **Trigger**: Weekly schedule, package.json changes
- **Steps**: Audit dependencies → Generate reports → Comment on PRs

### Dependency Updates (`dependency-update.yml`)
- **Trigger**: Monthly schedule, manual dispatch
- **Steps**: Update deps → Test → Create PR if changes

## 🧪 Testing

Currently, the project uses basic smoke tests. We welcome contributions to:
- Add unit tests for core functions
- Add integration tests for CLI functionality
- Add end-to-end tests with real PocketBase instances

## 🛡️ Security

- All dependencies are automatically audited weekly
- Security vulnerabilities are reported in PRs
- Use `npm audit fix` to resolve known issues

## 📝 Documentation

When contributing:
- Update README.md for user-facing changes
- Update this CONTRIBUTING.md for development changes
- Add JSDoc comments for new functions
- Update examples if API changes

## 🤝 Getting Help

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Security**: Email security issues privately to maintainers

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- README.md for major features