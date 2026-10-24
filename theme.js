/**
 * Sets data-theme on <html> before the page paints, from the saved setting
 * or the OS preferences, so a light theme does not flash dark first.
 * script.js keeps it up to date after load.
 */
(() => {
    let theme = 'system';
    try {
        const saved = JSON.parse(localStorage.getItem('typingGameSettings'));
        if (saved && ['dark', 'light', 'contrast'].includes(saved.theme)) theme = saved.theme;
    } catch {
        // Unreadable or unavailable settings: follow the OS.
    }
    if (theme === 'system') {
        if (window.matchMedia('(prefers-contrast: more)').matches) theme = 'contrast';
        else if (window.matchMedia('(prefers-color-scheme: light)').matches) theme = 'light';
        else theme = 'dark';
    }
    document.documentElement.dataset.theme = theme;
})();
