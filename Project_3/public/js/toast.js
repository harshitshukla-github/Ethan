let hideTimer;

export function showToast(message, { tone = 'info', duration = 4500 } = {}) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add('is-visible');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => toast.classList.remove('is-visible'), duration);
}
