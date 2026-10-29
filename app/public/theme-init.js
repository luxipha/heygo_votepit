// Applies the colour scheme before the first paint (no flash). Loaded synchronously from <head>; a classic
// script keeps CSP script-src 'self' valid. Mirrors src/lib/theme.ts (boardCacheKeys / boardCacheLookupKeys):
// a board page's last known display mode wins over the viewer's choice, then the viewer's choice applies.
// Without either, no attribute is set and the system preference applies through the DS media query.
(function () {
  var mode = null;
  try {
    var pathname = window.location.pathname;
    var segments = pathname.split('/').filter(Boolean);
    var keys =
      segments.length === 0
        ? ['<root>/']
        : segments.length === 1
          ? ['<root>' + pathname, '/' + segments[0]]
          : ['/' + segments[0] + '/' + segments[1], '/' + segments[0]];
    var cache = JSON.parse(window.localStorage.getItem('heygo_voice_board_theme') || 'null') || {};
    for (var i = 0; i < keys.length && mode === null; i++) {
      var value = cache[keys[i]];
      if (value === 'light' || value === 'dark') mode = value;
    }
  } catch (e) {
    // Storage blocked or cache corrupt: fall through to the viewer's choice.
  }
  if (mode === null) {
    try {
      var saved = window.localStorage.getItem('heygo_voice_theme');
      if (saved === 'light' || saved === 'dark') mode = saved;
      else if (saved !== 'system') mode = 'light';
    } catch (e) {
      // Storage blocked: use the HeyGo light default.
      mode = 'light';
    }
  }
  if (mode !== null) document.documentElement.setAttribute('data-theme', mode);
})();
