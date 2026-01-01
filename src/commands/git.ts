import inquirer from 'inquirer';
import chalk from 'chalk';
import 'zx/globals';

export const gcm = async function (message: string, isPush?: boolean): Promise<void> {
  await $`git add -A`;
  await $`git commit -m ${message}`;
  console.log(chalk.green('Committed changes successfully!\n'));

  if (isPush) {
    await push();
  }
};

export const merge = async (branch: string) => {
  const currentBranch = (await $`git branch --show-current`).stdout.trim();
  if (currentBranch === branch) {
    console.warn(chalk.yellow('Current branch is the same as the branch to be merged'));
    return;
  }
  await $`git checkout ${branch}`;
  await $`git pull origin ${branch}`;
  await $`git checkout ${currentBranch}`;
  await $`git merge ${branch}`;
  console.log(chalk.green('Merged branch into current branch successfully!\n'));
};

export const createMR = async () => {
  const currentBranch = (await $`git branch --show-current`).stdout.trim();

  // Extract commit type and JIRA number from branch name
  const branchParts = currentBranch.split('/');
  let defaultTitle = '';

  if (branchParts.length >= 2) {
    const commitType = branchParts[0];
    const jiraNumber = branchParts[1];
    defaultTitle = `${commitType}: ${jiraNumber}`;
  }

  const question = [
    {
      type: 'input',
      name: 'title',
      message: 'Please enter the MR title:',
      default: defaultTitle,
      validate(val: string) {
        if (!val) {
          return 'MR title is required!';
        }
        return true;
      },
    },
  ];

  const answers = await inquirer.prompt<{ title: string }>(question);
  const fullTitle = defaultTitle ? `${defaultTitle} ${answers.title}` : answers.title;
  await $`glab mr create --title=${fullTitle} --remove-source-branch --squash-before-merge -d ''`;
  console.log(chalk.green('MR created successfully!\n'));
};

export const branchout = async (branch: string) => {
  await $`git checkout master`;
  await $`git pull origin master`;
  await $`git checkout -b ${branch}`;
  console.log(chalk.green(`Created and checked out branch ${branch} successfully from master!\n`));
};

interface BranchQuestion {
  type: 'input';
  name: 'branch';
  message: string;
  default: string;
  validate(val: string): boolean | string;
}

interface AnswerType {
  branch: string;
}

export const push = async function (): Promise<void> {
  const question: BranchQuestion[] = [
    {
      type: 'input',
      name: 'branch',
      message: '请输入要推送到remote的分支名',
      default: (await $`git branch --show-current`).stdout.trim(),
      validate(val) {
        if (!val) {
          return 'Branch is required!';
        }
        return true;
      },
    },
  ];

  inquirer.prompt<AnswerType>(question).then(async (answers) => {
    const branch = answers.branch;
    await $`git push origin ${branch}`;
    console.log(chalk.green(`Pushed to remote ${branch} successfully!\n`));
  });
};
