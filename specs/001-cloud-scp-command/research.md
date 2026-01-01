# Research: Cloud SCP Command

**Feature**: 001-cloud-scp-command
**Date**: 2025-10-11
**Status**: Complete

## Research Overview

This document consolidates research findings for implementing the `hsh cloud scp` command. Since this feature extends existing cloud infrastructure functionality, research focuses on SCP best practices, path validation approaches, and integration patterns with the existing codebase.

## Decision 1: SCP Command Pattern

### Decision

Use `scp -i {privateKey} scp [flags] {source} {user}@{host}:{dest}` pattern for SCP execution.

### Rationale

- **Consistency**: Matches the SSH approach used in `cloud login` command
- **Key Management**: Ensures proper private key authentication flow
- **Error Handling**: SSH error patterns can be handled by existing `handleSSHError` function
- **Platform Compatibility**: Works across all platforms supported by the SSH suite

### Alternatives Considered

1. **Direct SCP command**: `scp -i {privateKey} [flags] {source} {user}@{host}:{dest}`
   - **Rejected**: While simpler, inconsistent with cloud login's SSH-first approach
   - **Concern**: May have different error handling requirements

2. **rsync over SSH**: `rsync -avz -e "scp -i {privateKey}" {source} {user}@{host}:{dest}`
   - **Rejected**: Adds external dependency (rsync)
   - **Overkill**: Feature doesn't require rsync's advanced sync capabilities
   - **Complexity**: More flags and options to manage

### Implementation Details

```typescript
// For files
await $`scp -i ${privateKeyFile} scp ${localPath} root@${ip}:${remotePath}`;

// For directories (-r flag)
await $`scp -i ${privateKeyFile} scp -r ${localPath} root@${ip}:${remotePath}`;
```

## Decision 2: Path Validation Strategy

### Decision

Use Node.js `fs/promises` API with `stat()` for comprehensive path validation before SCP execution.

### Rationale

- **Early Failure**: Detect invalid paths before expensive SSH/SCP operations
- **Type Detection**: `stat()` provides file vs directory information
- **Permission Checking**: Can detect read permission issues early
- **Synchronous Path Check**: Validates source exists, preventing ambiguous SCP errors

### Alternatives Considered

1. **No validation, rely on SCP errors**
   - **Rejected**: Poor user experience with cryptic SCP error messages
   - **Delayed feedback**: Only fails after SSH connection established

2. **Simple `access()` check only**
   - **Rejected**: Doesn't provide file vs directory information
   - **Missing context**: Can't auto-detect if `-r` flag is needed

### Implementation Details

```typescript
import { stat } from 'fs/promises';

async function validateLocalPath(path: string): Promise<{ exists: boolean; isDirectory: boolean }> {
  try {
    const stats = await stat(path);
    return { exists: true, isDirectory: stats.isDirectory() };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { exists: false, isDirectory: false };
    }
    throw error; // Permission or other errors
  }
}
```

## Decision 3: Recursive Flag Handling

### Decision

Require explicit `-r` flag for directory copies, error if missing.

### Rationale

- **SCP Standard**: Follows standard SCP behavior and conventions
- **Explicit Intent**: Forces user to be explicit about recursive operations
- **Error Prevention**: Prevents accidental large directory transfers
- **User Education**: Clear error message teaches correct flag usage

### Alternatives Considered

1. **Auto-detect and add `-r` flag**
   - **Rejected**: Too implicit, hides important flag from user
   - **Learning barrier**: Users won't learn correct SCP usage

2. **Prompt user when directory detected**
   - **Rejected**: Adds friction to CLI workflow
   - **Automation unfriendly**: Breaks non-interactive script usage

### Implementation Details

```typescript
// Validation logic
if (pathInfo.isDirectory && !options.recursive) {
  console.error(chalk.red('❌ Cannot copy directory without -r flag'));
  console.log(chalk.yellow('Hint: Use -r flag for recursive directory copy'));
  process.exit(1);
}
```

## Decision 4: Function Reuse Strategy

### Decision

Reuse existing cloud.ts helper functions for all shared functionality.

### Functions to Reuse

1. **validatePrivateKey()**: SSH key validation and permission checking
2. **promptForService()**: Interactive service selection
3. **promptForEnvironment()**: Interactive environment selection
4. **handleSSHError()**: SSH/SCP error handling with user-friendly messages

### Rationale

- **DRY Principle**: Eliminates code duplication
- **Consistency**: Same user experience across cloud commands
- **Maintainability**: Bug fixes benefit all cloud commands
- **Testing**: Shared functions already tested through cloud login

### New Functions Required

1. **validateLocalPath()**: Path existence and type checking (SCP-specific)
2. **cloudScp()**: Main SCP command execution (new subcommand)

### Implementation Pattern

```typescript
export async function cloudScp(
  localPath: string,
  remotePath: string,
  options: { env?: Environment; service?: string; recursive?: boolean }
): Promise<void> {
  // Reuse existing patterns from cloudLogin
  const config = readConfig();

  // Reuse: Service selection
  const service = options.service || (await promptForService(Object.keys(config.yiren)));

  // Reuse: Environment selection
  const env = options.env || (await promptForEnvironment(Object.keys(config.yiren[service])));

  // Reuse: Key validation
  await validatePrivateKey(cloudConfig.privateKeyFile);

  // New: Path validation
  const pathInfo = await validateLocalPath(localPath);

  // Reuse: Production confirmation (from cloudLogin pattern)
  if (env === 'prod') {
    // ... confirmation prompt logic
  }

  // New: SCP execution
  await $`scp -i ${cloudConfig.privateKeyFile} scp ${flags} ${localPath} root@${cloudConfig.ip}:${remotePath}`;
}
```

