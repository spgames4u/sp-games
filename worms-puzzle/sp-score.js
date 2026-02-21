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
        return parts[parts.length - 1] || 'worms-puzzle';
    }

    const guardKey = '__SP_SCORE_RUNNING_' + getGameSlug();
    if (window[guardKey]) return;
    window[guardKey] = true;

    const CONFIG = {
        apiUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/save-score'
            : 'https://sp.games/api/games/save-score',
        nonceUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/nonce'
            : 'https://sp.games/api/games/nonce',
        gameSlug: getGameSlug(),
        minScore: 100,
        cooldownMs: 30000,
        pollInterval: 3000,
        pointsPerLevel: 100,
        maxLevels: 80,
        debug: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    };

    let lastSentScore = 0;
    let lastSentTime = 0;
    let isSending = false;
    let currentNonce = null;
    let failedAttempts = new Map();
    let lastFailedScore = null;
    let lastFailedTime = 0;
    let pollIntervalId = null;

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
                    log('Nonce received');
                    return true;
                }
            }
        } catch (e) { log('Nonce request failed:', e.message); }
        return false;
    }

    const log = CONFIG.debug ? (...args) => console.log('%c[SP-Score]', 'color: #00c853; font-weight: bold', ...args) : () => {};

    function parseCompletedLevelsFromC2Save(jsonStr) {
        if (!jsonStr || typeof jsonStr !== 'string') return 0;
        try {
            const o = JSON.parse(jsonStr);
            if (!o || !o.c2save) return 0;
            let maxLevel = 0;
            function scan(obj) {
                if (!obj) return;
                if (typeof obj === 'number') {
                    const n = Math.floor(obj);
                    if (n >= 1 && n <= CONFIG.maxLevels) maxLevel = Math.max(maxLevel, n);
                    return;
                }
                if (Array.isArray(obj)) {
                    const completedCount = obj.filter(v => (parseFloat(v) || 0) > 0).length;
                    if (completedCount > 0 && completedCount <= CONFIG.maxLevels) {
                        maxLevel = Math.max(maxLevel, completedCount);
                    }
                    obj.forEach(scan);
                    return;
                }
                if (typeof obj === 'object') {
                    Object.values(obj).forEach(scan);
                }
            }
            if (o.events && o.events.vars) scan(o.events.vars);
            if (o.types) scan(o.types);
            return maxLevel;
        } catch (e) { return 0; }
    }

    function readLevelsOpenFromStorage() {
        try {
            const v = localStorage.getItem('Levels Open');
            if (v !== null && v !== undefined) {
                const n = Math.floor(parseFloat(v));
                if (n >= 0 && n <= CONFIG.maxLevels) return n;
            }
        } catch (e) {}
        return null;
    }

    function readLevelsOpenFromIndexedDB() {
        return new Promise((resolve) => {
            if (!indexedDB.databases) return resolve(null);
            indexedDB.databases().then(dbs => {
                if (!dbs || !dbs.length) return resolve(null);
                let found = null;
                let pending = dbs.length;
                const check = () => {
                    pending--;
                    if (found !== null || pending <= 0) resolve(found);
                };
                dbs.forEach(dbInfo => {
                    if (!dbInfo.name || found !== null) return check();
                    try {
                        const req = indexedDB.open(dbInfo.name);
                        req.onerror = () => check();
                        req.onsuccess = () => {
                            const db = req.result;
                            const storeNames = [...db.objectStoreNames];
                            let storesDone = 0;
                            storeNames.forEach(storeName => {
                                try {
                                    const tx = db.transaction(storeName, 'readonly');
                                    const store = tx.objectStore(storeName);
                                    const cursor = store.openCursor();
                                    cursor.onsuccess = () => {
                                        const c = cursor.result;
                                        if (!c) {
                                            storesDone++;
                                            if (storesDone >= storeNames.length) { db.close(); check(); }
                                            return;
                                        }
                                        const key = String(c.key || c.value?.key || '').toLowerCase();
                                        const val = c.value?.value ?? c.value;
                                        if (key.includes('levels') && key.includes('open')) {
                                            const n = Math.floor(parseFloat(val));
                                            if (!isNaN(n) && n >= 0 && n <= CONFIG.maxLevels) found = n;
                                        }
                                        if (found === null) c.continue();
                                        else { db.close(); check(); }
                                    };
                                    cursor.onerror = () => { storesDone++; if (storesDone >= storeNames.length) { db.close(); check(); } };
                                } catch (e) { storesDone++; }
                            });
                            if (storeNames.length === 0) { db.close(); check(); }
                        };
                    } catch (e) { check(); }
                });
            }).catch(() => resolve(null));
        });
    }

    async function detectScoreFromC2Save() {
        let completedLevels = readLevelsOpenFromStorage();
        if (completedLevels === null) completedLevels = await readLevelsOpenFromIndexedDB();
        if (completedLevels !== null && completedLevels >= 1) {
            return levelToScore(completedLevels);
        }
        let jsonStr = null;
        for (const slot of ['0', '1', '2']) {
            try {
                const v = localStorage.getItem('__c2save_' + slot);
                if (v) { jsonStr = v; break; }
            } catch (e) {}
        }
        if (!jsonStr && indexedDB.open) {
            try {
                const db = await new Promise((res, rej) => {
                    const r = indexedDB.open('_C2SaveStates');
                    r.onsuccess = () => res(r.result);
                    r.onerror = () => res(null);
                });
                if (db && db.objectStoreNames.contains('saves')) {
                    const data = await new Promise(res => {
                        const r = db.transaction('saves').objectStore('saves').get('0');
                        r.onsuccess = () => { db.close(); res(r.result?.data || null); };
                        r.onerror = () => { db.close(); res(null); };
                    });
                    if (data) jsonStr = data;
                } else if (db) db.close();
            } catch (e) {}
        }
        if (jsonStr) {
            completedLevels = parseCompletedLevelsFromC2Save(jsonStr);
            if (completedLevels >= 1) return levelToScore(completedLevels);
        }
        return null;
    }

    function levelToScore(level) {
        const completed = Math.min(Math.max(0, Math.floor(level)), CONFIG.maxLevels);
        return completed * CONFIG.pointsPerLevel;
    }

    function processScore(iScore) {
        const stack = new Error().stack || '';
        const fromGame = stack.includes('c2runtime');

        if (!fromGame) {
            const raw = (typeof iScore === 'object' && iScore !== null && 'score' in iScore) ? iScore.score : iScore;
            console.log('%c✅ Worms puzzle: ' + raw + ' points recorded', 'color: #00c853; font-weight: bold');
            return;
        }

        const rawVal = Math.floor(Math.abs(typeof iScore === 'object' && iScore !== null && 'score' in iScore ? iScore.score : iScore)) || 0;
        let score = rawVal;
        if (rawVal >= 1 && rawVal <= CONFIG.maxLevels) {
            score = levelToScore(rawVal);
        }
        if (score >= CONFIG.minScore) {
            updateScoreHistory(score);
            recordSnapshot(score);
            if (!proofState.hasInput) return;
            sendScore(score);
        }
    }

    let originalCtlArcadeSaveScore = window.ctlArcadeSaveScore;

    function newCtlArcadeSaveScore(iScore) {
        processScore(iScore);
        if (typeof originalCtlArcadeSaveScore === 'function') {
            originalCtlArcadeSaveScore(iScore);
        }
    }

    window.ctlArcadeSaveScore = newCtlArcadeSaveScore;

    function reinstallHandler() {
        if (window.ctlArcadeSaveScore !== newCtlArcadeSaveScore) {
            if (typeof window.ctlArcadeSaveScore === 'function') {
                originalCtlArcadeSaveScore = window.ctlArcadeSaveScore;
            }
            window.ctlArcadeSaveScore = newCtlArcadeSaveScore;
        }
    }

    async function sendScore(score) {
        const now = Date.now();
        if (isSending || score < CONFIG.minScore) return false;
        if (score <= lastSentScore && (now - lastSentTime) < CONFIG.cooldownMs) return false;
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
                    return true;
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

        await new Promise(r => {
            if (document.readyState === 'complete') r();
            else window.addEventListener('load', r);
        });

        await getNonce();

        reinstallHandler();
        setInterval(reinstallHandler, 500);

        async function poll() {
            if (isSending || !proofState.hasInput) return;
            const score = await detectScoreFromC2Save();
            if (!score || score < CONFIG.minScore) return;
            if (score > lastSentScore || ((Date.now() - lastSentTime) >= CONFIG.cooldownMs && score !== lastSentScore)) {
                updateScoreHistory(score);
                recordSnapshot(score);
                await sendScore(score);
            }
        }

        pollIntervalId = setInterval(poll, CONFIG.pollInterval);
        document.addEventListener('visibilitychange', () => { if (document.hidden) poll(); });
        setTimeout(poll, 1500);

        window.addEventListener('beforeunload', async () => {
            let lastScore = proofState.history.length > 0 ? proofState.history[proofState.history.length - 1].score : 0;
            const fromStorage = await detectScoreFromC2Save();
            if (fromStorage && fromStorage > lastScore) lastScore = fromStorage;
            if (lastScore >= CONFIG.minScore && lastScore > lastSentScore && currentNonce) {
                if (snapshots.length === 0 || snapshots[snapshots.length - 1].s !== lastScore) {
                    snapshots.push({ t: Date.now(), s: lastScore });
                    if (snapshots.length > SNAP_CONFIG.maxSnapshots) snapshots.shift();
                }
                const payload = {
                    gameSlug: CONFIG.gameSlug,
                    score: lastScore,
                    nonce: currentNonce,
                    proof: {
                        visibleMs: proofState.visibleMs,
                        focusMs: proofState.focusMs,
                        hasInput: proofState.hasInput,
                        historyLength: proofState.historyLength,
                        historySpanMs: proofState.historySpanMs
                    },
                    honeypotTouched: checkHoneypot(),
                    snapshots: snapshots.map(s => ({ t: s.t, s: s.s }))
                };
                navigator.sendBeacon?.(CONFIG.apiUrl, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
            }
        });

        window.addEventListener('pagehide', () => {
            if (pollIntervalId) { clearInterval(pollIntervalId); pollIntervalId = null; }
        });

        log('Ready!');
    }

    init();
})();
