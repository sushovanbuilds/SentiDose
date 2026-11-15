/* Add or edit a medicine. Client validation mirrors the server schema. */

(function addMedicinePage() {
  const params = new URLSearchParams(location.search);
  const editingId = params.get('id');
  const MAX_TIMES = 6;

  /** @returns {string} */
  function timeRow(value) {
    return `<div class="row row--flush time-row">
      <label class="visually-hidden" for="time-${Math.random().toString(36).slice(2, 8)}">Dose time</label>
      <input class="input" type="time" value="${value}" required>
      <button class="iconbtn" type="button" data-remove-time aria-label="Remove this time">
        <span data-icon="trash" data-size="24"></span>
      </button>
    </div>`;
  }

  /** @returns {HTMLInputElement[]} */
  function timeInputs() {
    return Array.from(document.querySelectorAll('#time-rows input[type="time"]'));
  }

  function addTimeRow(value = '09:00') {
    if (timeInputs().length >= MAX_TIMES) {
      toast('Six times is the limit.', 'error');
      return;
    }
    document.getElementById('time-rows').insertAdjacentHTML('beforeend', timeRow(value));
    hydrateIcons();
    wireRemoveButtons();
  }

  function wireRemoveButtons() {
    document.querySelectorAll('[data-remove-time]').forEach((button) => {
      button.onclick = () => {
        if (timeInputs().length === 1) {
          toast('Keep at least one time.', 'error');
          return;
        }
        button.closest('.time-row').remove();
      };
    });
  }

  /** @param {string} field @param {string} message */
  function showError(field, message) {
    const error = document.getElementById(`${field}-error`);
    const input = document.getElementById(field);
    if (error) {
      error.innerHTML = message
        ? `<span data-icon="alert-circle" data-size="18" aria-hidden="true"></span>${escapeHtml(message)}`
        : '';
      error.hidden = !message;
    }
    if (input) input.setAttribute('aria-invalid', String(Boolean(message)));
    if (message) hydrateIcons();
  }

  /** @returns {object|null} validated payload */
  function validate() {
    let ok = true;

    const name = document.getElementById('med-name').value.trim();
    if (name.length < 2) {
      showError('med-name', 'Please enter the medicine name.');
      ok = false;
    } else {
      showError('med-name', '');
    }

    const dose = document.getElementById('med-dose').value.trim();
    if (dose.length < 1) {
      showError('med-dose', 'Please enter the dose.');
      ok = false;
    } else {
      showError('med-dose', '');
    }

    const times = timeInputs().map((input) => input.value).filter(Boolean);
    if (times.length === 0) {
      showError('med-times', 'Add at least one time.');
      ok = false;
    } else {
      showError('med-times', '');
    }

    if (!ok) return null;

    return {
      name,
      dose,
      times: [...new Set(times)].sort(),
      withFood: document.querySelector('input[name="withFood"]:checked').value,
      stock: Math.max(0, Number(document.getElementById('med-stock').value) || 0),
      schedule: { kind: 'daily' },
    };
  }

  async function submit(event) {
    event.preventDefault();
    const payload = validate();
    if (!payload) {
      const firstError = document.querySelector('.field__error:not([hidden])');
      if (firstError) firstError.scrollIntoView({ block: 'center' });
      toast('Please fix the highlighted fields.', 'error');
      return;
    }

    const submitButton = document.getElementById('save-med');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    try {
      const data = {
        ...payload,
        note: `${payload.times.map(formatTime).join(' and ')}, ${payload.withFood} food`,
      };
      if (editingId) {
        const current = store.medicine(editingId);
        if (current) data.schedule = current.schedule;
        await API.patch(`/api/medicines/${encodeURIComponent(editingId)}`, data);
        toast('Medicine updated.');
      } else {
        await API.post('/api/medicines', data);
        toast('Medicine added.');
      }
      location.href = '/medicines';
    } catch (error) {
      toast(error.message, 'error');
      submitButton.disabled = false;
      submitButton.textContent = 'Try again';
    }
  }

  async function prefill() {
    if (!editingId) return;
    try {
      const { medicines } = await API.get('/api/medicines');
      store.state.medicines = medicines;
      const med = store.medicine(editingId);
      if (!med) {
        toast('That medicine could not be found.', 'error');
        return;
      }

      document.getElementById('form-title').textContent = `Edit ${med.name}`;
      document.getElementById('save-med').textContent = 'Save changes';
      document.getElementById('med-name').value = med.name;
      document.getElementById('med-dose').value = med.dose;
      document.getElementById('med-stock').value = med.stock;
      document.querySelector(`input[name="withFood"][value="${med.withFood}"]`).checked = true;

      document.getElementById('time-rows').innerHTML = '';
      med.times.forEach((time) => addTimeRow(time));
      wireRemoveButtons();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('header-holder').innerHTML = renderHeader('Add medicine', 'Elder care space');
    document.getElementById('nav-holder').innerHTML = renderNav('elder', 'medicines');

    addTimeRow();
    prefill();
    initTextSize();
    hydrateIcons();

    document.getElementById('add-time').addEventListener('click', () => addTimeRow());
    document.getElementById('med-form').addEventListener('submit', submit);

    const stock = document.getElementById('med-stock');
    document.getElementById('stock-minus').addEventListener('click', () => {
      stock.value = Math.max(0, Number(stock.value) - 1);
    });
    document.getElementById('stock-plus').addEventListener('click', () => {
      stock.value = Math.min(9999, Number(stock.value) + 1);
    });

    document.getElementById('voice-record').addEventListener('click', () => {
      document.getElementById('voice-file').click();
    });

    document.getElementById('voice-file').addEventListener('change', (event) => {
      const file = event.target.files[0];
      const status = document.getElementById('voice-status');
      if (!file) {
        status.textContent = 'No recording yet.';
        return;
      }
      const maxBytes = 1024 * 1024;
      if (file.size > maxBytes) {
        status.textContent = 'That file is over 1 MB. Please record a shorter message.';
        return;
      }
      status.textContent = `Attached: ${file.name}.`;
    });
  });
})();
