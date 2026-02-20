/**
 * sp-score.js - Score Bridge for sp.games + Game Integration Module
 */

(function() {
    'use strict';

    function getGameSlug() {
        const params = new URLSearchParams(location.search);
        if (params.get('gameSlug')) return params.get('gameSlug');
        const parts = location.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || 'lucy-all-season-fashionista';
    }

    const guardKey = '__SP_SCORE_RUNNING_' + getGameSlug();
    if (window[guardKey]) return;
    window[guardKey] = true;

    const CONFIG = {
        apiUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/save-score'
            : 'https://new.sp.games/api/games/save-score',
        nonceUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/nonce'
            : 'https://new.sp.games/api/games/nonce',
        gameSlug: getGameSlug(),
        pollInterval: 3000,
        minScore: 1,
        minScoreToSend: 4,
        displayScore: 400,
        cooldownMs: 30000,
        debug: new URLSearchParams(location.search).get('scorepointDebug') === '1'
    };

    let projectId = null;
    let lastSentScore = 0;
    let lastSentTime = 0;
    let isSending = false;
    let currentNonce = null;
    let failedAttempts = new Map();
    let lastFailedScore = null;
    let lastFailedTime = 0;
    let pollIntervalId = null;
    let currentGameSlug = CONFIG.gameSlug;

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
            const value = {
                v: 1,
                t: now,
                n: Math.random().toString(36).substring(2, 15)
            };
            originalHoneypot[key] = JSON.stringify(value);
            try {
                localStorage.setItem(key, originalHoneypot[key]);
            } catch (e) {}
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
                            stored !== originalHoneypot[key]) {
                            touched = true;
                        }
                    } catch (e) {
                        touched = true;
                    }
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
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (proofState.visibleStart) {
                    proofState.visibleMs += Date.now() - proofState.visibleStart;
                    proofState.visibleStart = null;
                }
            } else {
                proofState.visibleStart = Date.now();
            }
        });

        window.addEventListener('focus', () => {
            proofState.focusStart = Date.now();
        });
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

        if (window.self !== window.top) {
            inputEvents.forEach(event => {
                window.addEventListener(event, () => {
                    if (!proofState.hasInput) proofState.hasInput = true;
                }, { once: false, passive: true, capture: true });
            });
        }

        if (window.parent !== window) {
            const allowedOrigins = [
                'http://localhost:4000',
                'http://127.0.0.1:4000',
                'https://sp.games',
                'https://new.sp.games'
            ];
            window.addEventListener('message', (e) => {
                try {
                    const eOrigin = e.origin.toLowerCase();
                    let originAllowed = allowedOrigins.some(allowed =>
                        eOrigin === allowed.toLowerCase() ||
                        (allowed.includes('localhost') && eOrigin.startsWith('http://localhost')) ||
                        (allowed.includes('127.0.0.1') && eOrigin.startsWith('http://127.0.0.1'))
                    );
                    if (!originAllowed) return;
                } catch (err) { return; }
                if (e.data && typeof e.data === 'object' &&
                    (e.data.type === 'SP_INPUT' || e.data.type === 'user_interaction' || e.data.hasInput === true)) {
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
                method: 'GET',
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.nonce) {
                    currentNonce = data.nonce;
                    if (CONFIG.debug) log('Nonce received');
                    return true;
                }
            }
        } catch (e) {
            if (CONFIG.debug) log('Nonce request failed');
        }
        return false;
    }

    const log = CONFIG.debug ? (...args) => console.log('%c[SP-Score]', 'color: #00c853; font-weight: bold', ...args) : () => {};

    async function detectProjectId() {
        try {
            const resp = await fetch('data.json');
            const data = await resp.json();
            if (data.project && data.project[31]) {
                const pid = data.project[31];
                try { localStorage.setItem(`sp_pid_${CONFIG.gameSlug}`, pid); } catch (e) {}
                return pid;
            }
        } catch (e) {
            if (CONFIG.debug) log('Failed to read data.json');
        }
        try {
            const cached = localStorage.getItem(`sp_pid_${CONFIG.gameSlug}`);
            if (cached) return cached;
        } catch (e) {}
        if (indexedDB.databases) {
            try {
                const dbs = await indexedDB.databases();
                for (const db of dbs) {
                    if (db.name && db.name.startsWith('c3-localstorage-')) {
                        const pid = db.name.replace('c3-localstorage-', '');
                        try { localStorage.setItem(`sp_pid_${CONFIG.gameSlug}`, pid); } catch (e) {}
                        return pid;
                    }
                }
            } catch (e) {}
        }
        return null;
    }

    function readIndexedDB(dbName) {
        return new Promise((resolve) => {
            const request = indexedDB.open(dbName);
            request.onerror = () => resolve({});
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('keyvaluepairs')) {
                    db.close();
                    return resolve({});
                }
                const tx = db.transaction('keyvaluepairs', 'readonly');
                const store = tx.objectStore('keyvaluepairs');
                const result = {};
                const cursor = store.openCursor();
                cursor.onsuccess = (e) => {
                    const c = e.target.result;
                    if (c) { result[c.key] = c.value; c.continue(); }
                    else { db.close(); resolve(result); }
                };
                cursor.onerror = () => { db.close(); resolve({}); };
            };
        });
    }

    const MAX_STAGE = 999;
    const STAGE_KEYS = ['Level', 'level', 'Level_Reached', 'level_reached', 'currentLevel', 'stagesCompleted', 'completedLevels', 'LayoutIndex', 'layoutIndex', 'seasonsCompleted', 'SeasonsComplete', 'lastLayout'];

    async function detectScore() {
        if (!projectId) return null;
        try {
            const data = await readIndexedDB('c3-localstorage-' + projectId);
            if (CONFIG.debug && !detectScore._loggedKeys) {
                detectScore._loggedKeys = true;
                const keys = Object.keys(data);
                log('IndexedDB keys:', keys.length ? keys.slice(0, 20) : '(empty)');
            }
            let currentStage = 0;
            for (const [key, value] of Object.entries(data)) {
                if (STAGE_KEYS.includes(key)) {
                    const num = parseInt(value, 10);
                    if (!isNaN(num) && num >= 1 && num <= MAX_STAGE) {
                        currentStage = Math.max(currentStage, num);
                    }
                }
            }
            if (currentStage >= 3) {
                const scoreToSend = CONFIG.displayScore || 400;
                updateScoreHistory(scoreToSend);
                recordSnapshot(scoreToSend);
                return scoreToSend;
            }
            if (currentStage >= 1) {
                updateScoreHistory(currentStage);
                recordSnapshot(currentStage);
                return currentStage;
            }
            let best = 0, last = 0;
            for (const [key, value] of Object.entries(data)) {
                const num = parseFloat(value);
                if (isNaN(num) || num < 0) continue;
                const k = key.toLowerCase();
                if (k.includes('best') || k.includes('high')) best = Math.max(best, num);
                if (k.includes('last') || k.includes('score')) last = Math.max(last, num);
            }
            const detected = Math.floor(last || best) || null;
            if (detected) {
                updateScoreHistory(detected);
                recordSnapshot(detected);
            }
            return detected;
        } catch (e) { return null; }
    }

    async function sendScore(score) {
        const now = Date.now();
        if (isSending || score < CONFIG.minScore) return false;
        const minSend = CONFIG.minScoreToSend || CONFIG.minScore;
        if (score !== (CONFIG.displayScore || 400) && score < minSend) return false;

        if (score <= lastSentScore) {
            if ((now - lastSentTime) < CONFIG.cooldownMs) return false;
        }

        if (score === lastFailedScore) {
            if ((now - lastFailedTime) < 10000) return false;
        }

        const failedData = failedAttempts.get(score);
        if (failedData && failedData.count >= 3) {
            if ((now - failedData.lastAttempt) < 10000) return false;
        }

        if (!currentNonce) {
            const gotNonce = await getNonce();
            if (!gotNonce) return false;
        }

        isSending = true;
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
                    lastSentScore = score;
                    lastSentTime = now;
                    currentNonce = null;
                    resetProof();
                    snapshots = [];
                    lastSnapTime = 0;
                    setTimeout(() => getNonce(), 100);
                    if (window.parent !== window) {
                        window.parent.postMessage({
                            type: 'SP_SCORE_SAVED',
                            score: score,
                            result: result,
                            gameSlug: CONFIG.gameSlug
                        }, '*');
                    }
                    showNotification(score, result.newHighScore);
                    return true;
                } else {
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

    function showNotification(score, isNewHigh) {
        if (window.innerWidth < 300) return;
        const div = document.createElement('div');
        const lang = document.documentElement.lang || navigator.language || 'en';
        const isArabic = lang.startsWith('ar');
        const message = isNewHigh
            ? (isArabic ? '🎉 رقم قياسي!' : '🎉 New High Score!')
            : (isArabic ? '✅ تم حفظ النتيجة' : '✅ Score saved');
        const direction = isArabic ? 'rtl' : 'ltr';
        div.innerHTML = message + '<br><b>' + score.toLocaleString() + '</b>';
        div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:16px 32px;border-radius:25px;font:bold 16px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.4);z-index:2147483647;direction:' + direction + ';pointer-events:none;';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3500);
    }

    async function poll() {
        if (isSending) return;
        if (!proofState.hasInput) return;

        const score = await detectScore();
        if (!score) return;

        const now = Date.now();
        if (score > lastSentScore) {
            await sendScore(score);
        } else if ((now - lastSentTime) >= CONFIG.cooldownMs && score > 0 && score !== lastSentScore) {
            await sendScore(score);
        }
    }

    async function init() {
        initHoneypot();
        startTracking();

        await new Promise(r => {
            if (document.readyState === 'complete') r();
            else window.addEventListener('load', r);
        });

        await new Promise(r => setTimeout(r, 2500));

        projectId = await detectProjectId();
        if (!projectId) return;

        await getNonce();

        pollIntervalId = setInterval(() => {
            const newGameSlug = getGameSlug();
            if (newGameSlug !== currentGameSlug) {
                if (pollIntervalId) {
                    clearInterval(pollIntervalId);
                    pollIntervalId = null;
                }
                delete window[guardKey];
                return;
            }
            poll();
        }, CONFIG.pollInterval);

        const cleanup = () => {
            if (pollIntervalId) {
                clearInterval(pollIntervalId);
                pollIntervalId = null;
            }
            delete window[guardKey];
        };

        window.addEventListener('beforeunload', async () => {
            cleanup();
            const score = await detectScore();
            const minSend = CONFIG.minScoreToSend || CONFIG.minScore;
            if (score && score >= minSend) {
                const now = Date.now();
                if (score > lastSentScore || ((now - lastSentTime) >= CONFIG.cooldownMs && score > 0)) {
                    if (snapshots.length === 0 || snapshots[snapshots.length - 1].s !== score) {
                        snapshots.push({ t: Date.now(), s: score });
                        if (snapshots.length > SNAP_CONFIG.maxSnapshots) snapshots.shift();
                    }
                    navigator.sendBeacon && navigator.sendBeacon(CONFIG.apiUrl, JSON.stringify({
                        gameSlug: CONFIG.gameSlug,
                        score: score,
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
                    }));
                }
            }
        });

        window.addEventListener('pagehide', cleanup);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) poll();
        });
        setTimeout(poll, 1000);
    }

    window.ctlArcadeSaveScore = function(s) {
        const score = Math.floor(Math.abs(Number(s))) || 0;
        if (score === (CONFIG.displayScore || 400) && proofState.hasInput) {
            updateScoreHistory(score);
            recordSnapshot(score);
            sendScore(score);
        } else {
            console.log('%c✅ Fashion score saved: ' + s, 'color: #e91e63; font-weight: bold');
        }
    };

    try {
        const bc = new BroadcastChannel('sp_lucy_score');
        bc.onmessage = function(e) {
            if (e.data && e.data.type === 'SP_SAVE_SCORE' && e.data.score === 400) {
                if (proofState.hasInput) {
                    updateScoreHistory(400);
                    recordSnapshot(400);
                    sendScore(400);
                }
            }
        };
    } catch (err) {}

    const _origLog = console.log.bind(console);
    console.log = function(...args) {
        const msg = args[0] != null ? String(args[0]) : '';
        if (msg.indexOf('nex work') !== -1) {
            if (proofState.hasInput) {
                updateScoreHistory(400);
                recordSnapshot(400);
                sendScore(400);
            }
            return;
        }
        return _origLog.apply(console, args);
    };

    init();
})();
