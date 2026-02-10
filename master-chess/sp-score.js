/**
 * sp-score.js - جسر النتائج لألعاب المحرك المخصص (CreateJS) مع منع الغش
 * v1.0 - Nonce + Proof + Honeypot + postMessage (بدون parent.__ctlArcadeSaveScore)
 *
 * نوع اللعبة: محرك مخصص (CGame.js, CEndPanel.js, createjs) - يُستدعى عند حدث save_score
 */

(function() {
    'use strict';

    const guardKey = '__SP_SCORE_RUNNING_' + (() => {
        const params = new URLSearchParams(location.search);
        if (params.get('gameSlug')) return params.get('gameSlug');
        const m = location.pathname.match(/\/games\/([^\/]+)/);
        return m ? m[1] : (location.pathname.split('/').filter(Boolean)[0] || 'unknown');
    })();
    if (window[guardKey]) {
        console.warn('[SP-Score] Already running, skipping');
        return;
    }
    window[guardKey] = true;

    const CONFIG = {
        apiUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/save-score'
            : 'https://new.sp.games/api/games/save-score',
        nonceUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/nonce'
            : 'https://new.sp.games/api/games/nonce',
        gameSlug: (() => {
            const params = new URLSearchParams(location.search);
            if (params.get('gameSlug')) return params.get('gameSlug');
            const m = location.pathname.match(/\/games\/([^\/]+)/);
            return m ? m[1] : (location.pathname.split('/').filter(Boolean)[0] || 'unknown');
        })(),
        minScore: 0,
        cooldownMs: 30000,
        debug: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    };

    let lastSentScore = 0;
    let lastSentTime = 0;
    let isSending = false;
    let currentNonce = null;
    let failedAttempts = new Map();
    let lastFailedScore = null;
    let lastFailedTime = 0;

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
            visibleStart: proofState.visibleStart,
            visibleMs: proofState.visibleMs,
            focusStart: proofState.focusStart,
            focusMs: proofState.focusMs,
            hasInput: proofState.hasInput,
            history: [],
            historyLength: 0,
            historySpanMs: 0
        };
    }

    function startTracking() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && proofState.visibleStart) {
                proofState.visibleMs += Date.now() - proofState.visibleStart;
                proofState.visibleStart = null;
            } else if (!document.hidden) {
                proofState.visibleStart = Date.now();
            }
        });
        window.addEventListener('focus', () => { proofState.focusStart = Date.now(); });
        window.addEventListener('blur', () => {
            if (proofState.focusStart) {
                proofState.focusMs += Date.now() - proofState.focusStart;
                proofState.focusStart = null;
            }
        });
        const inputEvents = ['pointerdown', 'keydown', 'touchstart', 'mousedown'];
        inputEvents.forEach(event => {
            document.addEventListener(event, () => {
                if (!proofState.hasInput) proofState.hasInput = true;
            }, { passive: true, capture: true });
        });
        if (window.self !== window.top) {
            inputEvents.forEach(event => {
                window.addEventListener(event, () => {
                    if (!proofState.hasInput) proofState.hasInput = true;
                }, { passive: true, capture: true });
            });
        }
        if (!document.hidden) proofState.visibleStart = Date.now();
        if (document.hasFocus && document.hasFocus()) proofState.focusStart = Date.now();
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

    async function getNonce() {
        try {
            const response = await fetch(`${CONFIG.nonceUrl}?gameSlug=${encodeURIComponent(CONFIG.gameSlug)}`, {
                method: 'GET',
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.nonce) {
                    currentNonce = data.nonce;
                    log('🔑 Nonce received');
                    return true;
                }
            }
        } catch (e) { log('⚠️ Nonce failed:', e.message); }
        return false;
    }

    const log = CONFIG.debug
        ? (...args) => console.log('%c[SP-Score]', 'color: #00c853; font-weight: bold', ...args)
        : () => {};

    async function sendScore(score) {
        const now = Date.now();
        if (isSending || score < CONFIG.minScore) return false;

        if (score <= lastSentScore && (now - lastSentTime) < CONFIG.cooldownMs) return false;
        if (score === lastFailedScore && (now - lastFailedTime) < 10000) return false;

        const failedData = failedAttempts.get(score);
        if (failedData && failedData.count >= 3 && (now - failedData.lastAttempt) < 10000) return false;

        if (!currentNonce) {
            const gotNonce = await getNonce();
            if (!gotNonce) return false;
        }

        isSending = true;
        log('📤 Sending score:', score);

        if (proofState.visibleStart && !document.hidden) {
            proofState.visibleMs += now - proofState.visibleStart;
            proofState.visibleStart = now;
        }
        if (proofState.focusStart && document.hasFocus && document.hasFocus()) {
            proofState.focusMs += now - proofState.focusStart;
            proofState.focusStart = now;
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
                    honeypotTouched: honeypotTouched
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.ok !== false) {
                    log('✅ Score saved!', result);
                    lastSentScore = score;
                    lastSentTime = Date.now();
                    currentNonce = null;
                    resetProof();
                    setTimeout(() => getNonce(), 100);

                    if (window.parent !== window) {
                        window.parent.postMessage({
                            type: 'SP_SCORE_SAVED',
                            score: score,
                            result: result,
                            gameSlug: CONFIG.gameSlug
                        }, '*');
                    }
                    if (result.newHighScore) showNotification(score);
                    return true;
                } else {
                    log('⚠️ Save failed:', result.error);
                    const fd = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
                    fd.count++;
                    fd.lastAttempt = Date.now();
                    failedAttempts.set(score, fd);
                    lastFailedScore = score;
                    lastFailedTime = Date.now();
                    currentNonce = null;
                }
            } else {
                const fd = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
                fd.count++;
                fd.lastAttempt = Date.now();
                failedAttempts.set(score, fd);
                lastFailedScore = score;
                lastFailedTime = Date.now();
                currentNonce = null;
            }
        } catch (e) {
            log('❌ Error:', e.message);
            const fd = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
            fd.count++;
            fd.lastAttempt = Date.now();
            failedAttempts.set(score, fd);
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
        const message = isArabic ? '🎉 رقم قياسي!' : '🎉 New High Score!';
        const direction = isArabic ? 'rtl' : 'ltr';
        div.innerHTML = message + '<br><b>' + score.toLocaleString() + '</b>';
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:25px;font:bold 14px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:999999;direction:' + direction + ';';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3500);
    }

    function ctlArcadeSaveScore(scoreOrPayload) {
        const score = (typeof scoreOrPayload === 'object' && scoreOrPayload != null && 'score' in scoreOrPayload)
            ? Number(scoreOrPayload.score)
            : Number(scoreOrPayload);
        if (isNaN(score) || score < CONFIG.minScore) return;
        updateScoreHistory(Math.floor(score));
        sendScore(Math.floor(score));
    }

    async function init() {
        log('Initializing (Custom Engine)...');
        log('Game:', CONFIG.gameSlug);

        initHoneypot();
        startTracking();

        await new Promise(r => {
            if (document.readyState === 'complete') r();
            else window.addEventListener('load', r);
        });

        await getNonce();
        window.ctlArcadeSaveScore = ctlArcadeSaveScore;
        window.spScorePrefetchNonce = function() { getNonce(); };
        log('✅ Ready! Use ctlArcadeSaveScore(score) on save_score event.');
    }

    init();
})();
