// Tema, sayfa çizilmeden önce uygulanır (yanıp sönmeyi önler). CSP satır içi betiğe izin vermediği için ayrı dosyada.
(function () {
  var t;
  try { t = localStorage.getItem('goksenin-theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
})();
