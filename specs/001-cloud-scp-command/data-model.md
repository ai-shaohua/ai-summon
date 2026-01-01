# Data Model: Cloud SCP Command

**Feature**: 001-cloud-scp-command
**Date**: 2025-10-11

## Overview

This document defines the data structures, types, and state management for the `hsh cloud scp` command. Since this feature extends the existing cloud infrastructure, it primarily reuses existing types and adds minimal new structures.

## Type Definitions

### Existing Types (Reused from types/index.ts)

```typescript
// Environment type - already defined in cloud login
export type Environment = 'dev' | 'staging' | 'prod';

// Cloud configuration interface - already defined
export interface CloudConfig {
  ip: string;
  privateKeyFile: string;
}

// Service configuration - already defined
export interface ServiceConfig {
  [key: string]: CloudConfig;
}

// Full configuration structure - already defined
export interface Config {
  repos?: {
    [category: string]: {
      [project: string]: string;
    };
  };
  yiren: {
    [service: string]: {
      dev?: CloudConfig;
      staging?: CloudConfig;
      prod?: CloudConfig;
    };
  };
}
```

### New Types (SCP-Specific)

```typescript
// SCP command options interface
export interface ScpOptions {
  env?: Environment;
  service?: string;
  recursive?: boolean;
}

// Path validation result
export interface PathValidationResult {
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  path: string;
}

// SCP operation metadata (for logging/debugging)
export interface ScpOperation {
  localPath: string;
  remotePath: string;
  service: string;
  environment: Environment;
  isDirectory: boolean;
  timestamp: Date;
}
```

## Entities

### Entity 1: SCP Command Parameters

**Purpose**: Encapsulates all parameters required to execute an SCP operation

**Fields**:

- `localPath: string` - Source file or directory path on local filesystem
- `remotePath: string` - Destination path on remote server
- `options: ScpOptions` - Command options including environment, service, and recursive flag

**Validation Rules**:

- `localPath`: Must exist on local filesystem (validated before execution)
- `remotePath`: Must be non-empty string (format validation delegated to SSH/SCP)
- `options.recursive`: Required if localPath is a directory
- `options.env`: Must be one of 'dev' | 'staging' | 'prod' (if provided)
- `options.service`: Must exist in configuration (if provided)

**Usage**:

```typescript
interface ScpCommandParams {
  localPath: string;
  remotePath: string;
  options: ScpOptions;
}
```

### Entity 2: Path Validation State

**Purpose**: Represents the result of local path validation

**Fields**:

- `exists: boolean` - Whether the path exists on filesystem
- `isDirectory: boolean` - Whether the path is a directory
- `isFile: boolean` - Whether the path is a regular file
- `path: string` - The validated path (resolved/absolute)

**State Transitions**:

1. **Initial**: Path provided by user → validation pending
2. **Validated**: Path checked via fs.stat() → exists/type determined
3. **Error**: Path doesn't exist or permission denied → error state

**Validation Flow**:

```typescript
async function validatePath(path: string): Promise<PathValidationResult> {
  try {
    const stats = await stat(path);
    return {
      exists: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      path: path,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        exists: false,
        isDirectory: false,
        isFile: false,
        path: path,
      };
    }
    throw error; // Permission errors, etc.
  }
}
```

### Entity 3: SCP Execution Context

**Purpose**: Complete context required to execute SCP command

**Fields**:

- `service: string` - Selected service name
- `environment: Environment` - Selected environment
- `cloudConfig: CloudConfig` - IP and private key from configuration
- `localPath: string` - Validated local source path
- `remotePath: string` - Remote destination path
- `isRecursive: boolean` - Whether to use -r flag

**Derivation**:

```typescript
interface ScpExecutionContext {
  service: string;
  environment: Environment;
  cloudConfig: CloudConfig;
  localPath: string;
  remotePath: string;
  isRecursive: boolean;
}

// Derived from user input + configuration + validation
function buildExecutionContext(
  params: ScpCommandParams,
  config: Config,
  pathInfo: PathValidationResult
): ScpExecutionContext {
  return {
    service: params.options.service || await promptForService(...),
    environment: params.options.env || await promptForEnvironment(...),
    cloudConfig: config.yiren[service][environment],
    localPath: pathInfo.path,
    remotePath: params.remotePath,
    isRecursive: pathInfo.isDirectory
  };
}
```

## Configuration Data Model

### Configuration File Structure

The SCP command uses the existing `~/.hsh/config.json` structure:

```json
{
  "yiren": {
    "service-name": {
      "dev": {
        "ip": "192.168.1.10",
        "privateKeyFile": "/path/to/dev-key.pem"
      },
      "staging": {
        "ip": "192.168.1.20",
        "privateKeyFile": "/path/to/staging-key.pem"
      },
      "prod": {
        "ip": "192.168.1.30",
        "privateKeyFile": "/path/to/prod-key.pem"
      }
    }
  }
}
```

**No Schema Changes Required**: SCP command fully reuses cloud login configuration

## Data Flow

### 1. Command Input → Validation

