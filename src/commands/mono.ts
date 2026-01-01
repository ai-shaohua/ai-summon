import chalk from 'chalk';
import fs from 'fs';
import 'zx/globals';
import { RepoDirLevel } from '../types/index.js';
import inquirer from 'inquirer';
import inquirerAutocomplete from 'inquirer-autocomplete-prompt';

export const initMonoRepo = () => {
  if (fs.existsSync('.hsh')) {
    console.warn(chalk.yellow('Workspace Initialized Already'));
    return;
  }
  fs.writeFileSync('.hsh', 'mono'); // write mono for time being
  console.log(chalk.green('Workspace Initialized Successfully'));
};

const getMonoRoot = () => {
  while (!fs.existsSync('.hsh')) {
    process.chdir('..');
  }
  return process.cwd();
};

export const monoCd = async (repoDirLevel: RepoDirLevel, repo?: string) => {
  const monoRoot = getMonoRoot();
  if (repoDirLevel === 'root') {
    console.log(`cd ${monoRoot}`);
    return;
  }

  const repoName = repo || (await chooseRepo());

  if (repoDirLevel === 'client') {
    console.log(`cd ${monoRoot}/${repoName}/client`);
  }
  if (repoDirLevel === 'server') {
    console.log(`cd ${monoRoot}/${repoName}/server`);
  }
};

async function searchDirectories(_answers: unknown, input = '') {
  const monoRoot = getMonoRoot();
  const directories = fs
    .readdirSync(monoRoot, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  if (!input) {
    return directories;
  }

  return directories.filter((dir) => dir.toLowerCase().includes(input.toLowerCase()));
}

const chooseRepo = async () => {
  // 注册自动补全提示插件
  inquirer.registerPrompt('autocomplete', inquirerAutocomplete);

  const answer = await inquirer.prompt([
    {
      type: 'autocomplete',
      name: 'directory',
      message: 'Select repo to navigate to:',
      source: searchDirectories,
      pageSize: 10,
    },
  ]);

  return answer.directory;
};
