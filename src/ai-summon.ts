#!/usr/bin/env node
import { Command } from 'commander';
import { getPackageJson } from './util.js';
import { openIDE, refreshIdeReposCache } from './commands/ide/index.js';
import { addUrl, openUrlGroup, removeUrl, searchAndOpenUrl } from './commands/url.js';
import { initConfig } from './commands/init.js';

const packageJson = getPackageJson();

const program = new Command();

program.usage('<command> [options]');
program.version(packageJson.version);

program
  .command('init')
  .description('initialize ~/.ai/config.json (prompts for workingDirectory)')
  .option('-w, --working-directory <path>', 'set workingDirectory without prompting')
  .option('-f, --force', 'overwrite existing config without confirmation')
  .action(async (options: { workingDirectory?: string; force?: boolean }) => {
    await initConfig({ workingDirectory: options.workingDirectory, force: options.force });
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
