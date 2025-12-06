import path from 'path';
import { config } from '../config.js';

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export const validatePath = (requestedPath: string): string => {
  // Handle empty or root path
  if (!requestedPath || requestedPath === '/' || requestedPath === '.') {
    return path.resolve(config.BASE_DIR);
  }
  
  // Remove leading slash to make it relative
  let cleanPath = requestedPath.startsWith('/') ? requestedPath.slice(1) : requestedPath;
  
  // Normalize and resolve path, removing any parent directory references
  const normalizedRequest = path.normalize(cleanPath).replace(/^(\.\.(\/|\\|$))+/, '');
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
