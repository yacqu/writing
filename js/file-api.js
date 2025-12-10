/**
 * File System API Integration
 * Handles server communication and file management
 */

const API_BASE = '/api';
let currentFile = null;
let unsavedChanges = false;
let serverMode = false;
let expandedFolders = new Set();

// Check if server is available
async function checkServerAvailable() {
    try {
        console.log('Checking server availability at:', `${API_BASE}/files`);
        const response = await fetch(`${API_BASE}/files`);
        console.log('Server response status:', response.status);
        serverMode = response.ok;
        console.log('Server mode:', serverMode);
        return serverMode;
    } catch (e) {
        console.error('Server check failed:', e);
        serverMode = false;
        return false;
    }
}

// Load file tree from server
async function loadFileTree(path = '/') {
    try {
        const response = await fetch(`${API_BASE}/files?path=${encodeURIComponent(path)}`);
        const result = await response.json();
        if (result.success) {
            return result.data.files;
        }
    } catch (e) {
        console.error('Failed to load file tree:', e);
    }
    return [];
}

// Render file tree recursively
async function renderFileTree(files, container, parentPath = '', indent = 0) {
    for (const file of files) {
        // Build the full path for this item
        const fullPath = parentPath ? `${parentPath}/${file.name}` : `/${file.name}`;

        const item = document.createElement('div');
        item.className = 'file-tree-item ' + file.type;
        item.style.paddingLeft = (indent * 20 + 8) + 'px';
        item.setAttribute('data-path', fullPath);

        if (file.type === 'directory') {
            const isExpanded = expandedFolders.has(fullPath);
            const arrow = isExpanded ? '▼' : '▶';
            item.innerHTML = `<span class="icon">${arrow} 📁</span> ${file.name}`;

            // Create a container for children
            const childContainer = document.createElement('div');
            childContainer.className = 'file-tree-children';
            if (!isExpanded) {
                childContainer.style.display = 'none';
            }

            item.addEventListener('click', async (e) => {
                e.stopPropagation();

                if (expandedFolders.has(fullPath)) {
                    // Collapse
                    expandedFolders.delete(fullPath);
                    item.querySelector('.icon').innerHTML = '▶ 📁';
                    childContainer.style.display = 'none';
                } else {
                    // Expand
                    expandedFolders.add(fullPath);
                    item.querySelector('.icon').innerHTML = '▼ 📁';

                    // Load children if not already loaded
                    if (childContainer.children.length === 0) {
                        const children = await loadFileTree(fullPath);
                        await renderFileTree(children, childContainer, fullPath, indent + 1);
                    }
                    childContainer.style.display = 'block';
                }
            });

            container.appendChild(item);
            container.appendChild(childContainer);

            // If already expanded, load children
            if (isExpanded) {
                const children = await loadFileTree(fullPath);
                await renderFileTree(children, childContainer, fullPath, indent + 1);
            }
        } else {
            // File
            item.innerHTML = `<span class="icon">📄</span> ${file.name}`;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                loadFileFromServer(fullPath);
            });
            container.appendChild(item);
        }
    }
}

// Load file content from server
async function loadFileFromServer(path) {
    try {
        const response = await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`);
        const result = await response.json();

        if (result.success) {
            currentFile = {
                path: result.data.path,
                content: result.data.content,
                modified: result.data.modified
            };
            document.getElementById('wmd-input').value = result.data.content;

            if (window.isMonacoMode && window.monacoEditor) {
                window.monacoEditor.setValue(result.data.content);
                const isDark = $('body').hasClass('dark-mode');
                let theme = isDark ? 'vs-dark' : 'vs';
                if (result.data.path.endsWith('.log') || result.data.path.endsWith('.txt')) {
                    theme = isDark ? 'log-dark' : 'vs';
                    monaco.editor.setModelLanguage(window.monacoEditor.getModel(), 'log');
                } else {
                    monaco.editor.setModelLanguage(window.monacoEditor.getModel(), 'markdown');
                }
                monaco.editor.setTheme(theme);
            }

            if (window.editor && window.editor.refreshPreview !== undefined) {
                window.editor.refreshPreview();
            }
            unsavedChanges = false;
            updateCurrentFileIndicator();
            updateActiveFileInTree();
        }
    } catch (e) {
        console.error('Failed to load file:', e);
        alert('Failed to load file: ' + path);
    }
}

// Validate filename - only allow safe characters
function validateFilename(filename) {
    // Only allow alphanumeric, dash, underscore, dot
    const safePattern = /^[a-zA-Z0-9._-]+$/;
    if (!safePattern.test(filename)) {
        alert('Invalid filename. Only letters, numbers, dash, underscore, and dot are allowed.');
        return false;
    }
    // Prevent path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        alert('Invalid filename. Path separators are not allowed.');
        return false;
    }
    return true;
}

// Save file to server
async function saveFileToServer() {
    if (!currentFile) {
        // No file open - prompt for filename
        const filename = prompt('Enter filename (e.g., notes.md):');
        if (!filename) return;
        if (!validateFilename(filename)) return;
        currentFile = { path: '/' + filename };
    }

    try {
        const content = document.getElementById('wmd-input').value;
        const response = await fetch(`${API_BASE}/file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: currentFile.path,
                content: content
            })
        });

        const result = await response.json();
        if (result.success) {
            unsavedChanges = false;
            currentFile.modified = result.data.modified;
            updateCurrentFileIndicator();
            await refreshFileTree();
            console.log('File saved:', currentFile.path);
        } else {
            alert('Failed to save file: ' + result.error);
        }
    } catch (e) {
        console.error('Failed to save file:', e);
        alert('Failed to save file');
    }
}

