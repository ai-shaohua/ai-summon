---
description: 'Task list for Cloud Login Command feature implementation'
---

# Tasks: Cloud Login Command

**Input**: Design documents from `/specs/001-cloud-login-feature/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Manual CLI testing will be performed as specified in the plan. No automated test tasks included as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **TypeScript CLI Project**: `src/`, `dist/` at repository root
- Paths reference existing structure with `src/commands/`, `src/types/`, `src/util.ts`, `src/hsh.ts`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic configuration updates

- [x] T001 [P] Update TypeScript types in src/types/index.ts with cloud configuration interfaces (CloudConfig, ServiceConfig, YirenConfig, HshConfig, Environment)
- [x] T002 [P] Update configuration utility in src/util.ts to support new config structure with automatic migration from legacy format

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create new cloud command module in src/commands/cloud.ts with basic structure and imports (zx, chalk, inquirer)
- [x] T004 Update main CLI entry point in src/hsh.ts to register cloud command with subcommand structure
- [x] T005 [P] Implement private key validation function in src/commands/cloud.ts (file existence, permissions check)
- [x] T006 [P] Implement SSH error handling function in src/commands/cloud.ts (connection timeout, auth failure, network errors)
- [x] T007 [P] Implement interactive prompt helpers in src/commands/cloud.ts (service selection, environment selection)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Environment Access (Priority: P1) 🎯 MVP

**Goal**: Enable developers to quickly SSH into different environments with a single command

**Independent Test**: `hsh cloud login --env dev --service todo-mini` successfully connects to the specified environment

### Implementation for User Story 1

- [x] T008 [US1] Implement core cloudLogin function in src/commands/cloud.ts with parameter validation and config lookup
- [x] T009 [US1] Add SSH execution logic in src/commands/cloud.ts using zx with proper timeout and connection options
- [x] T010 [US1] Add environment parameter validation (dev/staging/prod) in src/commands/cloud.ts
- [x] T011 [US1] Add configuration file reading with error handling for missing config file in src/commands/cloud.ts
- [x] T012 [US1] Add IP address resolution logic based on config.yiren[service][env].ip in src/commands/cloud.ts
- [x] T013 [US1] Add private key file resolution logic based on config.yiren[service][env].privateKeyFile in src/commands/cloud.ts
- [x] T014 [US1] Add colored output feedback using chalk for connection status and errors in src/commands/cloud.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users can SSH into environments with explicit parameters

---

## Phase 4: User Story 2 - Service-Specific Login (Priority: P2)

**Goal**: Enable developers to specify which service they're connecting to and validate service exists in configuration

**Independent Test**: `hsh cloud login --service wuhan-mall --env staging` successfully connects to the correct service-specific instance

### Implementation for User Story 2

- [x] T015 [US2] Add service parameter validation and lookup in src/commands/cloud.ts
- [x] T016 [US2] Add service configuration existence check with helpful error messages in src/commands/cloud.ts
- [x] T017 [US2] Implement interactive service selection when service parameter is missing in src/commands/cloud.ts
- [x] T018 [US2] Implement interactive environment selection when environment parameter is missing in src/commands/cloud.ts
- [x] T019 [US2] Add service availability listing from config.yiren keys in src/commands/cloud.ts
- [x] T020 [US2] Add validation for service-environment combination existence in src/commands/cloud.ts

**Checkpoint**: All user stories should now be independently functional - full interactive and parameter-driven access

---

## Phase 5: Backward Compatibility & Migration

**Purpose**: Ensure existing commands continue to work with new configuration structure

- [x] T021 Update IDE cursor command in src/commands/ide.ts to use config.repos instead of direct config access
- [x] T022 Update IDE surf command in src/commands/ide.ts to use config.repos instead of direct config access
- [x] T023 [P] Test legacy configuration migration with existing IDE commands to ensure no breaking changes
- [x] T024 [P] Add warning messages for users when legacy configuration format is detected and migrated

**Checkpoint**: Existing functionality preserved with new configuration structure

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that enhance the overall feature quality

- [x] T025 [P] Add comprehensive error messages for all failure scenarios (config not found, invalid JSON, missing services)
- [x] T026 [P] Add user feedback improvements with chalk colors and connection progress indicators
- [x] T027 [P] Add configuration validation with helpful suggestions for fixing common issues
- [x] T028 [P] Implement production environment confirmation prompt for safety
- [x] T029 Build and test globally installed CLI with `yarn build:install`
- [x] T030 Run manual testing checklist from quickstart.md to validate all scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Backward Compatibility (Phase 5)**: Can start after User Story 1 is complete
- **Polish (Phase 6)**: Depends on all user stories and compatibility work being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 but should be independently testable

### Within Each User Story

- Configuration reading before parameter validation
- Parameter validation before SSH execution
- Error handling implemented alongside core functionality
- Interactive prompts added after parameter validation is working

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Stories 1 and 2 can start in parallel (if team capacity allows)
- Backward compatibility tasks can run in parallel with User Story 2
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# These foundational tasks can be launched together:
Task: "Implement private key validation function in src/commands/cloud.ts"
Task: "Implement SSH error handling function in src/commands/cloud.ts"
Task: "Implement interactive prompt helpers in src/commands/cloud.ts"

# These polish tasks can be launched together:
Task: "Add comprehensive error messages for all failure scenarios"
Task: "Add user feedback improvements with chalk colors"
Task: "Add configuration validation with helpful suggestions"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T007) - CRITICAL phase
3. Complete Phase 3: User Story 1 (T008-T014)
4. **STOP and VALIDATE**: Test `hsh cloud login --env dev --service todo-mini`
5. Deploy/demo if ready - basic cloud login functionality working

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Full interactive experience)
4. Add Backward Compatibility → Test existing commands still work
5. Add Polish → Final production-ready version

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (T008-T014)
   - Developer B: User Story 2 (T015-T020)
   - Developer C: Backward Compatibility (T021-T024)
3. Stories complete and integrate independently

---

## Manual Testing Plan

Based on quickstart.md validation checklist:

**After User Story 1 completion:**

- [ ] `hsh cloud --help` shows available subcommands
- [ ] `hsh cloud login --help` shows login-specific options
- [ ] `hsh cloud login --env dev --service todo-mini` connects successfully

**After User Story 2 completion:**

- [ ] `hsh cloud login` prompts for missing parameters
- [ ] Invalid service name shows helpful error message
- [ ] Invalid environment shows helpful error message

**After Backward Compatibility completion:**

- [ ] Existing `hsh cursor` command still works with new config structure
- [ ] Existing `hsh surf` command still works with new config structure
- [ ] Legacy configuration automatically migrates to new structure

**After Polish completion:**

- [ ] Missing private key file shows helpful error message
- [ ] Wrong private key permissions shows warning with fix command
- [ ] Production access requires confirmation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Manual testing replaces automated tests as specified in the plan
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Configuration migration maintains backward compatibility
- Follow TypeScript strict mode and project constitution requirements
