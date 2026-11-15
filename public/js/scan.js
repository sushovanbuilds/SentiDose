/* Prescription review. Drafts only: nothing saves until every flagged field is
   confirmed by a human, then the save button unlocks. */

(function scanPage() {
  /* Shortcut: hard-coded draft until /api/scan exists (M6). Shape matches the
     validated server response so only the fetch call changes. */
  const DRAFT = [
    {
      name: 'Metformin 500 mg tablet',
      times: ['09:00', '21:00'],
      note: 'Take after food (breakfast & dinner)',
      confidence: 'clear',
    },
    {
      name: 'Telmisartan',
      times: ['08:00'],
      note: 'Take before breakfast',
      confidence: 'check',
      warning: 'Handwriting on the slip was unclear between 20 mg and 40 mg. Please check your tablet strip.',
      suggestedDose: '40 mg',
    },
    {
      name: 'Amlodipine 5 mg tablet',
      times: ['21:00'],
      note: 'Take with a full glass of water',
      confidence: 'clear',
    },
  ];

  const confirmed = new Set();

  function render() {
    const list = document.getElementById('scan-list');
    list.innerHTML = DRAFT.map((item, index) => {
      const needsCheck = item.confidence === 'check';
      const isConfirmed = confirmed.has(index);
      return `<article class="card scan-item scan-item--spaced ${needsCheck ? 'scan-item--warn' : ''}"
                       aria-labelledby="scan-${index}">
        <div class="scan-item__head">
          <h3 class="med__name" id="scan-${index}">${index + 1}. ${escapeHtml(item.name)}</h3>
          ${needsCheck && !isConfirmed
            ? `<span class="chip chip--due"><span data-icon="alert-circle" data-size="18"></span>Check dose</span>`
            : `<span class="chip chip--taken"><span data-icon="check-circle" data-size="18"></span>Read clearly</span>`}
        </div>
        <p class="med__note">Times: ${item.times.map(formatTime).join(' & ')}</p>
        <p class="med__note">${escapeHtml(item.note)}</p>
        ${needsCheck && !isConfirmed
          ? `<div class="notice">
               <span class="notice__icon" data-icon="alert-circle" data-size="24"></span>
               <div>
                 <p>${escapeHtml(item.warning)}</p>
                 <button class="btn btn--primary scan-check" type="button" data-confirm="${index}">
                   Confirm ${escapeHtml(item.suggestedDose)} is correct
                 </button>
               </div>
             </div>`
          : ''}
      </article>`;
    }).join('');

    hydrateIcons();

    list.querySelectorAll('[data-confirm]').forEach((button) => {
      button.addEventListener('click', () => {
        confirmed.add(Number(button.dataset.confirm));
        render();
        updateSave();
      });
    });
  }

  function updateSave() {
    const button = document.getElementById('scan-save');
    const ready = confirmed.size === DRAFT.filter((d) => d.confidence === 'check').length;
    button.disabled = !ready;
    button.setAttribute('aria-disabled', String(!ready));
    button.textContent = ready
      ? `Confirm and save ${DRAFT.length} medicines`
      : 'Confirm the flagged dose first';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('elder');
    document.getElementById('header-holder').innerHTML = renderHeader('Review prescription', 'Elder care space');
    document.getElementById('nav-holder').innerHTML = renderNav('elder', 'medicines');

    render();
    updateSave();
    initTextSize();
    hydrateIcons();

    document.getElementById('scan-file').addEventListener('change', (event) => {
      const file = event.target.files[0];
      const status = document.getElementById('scan-status');
      if (!file) return;

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        status.textContent = 'That file type is not supported. Use JPEG, PNG or WebP.';
        event.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        status.textContent = 'That image is over 5 MB. Please take a smaller photo.';
        event.target.value = '';
        return;
      }
      status.textContent = `Attached: ${file.name}. In the live version we would read it now.`;
    });

    document.getElementById('scan-save').addEventListener('click', () => {
      toast('Nothing is saved in the demo. Please add medicines manually.');
    });
  });
})();
