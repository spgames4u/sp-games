/**
 * sp-score.js - Score Bridge for Woblox (Construct 2) with Anti-Cheat
 * v4.0 - نظام Anti-Cheat: Nonce + Proof + Honeypot
 * يستمع لـ SP_SAVE_SCORE_REQUEST + يقرأ من localStorage (polling)
 */

(function() {
    'use strict';

    var CONFIG = {
        apiUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/save-score'
            : 'https://new.sp.games/api/games/save-score',
        nonceUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/nonce'
            : 'https://new.sp.games/api/games/nonce',
        gameSlug: (function() {
            var params = new URLSearchParams(location.search);
            if (params.get('gameSlug')) return params.get('gameSlug');
            var parts = location.pathname.split('/').filter(Boolean);
            return parts[0] === 'games' ? (parts[1] || 'woblox') : (parts[0] || 'woblox');
        })(),
        minScore: 1,
        cooldownMs: 30000,
        debug: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    };

    var lastSentScore = 0;
    var lastSentTime = 0;
    var isSending = false;
    var currentNonce = null;
    var failedAttempts = new Map();
    var lastFailedScore = null;
    var lastFailedTime = 0;

    var proofState = {
        visibleStart: null,
        visibleMs: 0,
        focusStart: null,
        focusMs: 0,
        hasInput: false,
        history: [],
        historyLength: 0,
        historySpanMs: 0
    };

    var honeypotKeys = ['score_cache_v2', 'profile_state_v1', 'ui_sync_hint'];
    var originalHoneypot = {};

    function initHoneypot() {
        var now = Date.now();
        honeypotKeys.forEach(function(key) {
            var value = { v: 1, t: now, n: Math.random().toString(36).substring(2, 15) };
            originalHoneypot[key] = JSON.stringify(value);
            try { localStorage.setItem(key, originalHoneypot[key]); } catch (e) {}
        });
    }

    function checkHoneypot() {
        var touched = false;
        honeypotKeys.forEach(function(key) {
            try {
                var stored = localStorage.getItem(key);
                if (stored === null) return;
                if (stored !== originalHoneypot[key]) {
                    try {
                        var parsed = JSON.parse(stored);
                        if (!parsed || typeof parsed.v !== 'number' || parsed.v !== 1 ||
                            typeof parsed.t !== 'number' || typeof parsed.n !== 'string' ||
                            stored !== originalHoneypot[key]) {
                            touched = true;
                        }
                    } catch (e) { touched = true; }
                }
            } catch (e) {}
        });
        return touched;
    }

    function resetProof() {
        proofState = {
            visibleStart: null,
            visibleMs: 0,
            focusStart: null,
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
            } else {
                proofState.visibleStart = Date.now();
            }
        });
        window.addEventListener('focus', function() { proofState.focusStart = Date.now(); });
        window.addEventListener('blur', function() {
            if (proofState.focusStart) {
                proofState.focusMs += Date.now() - proofState.focusStart;
                proofState.focusStart = null;
            }
        });
        ['pointerdown', 'keydown', 'touchstart', 'mousedown'].forEach(function(ev) {
            document.addEventListener(ev, function() {
                if (!proofState.hasInput) proofState.hasInput = true;
            }, { passive: true, capture: true });
        });
        if (!document.hidden) proofState.visibleStart = Date.now();
        if (document.hasFocus && document.hasFocus()) proofState.focusStart = Date.now();
    }

    function updateScoreHistory(score) {
        var now = Date.now();
        proofState.history.push({ score: score, timestamp: now });
        if (proofState.history.length > 5000) proofState.history.shift();
        proofState.historyLength = proofState.history.length;
        if (proofState.history.length >= 2) {
            proofState.historySpanMs = proofState.history[proofState.history.length - 1].timestamp - proofState.history[0].timestamp;
        }
    }

    async function getNonce() {
        try {
            var r = await fetch(CONFIG.nonceUrl + '?gameSlug=' + encodeURIComponent(CONFIG.gameSlug), {
                method: 'GET',
                credentials: 'include'
            });
            if (r.ok) {
                var d = await r.json();
                if (d.nonce) { currentNonce = d.nonce; return true; }
            }
        } catch (e) {}
        return false;
    }

    var log = CONFIG.debug ? function() {
        console.log.apply(console, ['%c[SP-Score-Woblox]', 'color:#00c853;font-weight:bold'].concat(Array.prototype.slice.call(arguments)));
    } : function() {};

    async function sendScore(score, msgGameSlug) {
        var now = Date.now();
        if (isSending || score < CONFIG.minScore) return false;
        if (score <= lastSentScore && (now - lastSentTime) < CONFIG.cooldownMs) return false;
        if (score === lastFailedScore && (now - lastFailedTime) < 10000) return false;
        var fd = failedAttempts.get(score);
        if (fd && fd.count >= 3 && (now - fd.lastAttempt) < 10000) return false;
        if (!currentNonce) {
            if (!(await getNonce())) return false;
        }
        isSending = true;
        log('Sending score:', score);
        updateScoreHistory(score);
        if (proofState.visibleStart && !document.hidden) {
            proofState.visibleMs += now - proofState.visibleStart;
            proofState.visibleStart = now;
        }
        if (proofState.focusStart && document.hasFocus && document.hasFocus()) {
            proofState.focusMs += now - proofState.focusStart;
            proofState.focusStart = now;
        }
        var visibleMs = proofState.visibleMs + (proofState.visibleStart ? now - proofState.visibleStart : 0);
        var focusMs = proofState.focusMs + (proofState.focusStart ? now - proofState.focusStart : 0);
        var proofData = {
            visibleMs: Math.min(visibleMs, 43200000),
            focusMs: Math.min(focusMs, 43200000),
            hasInput: proofState.hasInput,
            historyLength: Math.min(proofState.historyLength, 5000),
            historySpanMs: Math.min(proofState.historySpanMs, 43200000)
        };
        var gs = msgGameSlug || CONFIG.gameSlug;
        try {
            var resp = await fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    gameSlug: gs,
                    score: score,
                    nonce: currentNonce,
                    proof: proofData,
                    honeypotTouched: checkHoneypot()
                })
            });
            if (resp.ok) {
                var result = await resp.json();
                if (result.ok !== false) {
                    log('Score saved!', result);
                    lastSentScore = score;
                    lastSentTime = now;
                    currentNonce = null;
                    resetProof();
                    setTimeout(getNonce, 100);
                    if (window.parent !== window) {
                        window.parent.postMessage({ type: 'SP_SCORE_SAVED', score: score, result: result, gameSlug: gs }, '*');
                    }
                    showNotification(score, result && result.newHighScore);
                    return true;
                }
            }
            var failedData = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
            failedData.count++;
            failedData.lastAttempt = Date.now();
            failedAttempts.set(score, failedData);
            lastFailedScore = score;
            lastFailedTime = Date.now();
            currentNonce = null;
        } catch (e) {
            var f2 = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
            f2.count++;
            f2.lastAttempt = Date.now();
            failedAttempts.set(score, f2);
            lastFailedScore = score;
            lastFailedTime = Date.now();
            currentNonce = null;
        } finally {
            isSending = false;
        }
        return false;
    }

    function showNotification(score, isNewHigh) {
        if (window.innerWidth < 300) return;
        var div = document.createElement('div');
        var lang = document.documentElement.lang || navigator.language || 'en';
        var isAr = lang.startsWith('ar');
        var msg = isNewHigh
            ? (isAr ? 'رقم قياسي جديد!' : 'New High Score!')
            : (isAr ? 'نتيجتك' : 'Your Score');
        var pts = isAr ? ' نقطة' : ' points';
        var dir = isAr ? 'rtl' : 'ltr';
        div.innerHTML = '<strong>' + msg + '</strong><br>' + score.toLocaleString() + pts;
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:25px;font:bold 14px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:999999;direction:' + dir + ';';
        document.body.appendChild(div);
        setTimeout(function() { div.remove(); }, 3500);
    }

    function onMessage(e) {
        if (!e.data || typeof e.data !== 'object' || e.data.type !== 'SP_SAVE_SCORE_REQUEST') return;
        var scr = parseInt(e.data.score, 10);
        if (isNaN(scr) || scr < CONFIG.minScore) return;
        if (!proofState.hasInput) {
            log('Waiting for user input before sending score...');
            return;
        }
        sendScore(Math.floor(scr), e.data.gameSlug || CONFIG.gameSlug);
    }

    window.addEventListener('message', onMessage);

    async function detectScoreC2() {
        try {
            var best = 0;
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (!key) continue;
                var k = key.toLowerCase();
                var val = parseFloat(localStorage.getItem(key));
                if (isNaN(val) || val < 0) continue;
                if (k.includes('best') || k.includes('high') || k.includes('score') || k.includes('last')) {
                    best = Math.max(best, val);
                }
            }
            var detected = Math.floor(best) || null;
            if (detected) updateScoreHistory(detected);
            return detected;
        } catch (e) { return null; }
    }

    async function poll() {
        if (isSending) return;
        if (!proofState.hasInput) return;
        var score = await detectScoreC2();
        if (!score) return;
        var now = Date.now();
        if (score > lastSentScore) {
            await sendScore(score);
        } else if ((now - lastSentTime) >= CONFIG.cooldownMs && score > 0 && score !== lastSentScore) {
            await sendScore(score);
        }
    }

    async function init() {
        log('Initializing (Woblox - Construct 2)...');
        log('Game:', CONFIG.gameSlug);
        initHoneypot();
        startTracking();
        await getNonce();
        if (document.readyState !== 'complete') {
            await new Promise(function(r) { window.addEventListener('load', r); });
        }
        log('Ready! postMessage + localStorage polling (every 3s)');
        setInterval(poll, 3000);
        setTimeout(poll, 2500);
    }

    init();
})();
