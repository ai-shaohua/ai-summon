# Implementation Plan: Cloud Login Command

**Branch**: `001-cloud-login-feature` | **Date**: 2025-10-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-cloud-login-feature/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a new `hsh cloud login` command that enables SSH connections to cloud instances based on environment (dev/staging/prod) and service (todo-mini, wuhan-mall) parameters. The feature includes restructuring the configuration file to support both existing IDE commands and new cloud infrastructure mappings, ensuring backward compatibility while enabling scalable cloud access management.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.0+ with ES2020 target and ESNext modules
**Primary Dependencies**: commander (CLI), inquirer (prompts), zx (shell), chalk (colors), ora (progress)
**Storage**: JSON config files (~/.hsh/config.json) with nested structure for repos and cloud infrastructure
**Testing**: Manual CLI testing for SSH connections and configuration validation
**Target Platform**: Node.js CLI (global installation via npm/yarn)
**Project Type**: Single CLI application extending existing command structure
**Performance Goals**: Command execution <2 seconds (excluding SSH connection time), instant config validation
**Constraints**: SSH client system dependency, private key files per environment configuration, backward compatibility with existing config structure
**Scale/Scope**: Support for multiple services (todo-mini, wuhan-mall), 3 environments per service, existing IDE command migration

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

✅ **TypeScript-First**: All code written in TypeScript with strict mode, fully typed
✅ **Shell Integration**: Uses zx library for all shell operations with async/await
✅ **Interactive CLI**: Uses inquirer prompts with validation and chalk/ora for feedback
✅ **Modular Architecture**: Commands organized by domain in separate modules
✅ **Yarn Package Management**: Uses Yarn with standard script patterns

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
src/
├── commands/
│   ├── git.ts          # Existing git workflow commands
│   ├── mono.ts         # Existing monorepo management
│   ├── ide.ts          # Existing IDE integration (cursor, surf) - NEEDS UPDATE
│   └── cloud.ts        # NEW: Cloud infrastructure commands
├── types/
│   └── index.ts        # Type definitions - NEEDS UPDATE for config structure
├── util.ts             # Utility functions - NEEDS UPDATE for config reading
└── hsh.ts              # Main CLI entry point - NEEDS UPDATE for cloud command

dist/                   # Compiled TypeScript output
└── [mirrors src structure]

# Configuration
~/.hsh/config.json      # User configuration with new nested structure
```

**Structure Decision**: Using the existing TypeScript CLI project structure. Adding a new `cloud.ts` command module following the established pattern of domain-specific modules (git, mono, ide). The existing `ide.ts`, `types/index.ts`, and `util.ts` files require updates to support the new configuration structure while maintaining backward compatibility.

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
