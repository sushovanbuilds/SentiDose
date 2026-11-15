/* Shared page bootstrap. Kept external so the CSP can stay strict. */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof hydrateIcons === 'function') hydrateIcons();
});
