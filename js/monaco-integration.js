/**
 * Monaco Editor Integration
 * Handles Monaco editor initialization and configuration
 */

var monacoEditor = null;
var monacoInitialized = false;
var isMonacoMode = false;

require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

function initMonaco() {
    return new Promise((resolve) => {
        require(['vs/editor/editor.main'], function () {
            // Register custom language for log files with better syntax highlighting
            monaco.languages.register({ id: 'log' });

            // Define tokenizer for log files
            monaco.languages.setMonarchTokensProvider('log', {
                tokenizer: {
                    root: [
                        // Timestamps - make them gray
                        [/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.,]\d+Z?/, 'log.timestamp'],
                        [/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/, 'log.timestamp'],
                        [/\d{2}:\d{2}:\d{2}/, 'log.timestamp'],

                        // Log levels
                        [/\b(ERROR|FATAL|CRITICAL)\b/i, 'keyword.error'],
                        [/\b(WARN|WARNING)\b/i, 'keyword.warning'],
                        [/\bINFO\b/i, 'keyword.info'],
                        [/\b(DEBUG|TRACE)\b/i, 'comment'],

                        // Brackets and scopes - color based on length
                        [/\[([^\]]{1,10})\]/, 'scope.short'],      // Short scopes (1-10 chars)
                        [/\[([^\]]{11,20})\]/, 'scope.medium'],    // Medium scopes (11-20 chars)
                        [/\[([^\]]{21,35})\]/, 'scope.long'],      // Long scopes (21-35 chars)
                        [/\[([^\]]{36,})\]/, 'scope.extralong'],   // Extra long scopes (36+ chars)

                        // File paths
                        [/[a-zA-Z]:\\[^\s]+/, 'string'],
                        [/\/[^\s:]+\.[a-zA-Z0-9]+/, 'string'],

                        // URLs
                        [/https?:\/\/[^\s]+/, 'string.link'],

                        // Numbers
                        [/\b\d+\.\d+\b/, 'constant.numeric'],
                        [/\b\d+\b/, 'constant.numeric'],

                        // Strings in quotes
                        [/"([^"\\]|\\.)*"/, 'string'],
                        [/'([^'\\]|\\.)*'/, 'string'],

                        // Common symbols
                        [/[{}()\[\]]/, 'delimiter.bracket'],
                        [/[<>]|=>/, 'delimiter.angle'],
                    ]
                }
            });

            // Define theme
            monaco.editor.defineTheme('log-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'keyword.error', foreground: 'f44336', fontStyle: 'bold' },
                    { token: 'keyword.warning', foreground: 'ff9800', fontStyle: 'bold' },
                    { token: 'keyword.info', foreground: '2196f3', fontStyle: 'bold' },
                    { token: 'comment', foreground: '9e9e9e' },
                    { token: 'log.timestamp', foreground: '808080' },
                    { token: 'scope.short', foreground: '9c27b0' },
                    { token: 'scope.medium', foreground: '00bcd4' },
                    { token: 'scope.long', foreground: 'ff9800' },
                    { token: 'scope.extralong', foreground: 'f44336' },
                    { token: 'string', foreground: '4caf50' },
                    { token: 'string.link', foreground: '64b5f6', fontStyle: 'underline' },
                    { token: 'constant.numeric', foreground: 'ffa726' },
                    { token: 'delimiter.bracket', foreground: 'ffeb3b' },
                ],
                colors: {}
            });

            resolve();
        });
    });
}

async function toggleMonaco() {
    const wmdInput = document.getElementById('wmd-input');
    const monacoContainer = document.getElementById('monaco-editor-container');
    const toggleBtn = document.getElementById('toggle-monaco-btn');

    if (!isMonacoMode) {
        // Switch to Monaco
        if (!monacoInitialized) {
            await initMonaco();

            const content = wmdInput.value;
            const isDark = $('body').hasClass('dark-mode');

            let language = 'markdown';
            let theme = isDark ? 'vs-dark' : 'vs';

            const currentFile = window.fileAPI?.getCurrentFile();
            if (currentFile && currentFile.path && (currentFile.path.endsWith('.log') || currentFile.path.endsWith('.txt'))) {
                language = 'log';
                theme = isDark ? 'log-dark' : 'vs';
            }

            monacoEditor = monaco.editor.create(monacoContainer, {
                value: content,
                language: language,
                theme: theme,
                automaticLayout: true,
                minimap: { enabled: false },
                wordWrap: 'on',
                fontSize: 14,
                scrollBeyondLastLine: false
            });

            monacoEditor.onDidChangeModelContent(() => {
                const value = monacoEditor.getValue();
                wmdInput.value = value;
                $(wmdInput).trigger('input');
                if (window.fileAPI) {
                    window.fileAPI.setUnsavedChanges(true);
                    window.fileAPI.updateCurrentFileIndicator();
                }
            });

            monacoInitialized = true;
        } else {
            monacoEditor.setValue(wmdInput.value);
            const isDark = $('body').hasClass('dark-mode');
            let theme = isDark ? 'vs-dark' : 'vs';
            const currentFile = window.fileAPI?.getCurrentFile();
            if (currentFile && currentFile.path && (currentFile.path.endsWith('.log') || currentFile.path.endsWith('.txt'))) {
                theme = isDark ? 'log-dark' : 'vs';
                monaco.editor.setModelLanguage(monacoEditor.getModel(), 'log');
            } else {
                monaco.editor.setModelLanguage(monacoEditor.getModel(), 'markdown');
            }
            monaco.editor.setTheme(theme);
        }

        wmdInput.style.display = 'none';
        monacoContainer.style.display = 'block';
        toggleBtn.classList.add('active');
        toggleBtn.style.backgroundColor = '#094771';
        isMonacoMode = true;

        // Re-apply the current mode to ensure proper layout
        if (window.editorModes) {
            const currentMode = window.editorModes.getCurrentMode();
            window.editorModes.setMode(currentMode, false);
        }
    } else {
        // Switch back to Textarea
        wmdInput.value = monacoEditor.getValue();
        $(wmdInput).trigger('input');

        monacoContainer.style.display = 'none';
        wmdInput.style.display = 'block';
        toggleBtn.classList.remove('active');
        toggleBtn.style.backgroundColor = '';
        isMonacoMode = false;

        // Re-apply the current mode to ensure proper layout
        if (window.editorModes) {
            const currentMode = window.editorModes.getCurrentMode();
            window.editorModes.setMode(currentMode, false);
        }
    }
}

function toggleMonacoDarkMode(enabled) {
    if (monacoEditor) {
        const currentFile = window.fileAPI?.getCurrentFile();
        const theme = enabled ?
            (currentFile && currentFile.path && (currentFile.path.endsWith('.log') || currentFile.path.endsWith('.txt')) ? 'log-dark' : 'vs-dark') :
            'vs';
        monaco.editor.setTheme(theme);
    }
}

// Export for global access
window.monacoEditor = monacoEditor;
window.isMonacoMode = isMonacoMode;
window.monacoIntegration = {
    toggleMonaco,
    toggleMonacoDarkMode,
    getEditor: () => monacoEditor,
    isMonacoMode: () => isMonacoMode
};
