# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Overcast is a CLI tool for managing virtual machines on DigitalOcean. It provides a thin SSH-based layer for spinning up, configuring, and managing server clusters without installing anything on remote machines.

## Commands

```bash
# Run tests (from project root)
npm test

# Run a single test file
cd test && npx jasmine --random=false integration/<name>.spec.js

# Run local development version
node overcast [args...]

# Generate docs
npm run docs

# Lint (uses eslint)
npx eslint src/
```

## Architecture

### Entry Point
- `overcast.js` - CLI entry point, calls `src/cli.js`
- `src/cli.js` - Command parsing using minimist, routes to command modules

### Command Structure
Commands live in `src/commands/`. Each command module exports:
- `commands` object with subcommands
- Each subcommand has: `usage`, `description`, `run(args, nextFn)`, and optionally `required`, `options`, `examples`

Example command registration pattern:
```javascript
export const commands = {
  commandName: {
    usage: 'overcast command [args]',
    description: 'What it does',
    required: [{ name: 'argName', filters: [filterFn] }],
    run: (args, nextFn) => { /* implementation */ }
  }
};
```

### Key Modules
- `src/store.js` - In-memory state (config paths, SSH counts)
- `src/utils.js` - Shared utilities (instance lookup, file paths, cluster operations, SSH key management)
- `src/ssh.js`, `src/scp.js`, `src/rsync.js` - SSH/file transfer wrappers
- `src/filters.js` - Argument validation filters
- `src/providers/` - Cloud provider implementations (digitalocean.js, virtualbox.js)

### Configuration
Overcast looks for `.overcast/` directory in current dir, parent dirs, or `~/.overcast/`:
- `clusters.json` - Instance/cluster definitions
- `variables.json` - API keys and user variables
- `keys/` - SSH keys

### Bundled Scripts
- `scripts/` - Shell scripts for common tasks (install/*, harden_ssh, etc.)
- `recipes/` - Multi-step deployment recipes

## Code Patterns

- ES Modules (`"type": "module"` in package.json)
- Async operations use callback pattern: `(args, nextFn) => { ... nextFn(); }`
- Instance matching supports wildcards: `app-*`, `db-01`, `all`, or cluster names
- Test utilities in `test/integration/utils.js` - use `overcast(argString, callback)` pattern
