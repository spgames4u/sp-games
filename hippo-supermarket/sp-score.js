/**
 * sp-score.js - Score Bridge for sp.games
 * v6.0 - Game Integration Module
 */

(function() {
    'use strict';

    function getGameSlug() {
        const params = new URLSearchParams(location.search);
        if (params.get('gameSlug')) return params.get('gameSlug');
        const parts = location.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || 'hippo-supermarket';
    }

    const guardKey = '__SP_SCORE_RUNNING_' + getGameSlug();
    if (window[guardKey]) return;
    window[guardKey] = true;

    window.__SP_LAST_SCORE = undefined;

    const CONFIG = {
        apiUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/save-score'
            : 'https://new.sp.games/api/games/save-score',
        nonceUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/nonce'
            : 'https://new.sp.games/api/games/nonce',
        gameSlug: getGameSlug(),
        minScore: 1,
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
            visibleStart: null, visibleMs: 0, focusStart: null, focusMs: 0,
            hasInput: proofState.hasInput, history: [], historyLength: 0, historySpanMs: 0
        };
    }

    function startTracking() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (proofState.visibleStart) {
                    proofState.visibleMs += Date.now() - proofState.visibleStart;
                    proofState.visibleStart = null;
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
        const inputEvents = ['pointerdown', 'keydown', 'touchstart', 'mousedown'];
        inputEvents.forEach(event => {
            document.addEventListener(event, () => {
                if (!proofState.hasInput) proofState.hasInput = true;
            }, { once: false, passive: true, capture: true });
        });
        if (window.parent !== window) {
            const allowedOrigins = ['http://localhost:4000', 'http://127.0.0.1:4000', 'https://sp.games', 'https://new.sp.games'];
            window.addEventListener('message', (e) => {
                let originAllowed = false;
                try {
                    const eOrigin = e.origin.toLowerCase();
                    for (const allowed of allowedOrigins) {
                        const allowedLower = allowed.toLowerCase();
                        if (eOrigin === allowedLower || (allowedLower.includes('localhost') && eOrigin.startsWith('http://localhost')) ||
                            (allowedLower.includes('127.0.0.1') && eOrigin.startsWith('http://127.0.0.1'))) {
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
                method: 'GET', credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.nonce) {
                    currentNonce = data.nonce;
                    return true;
                }
            }
        } catch (e) {}
        return false;
    }

    const log = CONFIG.debug ? (...args) => console.log('%c[SP-Score]', 'color: #00c853; font-weight: bold', ...args) : () => {};

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
        log('Sending score:', score);

        if (proofState.visibleStart && !document.hidden) {
            proofState.visibleMs += now - proofState.visibleStart;
            proofState.visibleStart = now;
        }
        if (proofState.focusStart && document.hasFocus && document.hasFocus()) {
            proofState.focusMs += now - proofState.focusStart;
            proofState.focusStart = now;
        }

        const currentVisibleMs = proofState.visibleMs + (proofState.visibleStart ? (now - proofState.visibleStart) : 0);
        const currentFocusMs = proofState.focusMs + (proofState.focusStart ? (now - proofState.focusStart) : 0);
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
                if (result.ok !== false) {
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
                    return { ok: true, newHighScore: !!result.newHighScore };
                } else {
                    log('Save failed:', result.error);
                }
            } else {
                log('HTTP Error:', response.status);
            }
            const fd = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
            fd.count++;
            fd.lastAttempt = Date.now();
            failedAttempts.set(score, fd);
            lastFailedScore = score;
            lastFailedTime = Date.now();
            currentNonce = null;
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            for (const [s, data] of failedAttempts.entries()) {
                if (data.lastAttempt < fiveMinutesAgo) failedAttempts.delete(s);
            }
        } catch (e) {
            log('Error:', e.message);
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
        const message = isArabic ? 'رقم قياسي!' : 'New High Score!';
        const direction = isArabic ? 'rtl' : 'ltr';
        div.innerHTML = message + '<br><b>' + score.toLocaleString() + '</b>';
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:25px;font:bold 14px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:999999;direction:' + direction + ';';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3500);
    }

    function showScoreSavedNotification(score, isNewHigh) {
        if (window.innerWidth < 300) return;
        const div = document.createElement('div');
        const lang = document.documentElement.lang || navigator.language || 'en';
        const isArabic = lang.startsWith('ar');
        const message = isNewHigh ? (isArabic ? 'رقم قياسي!' : 'New High Score!') : (isArabic ? 'تم حفظ نتيجتك' : 'Score saved');
        const direction = isArabic ? 'rtl' : 'ltr';
        div.innerHTML = message + '<br><b>' + score.toLocaleString() + '</b>';
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:25px;font:bold 14px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:999999;direction:' + direction + ';';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3500);
    }

    let cachedLevel = null;

    function parseLevelFromData(data) {
        if (!data || typeof data !== 'object') return null;
        if (typeof data.level === 'number') return data.level;
        if (typeof data.level === 'string') { const n = parseInt(data.level, 10); return isNaN(n) ? null : n; }
        if (typeof data.lv === 'number') return data.lv;
        if (typeof data.lv === 'string') { const n = parseInt(data.lv, 10); return isNaN(n) ? null : n; }
        return null;
    }

    function detectLevel() {
        let level = cachedLevel;
        if (level !== null && level > 0) return level;
        try {
            const storage = (typeof cc !== 'undefined' && cc.sys && cc.sys.localStorage) ? cc.sys.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
            if (storage) {
                const keysToTry = ['HippoSupermarket_userData', 'HippoSupermarket_userData_backup'];
                for (const key of keysToTry) {
                    try {
                        const raw = storage.getItem(key);
                        if (!raw || typeof raw !== 'string') continue;
                        let data = null;
                        try {
                            data = JSON.parse(raw);
                        } catch (e1) {
                            try {
                                data = JSON.parse(decodeURIComponent(raw));
                            } catch (e2) {
                                try {
                                    data = JSON.parse(atob(raw));
                                } catch (e3) {}
                            }
                        }
                        level = parseLevelFromData(data);
                        if (level !== null) { cachedLevel = level; return level; }
                    } catch (e) {}
                }
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    if (key && key.indexOf('HippoSupermarket') >= 0) {
                        try {
                            const raw = storage.getItem(key);
                            if (raw) {
                                const data = JSON.parse(raw);
                                level = parseLevelFromData(data);
                                if (level !== null) { cachedLevel = level; return level; }
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (e) {}
        return (level !== null && !isNaN(level) && level > 0) ? level : null;
    }

    async function decompressAndGetLevel() {
        try {
            const storage = (typeof cc !== 'undefined' && cc.sys && cc.sys.localStorage) ? cc.sys.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
            if (!storage) return null;
            const raw = storage.getItem('HippoSupermarket_userData');
            if (!raw || typeof raw !== 'string') return null;
            if (typeof DecompressionStream === 'undefined') return null;
            const binary = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
            for (const format of ['deflate', 'gzip']) {
                try {
                    const ds = new DecompressionStream(format);
                    const blob = new Blob([binary]);
                    const decompressed = blob.stream().pipeThrough(ds);
                    const arr = await new Response(decompressed).arrayBuffer();
                    const str = new TextDecoder().decode(arr);
                    const data = JSON.parse(str);
                    const lv = parseLevelFromData(data);
                    if (lv !== null) { cachedLevel = lv; return lv; }
                } catch (e) {}
            }
        } catch (e) {}
        return null;
    }

    function interceptPostMessage() {
        const parent = window.parent;
        const origPostMessage = parent.postMessage.bind(parent);
        parent.postMessage = function(msg, targetOrigin) {
            if (msg && typeof msg === 'object' && msg.type === 'sg-game-event' && msg.eventName === 'levelFinish' && typeof msg.data === 'object') {
                const stack = new Error().stack || '';
                const fromGame = stack.includes('main.') || stack.includes('cocos2d') || stack.includes('index.');
                if (fromGame) {
                    (async () => {
                        let level = typeof msg.data.level === 'number' ? msg.data.level : (typeof msg.data.level === 'string' ? parseInt(msg.data.level, 10) : NaN);
                        if (isNaN(level) || level <= 0) level = detectLevel();
                        if (level === null || level <= 0) level = await decompressAndGetLevel();
                        const sanitizedScore = (level !== null && !isNaN(level) && level > 0) ? (Math.floor(level) * 1000) : 0;
                        if (sanitizedScore >= CONFIG.minScore) {
                            updateScoreHistory(sanitizedScore);
                            recordSnapshot(sanitizedScore);
                            if (proofState.hasInput) sendScore(sanitizedScore);
                        }
                    })();
                }
            }
            origPostMessage(msg, targetOrigin);
        };
    }

    async function init() {
        log('Initializing...');
        log('Game:', CONFIG.gameSlug);

        initHoneypot();
        startTracking();
        interceptPostMessage();
        await getNonce();

        await new Promise(r => {
            if (document.readyState === 'complete') r();
            else window.addEventListener('load', r);
        });

        await decompressAndGetLevel();
        let lastLoggedLevel = -1;
        let lastSentLevel = 0;
        setInterval(() => {
            decompressAndGetLevel().then(lv => {
                if (lv !== null && lv !== lastLoggedLevel) {
                    lastLoggedLevel = lv;
                }
                if (lv !== null && lv > lastSentLevel && proofState.hasInput) {
                    const score = Math.floor(lv) * 1000;
                    if (score >= CONFIG.minScore) {
                        lastSentLevel = lv;
                        updateScoreHistory(score);
                        recordSnapshot(score);
                        sendScore(score).then(r => {
                            if (r && r.ok && !r.newHighScore) showScoreSavedNotification(score, false);
                        });
                    }
                }
            });
        }, 2000);

        log('Ready!');
    }

    init();
})();
