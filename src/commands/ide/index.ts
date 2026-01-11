import inquirer from 'inquirer';
import 'zx/globals';
import chalk from 'chalk';
import inquirerAutocomplete from 'inquirer-autocomplete-prompt';
import {
  readConfig,
  findGitRepositories,
  readIdeReposCache,
  writeIdeReposCache,
  type GitRepository,
} from '../../util.js';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

interface ReposConfig {
  [key: string]: {
    [key: string]: string;
  };
}

// Register autocomplete prompt
inquirer.registerPrompt('autocomplete', inquirerAutocomplete);

let reposConfig: ReposConfig;
let currentCategory: string;
let workingDirectory: string | undefined;
let autoDiscoveredRepos: GitRepository[] = [];

async function loadConfig(options?: { refreshReposCache?: boolean }) {
  const config = readConfig();

  // Check if workingDirectory is configured
  if (config.workingDirectory) {
    workingDirectory = config.workingDirectory;

    // Validate that workingDirectory exists
    if (!existsSync(workingDirectory)) {
      throw new Error(`Working directory does not exist: ${workingDirectory}`);
    }

    if (options?.refreshReposCache) {
      // Force refresh: rescan and overwrite cache
      autoDiscoveredRepos = findGitRepositories(workingDirectory);
      writeIdeReposCache(workingDirectory, autoDiscoveredRepos);
    } else {
      // Default: use cache if possible (fast path)
      const cached = readIdeReposCache(workingDirectory);
      if (cached) {
        autoDiscoveredRepos = cached;
      } else {
        // Warm the cache on first run
        autoDiscoveredRepos = findGitRepositories(workingDirectory);
        writeIdeReposCache(workingDirectory, autoDiscoveredRepos);
      }
    }

    // Sort alphabetically by name for better UX
    autoDiscoveredRepos.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Use manual configuration (existing behavior)
    reposConfig = config.repos;
  }
}

async function searchCategories(_answers: unknown, input = '') {
  if (!reposConfig) {
    await loadConfig();
  }
  const categories = Object.keys(reposConfig);

  if (!input) {
    return categories;
  }

  return categories.filter((category) => category.toLowerCase().includes(input.toLowerCase()));
}

async function searchProjects(_answers: unknown, input = '') {
  if (!reposConfig) {
    await loadConfig();
  }

  // Get projects for the selected category
  if (!currentCategory || !reposConfig[currentCategory]) {
    return [];
  }

  const projects = Object.entries(reposConfig[currentCategory]).map(([name, path]) => ({
    name,
    path,
    display: `${name} (${path})`,
  }));

  if (!input) {
    return projects.map((p) => p.name);
  }

  const searchTerm = input.toLowerCase();
  return projects
    .filter(
      (project) =>
        project.name.toLowerCase().includes(searchTerm) ||
        project.path.toLowerCase().includes(searchTerm)
    )
    .map((p) => p.name);
}

// Flatten all projects with category context for fuzzy search
function getAllProjects(): Array<{
  category: string;
  name: string;
  path: string;
  display: string;
}> {
  // Auto-discovery mode: use discovered Git repos
  if (workingDirectory) {
    return autoDiscoveredRepos.map((repo) => ({
      category: repo.topLevelFolder,
      name: repo.name,
      path: repo.path,
      display: `${repo.name} (${repo.path})`,
    }));
  }

  // Manual configuration mode
  if (!reposConfig) return [];

  return Object.entries(reposConfig).flatMap(([category, projects]) =>
    Object.entries(projects).map(([name, path]) => ({
      category,
      name,
      path,
      display: `${name} (${category})`,
    }))
  );
}

// Single-keyword fuzzy search across all projects
async function searchAllProjects(_answers: unknown, input = '') {
  const allProjects = getAllProjects();

  // Filter projects based on search input
  let filteredProjects = allProjects;
  if (input) {
    const keywords = input.toLowerCase().trim().split(/\s+/);
    filteredProjects = allProjects.filter((project) => {
      const searchText = `${project.name} ${project.category} ${project.path}`.toLowerCase();
      return keywords.every((keyword) => searchText.includes(keyword));
    });
  }

  // If auto-discovery mode, add category separators
  if (workingDirectory) {
    return formatProjectsWithSeparators(filteredProjects);
  }

  // Manual mode: simple display
  return filteredProjects.map((p) => ({ name: p.display, value: p }));
}

