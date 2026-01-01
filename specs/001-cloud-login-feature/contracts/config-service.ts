/**
 * Configuration Service Interface Contract
 * Defines the interface for reading and managing hsh configuration
 */

import { HshConfig, CloudConfig, Environment } from '../data-model';

export interface ConfigService {
  /**
   * Read configuration from ~/.ai/config.json
   * @returns Promise resolving to parsed configuration
   * @throws Error if file not found or invalid JSON
   */
  readConfig(): Promise<HshConfig>;

  /**
   * Get cloud configuration for specific service and environment
   * @param service Service name (e.g., todo-mini)
   * @param environment Environment name (dev, staging, prod)
   * @returns Cloud configuration or null if not found
   */
  getCloudConfig(service: string, environment: Environment): Promise<CloudConfig | null>;

  /**
   * Get all available services from configuration
   * @returns Array of service names
   */
  getAvailableServices(): Promise<string[]>;

  /**
   * Get all available environments for a specific service
   * @param service Service name
   * @returns Array of environment names
   */
  getAvailableEnvironments(service: string): Promise<Environment[]>;

  /**
   * Validate configuration structure and content
   * @returns Validation result with errors and warnings
   */
  validateConfig(): Promise<ConfigValidationResult>;

  /**
   * Migrate legacy configuration to new structure
   * @param legacyConfig Legacy configuration object
   * @returns Migrated configuration
   */
  migrateConfig(legacyConfig: any): HshConfig;

  /**
   * Check if configuration uses legacy format
   * @returns True if configuration needs migration
   */
  isLegacyConfig(): Promise<boolean>;
}

/**
 * SSH Service Interface Contract
 * Defines the interface for SSH connection management
 */
export interface SSHService {
  /**
   * Execute SSH connection to specified host
   * @param ip Target IP address
   * @param privateKeyFile Path to SSH private key
   * @param username SSH username (default: root)
   * @returns Promise that resolves when connection is established
   */
  connect(ip: string, privateKeyFile: string, username?: string): Promise<void>;

  /**
   * Validate SSH private key file
   * @param privateKeyFile Path to private key file
   * @returns Promise resolving to validation result
   */
  validatePrivateKey(privateKeyFile: string): Promise<{
    exists: boolean;
    permissions: string;
    isValid: boolean;
    suggestions: string[];
  }>;

  /**
   * Test SSH connectivity without establishing full session
   * @param ip Target IP address
   * @param privateKeyFile Path to SSH private key
   * @returns Promise resolving to connectivity test result
   */
  testConnectivity(
    ip: string,
    privateKeyFile: string
  ): Promise<{
    reachable: boolean;
    authenticated: boolean;
    latency: number;
    error?: string;
  }>;
}

/**
 * Prompt Service Interface Contract
 * Defines the interface for interactive user prompts
 */
export interface PromptService {
  /**
   * Prompt user to select service when not provided
   * @param availableServices List of available service names
   * @returns Selected service name
   */
  promptForService(availableServices: string[]): Promise<string>;

  /**
   * Prompt user to select environment when not provided
   * @param availableEnvironments List of available environments
   * @returns Selected environment
   */
  promptForEnvironment(availableEnvironments: Environment[]): Promise<Environment>;

  /**
   * Prompt user for confirmation before connecting to production
   * @param service Service name
   * @returns True if user confirms
   */
  confirmProductionAccess(service: string): Promise<boolean>;

  /**
   * Prompt user for missing configuration values
   * @param missingFields List of missing configuration fields
   * @returns User-provided configuration values
   */
  promptForConfiguration(missingFields: string[]): Promise<Record<string, string>>;
}

/**
 * Migration Service Interface Contract
 * Defines the interface for configuration migration
 */
export interface MigrationService {
  /**
   * Detect if current configuration needs migration
   * @returns Migration assessment
   */
  assessMigration(): Promise<{
    needsMigration: boolean;
    currentVersion: string;
    targetVersion: string;
    changes: string[];
  }>;

  /**
   * Execute configuration migration
   * @param backupOriginal Whether to backup original config
   * @returns Migration result
   */
  executeMigration(backupOriginal?: boolean): Promise<{
    success: boolean;
    backupPath?: string;
    errors: string[];
  }>;

  /**
   * Rollback migration to previous configuration
   * @param backupPath Path to backup configuration
   * @returns Rollback result
   */
  rollbackMigration(backupPath: string): Promise<{
    success: boolean;
    errors: string[];
  }>;
}
