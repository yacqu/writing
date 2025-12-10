/**
 * Editor Display Modes
 * Handles split/preview/editor mode management
 */

var mode = 0; // 0: split, 1: preview, 2: editor
var modeLabels = ['⬚ Split', '👁 Preview', '✎ Editor'];

function setMode(newMode, save) {
    mode = newMode;
    if (save !== false) {
        localStorage.setItem('editorMode', mode);
    }

    const isMonaco = window.monacoIntegration?.isMonacoMode();
    const $editor = isMonaco ? $('#monaco-editor-container') : $('#wmd-input');
    const $otherEditor = isMonaco ? $('#wmd-input') : $('#monaco-editor-container');

    if (mode == 0) {
        // Split mode
        $editor.show().removeClass('editor-only').css('float', 'left').css('width', '50%').css('max-width', '');
        $otherEditor.hide();
        $('#wmd-preview').show().removeClass('preview-only').css('float', 'left').css('width', '50%').css('max-width', '');
        $('#width-control').hide().removeClass('visible');
        $('body').addClass('fixedheight');
        $('html').addClass('fixedheight');
    }
    else if (mode == 1) {
        // Preview only
        $editor.hide().removeClass('editor-only');
        $otherEditor.hide();
        $('#wmd-preview').show().addClass('preview-only').css('float', 'none');
        var savedWidth = localStorage.getItem('previewWidth') || 80;
        $('#wmd-preview').css('max-width', savedWidth + '%');
        $('#width-slider').val(savedWidth);
        $('#width-value').text(savedWidth + '%');
        $('#width-control').show().addClass('visible');
        $('body').removeClass('fixedheight');
        $('html').removeClass('fixedheight');
    }
    else if (mode == 2) {
        // Editor only
        $('#wmd-preview').hide().removeClass('preview-only').css('max-width', '');
        var savedEditorWidth = localStorage.getItem('editorWidth') || 80;
        $editor.show().addClass('editor-only').css('float', 'none').css('width', '100%').css('max-width', savedEditorWidth + '%');
        $otherEditor.hide();
        $('#width-slider').val(savedEditorWidth);
        $('#width-value').text(savedEditorWidth + '%');
        $('#width-control').show().addClass('visible');
        $('body').addClass('fixedheight');
        $('html').addClass('fixedheight');
    }

    $('#mode-toggle').text(modeLabels[mode]);
}

function cycleMode() {
    var newMode = (mode + 1) % 3;
    setMode(newMode);
}

function updatePreviewWidth(width) {
    $('#wmd-preview.preview-only').css('max-width', width + '%');
    $('#width-value').text(width + '%');
    localStorage.setItem('previewWidth', width);
}

function updateEditorWidth(width) {
    const isMonaco = window.monacoIntegration?.isMonacoMode();
    if (isMonaco) {
        $('#monaco-editor-container.editor-only').css('max-width', width + '%');
    } else {
        $('#wmd-input.editor-only').css('max-width', width + '%');
    }
    $('#width-value').text(width + '%');
    localStorage.setItem('editorWidth', width);
}

// Initialize controls
function initEditorModes() {
    // Width slider - handles both preview and editor modes
    $('#width-slider').on('input', function () {
        var width = $(this).val();
        if (mode == 1) {
            updatePreviewWidth(width);
        } else if (mode == 2) {
            updateEditorWidth(width);
        }
    });

    // Mode toggle button
    $('#mode-toggle').on('click', function () {
        cycleMode();
    });

    // Restore saved mode
    var savedMode = parseInt(localStorage.getItem('editorMode')) || 0;
    setMode(savedMode, false);
}

// Export for global access
window.editorModes = {
    setMode,
    cycleMode,
    updatePreviewWidth,
    updateEditorWidth,
    initEditorModes,
    getCurrentMode: () => mode
};
