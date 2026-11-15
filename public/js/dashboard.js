/* Caretaker overview: alert, adherence, fixed-column doses table, approvals. */

(function dashboardPage() {
  const dateNow = SentiDoseClock.now();
  const TODAY = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(dateNow.getDate()).padStart(2, '0')}`;
  let canWrite = true;
  const doseSkeleton = Array.from({ length: 4 }, () => `
    <tr aria-hidden="true">
      <td class="skeleton-table-cell"><span class="skeleton-block skeleton-line skeleton-line--medium"></span><span class="skeleton-block skeleton-line skeleton-line--short"></span></td>
      <td class="skeleton-table-cell"><span class="skeleton-block skeleton-line skeleton-line--short"></span></td>
      <td class="skeleton-table-cell"><span class="skeleton-block skeleton-chip"></span></td>
      <td class="skeleton-table-cell"><span class="skeleton-block skeleton-chip"></span></td>
    </tr>`).join('');
  const appointmentSkeleton = Array.from({ length: 2 }, () => `
    <article class="card" aria-hidden="true">
      <div class="row row--between">
        <span class="skeleton-block skeleton-line skeleton-line--medium"></span>
        <span class="skeleton-block skeleton-chip"></span>
      </div>
      <span class="skeleton-block skeleton-line skeleton-line--short"></span>
      <span class="skeleton-block skeleton-line skeleton-line--long"></span>
      <span class="skeleton-block skeleton-line skeleton-line--medium"></span>
    </article>`).join('');

  function render(adherence) {
    const header = document.getElementById('header-holder');
    header.innerHTML = renderHeader(
      'Overview',
      store.state.viewer.role === 'elder' ? 'Elder care space' : 'Care space',
      '<a class="btn btn--ghost" href="/family"><span data-icon="help-circle" data-size="24"></span> Help</a>'
    );
    const memberChip = document.createElement('span');
    memberChip.className = 'chip chip--upcoming';
    memberChip.textContent = store.state.viewer.name;
    header.querySelector('.row').append(memberChip);
    document.getElementById('nav-holder').innerHTML = renderNav(store.state.viewer.role, 'dashboard');
    document.querySelector('a[href="/add-medicine"]').hidden = !canWrite;
    document.getElementById('dash-date').textContent = `${formatDate(TODAY)} • ${store.state.space.displayName || 'Your care space'}`;

    renderAlert();
    renderAdherence(adherence);
    renderApprovals();
    renderDoses();
    renderAppointments();

    hydrateIcons();
    initTextSize();
  }

  function renderAlert() {
    const missed = store.state.doseLogs
      .filter((d) => d.status === 'missed')
      .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))[0];

    const holder = document.getElementById('alert-holder');
    if (!missed) {
      holder.innerHTML = '';
      return;
    }

    const med = store.medicine(missed.medId);
    holder.innerHTML = `
      <section class="alert" role="status">
        <span class="alert__icon" data-icon="alert-circle" data-size="28"></span>
        <div>
          <h2 class="alert__title">Missed dose</h2>
          <p class="alert__body">
            ${escapeHtml(med.name)} ${escapeHtml(med.dose)} was scheduled for
            ${formatDateTime(missed.scheduledFor)} and was not recorded.
            Family was notified.
          </p>
          <p class="field__hint">Contact your care team if you need help.</p>
        </div>
      </section>`;
  }

  function renderAdherence(stats) {
    document.getElementById('adherence-number').textContent = `${stats.percent}%`;
    document.getElementById('adherence-sub').textContent =
      `${stats.taken} of ${stats.total} recorded doses taken in the last 7 days`;

    document.getElementById('week-strip').innerHTML = stats.days
      .map((day) => {
        const [y, m, d] = day.date.split('-').map(Number);
        const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
        const tone =
          day.total === 0 ? '' : day.taken === day.total ? 'taken' : day.taken === 0 ? 'missed' : 'partial';
        const value = day.total === 0 ? '—' : `${day.taken}/${day.total}`;
        const label =
          day.total === 0
            ? `${weekday}: no doses`
            : `${weekday}: ${day.taken} of ${day.total} doses taken`;
        return `<div class="week__day ${tone ? `week__day--${tone}` : ''}">
          <span class="week__name">${weekday}</span>
          <span class="week__value" aria-label="${label}">${value}</span>
        </div>`;
      })
      .join('');

    const missedDays = stats.days.filter((d) => d.total > 0 && d.taken < d.total).length;
    document.getElementById('adherence-foot').textContent =
      missedDays === 0
        ? 'Every recorded dose was taken this week.'
        : `${missedDays} day${missedDays === 1 ? '' : 's'} with a missed or skipped dose.`;
  }

  function renderApprovals() {
    const pending = store.state.suggestions.filter((s) => s.status === 'pending');
    document.getElementById('approvals-count').innerHTML = statusChip('suggestion', `${pending.length} waiting`);

    const holder = document.getElementById('approvals-preview');
    if (pending.length === 0) {
          holder.textContent = 'Nothing is waiting for the elder to decide.';
      return;
    }

    const list = document.createElement('ul');
    list.className = 'list';
    pending.forEach((item) => {
      const row = document.createElement('li');
      row.className = 'list__row';
      const icon = document.createElement('span');
      icon.dataset.icon = 'hourglass';
      icon.dataset.size = '24';
      const body = document.createElement('div');
      body.className = 'list__body';
      const title = document.createElement('p');
      title.className = 'list__title';
      title.textContent = `${item.proposedBy} suggests: ${item.title}`;
      const detail = document.createElement('p');
      detail.className = 'list__meta';
      detail.textContent = `${item.proposedAt} • waiting for the elder`;
      body.append(title, detail);
      row.append(icon, body);
      list.append(row);
    });
    holder.replaceChildren(list);
  }

  function renderDoses() {
    const doses = store.dosesFor(TODAY);
    const taken = doses.filter((d) => d.status === 'taken').length;

    document.getElementById('doses-count').innerHTML = statusChip('upcoming', `${taken} of ${doses.length} taken`);
    document.getElementById('doses-note').textContent =
      `${formatDate(TODAY)} • status changes are logged and visible to every family member`;

    document.getElementById('doses-body').innerHTML = doses
      .map((dose) => {
        const med = store.medicine(dose.medId);
        const statusKey = dose.status === 'taken' ? 'taken' : dose.status === 'missed' ? 'missed' : dose.status === 'skipped' ? 'skipped' : 'upcoming';
        const acted = dose.status === 'taken' ? `Taken (${formatTime(dose.actedAt || '00:00')})` : null;
        const action =
          dose.status === 'pending'
            ? canWrite
              ? `<button class="btn btn--secondary btn--cc-sm" type="button" data-dose="${dose.id}" data-status="taken">Mark taken</button>`
              : '<span class="field__hint">Pending</span>'
            : `<span class="field__hint">Recorded</span>`;
        return `<tr>
          <td>
            <span class="table__med">${escapeHtml(med.name)} ${escapeHtml(med.dose)}</span><br>
            <span class="field__hint">${escapeHtml(med.note)}</span>
          </td>
          <td>${formatTime(dose.scheduledFor)}</td>
          <td>${statusChip(statusKey, acted || undefined)}</td>
          <td class="table__actions">${action}</td>
        </tr>`;
      })
      .join('');

    document.querySelectorAll('[data-dose]').forEach((button) => {
      button.addEventListener('click', async () => {
        const selected = store.dose(button.dataset.dose);
        if (!selected) return;
        button.disabled = true;
        try {
          const { dose } = await API.post('/api/doses', {
            medId: selected.medId,
            scheduledFor: selected.scheduledFor,
            status: button.dataset.status,
          });
          Object.assign(selected, dose);
          const result = await API.get(`/api/doses/adherence?days=7&through=${TODAY}`);
          toast('Dose recorded.');
          render(result.adherence);
        } catch (error) {
          toast(error.message, 'error');
          button.textContent = 'Try again';
          button.disabled = false;
        }
      });
    });
  }

  function renderAppointments() {
    const upcoming = store.state.appointments
      .filter((a) => a.datetime >= TODAY)
      .slice(0, 2);

    document.getElementById('appt-list').innerHTML = upcoming
      .map(
        (appt) => `<article class="card">
          <div class="row row--between">
            <p class="timeline__title">${escapeHtml(appt.doctor)}</p>
            ${statusChip('upcoming', formatDate(appt.datetime))}
          </div>
          <p class="timeline__meta">${formatTime(appt.datetime)} • ${escapeHtml(appt.specialty)}</p>
          <p class="timeline__meta">${escapeHtml(appt.location)}</p>
          <p class="timeline__meta">Accompanied by ${escapeHtml(appt.accompaniedBy)}</p>
        </article>`
      )
      .join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const stopDoseSkeleton = beginDelayedSkeleton(document.getElementById('doses-body'), doseSkeleton);
    const stopAppointmentSkeleton = beginDelayedSkeleton(document.getElementById('appt-list'), appointmentSkeleton);
    Promise.all([
      SentiDoseRole.ready,
      API.get('/api/medicines'),
      API.get(`/api/doses?date=${TODAY}`),
      API.get('/api/appointments'),
      API.get('/api/suggestions'),
      API.get(`/api/doses/adherence?days=7&through=${TODAY}`),
    ])
      .then(([user, medicineData, doseData, appointmentData, suggestionData, adherenceData]) => {
        stopDoseSkeleton();
        stopAppointmentSkeleton();
        canWrite = user.role !== 'family';
        store.state.viewer = user;
        store.state.medicines = medicineData.medicines;
        store.state.doseLogs = doseData.doses;
        store.state.appointments = appointmentData.appointments;
        store.state.suggestions = suggestionData.suggestions;
        store.state.space.displayName = user.displayName || 'the elder';
        render(adherenceData.adherence);
      })
      .catch((error) => {
        stopDoseSkeleton();
        stopAppointmentSkeleton();
        store.state.medicines = [];
        store.state.doseLogs = [];
        store.state.appointments = [];
        render({ percent: 0, taken: 0, total: 0, days: [] });
        toast(error.message, 'error');
      });
  });
})();
