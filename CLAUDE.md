# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **hsh19900502**, a TypeScript-based CLI tool that provides Git workflow automation and IDE project management utilities. It's built as an ESM module and designed to be installed globally as a command-line utility.

## Development Setup

### Building and Installation

```bash
# Install dependencies
yarn install

# Build the project (TypeScript compilation)
yarn build

# Build and install globally for testing
yarn build:install

# Development mode (requires ts-node)
yarn dev

# Start compiled version
yarn start
```

### Key Dependencies

- **commander**: CLI framework for command parsing
- **inquirer**: Interactive command-line prompts with autocomplete support
- **zx**: Shell scripting utilities (provides `$` template literal)
- **chalk**: Terminal string styling
- **ora**: Terminal spinners and progress indicators
- **typescript**: TypeScript compiler and language support
- **ts-node**: TypeScript execution for development

## Architecture

### Project Structure

```text
src/
├── hsh.ts              # Main CLI entry point with command definitions
├── commands/
│   ├── git.ts          # Git workflow commands (gcm, push, merge, mr, branchout)
│   ├── mono.ts         # Monorepo management (init, cd)
│   ├── ide.ts          # IDE integration (cursor, claude)
│   └── mcp.ts          # MCP server synchronization
├── types/
│   └── index.ts        # TypeScript type definitions
└── util.ts             # Utility functions (package.json reading)
```

### Command Architecture

The CLI follows a modular command structure using Commander.js:

- **Main commands**: Defined in `hsh.ts` with action handlers
- **Command modules**: Organized by feature domain (git, mono, ide)
- **Interactive prompts**: Heavy use of inquirer for user input with validation
- **Shell integration**: Uses `zx` for executing shell commands with `$` template literals

### Key Design Patterns

- **ESM modules**: Uses ES module imports/exports throughout
- **Async/await**: All shell operations are async with proper error handling
- **Interactive CLI**: Extensive use of inquirer prompts with autocomplete
- **Configuration-based**: IDE command uses `~/.hsh/config.json` for project paths
- **Monorepo aware**: Special handling for multi-repository workflows
- **TypeScript strict mode**: Full type safety with comprehensive type checking

## Command Categories

### Git Workflow Commands

- `gcm <message> [--push]`: Add all, commit with message, optionally push
- `push`: Interactive branch selection for pushing to remote
- `merge <branch>`: Safe merge with branch switching and pulling
- `mr create`: Create merge requests with JIRA integration (uses `glab`)
- `branchout <branch>`: Create new branch from master

### Monorepo Management

- `mono init`: Initialize workspace with `.hsh` marker file
- `mono cd <level> [--repo <name>]`: Navigate to repo directories (root/client/server)

### IDE Integration

- `cursor`: Open project in Cursor editor with config-based project selection

### MCP Server Management

- `mcp sync`: Synchronize MCP server configurations from `~/.mcp/servers.json` to all projects in `~/.claude.json`
  - This addresses the limitation that Claude Code cannot install MCP servers globally
  - Automatically updates all project configurations with centralized MCP server definitions
  - Idempotent operation - safe to run multiple times
  - Useful for maintaining consistent MCP configurations across multiple projects

## Configuration Requirements

### IDE Configuration

The `cursor` and `claude` commands require a configuration file at `~/.hsh/config.json`:

```json
{
  "category1": {
    "project1": "/path/to/project1",
    "project2": "/path/to/project2"
  },
  "category2": {
    "project3": "/path/to/project3"
  }
}
```

### Monorepo Setup

For monorepo commands, projects should have:

- `.hsh` marker file in the root (created by `mono init`)
- Directory structure: `<repo-name>/client/` and `<repo-name>/server/`

### MCP Server Configuration

MCP (Model Context Protocol) servers can be centrally managed:

- Create `~/.mcp/servers.json` with your global MCP server configurations
- Run `hsh mcp sync` to propagate configurations to all projects in `~/.claude.json`
- Each project's `mcpServers` field will be updated with the latest configuration

Example `~/.mcp/servers.json`:

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
  }
}
```

## External Dependencies

### Required CLI Tools

- **git**: For all git operations
- **glab**: GitLab CLI for merge request creation (used in `mr create`)
- **cursor**: Cursor editor executable (for `cursor` command)

### Shell Integration

- Commands extensively use shell execution via `zx`
- Relies on system PATH for external tools
- Uses `process.chdir()` for directory navigation in monorepo commands

## Development Patterns

### Error Handling

- Uses chalk for colored terminal output (green for success, yellow for warnings)
- Interactive prompts include validation functions
- Shell commands use async/await with implicit error propagation

### User Experience

- Extensive use of default values in prompts (e.g., current branch for push)
- Autocomplete support for directory/project selection
- Branch name parsing for JIRA integration in MR creation
- Progress feedback with colored console output

### TypeScript Configuration

- Strict mode enabled with comprehensive type checking
- ESNext module resolution with bundler strategy
- Declaration files generated for distribution
- Paths configuration for clean imports
- Uses ES2020 target with modern JavaScript features

## Important Notes

- All commands use **Yarn** as the package manager
- Built as ES modules with `.js` extensions in imports
- Requires Node.js with ES module support
- TypeScript compilation outputs to `dist/` directory with declaration files
- Pls ensure no ts error or eslint error after each code change