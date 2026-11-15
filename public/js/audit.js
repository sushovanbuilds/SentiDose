/* Activity log: newest first, actor and role visible. */

(function auditPage() {
  const roleIcon = { elder: 'shield-check', caretaker: 'stethoscope', family: 'users' };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('header-holder').innerHTML = renderHeader(
      'Activity log',
      'Caretaker dashboard',
      `<a class="btn btn--ghost" href="/family"><span data-icon="help-circle" data-size="24"></span> Help</a>`
    );
    document.getElementById('nav-holder').innerHTML = renderNav('caretaker', 'approvals');

    const list = document.getElementById('audit-list');
    if (store.state.auditLog.length === 0) {
      list.innerHTML = `<li class="list__row"><p class="list__title">No changes recorded yet.</p></li>`;
    } else {
      list.innerHTML = store.state.auditLog
        .map(
          (entry) => `<li class="list__row">
            <span data-icon="${roleIcon[entry.role] || 'log'}" data-size="24"></span>
            <div class="list__body">
              <p class="list__title">${escapeHtml(entry.action)}</p>
              <p class="list__meta">${escapeHtml(entry.actor)} • ${escapeHtml(entry.at)}</p>
            </div>
          </li>`
        )
        .join('');
    }

    hydrateIcons();
    initTextSize();
  });
})();
