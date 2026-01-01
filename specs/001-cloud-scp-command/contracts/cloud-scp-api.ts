/**
 * API Contract: Cloud SCP Command
 *
 * This file defines the public API contract for the hsh cloud scp command.
 * It serves as the interface specification for the command implementation.
 *
 * Feature: 001-cloud-scp-command
 * Date: 2025-10-11
 */

import { Environment, CloudConfig } from '../../../src/types/index.js';

// ============================================================================
// Command-Line Interface Contract
// ============================================================================

/**
 * Command Signature:
 * hsh cloud scp [options] <local-path> <remote-path>
 *
 * Options:
 *   -r, --recursive         Copy directories recursively
 *   --env <environment>     Environment: dev, staging, or prod
 *   --service <service>     Service name (e.g., todo-mini, wuhan-mall)
 *
 * Arguments:
 *   <local-path>           Local file or directory path to copy
 *   <remote-path>          Remote destination path on target server
 *
 * Examples:
 *   hsh cloud scp ./config.json /etc/app/config.json --env dev --service my-app
 *   hsh cloud scp -r ./dist /var/www/html --env staging --service my-app
 *   hsh cloud scp ./deploy.sh /root/scripts/
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * SCP command options parsed from CLI flags
 */
export interface ScpOptions {
  /**
   * Target environment (dev, staging, or prod)
   * If undefined, user will be prompted to select
   */
  env?: Environment;

  /**
   * Target service name
   * If undefined, user will be prompted to select from available services
   */
  service?: string;

  /**
   * Whether to copy directories recursively
   * Required true for directory copies, ignored for files
   */
  recursive?: boolean;
}

/**
 * Result of local path validation
 */
export interface PathValidationResult {
  /** Whether the path exists on the local filesystem */
  exists: boolean;

  /** Whether the path is a directory */
  isDirectory: boolean;

  /** Whether the path is a regular file */
  isFile: boolean;

  /** The validated path (may be resolved to absolute) */
  path: string;
}

/**
 * Complete execution context for SCP operation
 */
export interface ScpExecutionContext {
  /** Selected service name */
  service: string;

  /** Selected environment */
  environment: Environment;

  /** Cloud configuration (IP and private key) */
  cloudConfig: CloudConfig;

  /** Validated local source path */
  localPath: string;

  /** Remote destination path */
  remotePath: string;

  /** Whether to use recursive flag */
  isRecursive: boolean;
}

/**
 * SCP operation metadata for logging/tracking
 */
export interface ScpOperation {
  /** Local source path */
  localPath: string;

  /** Remote destination path */
  remotePath: string;

  /** Target service */
  service: string;

  /** Target environment */
  environment: Environment;

  /** Whether operation was recursive */
  isDirectory: boolean;

  /** Operation timestamp */
  timestamp: Date;
}

// ============================================================================
// Main API Function
// ============================================================================

/**
 * Execute SCP file transfer to cloud instance
 *
 * @param localPath - Local file or directory path to copy
 * @param remotePath - Remote destination path on target server
 * @param options - Command options (environment, service, recursive flag)
 *
 * @throws {Error} If local path doesn't exist
 * @throws {Error} If directory copy attempted without -r flag
 * @throws {Error} If service or environment not found in configuration
 * @throws {Error} If private key validation fails
 * @throws {Error} If SSH/SCP connection fails
 *
 * @returns Promise that resolves when file transfer completes successfully
 *
 * @example
 * ```typescript
 * // Copy file with explicit options
 * await cloudScp('./config.json', '/etc/app/', {
 *   env: 'dev',
 *   service: 'my-app',
 *   recursive: false
 * });
 *
 * // Copy directory with interactive prompts
 * await cloudScp('./dist', '/var/www/html', {
 *   recursive: true
 *   // env and service will be prompted
 * });
 * ```
 */
export async function cloudScp(
  localPath: string,
  remotePath: string,
  options: ScpOptions
): Promise<void>;

// ============================================================================
// Helper Functions (Exported for Testing/Reuse)
// ============================================================================

/**
 * Validate that local path exists and determine its type
 *
 * @param path - Local file or directory path to validate
 * @returns Promise resolving to validation result
 *
 * @throws {Error} If permission denied or other filesystem error
 *
 * @example
 * ```typescript
 * const result = await validateLocalPath('./dist');
 * if (!result.exists) {
 *   console.error('Path not found');
 * } else if (result.isDirectory && !options.recursive) {
 *   console.error('Use -r flag for directories');
 * }
 * ```
 */
export async function validateLocalPath(path: string): Promise<PathValidationResult>;

/**
 * Build complete execution context from user input and configuration
 *
 * @param localPath - Validated local source path
 * @param remotePath - Remote destination path
 * @param options - Command options
 * @param config - Application configuration
 * @param pathInfo - Path validation result
 *
 * @returns Promise resolving to execution context
 *
 * @throws {Error} If service or environment not found in configuration
 */
export async function buildExecutionContext(
  localPath: string,
  remotePath: string,
  options: ScpOptions,
  config: Config,
  pathInfo: PathValidationResult
): Promise<ScpExecutionContext>;

