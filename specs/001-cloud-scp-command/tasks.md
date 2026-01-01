# Tasks: Cloud SCP Command

**Feature ID**: 001-cloud-scp-command
**Branch**: `001-cloud-scp-command`
**Input**: Design documents from `/specs/001-cloud-scp-command/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Manual CLI testing (no automated test suite requested in spec)

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Minimal setup - most infrastructure already exists from cloud login feature

- [x] T001 Verify TypeScript 5.0+ configuration in tsconfig.json (strict mode enabled)
- [x] T002 [P] Verify existing dependencies (commander, inquirer, zx, chalk, fs/promises)
- [x] T003 [P] Review existing cloud.ts helper functions (validatePrivateKey, promptForService, promptForEnvironment, handleSSHError)

**Notes**: This is an extension of existing infrastructure. Setup tasks are verification only since the project already exists.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and infrastructure needed by ALL user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Add ScpOptions interface to src/types/index.ts (env, service, recursive fields)
- [x] T005 [P] Add PathValidationResult interface to src/types/index.ts (exists, isDirectory, isFile, path fields)
- [x] T006 [P] Export ScpOptions and PathValidationResult from src/types/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Quick File Deploy (Priority: P1) 🎯 MVP

**Goal**: Enable developers to quickly copy a single file to a remote server with interactive prompts

**Independent Test**:

```bash
# Create a test file
echo "test content" > /tmp/test-file.txt

# Test command (interactive - will prompt for service/env)
hsh cloud scp /tmp/test-file.txt /tmp/remote-test.txt

# Verify success message appears
# Expected: ✅ Successfully copied to [service] ([env]): /tmp/remote-test.txt
```

### Implementation for User Story 1

- [x] T007 [US1] Implement validateLocalPath() function in src/commands/cloud.ts
  - Import { stat } from 'fs/promises'
  - Check if path exists using stat()
  - Return PathValidationResult with exists, isDirectory, isFile, path
  - Handle ENOENT error (file not found) separately from permission errors
  - Throw on permission denied or other fs errors

- [x] T008 [US1] Implement cloudScp() main function in src/commands/cloud.ts (depends on T007)
  - Accept localPath, remotePath, options parameters with ScpOptions type
  - Call validateLocalPath() for local path validation
  - Handle case when path doesn't exist: log error and return early
  - Read configuration using existing readConfig() from util.ts
  - Handle case when no services configured: log error and return
  - Use existing promptForService() if options.service not provided
  - Validate service exists in config, log available services if not found
  - Use existing promptForEnvironment() if options.env not provided
  - Validate environment exists for service, log available environments if not found
  - Get cloudConfig from config.yiren[service][env]
  - Call existing validatePrivateKey() with cloudConfig.privateKeyFile
  - Construct SCP command using zx $ template literal
  - Pattern: `scp -i ${privateKeyFile} -o ConnectTimeout=10 -o StrictHostKeyChecking=no scp ${localPath} root@${ip}:${remotePath}`
  - Wrap SCP execution in try-catch, use existing handleSSHError() on failure
  - Log success message with chalk.green on completion

- [x] T009 [US1] Export cloudScp function from src/commands/cloud.ts
  - Add cloudScp to existing export list

- [x] T010 [US1] Import cloudScp in src/hsh.ts
  - Add cloudScp to import statement from './commands/cloud.js'

- [x] T011 [US1] Register cloud scp subcommand in src/hsh.ts (depends on T010)
  - Add after existing cloud login subcommand registration
  - Use cloudCommand.command('scp')
  - Add .description('Copy files to cloud instances')
  - Add .option('--env <environment>', 'Environment: dev, staging, or prod')
  - Add .option('--service <service>', 'Service name')
  - Add .argument('<local-path>', 'Local file or directory path')
  - Add .argument('<remote-path>', 'Remote destination path')
  - Add .action() handler that calls cloudScp(localPath, remotePath, options)

- [x] T012 [US1] Build and test file copy functionality
  - Run: yarn build
  - Run: yarn build:install
  - Test with actual file: hsh cloud scp /tmp/test.txt /tmp/remote-test.txt
  - Verify interactive prompts work for service and environment selection
  - Verify file copy succeeds with success message

**Checkpoint**: User Story 1 complete - file copying works with interactive prompts

---

## Phase 4: User Story 2 - Directory Upload (Priority: P2)

**Goal**: Enable developers to upload entire directories with recursive flag validation

**Independent Test**:

```bash
# Create a test directory with files
mkdir -p /tmp/test-dir
echo "file1" > /tmp/test-dir/file1.txt
echo "file2" > /tmp/test-dir/file2.txt

# Test without -r flag (should fail with clear message)
hsh cloud scp /tmp/test-dir /tmp/remote-dir

# Expected: ❌ Cannot copy directory without -r flag
# Expected: Hint: Use -r flag for recursive directory copy

