/**
 * Application Initialization
 * Main app initialization and global state management
 */

var latexenabledonce = false;
var latexenabled = localStorage.getItem("latex") !== "0";
var darkmodeenabled = localStorage.getItem("darkmode") !== "0";
var romanfontenabled = localStorage.getItem("romanfont") !== "0";
var converter, editor, mjpd1;

function togglemathjax(enabled) {
    if (enabled) {
        if (!latexenabledonce) {
            MathJax.Hub.Config({
                "HTML-CSS": {
                    preferredFont: "TeX",
                    availableFonts: ["STIX", "TeX"],
                    linebreaks: { automatic: true },
                    EqnChunk: (MathJax.Hub.Browser.isMobile ? 10 : 50)
                },
                tex2jax: {
                    inlineMath: [["$", "$"], ["\\\\(", "\\\\)"]],
                    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
                    processEscapes: true,
                    ignoreClass: "tex2jax_ignore|dno"
                },
                TeX: {
                    noUndefined: {
                        attributes: { mathcolor: "red", mathbackground: "#FFEEEE", mathsize: "90%" }
                    },
                    Macros: { href: "{}" }
                },
                messageStyle: "none",
                skipStartupTypeset: true
            });
            mjpd1.mathjaxEditing.prepareWmdForMathJax(editor, '', [["$", "$"]]);
            latexenabledonce = true;
            if (editor.refreshPreview !== undefined)
                editor.refreshPreview();
        }
        else {
            MathJax.Hub.queue.pending = 0;
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, "wmd-preview"]);
        }
    }
    else {
        MathJax.Hub.queue.pending = 1;
        if (editor.refreshPreview !== undefined)
            editor.refreshPreview();
        else {
            MathJax.Hub.Config({ skipStartupTypeset: true });
        }
    }
}

function toggledarkmode(enabled) {
    $('body').toggleClass('dark-mode', enabled);
    if (window.monacoIntegration) {
        window.monacoIntegration.toggleMonacoDarkMode(enabled);
    }
}

function openFile(e) {
    readFile(e.target.files[0]);
}

function readFile(file) {
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
        var contents = e.target.result;
        $('#wmd-input').val(contents);

        if (window.monacoIntegration && window.monacoIntegration.isMonacoMode()) {
            const monacoEditor = window.monacoIntegration.getEditor();
            if (monacoEditor) {
                monacoEditor.setValue(contents);
                const isDark = $('body').hasClass('dark-mode');
                let theme = isDark ? 'vs-dark' : 'vs';
                if (file.name.endsWith('.log') || file.name.endsWith('.txt')) {
                    theme = isDark ? 'log-dark' : 'vs';
                    monaco.editor.setModelLanguage(monacoEditor.getModel(), 'log');
                } else {
                    monaco.editor.setModelLanguage(monacoEditor.getModel(), 'markdown');
                }
                monaco.editor.setTheme(theme);
            }
        }

        if (editor && editor.refreshPreview !== undefined) {
            editor.refreshPreview();
        }
    };
    reader.readAsText(file);
}

function initEventListeners() {
    console.log('Main script executing...');
    console.log('jQuery available:', typeof jQuery !== 'undefined');
    console.log('$ available:', typeof $ !== 'undefined');

    // File input
    document.getElementById('openFileInput').addEventListener('change', openFile, false);

    // Drag and drop
    $('body').on('drag dragstart dragend dragover dragenter dragleave drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
    })
        .on('drop', function (e) {
            readFile(e.originalEvent.dataTransfer.files[0]);
        });

    // Auto-save to localStorage (when not in server mode)
    $('#wmd-input').on('input', function () {
        if (!window.fileAPI || !window.fileAPI.isServerMode()) {
            localStorage.setItem("writing", $('#wmd-input').val());
        }
    });

    // Help dialog
    $('#helpicon').click(function (e) {
        e.stopPropagation();
        $('#help').show();
    });

    $('#help').click(function (e) {
        e.stopPropagation();
    });

    $(document).click(function () {
        $('#help').hide();
    });

    // Monaco toggle button
    const toggleMonacoBtn = document.getElementById('toggle-monaco-btn');
    if (toggleMonacoBtn) {
        toggleMonacoBtn.addEventListener('click', () => {
            if (window.monacoIntegration) {
                window.monacoIntegration.toggleMonaco();
            }
        });
    }
}

function initEditor() {
    console.log('Initializing Markdown editor...');
    converter = Markdown.getSanitizingConverter();
    Markdown.Extra.init(converter);
    editor = new Markdown.Editor(converter, '');
    mjpd1 = new mjpd();
    togglemathjax(latexenabled);
    toggledarkmode(darkmodeenabled);
    $('html').toggleClass('texroman', romanfontenabled);
    editor.run();
    console.log('Markdown editor initialized');
}

// Initialize when document is ready
$(document).ready(function () {
    // Restore from localStorage if available
    if (localStorage.getItem("writing") !== null) {
        $('#wmd-input').val(localStorage.getItem("writing"));
    }

    $('#wmd-input').focus();

    // Initialize all modules
    initEventListeners();
    initEditor();

    if (window.editorModes) {
        window.editorModes.initEditorModes();
    }

    if (window.keyboardShortcuts) {
        window.keyboardShortcuts.initKeyboardShortcuts();
    }

    if (window.fileAPI) {
        // Call initFileTree when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', window.fileAPI.initFileTree);
        } else {
            window.fileAPI.initFileTree();
        }
    }

    // Auto-enable Monaco editor by default
    setTimeout(() => {
        if (window.monacoIntegration && !window.monacoIntegration.isMonacoMode()) {
            window.monacoIntegration.toggleMonaco();
        }
    }, 100);
});

// Export for global access
window.appState = {
    toggleLatex: togglemathjax,
    toggleDarkMode: toggledarkmode,
    isLatexEnabled: () => latexenabled,
    isDarkModeEnabled: () => darkmodeenabled,
    getEditor: () => editor,
    getConverter: () => converter
};

window.editor = editor;
