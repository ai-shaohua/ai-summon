# Quickstart: Cloud SCP Command

**Feature**: 001-cloud-scp-command
**Date**: 2025-10-11
**Audience**: Developers implementing or using the `hsh cloud scp` command

## Overview

This quickstart guide provides step-by-step instructions for implementing and using the `hsh cloud scp` command. The command enables secure file and directory copying to cloud instances using the same configuration as `hsh cloud login`.

---

## Prerequisites

### For Implementation

- Node.js 16+ installed
- TypeScript 5.0+ compiler
- Yarn package manager
- Familiarity with Commander.js, zx, and inquirer libraries
- Access to the hsh project repository

### For Usage

- `hsh` CLI tool installed globally (`yarn build:install`)
- Cloud configuration set up in `~/.hsh/config.json`
- SSH private key files with proper permissions (600)
- SSH client installed (part of standard OS installation)

---

## Configuration Setup

### Step 1: Configure Cloud Services

Create or update `~/.hsh/config.json` with your cloud services:

```json
{
  "yiren": {
    "my-service": {
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

**Note**: This configuration is shared with `hsh cloud login`. No additional setup needed if cloud login already configured.

### Step 2: Verify Private Key Permissions

Ensure your SSH private key files have correct permissions:

```bash
chmod 600 /path/to/dev-key.pem
chmod 600 /path/to/staging-key.pem
chmod 600 /path/to/prod-key.pem
```

The command will warn you if permissions are incorrect but will still attempt the connection.

---

## Basic Usage

### Copy a Single File

```bash
# With explicit service and environment
hsh cloud scp ./config.json /etc/app/config.json --env dev --service my-service

# Interactive mode (prompts for service and environment)
hsh cloud scp ./config.json /etc/app/config.json
```

**Expected Output**:

```
🔗 Connecting to my-service (dev): 192.168.1.10
✅ Successfully copied to my-service (dev): /etc/app/config.json
```

### Copy a Directory

```bash
# Directory copy REQUIRES -r flag
hsh cloud scp -r ./dist /var/www/html --env staging --service my-service

# Interactive mode with recursive flag
hsh cloud scp -r ./build /opt/app/
```

**Expected Output**:

```
🔗 Connecting to my-service (staging): 192.168.1.20
✅ Successfully copied to my-service (staging): /var/www/html
```

### Production Deployment (with Safety Confirmation)

```bash
hsh cloud scp -r ./dist /var/www/html --env prod --service my-service
```

**Expected Prompt**:

```
? ⚠️  You are about to copy files to PRODUCTION (my-service). Continue? (y/N)
```

**If confirmed (y)**:

```
🔗 Connecting to my-service (prod): 192.168.1.30
✅ Successfully copied to my-service (prod): /var/www/html
```

**If cancelled (N)**:

```
⏸️  Production operation cancelled.
```

---

## Common Use Cases

### 1. Deploy Configuration File

```bash
# Update application config on staging
hsh cloud scp ./app.config.json /etc/myapp/config.json --env staging --service myapp
```

### 2. Deploy Built Application

```bash
# Deploy production build to web server
hsh cloud scp -r ./dist /var/www/html --env prod --service myapp
```

### 3. Upload Deployment Scripts

```bash
# Copy deployment script to server
hsh cloud scp ./scripts/deploy.sh /root/scripts/deploy.sh --env dev --service myapp
```

### 4. Batch File Upload

```bash
# Upload multiple config files
hsh cloud scp ./configs/nginx.conf /etc/nginx/sites-available/myapp --env dev --service myapp
hsh cloud scp ./configs/systemd.service /etc/systemd/system/myapp.service --env dev --service myapp
```

### 5. Interactive Workflow (No Flags)

```bash
# Let the CLI guide you through service and environment selection
hsh cloud scp -r ./dist /var/www/html
```

**Interactive Prompts**:

```
? Select service: (Use arrow keys)
❯ todo-mini
  wuhan-mall
  my-service

