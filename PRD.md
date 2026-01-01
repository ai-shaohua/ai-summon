# Product Requirements Document: IDE Command Enhancement

## Overview

This PRD describes enhancements to the IDE integration commands (`hsh cursor` and `hsh claude`) to support automatic Git repository discovery through a configurable working directory approach.

## Problem Statement

Currently, users must manually configure every project path in `~/.hsh/config.json` under category structures. This becomes cumbersome when managing many Git repositories, especially in environments with multiple projects organized under common parent directories.

## Proposed Solution

Introduce a `workingDirectory` configuration option in `~/.hsh/config.json` that enables automatic Git repository discovery. When configured, the IDE commands will automatically scan for Git repositories (directories containing `.git` folders) within the specified working directory.

## Requirements

### Functional Requirements

#### FR1: Working Directory Configuration
- **Description**: Support optional `workingDirectory` field in `~/.hsh/config.json`
- **Behavior**: When set, `workingDirectory` takes precedence and the system ONLY uses auto-discovered Git repositories
- **Precedence Rule**: If `workingDirectory` exists, manually configured category-based projects are ignored
- **Example Configuration**:
  ```json
  {
    "workingDirectory": "/Users/username/dev"
  }
  ```

#### FR2: Automatic Git Repository Discovery
- **Description**: Scan working directory for subdirectories containing `.git` folders
- **Behavior**: 
  - Recursively search for `.git` folders within the working directory
  - Treat each `.git` folder as a project root marker
  - Stop recursive search when `.git` is found (don't search deeper within Git repos)
- **Output**: Generate a list of discovered Git repositories for project selection

#### FR3: Project Selection Interface
- **Description**: Present discovered projects in the interactive prompt
- **Behavior**:
  - Display all auto-discovered Git repositories from working directory
  - Use autocomplete-enabled inquirer prompt
  - Show project name (directory name) and full path for clarity
  - Format: `project-name (/full/path/to/project-name)`

#### FR4: Backward Compatibility
- **Description**: Ensure existing configurations continue to work without modification
- **Behavior**:
  - If `workingDirectory` is NOT configured → use manual project configurations (existing behavior)
  - If `workingDirectory` IS configured → ignore manual configurations, use only auto-discovery
  - Existing category-based project structures remain fully functional when `workingDirectory` is absent
  - No breaking changes to current user workflows

### Non-Functional Requirements

#### NFR1: Performance
- Repository scanning should complete within reasonable time (< 5 seconds for typical directories)
- Consider implementing caching if scan performance becomes an issue

#### NFR2: Error Handling
- Gracefully handle permission errors when scanning directories
- Provide clear error messages if `workingDirectory` path doesn't exist
- Continue operation even if some subdirectories are inaccessible

#### NFR3: User Experience
- Clear and consistent project listing format
- Fast autocomplete search functionality
- Alphabetically sorted project list
- Helpful defaults and suggestions

## Configuration Schema

### Enhanced `~/.hsh/config.json` Structure

**Option 1: With Working Directory (Auto-Discovery Mode)**
```json
{
  "workingDirectory": "/Users/username/dev/projects"
}
```

**Option 2: Without Working Directory (Manual Configuration Mode - Existing Behavior)**
```json
{
  "category1": {
    "manually-configured-project": "/path/to/project"
  },
  "category2": {
    "another-project": "/different/path"
  }
}
```

### Configuration Precedence
- **If `workingDirectory` is present**: Use ONLY auto-discovered Git repositories, ignore manual configurations
- **If `workingDirectory` is absent**: Use manual category-based project configurations (existing behavior)

## Implementation Notes

### Target File
- **File**: `src/commands/ide/index.ts`
- **Affected Functions**: Project discovery and selection logic

### Technical Approach
1. Add `workingDirectory` field to configuration type definition
2. Implement Git repository scanner utility function
3. Modify project loading logic:
   - Check if `workingDirectory` exists in config
   - If yes: use auto-discovered projects only
   - If no: use manual configurations (existing behavior)
4. Update inquirer prompts to display discovered projects
5. Ensure backward compatibility by making `workingDirectory` optional

### Git Repository Detection
- Use Node.js `fs` module to recursively scan directories
- Check for `.git` folder existence using `fs.existsSync()`
- Stop recursion at `.git` boundaries to avoid scanning repo contents
- Extract project name from directory name

## Success Criteria

1. ✅ Users can configure `workingDirectory` and auto-discover Git repos
2. ✅ When `workingDirectory` is set, manual configurations are ignored (precedence working correctly)
3. ✅ When `workingDirectory` is absent, existing manual configurations work unchanged
4. ✅ Auto-discovered project list appears in IDE command prompts
5. ✅ No TypeScript or ESLint errors introduced
6. ✅ Backward compatible with existing `~/.hsh/config.json` files
7. ✅ Clear error handling for edge cases

## Out of Scope

- Ignoring specific directories (e.g., `node_modules`) - can be added later
- Caching of discovered repositories - performance optimization for future
- Multiple working directories - single directory for MVP
- GUI configuration management - remains CLI-based

## Open Questions

### Q1: Project Display Format
When displaying auto-discovered projects in the inquirer prompt, what format should be used?

**Option A: Simple format (directory name with path)**
```
? Select a project: (Use arrow keys or type to search)
❯ my-awesome-project (/Users/username/dev/my-awesome-project)
  another-repo (/Users/username/dev/another-repo)
  cool-app (/Users/username/dev/nested/cool-app)
```

**Option B: Show relative path from working directory**
```
? Select a project: (Use arrow keys or type to search)
❯ my-awesome-project (./my-awesome-project)
  another-repo (./another-repo)
  cool-app (./nested/cool-app)
```

**Option C: Directory name only, with full path on selection**
```
? Select a project: (Use arrow keys or type to search)
❯ my-awesome-project
  another-repo
  cool-app

Selected: /Users/username/dev/my-awesome-project
```

**Option D: Flattened list with top-level folder separators (SELECTED)**
```
? Select a project: (Use arrow keys or type to search)
  --------- work ---------
❯ project-a (/Users/username/dev/work/project-a)
  project-b (/Users/username/dev/work/project-b)
  --------- personal ---------
  my-app (/Users/username/dev/personal/my-app)
  my-tool (/Users/username/dev/personal/my-tool)
  --------- / (root) ---------
  standalone-repo (/Users/username/dev/standalone-repo)
```
- Pro: Visual organization while maintaining flat, searchable list
- Pro: Shows top-level folder context without nested tree structure
- Pro: Works well with autocomplete search (separators are ignored/filtered out)
- Pro: Easy to scan and understand repository organization

**Your Answer:** **D** - Flattened list with visual separators for top-level folders

---

### Q2: Project Naming for Auto-Discovered Repositories
Auto-discovered projects use the directory name as the project name (e.g., `/Users/username/dev/my-repo` → display as "my-repo"). Should users be able to customize these names?

No, no need to customize

---

### Q3: Repository Scanning Strategy
Git repository discovery could be expensive if working directory has many nested folders. When should scanning happen?

**Option A: Scan on every command execution (always fresh) - SELECTED**
- Pro: Always shows latest repositories, handles newly cloned repos immediately
- Pro: For 200 repos, scan takes ~300-800ms (barely noticeable)
- Pro: Simple implementation, no cache management complexity
- Con: May have slight delay on each command execution
- **Performance notes**: 
  - Flat structure (200 repos at depth 1): ~100-300ms
  - Typical structure (2-3 levels deep): ~300-800ms
  - Can optimize by skipping `node_modules`, `dist`, `.git` internals if needed

**Option B: Scan once and cache results (with manual refresh command)**
- Add `hsh refresh` or `hsh ide refresh` command to rebuild cache
- Pro: Fast command execution
- Con: Users must remember to refresh after cloning new repos

**Option C: Smart caching with TTL (e.g., cache for 1 hour)**
- Cache results but auto-refresh after time threshold
- Pro: Balance between performance and freshness
- Con: More complex implementation

**Option D: Scan on-demand with progress indicator**
- Show spinner/progress while scanning: "🔍 Discovering repositories..."
- Pro: Users know why there's a delay, always fresh
- Con: For typical use (200 repos), overhead of showing spinner (~300-800ms) may not be worth it

**Your Answer:** **A** - Scan on every command execution. With 200 repos, the 300-800ms scan time is barely noticeable and provides the best user experience (always fresh, no cache maintenance needed).

---

### Q4: Nested Git Repository Handling
What should happen when a Git repository contains other Git repositories (e.g., Git submodules)?

**Answer:** Not a concern for MVP. The natural scanning behavior handles this correctly:
- When `.git` folder is found, mark that directory as a repository
- Stop recursing into that directory's subdirectories
- This automatically prevents scanning inside repositories
- Edge case of nested repos (submodules, manually nested repos) is rare enough to ignore

**Implementation note**: The recursive scanner will:
```typescript
// Pseudo-code
function findGitRepos(dir) {
  if (containsGitFolder(dir)) {
    return [dir]; // Found a repo, stop recursing
  }
  
  // Continue scanning subdirectories
  return subdirs.flatMap(subdir => findGitRepos(subdir));
}
```

This naturally handles the nested case without special logic.

---

### Q5: Error Handling for Inaccessible Directories
During scanning, some directories might be inaccessible due to permissions or symlink issues. How should the system behave?

**Answer:** Handle in future iteration. For MVP:
- Let Node.js filesystem errors propagate naturally
- Most users won't encounter permission issues in their working directory
- Can add proper error handling (silent skip, warnings, etc.) based on real-world feedback

**Your Answer:** Defer to future iteration - not critical for MVP

## References

- Existing Implementation: `src/commands/ide/index.ts`
- Configuration File: `~/.hsh/config.json`
- Related Commands: `hsh cursor`, `hsh claude` 