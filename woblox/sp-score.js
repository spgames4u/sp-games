/**
 * sp-score.js - جسر حفظ النتيجة لـ woblox (Construct 2)
 * يستقبل SP_SAVE_SCORE_REQUEST (من c2runtime أو من data.js) ويرسل للـ API ثم يخبر الـ parent
 */

(function() {
    'use strict';

    function getGameSlug() {
        const params = new URLSearchParams(location.search);
        if (params.get('gameSlug')) return params.get('gameSlug');
        const parts = location.pathname.split('/').filter(Boolean);
        return parts.length > 0 ? parts[parts.length - 1] : 'woblox';
    }

    const CONFIG = {
        apiUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/save-score'
            : 'https://new.sp.games/api/games/save-score',
        nonceUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/nonce'
            : 'https://new.sp.games/api/games/nonce',
        gameSlug: getGameSlug(),
        minScore: 1,
        cooldownMs: 2000,
        debug: new URLSearchParams(location.search).get('scorepointDebug') === '1'
    };

    let lastSentScore = 0;
    let lastSentTime = 0;
    let isSending = false;
    let currentNonce = null;

    let proofState = {
        visibleStart: null,
        visibleMs: 0,
        focusStart: null,
        focusMs: 0,
        hasInput: false,
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
                            typeof parsed.t !== 'number' || typeof parsed.n !== 'string') touched = true;
                    } catch (e) { touched = true; }
                }
            } catch (e) {}
        });
        return touched;
    }

    function startTracking() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && proofState.visibleStart) {
                proofState.visibleMs += Date.now() - proofState.visibleStart;
                proofState.visibleStart = null;
            } else if (!document.hidden) proofState.visibleStart = Date.now();
        });
        window.addEventListener('focus', () => { proofState.focusStart = Date.now(); });
        window.addEventListener('blur', () => {
            if (proofState.focusStart) {
                proofState.focusMs += Date.now() - proofState.focusStart;
                proofState.focusStart = null;
            }
        });
        ['pointerdown', 'keydown', 'touchstart', 'mousedown'].forEach(ev => {
            document.addEventListener(ev, () => { proofState.hasInput = true; }, { passive: true });
        });
        if (!document.hidden) proofState.visibleStart = Date.now();
        if (document.hasFocus && document.hasFocus()) proofState.focusStart = Date.now();
    }

    async function getNonce() {
        try {
            const r = await fetch(CONFIG.nonceUrl + '?gameSlug=' + encodeURIComponent(CONFIG.gameSlug), { method: 'GET', credentials: 'include' });
            if (r.ok) {
                const data = await r.json();
                if (data.nonce) { currentNonce = data.nonce; return true; }
            }
        } catch (e) {}
        return false;
    }

    const log = CONFIG.debug ? (...a) => console.log('%c[SP-Score-Woblox]', 'color:#00c853;font-weight:bold', ...a) : () => {};

    async function sendScore(score) {
        const now = Date.now();
        if (isSending || score < CONFIG.minScore) return false;
        if (score <= lastSentScore && (now - lastSentTime) < CONFIG.cooldownMs) return false;
        if (!currentNonce) {
            const ok = await getNonce();
            if (!ok) { log('❌ No nonce'); return false; }
        }
        isSending = true;
        log('📤 Saving score (stage):', score);

        if (proofState.visibleStart && !document.hidden) {
            proofState.visibleMs += now - proofState.visibleStart;
            proofState.visibleStart = now;
        }
        if (proofState.focusStart && document.hasFocus && document.hasFocus()) {
            proofState.focusMs += now - proofState.focusStart;
            proofState.focusStart = null;
        }
        const visibleMs = proofState.visibleMs + (proofState.visibleStart ? Date.now() - proofState.visibleStart : 0);
        const focusMs = proofState.focusMs + (proofState.focusStart && document.hasFocus && document.hasFocus() ? Date.now() - proofState.focusStart : 0);
        const proof = {
            visibleMs: Math.min(visibleMs, 43200000),
            focusMs: Math.min(focusMs, 43200000),
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
                    proof: proof,
                    honeypotTouched: checkHoneypot()
                })
            });
            if (response.ok) {
                const result = await response.json();
                if (result.ok !== false) {
                    lastSentScore = score;
                    lastSentTime = Date.now();
                    currentNonce = null;
                    log('✅ Score saved:', score, result);
                    if (window.parent !== window) {
                        window.parent.postMessage({ type: 'SP_SCORE_SAVED', score: score, result: result, gameSlug: CONFIG.gameSlug }, '*');
                    }
                    return true;
                }
            }
            currentNonce = null;
        } catch (e) {
            log('❌ Error:', e.message);
            currentNonce = null;
        } finally {
            isSending = false;
        }
        return false;
    }

    window.addEventListener('message', function(e) {
        if (!e.data || typeof e.data !== 'object' || e.data.type !== 'SP_SAVE_SCORE_REQUEST') return;
        const score = typeof e.data.score === 'number' ? e.data.score : parseInt(e.data.score, 10);
        if (!isFinite(score) || score < 1) return;
        const gameSlug = e.data.gameSlug || CONFIG.gameSlug;
        sendScore(score);
    });

    initHoneypot();
    startTracking();
    getNonce();
    log('✅ SP-Score ready for woblox (stage save)');
})();
