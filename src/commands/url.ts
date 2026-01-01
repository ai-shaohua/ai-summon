import inquirer from 'inquirer';
import chalk from 'chalk';
import inquirerAutocomplete from 'inquirer-autocomplete-prompt';
import { getConfigPath, readConfig } from '../util.js';
import { writeFileSync } from 'fs';
import { HshConfig } from '../types/index.js';
import { $ } from 'zx';

// Register autocomplete prompt
inquirer.registerPrompt('autocomplete', inquirerAutocomplete);

// Read and write config helpers
function readFullConfig(): HshConfig {
  const config = readConfig();
  if (!config.urls) {
    config.urls = {};
  }
  return config;
}

function writeConfig(config: HshConfig): void {
  // Sort URLs by domain before writing
  if (config.urls) {
    const sortedUrls: Record<string, string> = {};

    // Create entries with extracted domains for sorting
    const entries = Object.entries(config.urls).map(([name, url]) => {
      // Extract domain from URL
      let domain = '';
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
      } catch {
        // If URL parsing fails, use the URL string itself for sorting
        domain = url;
      }
      return { name, url, domain };
    });

    // Sort by domain, then by name
    entries.sort((a, b) => {
      const domainCompare = a.domain.localeCompare(b.domain);
      if (domainCompare !== 0) return domainCompare;
      return a.name.localeCompare(b.name);
    });

    // Rebuild the urls object with sorted entries
    for (const entry of entries) {
      sortedUrls[entry.name] = entry.url;
    }

    config.urls = sortedUrls;
  }

  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

// Add a new URL
export async function addUrl(name: string, url: string): Promise<void> {
  try {
    const config = readFullConfig();

    if (config.urls![name]) {
      console.log(
        chalk.yellow(`⚠️  URL with name "${name}" already exists: ${config.urls![name]}`)
      );
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Do you want to overwrite it?',
          default: false,
        },
      ]);

      if (!answer.overwrite) {
        console.log(chalk.blue('ℹ️  Operation cancelled.'));
        return;
      }
    }

    config.urls![name] = url;
    writeConfig(config);
    console.log(chalk.green(`✅ Added URL: ${name} → ${url}`));
  } catch (error) {
    console.error(chalk.red('Error adding URL:'), error);
  }
}

// Search URLs and return selected entry
async function searchUrls(
  _answers: unknown,
  input = ''
): Promise<Array<{ name: string; value: { name: string; url: string } }>> {
  const config = readFullConfig();
  const urls = config.urls || {};

  const entries = Object.entries(urls).map(([name, url]) => ({
    name,
    url,
    display: `${name} - ${url}`,
  }));

  if (!input) {
    return entries.map((entry) => ({
      name: entry.display,
      value: { name: entry.name, url: entry.url },
    }));
  }

  // Multi-keyword search: split by spaces and match all keywords
  const keywords = input.toLowerCase().trim().split(/\s+/);
  return entries
    .filter((entry) => {
      const searchText = `${entry.name} ${entry.url}`.toLowerCase();
      return keywords.every((keyword) => searchText.includes(keyword));
    })
    .map((entry) => ({
      name: entry.display,
      value: { name: entry.name, url: entry.url },
    }));
}

// Remove a URL
export async function removeUrl(name?: string): Promise<void> {
  try {
    const config = readFullConfig();

    if (!config.urls || Object.keys(config.urls).length === 0) {
      console.log(chalk.yellow('⚠️  No URLs found in configuration.'));
      return;
    }

    let targetName: string;

    if (name) {
      // Direct removal with name provided
      if (!config.urls[name]) {
        console.log(chalk.yellow(`⚠️  URL with name "${name}" not found.`));
        return;
      }
      targetName = name;
    } else {
      // Search mode
      const answer = await inquirer.prompt([
        {
          type: 'autocomplete',
          name: 'selected',
          message: 'Search and select a URL to remove:',
          source: searchUrls,
          pageSize: 15,
        },
      ]);
      targetName = answer.selected.name;
    }

    const removedUrl = config.urls[targetName];
    delete config.urls[targetName];
    writeConfig(config);
    console.log(chalk.green(`✅ Removed URL: ${targetName} - ${removedUrl}`));
  } catch (error) {
    console.error(chalk.red('Error removing URL:'), error);
  }
}

// Search and open URL in Chrome
export async function searchAndOpenUrl(suppress?: boolean): Promise<void> {
  try {
    const config = readFullConfig();

    if (!config.urls || Object.keys(config.urls).length === 0) {
      console.log(chalk.yellow('⚠️  No URLs found in configuration.'));
      return;
    }

    const answer = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'selected',
        message: 'Search and select a URL to open:',
        source: searchUrls,
        pageSize: 15,
      },
    ]);

    const selectedUrl = answer.selected.url;
    console.log(chalk.blue(`🌐 Opening ${answer.selected.name}: ${selectedUrl}`));

    // Open URL in Chrome (works on macOS, Linux, and Windows)
    await $`open -a "Google Chrome" ${selectedUrl}`;
    console.log(chalk.green('✅ URL opened in Chrome'));

    // Auto-dismiss popups if --suppress flag is enabled
    if (suppress) {
      console.log(chalk.blue('⏳ Waiting 1s before dismissing popup...'));
      // Wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Use osascript to simulate Enter key press on macOS
      await $`osascript -e 'tell application "System Events" to keystroke return'`;

      // Wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Use osascript to simulate Enter key press on macOS
      await $`osascript -e 'tell application "System Events" to keystroke return'`;
      console.log(chalk.green('✅ Popup dismissed with Enter key'));
    }
  } catch (error) {
    console.error(chalk.red('Error opening URL:'), error);
  }
}

// Open URL group in a new Chrome window
export async function openUrlGroup(): Promise<void> {
  try {
    const config = readFullConfig();

    if (!config.urlGroups || Object.keys(config.urlGroups).length === 0) {
      console.log(chalk.yellow('⚠️  No URL groups found in configuration.'));
      return;
    }

    const groupNames = Object.keys(config.urlGroups);
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedGroup',
        message: 'Select a URL group to open:',
        choices: groupNames,
      },
    ]);

    const selectedGroupName = answer.selectedGroup;
    const urls = config.urlGroups[selectedGroupName];

    if (!urls || urls.length === 0) {
      console.log(chalk.yellow(`⚠️  No URLs found in group "${selectedGroupName}".`));
      return;
    }

    console.log(chalk.blue(`🌐 Opening ${urls.length} URLs from group "${selectedGroupName}"...`));

    // Open all URLs in a new Chrome window
    // First URL opens in a new window
    await $`open -na "Google Chrome" --args --new-window ${urls[0]}`;

    // Add a small delay to ensure Chrome window is ready
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Open remaining URLs as tabs in the same window
    for (let i = 1; i < urls.length; i++) {
      await $`open -a "Google Chrome" ${urls[i]}`;
      // Small delay between opening tabs to ensure they all load properly
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(chalk.green(`✅ Opened ${urls.length} URLs in Chrome`));
  } catch (error) {
    console.error(chalk.red('Error opening URL group:'), error);
  }
}