// Create new file
async function createNewFile() {
    const filename = prompt('Enter filename (e.g., notes.md):');
    if (!filename) return;
    if (!validateFilename(filename)) return;

    try {
        const response = await fetch(`${API_BASE}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: '/' + filename,
                type: 'file'
            })
        });

        const result = await response.json();
        if (result.success) {
            await refreshFileTree();
            loadFileFromServer('/' + filename);
        } else {
            alert('Failed to create file: ' + result.error);
        }
    } catch (e) {
        console.error('Failed to create file:', e);
        alert('Failed to create file');
    }
}

// Create new folder
async function createNewFolder() {
    const foldername = prompt('Enter folder name:');
    if (!foldername) return;
    if (!validateFilename(foldername)) return;

    try {
        const response = await fetch(`${API_BASE}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: '/' + foldername,
                type: 'directory'
            })
        });

        const result = await response.json();
        if (result.success) {
            await refreshFileTree();
        } else {
            alert('Failed to create folder: ' + result.error);
        }
    } catch (e) {
        console.error('Failed to create folder:', e);
        alert('Failed to create folder');
    }
}

// Refresh file tree
async function refreshFileTree() {
    const files = await loadFileTree('/');
    const container = document.getElementById('file-tree');
    container.innerHTML = '';
    await renderFileTree(files, container, '');
}

// Update current file indicator
function updateCurrentFileIndicator() {
    const fileName = document.getElementById('floating-file-name');
    const saveBtn = document.getElementById('save-file-btn');

    if (currentFile) {
        fileName.textContent = '📄 ' + currentFile.path;
        saveBtn.style.display = 'block';

        if (unsavedChanges) {
            fileName.classList.add('unsaved');
            saveBtn.textContent = '💾 Save';
            saveBtn.classList.remove('saved');
        } else {
            fileName.classList.remove('unsaved');
            saveBtn.textContent = '✓ Saved';
            saveBtn.classList.add('saved');
            // Reset to "Save" after 2 seconds
            setTimeout(() => {
                if (!unsavedChanges) {
                    saveBtn.textContent = '💾 Save';
                    saveBtn.classList.remove('saved');
                }
            }, 2000);
        }
    } else {
        fileName.textContent = 'No file open';
        saveBtn.style.display = 'none';
        fileName.classList.remove('unsaved');
    }
}

// Update active file in tree
function updateActiveFileInTree() {
    document.querySelectorAll('.file-tree-item').forEach(item => {
        item.classList.remove('active');
    });
    if (currentFile) {
        const activeItem = document.querySelector(`.file-tree-item[data-path="${currentFile.path}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

// Initialize file tree when document is ready
async function initFileTree() {
    try {
        console.log('Initializing file tree...');

        // Check if server is available
        const isServerAvailable = await checkServerAvailable();
        console.log('Server available:', isServerAvailable);

        if (isServerAvailable) {
            console.log('Server mode enabled');
            await refreshFileTree();
            console.log('File tree refreshed');
            updateCurrentFileIndicator();

            // Setup event handlers
            document.getElementById('new-file-btn').addEventListener('click', createNewFile);
            document.getElementById('new-folder-btn').addEventListener('click', createNewFolder);
            document.getElementById('refresh-btn').addEventListener('click', refreshFileTree);

            document.getElementById('toggle-sidebar').addEventListener('click', function () {
                document.getElementById('file-tree-container').classList.toggle('collapsed');
                document.body.classList.toggle('sidebar-collapsed');
            });

            // Track unsaved changes
            document.getElementById('wmd-input').addEventListener('input', function () {
                if (currentFile) {
                    unsavedChanges = true;
                    updateCurrentFileIndicator();
                }
            });

            // Setup save button
            document.getElementById('save-file-btn').addEventListener('click', async function () {
                await saveFileToServer();
            });

            console.log('File tree initialization complete');
        } else {
            console.log('Server not available - using localStorage mode');
            document.body.classList.remove('with-sidebar');
            document.getElementById('file-tree-container').style.display = 'none';
            document.getElementById('toggle-sidebar').style.display = 'none';
            document.getElementById('current-file-indicator').style.display = 'none';
        }
    } catch (error) {
        console.error('Error initializing file tree:', error);
    }
}

// Export functions for global access
window.fileAPI = {
    initFileTree,
    saveFileToServer,
    loadFileFromServer,
    refreshFileTree,
    updateCurrentFileIndicator,
    getCurrentFile: () => currentFile,
    setUnsavedChanges: (value) => { unsavedChanges = value; },
    isServerMode: () => serverMode
};
