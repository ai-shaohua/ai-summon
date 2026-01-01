# ai-summon

A small TypeScript CLI (binary name: `ai`) for:

- Opening projects in **Cursor** or **Claude** via an interactive fuzzy search
- Managing personal **URL bookmarks** and **URL groups** (open in Chrome)
- Bootstrapping `~/.ai/config.json`

## Installation

```bash
npm install -g ai-summon
```

NPM: `https://www.npmjs.com/package/ai-summon`

After install, you should have the `ai` command available:

```bash
ai --help
```

### Install from source (dev)

```bash
yarn install
yarn build:install
```

## Commands

### `ai init`

Initialize `~/.ai/config.json`.

```bash
ai init
ai init --working-directory /Users/you/dev
ai init --force
```

Options:

- `-w, --working-directory <path>`: set `workingDirectory` without prompting
- `-f, --force`: overwrite existing config without confirmation

### `ai cursor [search]`

Open a project in **Cursor**.

```bash
ai cursor
ai cursor payments
```

### `ai claude [search]`

Open a project in **Claude Code**.

```bash
ai claude
ai claude impactful
```

### `ai cursor refresh` / `ai claude refresh`

Refresh the cached auto-discovered repositories (only applies when `workingDirectory` mode is enabled).

```bash
ai cursor refresh
ai claude refresh
```

### `ai url ...`

URL bookmark management (stored in `~/.ai/config.json`).

#### `ai url add <name> <url>`

```bash
ai url add jira https://your-jira.example.com
```

#### `ai url remove [name]`

If `name` is omitted, you’ll enter interactive search mode.

```bash
ai url remove jira
ai url remove
```

#### `ai url search [--suppress]`

Interactively search bookmarks and open the selected URL in **Google Chrome**.

```bash
ai url search
ai url search --suppress
```

Options:

- `--suppress`: auto-dismiss popups by simulating the Enter key after opening (macOS via `osascript`)

#### `ai url group`

Select a configured URL group and open all URLs in a new Chrome window.

```bash
ai url group
```

## Configuration (`~/.ai/config.json`)

Run `ai init` to create the file. The CLI supports **two modes** for project selection:

### Auto-discovery mode (recommended)

Set `workingDirectory` to a folder containing your git repositories. The CLI will recursively scan for repos (by `.git`) and cache results to speed up future runs (cache file: `~/.ai/ide-repos-cache.json`).

Example:

```json
{
  "workingDirectory": "/Users/you/dev",
  "urls": {},
  "urlGroups": {}
}
```

## Development

```bash
yarn install
yarn build
yarn dev
```

## Requirements / Notes

- **Node.js**: required to run the CLI
- **Cursor**: `ai cursor` shells out to `cursor <path>`
- **Claude Code**: `ai claude` shells out to `claude` (and runs it in the selected repo directory)
- **Chrome + macOS**: `ai url ...` currently uses `open -a "Google Chrome" ...` (and `osascript` for `--suppress`)

## License

ISC