## Decision 5: Production Safety Confirmation

### Decision

Implement same production confirmation prompt as `cloud login`.

### Rationale

- **Consistency**: Matches user expectations from cloud login
- **Safety**: Prevents accidental production file overwrites
- **Explicit Consent**: Requires active confirmation for prod operations
- **Audit Trail**: User explicitly acknowledges production access

### Implementation Details

```typescript
if (env === 'prod') {
  const { confirmProduction } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmProduction',
      message: chalk.red(`⚠️  You are about to copy files to PRODUCTION (${service}). Continue?`),
      default: false,
    },
  ]);

  if (!confirmProduction) {
    console.log(chalk.yellow('⏸️  Production operation cancelled.'));
    return;
  }
}
```

## Decision 6: Error Handling Strategy

### Decision

Layer error handling with specific messages for each failure point.

### Error Categories

1. **Path Errors**: Local file/directory not found, permission denied
2. **Configuration Errors**: Service/environment not configured
3. **Validation Errors**: Missing -r flag for directories
4. **SSH/SCP Errors**: Connection failures, authentication failures

### Error Handling Flow

```typescript
try {
  // Layer 1: Path validation
  const pathInfo = await validateLocalPath(localPath);
  if (!pathInfo.exists) {
    console.error(chalk.red(`❌ Local path not found: ${localPath}`));
    return;
  }

  // Layer 2: Recursive flag validation
  if (pathInfo.isDirectory && !options.recursive) {
    console.error(chalk.red('❌ Cannot copy directory without -r flag'));
    console.log(chalk.yellow('Hint: Use -r flag for recursive directory copy'));
    return;
  }

  // Layer 3: Configuration validation (reuse existing logic)
  // ...

  // Layer 4: SCP execution
  await $`scp -i ${privateKey} scp ${flags} ${localPath} root@${ip}:${remotePath}`;
  console.log(chalk.green(`✅ Successfully copied to ${service} (${env}): ${remotePath}`));
} catch (error) {
  // Reuse handleSSHError for SSH/SCP connection errors
  handleSSHError(error);
  process.exit(1);
}
```

### Rationale

- **Clear Feedback**: Each error type has specific, actionable message
- **Early Failure**: Validation errors caught before SCP execution
- **Reuse Existing**: SSH errors handled by existing handleSSHError function
- **User Experience**: Helpful hints guide users to correct usage

## Technology Best Practices

### TypeScript Best Practices

- **Strict Mode**: All code follows strict TypeScript typing
- **Interface Reuse**: Use existing `CloudConfig`, `Environment` types
- **Async/Await**: All file system and shell operations use async/await
- **Error Types**: Properly type catch blocks and error handling

### zx Library Usage

- **Template Literals**: Use `$` template literals for all shell commands
- **Variable Escaping**: zx automatically handles path escaping
- **Error Propagation**: zx throws on non-zero exit codes by default
- **Process Handling**: Proper async/await with shell operations

### Commander.js Patterns

- **Option Definition**: Use `.option()` for flags with proper descriptions
- **Argument Definition**: Use `.argument()` for positional parameters
- **Action Handler**: Async action handlers for all commands
- **Delegation Pattern**: Main file defines interface, delegates to domain modules

## Integration Patterns

### Configuration Access

- Reuse `readConfig()` from util.ts
- Access `config.yiren` structure (established by cloud login)
- Validate service and environment existence before use

### Interactive Prompts

- Reuse `promptForService()` and `promptForEnvironment()`
- Maintain consistent prompt styling with inquirer
- Provide helpful validation messages

### Command Registration

```typescript
// In hsh.ts - following existing cloud command pattern
cloudCommand
  .command('scp')
  .description('Copy files to cloud instances')
  .option('-r, --recursive', 'Copy directories recursively')
  .option('--env <environment>', 'Environment: dev, staging, or prod')
  .option('--service <service>', 'Service name')
  .argument('<local-path>', 'Local file or directory path')
  .argument('<remote-path>', 'Remote destination path')
  .action(async (localPath, remotePath, options) => {
    await cloudScp(localPath, remotePath, options);
  });
```

## Open Questions & Resolutions

### Q1: Should we support SCP options like -P (port)?

**Resolution**: No, not in initial implementation. Current cloud config doesn't include custom SSH ports. Can add later if needed.

### Q2: Should we validate remote path format?

**Resolution**: No, let SCP/SSH handle remote path validation. Remote filesystem structure varies, hard to validate without SSH connection.

### Q3: Should we support bidirectional SCP (download from remote)?

**Resolution**: No, out of scope for this feature. Current requirement is upload only. Can be separate command later (e.g., `hsh cloud download`).

### Q4: Should we show progress for large file transfers?

**Resolution**: Not in initial version. SCP provides basic progress output by default. Enhanced progress indication can be added in future iteration if needed.

## Summary

This research establishes a clear implementation path for the `hsh cloud scp` command:

1. **SCP via SSH wrapper** for consistency with cloud login
2. **Node.js fs/promises** for path validation and type detection
3. **Explicit -r flag** requirement following SCP standards
4. **Maximum function reuse** from existing cloud.ts helpers
5. **Production safety** with confirmation prompts
6. **Layered error handling** with specific, actionable messages

All decisions align with the project's constitution (TypeScript-first, zx for shell, inquirer for prompts, modular architecture) and reuse existing patterns from the cloud login implementation.
