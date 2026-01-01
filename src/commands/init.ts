import inquirer from 'inquirer';
import chalk from 'chalk';
import { existsSync, writeFileSync, statSync } from 'fs';
import { getConfigPath } from '../util.js';
import type { HshConfig } from '../types/index.js';

export async function initConfig(options?: {
  workingDirectory?: string;
  force?: boolean;
}): Promise<void> {
  const configPath = getConfigPath();

  if (existsSync(configPath) && !options?.force) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Config already exists at ${configPath}. Overwrite?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Init cancelled.'));
      return;
    }
  }

  const workingDirectory =
    options?.workingDirectory ??
    (
      await inquirer.prompt([
        {
          type: 'input',
          name: 'workingDirectory',
          message: 'workingDirectory (a folder containing your git repos):',
          default: process.cwd(),
          validate: (input: string) => {
            const value = input.trim();
            if (!value) return 'workingDirectory is required';
            if (!existsSync(value)) return `Path does not exist: ${value}`;
            try {
              if (!statSync(value).isDirectory()) return `Not a directory: ${value}`;
            } catch {
              return `Cannot access path: ${value}`;
            }
            return true;
          },
          filter: (input: string) => input.trim(),
        },
      ])
    ).workingDirectory;

  const payload: HshConfig = {
    workingDirectory,
    repos: {},
    yiren: {},
    urls: {},
    urlGroups: {},
  };

  writeFileSync(configPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(chalk.green(`✅ Wrote config: ${configPath}`));
}
