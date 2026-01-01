# Quickstart: Cloud Login Implementation

**Feature**: Cloud Login Command | **Generated**: 2025-10-11 | **Phase**: 1

## Overview

Quick implementation guide for the `hsh cloud login` feature, providing step-by-step development instructions and validation checkpoints.

## Prerequisites

- TypeScript 5.0+ development environment
- Existing hsh CLI project structure
- Access to cloud instances with SSH keys
- yarn package manager

## Implementation Steps

### Step 1: Update Type Definitions

**File**: `src/types/index.ts`

Add new TypeScript interfaces for cloud configuration:

```typescript
// Add to existing types
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
```

**Validation**: TypeScript compilation succeeds with no type errors.

### Step 2: Update Configuration Utility

**File**: `src/util.ts`

Update the configuration reading function to support new structure:

```typescript
import { HshConfig } from './types/index.js';

export async function readConfig(): Promise<HshConfig> {
  const configPath = path.join(os.homedir(), '.hsh', 'config.json');

  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const configContent = await readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  // Auto-migrate legacy configuration
  if (!config.repos && !config.yiren) {
    return {
      repos: config,
      yiren: {},
    };
  }

  return config as HshConfig;
}
```

**Validation**: Configuration reading works with both old and new formats.

### Step 3: Create Cloud Command Module

**File**: `src/commands/cloud.ts`

Implement the cloud login functionality:

```typescript
import { $ } from 'zx';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { readConfig } from '../util.js';
import { Environment, CloudConfig } from '../types/index.js';

export async function cloudLogin(env?: Environment, service?: string) {
  try {
    const config = await readConfig();

    // Interactive prompts for missing parameters
    if (!service) {
      const availableServices = Object.keys(config.yiren);
      if (availableServices.length === 0) {
        console.error(chalk.red('❌ No cloud services configured'));
        return;
      }

      const { selectedService } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedService',
          message: 'Select service:',
          choices: availableServices,
        },
      ]);
      service = selectedService;
    }

    if (!env) {
      const { selectedEnv } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedEnv',
          message: 'Select environment:',
          choices: ['dev', 'staging', 'prod'],
        },
      ]);
      env = selectedEnv;
    }

    // Validate configuration exists
    const serviceConfig = config.yiren[service];
    if (!serviceConfig) {
      console.error(chalk.red(`❌ Service '${service}' not found in configuration`));
      return;
    }

    const cloudConfig = serviceConfig[env];
    if (!cloudConfig) {
      console.error(chalk.red(`❌ Environment '${env}' not configured for service '${service}'`));
      return;
    }

    // Validate private key file
    await validatePrivateKey(cloudConfig.privateKeyFile);

    // Execute SSH connection
    console.log(chalk.blue(`🔗 Connecting to ${service} (${env}): ${cloudConfig.ip}`));
    await $`ssh -i ${cloudConfig.privateKeyFile} -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@${cloudConfig.ip}`;
  } catch (error) {
    handleSSHError(error);
    process.exit(1);
  }
}

async function validatePrivateKey(privateKeyFile: string): Promise<void> {
  // Implementation from research.md
  // Check file existence and permissions
}

function handleSSHError(error: any): void {
  // Implementation from research.md
  // Provide user-friendly error messages
}
```

**Validation**: SSH connections work with valid configuration.

### Step 4: Update Main CLI Entry

**File**: `src/hsh.ts`

Add the cloud command structure to the CLI:

```typescript
import { cloudLogin } from './commands/cloud.js';

// Add after existing commands
const cloudCommand = program
  .command('cloud')
  .description('Cloud infrastructure management commands');

// Add login subcommand
cloudCommand
  .command('login')
  .description('SSH into cloud instances')
  .option('--env <environment>', 'Environment: dev, staging, or prod')
  .option('--service <service>', 'Service name (e.g., todo-mini, wuhan-mall)')
  .action(async (options) => {
    await cloudLogin(options.env, options.service);
  });

// Future subcommands can be added like:
// cloudCommand
//   .command('scp')
//   .description('Copy files to/from cloud instances')
//   .action(async (options) => { ... });
```

**Validation**: Command appears in `hsh --help` output with proper subcommand structure.

