/* Voice alarm. Calm, no countdown. Volume ramps 0.2 -> 0.8 over 5 seconds.
   Audio never starts without a user gesture; a chime fallback always exists. */

(function alarmPage() {
  const RAMP_MS = 5000;
  const START_VOLUME = 0.2;
  const END_VOLUME = 0.8;

  const params = new URLSearchParams(location.search);
  const doseId = params.get('dose') || 'd2';

  function render() {
    document.body.classList.add('elder');
    document.getElementById('header-holder').innerHTML = renderHeader('Reminder', 'Elder care space');

    const dose = store.dose(doseId);
    if (!dose) {
      document.getElementById('alarm-title').textContent = 'No reminder right now';
      document.getElementById('alarm-note').textContent = 'Everything is up to date.';
      document.getElementById('alarm-voice').innerHTML = '';
      document.querySelector('.alarm-actions').innerHTML =
        '<a class="btn btn--primary btn--block" href="/today">Back to today</a>';
      hydrateIcons();
      return;
    }

    const med = store.medicine(dose.medId);
    document.getElementById('alarm-title').textContent = `${med.name} ${med.dose}`;
    document.getElementById('alarm-note').textContent = `${formatTime(dose.scheduledFor)} • ${med.note}`;
    document.getElementById('alarm-time').textContent = `Time for your medicine • ${formatTime(dose.scheduledFor)}`;

    renderVoice(med);
    hydrateIcons();
    initTextSize();
  }

  /** @param {object} med */
  function renderVoice(med) {
    const holder = document.getElementById('alarm-voice');

    if (!med.voiceFrom) {
      holder.innerHTML = `
        <div class="chime">
          <span data-icon="volume-2" data-size="28"></span>
          <div>
            <p class="audio__label audio__label--flush">Gentle chime</p>
            <p class="audio__meta audio__meta--flush">No family voice message for this medicine. A soft tone plays instead.</p>
          </div>
        </div>`;
      return;
    }

    holder.innerHTML = `
      <div class="audio">
        <button class="audio__btn" type="button" id="enable-voice" aria-label="Play message from ${escapeHtml(med.voiceFrom)}">
          <span data-icon="play" data-size="28"></span>
        </button>
        <div class="audio__wave">
          <p class="audio__label">Message from ${escapeHtml(med.voiceFrom)}</p>
          <p class="audio__meta" id="alarm-voice-time">Tap play to start • plays softly</p>
          <svg viewBox="0 0 100 20" width="100%" height="20" aria-hidden="true" focusable="false">
            ${Array.from({ length: 28 }, (_, i) => {
              const height = 4 + ((i * 7) % 15);
              return `<rect x="${i * 3.5}" y="${(20 - height) / 2}" width="2" height="${height}" rx="1" fill="#0f766e"></rect>`;
            }).join('')}
          </svg>
        </div>
      </div>
      <p class="audio__quote">“${escapeHtml(med.voiceTranscript)}”</p>`;

    document.getElementById('enable-voice').addEventListener('click', () => startVoice(med));
  }

  /* Shortcut: no audio asset in the demo. The ramp, the gesture requirement and
     the elapsed-time readout are real; replace the timer with <audio> in M8. */
  function startVoice(med) {
    const button = document.getElementById('enable-voice');
    const label = document.getElementById('alarm-voice-time');
    const total = med.voiceDuration || 14;
    let elapsed = 0;
    let volume = START_VOLUME;
    let playing = true;

    button.innerHTML = `<span data-icon="pause" data-size="28"></span>`;
    button.setAttribute('aria-label', 'Pause message');
    hydrateIcons();

    const started = Date.now();
    const tick = setInterval(() => {
      if (!playing) return;
      const progress = Math.min((Date.now() - started) / RAMP_MS, 1);
      volume = START_VOLUME + (END_VOLUME - START_VOLUME) * progress;
      elapsed = Math.min(Math.floor((Date.now() - started) / 1000), total);
      label.textContent = `0:${String(elapsed).padStart(2, '0')} / 0:${total} • volume ${Math.round(volume * 100)}%`;

      if (elapsed >= total) {
        clearInterval(tick);
        button.innerHTML = `<span data-icon="play" data-size="28"></span>`;
        button.setAttribute('aria-label', 'Play message again');
        label.textContent = 'Finished. Tap to play again.';
        hydrateIcons();
      }
    }, 250);

    button.onclick = () => {
      playing = !playing;
      button.innerHTML = `<span data-icon="${playing ? 'pause' : 'play'}" data-size="28"></span>`;
      hydrateIcons();
    };
  }

  function complete(status) {
    const dose = store.dose(doseId);
    if (dose) store.actOnDose(dose.id, status);

    const message =
      status === 'taken'
        ? 'Recorded. Rahul and Priya have been told.'
        : 'Skipped. Your family has been told so they can check in.';

    document.querySelector('.alarm-actions').innerHTML = `
      <p class="confirmed"><span data-icon="check-circle" data-size="24"></span>${escapeHtml(message)}</p>
      <a class="btn btn--primary btn--block" href="/today">Back to today</a>`;
    document.getElementById('alarm-foot').textContent = '';
    hydrateIcons();
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();

    const took = document.getElementById('alarm-took');
    if (took) took.addEventListener('click', () => complete('taken'));

    const snooze = document.getElementById('alarm-snooze');
    if (snooze) {
      snooze.addEventListener('click', () => {
        toast('We will remind you again in 10 minutes.');
      });
    }

    const skip = document.getElementById('alarm-skip');
    if (skip) skip.addEventListener('click', () => complete('skipped'));
  });
})();
