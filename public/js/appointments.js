/* Appointment list and add form. Dates are shown without a year (design.md §11). */

(function appointmentsPage() {
  const TODAY = DEMO_TODAY;

  function renderList() {
    const upcoming = store.state.appointments
      .filter((a) => a.datetime >= TODAY)
      .sort((a, b) => a.datetime.localeCompare(b.datetime));

    const holder = document.getElementById('appt-list');

    if (upcoming.length === 0) {
      holder.innerHTML = `
        <div class="card empty">
          <span class="empty__icon" data-icon="calendar" data-size="32"></span>
          <h2 class="empty__title">No appointments coming up</h2>
          <p class="empty__body">Add a clinic visit so Rahul and Priya stay coordinated.</p>
          <div class="empty__actions">
            <button class="btn btn--primary" type="button" data-open-add>Add appointment</button>
          </div>
        </div>`;
      hydrateIcons();
      wireOpenAdd();
      return;
    }

    holder.innerHTML = upcoming
      .map((appt) => {
        const [y, m, d] = appt.datetime.slice(0, 10).split('-').map(Number);
        const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
        return `<article class="card appt" aria-labelledby="appt-${appt.id}">
          <div class="appt__head">
            <div class="appt__date" aria-hidden="true">
              <span class="appt__day">${weekday}</span>
              <span class="appt__num">${d}</span>
              <span class="appt__day">${MONTHS[m - 1]}</span>
            </div>
            <div class="appt__body">
              <h2 class="appt__doctor" id="appt-${appt.id}">${escapeHtml(appt.doctor)}</h2>
              <p class="appt__meta">${escapeHtml(appt.specialty)}</p>
              <p class="appt__meta">${formatDateTime(appt.datetime)}</p>
              <p class="appt__meta">${escapeHtml(appt.location)}</p>
              <p class="appt__meta">Accompanied by ${escapeHtml(appt.accompaniedBy)}</p>
              ${appt.notes ? `<p class="appt__meta">Bring: ${escapeHtml(appt.notes)}</p>` : ''}
            </div>
          </div>
          <div class="appt__foot">
            <a class="btn btn--secondary" href="https://maps.google.com/?q=${encodeURIComponent(appt.location)}"
               target="_blank" rel="noopener noreferrer">
              <span data-icon="map-pin" data-size="24"></span> Directions
            </a>
          </div>
        </article>`;
      })
      .join('');

    hydrateIcons();
  }

  function wireTabs() {
    const upcomingTab = document.getElementById('tab-upcoming');
    const addTab = document.getElementById('tab-add');
    const upcomingPanel = document.getElementById('upcoming-panel');
    const addPanel = document.getElementById('add-panel');

    const select = (which) => {
      const isUpcoming = which === 'upcoming';
      upcomingTab.setAttribute('aria-selected', String(isUpcoming));
      addTab.setAttribute('aria-selected', String(!isUpcoming));
      upcomingPanel.hidden = !isUpcoming;
      addPanel.hidden = isUpcoming;
      if (!isUpcoming) document.getElementById('appt-doctor').focus();
    };

    upcomingTab.addEventListener('click', () => select('upcoming'));
    addTab.addEventListener('click', () => select('add'));
    document.getElementById('cancel-add').addEventListener('click', () => select('upcoming'));

    return select;
  }

  function wireOpenAdd() {
    document.querySelectorAll('[data-open-add]').forEach((button) => {
      button.addEventListener('click', () => document.getElementById('tab-add').click());
    });
  }

  function submit(event) {
    event.preventDefault();

    const doctor = document.getElementById('appt-doctor').value.trim();
    const date = document.getElementById('appt-date').value;
    const time = document.getElementById('appt-time').value;
    let ok = true;

    const doctorError = document.getElementById('appt-doctor-error');
    doctorError.hidden = doctor.length >= 2;
    if (!doctorError.hidden) {
      doctorError.innerHTML = `<span data-icon="alert-circle" data-size="18"></span>Please enter the doctor's name.`;
      ok = false;
    }

    const dateError = document.getElementById('appt-date-error');
    dateError.hidden = Boolean(date);
    if (!dateError.hidden) {
      dateError.innerHTML = `<span data-icon="alert-circle" data-size="18"></span>Please choose a date.`;
      ok = false;
    }

    if (!ok || !time) {
      hydrateIcons();
      toast('Please complete the required fields.', 'error');
      return;
    }

    store.state.appointments.push({
      id: `appt-${Date.now()}`,
      doctor,
      specialty: document.getElementById('appt-specialty').value.trim() || 'Consultation',
      datetime: `${date}T${time}`,
      location: document.getElementById('appt-location').value.trim() || 'To be confirmed',
      notes: document.getElementById('appt-notes').value.trim(),
      accompaniedBy: 'Rahul',
    });
    saveState(store.state);

    document.getElementById('appt-form').reset();
    document.getElementById('tab-upcoming').click();
    renderList();
    toast('Appointment saved.');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('header-holder').innerHTML = renderHeader(
      'Appointments',
      'Caretaker dashboard',
      `<a class="btn btn--ghost" href="/family"><span data-icon="help-circle" data-size="24"></span> Help</a>`
    );
    document.getElementById('nav-holder').innerHTML = renderNav('caretaker', 'appointments');

    renderList();
    wireTabs();
    wireOpenAdd();
    initTextSize();
    document.getElementById('appt-form').addEventListener('submit', submit);
  });
})();
