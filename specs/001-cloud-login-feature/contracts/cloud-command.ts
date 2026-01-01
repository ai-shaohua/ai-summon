/**
 * Cloud Command Interface Contract
 * Defines the CLI command interface for cloud infrastructure access
 */

export interface CloudLoginOptions {
  /** Environment to connect to: dev, staging, or prod */
  env?: 'dev' | 'staging' | 'prod';

  /** Service name to connect to (e.g., todo-mini, wuhan-mall) */
  service?: string;
}

export interface CloudLoginCommand {
  /**
   * Execute cloud login SSH connection
   * @param options Command options from CLI
   * @returns Promise that resolves when SSH session is established or rejects on error
   */
  execute(options: CloudLoginOptions): Promise<void>;
}

/**
 * Command signature for Commander.js integration
 * Main command: hsh cloud (with subcommands)
 * Usage: hsh cloud login --env dev --service todo-mini
 */
export interface CloudCommandDefinition {
  name: 'cloud';
  description: 'Cloud infrastructure management commands';
  subcommands: {
    login: {
      description: 'SSH into cloud instances based on environment and service';
      options: {
        '--env <environment>': 'Environment: dev, staging, or prod';
        '--service <service>': 'Service name (e.g., todo-mini, wuhan-mall)';
      };
      examples: [
        'hsh cloud login --env dev --service todo-mini',
        'hsh cloud login --env prod --service wuhan-mall',
        'hsh cloud login  # Interactive mode with prompts',
      ];
    };
    // Future subcommands can be added here
    // scp: { ... };
    // status: { ... };
  };
}

/**
 * Error types that can be thrown during cloud login execution
 */
export enum CloudLoginError {
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  INVALID_CONFIG = 'INVALID_CONFIG',
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  ENVIRONMENT_NOT_FOUND = 'ENVIRONMENT_NOT_FOUND',
  PRIVATE_KEY_NOT_FOUND = 'PRIVATE_KEY_NOT_FOUND',
  PRIVATE_KEY_PERMISSIONS = 'PRIVATE_KEY_PERMISSIONS',
  SSH_CONNECTION_FAILED = 'SSH_CONNECTION_FAILED',
  NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
}

/**
 * Structured error information for user feedback
 */
export interface CloudLoginErrorInfo {
  type: CloudLoginError;
  message: string;
  suggestion?: string;
  command?: string;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: CloudLoginErrorInfo[];
  warnings: string[];
}
