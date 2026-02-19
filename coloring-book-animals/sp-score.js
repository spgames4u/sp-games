/**
 * sp-score.js - Score Bridge for sp.games
 * v6.0 - Game Integration Module
 */

(function() {
    'use strict';

    const params = new URLSearchParams(location.search);
    function getGameSlug() {
        if (params.get('gameSlug')) return params.get('gameSlug');
        const parts = location.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || 'coloring-book-animals';
    }

    const guardKey = '__SP_SCORE_RUNNING_' + getGameSlug();
    if (window[guardKey]) return;
    window[guardKey] = true;

    const _origEval = window.eval;
    window.eval = function(x) {
        if (typeof x === 'string' && x.indexOf('parent.__ctlArcadeSaveScore') !== -1) {
            x = x.replace(/parent\.__ctlArcadeSaveScore/g, 'window.__ctlArcadeSaveScore');
        }
        return _origEval.call(this, x);
    };

    var _host = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:4000' : 'https://new.sp.games';
    const CONFIG = {
        apiUrl: _host + '/api/games/save-score',
        nonceUrl: _host + '/api/games/nonce',
        myScoreUrl: _host + '/api/games/',
        gameSlug: getGameSlug(),
        minScore: 1,
        cooldownMs: 60000,
        engagementMs: 60000,
        scorePerBlock: 100,
        additive: true,
        drawZoneXMin: 0.15,
        drawZoneXMax: 0.85,
        drawZoneYMin: 0.15,
        drawZoneYMax: 0.78,
        debug: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    };

    let drawingMs = 0;
    let drawingStartTime = null;
    let hoverMs = 0;
    let hoverStartTime = null;
    var HOVER_FACTOR = 0.5;

    let lastSentScore = 0;
    let lastSentTime = 0;
    let isSending = false;
    let currentNonce = null;
    let failedAttempts = new Map();
    let lastFailedScore = null;
    let lastFailedTime = 0;
    var lastSentBlock = 0;
    let proofState = {
        visibleStart: null,
        visibleMs: 0,
        focusStart: null,
        focusMs: 0,
        hasInput: false,
        history: [],
        historyLength: 0,
        historySpanMs: 0
    };

    const SNAP_CONFIG = { maxSnapshots: 10, minInterval: 1000 };
    let snapshots = [];
    let lastSnapTime = 0;

    function recordSnapshot(score) {
        const now = Date.now();
        if (now - lastSnapTime < SNAP_CONFIG.minInterval) return;
        if (snapshots.length > 0 && snapshots[snapshots.length - 1].s === score) return;
        snapshots.push({ t: now, s: score });
        lastSnapTime = now;
        if (snapshots.length > SNAP_CONFIG.maxSnapshots) snapshots.shift();
    }

    const honeypotKeys = ['score_cache_v2', 'profile_state_v1', 'ui_sync_hint'];
    const originalHoneypot = {};

    function initHoneypot() {
        const now = Date.now();
        honeypotKeys.forEach(key => {
            const value = { v: 1, t: now, n: Math.random().toString(36).substring(2, 15) };
            originalHoneypot[key] = JSON.stringify(value);
            try { localStorage.setItem(key, originalHoneypot[key]); } catch (e) {}
        });
    }

    function checkHoneypot() {
        let touched = false;
        honeypotKeys.forEach(key => {
            try {
                const stored = localStorage.getItem(key);
                if (stored === null) return;
                if (stored !== originalHoneypot[key]) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (!parsed || typeof parsed.v !== 'number' || parsed.v !== 1 ||
                            typeof parsed.t !== 'number' || typeof parsed.n !== 'string' ||
                            stored !== originalHoneypot[key]) touched = true;
                    } catch (e) { touched = true; }
                }
            } catch (e) {}
        });
        return touched;
    }

    function resetProof() {
        proofState = {
            visibleStart: (!document.hidden ? Date.now() : null),
            visibleMs: 0,
            focusStart: (document.hasFocus && document.hasFocus() ? Date.now() : null),
            focusMs: 0,
            hasInput: proofState.hasInput,
            history: [],
            historyLength: 0,
            historySpanMs: 0
        };
    }

    function startTracking() {
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                if (proofState.visibleStart) {
                    proofState.visibleMs += Date.now() - proofState.visibleStart;
                    proofState.visibleStart = null;
                }
                if (drawingStartTime) {
                    var el = Date.now() - drawingStartTime;
                    if (el >= 200) drawingMs += el;
                    drawingStartTime = null;
                }
                if (hoverStartTime) {
                    hoverMs += (Date.now() - hoverStartTime) * HOVER_FACTOR;
                    hoverStartTime = null;
                }
            } else proofState.visibleStart = Date.now();
        });
        window.addEventListener('focus', () => { proofState.focusStart = Date.now(); });
        window.addEventListener('blur', () => {
            if (proofState.focusStart) {
                proofState.focusMs += Date.now() - proofState.focusStart;
                proofState.focusStart = null;
            }
        });
        ['pointerdown', 'keydown', 'touchstart', 'mousedown'].forEach(event => {
            document.addEventListener(event, () => { if (!proofState.hasInput) proofState.hasInput = true; }, { once: false, passive: true, capture: true });
        });
        if (window.parent !== window) {
            const allowedOrigins = ['http://localhost:4000', 'http://127.0.0.1:4000', 'https://sp.games', 'https://new.sp.games'];
            window.addEventListener('message', (e) => {
                let originAllowed = false;
                try {
                    const eOrigin = (e.origin || '').toLowerCase();
                    for (const allowed of allowedOrigins) {
                        const al = allowed.toLowerCase();
                        if (eOrigin === al || (al.includes('localhost') && eOrigin.startsWith('http://localhost')) || (al.includes('127.0.0.1') && eOrigin.startsWith('http://127.0.0.1'))) {
                            originAllowed = true;
                            break;
                        }
                    }
                } catch (err) { return; }
                if (!originAllowed) return;
                if (e.data && typeof e.data === 'object' && (e.data.type === 'SP_INPUT' || e.data.type === 'user_interaction' || e.data.hasInput === true)) {
                    if (!proofState.hasInput) proofState.hasInput = true;
                }
            });
        }
        if (!document.hidden) proofState.visibleStart = Date.now();
        if (document.hasFocus && document.hasFocus()) proofState.focusStart = Date.now();
    }

    function inDrawZone(canvas, clientX, clientY) {
        if (!canvas) return false;
        var rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        var cx = (clientX - rect.left) * scaleX;
        var cy = (clientY - rect.top) * scaleY;
        var w = canvas.width || 1920;
        var h = canvas.height || 1080;
        return cx >= w * CONFIG.drawZoneXMin && cx <= w * CONFIG.drawZoneXMax &&
               cy >= h * CONFIG.drawZoneYMin && cy <= h * CONFIG.drawZoneYMax;
    }

    function stopDrawing() {
        if (drawingStartTime) {
            var elapsed = Date.now() - drawingStartTime;
            if (elapsed >= 200) drawingMs += elapsed;
            drawingStartTime = null;
        }
    }

    function stopHover() {
        if (hoverStartTime && !drawingStartTime) {
            hoverMs += (Date.now() - hoverStartTime) * HOVER_FACTOR;
            hoverStartTime = null;
        }
    }

    function startDrawingTracking() {
        var canvas = document.getElementById('interactivecanvas');
        if (!canvas) return;
        function getCoord(e) {
            if (e.touches && e.touches.length) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            if (e.changedTouches && e.changedTouches.length) {
                return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
            }
            return { x: e.clientX, y: e.clientY };
        }
        function onDown(e) {
            var c = getCoord(e);
            if (inDrawZone(canvas, c.x, c.y)) {
                if (!proofState.hasInput) proofState.hasInput = true;
                stopHover();
                drawingStartTime = Date.now();
            } else {
                stopHover();
            }
        }
        function onUp(e) {
            stopDrawing();
            if (e) {
                var c = getCoord(e);
                if (c && c.x != null && inDrawZone(canvas, c.x, c.y)) {
                    hoverStartTime = Date.now();
                }
            }
        }
        function onMove(e) {
            var c = getCoord(e);
            if (!c || (c.x == null && c.y == null)) return;
            if (!drawingStartTime && inDrawZone(canvas, c.x, c.y) && proofState.hasInput) {
                if (!hoverStartTime) hoverStartTime = Date.now();
            } else if (hoverStartTime && !inDrawZone(canvas, c.x, c.y)) {
                stopHover();
            }
        }
        function onLeave() {
            stopDrawing();
            stopHover();
        }
        canvas.addEventListener('mousedown', onDown, { passive: true });
        canvas.addEventListener('mouseup', onUp, { passive: true });
        canvas.addEventListener('mouseleave', onLeave, { passive: true });
        canvas.addEventListener('mousemove', onMove, { passive: true });
        canvas.addEventListener('touchstart', onDown, { passive: true });
        canvas.addEventListener('touchend', onUp, { passive: true });
        canvas.addEventListener('touchcancel', onLeave, { passive: true });
        canvas.addEventListener('touchmove', onMove, { passive: true });
        if (window.PointerEvent) {
            canvas.addEventListener('pointerdown', onDown, { passive: true });
            canvas.addEventListener('pointerup', onUp, { passive: true });
            canvas.addEventListener('pointerleave', onLeave, { passive: true });
            canvas.addEventListener('pointermove', onMove, { passive: true });
        }
    }

    function updateScoreHistory(score) {
        const now = Date.now();
        proofState.history.push({ score, timestamp: now });
        if (proofState.history.length > 5000) proofState.history.shift();
        proofState.historyLength = proofState.history.length;
        if (proofState.history.length >= 2) {
            proofState.historySpanMs = proofState.history[proofState.history.length - 1].timestamp - proofState.history[0].timestamp;
        }
    }

    async function getCurrentScore() {
        try {
            var r = await fetch(CONFIG.myScoreUrl + CONFIG.gameSlug + '/my-score', { method: 'GET', credentials: 'include' });
            if (r.ok) {
                var d = await r.json();
                var s = parseInt(d.score, 10);
                return (s >= 0 && s < 1e9) ? s : 0;
            }
        } catch (e) {}
        return 0;
    }

    async function getNonce() {
        try {
            const response = await fetch(`${CONFIG.nonceUrl}?gameSlug=${encodeURIComponent(CONFIG.gameSlug)}`, {
                method: 'GET', credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.nonce) {
                    currentNonce = data.nonce;
                    log('Nonce received');
                    return true;
                }
            }
        } catch (e) { log('Nonce request failed:', e.message); }
        return false;
    }

    const log = CONFIG.debug ? (...args) => console.log('%c[SP-Score]', 'color: #00c853; font-weight: bold', ...args) : () => {};

    function checkEngagement() {
        var currentHoverMs = hoverMs + (hoverStartTime && !drawingStartTime ? (Date.now() - hoverStartTime) * HOVER_FACTOR : 0);
        var currentDrawingMs = drawingMs + (drawingStartTime ? Date.now() - drawingStartTime : 0) + currentHoverMs;
        if (currentDrawingMs < CONFIG.engagementMs) return;
        if (!proofState.hasInput) return;
        var blocks = Math.floor(currentDrawingMs / CONFIG.engagementMs);
        if (blocks <= lastSentBlock) return;
        lastSentBlock = blocks;
        var increment = CONFIG.scorePerBlock;
        if (CONFIG.additive) {
            function doSend(scoreToSend) {
                updateScoreHistory(scoreToSend);
                recordSnapshot(scoreToSend);
                sendScore(scoreToSend).then(function(res) {
                    if (res) showEngagementToast(typeof res === 'object' && res.currentBest !== undefined ? res.currentBest : scoreToSend);
                });
            }
            if (lastSentScore > 0) {
                doSend(lastSentScore + increment);
            } else {
                getCurrentScore().then(function(current) {
                    doSend(current + increment);
                });
            }
        } else {
            var score = blocks * increment;
            updateScoreHistory(score);
            recordSnapshot(score);
            sendScore(score).then(function(res) {
                if (res) showEngagementToast(typeof res === 'object' && res.currentBest !== undefined ? res.currentBest : score);
            });
        }
    }

    function showEngagementToast(score) {
        if (window.innerWidth < 300) return;
        const div = document.createElement('div');
        const lang = document.documentElement.lang || navigator.language || 'en';
        const isArabic = lang.startsWith('ar');
        const msg = isArabic ? 'تم حفظ التقدم: ' + score + ' ✓' : 'Progress saved: ' + score + ' ✓';
        const direction = isArabic ? 'rtl' : 'ltr';
        div.textContent = msg;
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:25px;font:bold 14px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:999999;direction:' + direction + ';';
        document.body.appendChild(div);
        setTimeout(function() { div.remove(); }, 2500);
    }

    function decoySave(score) {
        console.log('%cColoring completed! ' + score, 'color: #00c853; font-weight: bold');
    }

    window.__ctlArcadeSaveScore = decoySave;

    try {
        if (window.parent !== window) {
            const win = window;
            window.parent.__ctlArcadeSaveScore = function(a) { win.__ctlArcadeSaveScore(a); };
        }
    } catch (e) {}

    async function sendScore(score) {
        const now = Date.now();
        if (isSending || score < CONFIG.minScore) return false;
        if ((now - lastSentTime) < CONFIG.cooldownMs) return false;
        if (score === lastFailedScore && (now - lastFailedTime) < 10000) return false;
        const fd = failedAttempts.get(score);
        if (fd && fd.count >= 3 && (now - fd.lastAttempt) < 10000) return false;

        if (!currentNonce) {
            const gotNonce = await getNonce();
            if (!gotNonce) return false;
        }

        isSending = true;
        log('Sending score:', score);

        if (proofState.visibleStart && !document.hidden) {
            proofState.visibleMs += Date.now() - proofState.visibleStart;
            proofState.visibleStart = Date.now();
        }
        if (proofState.focusStart && document.hasFocus && document.hasFocus()) {
            proofState.focusMs += Date.now() - proofState.focusStart;
            proofState.focusStart = Date.now();
        }

        const currentVisibleMs = proofState.visibleMs + (proofState.visibleStart ? (Date.now() - proofState.visibleStart) : 0);
        const currentFocusMs = proofState.focusMs + (proofState.focusStart ? (Date.now() - proofState.focusStart) : 0);
        const honeypotTouched = checkHoneypot();
        const proofData = {
            visibleMs: Math.min(currentVisibleMs, 43200000),
            focusMs: Math.min(currentFocusMs, 43200000),
            hasInput: proofState.hasInput,
            historyLength: Math.min(proofState.historyLength, 5000),
            historySpanMs: Math.min(proofState.historySpanMs, 43200000)
        };

        if (snapshots.length === 0 || snapshots[snapshots.length - 1].s !== score) {
            snapshots.push({ t: Date.now(), s: score });
            if (snapshots.length > SNAP_CONFIG.maxSnapshots) snapshots.shift();
        }

        try {
            const response = await fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    gameSlug: CONFIG.gameSlug,
                    score: score,
                    nonce: currentNonce,
                    proof: proofData,
                    honeypotTouched: honeypotTouched,
                    snapshots: snapshots.map(s => ({ t: s.t, s: s.s }))
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.ok !== false && result.success !== false) {
                    log('Score saved!', result);
                    lastSentScore = score;
                    lastSentTime = now;
                    currentNonce = null;
                    resetProof();
                    snapshots = [];
                    lastSnapTime = 0;
                    setTimeout(() => getNonce(), 100);
                    if (window.parent !== window) {
                        window.parent.postMessage({ type: 'SP_SCORE_SAVED', score: score, result: result, gameSlug: CONFIG.gameSlug }, '*');
                    }
                    if (result.newHighScore) showNotification(score);
                    return { currentBest: result.currentBest };
                } else {
                    log('Save failed:', result.error);
                }
            } else {
                log('HTTP Error:', response.status);
            }
            const f = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
            f.count++;
            f.lastAttempt = Date.now();
            failedAttempts.set(score, f);
            lastFailedScore = score;
            lastFailedTime = Date.now();
            currentNonce = null;
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            for (const [s, data] of failedAttempts.entries()) {
                if (data.lastAttempt < fiveMinutesAgo) failedAttempts.delete(s);
            }
        } catch (e) {
            log('Error:', e.message);
            const f = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
            f.count++;
            f.lastAttempt = Date.now();
            failedAttempts.set(score, f);
            lastFailedScore = score;
            lastFailedTime = Date.now();
            currentNonce = null;
        } finally {
            isSending = false;
        }
        return false;
    }

    function showNotification(score) {
        if (window.innerWidth < 300) return;
        const div = document.createElement('div');
        const lang = document.documentElement.lang || navigator.language || 'en';
        const isArabic = lang.startsWith('ar');
        const message = isArabic ? 'رقم قياسي!' : 'New High Score!';
        const direction = isArabic ? 'rtl' : 'ltr';
        div.innerHTML = message + '<br><b>' + score.toLocaleString() + '</b>';
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:25px;font:bold 14px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:999999;direction:' + direction + ';';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3500);
    }

    async function init() {
        log('Initializing...');
        log('Game:', CONFIG.gameSlug);
        initHoneypot();
        startTracking();
        await getNonce();
        await new Promise(r => {
            if (document.readyState === 'complete') r();
            else window.addEventListener('load', r);
        });
        startDrawingTracking();
        setInterval(checkEngagement, 1000);
        log('Ready!');
    }

    init();
})();
