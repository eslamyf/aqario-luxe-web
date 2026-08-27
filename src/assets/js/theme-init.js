(function () {
  var KEY = 'aqario_theme';
  var theme = 'dark'; // Default: Dark Mode
  try {
    var stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
