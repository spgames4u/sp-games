(function(){
'use strict';

/* ══════════════════════════════════════
   إيموجي سودوكو - ScoreLand Emoji Sudoku
   ══════════════════════════════════════ */

var lang = 'ar';
var sndOn = true;
var ac = null;
var lastSnd = 0;
var wait = true;
var originalAnswer = '';
var gridSize = 0;
var emojis = [];
var playerGrid = [];
var blankCells = [];
var selectedCell = null;
var currentSizes = null;

var T = {
    ar: {
        loading: 'جاري تجهيز اللغز...',
        title: 'إيموجي سودوكو',
        solved: '✅ أحسنت!',
        wrong: '❌ يوجد تكرار!',
        already: 'أجبت من قبل',
        nextQ: 'السؤال التالي...',
        hint: 'اضغط على الفراغ ثم اختر الإيموجي',
        remaining: 'متبقي:',
        check: 'تحقق',
        reset: 'إعادة',
        complete: 'أكملت اللغز!'
    },
    en: {
        loading: 'Preparing puzzle...',
        title: 'Emoji Sudoku',
        solved: '✅ Well done!',
        wrong: '❌ Duplicate found!',
        already: 'Already answered',
        nextQ: 'Next question...',
        hint: 'Tap a blank then pick an emoji',
        remaining: 'Left:',
        check: 'Check',
        reset: 'Reset',
        complete: 'Puzzle complete!'
    }
};

var $ = function(id) { return document.getElementById(id); };
var S0 = $('S0'), S1 = $('S1'), S2 = $('S2');
var qTitle = $('qTitle'), remainLabel = $('remainLabel'), remainCount = $('remainCount');
var hintTxt = $('hintTxt'), gridContainer = $('gridContainer'), picker = $('picker');
var resetBtn = $('resetBtn'), checkBtn = $('checkBtn'), sndBtn = $('sndBtn');
var loadTxt = $('loadTxt');
var resIcon = $('resIcon'), resTitle = $('resTitle'), resCoins = $('resCoins'), resAmt = $('resAmt'), resNext = $('resNext');
var toastBox = $('toastBox'), confettiCv = $('confetti');

/* ══════ التهيئة ══════ */
function init() {
    var p = new URLSearchParams(location.search);
    lang = p.get('lang') || 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    loadTxt.textContent = T[lang].loading;
    qTitle.textContent = T[lang].title;
    remainLabel.textContent = T[lang].remaining;
    hintTxt.textContent = T[lang].hint;
    resetBtn.textContent = '↺ ' + T[lang].reset;
    checkBtn.textContent = '✓ ' + T[lang].check;
    resNext.textContent = T[lang].nextQ;

    sndBtn.onclick = function() {
        sndOn = !sndOn;
        sndBtn.classList.toggle('off', !sndOn);
    };
    resetBtn.onclick = doReset;
    checkBtn.onclick = doCheck;

    window.addEventListener('message', onMsg);
    window.addEventListener('resize', onResize);

    var readyTimer = setInterval(function() { post({ type: 'ready' }); }, 500);
    window.addEventListener('message', function once(e) {
        if (e.data && e.data.type === 'question') {
            clearInterval(readyTimer);
            window.removeEventListener('message', once);
        }
    });
    post({ type: 'ready' });
}

function show(s) {
    S0.classList.remove('on');
    S1.classList.remove('on');
    S2.classList.remove('on');
    s.classList.add('on');
}

function onMsg(e) {
    var d = e.data;
    if (!d || !d.type) return;
    if (d.type === 'question') loadQ(d.data);
    else if (d.type === 'result') showRes(d.isCorrect, d.alreadyAnswered, d.earnedLandCoin);
}

function post(d) {
    if (window.parent !== window) window.parent.postMessage(d, '*');
}

/* ══════ تحميل سؤال ══════ */
function loadQ(d) {
    originalAnswer = d.field4 || '';
    var size = parseInt(d.field2, 10) || 3;
    var blanks = parseInt(d.field3, 10) || 2;
    var rawEmojis = (d.field4 || '').split(/[,،]/).map(function(e) { return e.trim(); }).filter(function(e) { return e.length > 0; });

    while (rawEmojis.length < size) rawEmojis.push('❓');
    emojis = rawEmojis.slice(0, size);

    gridSize = size;
    wait = false;
    selectedCell = null;

    var title = lang === 'ar' ? (d.field1 || T[lang].title) : (d.field1En || d.field1 || T[lang].title);
    qTitle.textContent = title;

    var solution = generateLatinSquare(size, emojis);
    var grid = copyGrid(solution);
    blankCells = removeRandomCells(grid, blanks, size);

    currentSizes = calcSizes(size);

    playerGrid = copyGrid(grid);

    renderGrid(grid, size, currentSizes);
    renderPicker(emojis, currentSizes);

    updateRemaining();
    show(S1);
}

/* ══════ توليد Latin Square ══════ */
function generateLatinSquare(size, emojis) {
    var grid = [];
    var firstRow = emojis.slice();
    shuffleArray(firstRow);
    grid.push(firstRow);

    var r, c, shift, row;
    for (r = 1; r < size; r++) {
        shift = r;
        row = [];
        for (c = 0; c < size; c++) {
            row.push(firstRow[(c + shift) % size]);
        }
        grid.push(row);
    }

    shuffleArray(grid);

    var colOrder = [];
    for (var i = 0; i < size; i++) colOrder.push(i);
    shuffleArray(colOrder);

    var shuffled = [];
    for (r = 0; r < size; r++) {
        row = [];
        for (c = 0; c < size; c++) {
            row.push(grid[r][colOrder[c]]);
        }
        shuffled.push(row);
    }

    return shuffled;
}

function copyGrid(g) {
    var out = [];
    for (var r = 0; r < g.length; r++) {
        out[r] = [];
        for (var c = 0; c < g[r].length; c++) {
            out[r][c] = g[r][c];
        }
    }
    return out;
}

function removeRandomCells(grid, count, size) {
    var cells = [];
    var r, c;
    for (r = 0; r < size; r++) {
        for (c = 0; c < size; c++) {
            cells.push({ r: r, c: c });
        }
    }
    shuffleArray(cells);

    var max = size * size - size;
    if (count > max) count = max;

    var removed = [];
    for (var i = 0; i < count && i < cells.length; i++) {
        removed.push(cells[i]);
        grid[cells[i].r][cells[i].c] = null;
    }
    return removed;
}

function shuffleArray(a) {
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
}

/* ══════ أحجام ديناميكية ══════ */
function calcSizes(size) {
    var available = Math.min(window.innerWidth, 420) - 32;
    var gap = 2;
    var totalGaps = (size - 1) * gap;
    var cellSize = Math.floor((available - totalGaps) / size);

    if (cellSize > 70) cellSize = 70;
    if (cellSize < 30) cellSize = 30;

    var cellFont;
    if (cellSize >= 60) cellFont = '1.8rem';
    else if (cellSize >= 50) cellFont = '1.4rem';
    else if (cellSize >= 42) cellFont = '1.15rem';
    else if (cellSize >= 36) cellFont = '1rem';
    else cellFont = '0.85rem';

    var pickerSize, pickerFont;
    if (size <= 5) {
        pickerSize = 48;
        pickerFont = '1.5rem';
    } else if (size <= 7) {
        pickerSize = 42;
        pickerFont = '1.2rem';
    } else {
        pickerSize = 40;
        pickerFont = '1.1rem';
    }

    var gridGap;
    if (size <= 4) gridGap = 3;
    else if (size <= 6) gridGap = 2;
    else gridGap = 1;

    return {
        cell: cellSize,
        cellFont: cellFont,
        picker: pickerSize,
        pickerFont: pickerFont,
        gridGap: gridGap
    };
}

/* ══════ رسم الشبكة والـ picker ══════ */
function isBlankCell(r, c) {
    for (var i = 0; i < blankCells.length; i++) {
        if (blankCells[i].r === r && blankCells[i].c === c) return true;
    }
    return false;
}

function renderGrid(grid, size, sizes) {
    gridContainer.innerHTML = '';

    var table = document.createElement('div');
    table.className = 'grid';
    table.style.gridTemplateColumns = 'repeat(' + size + ', ' + sizes.cell + 'px)';
    table.style.gridTemplateRows = 'repeat(' + size + ', ' + sizes.cell + 'px)';
    table.style.gap = sizes.gridGap + 'px';

    var r, c, cell, blank;
    for (r = 0; r < size; r++) {
        for (c = 0; c < size; c++) {
            cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.style.fontSize = sizes.cellFont;

            blank = isBlankCell(r, c);
            if (!blank) {
                cell.classList.add('fixed');
                cell.textContent = grid[r][c];
            } else {
                if (grid[r][c]) {
                    cell.classList.add('filled');
                    cell.textContent = grid[r][c];
                } else {
                    cell.classList.add('blank');
                }
                cell.addEventListener('click', onCellClick);
            }

            table.appendChild(cell);
        }
    }

    gridContainer.appendChild(table);
}

function renderPicker(emojis, sizes) {
    picker.innerHTML = '';

    var i, btn;
    for (i = 0; i < emojis.length; i++) {
        btn = document.createElement('div');
        btn.className = 'pick-btn';
        btn.textContent = emojis[i];
        btn.dataset.emoji = emojis[i];
        btn.style.width = sizes.picker + 'px';
        btn.style.height = sizes.picker + 'px';
        btn.style.fontSize = sizes.pickerFont;
        btn.addEventListener('click', onPickClick);
        picker.appendChild(btn);
    }

    var del = document.createElement('div');
    del.className = 'pick-btn pick-delete';
    del.textContent = '✕';
    del.style.width = sizes.picker + 'px';
    del.style.height = sizes.picker + 'px';
    del.style.fontSize = sizes.pickerFont;
    del.addEventListener('click', onDeleteClick);
    picker.appendChild(del);
}

/* ══════ التفاعل ══════ */
function onCellClick(e) {
    if (wait) return;
    initAC();
    var r = parseInt(e.target.dataset.r, 10);
    var c = parseInt(e.target.dataset.c, 10);

    var prev = document.querySelector('.cell.selected');
    if (prev) prev.classList.remove('selected');

    e.target.classList.add('selected');
    selectedCell = { r: r, c: c };
    snd('sel');
}

function onPickClick(e) {
    if (wait || !selectedCell) {
        showToast(T[lang].hint, 'info');
        return;
    }
    initAC();
    var emoji = e.target.dataset.emoji;
    var cell = document.querySelector('.cell[data-r="' + selectedCell.r + '"][data-c="' + selectedCell.c + '"]');
    if (!cell || cell.classList.contains('fixed')) return;

    cell.textContent = emoji;
    cell.classList.remove('blank', 'error');
    cell.classList.add('filled');
    playerGrid[selectedCell.r][selectedCell.c] = emoji;
    snd('sel');

    updateRemaining();

    var remaining = countBlanks();
    if (remaining === 0) {
        setTimeout(function() { doCheck(); }, 300);
    }
}

function onDeleteClick() {
    if (wait || !selectedCell) return;
    var cell = document.querySelector('.cell[data-r="' + selectedCell.r + '"][data-c="' + selectedCell.c + '"]');
    if (!cell || cell.classList.contains('fixed')) return;

    cell.textContent = '';
    cell.classList.remove('filled', 'error');
    cell.classList.add('blank');
    playerGrid[selectedCell.r][selectedCell.c] = null;
    snd('sel');
    updateRemaining();
}

function doCheck() {
    var result = validateGrid(playerGrid, gridSize);

    if (result.incomplete) {
        showToast(T[lang].hint, 'info');
        return;
    }

    if (result.valid) {
        wait = true;
        snd('ok');

        var cells = document.querySelectorAll('.cell.filled');
        var i;
        for (i = 0; i < cells.length; i++) {
            cells[i].classList.add('correct');
        }

        showToast(T[lang].complete, 'success');
        fireConfetti();

        setTimeout(function() {
            post({ type: 'answer', answer: originalAnswer });
        }, 800);
    } else {
        snd('no');

        var allCells = document.querySelectorAll('.cell.error');
        for (var i = 0; i < allCells.length; i++) {
            allCells[i].classList.remove('error');
        }

        for (i = 0; i < result.errors.length; i++) {
            var err = result.errors[i];
            var errCell = document.querySelector('.cell[data-r="' + err.r + '"][data-c="' + err.c + '"]');
            if (errCell && !errCell.classList.contains('fixed')) {
                errCell.classList.add('error');
            }
        }

        showToast(T[lang].wrong, 'error');
    }
}

function doReset() {
    if (wait) return;
    var i, b, cell;
    for (i = 0; i < blankCells.length; i++) {
        b = blankCells[i];
        cell = document.querySelector('.cell[data-r="' + b.r + '"][data-c="' + b.c + '"]');
        if (cell) {
            cell.textContent = '';
            cell.className = 'cell blank';
            cell.style.fontSize = currentSizes.cellFont;
        }
        playerGrid[b.r][b.c] = null;
    }
    selectedCell = null;
    var prev = document.querySelector('.cell.selected');
    if (prev) prev.classList.remove('selected');
    updateRemaining();
}

/* ══════ التحقق ══════ */
function validateGrid(grid, size) {
    var errors = [];
    var r, c, v, cc, rr, seen;

    for (r = 0; r < size; r++) {
        seen = {};
        for (c = 0; c < size; c++) {
            v = grid[r][c];
            if (!v) return { valid: false, errors: [], incomplete: true };
            if (seen[v]) {
                errors.push({ r: r, c: c, type: 'row' });
                for (cc = 0; cc < c; cc++) {
                    if (grid[r][cc] === v) errors.push({ r: r, c: cc, type: 'row' });
                }
            }
            seen[v] = true;
        }
    }

    for (c = 0; c < size; c++) {
        seen = {};
        for (r = 0; r < size; r++) {
            v = grid[r][c];
            if (!v) return { valid: false, errors: [], incomplete: true };
            if (seen[v]) {
                errors.push({ r: r, c: c, type: 'col' });
                for (rr = 0; rr < r; rr++) {
                    if (grid[rr][c] === v) errors.push({ r: rr, c: c, type: 'col' });
                }
            }
            seen[v] = true;
        }
    }

    return { valid: errors.length === 0, errors: errors, incomplete: false };
}

function countBlanks() {
    var cnt = 0;
    for (var i = 0; i < blankCells.length; i++) {
        var b = blankCells[i];
        if (playerGrid[b.r][b.c] === null) cnt++;
    }
    return cnt;
}

function updateRemaining() {
    remainCount.textContent = String(countBlanks());
}

/* ══════ Resize ══════ */
function onResize() {
    if (wait || !gridSize) return;
    var newSizes = calcSizes(gridSize);
    currentSizes = newSizes;

    var grid = [];
    var r, c;
    for (r = 0; r < gridSize; r++) {
        grid[r] = [];
        for (c = 0; c < gridSize; c++) {
            grid[r][c] = playerGrid[r][c];
        }
    }

    renderGrid(grid, gridSize, newSizes);
    renderPicker(emojis, newSizes);

    if (selectedCell) {
        var sel = document.querySelector('.cell[data-r="' + selectedCell.r + '"][data-c="' + selectedCell.c + '"]');
        if (sel) sel.classList.add('selected');
    }

    updateRemaining();
}

/* ══════ Toast ══════ */
function showToast(msg, type) {
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = msg;
    toastBox.innerHTML = '';
    toastBox.appendChild(t);
    setTimeout(function() {
        if (t.parentNode) t.parentNode.removeChild(t);
    }, 2200);
}

/* ══════ Confetti ══════ */
function fireConfetti() {
    var cv = confettiCv;
    if (!cv) return;
    cv.style.display = 'block';
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    var ctx = cv.getContext('2d');
    var particles = [];
    var i, p;
    for (i = 0; i < 80; i++) {
        p = {
            x: cv.width / 2,
            y: cv.height / 2,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12 - 4,
            color: ['#d4a930', '#22c55e', '#ef4444', '#3b82f6', '#a855f7'][Math.floor(Math.random() * 5)],
            size: 4 + Math.random() * 6,
            life: 1
        };
        particles.push(p);
    }

    var last = Date.now();
    function loop() {
        var now = Date.now();
        var dt = (now - last) / 1000;
        last = now;

        ctx.clearRect(0, 0, cv.width, cv.height);

        var any = false;
        for (i = 0; i < particles.length; i++) {
            p = particles[i];
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vy += 120 * dt;
            p.life -= dt * 0.8;
            if (p.life > 0) {
                any = true;
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        }
        ctx.globalAlpha = 1;

        if (any) requestAnimationFrame(loop);
        else cv.style.display = 'none';
    }
    requestAnimationFrame(loop);
}

/* ══════ النتيجة S2 ══════ */
function showRes(isCorrect, alreadyAnswered, earnedLandCoin) {
    var txt = alreadyAnswered ? T[lang].already : (isCorrect ? T[lang].solved : T[lang].wrong);
    resIcon.textContent = isCorrect ? '✓' : '✗';
    resIcon.className = 'result-icon ' + (isCorrect ? 'ok' : 'no');
    resTitle.textContent = txt;
    resTitle.className = 'result-title ' + (isCorrect ? 'ok' : 'no');

    var glow = document.querySelector('.result-glow');
    if (glow) glow.style.background = isCorrect ? '#22c55e' : '#ef4444';

    if (isCorrect && !alreadyAnswered && typeof earnedLandCoin === 'number') {
        resAmt.textContent = '+' + earnedLandCoin;
        resCoins.classList.remove('hidden');
    } else {
        resCoins.classList.add('hidden');
    }

    show(S2);
}

/* ══════ صوت ══════ */
function initAC() {
    if (ac) return;
    try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
}

function snd(type) {
    if (!sndOn || !ac) return;
    try {
        if (ac.state === 'suspended') ac.resume();
        if (type === 'sel') {
            var n = Date.now();
            if (n - lastSnd < 120) return;
            lastSnd = n;
            bip(500, 'sine', 0.03, 0.04);
        } else if (type === 'ok') {
            bip(523, 'sine', 0.05, 0.1, 0);
            bip(659, 'sine', 0.05, 0.1, 0.1);
            bip(784, 'sine', 0.05, 0.12, 0.2);
            bip(1047, 'sine', 0.04, 0.15, 0.3);
        } else if (type === 'no') {
            bip(200, 'sawtooth', 0.03, 0.12);
            bip(180, 'sawtooth', 0.03, 0.12, 0.12);
        }
    } catch (e) {}
}

function bip(f, tp, v, dur, dl) {
    dl = dl || 0;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.type = tp;
    o.frequency.value = f;
    var t = ac.currentTime + dl;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur);
    o.onended = function() {
        g.disconnect();
        o.disconnect();
    };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
