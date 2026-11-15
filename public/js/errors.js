/* Register recovery UI before the other deferred page scripts execute. */

function showRequestError(message) {
  let notice = document.getElementById('request-error');
  if (!notice) {
    notice = document.createElement('section');
    notice.id = 'request-error';
    notice.className = 'alert request-error container';
    notice.setAttribute('role', 'alert');

    const copy = document.createElement('p');
    copy.className = 'alert__body';
    copy.dataset.requestErrorMessage = '';

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn--secondary';
    retry.textContent = 'Try again';
    retry.addEventListener('click', () => window.location.reload());

    notice.append(copy, retry);
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) skipLink.insertAdjacentElement('afterend', notice);
    else document.body.prepend(notice);
  }

  notice.querySelector('[data-request-error-message]').textContent = message;
}

function clearRequestError() {
  document.getElementById('request-error')?.remove();
}

window.addEventListener('error', (event) => {
  if (event instanceof ErrorEvent) showRequestError('A page script failed. Reload the page to try again.');
});

window.addEventListener('unhandledrejection', () => {
  showRequestError('The page could not finish an action. Reload and try again.');
});
