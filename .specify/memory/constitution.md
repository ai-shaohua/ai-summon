<!--
Sync Impact Report:
- Version change: new → 1.0.0
- New constitution creation with 5 core principles
- Added sections: Technology Standards, Development Workflow
- Templates requiring updates: ✅ updated validation complete
- Follow-up TODOs: none
-->

# hsh19900502 Constitution

## Core Principles

### I. TypeScript-First Development

All code MUST be written in TypeScript with strict mode enabled. Every function, interface, and module must be fully typed. No `any` types allowed except for external library integrations where types are unavailable. ESM modules MUST be used throughout the codebase with proper import/export syntax.

_Rationale: Type safety prevents runtime errors and enables better tooling, refactoring, and code maintenance._

### II. Shell Integration via zx

All shell operations MUST use the zx library with template literals (`$` syntax). Direct shell command execution or child_process usage is prohibited. All shell operations MUST be async/await with proper error handling.

_Rationale: zx provides consistent shell execution across platforms with better error handling and TypeScript integration._

### III. Interactive CLI Design

Every user-facing operation MUST use inquirer prompts with validation, default values, and autocomplete where applicable. Commands should provide immediate feedback using chalk for colored output and ora for progress indicators. All user input must be validated before execution.

_Rationale: Interactive prompts reduce user errors and improve the developer experience by providing guidance and validation._

### IV. Modular Command Architecture

Commands MUST be organized by domain (git, mono, ide) in separate modules. Each command module exports specific functions that handle business logic. The main CLI file (hsh.ts) should only define command interfaces and delegate to domain modules.

_Rationale: Separation of concerns improves maintainability and allows for easier testing and extension of functionality._

### V. Yarn Package Management

All dependency management MUST use Yarn. Package.json scripts MUST follow established patterns: `build` for TypeScript compilation, `dev` for development with ts-node, `start` for running compiled code. Global installation must be supported via the `bin` field.

_Rationale: Yarn provides consistent dependency resolution and better performance. Standardized scripts ensure consistent development workflow._

## Technology Standards

**Language**: TypeScript 5.0+ with ES2020 target and ESNext modules
**Package Manager**: Yarn (required for all operations)
**Shell Integration**: zx library with `$` template literals
**CLI Framework**: Commander.js for command parsing
**User Interface**: inquirer for prompts, chalk for colors, ora for progress
**Build System**: TypeScript compiler with declaration files
**Module System**: ES modules with .js extensions in imports
**Project Structure**: src/ for source, dist/ for compiled output

## Development Workflow

**Build Process**: `yarn build` compiles TypeScript to dist/ with declarations
**Development**: `yarn dev` runs with ts-node for immediate feedback
**Installation**: `yarn build:install` for global testing
**Code Organization**: Domain-based modules in src/commands/
**Configuration**: External config files (~/hsh.config.json for IDE commands)
**Error Handling**: Chalk colors for user feedback, async/await for all operations

## Governance

This constitution supersedes all other development practices. All code changes must comply with these principles. Non-compliance requires explicit justification and approval through code review. The TypeScript compiler enforces type safety; builds that fail TypeScript compilation are not acceptable.

**Amendment Process**: Constitutional changes require documentation of rationale, impact assessment, and template synchronization. Breaking changes to core principles require major version bump.

**Compliance Review**: All PRs must verify TypeScript compilation, proper error handling, and adherence to modular architecture. Manual testing of CLI functionality is required for user-facing changes.

**Version**: 1.0.0 | **Ratified**: 2025-10-11 | **Last Amended**: 2025-10-11
