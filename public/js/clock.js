/* Shared clock utilities for the browser and reminder service. */
(function defineSentiDoseClock(root, factory) {
  const clock = factory();
  if (typeof module === 'object' && module.exports) module.exports = clock;
  else root.SentiDoseClock = clock;
})(globalThis, () => {
  const TIME_ZONE_FALLBACK = 'UTC';
  let started = false;

  function now() {
    return new Date();
  }

  function localTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || TIME_ZONE_FALLBACK;
  }

  function formatClock(instant = now(), timeZone = localTimeZone()) {
    const date = new Intl.DateTimeFormat('en-IN', {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(instant);
    const time = new Intl.DateTimeFormat('en-IN', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(instant).replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
    return `${date} · ${time}`;
  }

  function renderClockMarkup() {
    const instant = now();
    return `<time class="site-clock" data-local-clock datetime="${instant.toISOString()}">${formatClock(instant)}</time>`;
  }

  function updateClocks() {
    const instant = now();
    const value = formatClock(instant);
    document.querySelectorAll('[data-local-clock]').forEach((element) => {
      element.dateTime = instant.toISOString();
      element.textContent = value;
    });
  }

  function scheduleUpdate() {
    const milliseconds = now().getTime();
    const delay = 30_000 - (milliseconds % 30_000);
    window.setTimeout(() => {
      updateClocks();
      scheduleUpdate();
    }, delay || 30_000);
  }

  function startClock() {
    if (started || typeof document === 'undefined') return;
    started = true;
    updateClocks();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') updateClocks();
    });
    scheduleUpdate();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startClock, { once: true });
    } else {
      startClock();
    }
  }

  return { now, localTimeZone, formatClock, renderClockMarkup, startClock };
});
