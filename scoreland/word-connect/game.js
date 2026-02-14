(function () {
    'use strict';

    /* ── ثوابت ── */
    var DIR = [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: -1, c: 1 }];
    var AR = 'ابتثجحخدذرزسشصضطظعغفقكلمنهويى';
    var EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var MAX_TRY = 200;
    var SND_CD = 160;

    /* ── حالة ── */
    var lang = 'ar', gs = 6, gd = [], curQ = null, tw = [];
    var disc = [], sel = [], drag = false, wait = true;
    var sndOn = true, ac = null, lastSnd = 0;

    /* ── DOM ── */
    var $ = function (id) { return document.getElementById(id); };
    var S0 = $('S0'), S1 = $('S1'), S2 = $('S2');
    var qT = $('qTitle'), ctr = $('ctr'), grid = $('grid'), svg = $('svg');
    var fnd = $('words'), board = $('board'), sBtn = $('sndBtn');
    var rI = $('resIcon'), rT = $('resTitle'), rC = $('resCoins');
    var rE = $('resAmt'), rN = $('resNext');

    /* ── تهيئة ── */
    function init() {
        var p = new URLSearchParams(location.search);
        lang = p.get('lang') || 'ar';
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        if (lang !== 'ar') {
            $('loadTxt').textContent = 'Loading...';
            rN.textContent = 'Next question...';
        }
        sBtn.onclick = function () {
            sndOn = !sndOn;
            sBtn.textContent = sndOn ? '🔊' : '🔇';
        };
        window.addEventListener('message', onMsg);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd, { passive: false });
        document.addEventListener('touchmove', onTM, { passive: false });
        window.addEventListener('resize', function () { if (curQ && !wait) posSVG(); });
        post({ type: 'ready' });
    }

    /* ── شاشات ── */
    function show(s) {
        S0.classList.remove('on');
        S1.classList.remove('on');
        S2.classList.remove('on');
        s.classList.add('on');
    }

    /* ── رسائل ── */
    function onMsg(e) {
        var d = e.data;
        if (!d || !d.type) return;
        if (d.type === 'question') loadQ(d.data);
        else if (d.type === 'result') showRes(d.isCorrect, d.alreadyAnswered, d.earnedLandCoin);
    }
    function post(d) { if (window.parent !== window) window.parent.postMessage(d, '*'); }

    /* ── تحميل سؤال ── */
    function loadQ(d) {
        curQ = d; wait = false; disc = []; sel = [];
        tw = (d.field2 || '').split(/[،,]/).map(function (w) { return w.trim(); }).filter(function (w) { return w.length > 0; });
        gs = calcGS(tw);
        qT.textContent = d.field1 || '';
        updCtr();
        fnd.innerHTML = '';
        if (!buildGrid()) { loadQ(d); return; }
        show(S1);
        requestAnimationFrame(posSVG);
    }

    function calcGS(w) {
        if (!w.length) return 6;
        var mx = 0, tot = 0;
        for (var i = 0; i < w.length; i++) {
            if (w[i].length > mx) mx = w[i].length;
            tot += w[i].length;
        }
        return Math.min(Math.max(mx, Math.ceil(Math.sqrt(tot * 2.8)), 5), 8);
    }

    function updCtr() {
        var label = lang === 'ar' ? 'الكلمات المكتشفة' : 'Words found';
        ctr.textContent = '(' + disc.length + '/' + tw.length + ')';
        qT.title = label;
    }

    /* ── بناء الشبكة ── */
    function buildGrid() {
        var ch = lang === 'ar' ? AR : EN;
        gd = [];
        var r, c;
        for (r = 0; r < gs; r++) { gd[r] = []; for (c = 0; c < gs; c++) gd[r][c] = null; }
        var sorted = tw.slice().sort(function (a, b) { return b.length - a.length; });
        for (var i = 0; i < sorted.length; i++) if (!placeWord(sorted[i])) return false;
        for (r = 0; r < gs; r++) for (c = 0; c < gs; c++) if (gd[r][c] === null) gd[r][c] = ch[Math.floor(Math.random() * ch.length)];
        render();
        return true;
    }

    function placeWord(w) {
        for (var t = 0; t < MAX_TRY; t++) {
            var d = DIR[Math.floor(Math.random() * DIR.length)];
            var mnR = d.r < 0 ? w.length - 1 : 0, mxR = d.r > 0 ? gs - w.length : gs - 1;
            var mnC = d.c < 0 ? w.length - 1 : 0, mxC = d.c > 0 ? gs - w.length : gs - 1;
            if (mnR > mxR || mnC > mxC) continue;
            var sr = mnR + Math.floor(Math.random() * (mxR - mnR + 1));
            var sc = mnC + Math.floor(Math.random() * (mxC - mnC + 1));
            var ok = true, i;
            for (i = 0; i < w.length; i++) {
                var rr = sr + d.r * i, cc = sc + d.c * i;
                if (rr < 0 || rr >= gs || cc < 0 || cc >= gs || gd[rr][cc] !== null) { ok = false; break; }
            }
            if (!ok) continue;
            for (i = 0; i < w.length; i++) gd[sr + d.r * i][sc + d.c * i] = w[i];
            return true;
        }
        return false;
    }

    /* ── رسم ── */
    function render() {
        grid.innerHTML = '';
        svg.innerHTML = '';

        var aw = board.clientWidth - 10, ah = board.clientHeight - 10;
        var mx = Math.min(aw, ah, 380);
        if (mx < 150) mx = Math.min(window.innerWidth - 24, 320);

        var pad = 20, gap = 5;
        var cpx = Math.floor((mx - pad * 2 - gap * (gs - 1)) / gs);
        cpx = Math.max(cpx, 32);
        cpx = Math.min(cpx, 54);
        var total = cpx * gs + gap * (gs - 1) + pad * 2;
        var fs = Math.max(cpx * 0.42, 14);

        grid.style.gridTemplateColumns = 'repeat(' + gs + ',' + cpx + 'px)';
        grid.style.gridTemplateRows = 'repeat(' + gs + ',' + cpx + 'px)';
        grid.style.width = total + 'px';
        grid.style.gap = gap + 'px';
        grid.style.padding = pad / 2 + 'px';

        for (var r = 0; r < gs; r++) {
            for (var c = 0; c < gs; c++) {
                var el = document.createElement('div');
                el.className = 'c';
                el.textContent = gd[r][c];
                el.dataset.r = r;
                el.dataset.c = c;
                el.style.fontSize = fs + 'px';
                el.addEventListener('mousedown', mkDn(r, c));
                el.addEventListener('mouseenter', mkEn(r, c));
                el.addEventListener('touchstart', mkDn(r, c), { passive: false });
                grid.appendChild(el);
            }
        }
    }

    function posSVG() {
        var gR = grid.getBoundingClientRect();
        var bR = board.getBoundingClientRect();
        svg.style.width = gR.width + 'px';
        svg.style.height = gR.height + 'px';
        svg.style.left = (gR.left - bR.left) + 'px';
        svg.style.top = (gR.top - bR.top) + 'px';
        svg.setAttribute('width', Math.round(gR.width));
        svg.setAttribute('height', Math.round(gR.height));
        svg.setAttribute('viewBox', '0 0 ' + Math.round(gR.width) + ' ' + Math.round(gR.height));
    }

    /* ── تفاعل ── */
    function mkDn(r, c) {
        return function (e) {
            e.preventDefault();
            if (wait) return;
            var el = getC(r, c);
            if (!el || el.classList.contains('done')) return;
            initAC();
            drag = true;
            sel = [{ r: r, c: c, el: el }];
            el.classList.add('sel');
            snd('sel');
            drawL();
        };
    }
    function mkEn(r, c) { return function () { if (drag) addC(r, c); }; }

    function addC(r, c) {
        var el = getC(r, c);
        if (!el || el.classList.contains('done')) return;
        var L = sel[sel.length - 1];
        if (Math.abs(r - L.r) > 1 || Math.abs(c - L.c) > 1 || (r === L.r && c === L.c)) return;
        for (var i = 0; i < sel.length; i++) if (sel[i].r === r && sel[i].c === c) return;
        sel.push({ r: r, c: c, el: el });
        el.classList.add('sel');
        snd('sel');
        drawL();
    }

    function onTM(e) {
        if (!drag || !e.touches) return;
        e.preventDefault();
        var t = e.touches[0], el = document.elementFromPoint(t.clientX, t.clientY);
        if (!el) return;
        var cl = el.closest('.c');
        if (!cl || cl.classList.contains('done')) return;
        addC(+cl.dataset.r, +cl.dataset.c);
    }

    function onEnd(e) {
        if (!drag) return;
        if (e) e.preventDefault();
        drag = false;

        if (sel.length > 0) {
            var w = '', i;
            for (i = 0; i < sel.length; i++) w += sel[i].el.textContent;
            var wr = w.split('').reverse().join('');

            var matched = null;
            for (i = 0; i < tw.length; i++) {
                var x = tw[i].trim();
                if (x === w || x === wr || arEq(x, w) || arEq(x, wr)) { matched = x; break; }
            }

            var dup = false;
            if (matched) for (i = 0; i < disc.length; i++) if (disc[i] === matched || arEq(disc[i], matched)) { dup = true; break; }

            if (matched && !dup) {
                disc.push(matched);
                for (i = 0; i < sel.length; i++) { sel[i].el.classList.remove('sel'); sel[i].el.classList.add('done'); }
                snd('ok');
                updCtr();
                addTag(matched);
                if (disc.length >= tw.length) {
                    wait = true;
                    var sep = lang === 'ar' ? '، ' : ', ';
                    post({ type: 'answer', answer: tw.join(sep) });
                }
            } else {
                for (i = 0; i < sel.length; i++) sel[i].el.classList.remove('sel');
                if (sel.length > 1) snd('no');
            }
        }
        sel = [];
        drawL();
    }

    function arEq(a, b) { return a.replace(/\s/g, '') === b.replace(/\s/g, ''); }
    function getC(r, c) { return grid.querySelector('[data-r="' + r + '"][data-c="' + c + '"]'); }

    /* ── خطوط ── */
    function drawL() {
        svg.innerHTML = '';
        if (sel.length < 2) return;
        var gR = grid.getBoundingClientRect();
        for (var i = 0; i < sel.length - 1; i++) {
            var a = sel[i].el.getBoundingClientRect(), b = sel[i + 1].el.getBoundingClientRect();
            var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            ln.setAttribute('x1', a.left + a.width / 2 - gR.left);
            ln.setAttribute('y1', a.top + a.height / 2 - gR.top);
            ln.setAttribute('x2', b.left + b.width / 2 - gR.left);
            ln.setAttribute('y2', b.top + b.height / 2 - gR.top);
            ln.setAttribute('stroke', '#c9a227');
            ln.setAttribute('stroke-width', '3');
            ln.setAttribute('stroke-linecap', 'round');
            ln.setAttribute('opacity', '0.55');
            svg.appendChild(ln);
        }
    }

    function addTag(w) {
        var t = document.createElement('span');
        t.className = 'tag';
        t.textContent = w;
        fnd.appendChild(t);
    }

    /* ── النتيجة ── */
    function showRes(ok, dup, coins) {
        var txt = lang === 'ar'
            ? { y: 'أحسنت!', n: 'للأسف!', d: 'أجبت من قبل' }
            : { y: 'Well done!', n: 'Sorry!', d: 'Already answered' };
        rI.textContent = ok ? '✓' : '✗';
        rI.className = 'res-icon ' + (ok ? 'ok' : 'no');
        rT.textContent = dup ? txt.d : (ok ? txt.y : txt.n);
        rT.className = 'res-title ' + (ok ? 'ok' : 'no');
        if (ok && !dup && typeof coins === 'number') {
            rE.textContent = '+' + coins;
            rC.classList.remove('hidden');
        } else {
            rC.classList.add('hidden');
        }
        show(S2);
    }

    /* ── صوت ── */
    function initAC() { if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
    function snd(type) {
        if (!sndOn || !ac) return;
        try {
            if (ac.state === 'suspended') ac.resume();
            if (type === 'sel') {
                var n = Date.now(); if (n - lastSnd < SND_CD) return; lastSnd = n;
                bip(600, 'sine', 0.04, 0.035);
            } else if (type === 'ok') {
                bip(523, 'sine', 0.05, 0.09, 0);
                bip(659, 'sine', 0.05, 0.09, 0.11);
                bip(784, 'sine', 0.05, 0.09, 0.22);
            } else if (type === 'no') {
                bip(200, 'sawtooth', 0.04, 0.1);
            }
        } catch (e) { }
    }
    function bip(f, tp, v, dur, dl) {
        dl = dl || 0;
        var o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = tp; o.frequency.value = f;
        var t = ac.currentTime + dl;
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.start(t); o.stop(t + dur);
        o.onended = function () { g.disconnect(); o.disconnect(); };
    }

    /* ── تشغيل ── */
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
