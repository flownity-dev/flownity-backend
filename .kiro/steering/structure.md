# Project Structure

## Current Structure
This is a minimal Node.js/TypeScript project with the following organization:

```
flownity-backend/
├── .git/                 # Git repository
├── .kiro/               # Kiro AI assistant configuration
│   └── steering/        # AI steering documents
├── .vscode/             # VSCode workspace settings
├── node_modules/        # Dependencies (ignored)
├── dist/               # Build output (ignored)
├── package.json        # Project configuration and dependencies
├── tsconfig.json       # TypeScript configuration
└── .gitignore         # Git ignore rules
```

## Expected Structure (Based on Configuration)
The project is configured to expect:

- **Source Code**: `src/` directory with TypeScript files
  - Entry point should be `src/index.ts` (based on dev script)
- **Build Output**: `dist/` directory for compiled JavaScript
  - Production entry point: `dist/index.js`

## File Organization Conventions
- **Source files**: Place all TypeScript source code in `src/`
- **Entry point**: Main application file should be `src/index.ts`
- **Build artifacts**: Generated files go to `dist/` (auto-generated)
- **Configuration**: Root-level config files (package.json, tsconfig.json, etc.)

## Development Workflow
1. Source code lives in `src/` directory
2. Development server runs directly from TypeScript using ts-node
3. Production builds compile to `dist/` using Vite
4. Hot reloading watches `src/**/*.ts` files

## Notes
- The project appears to be in initial setup phase (no src/ directory exists yet)
- Build system is configured for both Node.js backend and potential React frontend components
- Vite configuration suggests this might be part of a full-stack application