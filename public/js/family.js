/* Role-specific care-circle screens and elder-only invitation rotation. */
(function familyPage() {
  const ROLE = {
    elder: { label: 'Elder', icon: 'shield-check' },
    caretaker: { label: 'Caretaker', icon: 'stethoscope' },
    family: { label: 'Family', icon: 'users' },
  };

  function memberRows(members) {
    return members.map((member) => {
      const role = ROLE[member.role] || ROLE.family;
      return `<li class="list__row">
        <span data-icon="${role.icon}" data-size="28"></span>
        <div class="list__body">
          <p class="list__title">${escapeHtml(member.name)}</p>
          <p class="list__meta"><span class="chip chip--neutral">${role.label}</span></p>
        </div>
      </li>`;
    }).join('');
  }

  function roleLinks(user) {
    if (user.role === 'caretaker') {
      return `<section aria-labelledby="care-actions-title">
        <h2 id="care-actions-title">Your care tasks</h2>
        <p>You can add medicines, record doses and manage appointments.</p>
        <div class="row">
          <a class="btn btn--primary" href="/medicines">Medicines</a>
          <a class="btn btn--secondary" href="/appointments">Appointments</a>
          <a class="btn btn--secondary" href="/today">Today</a>
        </div>
      </section>`;
    }
    if (user.role === 'family') {
      return `<section aria-labelledby="family-actions-title">
        <h2 id="family-actions-title">Your family access</h2>
        <p>You can see the schedule and suggest changes. Dadu approves them.</p>
        <div class="row">
          <a class="btn btn--secondary" href="/dashboard">Schedule</a>
          <a class="btn btn--primary" href="#suggestion-form">Suggest a change</a>
        </div>
      </section>
      <section id="suggestion-form" aria-labelledby="suggestion-title">
        <h2 id="suggestion-title">Suggest a change</h2>
        <form class="card stack" id="suggestion-create-form">
          <label class="field__label" for="suggestion-subject">What should change?</label>
          <input class="input" id="suggestion-subject" name="title" required minlength="3" maxlength="120">
          <label class="field__label" for="suggestion-details">Explain your suggestion</label>
          <textarea class="input" id="suggestion-details" name="details" required minlength="3" maxlength="1000"></textarea>
          <button class="btn btn--primary" type="submit">Send suggestion</button>
          <p id="suggestion-message" role="status" hidden></p>
        </form>
      </section>`;
    }
    return `<section aria-labelledby="role-guide-title">
      <h2 id="role-guide-title">What each role can do</h2>
      <ul class="list card">
        <li class="list__row"><span data-icon="shield-check" data-size="28"></span><div class="list__body"><p class="list__title">${escapeHtml(user.elderName)} (you)</p><p class="list__meta">Controls sharing and approves or declines family suggestions.</p></div></li>
        <li class="list__row"><span data-icon="stethoscope" data-size="28"></span><div class="list__body"><p class="list__title">Caretaker</p><p class="list__meta">Adds medicines, records doses and manages appointments.</p></div></li>
        <li class="list__row"><span data-icon="users" data-size="28"></span><div class="list__body"><p class="list__title">Family</p><p class="list__meta">Sees the schedule and suggests changes for the elder to approve.</p></div></li>
      </ul>
    </section>
    <section aria-labelledby="invite-title">
      <h2 id="invite-title">Invite someone</h2>
      <div class="card stack">
        <p>Generate a new code for the person you want to invite. A new code replaces the previous code for that role.</p>
        <div class="row">
          <button class="btn btn--primary" type="button" data-generate-code="caretaker">Generate a new invite code for caretaker</button>
          <button class="btn btn--secondary" type="button" data-generate-code="family">Generate a new invite code for family</button>
        </div>
        <div id="invite-result" aria-live="polite" hidden></div>
        <p id="invite-error" class="field__error" role="alert" hidden></p>
      </div>
    </section>
    <a class="btn btn--secondary" href="/audit"><span data-icon="log" data-size="24"></span> Activity log</a>`;
  }

  function render(user, members) {
    const title = user.role === 'elder' ? 'Your care circle' : `${escapeHtml(user.elderName)}'s care circle`;
    document.getElementById('header-holder').innerHTML = renderHeader('Family', user.role === 'elder' ? 'Elder care space' : 'Care space');
    document.getElementById('nav-holder').innerHTML = renderNav(user.role, 'family');
    document.getElementById('main').innerHTML = `
      <h1 class="page-title">${title}</h1>
      <p class="page-lede">${user.role === 'elder' ? 'These people are part of your care space.' : 'People who share this care space.'}</p>
      <section aria-labelledby="members-title">
        <h2 class="section-title" id="members-title">Members</h2>
        <ul class="list card" id="member-list">${memberRows(members)}</ul>
      </section>
      ${roleLinks(user)}`;
    hydrateIcons();
    initTextSize();
    bindInviteActions(user);
    bindSuggestionForm();
  }

  function bindInviteActions(user) {
    document.querySelectorAll('[data-generate-code]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        const error = document.getElementById('invite-error');
        error.hidden = true;
        try {
          const role = button.dataset.generateCode;
          const result = await API.post(`/api/spaces/${encodeURIComponent(user.spaceId)}/codes`, { role });
          const holder = document.getElementById('invite-result');
          holder.hidden = false;
          holder.innerHTML = `<p>Share this ${role} code now. It is shown only once, and the previous ${role} code no longer works.</p>
            <label class="field__label" for="invite-code">${role === 'caretaker' ? 'Caretaker' : 'Family'} code</label>
            <input class="input" id="invite-code" value="${escapeHtml(result.code)}" readonly>
            <button class="btn btn--secondary" type="button" id="copy-invite-code">Copy code</button>`;
          document.getElementById('copy-invite-code').addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(result.code);
              toast('Invite code copied.');
            } catch {
              const codeInput = document.getElementById('invite-code');
              codeInput.focus();
              codeInput.select();
              toast('Copy was blocked. Select and copy the code above.', 'error');
            }
          });
        } catch (requestError) {
          error.textContent = requestError.message;
          error.hidden = false;
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  function bindSuggestionForm() {
    const form = document.getElementById('suggestion-create-form');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const message = document.getElementById('suggestion-message');
      submit.disabled = true;
      try {
        await API.post('/api/suggestions', {
          title: document.getElementById('suggestion-subject').value.trim(),
          details: document.getElementById('suggestion-details').value.trim(),
        });
        form.reset();
        message.textContent = 'Suggestion sent. Dadu decides whether to approve it.';
        message.hidden = false;
      } catch (error) {
        message.textContent = error.message;
        message.hidden = false;
      } finally {
        submit.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await SentiDoseRole.ready;
    if (!user) return;
    try {
      const { members } = await API.get('/api/members');
      render(user, members);
    } catch (error) {
      document.getElementById('main').innerHTML = '<section class="card" role="alert"><h1>Care circle unavailable</h1><p class="field__error"></p><button class="btn btn--primary" type="button" id="family-retry">Try again</button></section>';
      document.querySelector('#main .field__error').textContent = error.message;
      document.getElementById('family-retry').addEventListener('click', () => location.reload());
    } finally {
      document.body.removeAttribute('data-role-pending');
    }
  });
})();