# Test with -r flag (should succeed)
hsh cloud scp -r /tmp/test-dir /tmp/remote-dir --env dev --service my-service

# Verify success message appears
```

### Implementation for User Story 2

- [ ] T013 [US2] Add -r/--recursive option to cloud scp command in src/hsh.ts
  - Add before .argument() calls
  - Use .option('-r, --recursive', 'Copy directories recursively')

- [ ] T014 [US2] Add directory detection logic to cloudScp() in src/commands/cloud.ts
  - After validateLocalPath() call, check if pathInfo.isDirectory is true
  - If isDirectory && !options.recursive, log error and return early
  - Error message: chalk.red('❌ Cannot copy directory without -r flag')
  - Hint message: chalk.yellow('Hint: Use -r flag for recursive directory copy')

- [ ] T015 [US2] Update SCP command construction for recursive flag in src/commands/cloud.ts
  - Before SCP execution, check if pathInfo.isDirectory
  - If directory, construct flags variable with '-r', otherwise empty string
  - Update SCP command: `scp -i ${privateKeyFile} -o ConnectTimeout=10 -o StrictHostKeyChecking=no scp ${flags} ${localPath} root@${ip}:${remotePath}`
  - Ensure flags variable is properly spaced or empty

- [ ] T016 [US2] Build and test directory copy functionality
  - Run: yarn build
  - Run: yarn build:install
  - Test directory without -r flag: verify error message with hint
  - Test directory with -r flag: verify successful recursive copy
  - Test that file copy still works (regression test for US1)

**Checkpoint**: User Stories 1 AND 2 complete - both file and directory copying work

---

## Phase 5: User Story 3 - Interactive Service Selection (Priority: P3)

**Goal**: Polish interactive experience - ensure prompts work consistently with cloud login

**Independent Test**:

```bash
# Test interactive service selection (no --service flag)
hsh cloud scp /tmp/test.txt /tmp/remote.txt

# Expected: Prompt "Select service:" with list of available services
# User selects service from list
# Expected: Prompt "Select environment:" with list of available environments for that service
# User selects environment from list
# Expected: ✅ Successfully copied to [service] ([env]): /tmp/remote.txt
```

### Implementation for User Story 3

**Note**: Interactive prompts already implemented in US1 (T008). This phase focuses on production safety.

- [x] T017 [US3] Add production confirmation prompt to cloudScp() in src/commands/cloud.ts
  - After getting cloudConfig, before validatePrivateKey()
  - Check if env === 'prod'
  - If production, use inquirer.prompt() with type: 'confirm'
  - Message: chalk.red(`⚠️  You are about to copy files to PRODUCTION (${service}). Continue?`)
  - Default: false
  - If confirmProduction is false, log chalk.yellow('⏸️ Production operation cancelled.') and return
  - If confirmed, continue with execution

- [x] T018 [US3] Build and test production confirmation
  - Run: yarn build
  - Run: yarn build:install
  - Test with --env prod: verify production warning appears
  - Test declining production: verify cancellation message
  - Test accepting production: verify copy proceeds
  - Test dev/staging: verify no prompt appears (regression test)

**Checkpoint**: All user stories complete - interactive prompts and production safety work

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and validation

- [x] T019 [P] Code review: Verify all types are properly exported from src/types/index.ts
- [x] T020 [P] Code review: Verify consistent error handling with chalk colors
- [x] T021 [P] Code review: Verify all async functions use await with proper error handling
- [x] T022 [P] Verify TypeScript compilation with strict mode: yarn build
- [x] T023 Test all user stories end-to-end following quickstart.md validation scenarios
  - File copy with explicit --env and --service flags
  - Directory copy with -r flag
  - Interactive service selection (no --service flag)
  - Interactive environment selection (no --env flag)
  - Production confirmation prompt and cancellation
  - Error handling for missing local path
  - Error handling for directory without -r flag
  - Error handling for invalid service
  - Error handling for invalid environment

- [x] T024 Final verification: Install globally and test from different directory
  - Run: yarn build:install
  - Navigate to different directory: cd ~/
  - Test command: hsh cloud scp [test scenarios from T023]
  - Verify all functionality works from any directory

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **Foundational (Phase 2)**: Depends on Setup - adds required types to src/types/index.ts
- **User Story 1 (Phase 3)**: Depends on Foundational - implements basic file copy with interactive prompts
- **User Story 2 (Phase 4)**: Depends on US1 complete - adds directory copy functionality
- **User Story 3 (Phase 5)**: Depends on US1 complete - adds production safety (can run in parallel with US2)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation → Basic file copy → Interactive prompts → SCP execution
  - BLOCKS: US2, US3 (they extend US1 functionality)

- **User Story 2 (P2)**: US1 → Directory detection → -r flag validation → Recursive copy
  - Can run in parallel with US3 (different features)

- **User Story 3 (P3)**: US1 → Production detection → Confirmation prompt → Safe execution
  - Can run in parallel with US2 (different features)

### Within Each User Story

**User Story 1** (T007-T012):

- T007 (validateLocalPath) must complete first - foundational helper
- T008 (cloudScp main function) depends on T007
- T009 (export) depends on T008
- T010 (import) can run in parallel with T009 [P]
- T011 (register command) depends on T010
- T012 (build and test) depends on T011

**User Story 2** (T013-T016):

- T013 (add -r option) and T014 (directory detection) can run in parallel [P]
- T015 (update SCP command) depends on T014
- T016 (build and test) depends on T013, T014, T015

**User Story 3** (T017-T018):

- T017 (production confirmation) is single task
- T018 (build and test) depends on T017

### Parallel Opportunities

**Phase 1 (Setup)**:

- T002 and T003 can run in parallel [P]

**Phase 2 (Foundational)**:

- T004, T005, T006 can all run in parallel [P] - different interfaces in same file

**Phase 3 (US1)**:

- T009 and T010 can run in parallel [P] - different files

**Phase 4 (US2)**:

- T013 and T014 can run in parallel [P] - different parts of implementation

**Phase 5 (US3)**:

- Can run in parallel with Phase 4 (US2) if two developers available

**Phase 6 (Polish)**:

- T019, T020, T021, T022 can all run in parallel [P] - different review areas

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes:

# Launch T009 and T010 in parallel (different files):
Task A: "Export cloudScp function from src/commands/cloud.ts"
Task B: "Import cloudScp in src/hsh.ts"

# After both complete, continue with T011:
Task: "Register cloud scp subcommand in src/hsh.ts"
```

