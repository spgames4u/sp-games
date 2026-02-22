/**
 * sp-score.js - Score Bridge for sp.games
 * v6.0 - Game Integration Module
 */

(function() {
    'use strict';

    const gameSlugFallback = (() => {
        const parts = location.pathname.split('/').filter(Boolean);
        return new URLSearchParams(location.search).get('gameSlug') || parts[parts.length - 1] || 'gingerman-rescue';
    })();

    const guardKey = '__SP_SCORE_RUNNING_' + gameSlugFallback;
    if (window[guardKey]) {
        console.warn('[SP-Score] Already running, skipping duplicate instance');
        return;
    }
    window[guardKey] = true;

    const CONFIG = {
        apiUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/save-score'
            : 'https://sp.games/api/games/save-score',
        nonceUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/nonce'
            : 'https://sp.games/api/games/nonce',
        gameSlug: gameSlugFallback,
        minScore: 1,
        cooldownMs: 30000,
        pointsPerLevel: 100,
        maxLevels: 15,
        debug: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    };

    let completedLevelsSession = 0;
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

    const SNAP_CONFIG = {
        maxSnapshots: 10,
        minInterval: 1000,
    };
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
                let originAllowed = false;
                try {
                    const eOrigin = (e.origin || '').toLowerCase();
                    for (const allowed of allowedOrigins) {
                        const al = allowed.toLowerCase();
                        if (eOrigin === al || (al.includes('localhost') && eOrigin.startsWith('http://localhost')) ||
                            (al.includes('127.0.0.1') && eOrigin.startsWith('http://127.0.0.1'))) {
                            originAllowed = true;
                            break;
                        }
                    }
                } catch (err) { return; }
                if (!originAllowed) return;
                if (e.data && typeof e.data === 'object' &&
                    (e.data.type === 'SP_INPUT' || e.data.type === 'user_interaction' || e.data.hasInput === true)) {
                    if (!proofState.hasInput) proofState.hasInput = true;
                }
            });
        }

        if (!document.hidden) {
            proofState.visibleStart = Date.now();
        }
        if (document.hasFocus && document.hasFocus()) {
            proofState.focusStart = Date.now();
        }
    }

    function updateScoreHistory(score) {
        const now = Date.now();
        proofState.history.push({ score, timestamp: now });
        if (proofState.history.length > 5000) {
            proofState.history.shift();
        }
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
                    log('Nonce received');
                    return true;
                }
            }
        } catch (e) {
            log('Nonce request failed:', e.message);
        }
        return false;
    }

    const log = CONFIG.debug
        ? (...args) => console.log('%c[SP-Score]', 'color: #00c853; font-weight: bold', ...args)
        : () => {};

    function getCompletedLevelsFromSave() {
        return new Promise(function(resolve) {
            try {
                const req = indexedDB.open('_C2SaveStates');
                req.onerror = function() { resolve(0); };
                req.onsuccess = function() {
                    const db = req.result;
                    if (!db.objectStoreNames.contains('saves')) {
                        db.close();
                        return resolve(0);
                    }
                    const tx = db.transaction('saves', 'readonly');
                    const store = tx.objectStore('saves');
                    const getAll = store.getAll && store.getAll();
                    if (!getAll) return resolve(0);
                    getAll.onsuccess = function() {
                        const rows = getAll.result || [];
                        let best = 0;
                        for (let i = 0; i < rows.length; i++) {
                            try {
                                const s = rows[i].data;
                                const a = typeof s === 'string' ? JSON.parse(s) : s;
                                if (a && a.c2save && a.events && a.events.vars) {
                                    const v = a.events.vars;
                                    for (const k in v) {
                                        const n = k.toLowerCase();
                                        if (n.includes('level') && typeof v[k] === 'number' && v[k] >= 1 && v[k] <= CONFIG.maxLevels) {
                                            best = Math.max(best, v[k]);
                                        }
                                    }
                                }
                                if (a && a.rt && typeof a.rt.running_layout === 'number' && a.rt.running_layout >= 2) {
                                    best = Math.max(best, Math.min(a.rt.running_layout - 1, CONFIG.maxLevels));
                                }
                            } catch (e) {}
                        }
                        db.close();
                        resolve(Math.min(best, CONFIG.maxLevels));
                    };
                    getAll.onerror = function() { db.close(); resolve(0); };
                };
            } catch (e) {
                resolve(0);
            }
        });
    }

    const LEVEL_N_ID = '2607377724595618';
    const LEVEL_MAX_ID = '4889907286101801';
    function getCompletedLevelsFromRuntime() {
        try {
            const canvas = document.getElementById('c2canvas');
            const rt = (canvas && canvas.c2runtime) || window.c2runtime || (window.cr_getC2Runtime && window.cr_getC2Runtime());
            if (!rt) return 0;
            let best = 0;
            if (rt.Mh) {
                const ln = rt.Mh[LEVEL_N_ID], lm = rt.Mh[LEVEL_MAX_ID];
                if (ln != null && ln.data != null) best = Math.max(best, Math.floor(parseFloat(ln.data)));
                if (lm != null && lm.data != null) best = Math.max(best, Math.floor(parseFloat(lm.data)));
                if (best === 0) {
                    for (const name in rt.Mh) {
                        if (rt.Mh.hasOwnProperty(name) && rt.Mh[name].data != null) {
                            const v = Math.floor(parseFloat(rt.Mh[name].data));
                            if (v >= 1 && v <= CONFIG.maxLevels) best = Math.max(best, v);
                        }
                    }
                }
            }
            if (best > 0) return Math.min(best, CONFIG.maxLevels);
            if (rt.Ca && typeof rt.Ca.ja === 'number' && rt.Ca.ja >= 2 && rt.Ca.ja <= 16) {
                return Math.min(rt.Ca.ja - 1, CONFIG.maxLevels);
            }
        } catch (e) {}
        return 0;
    }

    let completedLevelsFromSave = 0;

    function getLevelBasedScore() {
        const fromRuntime = getCompletedLevelsFromRuntime();
        const fromSession = Math.min(completedLevelsSession, CONFIG.maxLevels);
        const completed = Math.max(fromRuntime, fromSession, completedLevelsFromSave);
        return Math.min(completed, CONFIG.maxLevels) * CONFIG.pointsPerLevel;
    }

    window.__SP_OnLevelEnd = function() {
        const stack = new Error().stack || '';
        if (!stack.includes('c2runtime') && !stack.includes('c2ctl')) return;
        completedLevelsSession++;
        if (CONFIG.debug) log('Level completed, session count:', completedLevelsSession);
        const levelBasedScore = getLevelBasedScore();
        if (levelBasedScore >= CONFIG.minScore && proofState.hasInput) {
            updateScoreHistory(levelBasedScore);
            recordSnapshot(levelBasedScore);
            sendScore(levelBasedScore);
        }
    };

    function processScore(arg) {
        const stack = new Error().stack || '';
        const fromGame = stack.includes('c2runtime') || stack.includes('c2ctl');

        if (!fromGame) {
            const raw = (typeof arg === 'object' && arg !== null && 'score' in arg) ? arg.score : arg;
            console.log('%c✅ Gingerman Rescue: New high score!', 'color: #00c853; font-weight: bold', raw);
            return;
        }

        let levelBasedScore = 0;
        if (typeof arg === 'object' && arg !== null && 'level' in arg) {
            const lvl = Math.min(Math.max(Math.floor(arg.level) || 0, 1), CONFIG.maxLevels);
            if (lvl > 0) {
                levelBasedScore = lvl * CONFIG.pointsPerLevel;
                completedLevelsSession = Math.max(completedLevelsSession, lvl);
            }
        }
        if (levelBasedScore === 0) {
            const rawScore = typeof arg === 'object' && arg !== null && 'score' in arg ? arg.score : arg;
            const raw = Math.floor(parseFloat(rawScore)) || 0;
            if (raw >= 100 && raw <= 1500 && raw % 100 === 0) {
                levelBasedScore = raw;
                completedLevelsSession = Math.max(completedLevelsSession, raw / 100);
            }
        }
        if (levelBasedScore === 0) levelBasedScore = getLevelBasedScore();

        if (levelBasedScore >= CONFIG.minScore) {
            updateScoreHistory(levelBasedScore);
            recordSnapshot(levelBasedScore);
            if (!proofState.hasInput) return;
            sendScore(levelBasedScore);
        }
    }

    window.__ctlArcadeSaveScore = function(arg) {
        processScore(arg);
    };
    try {
        if (window.parent !== window) {
            window.parent.__ctlArcadeSaveScore = window.__ctlArcadeSaveScore;
        }
    } catch (e) {}

    async function sendScore(score) {
        const now = Date.now();
        if (isSending || score < CONFIG.minScore) return false;

        if (score <= lastSentScore) {
            if ((now - lastSentTime) < CONFIG.cooldownMs) {
                return false;
            }
        }

        if (score === lastFailedScore) {
            const timeSinceFailure = now - lastFailedTime;
            if (timeSinceFailure < 10000) {
                return false;
            }
        }

        const failedData = failedAttempts.get(score);
        if (failedData && failedData.count >= 3) {
            const timeSinceLastAttempt = now - failedData.lastAttempt;
            if (timeSinceLastAttempt < 10000) {
                log('Backoff:', score);
                return false;
            }
        }

        if (!currentNonce) {
            const gotNonce = await getNonce();
            if (!gotNonce) {
                log('Failed to get nonce, skipping send');
                return false;
            }
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
                    log('Save failed:', result.error);
                    const fd = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
                    fd.count++;
                    fd.lastAttempt = Date.now();
                    failedAttempts.set(score, fd);
                    lastFailedScore = score;
                    lastFailedTime = Date.now();
                    currentNonce = null;

                    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                    for (const [s, data] of failedAttempts.entries()) {
                        if (data.lastAttempt < fiveMinutesAgo) {
                            failedAttempts.delete(s);
                        }
                    }
                }
            } else {
                log('HTTP Error:', response.status);
                const fd = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
                fd.count++;
                fd.lastAttempt = Date.now();
                failedAttempts.set(score, fd);
                lastFailedScore = score;
                lastFailedTime = Date.now();
                currentNonce = null;
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
        const message = isArabic ? '🎉 رقم قياسي!' : '🎉 New High Score!';
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

        getCompletedLevelsFromSave().then(function(n) {
            completedLevelsFromSave = n;
            if (CONFIG.debug && n > 0) log('Loaded completed levels from save:', n);
        });

        function reinstallHandler() {
            window.__ctlArcadeSaveScore = function(arg) {
                processScore(arg);
            };
            try {
                if (window.parent !== window) {
                    window.parent.__ctlArcadeSaveScore = window.__ctlArcadeSaveScore;
                }
            } catch (e) {}
        }
        reinstallHandler();
        setInterval(reinstallHandler, 500);

        window.addEventListener('beforeunload', () => {
            const lastScore = proofState.history.length > 0
                ? proofState.history[proofState.history.length - 1].score
                : 0;
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
                navigator.sendBeacon?.(CONFIG.apiUrl, JSON.stringify(payload));
            }
        });

        log('Ready!');
    }

    init();
})();