? Select environment: (Use arrow keys)
❯ dev
  staging
  prod
```

---

## Error Handling

### Error: Local Path Not Found

```bash
hsh cloud scp ./nonexistent.txt /tmp/
```

**Output**:

```
❌ Local path not found: ./nonexistent.txt
```

**Solution**: Verify the local path exists and is typed correctly.

---

### Error: Directory Without -r Flag

```bash
hsh cloud scp ./dist /var/www/html --env dev --service myapp
```

**Output**:

```
❌ Cannot copy directory without -r flag
Hint: Use -r flag for recursive directory copy
```

**Solution**: Add `-r` flag for directory copies:

```bash
hsh cloud scp -r ./dist /var/www/html --env dev --service myapp
```

---

### Error: Service Not Configured

```bash
hsh cloud scp ./file.txt /tmp/ --service unknown-service
```

**Output**:

```
❌ Service 'unknown-service' not found in configuration
Available services: my-service, todo-mini, wuhan-mall
```

**Solution**: Use one of the available services or add the service to `~/.hsh/config.json`.

---

### Error: Environment Not Configured

```bash
hsh cloud scp ./file.txt /tmp/ --env dev --service my-service
```

**Output**:

```
❌ Environment 'dev' not configured for service 'my-service'
Available environments for my-service: staging, prod
```

**Solution**: Add the missing environment to `~/.hsh/config.json` or use an available environment.

---

### Error: Connection Timeout

```bash
hsh cloud scp ./file.txt /tmp/ --env dev --service myapp
```

**Output**:

```
🔗 Connecting to myapp (dev): 192.168.1.10
❌ Connection timeout - check network connectivity and IP address
```

**Solution**:

- Verify the IP address in configuration is correct
- Check network connectivity to the server
- Ensure the server is running and accessible

---

### Error: Authentication Failed

**Output**:

```
❌ Authentication failed - check private key file permissions and path
```

**Solution**:

- Verify private key file path in configuration
- Check private key file permissions: `chmod 600 /path/to/key.pem`
- Ensure the key matches the server's authorized_keys

---

## Implementation Guide

### Step 1: Add Types to types/index.ts

```typescript
// Add SCP-specific types
export interface ScpOptions {
  env?: Environment;
  service?: string;
  recursive?: boolean;
}

export interface PathValidationResult {
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  path: string;
}
```

### Step 2: Implement cloudScp Function in src/commands/cloud.ts

```typescript
import { stat } from 'fs/promises';

// Path validation helper
async function validateLocalPath(path: string): Promise<PathValidationResult> {
  try {
    const stats = await stat(path);
    return {
      exists: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      path: path,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        exists: false,
        isDirectory: false,
        isFile: false,
        path: path,
      };
    }
    throw error;
  }
}

