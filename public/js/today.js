/* Elder Today screen: one next dose, a short list for later, next appointment. */

(function todayPage() {
  const dateNow = new Date();
  const TODAY = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(dateNow.getDate()).padStart(2, '0')}`;

  /** @param {number} hour @returns {string} */
  function greetingFor(hour) {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function render() {
    document.body.classList.add('elder');
    document.getElementById('header-holder').innerHTML = renderHeader(
      'Today',
      'Elder care space',
      `<a class="btn btn--ghost" href="/family"><span data-icon="help-circle" data-size="24"></span> Help</a>`
    );
    document.getElementById('nav-holder').innerHTML = renderNav('elder', 'today');

    document.getElementById('greeting').textContent =
      `${greetingFor(new Date().getHours())}, ${store.state.space.elderNickname}`;
    document.getElementById('today-date').textContent = formatDate(TODAY);

    const doses = store.dosesFor(TODAY);
    const next = doses.find((d) => d.status === 'pending');
    const later = doses.filter((d) => d !== next);

    renderNext(next);
    renderLater(later);
    renderAppointment();

    hydrateIcons();
    initTextSize();
  }

  /** @param {object|undefined} dose */
  function renderNext(dose) {
    const card = document.getElementById('next-dose');
    if (!dose) {
      card.innerHTML = `
        <h2 class="next-card__label">All done for today</h2>
        <p class="next-card__med">Every dose is recorded.</p>
        <p class="next-card__when">Your family can see today's list.</p>`;
      return;
    }

    const med = store.medicine(dose.medId);
    document.getElementById('next-dose-status').innerHTML = statusChip('pending');
    document.getElementById('next-med-name').textContent = `${med.name} ${med.dose}`;
    document.getElementById('next-med-when').textContent =
      `${formatTime(dose.scheduledFor)} • ${med.note || `Take ${med.withFood} food`}`;

    const voice = document.getElementById('voice-holder');
    voice.innerHTML = med.voiceFrom
      ? `<div class="audio">
           <button class="audio__btn" type="button" id="play-voice" aria-label="Play message from ${escapeHtml(med.voiceFrom)}">
             <span data-icon="play" data-size="28"></span>
           </button>
           <div class="audio__wave">
             <p class="audio__label">Hear message from ${escapeHtml(med.voiceFrom)}</p>
             <p class="audio__meta" id="voice-time">0:00 / 0:${med.voiceDuration}</p>
             <svg viewBox="0 0 100 20" width="100%" height="20" aria-hidden="true" focusable="false">
               ${waveformBars(28)}
             </svg>
           </div>
         </div>
         <p class="audio__quote">“${escapeHtml(med.voiceTranscript)}”</p>`
      : `<div class="chime">
           <span data-icon="volume-2" data-size="28"></span>
           <div>
             <p class="audio__label audio__label--flush">Gentle reminder</p>
             <p class="audio__meta audio__meta--flush">No family voice message for this medicine.</p>
           </div>
         </div>`;

    if (med.voiceFrom) {
      document.getElementById('play-voice').addEventListener('click', playVoice);
    }
  }

  /** Static, accessible waveform. Bars are decorative. */
  function waveformBars(count) {
    return Array.from({ length: count }, (_, i) => {
      const height = 4 + ((i * 7) % 15);
      return `<rect x="${i * 3.5}" y="${(20 - height) / 2}" width="2" height="${height}" rx="1" fill="currentColor" color="#0f766e"></rect>`;
    }).join('');
  }

  /* Shortcut: no real audio file in the demo, so this is a labelled simulation.
     Replace with an <audio> element once /api/voice/med/:id exists (M8). */
  let voiceTimer;
  function playVoice() {
    const time = document.getElementById('voice-time');
    const button = document.getElementById('play-voice');
    if (!button || !time) return;

    if (voiceTimer) {
      clearInterval(voiceTimer);
      voiceTimer = null;
      button.setAttribute('aria-label', 'Play message');
      button.innerHTML = `<span data-icon="play" data-size="28"></span>`;
      hydrateIcons();
      return;
    }

    let elapsed = 0;
    const total = 14;
    button.setAttribute('aria-label', 'Pause message');
    button.innerHTML = `<span data-icon="pause" data-size="28"></span>`;
    hydrateIcons();

    voiceTimer = setInterval(() => {
      elapsed += 1;
      time.textContent = `0:${String(elapsed).padStart(2, '0')} / 0:${total}`;
      if (elapsed >= total) {
        clearInterval(voiceTimer);
        voiceTimer = null;
        button.setAttribute('aria-label', 'Play message');
        button.innerHTML = `<span data-icon="play" data-size="28"></span>`;
        time.textContent = `0:00 / 0:${total}`;
        hydrateIcons();
      }
    }, 1000);
  }

  /** @param {Array<object>} doses */
  function renderLater(doses) {
    const list = document.getElementById('later-list');
    if (doses.length === 0) {
      list.innerHTML = '<li class="timeline__row"><p class="timeline__title">Nothing else today.</p></li>';
      return;
    }

    list.innerHTML = doses
      .map((dose) => {
        const med = store.medicine(dose.medId);
        const tone = dose.status === 'taken' ? 'taken' : dose.status === 'missed' ? 'missed' : 'upcoming';
        const icon = dose.status === 'taken' ? 'check-circle' : dose.status === 'missed' ? 'alert-circle' : 'circle-dashed';
        const detail =
          dose.status === 'taken'
            ? `Taken at ${formatTime(dose.actedAt || '00:00')}`
            : `${STATUS[dose.status].label} • ${med.note || `Take ${med.withFood} food`}`;
        return `<li class="timeline__row">
          <span class="chip chip--${tone}" aria-hidden="true"><span data-icon="${icon}" data-size="18"></span></span>
          <div class="timeline__body">
            <p class="timeline__title">${escapeHtml(med.name)} ${escapeHtml(med.dose)}</p>
            <p class="timeline__meta">${formatTime(dose.scheduledFor)} • ${escapeHtml(detail)}</p>
          </div>
        </li>`;
      })
      .join('');
  }

  function renderAppointment() {
    const next = store.state.appointments
      .filter((a) => a.datetime >= TODAY)
      .sort((a, b) => a.datetime.localeCompare(b.datetime))[0];

    const holder = document.getElementById('next-appt');
    if (!next) {
      holder.innerHTML = '<p>No appointments coming up.</p>';
      return;
    }

    holder.innerHTML = `
      <p class="timeline__title">${escapeHtml(next.doctor)}</p>
      <p class="timeline__meta">${escapeHtml(next.specialty)}</p>
      <p class="timeline__meta">${formatDateTime(next.datetime)} • ${escapeHtml(next.location)}</p>
      <div class="appt__foot">
        <a class="btn btn--secondary" href="/appointments">Details</a>
      </div>`;
  }

  function wireActions() {
    const tookButton = document.getElementById('took-it');
    if (tookButton) {
      tookButton.addEventListener('click', async () => {
        const doses = store.dosesFor(TODAY);
        const next = doses.find((d) => d.status === 'pending');
        if (!next) return;
        tookButton.disabled = true;
        try {
          const { dose } = await API.post('/api/doses', {
            medId: next.medId,
            scheduledFor: next.scheduledFor,
            status: 'taken',
          });
          Object.assign(next, dose);
          toast('Dose recorded.');
          render();
        } catch (error) {
          toast(error.message, 'error');
        } finally {
          tookButton.disabled = false;
        }
      });
    }

    const snoozeButton = document.getElementById('snooze');
    if (snoozeButton) {
      snoozeButton.addEventListener('click', () => {
        toast('We will remind you again in 10 minutes.');
      });
    }

    const speak = document.getElementById('speak');
    const hint = document.getElementById('speak-hint');
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      speak.disabled = true;
      speak.setAttribute('aria-disabled', 'true');
      hint.textContent = 'Voice is not available in this browser. Use the buttons instead.';
      return;
    }

    speak.addEventListener('click', () => {
      const recognition = new Recognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      hint.textContent = 'Listening…';
      recognition.addEventListener('result', (event) => {
        hint.textContent = `You said: “${event.results[0][0].transcript}”`;
      });
      recognition.addEventListener('error', () => {
        hint.textContent = 'We could not hear that. Please use the buttons instead.';
      });
      recognition.addEventListener('end', () => {
        if (hint.textContent === 'Listening…') hint.textContent = 'No speech heard. Please use the buttons.';
      });
      recognition.start();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireActions();
    Promise.all([
      API.get('/api/auth/me'),
      API.get('/api/medicines'),
      API.get(`/api/doses?date=${TODAY}`),
      API.get('/api/appointments'),
    ])
      .then(([{ user }, medicineData, doseData, appointmentData]) => {
        store.state.viewer = user;
        store.state.medicines = medicineData.medicines;
        store.state.doseLogs = doseData.doses;
        store.state.appointments = appointmentData.appointments;
        document.querySelector('.next-card__actions').hidden = user.role === 'family';
        render();
      })
      .catch((error) => {
        store.state.medicines = [];
        store.state.doseLogs = [];
        store.state.appointments = [];
        document.querySelector('.next-card__actions').hidden = true;
        render();
        toast(error.message, 'error');
      });
  });
})();
