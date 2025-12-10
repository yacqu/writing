/**
 * Keyboard Shortcuts
 * Handles all keyboard shortcuts and related functionality
 */

function initKeyboardShortcuts() {
    $(document).on('keydown', function (e) {
        if (e.keyCode == 80 && (e.ctrlKey || e.metaKey)) {    // CTRL + P 
            const currentMode = window.editorModes.getCurrentMode();
            if (currentMode != 1) {
                window.editorModes.setMode(1);
                $('#wmd-input').hide();
                $('#wmd-preview').show();
                $('body').removeClass('fixedheight');
                $('html').removeClass('fixedheight');
                window.appState.toggleDarkMode(false);
                e.preventDefault();
                window.print();
                window.appState.toggleDarkMode(window.appState.isDarkModeEnabled());
                return false;
            }
        }
        else if (e.keyCode == 83 && (e.ctrlKey || e.metaKey)) {    // CTRL + S
            if (window.fileAPI && window.fileAPI.isServerMode()) {
                // Save to server
                window.fileAPI.saveFileToServer();
            } else {
                // Download as file (original behavior)
                var blob = new Blob([$('#wmd-input').val()], { type: 'text' });
                if (window.navigator.msSaveOrOpenBlob) {
                    window.navigator.msSaveBlob(blob, 'newfile.md');
                }
                else {
                    var elem = window.document.createElement('a');
                    elem.href = window.URL.createObjectURL(blob);
                    elem.download = 'newfile.md';
                    document.body.appendChild(elem);
                    elem.click();
                    document.body.removeChild(elem);
                }
            }
            e.preventDefault();
            return false;
        }
        else if (e.keyCode == 68 && (e.ctrlKey || e.metaKey) && !e.shiftKey) {    // CTRL + D
            window.editorModes.cycleMode();
            e.preventDefault();
            return false;
        }
        else if (e.keyCode == 72 && (e.ctrlKey || e.metaKey) && e.shiftKey) {    // CTRL + H
            $('#help').show();
            e.preventDefault();
            return false;
        }
        else if (e.keyCode == 68 && (e.ctrlKey || e.metaKey) && e.shiftKey) {    // CTRL + SHIFT + D
            const newState = !window.appState.isDarkModeEnabled();
            localStorage.setItem("darkmode", newState ? "1" : "0");
            window.appState.toggleDarkMode(newState);
            e.preventDefault();
            return false;
        }
        else if (e.keyCode == 82 && (e.ctrlKey || e.metaKey) && e.shiftKey) {    // CTRL + SHIFT + R
            var isRoman = $('html').toggleClass('texroman').hasClass('texroman');
            localStorage.setItem("romanfont", isRoman ? "1" : "0");
            e.preventDefault();
            return false;
        }
        else if (e.keyCode == 76 && (e.ctrlKey || e.metaKey) && e.shiftKey) {    // CTRL + SHIFT + L 
            const newState = !window.appState.isLatexEnabled();
            localStorage.setItem("latex", newState ? "1" : "0");
            window.appState.toggleLatex(newState);
            e.preventDefault();
            return false;
        }
        else if (e.keyCode == 79 && (e.ctrlKey || e.metaKey) && e.shiftKey) {    // CTRL + SHIFT + O
            $('#openFileInput').click();
            e.preventDefault();
            return false;
        }
        else if (e.keyCode == 27) { // ESC
            $('#help').hide();
        }
    });
}

// Export for global access
window.keyboardShortcuts = {
    initKeyboardShortcuts
};
