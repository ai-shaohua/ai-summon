# Implementation Plan: Cloud SCP Command

**Branch**: `001-cloud-scp-command` | **Date**: 2025-10-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-cloud-scp-command/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add `hsh cloud scp` command to enable secure file/directory copying to cloud instances. The command extends existing cloud infrastructure management by reusing the same configuration structure and helper functions from `cloud login`. It will support interactive service/environment selection, automatic file vs directory detection, and production safety confirmations.

## Technical Context

**Language/Version**: TypeScript 5.0+ with ES2020 target and ESNext modules
**Primary Dependencies**:

- commander (CLI framework for command/option parsing)
- inquirer (interactive prompts with validation)
- zx (shell command execution)
- chalk (terminal colors for user feedback)
- fs/promises (file system operations for path validation)

**Storage**: Configuration from `~/.ai/config.json` (existing yiren section)
**Testing**: Manual CLI testing (consistent with project patterns)
**Target Platform**: Node.js CLI (global installation via yarn)
**Project Type**: Single TypeScript CLI project
**Performance Goals**: Command initialization <2s (excluding actual file transfer time)
**Constraints**:

- Reuse existing cloud.ts helper functions (validatePrivateKey, promptForService, promptForEnvironment, handleSSHError)
- Maintain backward compatibility with cloud login configuration
- Follow SCP standard conventions for flags and argument order

**Scale/Scope**:

- Single new subcommand addition to existing cloud command group
- Reuses 4 existing helper functions from cloud.ts
- Adds 1 new function (cloudScp) to src/commands/cloud.ts
- Updates hsh.ts with new subcommand definition (~10 lines)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

✅ **TypeScript-First**: All code written in TypeScript with strict mode, fully typed

- New cloudScp function will be fully typed with CloudConfig, Environment interfaces
- Path validation uses typed fs/promises API
- All parameters and return types explicitly defined

✅ **Shell Integration**: Uses zx library for all shell operations with async/await

- SCP command execution via `$` template literals from zx
- All shell operations are async/await with proper error handling
- No direct child_process usage

✅ **Interactive CLI**: Uses inquirer prompts with validation and chalk/ora for feedback

- Reuses promptForService and promptForEnvironment from cloud.ts
- Chalk for colored success/error messages
- Input validation before SCP execution

✅ **Modular Architecture**: Commands organized by domain in separate modules

- cloudScp function added to src/commands/cloud.ts (cloud domain)
- Command registration in hsh.ts delegates to cloud module
- Follows existing cloud login pattern

✅ **Yarn Package Management**: Uses Yarn with standard script patterns

- No new dependencies required
- Follows existing build, dev, start patterns
- Global installation via existing bin configuration

## Project Structure

### Documentation (this feature)

```
specs/001-cloud-scp-command/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── commands/
│   ├── cloud.ts         # MODIFIED: Add cloudScp function and SCP-related helpers
│   ├── git.ts          # Unchanged
│   ├── mono.ts         # Unchanged
│   └── ide.ts          # Unchanged
├── types/
│   └── index.ts        # May add SCP-specific types if needed
├── util.ts             # Unchanged
└── hsh.ts              # MODIFIED: Add cloud scp subcommand registration

dist/                   # Compiled TypeScript output
└── [mirrors src structure]
```

**Structure Decision**: TypeScript CLI Project (existing structure)

- **Modified Files**:
  - `src/commands/cloud.ts`: Add cloudScp function with path validation and SCP execution
  - `src/hsh.ts`: Register new `cloud scp` subcommand with options/arguments
- **Unchanged Files**: git.ts, mono.ts, ide.ts, util.ts remain unchanged
- **No New Files**: All functionality fits within existing cloud.ts module
- **Type Reuse**: Uses existing CloudConfig, Environment types from types/index.ts

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
