# Technology Stack

## Core Technologies
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.x
- **Build System**: Vite
- **Package Manager**: npm

## Development Tools
- **TypeScript Compiler**: ts-node for development
- **Hot Reloading**: nodemon
- **Build Tool**: Vite with React plugin support

## TypeScript Configuration
- Strict mode enabled with enhanced type checking
- Modern ES modules (`nodenext` module resolution)
- Source maps and declarations generated
- Enhanced safety with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`

## Common Commands

### Development
```bash
npm run dev          # Start development server with hot reload
```

### Building
```bash
npm run build        # Build for production using Vite
```

### Production
```bash
npm start           # Start production server from dist/
```

## Dependencies
- **Runtime**: Express.js for HTTP server
- **Development**: Full TypeScript toolchain with type definitions
- **Build**: Vite with legacy browser support and React plugins

## Code Style Guidelines
- Use strict TypeScript with all safety features enabled
- Prefer modern ES modules syntax
- Enable verbose module syntax for clarity
- Maintain isolated modules for better tree-shaking