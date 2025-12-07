import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { Config } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config: Config = {
  // REQUIRED: Set this to your notes/documents folder
  BASE_DIR: process.env.BASE_DIR || "/Users/yacqubabdirahman/Repos/Tools/writing/notes",
  
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
