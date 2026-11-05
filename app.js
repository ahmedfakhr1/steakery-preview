(function () {
  'use strict';
  var d = document, de = d.documentElement;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* dialogs: drawer, Arabic note, call sheet */
  function openDlg(dlg) {
    if (!dlg) return;
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else { dlg.setAttribute('open', ''); }
  }
  function closeDlg(dlg) {
    if (dlg.close) { dlg.close(); } else { dlg.removeAttribute('open'); }
  }
  $$('dialog').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) {
      var r = dlg.getBoundingClientRect();
      var out = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (e.target === dlg && out) closeDlg(dlg);
    });
    $$('[data-close]', dlg).forEach(function (b) {
      b.addEventListener('click', function () { closeDlg(dlg); });
    });
  });
  var drawer = $('#drawer');
  $$('[data-drawer-open]').forEach(function (b) {
    b.addEventListener('click', function () { openDlg(drawer); b.setAttribute('aria-expanded', 'true'); });
  });
  if (drawer) {
    drawer.addEventListener('close', function () {
      $$('[data-drawer-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    });
    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () { closeDlg(drawer); });
    });
  }
  $$('[data-ar]').forEach(function (b) {
    b.addEventListener('click', function () { openDlg($('#ar-note')); });
  });
  $$('[data-call-open]').forEach(function (b) {
    b.addEventListener('click', function () { openDlg($('#call-sheet')); });
  });
  var sheet = $('#call-sheet');
  if (sheet) $$('a', sheet).forEach(function (a) { a.addEventListener('click', function () { closeDlg(sheet); }); });

  /* header logo appears once the hero has scrolled away (home) */
  var hero = $('.hero');
  var header = $('.site-header');
  if (hero && header && hasIO) {
    new IntersectionObserver(function (es) {
      header.classList.toggle('is-scrolled', es[0].intersectionRatio < 0.3);
    }, { threshold: [0, 0.3, 1] }).observe(hero);
  } else if (header) {
    header.classList.add('is-scrolled');
  }

  /* bottom bar: hidden over the hero and over the footer */
  var dock = $('#dock');
  if (dock) {
    var hiders = $$('[data-dock-hide]');
    var state = new Map();
    var update = function () {
      var hide = false;
      state.forEach(function (v) { if (v) hide = true; });
      dock.classList.toggle('on', !hide);
    };
    if (hasIO && hiders.length) {
      hiders.forEach(function (el) {
        state.set(el, false);
        var half = el.getAttribute('data-dock-hide') === 'half';
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { state.set(el, half ? e.intersectionRatio >= 0.5 : e.isIntersecting); });
          update();
        }, { threshold: half ? [0, 0.5, 1] : [0] }).observe(el);
      });
    } else {
      dock.classList.add('on');
    }
    update();
  }

  /* reveal on scroll */
  var rv = $$('.rv');
  if (rv.length) {
    if (hasIO && !reduce) {
      var rio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
      rv.forEach(function (el) { rio.observe(el); });
    } else {
      rv.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* cut cards: tap the sauce to change it */
  $$('.sauce').forEach(function (btn) {
    var list = btn.getAttribute('data-sauces').split('|');
    var i = parseInt(btn.getAttribute('data-start') || '0', 10) % list.length;
    var out = $('.sauce-v', btn);
    var name = btn.getAttribute('data-cut');
    var show = function (animate) {
      out.textContent = list[i];
      btn.setAttribute('aria-label', 'Sauce for ' + name + ': ' + list[i] + '. Tap for the next sauce.');
      if (animate && !reduce) {
        out.classList.remove('swap');
        void out.offsetWidth;
        out.classList.add('swap');
      }
    };
    show(false);
    btn.addEventListener('click', function () { i = (i + 1) % list.length; show(true); });
  });

  /* branch tabs and the booking message */
  var tabs = $$('.tab');
  if (tabs.length) {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var now = new Date();
    var st = { b: tabs[0], date: 0, time: '8:00 PM', guests: 2, occ: '' };
    var panels = $$('.branch');
    var datesEl = $('#dates'), timesEl = $('#times'), occEl = $('#occ');
    var out = $('#guests-out'), minus = $('#guests-minus'), plus = $('#guests-plus');
    var msg = $('#msg'), callBtn = $('#call-btn'), copyBtn = $('#copy-btn');

    var dateObj = function (n) { var x = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n); return x; };
    var dateText = function (n) { var x = dateObj(n); return days[x.getDay()] + ' ' + x.getDate() + ' ' + mons[x.getMonth()]; };

    var slots = [];
    for (var h = 12; h <= 22; h++) { slots.push({ h: h, t: ((h + 11) % 12 + 1) + ':00 ' + (h < 12 ? 'AM' : 'PM') }); }

    var mk = function (cls, html, pressed) {
      var b = d.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      b.innerHTML = html; return b;
    };

    var anyOpen = function () { return slots.some(function (s) { return s.h * 60 > now.getHours() * 60 + now.getMinutes() + 30; }); };
    if (!anyOpen()) st.date = 1;
    var buildDates = function () {
      datesEl.textContent = '';
      for (var n = 0; n < 7; n++) {
        (function (n) {
          var x = dateObj(n);
          var top = n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : days[x.getDay()];
          var b = mk('', top + '<small>' + x.getDate() + ' ' + mons[x.getMonth()] + '</small>', n === st.date);
          if (n === 0 && !anyOpen()) b.disabled = true;
          b.addEventListener('click', function () { st.date = n; refresh(); });
          datesEl.appendChild(b);
        })(n);
      }
    };
    var slotOpen = function (s) {
      if (st.date !== 0) return true;
      return s.h * 60 > now.getHours() * 60 + now.getMinutes() + 30;
    };
    var buildTimes = function () {
      timesEl.textContent = '';
      var first = null;
      slots.forEach(function (s) {
        var ok = slotOpen(s);
        if (ok && !first) first = s;
        var b = mk('', s.t, s.t === st.time);
        if (!ok) b.disabled = true;
        b.addEventListener('click', function () { st.time = s.t; refresh(); });
        timesEl.appendChild(b);
      });
      var cur = slots.filter(function (s) { return s.t === st.time; })[0];
      if (cur && !slotOpen(cur) && first) { st.time = first.t; buildTimes(); }
    };
    var occs = ['Birthday', 'Anniversary', 'Family', 'Friends', 'Business'];
    var buildOcc = function () {
      occEl.textContent = '';
      occs.forEach(function (o) {
        var b = mk('', o, st.occ === o);
        b.addEventListener('click', function () { st.occ = st.occ === o ? '' : o; refresh(); });
        occEl.appendChild(b);
      });
    };
    var text = function () {
      var name = st.b.getAttribute('data-name') + ', ' + st.b.getAttribute('data-area');
      var g = st.guests + (st.guests === 1 ? ' guest' : ' guests');
      return 'Hello Steakery ' + name + ', I would like to book a table for ' + g + ' on ' + dateText(st.date) + ' at ' + st.time + '.' +
        (st.occ ? ' Occasion: ' + st.occ + '.' : '') + ' Thank you.';
    };
    var refresh = function () {
      buildDates(); buildTimes(); buildOcc();
      out.textContent = st.guests + (st.guests === 1 ? ' guest' : ' guests');
      minus.disabled = st.guests <= 1; plus.disabled = st.guests >= 12;
      msg.textContent = text();
      callBtn.setAttribute('href', 'tel:' + st.b.getAttribute('data-tel'));
      $('.call-name', callBtn).textContent = st.b.getAttribute('data-name');
    };
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-b') !== tab.getAttribute('data-b'); });
      st.b = tab;
      if (focus) tab.focus();
      refresh();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, j = -1;
        if (k === 'ArrowRight') j = (i + 1) % tabs.length;
        else if (k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') j = 0;
        else if (k === 'End') j = tabs.length - 1;
        if (j > -1) { e.preventDefault(); select(tabs[j], true); }
      });
    });
    minus.addEventListener('click', function () { if (st.guests > 1) { st.guests--; refresh(); } });
    plus.addEventListener('click', function () { if (st.guests < 12) { st.guests++; refresh(); } });

    var copyText = function (t) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
      return new Promise(function (res, rej) {
        var ta = d.createElement('textarea');
        ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        d.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = d.execCommand('copy'); } catch (e) { ok = false; }
        d.body.removeChild(ta);
        ok ? res() : rej();
      });
    };
    copyBtn.addEventListener('click', function () {
      copyText(msg.textContent).then(function () {
        copyBtn.classList.add('is-ok');
        setTimeout(function () { copyBtn.classList.remove('is-ok'); }, 2200);
      }, function () {
        var r = d.createRange(); r.selectNodeContents(msg);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      });
    });
    select(tabs[0], false);
  }

  /* menu page: chips follow the section in view */
  var bar = $('.chipbar ul');
  if (bar) {
    var chips = $$('a', bar);
    var secs = chips.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var current = '';
    var setActive = function (id) {
      if (id === current) return;
      current = id;
      chips.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        if (on && bar.scrollWidth > bar.clientWidth + 2) {
          var left = a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2;
          if (bar.scrollTo) bar.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' }); else bar.scrollLeft = left;
        }
      });
    };
    chips.forEach(function (a) {
      a.addEventListener('click', function () { setActive(a.getAttribute('href').slice(1)); });
    });
    if (hasIO) {
      var sio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
      }, { rootMargin: '-130px 0px -68% 0px' });
      secs.forEach(function (s) { sio.observe(s); });
    }
    if (!current && secs[0]) setActive(secs[0].id);
  }
})();
