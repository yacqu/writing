# Writing Editor - File System Integration Design Document

## Overview

Transform the existing Writing markdown editor into a local file-based editor with a Node.js backend that provides secure filesystem access restricted to a configurable base directory.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          Browser (Frontend)                        │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │  File Tree  │  │  Markdown Editor │  │   Live Preview        │  │
│  │  Sidebar    │  │  (wmd-input)     │  │   (wmd-preview)       │  │
│  └─────────────┘  └─────────────────┘  └────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                              │ HTTP/REST API
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                   Node.js/TypeScript Server (Backend)               │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │   Express   │  │  Path Validator  │  │   File Operations     │  │
│  │   Router    │──│  (Security)      │──│   (fs module)         │  │
│  └─────────────┘  └─────────────────┘  └────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    File System (Restricted)                         │
│                                                                     │
│    BASE_DIR (e.g., ~/Documents/notes)                              │
│    ├── project-a/                                                   │
│    │   ├── readme.md                                               │
│    │   └── notes.md                                                │
│    ├── project-b/                                                   │
│    │   └── todo.md                                                 │
│    └── ideas.md                                                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

* **Runtime**: Node.js with TypeScript
* **Execution**: `tsx` (globally installed TypeScript executor)
* **Framework**: Express.js with TypeScript types
* **Frontend**: Vanilla JS (existing) + new file tree component

---

## File Structure

```
writing/
├── index.html                # Main editor UI (existing, modified)
├── server/
│   ├── index.ts              # NEW: Entry point, Express server setup
│   ├── config.ts             # NEW: Configuration (BASE_DIR, etc.)
│   ├── routes/
│   │   └── files.ts          # NEW: File operations API routes
│   ├── middleware/
│   │   └── pathValidator.ts  # NEW: Security middleware
│   └── types.ts              # NEW: TypeScript interfaces
├── package.json              # NEW: Dependencies & scripts
├── tsconfig.json             # NEW: TypeScript configuration
├── Markdown.Converter.js     # Existing
├── Markdown.Editor.js        # Existing
├── Markdown.Extra.js         # Existing
├── Markdown.Sanitizer.js     # Existing
├── mathjax-editing_writing.js # Existing
├── design.md                 # This document
└── README.md                 # Updated with new instructions
```

---

## TypeScript Interfaces

### server/types.ts

```typescript
// File/Directory entry
export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified: string; // ISO date string
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface ListFilesResponse {
  path: string;
  files: FileEntry[];
}

export interface ReadFileResponse {
  path: string;
  content: string;
  modified: string;
}

export interface SaveFileRequest {
  path: string;
  content: string;
}

export interface CreateRequest {
  path: string;
  type: 'file' | 'directory';
}

export interface RenameRequest {
  oldPath: string;
  newPath: string;
}

// Configuration
export interface Config {
  BASE_DIR: string;
  PORT: number;
  HOST: string;
  ALLOWED_EXTENSIONS: string[] | null;
  MAX_FILE_SIZE: number;
  ENABLE_DELETE: boolean;
  ENABLE_CREATE: boolean;
  AUTO_SAVE: boolean;
  AUTO_SAVE_DELAY: number;
}
```

---

## API Specification

### Base URL

```
http://localhost:3031/api
```

### Endpoints

#### 1. List Directory Contents

```
GET /api/files?path=<relative-path>
```

**Request:**
* `path` (optional): Relative path from BASE_DIR. Defaults to `/` (root)

**Response:**

```json
{
  "success": true,
  "data": {
    "path": "/project-a",
    "files": [
      { "name": "readme.md", "type": "file", "size": 1234, "modified": "2025-12-06T10:30:00Z" },
      { "name": "assets", "type": "directory", "modified": "2025-12-05T08:00:00Z" }
    ]
  }
}
```

**Errors:**
* `400`: Invalid path (path traversal attempt)
* `404`: Directory not found

---

#### 2. Read File

```
GET /api/file?path=<relative-path>
```

**Request:**
* `path` (required): Relative path to file from BASE_DIR

**Response:**

```json
{
  "success": true,
  "data": {
    "path": "/project-a/readme.md",
    "content": "# Project A\n\nThis is the readme...",
    "modified": "2025-12-06T10:30:00Z"
  }
}
```