### Step 5: Update IDE Commands for New Config

**File**: `src/commands/ide.ts`

Update existing IDE commands to use `config.repos`:

```typescript
// Update existing functions to use config.repos instead of direct config access
export async function openCursor() {
  const config = await readConfig();
  const projects = config.repos; // Updated from direct config access
  // Rest of implementation unchanged
}

export async function openSurf() {
  const config = await readConfig();
  const projects = config.repos; // Updated from direct config access
  // Rest of implementation unchanged
}
```

**Validation**: Existing `cursor` and `surf` commands continue to work.

## Configuration Setup

### Sample Configuration File

Create or update `~/.hsh/config.json`:

```json
{
  "repos": {
    "personal": {
      "hsh-tool": "/Users/username/projects/hsh"
    },
    "work": {
      "api-service": "/Users/username/work/api-service"
    }
  },
  "yiren": {
    "todo-mini": {
      "dev": {
        "ip": "192.168.1.10",
        "privateKeyFile": "/Users/username/.ssh/todo-mini-dev.pem"
      },
      "staging": {
        "ip": "192.168.1.20",
        "privateKeyFile": "/Users/username/.ssh/todo-mini-staging.pem"
      },
      "prod": {
        "ip": "192.168.1.30",
        "privateKeyFile": "/Users/username/.ssh/todo-mini-prod.pem"
      }
    },
    "wuhan-mall": {
      "dev": {
        "ip": "192.168.2.10",
        "privateKeyFile": "/Users/username/.ssh/wuhan-mall-dev.pem"
      },
      "staging": {
        "ip": "192.168.2.20",
        "privateKeyFile": "/Users/username/.ssh/wuhan-mall-staging.pem"
      },
      "prod": {
        "ip": "192.168.2.30",
        "privateKeyFile": "/Users/username/.ssh/wuhan-mall-prod.pem"
      }
    }
  }
}
```

### SSH Key Setup

Ensure SSH private key files have correct permissions:

```bash
chmod 600 /path/to/private-key-file.pem
```

## Testing

### Manual Testing Checklist

- [ ] `hsh cloud --help` shows available subcommands
- [ ] `hsh cloud login --help` shows login-specific options
- [ ] `hsh cloud login --env dev --service todo-mini` connects successfully
- [ ] `hsh cloud login` prompts for missing parameters
- [ ] Invalid service name shows helpful error message
- [ ] Invalid environment shows helpful error message
- [ ] Missing private key file shows helpful error message
- [ ] Wrong private key permissions shows warning with fix command
- [ ] Existing `hsh cursor` command still works with new config structure
- [ ] Existing `hsh surf` command still works with new config structure
- [ ] Legacy configuration automatically migrates to new structure

### Error Scenarios

Test error handling for:

- Configuration file not found
- Invalid JSON in configuration
- Network connectivity issues
- SSH authentication failures
- Missing private key files

## Build and Deploy

```bash
# Build TypeScript
yarn build

# Install globally for testing
yarn build:install

# Test commands
hsh cloud --help
hsh cloud login --help
hsh cloud login --env dev --service todo-mini
```

## Success Criteria

✅ **Functional Requirements**:

- Cloud login command executes SSH connections
- Configuration structure supports both repos and cloud configs
- Backward compatibility maintained for existing commands

✅ **Technical Requirements**:

- TypeScript strict mode compliance
- zx library usage for shell commands
- inquirer prompts for user interaction
- Chalk colored output for feedback

✅ **Quality Requirements**:

- Comprehensive error handling
- Input validation and helpful messages
- Security best practices for SSH keys
- Performance targets met (<2 seconds command execution)

## Next Steps

After implementation:

1. Run comprehensive testing with various configuration scenarios
2. Update documentation for new command usage
3. Consider adding bash completion for service and environment names
4. Plan additional cloud management features (status, logs, etc.)

## Troubleshooting

Common issues and solutions:

- **TypeScript errors**: Ensure all imports use `.js` extensions
- **Configuration not found**: Check file path and permissions
- **SSH connection fails**: Verify network connectivity and key permissions
- **Command not found**: Rebuild and reinstall globally with `yarn build:install`
