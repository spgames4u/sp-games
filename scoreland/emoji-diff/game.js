(function(){
'use strict';

/* ══════════════════════════════════════
   الإيموجي المختلف - Spot the Difference
   ScoreLand Game v1
   ══════════════════════════════════════ */

var lang = 'ar', sndOn = true, ac = null;
var wait = true, curQ = null, originalAnswer = '';

/* بيانات اللعبة */
var emoji = '';
var gridSize = 4;
var shuffleMode = false, shuffleSeconds = 3, shuffleTimer = null;
var maxWrong = 3;
var diffs = [];       /* [{type:'skew'}, {type:'brightness'}] */
var totalDiff = 0;
var foundCount = 0;
var wrongCount = 0;

/* خلايا الشبكة */
var cells = [];       /* DOM elements */
var cellData = [];    /* {isDiff, diffType, found} */
var positions = [];   /* maps cellIndex → positionIndex */

var GAP = 5;
var MAX_CELL = 72;

var $ = function(id) { return document.getElementById(id) };
var S0 = $('S0'), S1 = $('S1'), S2 = $('S2');
var qT = $('qTitle'), ctr = $('ctr');
var rI = $('resIcon'), rT = $('resTitle'), rC = $('resCoins'), rE = $('resAmt'), rN = $('resNext');
var gridContainer = $('gridContainer');

/* ══════ النصوص ══════ */
var T = {
    ar: {
        loading: 'جاري التحميل...',
        correct: 'أحسنت! 🎉',
        wrong: 'حاول مرة أخرى',
        already: 'أجبت من قبل',
        nextQ: 'السؤال التالي...',
        hint1: '🔍 اضغط على الإيموجي المختلف',
        hintN: '🔍 اضغط على الإيموجيات المختلفة',
        found: 'أحسنت! 🎯',
        wrongTap: 'ليس هذا! ❌',
        gameOver: 'انتهت المحاولات! 💔'
    },
    en: {
        loading: 'Loading...',
        correct: 'Well done! 🎉',
        wrong: 'Try again',
        already: 'Already answered',
        nextQ: 'Next question...',
        hint1: '🔍 Tap the different emoji',
        hintN: '🔍 Tap the different emojis',
        found: 'Nice! 🎯',
        wrongTap: 'Not this one! ❌',
        gameOver: 'No more tries! 💔'
    }
};

/* ══════ التهيئة ══════ */
function init() {
    var p = new URLSearchParams(location.search);
    lang = p.get('lang') || 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    applyLang();

    $('sndBtn').onclick = function() { sndOn = !sndOn; $('sndBtn').classList.toggle('off', !sndOn); };
    window.addEventListener('message', onMsg);
    window.addEventListener('resize', onResize);

    var readyTimer = setInterval(function() { post({type: 'ready'}); }, 500);
    window.addEventListener('message', function once(e) {
        if (e.data && e.data.type === 'question') {
            clearInterval(readyTimer);
            window.removeEventListener('message', once);
        }
    });
    post({type: 'ready'});
}

function applyLang() {
    var t = T[lang];
    $('loadTxt').textContent = t.loading;
    $('resNext').textContent = t.nextQ;
}

function show(s) { S0.classList.remove('on'); S1.classList.remove('on'); S2.classList.remove('on'); s.classList.add('on'); }
function onMsg(e) { var d = e.data; if (!d || !d.type) return; if (d.type === 'question') loadQ(d.data); else if (d.type === 'result') showRes(d.isCorrect, d.alreadyAnswered, d.earnedLandCoin); }
function post(d) { if (window.parent !== window) window.parent.postMessage(d, '*'); }

/* ══════ تحميل سؤال ══════ */
function loadQ(d) {
    curQ = d;
    wait = false;
    foundCount = 0;
    wrongCount = 0;
    stopShuffle();

    /* حفظ الإجابة الأصلية */
    originalAnswer = d.field5 || '';

    /* العنوان */
    var title = lang === 'ar' ? d.field1 : (d.field1En || d.field1);
    qT.textContent = title || '';

    /* الإيموجي */
    emoji = (lang === 'ar' ? d.field2 : (d.field2En || d.field2)) || '🍎';

    /* حجم الشبكة */
    gridSize = parseInt(lang === 'ar' ? d.field3 : (d.field3En || d.field3)) || 4;
    gridSize = Math.max(3, Math.min(8, gridSize));

    /* التحريك */
    var f4 = (lang === 'ar' ? d.field4 : (d.field4En || d.field4)) || 'static';
    parseShuffle(f4);

    /* الاختلافات */
    var f5 = (lang === 'ar' ? d.field5 : (d.field5En || d.field5)) || '1rotate';
    diffs = parseDiffs(f5);
    totalDiff = diffs.length;

    /* المحاولات الخاطئة */
    maxWrong = parseInt(lang === 'ar' ? d.field6 : (d.field6En || d.field6)) || 3;

    /* بناء الشبكة */
    buildGrid();
    renderLives();
    updateCounter();
    updateHint();
    show(S1);

    /* تفعيل التحريك */
    if (shuffleMode) {
        shuffleTimer = setInterval(function() {
            if (!wait) shuffleGrid();
        }, shuffleSeconds * 1000);
    }
}

/* ══════ تحليل التحريك ══════ */
function parseShuffle(val) {
    val = val.trim().toLowerCase();
    if (val === 'static' || val === '') {
        shuffleMode = false;
        shuffleSeconds = 3;
    } else {
        /* shuffle-3 أو shuffle-2.5 */
        var parts = val.split('-');
        shuffleMode = (parts[0] === 'shuffle');
        shuffleSeconds = parseFloat(parts[1]) || 3;
        shuffleSeconds = Math.max(0.5, shuffleSeconds);
    }
}

/* ══════ تحليل الاختلافات ══════ */
function parseDiffs(str) {
    var result = [];
    var parts = str.split(',');
    for (var i = 0; i < parts.length; i++) {
        var p = parts[i].trim();
        if (!p) continue;
        var count = parseInt(p) || 1;
        var type = p.replace(/^\d+/, '').trim();
        if (!type) type = 'rotate';
        for (var j = 0; j < count; j++) {
            result.push(type);
        }
    }
    return result;
}

/* ══════ بناء الشبكة ══════ */
function buildGrid() {
    gridContainer.innerHTML = '';
    cells = [];
    cellData = [];
    positions = [];

    var total = gridSize * gridSize;

    /* تحديد مواقع الاختلافات عشوائياً */
    var diffPositions = [];
    var maxDiff = Math.min(diffs.length, total - 1);
    while (diffPositions.length < maxDiff) {
        var r = Math.floor(Math.random() * total);
        if (diffPositions.indexOf(r) === -1) {
            diffPositions.push(r);
        }
    }

    /* إنشاء بيانات الخلايا */
    for (var i = 0; i < total; i++) {
        var diffIdx = diffPositions.indexOf(i);
        cellData.push({
            isDiff: diffIdx !== -1,
            diffType: diffIdx !== -1 ? diffs[diffIdx] : '',
            found: false
        });
        positions.push(i);
    }

    /* إنشاء عناصر DOM */
    for (var j = 0; j < total; j++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.setAttribute('data-idx', j);

        /* إضافة كلاس الاختلاف */
        if (cellData[j].isDiff) {
            cell.classList.add('diff-' + cellData[j].diffType);
        }

        var span = document.createElement('span');
        span.textContent = emoji;
        cell.appendChild(span);

        cell.addEventListener('click', onCellClick);
        cell.addEventListener('touchstart', onCellTouch, {passive: true});

        gridContainer.appendChild(cell);
        cells.push(cell);
    }

    positionCells();
    /* إعادة حساب بعد رسم الـ layout */
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            positionCells();
        });
    });
}