// Format projects with top-level folder separators (for auto-discovery mode)
function formatProjectsWithSeparators(
  projects: Array<{
    category: string;
    name: string;
    path: string;
    display: string;
  }>
): Array<{ name: string; value?: unknown; disabled?: string }> {
  // Group projects by category (top-level folder)
  const grouped = new Map<
    string,
    Array<{ category: string; name: string; path: string; display: string }>
  >();

  projects.forEach((project) => {
    const category = project.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(project);
  });

  // Sort categories alphabetically, but put root (/) last
  const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
    if (a === '/') return 1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  });

  // Build result with separators
  const result: Array<{ name: string; value?: unknown; disabled?: string }> = [];

  sortedCategories.forEach((category) => {
    const categoryProjects = grouped.get(category)!;

    // Add category separator
    const categoryLabel = category === '/' ? '/ (root)' : category;
    result.push({
      name: `---------  ${categoryLabel}  ---------`,
      disabled: 'separator',
    });

    // Add projects in this category
    categoryProjects.forEach((p) => {
      result.push({
        name: `  ${p.display}`,
        value: p,
      });
    });
  });

  return result;
}

// Select project using fuzzy search across all categories
async function selectProjectWithFuzzySearch(
  searchMode?: string
): Promise<{ path: string; name: string }> {
  const answer = await inquirer.prompt([
    {
      type: 'autocomplete',
      name: 'project',
      message: `Search and select a project${searchMode ? ` (filtering: ${searchMode})` : ''}:`,
      source: searchAllProjects,
      pageSize: 15,
    },
  ]);

  return {
    path: answer.project.path,
    name: answer.project.name,
  };
}

// Select project using two-step category then project selection
async function selectProjectWithTwoStep(): Promise<{ path: string; name: string }> {
  const categoryAnswer = await inquirer.prompt([
    {
      type: 'autocomplete',
      name: 'category',
      message: 'Select a category:',
      source: searchCategories,
      pageSize: 10,
    },
  ]);

  currentCategory = categoryAnswer.category;

  const projectAnswer = await inquirer.prompt([
    {
      type: 'autocomplete',
      name: 'project',
      message: 'Select a project:',
      source: searchProjects,
      pageSize: 10,
    },
  ]);

  return {
    path: reposConfig[currentCategory][projectAnswer.project],
    name: projectAnswer.project,
  };
}

// Launch Claude IDE with proper TTY handling
async function launchClaude(projectPath: string): Promise<void> {
  const claudeProcess = spawn('claude', [], {
    cwd: projectPath,
    stdio: 'inherit',
    shell: true,
  });

  await new Promise<void>((resolve, reject) => {
    claudeProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Claude process exited with code ${code}`));
      }
    });
    claudeProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// Launch Cursor or other IDE
async function launchIDE(ideType: string, projectPath: string, projectName: string): Promise<void> {
  if (ideType === 'cursor') {
    await $`open -a "Cursor" ${projectPath}`;
  } else {
    await $`${ideType} ${projectPath}`;
    console.log(chalk.green(`Opening ${projectName} in ${ideType}...`));
  }
}

export const openIDE = async (ideType: 'cursor' | 'claude', searchMode?: string) => {
  try {
    await loadConfig();

    // In auto-discovery mode, always use fuzzy search (no categories)
    const project =
      workingDirectory || searchMode !== undefined
        ? await selectProjectWithFuzzySearch(searchMode)
        : await selectProjectWithTwoStep();

    // Launch IDE based on type
    if (ideType === 'claude') {
      await launchClaude(project.path);
    } else {
      await launchIDE(ideType, project.path, project.name);
    }
  } catch (error) {
    console.error(chalk.red(`Error opening project in ${ideType}:`, error));
  }
};

export const refreshIdeReposCache = async (): Promise<void> => {
  await loadConfig({ refreshReposCache: true });
  if (!workingDirectory) {
    console.log(chalk.yellow('No workingDirectory configured; nothing to refresh.'));
    return;
  }
  console.log(chalk.green('IDE repository cache refreshed.'));
};
