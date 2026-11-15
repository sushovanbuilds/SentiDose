/* Shared presentation helpers: dates, status chips, nav, toasts, text size.
   All copy follows design.md §11: 12-hour local time, no year in dates. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * "Thu 19 Nov" — never a year.
 * @param {string} iso YYYY-MM-DD or full ISO
 * @returns {string}
 */
function formatDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${MONTHS[m - 1]}`;
}

/**
 * "11:30 AM" from "11:30" or an ISO datetime.
 * @param {string} value
 * @returns {string}
 */
function formatTime(value) {
  const raw = value.includes('T') ? value.split('T')[1] : value;
  const [hRaw, min = '00'] = raw.split(':');
  const hour = Number(hRaw);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${min} ${suffix}`;
}

/**
 * "Thu 19 Nov, 11:30 AM"
 * @param {string} iso
 * @returns {string}
 */
function formatDateTime(iso) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** Status icon and label per design.md §3. @type {Record<string, {icon:string,label:string,tone:string}>} */
const STATUS = {
  taken: { icon: 'check-circle', label: 'Taken', tone: 'taken' },
  pending: { icon: 'clock', label: 'Due soon', tone: 'due' },
  upcoming: { icon: 'circle-dashed', label: 'Upcoming', tone: 'upcoming' },
  skipped: { icon: 'alert-circle', label: 'Skipped', tone: 'missed' },
  missed: { icon: 'alert-circle', label: 'Missed', tone: 'missed' },
  approved: { icon: 'check-circle', label: 'Approved', tone: 'taken' },
  rejected: { icon: 'alert-circle', label: 'Declined', tone: 'missed' },
  suggestion: { icon: 'hourglass', label: 'Waiting for approval', tone: 'pending' },
};

/**
 * Status chip markup: colour + icon + word, never colour alone.
 * @param {keyof typeof STATUS} key
 * @param {string} [label] overrides the default word
 * @returns {string}
 */
function statusChip(key, label) {
  const status = STATUS[key] || STATUS.upcoming;
  return `<span class="chip chip--${status.tone}"><span data-icon="${status.icon}" data-size="18"></span>${label || status.label}</span>`;
}

/** Icon slot markup for hydration by hydrateIcons(). */
function iconSlot(name, size = 24, label) {
  return label
    ? `<span data-icon="${name}" data-size="${size}" data-label="${label}"></span>`
    : `<span data-icon="${name}" data-size="${size}"></span>`;
}

/**
 * Elder bottom nav / caretaker sidebar. One component, CSS switches shape.
 * @param {'elder'|'caretaker'} variant
 * @param {string} active current page key
 * @returns {string}
 */
function renderNav(variant, active) {
  const items =
    variant === 'elder'
      ? [
          { key: 'today', href: '/today', label: 'Today', icon: 'calendar' },
          { key: 'medicines', href: '/medicines', label: 'Medicines', icon: 'pill' },
          { key: 'family', href: '/family', label: 'Family', icon: 'users' },
        ]
      : [
          { key: 'dashboard', href: '/dashboard', label: 'Overview', icon: 'calendar' },
          { key: 'medicines', href: '/medicines', label: 'Medicines', icon: 'pill' },
          { key: 'appointments', href: '/appointments', label: 'Appointments', icon: 'stethoscope' },
          { key: 'family', href: '/family', label: 'Family', icon: 'users' },
        ];

  const links = items
    .map(
      (item) => `<li>
        <a class="nav__link" href="${item.href}"${item.key === active ? ' aria-current="page"' : ''}>
          ${iconSlot(item.icon, 24)}
          <span>${item.label}</span>
        </a>
      </li>`
    )
    .join('');

  return `<nav class="nav" aria-label="${variant === 'elder' ? 'Elder' : 'Caretaker'} sections"><ul class="nav__list">${links}</ul></nav>`;
}

/** @param {string} title @param {string} [subtitle] @param {string} [trailing] */
function renderHeader(title, subtitle, trailing) {
  const clock = SentiDoseClock.renderClockMarkup();
  queueMicrotask(() => SentiDoseClock.startClock());
  return `<header class="site-header">
    <div class="container site-header__inner">
      <a class="brand" href="/">
        ${iconSlot('heart-handshake', 28)}
        <span class="brand__text">
          <span class="brand__name">SentiDose</span>
          ${subtitle ? `<span class="brand__sub">${escapeHtml(subtitle)}</span>` : ''}
        </span>
      </a>
      <div class="row">${clock}${renderTextSize()}${trailing || ''}</div>
    </div>
  </header>`;
}

/** Text-size control: three steps, persisted as an html attribute. */
function renderTextSize() {
  return `<div class="textsize" role="group" aria-label="Text size">
    <button class="textsize__btn" type="button" data-textsize="base" aria-pressed="true" aria-label="A default text size">A</button>
    <button class="textsize__btn" type="button" data-textsize="large" aria-pressed="false" aria-label="A+ larger text">A+</button>
    <button class="textsize__btn" type="button" data-textsize="xlarge" aria-pressed="false" aria-label="A++ largest text">A++</button>
  </div>`;
}

function initTextSize() {
  const buttons = document.querySelectorAll('[data-textsize]');
  if (buttons.length === 0) return;
  const saved = sessionStorage.getItem('sentidose-textsize') || 'base';

  const apply = (value) => {
    if (value === 'base') document.documentElement.removeAttribute('data-textsize');
    else document.documentElement.setAttribute('data-textsize', value);
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.textsize === value)));
    try {
      sessionStorage.setItem('sentidose-textsize', value);
    } catch {
      /* Ignore storage failures. */
    }
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => apply(button.dataset.textsize));
  });
  apply(saved);
}

/**
 * Escape user-controlled text before it enters innerHTML.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Announce a page change to screen readers without moving focus.
 * One polite live region per page, created on demand.
 * Full page navigation announces <title> natively; this covers in-page
 * view swaps (tab panels, filter re-renders, list refreshes).
 * @param {string} message
 */
function announceViewChange(message) {
  let region = document.getElementById('view-announcer');
  if (!region) {
    region = document.createElement('div');
    region.id = 'view-announcer';
    region.className = 'visually-hidden';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('role', 'status');
    document.body.append(region);
  }
  // Clear then set: re-announces even when the message is unchanged.
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/**
 * Move keyboard focus to the main region after a content swap.
 * tabindex="-1" on <main> makes this valid; screen readers land on the
 * heading instead of <body>. Returns focus if the browser won't take it.
 */
function focusMain() {
  const main = document.getElementById('main');
  if (main) main.focus({ preventScroll: true });
}

/**
 * Bottom toast. Success auto-dismisses, errors stay until closed.
 * @param {string} message
 * @param {'success'|'error'} [tone]
 */
function toast(message, tone = 'success') {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'toast-region';
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }

  const node = document.createElement('div');
  node.className = `toast toast--${tone}`;
  node.textContent = message;
  region.append(node);

  if (tone === 'success') {
    setTimeout(() => node.remove(), 5000);
  } else {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast__close';
    close.textContent = 'Dismiss';
    close.addEventListener('click', () => node.remove());
    node.append(' ', close);
  }
}

/**
 * Boot a page: hydrate icons, wire text size, mark the active nav item.
 * @param {{elder?: boolean, nav?: string, active?: string}} options
 */
function bootPage(options = {}) {
  if (options.elder) document.body.classList.add('elder');
  if (options.nav) {
    const holder = document.getElementById('nav-holder');
    if (holder) holder.innerHTML = renderNav(options.nav, options.active || '');
  }
  hydrateIcons();
  initTextSize();
}
