# Research: Cloud Login Implementation

**Generated**: 2025-10-11 | **Phase**: 0 | **Feature**: Cloud Login Command

## Overview

Research for implementing `hsh cloud login` command with SSH connections, configuration migration, and error handling best practices.

## 1. SSH Connection Management with zx

### Decision: Use zx with proper SSH execution patterns

**Context**: Need to execute SSH commands using zx library following project constitution.

**Research Findings**:

- zx provides `$` template literal syntax for shell commands
- SSH connections require handling of interactive sessions and proper error handling
- Best practice: Use `$` with proper argument escaping and timeout handling

**Implementation Pattern**:

```typescript
import { $ } from 'zx';

// SSH execution with zx
await $`ssh -i ${privateKeyFile} -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@${ip}`;
```

**Rationale**: zx provides consistent cross-platform shell execution with TypeScript integration. The `-o ConnectTimeout=10` prevents hanging connections, and `-o StrictHostKeyChecking=no` avoids interactive prompts.

**Alternatives Considered**:

- Direct `child_process.spawn()`: Rejected due to constitution requirement for zx usage
- SSH libraries (ssh2): Rejected to avoid additional dependencies and complexity

## 2. Configuration File Migration Strategy

### Decision: Backward-compatible configuration reader with automatic migration

**Context**: Need to support both old flat structure and new nested structure for IDE commands.

**Research Findings**:

- Configuration migration should be transparent to users
- Support both structures during transition period
- Provide clear migration path and warnings

**Implementation Strategy**:

```typescript
interface LegacyConfig {
  [category: string]: {
    [project: string]: string;
  };
}

interface NewConfig {
  repos: {
    [category: string]: {
      [project: string]: string;
    };
  };
  yiren: {
    [service: string]: {
      [env: string]: {
        ip: string;
        privateKeyFile: string;
      };
    };
  };
}

function migrateConfig(config: any): NewConfig {
  // Detect old format and migrate automatically
  if (!config.repos && !config.yiren) {
    return {
      repos: config,
      yiren: {},
    };
  }
  return config as NewConfig;
}
```

**Rationale**: Automatic migration maintains backward compatibility while enabling new features. Users don't need to manually update configurations.

**Alternatives Considered**:

- Breaking change requiring manual migration: Rejected to avoid user friction
- Supporting both formats permanently: Rejected due to complexity maintenance

## 3. Error Handling Patterns for SSH Connections

### Decision: Comprehensive error handling with user-friendly messages

**Context**: SSH connections can fail for various reasons (network, authentication, host unreachable).

**Research Findings**:

- SSH failures should provide actionable error messages
- Common failure modes: connection timeout, authentication failure, host unreachable
- Use chalk for colored error output following project patterns

**Error Handling Strategy**:

```typescript
import chalk from 'chalk';

async function executeSSH(ip: string, privateKeyFile: string) {
  try {
    await $`ssh -i ${privateKeyFile} -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@${ip}`;
  } catch (error) {
    if (error.message.includes('Connection timed out')) {
      console.error(chalk.red('❌ Connection timeout - check network connectivity and IP address'));
    } else if (error.message.includes('Permission denied')) {
      console.error(
        chalk.red('❌ Authentication failed - check private key file permissions and path')
      );
    } else if (error.message.includes('No route to host')) {
      console.error(chalk.red('❌ Host unreachable - verify IP address and network access'));
    } else {
      console.error(chalk.red(`❌ SSH connection failed: ${error.message}`));
    }
    process.exit(1);
  }
}
```

**Rationale**: Specific error messages help users diagnose and fix connection issues quickly. Using chalk for colored output follows project conventions.

**Alternatives Considered**:

- Generic error messages: Rejected as unhelpful for debugging
- Silent failures: Rejected as users need feedback on connection status

## 4. Command Parameter Validation

### Decision: Use inquirer for interactive prompts with validation

**Context**: Need to validate environment and service parameters, provide user guidance.

**Research Findings**:

- inquirer provides excellent autocomplete and validation capabilities
- Should offer interactive selection when parameters are missing
- Validate against available options in configuration

**Implementation Pattern**:

```typescript
import inquirer from 'inquirer';

async function promptForMissingParams(config: NewConfig, env?: string, service?: string) {
  const questions = [];

  if (!service) {
    questions.push({
      type: 'list',
      name: 'service',
      message: 'Select service:',
      choices: Object.keys(config.yiren),
      validate: (input: string) => Object.keys(config.yiren).includes(input),
    });
  }

  if (!env) {
    questions.push({
      type: 'list',
      name: 'env',
      message: 'Select environment:',
      choices: ['dev', 'staging', 'prod'],
      validate: (input: string) => ['dev', 'staging', 'prod'].includes(input),
    });
  }

  return await inquirer.prompt(questions);
}
```

**Rationale**: Interactive prompts reduce user errors and provide guidance. Validation ensures only valid options are accepted.

**Alternatives Considered**:

- Command-line flags only: Rejected as less user-friendly for discovery
- No validation: Rejected as it leads to runtime errors

## 5. Private Key File Security

### Decision: Validate private key file permissions and existence

**Context**: SSH private keys must have correct permissions and exist for security.

**Research Findings**:

- SSH requires private key files to have 600 permissions (readable by owner only)
- Files should exist and be readable before attempting SSH connection
- Provide clear guidance on fixing permission issues

**Security Validation**:

```typescript
import { access, stat } from 'fs/promises';
import { constants } from 'fs';

async function validatePrivateKey(privateKeyFile: string): Promise<void> {
  try {
    // Check if file exists
    await access(privateKeyFile, constants.F_OK);

    // Check permissions
    const stats = await stat(privateKeyFile);
    const permissions = stats.mode & parseInt('777', 8);

    if (permissions !== parseInt('600', 8)) {
      console.warn(
        chalk.yellow(
          `⚠️  Private key file permissions should be 600. Run: chmod 600 ${privateKeyFile}`
        )
      );
    }
  } catch (error) {
    throw new Error(`Private key file not found or not accessible: ${privateKeyFile}`);
  }
}
```

**Rationale**: Proactive validation prevents common SSH authentication failures and provides actionable guidance.

**Alternatives Considered**:

- No permission checking: Rejected as it leads to confusing SSH failures
- Automatic permission fixing: Rejected as it modifies user files without permission

## 6. TypeScript Type Definitions

### Decision: Comprehensive type definitions for configuration and parameters

**Context**: Project requires strict TypeScript typing following constitution.

**Type Definitions**:

```typescript
export interface CloudConfig {
  ip: string;
  privateKeyFile: string;
}

export interface ServiceConfig {
  dev: CloudConfig;
  staging: CloudConfig;
  prod: CloudConfig;
}

export interface YirenConfig {
  [serviceName: string]: ServiceConfig;
}

export interface HshConfig {
  repos: {
    [groupName: string]: {
      [repoName: string]: string;
    };
  };
  yiren: YirenConfig;
}

export type Environment = 'dev' | 'staging' | 'prod';
export type ServiceName = string;
```

**Rationale**: Strong typing prevents runtime errors and enables better IDE support and refactoring capabilities.

**Alternatives Considered**:

- Loose typing with any: Rejected due to constitution requirements
- Inline types: Rejected for maintainability and reusability

## Implementation Roadmap

1. **Configuration Management**: Update util.ts with new config structure support
2. **Type Definitions**: Add new types to types/index.ts
3. **Cloud Command Module**: Create src/commands/cloud.ts with SSH functionality
4. **CLI Integration**: Update src/hsh.ts to register cloud commands
5. **IDE Command Updates**: Modify src/commands/ide.ts for new config structure
6. **Testing**: Manual testing with various configuration scenarios

## Conclusion

All technical questions have been resolved with specific implementation patterns. The approach maintains backward compatibility, follows project constitution requirements, and provides excellent user experience through proper error handling and validation.
