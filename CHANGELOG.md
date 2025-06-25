# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of pocketbase-zod-generator
- Zod schema generation from PocketBase collections
- Support for select field enums with proper type safety
- CLI interface with multiple input sources (API, SQLite, JSON)
- Programmatic API for library usage
- TypeScript support with full type definitions
- GitHub Actions CI/CD pipelines

### Features
- ✨ Generate Zod schemas from PocketBase collections
- 🔗 Proper enum support for select fields
- 🔄 Multiple input sources: API endpoints, SQLite databases, JSON files
- 🛡️ Full TypeScript support with type definitions
- 📦 Both CLI and programmatic usage
- 🎯 Comprehensive field type support (text, number, email, URL, dates, files, relations, etc.)

## [0.1.0] - 2025-01-XX

### Added
- Initial package structure and build system
- Core functionality for schema generation
- CLI implementation with commander.js
- TypeScript configuration and build pipeline
- Documentation and examples
- MIT license with proper attribution to original pocketbase-typegen project

### Technical
- Modular architecture with separate concerns
- TypeScript interfaces for all data structures
- Comprehensive error handling
- Build system with declaration file generation
- npm package configuration for publishing