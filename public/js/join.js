/* Join or create a care space. Creation values remain in memory until success. */
(function joinPage() {
  const CODE_LENGTH = 6;

  function buildBoxes() {
    const holder = document.getElementById('code-boxes');
    const inputs = [];
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.autocomplete = index === 0 ? 'one-time-code' : 'off';
      input.maxLength = 1;
      input.pattern = '[0-9]';
      input.setAttribute('aria-label', `Digit ${index + 1} of ${CODE_LENGTH}`);
      holder.append(input);
      inputs.push(input);
    }
    inputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        if (input.value && index < CODE_LENGTH - 1) inputs[index + 1].focus();
        progress(inputs);
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
      });
      input.addEventListener('paste', (event) => {
        const digits = (event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, CODE_LENGTH);
        if (!digits) return;
        event.preventDefault();
        digits.split('').forEach((digit, digitIndex) => { inputs[digitIndex].value = digit; });
        inputs[Math.min(digits.length, CODE_LENGTH - 1)].focus();
        progress(inputs);
      });
    });
    return inputs;
  }

  function progress(inputs) {
    document.getElementById('code-progress').textContent = `${inputs.filter((input) => input.value).length} of ${CODE_LENGTH} entered`;
  }

  function wireTabs() {
    const joinTab = document.getElementById('tab-join');
    const createTab = document.getElementById('tab-create');
    const joinPanel = document.getElementById('panel-join');
    const createPanel = document.getElementById('panel-create');
    const select = (join) => {
      joinTab.setAttribute('aria-selected', String(join));
      createTab.setAttribute('aria-selected', String(!join));
      joinPanel.hidden = !join;
      createPanel.hidden = join;
      if (!join) document.getElementById(`create-step-${document.getElementById('create-step-indicator').dataset.step || '1'}-title`).focus();
      document.body.classList.toggle('elder', join || document.getElementById('create-step-indicator').dataset.step === '1');
      announceViewChange(join ? 'Join a care space panel shown.' : 'Create a care space panel shown.');
    };
    joinTab.addEventListener('click', () => select(true));
    createTab.addEventListener('click', () => select(false));
    [joinTab, createTab].forEach((tab) => tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      (event.target === joinTab ? createTab : joinTab).click();
    }));
    if (location.hash === '#create') select(false);
  }

  function validPersonName(value, min = 2, max = 60) {
    const clean = value.trim().replace(/\s+/gu, ' ');
    return clean.length >= min && clean.length <= max && /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(clean);
  }

  function createFlow() {
    const form = document.getElementById('create-form');
    let currentStep = 1;
    let creating = false;
    let idempotencyKey;
    const people = { caretakers: document.getElementById('caretaker-rows'), familyMembers: document.getElementById('family-rows') };

    function showStep(step) {
      currentStep = step;
      document.getElementById('create-step-indicator').textContent = `Step ${step} of 4`;
      document.getElementById('create-step-indicator').dataset.step = String(step);
      form.querySelectorAll('.create-step').forEach((section) => { section.hidden = Number(section.dataset.step) !== step; });
      document.body.classList.toggle('elder', step === 1 || document.getElementById('tab-join').getAttribute('aria-selected') === 'true');
      if (step === 4) renderReview();
      document.getElementById(`create-step-${step}-title`).focus();
    }

    function readPeople(key) {
      return Array.from(people[key].children).map((row) => {
        const person = {};
        row.querySelectorAll('[data-person-field]').forEach((input) => {
          if (input.value.trim()) person[input.dataset.personField] = input.value.trim().replace(/\s+/gu, ' ');
        });
        return person;
      });
    }

    function payload() {
      return {
        elderName: document.getElementById('create-elder').value.trim().replace(/\s+/gu, ' '),
        displayName: document.getElementById('create-display-name').value.trim().replace(/\s+/gu, ' '),
        elderEmail: document.getElementById('create-email').value.trim().toLowerCase(),
        language: document.getElementById('create-language').value,
        caretakers: readPeople('caretakers'),
        familyMembers: readPeople('familyMembers'),
        pin: document.getElementById('create-pin').value,
        idempotencyKey,
        timezone: document.getElementById('create-timezone').value,
      };
    }

    function personRow(key, index) {
      const row = document.createElement('fieldset');
      row.className = 'card person-row stack';
      const legend = document.createElement('legend');
      legend.className = 'field__label';
      legend.textContent = key === 'caretakers' ? `Caretaker ${index + 1}` : `Family member ${index + 1}`;
      row.append(legend);
      const fields = [
        ['name', 'Name', 'text'],
        ['email', 'Email', 'email'],
        ...(key === 'caretakers' ? [['phone', 'Phone (optional)', 'tel']] : [['relation', 'Relation', 'select']]),
      ];
      fields.forEach(([name, label, type]) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'field';
        const id = `${key}-${index}-${name}`;
        const labelNode = document.createElement('label');
        labelNode.className = 'field__label';
        labelNode.htmlFor = id;
        labelNode.textContent = label;
        let control;
        if (type === 'select') {
          control = document.createElement('select');
          control.className = 'select';
          ['Son', 'Daughter', 'Grandson', 'Granddaughter', 'Spouse', 'Sibling', 'Friend', 'Other'].forEach((relation) => {
            const option = document.createElement('option');
            option.value = relation;
            option.textContent = relation;
            control.append(option);
          });
        } else {
          control = document.createElement('input');
          control.className = 'input';
          control.type = type;
          control.autocomplete = name === 'name' ? 'name' : name === 'email' ? 'email' : 'tel';
        }
        control.id = id;
        control.dataset.personField = name;
        wrapper.append(labelNode, control);
        row.append(wrapper);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn--ghost';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        row.remove();
        updateAddButtons();
      });
      row.append(remove);
      return row;
    }

    function updateAddButtons() {
      document.getElementById('add-caretaker').hidden = people.caretakers.children.length >= 3;
      document.getElementById('add-family').hidden = people.familyMembers.children.length >= 10;
    }

    function clearErrors() {
      document.getElementById('create-error-summary').hidden = true;
      document.getElementById('create-error-list').replaceChildren();
      form.querySelectorAll('[aria-invalid="true"]').forEach((field) => {
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
      });
      form.querySelectorAll('[data-error-for]').forEach((error) => { error.textContent = ''; error.hidden = true; });
    }

    function fieldFor(path) {
      const direct = { elderName: 'create-elder', displayName: 'create-display-name', elderEmail: 'create-email', pin: 'create-pin' };
      if (direct[path]) return document.getElementById(direct[path]);
      const match = /^(caretakers|familyMembers)\.(\d+)\.(name|email|phone|relation)$/.exec(path);
      return match ? people[match[1]].children[Number(match[2])]?.querySelector(`[data-person-field="${match[3]}"]`) : null;
    }

    function showErrors(issues) {
      clearErrors();
      const list = document.getElementById('create-error-list');
      let firstField;
      issues.forEach((issue) => {
        const field = fieldFor(issue.field || issue.path || '');
        const message = issue.message || 'Check this detail.';
        const item = document.createElement('li');
        const link = document.createElement('button');
        link.className = 'btn btn--ghost';
        link.type = 'button';
        link.textContent = message;
        link.addEventListener('click', () => field && field.focus());
        item.append(link);
        list.append(item);
        if (!field) return;
        const errorId = `${field.id}-error`;
        let error = document.getElementById(errorId);
        if (!error) {
          error = document.createElement('p');
          error.id = errorId;
          error.className = 'field__error';
          error.dataset.errorFor = issue.field || '';
          field.parentElement.append(error);
        }
        error.textContent = message;
        error.hidden = false;
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', errorId);
        firstField ||= field;
      });
      document.getElementById('create-error-summary').hidden = false;
      if (firstField) {
        const step = firstField.closest('.create-step');
        if (step) showStep(Number(step.dataset.step));
        firstField.focus();
      }
    }

    function localIssues(step) {
      const data = payload();
      const issues = [];
      if (step === 1) {
        if (!validPersonName(data.elderName, 2, 60)) issues.push({ field: 'elderName', message: 'Please enter a full name using letters.' });
        if (!validPersonName(data.displayName, 2, 30)) issues.push({ field: 'displayName', message: 'Please enter what we should call the elder.' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.elderEmail)) issues.push({ field: 'elderEmail', message: 'Please enter an email like name@example.com.' });
        if (!/^\d{6}$/.test(data.pin)) issues.push({ field: 'pin', message: 'Enter exactly 6 numbers for the elder access code.' });
      }
      if (step === 2 || step === 3) {
        const key = step === 2 ? 'caretakers' : 'familyMembers';
        data[key].forEach((person, index) => {
          if (!validPersonName(person.name || '')) issues.push({ field: `${key}.${index}.name`, message: 'Please enter a full name using letters.' });
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email || '')) issues.push({ field: `${key}.${index}.email`, message: 'Please enter an email like name@example.com.' });
        });
      }
      const emails = [
        ['elderEmail', data.elderEmail],
        ...data.caretakers.map((person, index) => [`caretakers.${index}.email`, person.email]),
        ...data.familyMembers.map((person, index) => [`familyMembers.${index}.email`, person.email]),
      ].filter(([, email]) => email);
      const seen = new Set();
      emails.forEach(([field, email]) => {
        if (seen.has(email)) issues.push({ field, message: 'Each person needs a different email address.' });
        seen.add(email);
      });
      return issues;
    }

    function renderReview() {
      const review = document.getElementById('create-review');
      review.replaceChildren();
      const groups = [
        { step: 1, title: 'About the elder', values: [payload().elderName, payload().displayName, payload().elderEmail, payload().language, `Access code: ${payload().pin}`] },
        { step: 2, title: 'Caretakers', values: payload().caretakers.map((person) => `${person.name} · ${person.email}${person.phone ? ` · ${person.phone}` : ''}`) },
        { step: 3, title: 'Family members', values: payload().familyMembers.map((person) => `${person.name} · ${person.relation || 'Other'} · ${person.email}`) },
      ];
      groups.forEach((group) => {
        const section = document.createElement('section');
        section.className = 'review-section';
        const heading = document.createElement('h2');
        heading.textContent = group.title;
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn btn--ghost';
        edit.textContent = 'Edit';
        edit.addEventListener('click', () => showStep(group.step));
        const list = document.createElement('ul');
        (group.values.length ? group.values : ['None added']).forEach((value) => {
          const line = document.createElement('li');
          line.textContent = value;
          list.append(line);
        });
        section.append(heading, edit, list);
        review.append(section);
      });
    }

    function showCodes(result) {
      document.getElementById('elder-code').value = result.elderCode;
      document.getElementById('caretaker-code').value = result.inviteCodes.caretaker;
      document.getElementById('family-code').value = result.inviteCodes.family;
      document.querySelectorAll('[data-copy-code]').forEach((button) => {
        button.addEventListener('click', async () => {
          const input = document.getElementById(button.dataset.copyCode);
          try {
            await navigator.clipboard.writeText(input.value);
            toast('Access code copied.');
          } catch {
            input.focus();
            input.select();
            toast('Copy was blocked. Select and copy the code.', 'error');
          }
        });
      });
      document.getElementById('create-success').hidden = false;
      document.getElementById('create-success').focus();
      form.hidden = true;
    }

    document.getElementById('add-caretaker').addEventListener('click', () => {
      if (people.caretakers.children.length < 3) people.caretakers.append(personRow('caretakers', people.caretakers.children.length));
      updateAddButtons();
    });
    document.getElementById('add-family').addEventListener('click', () => {
      if (people.familyMembers.children.length < 10) people.familyMembers.append(personRow('familyMembers', people.familyMembers.children.length));
      updateAddButtons();
    });
    document.getElementById('create-elder').addEventListener('input', (event) => {
      const displayName = document.getElementById('create-display-name');
      if (!displayName.dataset.edited) displayName.value = event.target.value.trim().split(/\s+/u)[0] || '';
    });
    document.getElementById('create-display-name').addEventListener('input', (event) => { event.target.dataset.edited = 'true'; });
    form.querySelectorAll('[data-next-step]').forEach((button) => button.addEventListener('click', () => {
      const issues = localIssues(currentStep);
      if (!issues.length) showStep(Math.min(currentStep + 1, 4));
      else showErrors(issues);
    }));
    form.querySelectorAll('[data-prev-step]').forEach((button) => button.addEventListener('click', () => showStep(Math.max(currentStep - 1, 1))));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (creating) return;
      const issues = [1, 2, 3].flatMap(localIssues);
      if (issues.length) { showErrors(issues); return; }
      if (!idempotencyKey) idempotencyKey = crypto.randomUUID().replaceAll('-', '');
      creating = true;
      const submit = document.getElementById('create-submit');
      submit.disabled = true;
      submit.textContent = 'Creating…';
      document.getElementById('create-failure').hidden = true;
      document.getElementById('create-retry').hidden = true;
      try {
        const result = await API.post('/api/spaces', payload());
        showCodes(result);
        form.reset();
        people.caretakers.replaceChildren();
        people.familyMembers.replaceChildren();
        idempotencyKey = null;
      } catch (error) {
        if (error.status === 400 && error.fields) showErrors(error.fields);
        else if (error.status === 409) {
          document.getElementById('create-failure').textContent = error.message;
          document.getElementById('create-failure').hidden = false;
        } else {
          document.getElementById('create-failure').textContent = 'We couldn’t create your space. Nothing was saved. Try again.';
          document.getElementById('create-failure').hidden = false;
          submit.hidden = true;
          document.getElementById('create-retry').hidden = false;
        }
      } finally {
        creating = false;
        if (!submit.hidden) {
          submit.disabled = false;
          submit.textContent = 'Create care space';
        }
      }
    });
    document.getElementById('create-retry').addEventListener('click', () => {
      document.getElementById('create-submit').hidden = false;
      document.getElementById('create-failure').hidden = true;
      form.requestSubmit();
    });
    document.getElementById('create-timezone').value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    showStep(1);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('elder');
    document.getElementById('header-holder').innerHTML = renderHeader('Join', 'SentiDose care space');
    const codeInputs = buildBoxes();
    wireTabs();
    initTextSize();
    hydrateIcons();
    const roleInput = document.getElementById('join-role');
    const emailInput = document.getElementById('join-email');
    const emailField = document.getElementById('join-email-field');
    const updateRoleFields = () => {
      const needsEmail = roleInput.value !== 'elder';
      emailField.hidden = !needsEmail;
      emailInput.required = needsEmail;
    };
    roleInput.addEventListener('change', updateRoleFields);
    updateRoleFields();
    document.getElementById('join-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = document.getElementById('join-error');
      const code = codeInputs.map((input) => input.value).join('');
      const nameInput = document.getElementById('join-name');
      const name = nameInput.value.trim().replace(/\s+/gu, ' ');
      if (!/^\d{6}$/.test(code)) {
        error.textContent = 'That code is not 6 numbers. Check it and try again.';
        error.hidden = false;
        codeInputs[0].focus();
        return;
      }
      if (!validPersonName(name)) {
        error.textContent = 'Please enter a valid name.';
        error.hidden = false;
        nameInput.focus();
        return;
      }
      error.hidden = true;
      const submit = document.querySelector('#join-form button[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Joining…';
      try {
        const { user } = await API.post('/api/auth/join', { name, ...(emailInput.value.trim() ? { email: emailInput.value.trim().toLowerCase() } : {}), code });
        location.href = user.role === 'elder' ? '/today' : '/dashboard';
      } catch (requestError) {
        error.textContent = requestError.message;
        error.hidden = false;
        submit.disabled = false;
        submit.textContent = 'Try again';
      }
    });
    createFlow();
  });
})();
