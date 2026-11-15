/* The signed session is the only source for the current member's role. */
(function loadRole() {
  const HOME = { elder: '/today', caretaker: '/dashboard', family: '/dashboard' };
  const PAGE_ROLES = {
    '/today': ['elder', 'caretaker'],
    '/dashboard': ['elder', 'caretaker', 'family'],
    '/medicines': ['elder', 'caretaker'],
    '/add-medicine': ['elder', 'caretaker'],
    '/appointments': ['elder', 'caretaker'],
    '/approvals': ['elder', 'caretaker'],
    '/family': ['elder', 'caretaker', 'family'],
    '/audit': ['elder', 'caretaker'],
    '/alarm': ['elder'],
    '/scan': ['elder', 'caretaker'],
  };
  const path = location.pathname.replace(/\.html$/, '') || '/';
  const body = document.body;
  body.dataset.rolePending = 'true';
  body.classList.remove('elder');

  function renderGuard(role) {
    const allowed = PAGE_ROLES[path] || [];
    if (allowed.includes(role)) return;
    const roleNames = allowed.map((value) => value === 'elder' ? 'the elder' : `${value}s`);
    const main = document.querySelector('main');
    if (!main) return;
    main.innerHTML = `<section class="card" role="alert"><h1>This page is for ${roleNames.join(' or ')}.</h1><p>Go back to your care space.</p><a class="btn btn--primary" href="${HOME[role]}">Go to ${role === 'elder' ? 'Today' : 'Overview'}</a></section>`;
  }

  function renderNavigation(role) {
    const holder = document.getElementById('nav-holder');
    if (!holder || typeof renderNav !== 'function') return;
    const key = path === '/dashboard' ? 'dashboard' : path.slice(1);
    const active = path === '/approvals' || path === '/audit' ? '' : key;
    holder.innerHTML = renderNav(role, active);
    if (typeof hydrateIcons === 'function') hydrateIcons(holder);
  }

  const ready = fetch('/api/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(async (response) => {
      if (response.status === 401) {
        location.replace('/join');
        return null;
      }
      if (!response.ok) throw new Error('We could not check your care-space session. Try again.');
      const user = await response.json();
      if (!['elder', 'caretaker', 'family'].includes(user.role) || !user.name || !user.spaceId || !user.elderName) {
        throw new Error('Your session is missing care-space details. Please sign in again.');
      }
      body.dataset.role = user.role;
      body.classList.toggle('elder', user.role === 'elder');
      window.SentiDoseUser = Object.freeze(user);
      document.querySelectorAll('[data-role-only]').forEach((element) => {
        element.hidden = !element.dataset.roleOnly.split(/\s+/).includes(user.role);
      });
      renderGuard(user.role);
      renderNavigation(user.role);
      if (path !== '/family') body.removeAttribute('data-role-pending');
      document.dispatchEvent(new CustomEvent('sentidose:role-ready', { detail: user }));
      return user;
    })
    .catch((error) => {
      const main = document.querySelector('main');
      if (main) main.innerHTML = `<section class="card" role="alert"><h1>Care space unavailable</h1><p>${escapeHtml(error.message)}</p><a class="btn btn--primary" href="/join">Sign in again</a></section>`;
      body.removeAttribute('data-role-pending');
      return null;
    });

  window.SentiDoseRole = {
    ready,
    canUse(page = location.pathname.replace(/\.html$/, '')) {
      return Boolean(window.SentiDoseUser && (PAGE_ROLES[page] || []).includes(window.SentiDoseUser.role));
    },
  };
  document.addEventListener('DOMContentLoaded', () => {
    ready.then((user) => { if (user) renderNavigation(user.role); });
  }, { once: true });
})();