**Errors:**
* `400`: Invalid path
* `404`: File not found
* `403`: Attempting to read a directory

---

#### 3. Save File

```
POST /api/file
Content-Type: application/json
```

**Request Body:**

```json
{
  "path": "/project-a/readme.md",
  "content": "# Project A\n\nUpdated content..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "path": "/project-a/readme.md",
    "modified": "2025-12-06T11:00:00Z"
  }
}
```

**Errors:**
* `400`: Invalid path or missing content
* `403`: Attempting to write outside BASE_DIR

---

#### 4. Create File/Directory

```
POST /api/create
Content-Type: application/json
```

**Request Body:**

```json
{
  "path": "/project-a/new-file.md",
  "type": "file"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "path": "/project-a/new-file.md",
    "type": "file"
  }
}
```

---

#### 5. Delete File/Directory

```
DELETE /api/file?path=<relative-path>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": "/project-a/old-file.md"
  }
}
```

---

#### 6. Rename/Move File

```
PUT /api/file
Content-Type: application/json
```

**Request Body:**

```json
{
  "oldPath": "/project-a/readme.md",
  "newPath": "/project-a/README.md"
}
```

---

## Security Model

### Path Validation Middleware

```typescript
// server/middleware/pathValidator.ts
import path from 'path';
import { config } from '../config';

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export const validatePath = (requestedPath: string): string => {
  // Normalize and resolve path
  const normalizedRequest = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const absolute = path.resolve(config.BASE_DIR, normalizedRequest);
  const resolvedBase = path.resolve(config.BASE_DIR);
  
  // Ensure it's within BASE_DIR
  if (!absolute.startsWith(resolvedBase + path.sep) && absolute !== resolvedBase) {
    throw new SecurityError('Path traversal detected');
  }
  
  return absolute;
};

export const getRelativePath = (absolutePath: string): string => {
  return '/' + path.relative(config.BASE_DIR, absolutePath).replace(/\\/g, '/');
};
```

### Security Rules

1. **Localhost only**: Server binds to `127.0.0.1`, not accessible from network
2. **Single base directory**: All operations confined to `BASE_DIR`
3. **Path normalization**: All paths normalized before validation
4. **No symlink following**: Prevent symlink-based escapes (optional)
5. **File type filtering** (optional): Only allow certain extensions

---

## Configuration

### server/config.ts

```typescript
import path from 'path';
import type { Config } from './types';

export const config: Config = {
  // REQUIRED: Set this to your notes/documents folder
  BASE_DIR: process.env.BASE_DIR || path.join(process.env.HOME || '', 'Documents', 'notes'),
  
  // Server settings
  PORT: parseInt(process.env.PORT || '3031', 10),
  HOST: '127.0.0.1',  // localhost only for security
  
  // Optional restrictions
  ALLOWED_EXTENSIONS: null, // e.g., ['.md', '.txt', '.markdown'] or null for all
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Feature flags
  ENABLE_DELETE: true,
  ENABLE_CREATE: true,
  AUTO_SAVE: true,
  AUTO_SAVE_DELAY: 2000, // ms
};
```

---

## Frontend Changes

### New UI Components

#### 1. File Tree Sidebar

```
┌──────────────────┐
│ 📁 notes         │  ← BASE_DIR name
├──────────────────┤
│ ▼ 📁 project-a   │
│   ├── 📄 readme.md │ ← Click to open
│   └── 📄 notes.md  │
│ ▶ 📁 project-b   │  ← Click to expand
│ 📄 ideas.md      │
├──────────────────┤
│ [+ New File]     │
│ [+ New Folder]   │
└──────────────────┘
```

#### 2. File Tab Bar (Optional - Phase 2)

```
┌─────────────────────────────────────────┐
│ readme.md × │ notes.md × │ + │          │
└─────────────────────────────────────────┘
```

#### 3. Updated Editor Header

```
┌─────────────────────────────────────────┐
│ 📄 /project-a/readme.md    [Save] [⋮]  │
└─────────────────────────────────────────┘
```

### Layout Changes

**Current Layout (2-pane):**

```
┌─────────────────┬─────────────────┐
│                 │                 │
│     Editor      │    Preview      │
│                 │                 │
└─────────────────┴─────────────────┘
```

**New Layout (3-pane):**

