/* Care-space roster, with editing controls only for the elder. */
(function familyPage() {
  const ROLE = {
    elder: { label: 'Elder', icon: 'shield-check' },
    caretaker: { label: 'Caretaker', icon: 'stethoscope' },
    family: { label: 'Family', icon: 'users' },
  };
  let user;
  let members = [];

  function addText(parent, tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    parent.append(element);
    return element;
  }

  function memberRow(member) {
    const item = document.createElement('li');
    item.className = 'list__row';
    const icon = document.createElement('span');
    icon.dataset.icon = (ROLE[member.role] || ROLE.family).icon;
    icon.dataset.size = '28';
    item.append(icon);
    const body = document.createElement('div');
    body.className = 'list__body';
    addText(body, 'p', 'list__title', member.name);
    const meta = document.createElement('p');
    meta.className = 'list__meta';
    const chip = document.createElement('span');
    chip.className = 'chip chip--neutral';
    chip.textContent = (ROLE[member.role] || ROLE.family).label;
    meta.append(chip);
    if (member.relation) addText(meta, 'span', '', ` · ${member.relation}`);
    body.append(meta);
    item.append(body);
    if (user.role === 'elder' && member.role !== 'elder') {
      const actions = document.createElement('div');
      actions.className = 'row member-actions';
      const edit = document.createElement('button');
      edit.className = 'btn btn--secondary';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => openMemberForm(member));
      const remove = document.createElement('button');
      remove.className = 'btn btn--ghost';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => removeMember(member));
      actions.append(edit, remove);
      item.append(actions);
    }
    return item;
  }

  function renderMembers() {
    const list = document.getElementById('member-list');
    list.replaceChildren(...members.map(memberRow));
    list.setAttribute('aria-busy', 'false');
    const hasFamily = members.some((member) => member.role === 'family');
    const empty = document.getElementById('member-empty');
    empty.textContent = user.role === 'elder'
      ? 'No family members added yet. Add one.'
      : 'No other people have joined this care space yet.';
    empty.hidden = hasFamily;
    const elder = members.find((member) => member.role === 'elder');
    document.getElementById('elder-role-name').textContent = `${elder ? elder.name : user.displayName || 'The elder'} (you)`;
    hydrateIcons();
  }

  function render(userInfo, roster) {
    user = userInfo;
    members = roster;
    const elderLabel = user.displayName || 'the elder';
    document.getElementById('family-title').textContent = user.role === 'elder' ? 'Your care circle' : `${elderLabel}'s care circle`;
    document.getElementById('header-holder').innerHTML = renderHeader('Family', 'Care space');
    document.getElementById('nav-holder').innerHTML = renderNav(user.role, 'family');
    document.getElementById('family-copy').textContent = 'People who share this care space.';
    document.getElementById('family-approval-copy').textContent = `You can see the schedule and suggest changes. ${elderLabel} approves them.`;
    document.getElementById('family-suggestion-message').dataset.elderName = elderLabel;
    document.getElementById('elder-only-guide').hidden = user.role !== 'elder';
    document.getElementById('elder-invites').hidden = user.role !== 'elder';
    document.getElementById('caretaker-actions').hidden = user.role !== 'caretaker';
    document.getElementById('family-actions').hidden = user.role !== 'family';
    document.getElementById('member-management').hidden = user.role !== 'elder';
    document.getElementById('elder-activity-link').hidden = user.role !== 'elder';
    renderMembers();
    bindInviteActions();
    bindSuggestionForm();
    bindMemberForm();
    document.getElementById('family-retry').onclick = loadRoster;
    initTextSize();
  }

  function openMemberForm(member) {
    const form = document.getElementById('member-form');
    form.hidden = false;
    form.dataset.memberId = member ? member.id : '';
    document.getElementById('member-form-title').textContent = member ? 'Edit person' : 'Add person';
    document.getElementById('member-name').value = member ? member.name : '';
    document.getElementById('member-email').value = member ? member.email || '' : '';
    document.getElementById('member-phone').value = member ? member.phone || '' : '';
    document.getElementById('member-role').value = member ? member.role : 'family';
    document.getElementById('member-relation').value = member ? member.relation || 'Other' : 'Other';
    document.getElementById('member-name').focus();
  }

  function bindMemberForm() {
    document.getElementById('add-person').onclick = () => openMemberForm(null);
    document.getElementById('cancel-member').onclick = () => { document.getElementById('member-form').hidden = true; };
    document.getElementById('member-form').onsubmit = async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const name = document.getElementById('member-name').value.trim().replace(/\s+/gu, ' ');
      const validName = name.length >= 2 && name.length <= 60 && /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(name);
      const email = document.getElementById('member-email').value.trim().toLowerCase();
      const validEmail = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!validName || !validEmail) {
        const field = document.getElementById(validName ? 'member-email' : 'member-name');
        field.focus();
        const error = document.getElementById('member-error');
        error.textContent = validName ? 'Please enter an email like name@example.com.' : 'Enter a name using letters, spaces, apostrophes or hyphens.';
        error.hidden = false;
        return;
      }
      const memberId = form.dataset.memberId;
      const data = {
        name,
        relation: document.getElementById('member-relation').value,
        ...(!memberId ? { role: document.getElementById('member-role').value } : {}),
        ...(email ? { email } : {}),
        ...(document.getElementById('member-phone').value.trim() ? { phone: document.getElementById('member-phone').value.trim() } : {}),
      };
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      document.getElementById('member-error').hidden = true;
      try {
        const result = memberId
          ? await API.patch(`/api/members/${encodeURIComponent(memberId)}`, data)
          : await API.post('/api/members', data);
        if (memberId) members = members.map((item) => item.id === memberId ? result.member : item);
        else members.push(result.member);
        renderMembers();
        form.hidden = true;
        toast(memberId ? 'Person updated.' : 'Person added.');
      } catch (error) {
        const message = document.getElementById('member-error');
        message.textContent = error.message;
        message.hidden = false;
      } finally {
        submit.disabled = false;
      }
    };
  }

  async function removeMember(member) {
    if (!window.confirm(`Remove ${member.name} from this care space? Their access and reminder emails will stop.`)) return;
    try {
      await API.del(`/api/members/${encodeURIComponent(member.id)}`);
      members = members.filter((item) => item.id !== member.id);
      renderMembers();
      toast('Person removed. Their access and reminder emails have stopped.');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function copyCode(input) {
    try {
      await navigator.clipboard.writeText(input.value);
      toast('Invite code copied.');
    } catch {
      input.focus();
      input.select();
      toast('Copy was blocked. Select and copy the code.', 'error');
    }
  }

  function bindInviteActions() {
    document.querySelectorAll('[data-generate-code]').forEach((button) => {
      button.onclick = async () => {
        button.disabled = true;
        const error = document.getElementById('invite-error');
        error.hidden = true;
        try {
          const result = await API.post(`/api/spaces/${encodeURIComponent(user.spaceId)}/codes`, { role: button.dataset.generateCode });
          document.getElementById('invite-code-label').textContent = `${button.dataset.generateCode === 'caretaker' ? 'Caretaker' : 'Family'} code`;
          document.getElementById('invite-code').value = result.code;
          document.getElementById('invite-result').hidden = false;
          document.getElementById('invite-copy').onclick = () => copyCode(document.getElementById('invite-code'));
        } catch (requestError) {
          error.textContent = requestError.message;
          error.hidden = false;
        } finally {
          button.disabled = false;
        }
      };
    });
  }

  function bindSuggestionForm() {
    document.getElementById('suggestion-create-form').onsubmit = async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector('button[type="submit"]');
      const message = document.getElementById('family-suggestion-message');
      submit.disabled = true;
      try {
        await API.post('/api/suggestions', {
          title: document.getElementById('suggestion-subject').value.trim(),
          details: document.getElementById('suggestion-details').value.trim(),
        });
        form.reset();
        message.textContent = `Suggestion sent. ${message.dataset.elderName} decides whether to approve it.`;
        message.hidden = false;
      } catch (error) {
        message.textContent = error.message;
        message.hidden = false;
      } finally {
        submit.disabled = false;
      }
    };
  }

  async function loadRoster() {
    document.getElementById('family-error').hidden = true;
    try {
      const { members: roster } = await API.get('/api/members');
      render(user, roster);
    } catch (error) {
      const section = document.getElementById('family-error');
      section.hidden = false;
      section.querySelector('p').textContent = `We couldn't load the care circle. ${error.message}`;
      document.getElementById('member-list').setAttribute('aria-busy', 'false');
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    user = await SentiDoseRole.ready;
    if (!user) return;
    await loadRoster();
  });
})();
