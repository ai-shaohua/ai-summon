# Feature Specification: Cloud SCP Command

**Feature ID**: 001-cloud-scp-command
**Created**: 2025-10-11
**Type**: CLI Enhancement
**Depends On**: 001-cloud-login-feature (cloud configuration structure)

## Overview

Add a new `hsh cloud scp` command that enables users to securely copy files and directories to cloud instances using SCP. The command extends the existing cloud infrastructure management functionality by leveraging the same environment and service configuration used by `hsh cloud login`.

## Functional Requirements

### FR-1: Cloud SCP Command Structure

- **Main Command**: `hsh cloud` - Cloud infrastructure management (existing)
- **New Subcommand**: `hsh cloud scp [options] <local-path> <remote-path>`
- **Options**:
  - `-r, --recursive`: Copy directories recursively (required for folders)
  - `--env <environment>`: Environment selection (dev/staging/prod)
  - `--service <service-name>`: Service name (todo-mini, wuhan-mall, etc.)
- **Parameters**:
  - `<local-path>`: Local file or directory path to copy
  - `<remote-path>`: Remote destination path on the target server
- **Behavior**: Execute SCP command to copy local files/directories to remote server

### FR-2: Interactive Prompts

When `--env` or `--service` options are not provided, the command should:

- **Service Selection**: Prompt user to select from available services in configuration
- **Environment Selection**: Prompt user to select from available environments for the chosen service
- **Reuse Existing Patterns**: Use the same prompt functions from cloud login (`promptForService`, `promptForEnvironment`)

### FR-3: Configuration Reuse

- **Configuration File**: `~/.hsh/config.json` (same as cloud login)
- **Configuration Structure**: Uses existing `yiren` section from cloud login feature
  ```json
  {
    "yiren": {
      "[service-name]": {
        "dev": {
          "ip": "IP",
          "privateKeyFile": "path/to/private-key-file"
        },
        "staging": { ... },
        "prod": { ... }
      }
    }
  }
  ```

### FR-4: SCP Command Execution

The command should construct and execute different SCP commands based on the input type:

**For Files**:

```bash
scp -i /path/to/privateKey scp local-file-path root@IP:remote-folder-path
```

**For Directories** (with `-r` flag):

```bash
scp -i /path/to/privateKey scp -r local-folder-path root@IP:remote-folder-path
```

**Command Resolution**:

- Private key: `config.yiren[service][env].privateKeyFile`
- IP address: `config.yiren[service][env].ip`
- User: Always `root` (consistent with cloud login)

### FR-5: Path Validation

- **Local Path**: Validate that local path exists before attempting copy
- **Directory Detection**: Automatically detect if local path is a directory
- **Recursive Flag**: Require `-r` flag for directory copies
- **Error Messages**: Clear feedback for missing paths or incorrect flag usage

## Technical Requirements

### TR-1: Command Integration

- Add `scp` subcommand to existing `cloud` command group in `hsh.ts`
- Implement `cloudScp` function in `src/commands/cloud.ts`
- Follow Commander.js patterns for option and argument parsing
- Reuse existing cloud helper functions for configuration and validation

### TR-2: File System Operations

- Use Node.js `fs/promises` API for path validation
- Detect file vs directory using `stat` or `lstat`
- Validate local path exists before SCP execution
- Provide clear error messages for invalid paths

### TR-3: SCP Execution

- Use zx library for shell command execution (following constitution)
- Construct SCP command with proper flag handling (`-r` for directories)
- Include SSH options for key authentication and connection settings
- Handle SCP-specific errors and exit codes

### TR-4: Error Handling

- **Path Errors**: Local path not found, permission issues
- **Configuration Errors**: Missing service/environment configuration
- **SCP Errors**: Connection failures, permission denied, file transfer issues
- **Flag Errors**: Missing `-r` flag for directory copy
- Reuse `handleSSHError` function for connection-related errors

### TR-5: Production Safety

- Implement same production confirmation prompt as cloud login
- Warn users before copying to production environments
- Require explicit confirmation for production operations

## User Stories

### US-1: Quick File Deploy

**As a** developer
**I want to** quickly copy a local file to a remote server
**So that** I can deploy configuration changes without manual SCP commands

**Acceptance Criteria**:

- Command accepts local file path and remote destination
- Automatically detects it's a file and uses appropriate SCP command
- Prompts for service and environment if not provided
- Successfully copies file to remote server

**Example**:

```bash
hsh cloud scp ./config.json /etc/myapp/config.json
# Prompts for service and environment, then copies file
```

### US-2: Directory Upload

**As a** developer
**I want to** upload an entire directory to a remote server
**So that** I can deploy multiple files in one command

**Acceptance Criteria**:

- Command requires `-r` flag for directory copy
- Recursively copies entire directory structure
- Provides clear error if `-r` flag is missing for directories

**Example**:

```bash
hsh cloud scp -r ./dist /var/www/html --env prod --service wuhan-mall
```

### US-3: Interactive Service Selection

**As a** developer managing multiple services
**I want to** be prompted for service and environment if not specified
**So that** I can quickly select without remembering exact names

**Acceptance Criteria**:

- Displays available services when `--service` is omitted
- Displays available environments when `--env` is omitted
- Uses same interactive prompts as cloud login command

**Example**:

```bash
hsh cloud scp ./app.js /opt/app/
# Interactive prompts guide service and environment selection
```

## Usage Examples

### Basic File Copy

```bash
hsh cloud scp ./config.json /etc/app/config.json --env dev --service todo-mini
```

### Directory Copy with Recursive Flag

```bash
hsh cloud scp -r ./build /var/www/html --env staging --service wuhan-mall
```

### Interactive Mode (No Flags)

```bash
hsh cloud scp ./deploy.sh /root/scripts/
# Prompts: Select service → Select environment → Executes SCP
```

### Production Copy with Confirmation

```bash
hsh cloud scp -r ./dist /var/www/html --env prod --service todo-mini
# Shows production warning → Requires confirmation → Executes SCP
```

## Dependencies

- **Existing**: commander, zx, chalk, inquirer, fs/promises (already in project)
- **New**: None required
- **External**: SCP command (system dependency, part of SSH suite)
- **Internal**: Reuses cloud.ts helper functions and configuration structure

## Success Criteria

1. Command successfully copies files to specified environment and service
2. Automatic detection of file vs directory with appropriate flag validation
3. Interactive prompts work consistently with cloud login command
4. Production confirmation prevents accidental deployments
5. Clear error messages for all failure scenarios
6. Follows project's TypeScript and CLI design principles
7. Code reuses existing cloud infrastructure patterns

## Non-Functional Requirements

- **Security**: SSH keys properly managed, not exposed in logs or error messages
- **Performance**: Command executes within 2 seconds (excluding actual file transfer time)
- **Usability**: Clear error messages, helpful validation, intuitive flag usage
- **Maintainability**: Code follows existing patterns, reuses helper functions, minimal duplication
- **Compatibility**: Works with existing cloud configuration without modifications

## Design Decisions

### Reuse Over Duplication

- Reuse `validatePrivateKey`, `promptForService`, `promptForEnvironment` from cloud login
- Reuse `handleSSHError` for consistent error handling
- Reuse configuration reading and validation patterns

### SCP via SSH Wrapper

The command pattern `scp -i {key} scp ...` is used instead of direct `scp -i {key} ...` for consistency with cloud login's SSH approach and to ensure proper key authentication flow.

### Flag Consistency

- `-r` flag follows standard SCP convention for recursive copy
- `--env` and `--service` flags match cloud login for consistency
- Position of local and remote paths follows standard SCP argument order
