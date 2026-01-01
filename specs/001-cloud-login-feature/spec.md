# Feature Specification: Cloud Login Command

**Feature ID**: 001-cloud-login-feature
**Created**: 2025-10-11
**Type**: CLI Enhancement

## Overview

Add a new `hsh cloud login` command that enables users to SSH into cloud instances based on environment and service parameters. The command should read IP addresses from a restructured configuration file and handle SSH connections with proper key management.

## Functional Requirements

### FR-1: Cloud Command Structure

- **Main Command**: `hsh cloud` - Cloud infrastructure management
- **Subcommand**: `hsh cloud login --env <environment> --service <service-name>`
- **Parameters**:
  - `--env`: Environment selection (dev/staging/prod)
  - `--service`: Service name (todo-mini, wuhan-mall)
- **Action**: Execute SSH connection to the appropriate IP address using configured private key
- **Future Expansion**: Designed to support additional subcommands like `hsh cloud scp`, `hsh cloud status`, etc.

### FR-2: Configuration Structure Update

- **File**: `~/.ai/config.json`
- **New Structure**:
  ```json
  {
    "repos": {
      "[group-name]": {
        "[repo-name]": "repo absolute path"
      }
    },
    "yiren": {
      "[service-name]": {
        "dev": {
          "ip": "IP",
          "privateKeyFile": "path/to/private-key-file"
        },
        "staging": {
          "ip": "IP",
          "privateKeyFile": "path/to/private-key-file"
        },
        "prod": {
          "ip": "IP",
          "privateKeyFile": "path/to/private-key-file"
        }
      }
    }
  }
  ```

### FR-3: SSH Connection

- **Command Pattern**: `ssh -i {privateKeyFile} root@{ip}`
- **IP Resolution**: Lookup based on `config.yiren[service][env].ip`
- **Key Resolution**: Lookup based on `config.yiren[service][env].privateKeyFile`
- **User**: Always connect as `root` user
- **Key Management**: Each environment can have its own private key file

### FR-4: Backward Compatibility

- **Existing Commands**: Update IDE commands (cursor, surf) to use `config.repos` structure
- **Migration**: Handle transition from flat structure to nested `repos` structure

## Technical Requirements

### TR-1: Command Integration

- Add new command to existing CLI structure using Commander.js
- Follow existing patterns for parameter validation and error handling
- Use inquirer for interactive prompts if needed

### TR-2: Configuration Management

- Read configuration from `~/.ai/config.json`
- Validate configuration structure and provide helpful error messages
- Support both old and new configuration formats during transition

### TR-3: SSH Execution

- Use zx library for shell command execution (following constitution)
- Handle SSH connection errors gracefully
- Provide user feedback during connection process

### TR-4: Error Handling

- Validate environment and service parameters
- Check for missing configuration entries
- Handle network connectivity issues
- Provide clear error messages for troubleshooting

## User Stories

### US-1: Quick Environment Access

**As a** developer
**I want to** quickly SSH into different environments
**So that** I can debug issues without manually typing SSH commands

**Acceptance Criteria**:

- Command executes SSH connection with single command
- Supports all three environments (dev/staging/prod)
- Uses correct IP address based on service and environment

### US-2: Service-Specific Login

**As a** developer working on multiple services
**I want to** specify which service I'm connecting to
**So that** I connect to the correct instance

**Acceptance Criteria**:

- Command accepts service parameter
- Validates service exists in configuration
- Routes to correct service-specific IP address

## Configuration Examples

### Before (Current Structure)

```json
{
  "category1": {
    "project1": "/path/to/project1",
    "project2": "/path/to/project2"
  }
}
```

### After (New Structure)

```json
{
  "repos": {
    "category1": {
      "project1": "/path/to/project1",
      "project2": "/path/to/project2"
    }
  },
  "yiren": {
    "todo-mini": {
      "dev": {
        "ip": "192.168.1.10",
        "privateKeyFile": "/path/to/todo-mini-dev.pem"
      },
      "staging": {
        "ip": "192.168.1.20",
        "privateKeyFile": "/path/to/todo-mini-staging.pem"
      },
      "prod": {
        "ip": "192.168.1.30",
        "privateKeyFile": "/path/to/todo-mini-prod.pem"
      }
    },
    "wuhan-mall": {
      "dev": {
        "ip": "192.168.2.10",
        "privateKeyFile": "/path/to/wuhan-mall-dev.pem"
      },
      "staging": {
        "ip": "192.168.2.20",
        "privateKeyFile": "/path/to/wuhan-mall-staging.pem"
      },
      "prod": {
        "ip": "192.168.2.30",
        "privateKeyFile": "/path/to/wuhan-mall-prod.pem"
      }
    }
  }
}
```

## Dependencies

- **Existing**: commander, zx, chalk (already in project)
- **New**: None required
- **External**: SSH client (system dependency)
- **Configuration**: PEM file path (to be specified in config or hardcoded)

## Success Criteria

1. Command successfully connects to specified environment and service
2. Configuration file structure updated without breaking existing commands
3. Clear error messages for invalid parameters or missing configuration
4. Follows project's TypeScript and CLI design principles
5. Integration tests pass for all command variations

## Non-Functional Requirements

- **Security**: SSH keys properly managed and not exposed in logs
- **Performance**: Command executes within 2 seconds (excluding SSH connection time)
- **Usability**: Clear error messages and parameter validation
- **Maintainability**: Code follows existing project patterns and constitution
