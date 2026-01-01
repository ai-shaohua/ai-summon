#!/usr/bin/env node
import { branchout, createMR, gcm, merge, push } from './commands/git.js';
import { Command } from 'commander';
import { initMonoRepo, monoCd } from './commands/mono.js';
import { RepoDirLevel } from './types/index.js';
import { getPackageJson } from './util.js';
import { openIDE, refreshIdeReposCache } from './commands/ide/index.js';
import { cloudLogin, cloudScp } from './commands/cloud.js';
import { syncMcpServers } from './commands/mcp.js';
import { addUrl, openUrlGroup, removeUrl, searchAndOpenUrl } from './commands/url.js';

const packageJson = getPackageJson();

const program = new Command();

program.usage('<command> [options]');
program.version(packageJson.version);

program
  .command('gcm')
  .description('commit changes')
  .option('--push', 'push to remote after commit')
  .argument('<words...>')
  .action((words: string[], options: { push?: boolean }) => {
    console.log(words, options);
    gcm(words.join(' '), options.push);
  });

program
  .command('push')
  .description('push branch to remote')
  .action(() => {
    push();
  });

program
  .command('merge')
  .description('merge branch into current branch')
  .argument('<branch>')
  .action((branch: string) => {
    merge(branch);
  });

program
  .command('mr')
  .description('create a merge request')
  .argument('<action>')
  .action((action: string) => {
    if (action === 'create') {
      // handle create case for now
      createMR();
    }
  });

program
  .command('branchout')
  .description('create a new branch')
  .argument('<branch>')
  .action((branch: string) => {
    branchout(branch);
  });

const mono = program.command('mono').description('multi repo management');
mono
  .command('init')
  .description('init mono repo')
  .action(() => {
    initMonoRepo();
  });

mono
  .command('cd')
  .description('cd into repo')
  .option('--repo <value>', 'specify repo name')
  .argument('<repoDirLevel>') // currently only supports root, client, server
  .action(async (repoDirLevel: RepoDirLevel, options: { repo?: string }) => {
    await monoCd(repoDirLevel, options.repo);
  });

const cursor = program.command('cursor').description('open project in Cursor');
cursor
  .argument('[search]', 'optional search keyword for fuzzy search')
  .action(async (search?: string) => {
    await openIDE('cursor', search);
  });
cursor
  .command('refresh')
  .description('refresh cached auto-discovered repositories (workingDirectory mode)')
  .action(async () => {
    await refreshIdeReposCache();
  });

const claude = program.command('claude').description('open project in Claude');
claude
  .argument('[search]', 'optional search keyword for fuzzy search')
  .action(async (search?: string) => {
    await openIDE('claude', search);
  });
claude
  .command('refresh')
  .description('refresh cached auto-discovered repositories (workingDirectory mode)')
  .action(async () => {
    await refreshIdeReposCache();
  });

// Cloud infrastructure management commands
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

// Add SCP subcommand
cloudCommand
  .command('scp')
  .description('Copy files to cloud instances')
  .option('-r, --recursive', 'Copy directories recursively')
  .option('--env <environment>', 'Environment: dev, staging, or prod')
  .option('--service <service>', 'Service name')
  .argument('<local-path>', 'Local file or directory path')
  .argument('<remote-path>', 'Remote destination path')
  .action(async (localPath: string, remotePath: string, options) => {
    await cloudScp(localPath, remotePath, options);
  });

// MCP management commands
const mcpCommand = program
  .command('mcp')
  .description('MCP (Model Context Protocol) server management');

mcpCommand
  .command('sync')
  .description('Sync MCP servers from ~/.mcp/servers.json to all projects in ~/.claude.json')
  .action(async () => {
    await syncMcpServers();
  });

// URL management commands
const urlCommand = program.command('url').description('URL bookmark management');

urlCommand
  .command('add')
  .description('Add a new URL bookmark')
  .argument('<name>', 'Name of the URL bookmark')
  .argument('<url>', 'URL to bookmark')
  .action(async (name: string, url: string) => {
    await addUrl(name, url);
  });

urlCommand
  .command('remove')
  .description('Remove a URL bookmark')
  .argument(
    '[name]',
    'Name of the URL bookmark to remove (optional, will enter search mode if not provided)'
  )
  .action(async (name?: string) => {
    await removeUrl(name);
  });

urlCommand
  .command('search')
  .description('Search and open a URL bookmark in Chrome')
  .option('--suppress', 'Auto-dismiss popups by simulating Enter key after 1s')
  .action(async (options: { suppress?: boolean }) => {
    await searchAndOpenUrl(options.suppress);
  });

urlCommand
  .command('group')
  .description('Select and open a URL group in a new Chrome window')
  .action(async () => {
    await openUrlGroup();
  });

program.parse();
