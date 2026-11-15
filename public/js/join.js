/* Join with a 6-digit passcode, or create a care space.
   Passcodes are never stored in the browser; this form will POST in M2. */

(function joinPage() {
  const LENGTH = 6;

  function buildBoxes() {
    const holder = document.getElementById('code-boxes');
    holder.innerHTML = Array.from({ length: LENGTH }, (_, i) =>
      `<input type="text" inputmode="numeric" autocomplete="${i === 0 ? 'one-time-code' : 'off'}"
              maxlength="1" pattern="[0-9]" aria-label="Digit ${i + 1} of ${LENGTH}">`
    ).join('');

    const inputs = Array.from(holder.querySelectorAll('input'));

    inputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        if (input.value && index < LENGTH - 1) inputs[index + 1].focus();
        progress(inputs);
      });

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value && index > 0) {
          inputs[index - 1].focus();
        }
      });

      input.addEventListener('paste', (event) => {
        const digits = (event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, LENGTH);
        if (!digits) return;
        event.preventDefault();
        digits.split('').forEach((digit, offset) => {
          if (inputs[offset]) inputs[offset].value = digit;
        });
        inputs[Math.min(digits.length, LENGTH - 1)].focus();
        progress(inputs);
      });
    });

    return inputs;
  }

  /** @param {HTMLInputElement[]} inputs */
  function progress(inputs) {
    const filled = inputs.filter((input) => input.value).length;
    document.getElementById('code-progress').textContent = `${filled} of ${LENGTH} entered`;
  }

  /** @returns {string} */
  function readCode(inputs) {
    return inputs.map((input) => input.value).join('');
  }

  function wireTabs() {
    const joinTab = document.getElementById('tab-join');
    const createTab = document.getElementById('tab-create');
    const joinPanel = document.getElementById('panel-join');
    const createPanel = document.getElementById('panel-create');

    const select = (isJoin) => {
      joinTab.setAttribute('aria-selected', String(isJoin));
      createTab.setAttribute('aria-selected', String(!isJoin));
      joinPanel.hidden = !isJoin;
      createPanel.hidden = isJoin;
    };

    joinTab.addEventListener('click', () => select(true));
    createTab.addEventListener('click', () => select(false));

    if (location.hash === '#create') select(false);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('elder');
    document.getElementById('header-holder').innerHTML = renderHeader('Join', 'SentiDose care space');
    const inputs = buildBoxes();
    wireTabs();
    initTextSize();
    hydrateIcons();

    document.getElementById('join-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const error = document.getElementById('join-error');
      const code = readCode(inputs);
      const name = document.getElementById('join-name').value.trim();

      if (!/^\d{6}$/.test(code)) {
        error.innerHTML = `<span data-icon="alert-circle" data-size="18"></span>That code isn't 6 numbers. Check it and try again.`;
        error.hidden = false;
        hydrateIcons();
        inputs[0].focus();
        return;
      }
      if (name.length < 2) {
        error.innerHTML = `<span data-icon="alert-circle" data-size="18"></span>Please enter your name.`;
        error.hidden = false;
        hydrateIcons();
        document.getElementById('join-name').focus();
        return;
      }

      error.hidden = true;
      /* Shortcut: no auth endpoint until M2. The demo opens the elder view. */
      toast('Demo mode: opening the care space.');
      setTimeout(() => {
        location.href = '/today';
      }, 600);
    });

    document.getElementById('create-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const error = document.getElementById('create-error');
      const pin = document.getElementById('create-pin').value;

      if (!/^\d{6}$/.test(pin)) {
        error.innerHTML = `<span data-icon="alert-circle" data-size="18"></span>Choose exactly 6 numbers.`;
        error.hidden = false;
        hydrateIcons();
        document.getElementById('create-pin').focus();
        return;
      }

      error.hidden = true;
      toast('Demo mode: care space created.');
      setTimeout(() => {
        location.href = '/today';
      }, 600);
    });
  });
})();
