import { $ } from 'zx';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { access, stat } from 'fs/promises';
import { constants } from 'fs';
import { readConfig } from '../util.js';
import { Environment, PathValidationResult, ScpOptions } from '../types/index.js';

// Private key validation function
export async function validatePrivateKey(privateKeyFile: string): Promise<void> {
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
  } catch {
    throw new Error(`Private key file not found or not accessible: ${privateKeyFile}`);
  }
}

// SSH error handling function
export function handleSSHError(error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes('Connection timed out')) {
    console.error(chalk.red('❌ Connection timeout - check network connectivity and IP address'));
  } else if (errorMessage.includes('Permission denied')) {
    console.error(
      chalk.red('❌ Authentication failed - check private key file permissions and path')
    );
  } else if (errorMessage.includes('No route to host')) {
    console.error(chalk.red('❌ Host unreachable - verify IP address and network access'));
  } else if (errorMessage.includes('Connection refused')) {
    console.error(
      chalk.red('❌ Connection refused - check if SSH service is running on the target host')
    );
  } else {
    console.error(chalk.red(`❌ SSH connection failed: ${errorMessage}`));
  }
}

// Interactive prompt helper for service selection
export async function promptForService(availableServices: string[]): Promise<string> {
  const { selectedService } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedService',
      message: 'Select service:',
      choices: availableServices,
      validate: (input: string) =>
        availableServices.includes(input) || 'Please select a valid service',
    },
  ]);
  return selectedService;
}

// Interactive prompt helper for environment selection
export async function promptForEnvironment(
  availableEnvironments: Environment[]
): Promise<Environment> {
  const { selectedEnv } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedEnv',
      message: 'Select environment:',
      choices: availableEnvironments,
      validate: (input: string) =>
        availableEnvironments.includes(input as Environment) || 'Please select a valid environment',
    },
  ]);
  return selectedEnv;
}

// Path validation helper for SCP command
export async function validateLocalPath(path: string): Promise<PathValidationResult> {
  try {
    const stats = await stat(path);
    return {
      exists: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      path: path,
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {
        exists: false,
        isDirectory: false,
        isFile: false,
        path: path,
      };
    }
    // Rethrow permission errors and other fs errors
    throw error;
  }
}

// Core cloud login function
export async function cloudLogin(env?: Environment, service?: string): Promise<void> {
  try {
    // Read configuration
    const config = readConfig();

    // Check if cloud services are configured
    if (!config.yiren || Object.keys(config.yiren).length === 0) {
      console.error(chalk.red('❌ No cloud services configured in yiren section'));
      return;
    }

    // Interactive service selection when service parameter is missing
    if (!service) {
      const availableServices = Object.keys(config.yiren);
      if (availableServices.length === 0) {
        console.error(chalk.red('❌ No cloud services configured'));
        return;
      }

      service = await promptForService(availableServices);
    }

    // Validate service exists in configuration
    const serviceConfig = config.yiren[service];
    if (!serviceConfig) {
      const availableServices = Object.keys(config.yiren);
      console.error(chalk.red(`❌ Service '${service}' not found in configuration`));
      console.error(chalk.yellow(`Available services: ${availableServices.join(', ')}`));
      return;
    }

    // Interactive environment selection when environment parameter is missing
    if (!env) {
      const availableEnvironments = Object.keys(serviceConfig) as Environment[];
      if (availableEnvironments.length === 0) {
        console.error(chalk.red(`❌ No environments configured for service '${service}'`));
        return;
      }

      env = await promptForEnvironment(availableEnvironments);
    }

    // Validate environment exists for service
    const cloudConfig = serviceConfig[env];
    if (!cloudConfig) {
      const availableEnvironments = Object.keys(serviceConfig);
      console.error(chalk.red(`❌ Environment '${env}' not configured for service '${service}'`));
      console.error(
        chalk.yellow(`Available environments for ${service}: ${availableEnvironments.join(', ')}`)
      );
      return;
    }

    // Validate private key file
    await validatePrivateKey(cloudConfig.privateKeyFile);

    // Production environment confirmation prompt for safety
    if (env === 'prod') {
      const { confirmProduction } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmProduction',
          message: chalk.red(
            `⚠️  You are about to connect to PRODUCTION environment for ${service}. Are you sure?`
          ),
          default: false,
        },
      ]);

      if (!confirmProduction) {
        console.log(chalk.yellow('⏸️  Production connection cancelled.'));
        return;
      }
    }

    // Execute SSH connection
    console.log(chalk.blue(`🔗 Connecting to ${service} (${env}): ${cloudConfig.ip}`));
    await $`ssh -i ${cloudConfig.privateKeyFile} -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@${cloudConfig.ip}`;
  } catch (error) {
    handleSSHError(error);
    process.exit(1);
  }
}

// Core cloud SCP function
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

    // 2. Check directory requires -r flag
    if (pathInfo.isDirectory && !options.recursive) {
      console.error(chalk.red('❌ Cannot copy directory without -r flag'));
      console.log(chalk.yellow('Hint: Use -r flag for recursive directory copy'));
      return;
    }

    // 3. Read configuration
    const config = readConfig();

    // Check if cloud services are configured
    if (!config.yiren || Object.keys(config.yiren).length === 0) {
      console.error(chalk.red('❌ No cloud services configured in yiren section'));
      return;
    }

    // 4. Interactive service selection when service parameter is missing
    let service = options.service;
    if (!service) {
      const availableServices = Object.keys(config.yiren);
      if (availableServices.length === 0) {
        console.error(chalk.red('❌ No cloud services configured'));
        return;
      }

      service = await promptForService(availableServices);
    }

    // 5. Validate service exists in configuration
    const serviceConfig = config.yiren[service];
    if (!serviceConfig) {
      const availableServices = Object.keys(config.yiren);
      console.error(chalk.red(`❌ Service '${service}' not found in configuration`));
      console.error(chalk.yellow(`Available services: ${availableServices.join(', ')}`));
      return;
    }

    // 6. Interactive environment selection when environment parameter is missing
    let env = options.env;
    if (!env) {
      const availableEnvironments = Object.keys(serviceConfig) as Environment[];
      if (availableEnvironments.length === 0) {
        console.error(chalk.red(`❌ No environments configured for service '${service}'`));
        return;
      }

      env = await promptForEnvironment(availableEnvironments);
    }

    // 7. Validate environment exists for service
    const cloudConfig = serviceConfig[env];
    if (!cloudConfig) {
      const availableEnvironments = Object.keys(serviceConfig);
      console.error(chalk.red(`❌ Environment '${env}' not configured for service '${service}'`));
      console.error(
        chalk.yellow(`Available environments for ${service}: ${availableEnvironments.join(', ')}`)
      );
      return;
    }

    // 8. Validate private key file
    await validatePrivateKey(cloudConfig.privateKeyFile);

    // 9. Production confirmation
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

    // 10. Execute SCP command
    const flags = pathInfo.isDirectory ? '-r' : '';
    console.log(chalk.blue(`🔗 Connecting to ${service} (${env}): ${cloudConfig.ip}`));

    if (flags) {
      await $`scp ${flags} -i ${cloudConfig.privateKeyFile} -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${localPath} root@${cloudConfig.ip}:${remotePath}`;
    } else {
      await $`scp -i ${cloudConfig.privateKeyFile} -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${localPath} root@${cloudConfig.ip}:${remotePath}`;
    }

    console.log(chalk.green(`✅ Successfully copied to ${service} (${env}): ${remotePath}`));
  } catch (error) {
    handleSSHError(error);
    process.exit(1);
  }
}
