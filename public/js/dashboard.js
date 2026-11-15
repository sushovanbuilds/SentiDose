/* Caretaker overview: alert, adherence, fixed-column doses table, approvals. */

(function dashboardPage() {
  const dateNow = new Date();
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
    document.getElementById('header-holder').innerHTML = renderHeader(
      'Overview',
      'Caretaker dashboard',
      `<a class="btn btn--ghost" href="/family"><span data-icon="help-circle" data-size="24"></span> Help</a>
       <span class="chip chip--upcoming"><span data-icon="users" data-size="18"></span>Rahul</span>`
    );
    document.getElementById('nav-holder').innerHTML = renderNav('caretaker', 'dashboard');
    document.querySelector('a[href="/add-medicine"]').hidden = !canWrite;
    document.getElementById('dash-date').textContent = `${formatDate(TODAY)} • ${store.state.space.elderName}`;

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
          <div class="row row--spaced">
            <a class="btn btn--secondary" href="tel:+919830012345"><span data-icon="phone" data-size="24"></span> Call Dadu</a>
          </div>
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
      holder.innerHTML = '<p class="field__hint">Nothing waiting. Dadu has no decisions to make.</p>';
      return;
    }

    holder.innerHTML = `<ul class="list">${pending
      .map(
        (item) => `<li class="list__row">
          <span data-icon="hourglass" data-size="24"></span>
          <div class="list__body">
            <p class="list__title">${escapeHtml(item.proposedBy)} suggests: ${escapeHtml(item.title)}</p>
            <p class="list__meta">${escapeHtml(item.proposedAt)} • waiting for Dadu</p>
          </div>
        </li>`
      )
      .join('')}</ul>`;
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
      API.get('/api/auth/me'),
      API.get('/api/medicines'),
      API.get(`/api/doses?date=${TODAY}`),
      API.get('/api/appointments'),
      API.get(`/api/doses/adherence?days=7&through=${TODAY}`),
    ])
      .then(([{ user }, medicineData, doseData, appointmentData, adherenceData]) => {
        stopDoseSkeleton();
        stopAppointmentSkeleton();
        canWrite = user.role !== 'family';
        store.state.viewer = user;
        store.state.medicines = medicineData.medicines;
        store.state.doseLogs = doseData.doses;
        store.state.appointments = appointmentData.appointments;
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
