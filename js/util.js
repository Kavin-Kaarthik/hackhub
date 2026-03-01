/**
 * Escape HTML to prevent XSS when rendering user content into innerHTML.
 * @param {string} str - Raw string (may contain <, >, ", ', &)
 * @returns {string} Safe HTML string
 */
export function escapeHtml(str) {
    if (str == null || typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