/**
 * Construct and execute SCP command via SSH wrapper
 *
 * @param context - Complete execution context
 *
 * @returns Promise that resolves when SCP command completes
 *
 * @throws {Error} If SCP/SSH command fails
 *
 * @example
 * ```typescript
 * const context: ScpExecutionContext = {
 *   service: 'my-app',
 *   environment: 'dev',
 *   cloudConfig: { ip: '192.168.1.10', privateKeyFile: '/path/to/key.pem' },
 *   localPath: './dist',
 *   remotePath: '/var/www/html',
 *   isRecursive: true
 * };
 *
 * await executeScpCommand(context);
 * // Output: ✅ Successfully copied to my-app (dev): /var/www/html
 * ```
 */
export async function executeScpCommand(context: ScpExecutionContext): Promise<void>;

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * Validation rules applied during command execution:
 *
 * 1. Local Path Validation:
 *    - Path must exist on local filesystem
 *    - Path must be readable (file permission check)
 *    - If directory: -r flag must be provided
 *
 * 2. Configuration Validation:
 *    - Service must exist in config.yiren
 *    - Environment must exist for selected service
 *    - CloudConfig must have valid ip and privateKeyFile
 *
 * 3. Private Key Validation:
 *    - Private key file must exist
 *    - Private key file should have 600 permissions (warning if not)
 *
 * 4. Production Safety:
 *    - Production environment requires explicit confirmation
 *    - Confirmation must be affirmative (default: false)
 *
 * 5. Remote Path Validation:
 *    - Remote path must be non-empty string
 *    - Format validation delegated to SSH/SCP
 */

// ============================================================================
// Error Handling Contract
// ============================================================================

/**
 * Error Categories:
 *
 * 1. Path Errors:
 *    - "❌ Local path not found: {path}"
 *    - "❌ Permission denied: {path}"
 *    - "❌ Cannot copy directory without -r flag"
 *
 * 2. Configuration Errors:
 *    - "❌ No cloud services configured in yiren section"
 *    - "❌ Service '{service}' not found in configuration"
 *    - "❌ Environment '{env}' not configured for service '{service}'"
 *
 * 3. SSH/SCP Errors (handled by handleSSHError):
 *    - "❌ Connection timeout - check network connectivity and IP address"
 *    - "❌ Authentication failed - check private key file permissions and path"
 *    - "❌ Host unreachable - verify IP address and network access"
 *    - "❌ Connection refused - check if SSH service is running on target host"
 *
 * 4. User Cancellation:
 *    - "⏸️  Production operation cancelled."
 */

// ============================================================================
// Success Messages
// ============================================================================

/**
 * Success message format:
 * "✅ Successfully copied to {service} ({environment}): {remotePath}"
 *
 * Example:
 * "✅ Successfully copied to my-app (dev): /var/www/html"
 */

// ============================================================================
// Configuration Contract
// ============================================================================

/**
 * Configuration structure (reuses existing cloud login config):
 *
 * ~/.hsh/config.json:
 * {
 *   "yiren": {
 *     "[service-name]": {
 *       "dev": {
 *         "ip": "192.168.1.10",
 *         "privateKeyFile": "/path/to/dev-key.pem"
 *       },
 *       "staging": {
 *         "ip": "192.168.1.20",
 *         "privateKeyFile": "/path/to/staging-key.pem"
 *       },
 *       "prod": {
 *         "ip": "192.168.1.30",
 *         "privateKeyFile": "/path/to/prod-key.pem"
 *       }
 *     }
 *   }
 * }
 *
 * No schema changes required - 100% compatible with cloud login configuration
 */

// ============================================================================
// Integration Points
// ============================================================================

/**
 * Functions reused from existing cloud.ts module:
 *
 * - validatePrivateKey(privateKeyFile: string): Promise<void>
 *   → Validates SSH private key existence and permissions
 *
 * - handleSSHError(error: any): void
 *   → Handles SSH/SCP connection errors with user-friendly messages
 *
 * - promptForService(availableServices: string[]): Promise<string>
 *   → Interactive service selection prompt
 *
 * - promptForEnvironment(availableEnvironments: Environment[]): Promise<Environment>
 *   → Interactive environment selection prompt
 *
 * - readConfig(): Config
 *   → Reads configuration from ~/.hsh/config.json (from util.ts)
 */

// ============================================================================
// Testing Contract
// ============================================================================

/**
 * Testable scenarios:
 *
 * 1. Happy Path - File Copy:
 *    Input: Valid file path, valid remote path, valid service/env
 *    Expected: SCP command executed successfully
 *
 * 2. Happy Path - Directory Copy:
 *    Input: Valid directory path with -r flag, valid remote path, valid service/env
 *    Expected: SCP command with -r flag executed successfully
 *
 * 3. Error - Missing File:
 *    Input: Non-existent file path
 *    Expected: Error message "❌ Local path not found: {path}"
 *
 * 4. Error - Directory without -r:
 *    Input: Directory path without -r flag
 *    Expected: Error message "❌ Cannot copy directory without -r flag"
 *
 * 5. Error - Service Not Found:
 *    Input: Invalid service name
 *    Expected: Error message "❌ Service '{service}' not found in configuration"
 *
 * 6. Interactive - Service Selection:
 *    Input: No --service flag provided
 *    Expected: Prompt displays available services, accepts selection
 *
 * 7. Interactive - Environment Selection:
 *    Input: No --env flag provided
 *    Expected: Prompt displays available environments, accepts selection
 *
 * 8. Safety - Production Confirmation:
 *    Input: --env prod
 *    Expected: Production warning prompt, requires confirmation
 *
 * 9. Safety - Production Cancelled:
 *    Input: --env prod, user declines confirmation
 *    Expected: Operation cancelled with message "⏸️  Production operation cancelled."
 */