```
User Input:
  hsh cloud scp -r ./dist /var/www/html --env prod --service my-app

↓

Parse Parameters:
  localPath: "./dist"
  remotePath: "/var/www/html"
  options: { env: "prod", service: "my-app", recursive: true }

↓

Validate Local Path:
  await stat("./dist")
  → { exists: true, isDirectory: true, isFile: false }

↓

Validate Recursive Flag:
  isDirectory: true
  recursive: true
  → ✅ Valid
```

### 2. Configuration Resolution

```
Configuration Lookup:
  config.yiren["my-app"]["prod"]

↓

Extract CloudConfig:
  {
    ip: "192.168.1.30",
    privateKeyFile: "/path/to/prod-key.pem"
  }

↓

Validate Private Key:
  await validatePrivateKey("/path/to/prod-key.pem")
  → Check existence, permissions
```

### 3. Interactive Prompts (if options missing)

```
If options.service === undefined:
  services = Object.keys(config.yiren)
  selectedService = await promptForService(services)

If options.env === undefined:
  environments = Object.keys(config.yiren[service])
  selectedEnv = await promptForEnvironment(environments)
```

### 4. Execution Context → SCP Command

```
Build Context:
  {
    service: "my-app",
    environment: "prod",
    cloudConfig: { ip: "...", privateKeyFile: "..." },
    localPath: "./dist",
    remotePath: "/var/www/html",
    isRecursive: true
  }

↓

Construct SCP Command:
  scp -i /path/to/prod-key.pem scp -r ./dist root@192.168.1.30:/var/www/html

↓

Execute via zx:
  await $`scp -i ${privateKey} scp ${flags} ${localPath} root@${ip}:${remotePath}`
```

## Error States

### Path Validation Errors

```typescript
// Error State 1: Path doesn't exist
{
  exists: false,
  isDirectory: false,
  isFile: false,
  path: "./nonexistent"
}
→ Error: "❌ Local path not found: ./nonexistent"

// Error State 2: Directory without -r flag
{
  exists: true,
  isDirectory: true,
  isFile: false,
  path: "./dist"
}
+ options.recursive: false
→ Error: "❌ Cannot copy directory without -r flag"

// Error State 3: Permission denied
throw { code: 'EACCES', path: './restricted' }
→ Error: "❌ Permission denied: ./restricted"
```

### Configuration Errors

```typescript
// Error State 4: Service not found
config.yiren["unknown-service"]
→ undefined
→ Error: "❌ Service 'unknown-service' not found in configuration"

// Error State 5: Environment not configured
config.yiren["my-app"]["unknown-env"]
→ undefined
→ Error: "❌ Environment 'unknown-env' not configured for service 'my-app'"

// Error State 6: No services configured
config.yiren
→ {} (empty)
→ Error: "❌ No cloud services configured in yiren section"
```

### SSH/SCP Errors

```typescript
// Error State 7: Connection timeout
→ Handled by handleSSHError()
→ "❌ Connection timeout - check network connectivity and IP address"

// Error State 8: Authentication failure
→ Handled by handleSSHError()
→ "❌ Authentication failed - check private key file permissions and path"

// Error State 9: Host unreachable
→ Handled by handleSSHError()
→ "❌ Host unreachable - verify IP address and network access"
```

## State Management

This feature is stateless - all state is ephemeral and exists only during command execution:

1. **Input State**: Command-line arguments and options (ephemeral)
2. **Configuration State**: Read from `~/.hsh/config.json` (persistent, read-only)
3. **Validation State**: Path validation results (ephemeral, derived)
4. **Execution State**: SCP execution context (ephemeral, derived)

**No Persistent State**: No databases, no session storage, no state files

## Type Safety Guarantees

### TypeScript Strict Mode Enforcement

```typescript
// All functions have explicit return types
async function cloudScp(localPath: string, remotePath: string, options: ScpOptions): Promise<void>;

// All parameters are typed
async function validateLocalPath(path: string): Promise<PathValidationResult>;

// Error handling preserves types
try {
  await cloudScp(localPath, remotePath, options);
} catch (error: any) {
  handleSSHError(error);
}
```

### Interface Validation

```typescript
// Configuration structure is validated at runtime
function isCloudConfig(obj: any): obj is CloudConfig {
  return obj && typeof obj.ip === 'string' && typeof obj.privateKeyFile === 'string';
}

// Environment validation
function isEnvironment(value: any): value is Environment {
  return value === 'dev' || value === 'staging' || value === 'prod';
}
```

## Summary

The data model for `hsh cloud scp` is intentionally minimal:

- **Reuses 100%** of existing cloud login types (`Environment`, `CloudConfig`, `ServiceConfig`, `Config`)
- **Adds 3 new types** for SCP-specific needs (`ScpOptions`, `PathValidationResult`, `ScpOperation`)
- **No schema changes** to configuration file structure
- **Stateless design** with ephemeral state during execution
- **Type-safe** with strict TypeScript enforcement
- **Validated** at each stage: path → configuration → execution

This aligns with the constitution's TypeScript-First principle and the modular architecture requirement by maintaining clear separation between types, validation, and execution logic.