/* ══════ تحديد مواقع الخلايا ══════ */
function positionCells() {
    var areaEl = document.querySelector('.grid-area');
    if (!areaEl) return;

    var availW = areaEl.clientWidth - 16;
    var availH = areaEl.clientHeight - 16;

    /* على سطح المكتب: لا نحد العرض كثير */
    var maxW = window.innerWidth > 500 ? 420 : 380;
    if (availW > maxW) availW = maxW;

    /* حساب حجم الخلية */
    var cellFromW = Math.floor((availW - (gridSize - 1) * GAP) / gridSize);
    var cellFromH = Math.floor((availH - (gridSize - 1) * GAP) / gridSize);
    var cellSize = Math.min(cellFromW, cellFromH, MAX_CELL);
    cellSize = Math.max(cellSize, 28);

    var totalW = cellSize * gridSize + GAP * (gridSize - 1);
    var totalH = totalW;

    gridContainer.style.width = totalW + 'px';
    gridContainer.style.height = totalH + 'px';

    var fontSize = Math.max(Math.floor(cellSize * 0.55), 14);

    for (var i = 0; i < cells.length; i++) {
        var pos = positions[i];
        var row = Math.floor(pos / gridSize);
        var col = pos % gridSize;

        cells[i].style.width = cellSize + 'px';
        cells[i].style.height = cellSize + 'px';
        cells[i].style.left = (col * (cellSize + GAP)) + 'px';
        cells[i].style.top = (row * (cellSize + GAP)) + 'px';
        cells[i].style.fontSize = fontSize + 'px';
    }
}

/* ══════ التحريك (Shuffle) ══════ */
function shuffleGrid() {
    /* Fisher-Yates shuffle على المواقع */
    var arr = positions.slice();
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    positions = arr;
    positionCells();
    snd('shuffle');
}

function stopShuffle() {
    if (shuffleTimer) {
        clearInterval(shuffleTimer);
        shuffleTimer = null;
    }
}

