/* Medicine list: searchable, with stock warnings and edit actions. */

(function medicinesPage() {
  const foodLabel = { before: 'Before food', after: 'After food', anytime: 'Any time' };

  /** @param {object} med @returns {string} */
  function stockChip(med) {
    if (med.stock <= 5) {
      return `<span class="chip chip--due"><span data-icon="alert-circle" data-size="18"></span>${med.stock} left • Refill soon</span>`;
    }
    return `<span class="chip chip--upcoming"><span data-icon="pill" data-size="18"></span>${med.stock} left</span>`;
  }

  /** @param {object} med @returns {string} */
  function scheduleText(med) {
    const times = med.times.map(formatTime).join(' & ');
    return med.schedule.kind === 'weekly' ? `Sundays ${times}` : times;
  }

  /** @param {string} query @returns {Array<object>} */
  function filtered(query) {
    const q = query.trim().toLowerCase();
    if (!q) return store.state.medicines;
    return store.state.medicines.filter((med) => {
      const haystack = [med.name, med.dose, med.note, ...med.times.map(formatTime)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  function render(query = '') {
    const meds = filtered(query);
    const list = document.getElementById('med-list');

    document.getElementById('med-count').textContent =
      `Dadu's active routine • ${store.state.medicines.length} scheduled items`;

    if (meds.length === 0) {
      list.innerHTML = `
        <div class="card empty">
          <span class="empty__icon" data-icon="pill" data-size="32"></span>
          <h2 class="empty__title">No medicines match</h2>
          <p class="empty__body">Try a different name, or add the medicine.</p>
          <div class="empty__actions">
            <a class="btn btn--primary" href="/add-medicine">Add medicine</a>
          </div>
        </div>`;
      hydrateIcons();
      return;
    }

    list.innerHTML = meds
      .map(
        (med) => `<article class="card med" aria-labelledby="med-${med.id}">
          <div class="med__head">
            <div>
              <h2 class="med__name" id="med-${med.id}">${escapeHtml(med.name)} ${escapeHtml(med.dose)}</h2>
              <p class="med__dose">${escapeHtml(scheduleText(med))}</p>
            </div>
            <div class="med__actions">
              <a class="iconbtn" href="/add-medicine?id=${encodeURIComponent(med.id)}"
                 aria-label="Edit ${escapeHtml(med.name)}">
                <span data-icon="pencil" data-size="24"></span>
              </a>
            </div>
          </div>
          <p class="med__note">${escapeHtml(med.note)}</p>
          <div class="med__foot">
            ${stockChip(med)}
            <span class="chip chip--upcoming"><span data-icon="utensils" data-size="18"></span>${foodLabel[med.withFood]}</span>
            ${med.voiceFrom ? `<span class="chip chip--neutral"><span data-icon="mic" data-size="18"></span>Voice note: ${escapeHtml(med.voiceFrom)}</span>` : ''}
          </div>
        </article>`
      )
      .join('');

    hydrateIcons();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('elder');
    document.getElementById('header-holder').innerHTML = renderHeader(
      'Medicines',
      'Elder care space',
      `<a class="btn btn--ghost" href="/family"><span data-icon="help-circle" data-size="24"></span> Help</a>`
    );
    document.getElementById('nav-holder').innerHTML = renderNav('elder', 'medicines');

    render();
    initTextSize();

    const search = document.getElementById('med-search');
    search.addEventListener('input', (event) => render(event.target.value));
  });
})();
