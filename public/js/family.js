/* Family / care circle page. */

(function familyPage() {
  const roleLabel = { elder: 'Elder', caretaker: 'Caretaker', family: 'Family' };
  const roleIcon = { elder: 'shield-check', caretaker: 'stethoscope', family: 'users' };

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('elder');
    document.getElementById('header-holder').innerHTML = renderHeader('Family', 'Elder care space');
    document.getElementById('nav-holder').innerHTML = renderNav('elder', 'family');

    document.getElementById('member-list').innerHTML = store.state.members
      .map(
        (member) => `<li class="list__row">
          <span data-icon="${roleIcon[member.role]}" data-size="28"></span>
          <div class="list__body">
            <p class="list__title">${escapeHtml(member.name)}</p>
            <p class="list__meta">${roleLabel[member.role]}${member.relation ? ` • ${escapeHtml(member.relation)}` : ''}</p>
          </div>
        </li>`
      )
      .join('');

    initTextSize();
    hydrateIcons();
  });
})();
