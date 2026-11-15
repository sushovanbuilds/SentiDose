/* Elder approval inbox. Family suggests; only the elder decides. */

(function approvalsPage() {
  let filter = 'pending';

  function render() {
    const holder = document.getElementById('suggestion-list');
    const items = store.state.suggestions.filter((s) =>
      filter === 'pending' ? s.status === 'pending' : s.status !== 'pending'
    );

    if (items.length === 0) {
      holder.innerHTML = filter === 'pending'
        ? `<div class="card empty">
             <span class="empty__icon" data-icon="check-circle" data-size="32"></span>
             <h2 class="empty__title">All caught up</h2>
             <p class="empty__body">No suggestions right now. Your routine is unchanged.</p>
           </div>`
        : `<div class="card empty">
             <span class="empty__icon" data-icon="log" data-size="32"></span>
             <h2 class="empty__title">Nothing decided yet</h2>
             <p class="empty__body">Approved and declined suggestions appear here.</p>
           </div>`;
      hydrateIcons();
      return;
    }

    holder.innerHTML = items
      .map((item) => {
        const isPending = item.status === 'pending';
        return `<article class="card card--spaced" aria-labelledby="sg-${item.id}">
          <div class="row row--between">
            <div>
              <h2 class="timeline__title" id="sg-${item.id}">
                ${escapeHtml(item.proposedBy)} suggests: ${escapeHtml(item.title)}
              </h2>
              <p class="timeline__meta">${escapeHtml(item.proposedAt)}</p>
            </div>
            ${isPending ? statusChip('suggestion') : statusChip(item.status)}
          </div>

          <div class="diff">
            ${item.before ? `<div class="diff__box">
              <p class="diff__label">Now</p>
              <p class="diff__value">${escapeHtml(item.before)}</p>
            </div>` : ''}
            <div class="diff__box diff__box--after">
              <p class="diff__label">${item.before ? 'Proposed' : 'New'}</p>
              <p class="diff__value">${escapeHtml(item.after)}</p>
            </div>
          </div>

          <p class="med__note">${escapeHtml(item.proposedBy)} says: “${escapeHtml(item.reason)}”</p>

          ${isPending
            ? `<div class="next-card__actions">
                 <button class="btn btn--primary btn--block" type="button"
                         data-decide="${item.id}" data-decision="approved" aria-label="Approve: ${escapeHtml(item.title)} from ${escapeHtml(item.proposedBy)}">
                   <span data-icon="check-circle" data-size="24"></span> Approve
                 </button>
                 <button class="btn btn--secondary btn--block" type="button"
                         data-decide="${item.id}" data-decision="rejected">Not now</button>
               </div>`
            : ''}
        </article>`;
      })
      .join('');

    hydrateIcons();

    holder.querySelectorAll('[data-decide]').forEach((button) => {
      button.addEventListener('click', () => {
        store.decide(button.dataset.decide, button.dataset.decision);
        const message = button.dataset.decision === 'approved'
          ? 'Approved. Your routine is updated.'
          : 'Declined. Nothing changed.';
        toast(message);
        announceViewChange(message);
        render();
        focusMain();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('elder');
    document.getElementById('header-holder').innerHTML = renderHeader(
      'Approvals',
      'Elder care space',
      `<a class="btn btn--ghost" href="/family"><span data-icon="help-circle" data-size="24"></span> Help</a>`
    );
    document.getElementById('nav-holder').innerHTML = renderNav('elder', '');

    render();
    initTextSize();

    document.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        filter = button.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach((other) => {
          other.setAttribute('aria-pressed', String(other === button));
        });
        announceViewChange(
          filter === 'pending'
            ? 'Showing suggestions waiting for your approval.'
            : 'Showing suggestions you already decided.'
        );
        render();
      });
    });
  });
})();
