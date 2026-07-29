# Pull Request

## 📋 Description
Brief description of what this PR does.

Fixes # (issue number, if applicable)

## 🔄 Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Maintenance/refactoring
- [ ] 🧪 Test improvements

## 🧪 Testing
- [ ] Tests pass locally with my changes
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have tested the CLI functionality manually

### Test Commands Run
```bash
npm run check        # typecheck + lint + unit tests — required
npm run build
node dist/cli.mjs --help
npm run test:e2e     # required for changes to mapping, emission, or the fetchers
```

## 📋 Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules

## 📚 Documentation
- [ ] README.md updated (if needed)
- [ ] CHANGELOG.md updated
- [ ] JSDoc comments added/updated for new functions
- [ ] Examples updated (if API changed)

## 🔄 Related Issues
List any related issues here:
- Closes #
- Related to #
- Depends on #

## 📱 Environment Tested
- **OS**: [e.g. macOS, Ubuntu, Windows]
- **Node.js**: [e.g. 22.11.0 — the package requires ≥ 22.5]
- **npm**: [e.g. 10.9.0]
- **Zod target**: [4 / 3 / both]

## 📎 Additional Notes
Any additional information about this PR:
- Breaking changes and migration guide
- Performance implications
- Security considerations
- Deployment notes

## 📸 Screenshots (if applicable)
Include screenshots of CLI output, generated schemas, or other visual changes.

## 🔍 Review Focus Areas
Highlight specific areas where you'd like reviewer attention:
- [ ] Logic in [specific file/function]
- [ ] Performance implications
- [ ] Error handling
- [ ] TypeScript types
- [ ] CLI interface changes
- [ ] Generated schema output