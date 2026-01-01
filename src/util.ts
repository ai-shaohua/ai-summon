import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import chalk from 'chalk';
import { HshConfig } from './types/index.js';

export const getPackageJson = () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
  return packageJson;
};

export const getConfigPath = (): string => {
  const dir = join(homedir(), '.hsh');
  mkdirSync(dir, { recursive: true });
  return join(dir, 'config.json');
};

export const readConfig = (): HshConfig => {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    throw new Error(
      `Configuration file not found: ${configPath}\n` +
        `Please create it (major release: legacy ~/hsh.config.json is no longer supported).\n` +
        `Config file location: ~/.hsh/config.json`
    );
  }

  const configContent = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  // Auto-migrate legacy configuration content (file location is already new)
  if (!config.repos && !config.yiren && !config.workingDirectory) {
    console.warn(
      chalk.yellow('⚠️  Legacy config content detected. Auto-migrating to new structure.')
    );
    console.warn(chalk.yellow('ℹ️  Consider updating your ~/.hsh/config.json to the new format:'));
    console.warn(
      chalk.yellow('   { "repos": { <your existing config> }, "yiren": { <cloud config> } }')
    );

    return { repos: config, yiren: {} };
  }

  // If workingDirectory is configured but repos/yiren are not, initialize them
  if (config.workingDirectory && !config.repos) {
    return {
      workingDirectory: config.workingDirectory,
      repos: {},
      yiren: config.yiren || {},
      urls: config.urls,
      urlGroups: config.urlGroups,
    };
  }

  return config as HshConfig;
};

/**
 * Recursively scan directory for Git repositories
 * Returns list of { name, path, topLevelFolder } objects
 */
export interface GitRepository {
  name: string;
  path: string;
  topLevelFolder: string; // Top-level folder name relative to workingDirectory
}

interface IdeReposCacheFileV1 {
  version: 1;
  workingDirectory: string;
  updatedAt: number;
  repos: GitRepository[];
}

const ensureHshDir = (): string => {
  const dir = join(homedir(), '.hsh');
  mkdirSync(dir, { recursive: true });
  return dir;
};

const getIdeReposCachePath = (): string => {
  const dir = ensureHshDir();
  return join(dir, 'ide-repos-cache.json');
};

export const readIdeReposCache = (workingDirectory: string): GitRepository[] | null => {
  const cachePath = getIdeReposCachePath();
  if (!existsSync(cachePath)) return null;

  try {
    const raw = readFileSync(cachePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<IdeReposCacheFileV1>;

    if (parsed.version !== 1) return null;
    if (parsed.workingDirectory !== workingDirectory) return null;
    if (!Array.isArray(parsed.repos)) return null;

    return parsed.repos as GitRepository[];
  } catch {
    return null;
  }
};

export const writeIdeReposCache = (workingDirectory: string, repos: GitRepository[]): void => {
  const cachePath = getIdeReposCachePath();
  const payload: IdeReposCacheFileV1 = {
    version: 1,
    workingDirectory,
    updatedAt: Date.now(),
    repos,
  };
  writeFileSync(cachePath, JSON.stringify(payload, null, 2), 'utf-8');
};

export const findGitRepositories = (workingDirectory: string): GitRepository[] => {
  const repositories: GitRepository[] = [];

  const scanDirectory = (dir: string, topLevelFolder: string = '/'): void => {
    try {
      // Check if current directory contains .git folder
      if (existsSync(join(dir, '.git'))) {
        repositories.push({
          name: basename(dir),
          path: dir,
          topLevelFolder,
        });
        return; // Stop recursing into this directory
      }

      // Continue scanning subdirectories
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = join(dir, entry.name);

          // Determine top-level folder for this entry
          const isTopLevel = dir === workingDirectory;
          const currentTopLevel = isTopLevel ? entry.name : topLevelFolder;

          scanDirectory(fullPath, currentTopLevel);
        }
      }
    } catch {
      // Silently skip directories with permission errors
      // This will be enhanced in future iterations
    }
  };

  scanDirectory(workingDirectory);
  return repositories;
};
