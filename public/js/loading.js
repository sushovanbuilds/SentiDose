/* Shared app loader and delayed, accessible skeleton handling. */

const LOADER_FADE_MS = 200;
const SKELETON_DELAY_MS = 150;

function hideAppLoader() {
  const loader = document.getElementById('app-loader');
  if (!loader || loader.hidden || loader.classList.contains('app-loader--hiding')) return;

  loader.classList.add('app-loader--hiding');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    loader.hidden = true;
    return;
  }

  window.setTimeout(() => {
    loader.hidden = true;
  }, LOADER_FADE_MS);
}

/**
 * Mark a content region busy and insert its decorative skeleton after a short
 * delay. The returned function clears the timer and restores the container.
 * @param {HTMLElement} container
 * @param {string} markup Static, aria-hidden skeleton markup.
 * @returns {() => void}
 */
function beginDelayedSkeleton(container, markup) {
  container.setAttribute('aria-busy', 'true');
  let visible = false;
  const timer = window.setTimeout(() => {
    if (container.getAttribute('aria-busy') !== 'true') return;
    container.innerHTML = markup;
    visible = true;
  }, SKELETON_DELAY_MS);

  return () => {
    window.clearTimeout(timer);
    container.setAttribute('aria-busy', 'false');
    if (visible) container.replaceChildren();
  };
}

document.addEventListener('DOMContentLoaded', () => {
  window.requestAnimationFrame(hideAppLoader);
});