/* ══════ النقر على خلية ══════ */
function onCellTouch(e) { initAC(); }

function onCellClick(e) {
    if (wait) return;
    initAC();

    var cell = e.currentTarget;
    var idx = parseInt(cell.getAttribute('data-idx'));
    var data = cellData[idx];

    if (data.found) return;

    if (data.isDiff) {
        /* صح! */
        data.found = true;
        foundCount++;
        cell.classList.add('found');
        snd('ok');
        updateCounter();

        if (foundCount >= totalDiff) {
            /* فاز! */
            wait = true;
            stopShuffle();
            showToast(T[lang].correct, 'success');
            setTimeout(function() {
                post({ type: 'answer', answer: originalAnswer });
            }, 700);
        } else {
            showToast(T[lang].found, 'success');
        }
    } else {
        /* خطأ! */
        wrongCount++;
        cell.classList.add('wrong-tap');
        snd('no');
        renderLives();

        setTimeout(function() {
            cell.classList.remove('wrong-tap');
        }, 400);

        if (wrongCount >= maxWrong) {
            /* خسر! */
            wait = true;
            stopShuffle();
            disableAllCells();
            showToast(T[lang].gameOver, 'error');
            revealDiffs();
            setTimeout(function() {
                post({ type: 'answer', answer: '' });
            }, 1500);
        } else {
            showToast(T[lang].wrongTap, 'error');
        }
    }
}

/* ══════ كشف الاختلافات عند الخسارة ══════ */
function revealDiffs() {
    for (var i = 0; i < cellData.length; i++) {
        if (cellData[i].isDiff && !cellData[i].found) {
            cells[i].style.borderColor = 'var(--danger)';
            cells[i].style.background = 'rgba(239,68,68,.12)';
            cells[i].style.boxShadow = '0 0 8px rgba(239,68,68,.3)';
        }
    }
}

function disableAllCells() {
    for (var i = 0; i < cells.length; i++) {
        cells[i].classList.add('disabled');
    }
}

/* ══════ القلوب ══════ */
function renderLives() {
    var html = '';
    for (var i = 0; i < maxWrong; i++) {
        if (i < maxWrong - wrongCount) {
            html += '<span class="life">❤️</span>';
        } else {
            html += '<span class="life lost">❤️</span>';
        }
    }
    $('lives').innerHTML = html;
}

/* ══════ العداد ══════ */
function updateCounter() {
    ctr.textContent = foundCount + '/' + totalDiff;
}

function updateHint() {
    var t = T[lang];
    $('hintText').textContent = totalDiff > 1 ? t.hintN : t.hint1;
}

/* ══════ Resize ══════ */
function onResize() {
    if (!cells.length) return;
    positionCells();
}

/* ══════ Toast ══════ */
var toastTimer = null;
function showToast(msg, type) {
    var box = $('toastBox');
    box.innerHTML = '<div class="toast ' + (type || '') + '">' + msg + '</div>';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { box.innerHTML = ''; }, 1400);
}

/* ══════ النتيجة ══════ */
function showRes(ok, dup, coins) {
    var t = T[lang];
    rI.textContent = ok ? '✓' : '✗';
    rI.className = 'result-icon ' + (ok ? 'ok' : 'no');
    rT.textContent = dup ? t.already : (ok ? t.correct : t.wrong);
    rT.className = 'result-title ' + (ok ? 'ok' : 'no');
    var glow = document.querySelector('.result-glow');
    if (glow) glow.style.background = ok ? '#22c55e' : '#ef4444';
    if (ok && !dup && typeof coins === 'number') {
        rE.textContent = '+' + coins;
        rC.classList.remove('hidden');
    } else {
        rC.classList.add('hidden');
    }
    show(S2);
}

/* ══════ صوت (Web Audio API) ══════ */
function initAC() { if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
function bip(f, tp, v, dur, dl) {
    dl = dl || 0;
    var o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = tp; o.frequency.value = f;
    var t = ac.currentTime + dl;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur);
    o.onended = function() { g.disconnect(); o.disconnect(); };
}
function snd(type) {
    if (!sndOn || !ac) return;
    try {
        if (ac.state === 'suspended') ac.resume();
        if (type === 'ok') {
            bip(523, 'sine', 0.04, 0.08, 0);
            bip(659, 'sine', 0.04, 0.08, 0.08);
            bip(784, 'sine', 0.04, 0.1, 0.16);
        } else if (type === 'no') {
            bip(200, 'sawtooth', 0.03, 0.1);
            bip(160, 'sawtooth', 0.03, 0.1, 0.1);
        } else if (type === 'shuffle') {
            bip(400, 'sine', 0.015, 0.06);
            bip(500, 'sine', 0.015, 0.06, 0.06);
        }
    } catch(e) {}
}

/* ══════ Start ══════ */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
