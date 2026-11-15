/* Shared bootstrap for pages that do not need page-specific behaviour. */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof hydrateIcons === 'function') hydrateIcons();
  if (typeof initTextSize === 'function') initTextSize();

  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('nav-holder');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.dataset.open === 'true';
      nav.dataset.open = String(!open);
      toggle.setAttribute('aria-expanded', String(!open));
    });
  }
});