## Parallel Example: User Story 2 and 3

```bash
# After US1 completes, with 2 developers:

# Developer A works on US2:
Task: "Add -r/--recursive option to cloud scp command"
Task: "Add directory detection logic to cloudScp()"
Task: "Update SCP command construction for recursive flag"

# Developer B works on US3 (in parallel):
Task: "Add production confirmation prompt to cloudScp()"
Task: "Build and test production confirmation"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Complete Phase 1: Setup (verify existing infrastructure)
2. ✅ Complete Phase 2: Foundational (add SCP-specific types)
3. ✅ Complete Phase 3: User Story 1 (basic file copy with interactive prompts)
4. **STOP and VALIDATE**: Test file copying independently
5. Ready for basic usage!

**MVP Deliverable**: Developers can copy single files to cloud instances using interactive service/environment selection

### Incremental Delivery

1. Foundation → US1 → **MVP Release** (basic file copy)
2. US1 → US2 → **Enhanced Release** (add directory support)
3. US2 → US3 → **Production Ready** (add production safety)
4. US3 → Polish → **Final Release** (complete feature)

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 2 developers:

1. **Together**: Complete Setup + Foundational (quick - mostly verification)
2. **Together**: Complete User Story 1 (foundation for both US2 and US3)
3. **Split**:
   - Developer A: User Story 2 (directory support)
   - Developer B: User Story 3 (production safety)
4. **Together**: Polish & validation

---

## Notes

### Task Conventions

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story (US1, US2, US3)
- Each user story should be independently completable and testable
- Manual CLI testing approach (no automated test suite)

### File Modifications Summary

- **src/types/index.ts**: Add ScpOptions, PathValidationResult interfaces
- **src/commands/cloud.ts**: Add validateLocalPath(), cloudScp() functions
- **src/hsh.ts**: Add cloud scp subcommand registration

### Function Reuse

- ✅ validatePrivateKey() - from cloud.ts
- ✅ promptForService() - from cloud.ts
- ✅ promptForEnvironment() - from cloud.ts
- ✅ handleSSHError() - from cloud.ts
- ✅ readConfig() - from util.ts

### Error Handling Layers

1. Path validation (validateLocalPath)
2. Configuration validation (service/environment existence)
3. Recursive flag validation (directory requires -r)
4. Production confirmation (explicit user consent)
5. SSH/SCP execution errors (handleSSHError)

### Testing Strategy

- Manual CLI testing following quickstart.md scenarios
- Test each user story independently before moving to next
- Regression test previous stories when adding new functionality
- End-to-end testing from different directories after global install

---

## Total Task Count: 24 tasks

**By Phase**:

- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 3 tasks
- Phase 3 (US1 - MVP): 6 tasks
- Phase 4 (US2): 4 tasks
- Phase 5 (US3): 2 tasks
- Phase 6 (Polish): 6 tasks

**By User Story**:

- User Story 1 (Quick File Deploy): 6 tasks
- User Story 2 (Directory Upload): 4 tasks
- User Story 3 (Interactive Service Selection / Production Safety): 2 tasks
- Infrastructure & Polish: 12 tasks

**Parallel Opportunities**: 11 tasks marked [P] can potentially run in parallel

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (12 tasks) = Basic file copy functionality