```
┌────────┬─────────────────┬─────────────────┐
│        │                 │                 │
│  File  │     Editor      │    Preview      │
│  Tree  │                 │                 │
│        │                 │                 │
└────────┴─────────────────┴─────────────────┘
  200px       flexible          flexible
```

### State Management

```typescript
// Frontend state (in index.html script)
interface EditorState {
  currentFile: {
    path: string;
    content: string;
    modified: string;
  } | null;
  unsavedChanges: boolean;
  fileTree: FileEntry[];
  expandedFolders: Set<string>;
  serverConnected: boolean;
}
```

### Key Interactions

| Action | Trigger | Behavior |
|--------|---------|----------|
| Open file | Click file in tree | Load content into editor, update currentFile |
| Save file | Ctrl+S | POST to /api/file with current content |
| Create file | Click "+ New File" | Prompt for name, POST to /api/create |
| Delete file | Right-click → Delete | Confirm, DELETE to /api/file |
| Refresh tree | Click refresh icon | GET /api/files, rebuild tree |
| Auto-save | Debounced on input | Save after 2s of no typing (optional) |

---

## Implementation Phases

### Phase 1: Core Functionality (MVP)

* [ ] Create TypeScript server with Express
* [ ] Set up tsconfig.json for tsx execution
* [ ] Implement path validation/security middleware
* [ ] API: List files, Read file, Save file
* [ ] Frontend: Basic file tree sidebar
* [ ] Frontend: Open file → load into editor
* [ ] Frontend: Save current file (Ctrl+S)
* [ ] Update existing localStorage to work alongside file mode

### Phase 2: Enhanced File Operations

* [ ] API: Create file/directory
* [ ] API: Delete file/directory
* [ ] API: Rename/move files
* [ ] Frontend: Context menu (right-click)
* [ ] Frontend: New file/folder buttons
* [ ] Frontend: Unsaved changes indicator (dot on tab/title)
* [ ] Frontend: Confirm before closing unsaved file

### Phase 3: Quality of Life

* [ ] Auto-save with debounce
* [ ] File search (Ctrl+P)
* [ ] Remember last opened file
* [ ] Collapsible sidebar
* [ ] Keyboard navigation in file tree
* [ ] Drag and drop file organization

### Phase 4: Advanced Features (Optional)

* [ ] Multiple file tabs
* [ ] Git integration (status indicators)
* [ ] File watching (reload if changed externally)
* [ ] Image preview/paste support
* [ ] Export to PDF

---

## Usage

### Starting the Editor

```bash
# Install dependencies (first time)
npm install

# Start the server with tsx
npm start

# Or run directly with tsx
tsx server/index.ts

# With custom base directory
BASE_DIR=/path/to/your/notes tsx server/index.ts
```

Then open `http://localhost:3031` in your browser.

### package.json Scripts

```json
{
  "name": "writing",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx server/index.ts",
    "dev": "tsx watch server/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./server",
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["server/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Error Handling

### Frontend Error States

1. **Server not running**: Show "Cannot connect to server" with retry button
2. **File not found**: Show notification, remove from tree
3. **Save failed**: Show error, keep content in editor, retry option
4. **Permission denied**: Show error with path

### Offline Fallback

If server is unreachable, fall back to localStorage mode (current behavior) with a warning banner.

---

## Design Decisions

### Why tsx?

* No build step required - run TypeScript directly
* Fast startup with esbuild under the hood
* Globally installed, no local dependency needed
* Great for development and small projects

### Why Express over alternatives?

* Well-known, stable, lots of TypeScript support
* Simple routing for our REST API needs
* Easy to add middleware (security, logging)

### Why not use the File System Access API?

* Limited browser support
* Requires user interaction each session
* Less control over the file tree UI

---

## Questions to Resolve

1. **Sidebar default state**: Open or collapsed on start?
2. **File filtering**: Show all files or only markdown?
3. **Hidden files**: Show dotfiles (`.gitignore`, etc.)?
4. **Binary files**: How to handle? Skip or show placeholder?
5. **Large files**: Warn before opening files > X MB?

---

## Next Steps

Ready to proceed with **Phase 1** implementation:
1. Create `package.json` with dependencies
2. Create `tsconfig.json`
3. Create `server/` directory structure
4. Implement the TypeScript server
5. Update `index.html` with file tree sidebar
