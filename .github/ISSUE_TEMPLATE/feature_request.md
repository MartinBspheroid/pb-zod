---
name: Feature request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## 🚀 Feature Description
A clear and concise description of the feature you'd like to see added.

## 💡 Motivation
Why do you want this feature? What problem does it solve?
- **Problem**: What specific issue are you facing?
- **Use Case**: How would you use this feature?
- **Benefit**: How would this improve your workflow?

## 📋 Detailed Description

### What should happen?
Describe the behavior you'd like to see.

### How should it work?
Provide details about the implementation you envision.

## 💻 Example Usage

### CLI Example
```bash
# How you'd like to use the feature via CLI
pocketbase-zod-generator --new-feature-flag value
```

### Programmatic Example
```typescript
// How you'd like to use the feature programmatically
import { generateZodSchemas } from 'pocketbase-zod-generator';

const schemas = await generateZodSchemas({
  // new feature configuration
  newFeature: true,
  newFeatureOptions: { ... }
});
```

### Expected Output
```typescript
// What the generated output should look like
export const ExampleSchema = z.object({
  // new feature results
});
```

## 🔄 Alternatives Considered
Describe any alternative solutions or features you've considered.

## 📚 Additional Context
Add any other context, screenshots, or examples about the feature request here.

## 🎯 Implementation Ideas
If you have ideas about how this could be implemented, please share them:
- Technical approach
- Potential challenges
- Breaking changes considerations
- Backward compatibility

## 📊 Priority
How important is this feature to you?
- [ ] Nice to have
- [ ] Would be helpful
- [ ] Important for my workflow
- [ ] Critical/blocking issue

## 🤝 Contribution
Are you willing to contribute to implementing this feature?
- [ ] Yes, I can implement this
- [ ] Yes, I can help with testing
- [ ] Yes, I can help with documentation
- [ ] I can provide feedback during development
- [ ] No, but I'd love to see it implemented