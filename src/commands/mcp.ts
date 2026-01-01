import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

interface McpServerConfig {
  [serverName: string]: {
    type?: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
}

interface ClaudeConfig {
  projects: {
    [projectPath: string]: {
      mcpServers?: McpServerConfig;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Sync MCP servers from ~/.mcp/servers.json to all projects in ~/.claude.json
 */
export async function syncMcpServers() {
  const spinner = ora('Syncing MCP servers...').start();

  try {
    // Read MCP servers configuration
    const mcpConfigPath = join(homedir(), '.mcp', 'servers.json');
    const claudeConfigPath = join(homedir(), '.claude.json');

    let mcpServers: McpServerConfig;
    try {
      const mcpConfigContent = readFileSync(mcpConfigPath, 'utf-8');
      mcpServers = JSON.parse(mcpConfigContent);
      spinner.text = `Found ${Object.keys(mcpServers).length} MCP servers`;
    } catch {
      spinner.fail(chalk.red(`Failed to read MCP servers from ${mcpConfigPath}`));
      console.error(chalk.yellow(`Please ensure ${mcpConfigPath} exists and is valid JSON`));
      return;
    }

    // Read Claude configuration
    let claudeConfig: ClaudeConfig;
    try {
      const claudeConfigContent = readFileSync(claudeConfigPath, 'utf-8');
      claudeConfig = JSON.parse(claudeConfigContent);
    } catch {
      spinner.fail(chalk.red(`Failed to read Claude config from ${claudeConfigPath}`));
      return;
    }

    // Check if there are any projects
    if (!claudeConfig.projects || Object.keys(claudeConfig.projects).length === 0) {
      spinner.warn(chalk.yellow('No projects found in ~/.claude.json'));
      return;
    }

    // Update each project with MCP servers
    const projectPaths = Object.keys(claudeConfig.projects);
    spinner.text = `Updating ${projectPaths.length} projects...`;

    let updatedCount = 0;
    for (const projectPath of projectPaths) {
      const project = claudeConfig.projects[projectPath];

      // Check if mcpServers need to be updated
      const currentServers = JSON.stringify(project.mcpServers || {});
      const newServers = JSON.stringify(mcpServers);

      if (currentServers !== newServers) {
        project.mcpServers = mcpServers;
        updatedCount++;
      }
    }

    // Write back to ~/.claude.json
    if (updatedCount > 0) {
      writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2), 'utf-8');

      spinner.succeed(
        chalk.green(
          `✓ Successfully synced MCP servers to ${updatedCount} project${updatedCount > 1 ? 's' : ''}`
        )
      );

      console.log(chalk.cyan('\nMCP Servers synced:'));
      Object.keys(mcpServers).forEach((serverName) => {
        console.log(chalk.gray(`  • ${serverName}`));
      });

      console.log(chalk.cyan('\nProjects updated:'));
      projectPaths.slice(0, 5).forEach((path) => {
        console.log(chalk.gray(`  • ${path}`));
      });
      if (projectPaths.length > 5) {
        console.log(chalk.gray(`  ... and ${projectPaths.length - 5} more`));
      }
    } else {
      spinner.info(chalk.blue('All projects already have the latest MCP servers configuration'));
    }
  } catch (error: unknown) {
    spinner.fail(chalk.red('Failed to sync MCP servers'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  }
}
