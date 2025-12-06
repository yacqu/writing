import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from './config.js';
import filesRouter from './routes/files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS headers for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API routes
app.use('/api', filesRouter);

// Serve static files (the editor UI)
const publicDir = path.join(__dirname, '..');
app.use(express.static(publicDir));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Ensure BASE_DIR exists
async function ensureBaseDir() {
  try {
    await fs.access(config.BASE_DIR);
    console.log(`✓ BASE_DIR exists: ${config.BASE_DIR}`);
  } catch {
    console.log(`Creating BASE_DIR: ${config.BASE_DIR}`);
    await fs.mkdir(config.BASE_DIR, { recursive: true });
    console.log(`✓ BASE_DIR created: ${config.BASE_DIR}`);
  }
}

// Start server
async function start() {
  await ensureBaseDir();
  
  app.listen(config.PORT, config.HOST, () => {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║          Writing - File System Editor                ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log(`\n🚀 Server running at: http://${config.HOST}:${config.PORT}`);
    console.log(`📁 Base directory: ${config.BASE_DIR}`);
    console.log(`\n📝 Features enabled:`);
    console.log(`   - Create files/folders: ${config.ENABLE_CREATE ? '✓' : '✗'}`);
    console.log(`   - Delete files/folders: ${config.ENABLE_DELETE ? '✓' : '✗'}`);
    console.log(`\n💡 Press Ctrl+C to stop the server\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
