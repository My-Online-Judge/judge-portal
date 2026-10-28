// First-paint theme, before the app mounts, so a dark-mode visitor never sees a light flash. A file of its own because
// the edge's Content-Security-Policy allows scripts from 'self' only (no inline script).
(function () {
  try {
    var m = localStorage.getItem('theme');
    var d = m === 'dark' || ((m !== 'light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', d);
    document.documentElement.dataset.theme = d ? 'dark' : 'light';
  } catch (e) {}
})();