// Main SCP function
export async function cloudScp(
  localPath: string,
  remotePath: string,
  options: ScpOptions
): Promise<void> {
  try {
    // 1. Validate local path
    const pathInfo = await validateLocalPath(localPath);

    if (!pathInfo.exists) {
      console.error(chalk.red(`❌ Local path not found: ${localPath}`));
      return;
    }

    // 2. Check recursive flag for directories
    if (pathInfo.isDirectory && !options.recursive) {
      console.error(chalk.red('❌ Cannot copy directory without -r flag'));
      console.log(chalk.yellow('Hint: Use -r flag for recursive directory copy'));
      return;
    }

    // 3. Read configuration
    const config = readConfig();

    // 4. Service selection (interactive if not provided)
    const service = options.service || (await promptForService(Object.keys(config.yiren)));

    // 5. Environment selection (interactive if not provided)
    const serviceConfig = config.yiren[service];
    const env =
      options.env || (await promptForEnvironment(Object.keys(serviceConfig) as Environment[]));

    // 6. Get cloud configuration
    const cloudConfig = serviceConfig[env];

    // 7. Validate private key
    await validatePrivateKey(cloudConfig.privateKeyFile);

    // 8. Production confirmation
    if (env === 'prod') {
      const { confirmProduction } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmProduction',
          message: chalk.red(
            `⚠️  You are about to copy files to PRODUCTION (${service}). Continue?`
          ),
          default: false,
        },
      ]);

      if (!confirmProduction) {
        console.log(chalk.yellow('⏸️  Production operation cancelled.'));
        return;
      }
    }

    // 9. Execute SCP
    console.log(chalk.blue(`🔗 Connecting to ${service} (${env}): ${cloudConfig.ip}`));

    const flags = pathInfo.isDirectory ? '-r' : '';
    await $`scp -i ${cloudConfig.privateKeyFile} -o ConnectTimeout=10 -o StrictHostKeyChecking=no scp ${flags} ${localPath} root@${cloudConfig.ip}:${remotePath}`;

    console.log(chalk.green(`✅ Successfully copied to ${service} (${env}): ${remotePath}`));
  } catch (error) {
    handleSSHError(error);
    process.exit(1);
  }
}
```

### Step 3: Register Command in src/hsh.ts

```typescript
// Add import
import { cloudLogin, cloudScp } from './commands/cloud.js';

// Add SCP subcommand to existing cloud command
cloudCommand
  .command('scp')
  .description('Copy files to cloud instances')
  .option('-r, --recursive', 'Copy directories recursively')
  .option('--env <environment>', 'Environment: dev, staging, or prod')
  .option('--service <service>', 'Service name')
  .argument('<local-path>', 'Local file or directory path')
  .argument('<remote-path>', 'Remote destination path')
  .action(async (localPath: string, remotePath: string, options: ScpOptions) => {
    await cloudScp(localPath, remotePath, options);
  });
```

### Step 4: Build and Test

```bash
# Compile TypeScript
yarn build

# Install globally for testing
yarn build:install

# Test with a simple file
hsh cloud scp ./package.json /tmp/test.json --env dev --service myapp

# Test with a directory
hsh cloud scp -r ./dist /tmp/dist-test --env dev --service myapp
```

---

## Testing Checklist

- [ ] File copy with explicit --env and --service flags
- [ ] Directory copy with -r flag
- [ ] Interactive service selection (no --service flag)
- [ ] Interactive environment selection (no --env flag)
- [ ] Production confirmation prompt
- [ ] Production cancellation
- [ ] Error handling for missing local path
- [ ] Error handling for directory without -r flag
- [ ] Error handling for invalid service
- [ ] Error handling for invalid environment
- [ ] Error handling for connection timeout
- [ ] Error handling for authentication failure

---

## Troubleshooting

### Command Not Found

**Problem**: `hsh: command not found` or `hsh cloud scp: command not found`

**Solution**:

```bash
cd /path/to/hsh
yarn build:install
```

### TypeScript Compilation Errors

**Problem**: Type errors during build

**Solution**:

- Ensure all types are imported from `types/index.ts`
- Verify strict mode compliance
- Check that all function signatures match the API contract

### Permission Warnings

**Problem**: Warning about private key file permissions

**Solution**:

```bash
chmod 600 /path/to/private-key.pem
```

---

## Next Steps

After implementing the cloud scp command:

1. **Test thoroughly** across all environments (dev, staging, prod)
2. **Update documentation** if additional use cases are discovered
3. **Consider enhancements**:
   - Add progress indication for large file transfers
   - Support bidirectional copy (download from remote)
   - Add dry-run mode to preview operations
   - Support custom SSH ports via configuration

---

## Summary

The `hsh cloud scp` command provides a streamlined way to copy files and directories to cloud instances:

✅ Reuses existing cloud configuration
✅ Interactive service/environment selection
✅ Production safety confirmations
✅ Clear error messages with actionable guidance
✅ Follows project TypeScript and CLI conventions

For questions or issues, refer to the full specification in `spec.md` or the implementation contracts in `contracts/cloud-scp-api.ts`.
