import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { validatePath, getRelativePath, SecurityError } from '../middleware/pathValidator.js';
import { config } from '../config.js';
import type { 
  ApiResponse, 
  FileEntry, 
  ListFilesResponse,
  ReadFileResponse,
  SaveFileRequest,
  CreateRequest,
  RenameRequest
} from '../types.js';

const router = express.Router();

// List directory contents
router.get('/files', async (req: Request, res: Response) => {
  try {
    const requestedPath = (req.query.path as string) || '/';
    const absolutePath = validatePath(requestedPath);
    
    const stats = await fs.stat(absolutePath);
    if (!stats.isDirectory()) {
      return res.status(403).json({
        success: false,
        error: 'Path is not a directory'
      } as ApiResponse);
    }

    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    const files: FileEntry[] = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(absolutePath, entry.name);
        const stats = await fs.stat(entryPath);
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? stats.size : undefined,
          modified: stats.mtime.toISOString()
        } as FileEntry;
      })
    );

    res.json({
      success: true,
      data: {
        path: getRelativePath(absolutePath),
        files: files.sort((a, b) => {
          // Directories first, then files, alphabetically
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
      } as ListFilesResponse
    } as ApiResponse<ListFilesResponse>);
  } catch (err: any) {
    if (err instanceof SecurityError) {
      return res.status(400).json({
        success: false,
        error: err.message
      } as ApiResponse);
    }
    if (err.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Directory not found'
      } as ApiResponse);
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
});

// Read file
router.get('/file', async (req: Request, res: Response) => {
  try {
    const requestedPath = req.query.path as string;
    if (!requestedPath) {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      } as ApiResponse);
    }

    const absolutePath = validatePath(requestedPath);
    const stats = await fs.stat(absolutePath);
    
    if (stats.isDirectory()) {
      return res.status(403).json({
        success: false,
        error: 'Cannot read a directory'
      } as ApiResponse);
    }

    const content = await fs.readFile(absolutePath, 'utf-8');
    
    res.json({
      success: true,
      data: {
        path: getRelativePath(absolutePath),
        content,
        modified: stats.mtime.toISOString()
      } as ReadFileResponse
    } as ApiResponse<ReadFileResponse>);
  } catch (err: any) {
    if (err instanceof SecurityError) {
      return res.status(400).json({
        success: false,
        error: err.message
      } as ApiResponse);
    }
    if (err.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      } as ApiResponse);
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
});

// Save file
router.post('/file', async (req: Request, res: Response) => {
  try {
    const { path: requestedPath, content } = req.body as SaveFileRequest;
    
    if (!requestedPath || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Path and content are required'
      } as ApiResponse);
    }

    const absolutePath = validatePath(requestedPath);
    await fs.writeFile(absolutePath, content, 'utf-8');
    
    const stats = await fs.stat(absolutePath);
    
    res.json({
      success: true,
      data: {
        path: getRelativePath(absolutePath),
        modified: stats.mtime.toISOString()
      }
    } as ApiResponse);
  } catch (err: any) {
    if (err instanceof SecurityError) {
      return res.status(403).json({
        success: false,
        error: err.message
      } as ApiResponse);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to save file'
    } as ApiResponse);
  }
});

// Create file or directory
router.post('/create', async (req: Request, res: Response) => {
  try {
    if (!config.ENABLE_CREATE) {
      return res.status(403).json({
        success: false,
        error: 'Create operation is disabled'
      } as ApiResponse);
    }

    const { path: requestedPath, type } = req.body as CreateRequest;
    
    if (!requestedPath || !type) {
      return res.status(400).json({
        success: false,
        error: 'Path and type are required'
      } as ApiResponse);
    }

    const absolutePath = validatePath(requestedPath);
    
    if (type === 'directory') {
      await fs.mkdir(absolutePath, { recursive: true });
    } else {
      await fs.writeFile(absolutePath, '', 'utf-8');
    }
    
    res.json({
      success: true,
      data: {
        path: getRelativePath(absolutePath),
        type
      }
    } as ApiResponse);
  } catch (err: any) {
    if (err instanceof SecurityError) {
      return res.status(403).json({
        success: false,
        error: err.message
      } as ApiResponse);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create ' + (req.body.type || 'item')
    } as ApiResponse);
  }
});

// Delete file or directory
router.delete('/file', async (req: Request, res: Response) => {
  try {
    if (!config.ENABLE_DELETE) {
      return res.status(403).json({
        success: false,
        error: 'Delete operation is disabled'
      } as ApiResponse);
    }

    const requestedPath = req.query.path as string;
    if (!requestedPath) {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      } as ApiResponse);
    }

    const absolutePath = validatePath(requestedPath);
    const stats = await fs.stat(absolutePath);
    
    if (stats.isDirectory()) {
      await fs.rm(absolutePath, { recursive: true });
    } else {
      await fs.unlink(absolutePath);
    }
    
    res.json({
      success: true,
      data: {
        deleted: getRelativePath(absolutePath)
      }
    } as ApiResponse);
  } catch (err: any) {
    if (err instanceof SecurityError) {
      return res.status(403).json({
        success: false,
        error: err.message
      } as ApiResponse);
    }
    if (err.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'File or directory not found'
      } as ApiResponse);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete'
    } as ApiResponse);
  }
});

// Rename/move file
router.put('/file', async (req: Request, res: Response) => {
  try {
    const { oldPath, newPath } = req.body as RenameRequest;
    
    if (!oldPath || !newPath) {
      return res.status(400).json({
        success: false,
        error: 'oldPath and newPath are required'
      } as ApiResponse);
    }

    const absoluteOldPath = validatePath(oldPath);
    const absoluteNewPath = validatePath(newPath);
    
    await fs.rename(absoluteOldPath, absoluteNewPath);
    
    res.json({
      success: true,
      data: {
        oldPath: getRelativePath(absoluteOldPath),
        newPath: getRelativePath(absoluteNewPath)
      }
    } as ApiResponse);
  } catch (err: any) {
    if (err instanceof SecurityError) {
      return res.status(403).json({
        success: false,
        error: err.message
      } as ApiResponse);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to rename/move'
    } as ApiResponse);
  }
});

export default router;
