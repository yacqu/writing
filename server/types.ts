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
