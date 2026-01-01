# hsh - CLI Workflow Automation Tool

A TypeScript-based CLI tool that provides Git workflow automation, IDE project management, and MCP server configuration synchronization.

## Installation

```bash
yarn install
yarn build:install
```

## Features

### Git Workflow Automation

- `hsh gcm <message> [--push]` - Add all, commit with message, optionally push
- `hsh push` - Interactive branch selection for pushing to remote
- `hsh merge <branch>` - Safe merge with branch switching and pulling
- `hsh mr create` - Create merge requests with JIRA integration
- `hsh branchout <branch>` - Create new branch from master

### Monorepo Management

- `hsh mono init` - Initialize workspace with `.hsh` marker file
- `hsh mono cd <level> [--repo <name>]` - Navigate to repo directories (root/client/server)

### IDE Integration

- `hsh cursor` - Open project in Cursor editor with config-based project selection
- `hsh claude` - Open project in Claude Code editor with config-based project selection

### MCP Server Management

**NEW!** Solve the problem of having to configure MCP servers individually for each project.

#### The Problem

Claude Code doesn't support global MCP server installation. You have to configure MCP servers in each project's `.claude.json` file individually, which is tedious and error-prone.

#### The Solution

`hsh mcp sync` - Synchronize MCP server configurations from a central location to all your projects

#### How It Works

1. Create a central MCP configuration file at `~/.mcp/servers.json`:

```json
{
  "chrome-devtools": {
    "type": "stdio",
    "command": "npx",
    "args": ["chrome-devtools-mcp@latest"],
    "env": {}
  },
  "GitLab communication server": {
    "command": "npx",
    "args": ["-y", "@zereight/mcp-gitlab"],
    "env": {
      "GITLAB_PERSONAL_ACCESS_TOKEN": "your-token",
      "GITLAB_API_URL": "https://gitlab.example.com/api/v4"
    }
  },
  "jira": {
    "command": "npx",
    "args": ["-y", "@aashari/mcp-server-atlassian-jira"],
    "env": {
      "ATLASSIAN_SITE_NAME": "your-site",
      "ATLASSIAN_USER_EMAIL": "your-email",
      "ATLASSIAN_API_TOKEN": "your-token"
    }
  }
}
```

2. Run the sync command:

```bash
hsh mcp sync
```

3. The command will:
   - Read all MCP server configurations from `~/.mcp/servers.json`
   - Update the `mcpServers` field for all projects in `~/.claude.json`
   - Show you which servers were synced and how many projects were updated

#### Features

- ✅ Idempotent - Safe to run multiple times
- ✅ Atomic updates - Updates all projects at once
- ✅ Clear feedback - Shows which servers and projects were updated
- ✅ Validation - Checks for file existence and valid JSON

#### Example Output

```bash
$ hsh mcp sync
✔ Successfully synced MCP servers to 21 projects

MCP Servers synced:
  • chrome-devtools
  • Playwright
  • figma-mcp
  • GitLab communication server
  • jira
  • confluence

Projects updated:
  • /Users/you/project1
  • /Users/you/project2
  • /Users/you/project3
  ... and 18 more
```

## Configuration

### IDE Configuration

Run `ai init` to create `~/.ai/config.json` (it will prompt you for `workingDirectory`), or create it manually:

```json
{
  "workingDirectory": "/Users/you/dev",
  "work": {
    "project1": "/path/to/work/project1",
    "project2": "/path/to/work/project2"
  },
  "personal": {
    "project3": "/path/to/personal/project3"
  }
}
```

### Monorepo Setup

For monorepo commands, projects should have:

- `.hsh` marker file in the root (created by `hsh mono init`)
- Directory structure: `<repo-name>/client/` and `<repo-name>/server/`

## Development

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Build and install globally
yarn build:install

# Development mode
yarn dev
```

## Requirements

- Node.js with ES module support
- Git
- GitLab CLI (`glab`) for merge request features
- Cursor editor (for `cursor` command)
- Claude Code editor (for `claude` command)

## License

MIT

