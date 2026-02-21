/**
 * sp-score.js - Score Bridge for sp.games
 * v6.0 - Game Integration Module
 */

(function() {
    'use strict';
    
    const guardKey = '__SP_SCORE_RUNNING_' + (() => {
        const parts = location.pathname.split('/').filter(Boolean);
        return new URLSearchParams(location.search).get('gameSlug') || parts[parts.length - 1] || 'ninja-dash';
    })();
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
        gameSlug: (() => {
            const parts = location.pathname.split('/').filter(Boolean);
            return new URLSearchParams(location.search).get('gameSlug') || parts[parts.length - 1] || 'ninja-dash';
        })(),
        pollInterval: 3000,
        minScore: 1,
        cooldownMs: 30000,
        debug: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
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
        let inputDetectedLogged = false;
        
        inputEvents.forEach(event => {
            document.addEventListener(event, () => {
                if (!proofState.hasInput) {
                    proofState.hasInput = true;
                    if (!inputDetectedLogged) {
                        log('✅ Input detected:', event);
                        inputDetectedLogged = true;
                    }
                }
            }, { once: false, passive: true, capture: true });
        });
        
        if (window.self !== window.top) {
            inputEvents.forEach(event => {
                window.addEventListener(event, () => {
                    if (!proofState.hasInput) {
                        proofState.hasInput = true;
                        if (!inputDetectedLogged) {
                            log('✅ Input detected:', event);
                            inputDetectedLogged = true;
                        }
                    }
                }, { once: false, passive: true, capture: true });
            });
        }
        
        if (window.parent !== window) {
            const allowedOrigins = [
                'http://localhost:4000',
                'http://127.0.0.1:4000',
                'https://sp.games',
                'https://sp.games'
            ];
            
            window.addEventListener('message', (e) => {
                let originAllowed = false;
                try {
                    const eOrigin = e.origin.toLowerCase();
                    for (const allowed of allowedOrigins) {
                        const allowedLower = allowed.toLowerCase();
                        if (eOrigin === allowedLower || 
                            (allowedLower.includes('localhost') && eOrigin.startsWith('http://localhost')) ||
                            (allowedLower.includes('127.0.0.1') && eOrigin.startsWith('http://127.0.0.1'))) {
                            originAllowed = true;
                            break;
                        }
                    }
                } catch (err) {
                    return;
                }
                
                if (!originAllowed) return;
                
                if (e.data && typeof e.data === 'object' && 
                    (e.data.type === 'SP_INPUT' || e.data.type === 'user_interaction' || e.data.hasInput === true)) {
                    if (!proofState.hasInput) {
                        proofState.hasInput = true;
                        if (!inputDetectedLogged) {
                            log('✅ Input detected via postMessage');
                            inputDetectedLogged = true;
                        }
                    }
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
                    log('🔑 Nonce received');
                    return true;
                }
            }
        } catch (e) {
            log('⚠️ Nonce request failed:', e.message);
        }
        return false;
    }
    
    const log = CONFIG.debug 
        ? (...args) => console.log('%c[SP-Score]', 'color: #00c853; font-weight: bold', ...args)
        : () => {};
    
    async function detectProjectId() {
        try {
            const resp = await fetch('data.json');
            const data = await resp.json();
            if (data.project?.[31]) {
                const pid = data.project[31];
                try {
                    localStorage.setItem(`sp_pid_${CONFIG.gameSlug}`, pid);
                } catch (e) {}
                return pid;
            }
        } catch (e) {
            log('⚠️ Failed to read data.json:', e.message);
        }
        
        try {
            const cached = localStorage.getItem(`sp_pid_${CONFIG.gameSlug}`);
            if (cached) {
                log('📦 Using cached projectId from localStorage');
                return cached;
            }
        } catch (e) {}
        
        if (indexedDB.databases) {
            try {
                const dbs = await indexedDB.databases();
                for (const db of dbs) {
                    if (db.name?.startsWith('c3-localstorage-')) {
                        const pid = db.name.replace('c3-localstorage-', '');
                        try {
                            localStorage.setItem(`sp_pid_${CONFIG.gameSlug}`, pid);
                        } catch (e) {}
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
    
    async function detectScore() {
        if (!projectId) return null;
        try {
            const data = await readIndexedDB('c3-localstorage-' + projectId);
            let best = 0, last = 0;
            for (const [key, value] of Object.entries(data)) {
                const num = parseFloat(value);
                if (isNaN(num) || num < 0) continue;
                const k = key.toLowerCase();
                if (k.includes('best') || k.includes('high')) best = Math.max(best, num);
                if (k.includes('last')) last = Math.max(last, num);
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
                log('⚠️ Score failed 3 times, backoff:', score, 'wait', Math.ceil((10000 - timeSinceLastAttempt) / 1000), 's');
                return false;
            }
        }
        
        if (!currentNonce) {
            log('⚠️ No nonce, requesting...');
            const gotNonce = await getNonce();
            if (!gotNonce) {
                log('❌ Failed to get nonce, skipping send');
                return false;
            }
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
        
        const proofSummary = {
            visibleMs: proofData.visibleMs,
            focusMs: proofData.focusMs,
            hasInput: proofData.hasInput,
            historyLength: proofData.historyLength,
            historySpanMs: proofData.historySpanMs,
            presenceMs: Math.min(proofData.focusMs, proofData.visibleMs)
        };
        log('[SP-Score] Sending:', {
            score,
            nonce: !!currentNonce,
            noncePreview: currentNonce ? currentNonce.substring(0, 8) + '...' : 'null',
            proofSummary
        });
        
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
                    log('✅ Score saved!', result);
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
                    log('⚠️ Save failed:', result.error);
                    const failedData = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
                    failedData.count++;
                    failedData.lastAttempt = Date.now();
                    failedAttempts.set(score, failedData);
                    
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
                log('❌ HTTP Error:', response.status);
                const failedData = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
                failedData.count++;
                failedData.lastAttempt = Date.now();
                failedAttempts.set(score, failedData);
                lastFailedScore = score;
                lastFailedTime = Date.now();
                currentNonce = null;
            }
        } catch (e) {
            log('❌ Error:', e.message);
            const failedData = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
            failedData.count++;
            failedData.lastAttempt = Date.now();
            failedAttempts.set(score, failedData);
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
    
    async function poll() {
        if (isSending) return;
        
        if (!proofState.hasInput) {
            if (CONFIG.debug && !proofState._hasInputLogged) {
                log('⏳ Waiting for user input before sending score...');
                proofState._hasInputLogged = true;
            }
            return;
        }
        
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
        log('Initializing...');
        log('Game:', CONFIG.gameSlug);
        
        initHoneypot();
        startTracking();
        
        await new Promise(r => {
            if (document.readyState === 'complete') r();
            else window.addEventListener('load', r);
        });
        
        await new Promise(r => setTimeout(r, 2500));
        
        projectId = await detectProjectId();
        if (!projectId) { log('❌ Not a Construct 3 game'); return; }
        
        await getNonce();
        
        log('✅ Ready! Project:', projectId);
        
        pollIntervalId = setInterval(() => {
            const newGameSlug = (() => {
                const parts = location.pathname.split('/').filter(Boolean);
                return new URLSearchParams(location.search).get('gameSlug') || parts[parts.length - 1] || 'ninja-dash';
            })();
            
            if (newGameSlug !== currentGameSlug) {
                log('⚠️ Game slug changed, stopping poll:', currentGameSlug, '→', newGameSlug);
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
            if (score) {
                const now = Date.now();
                if (score > lastSentScore || ((now - lastSentTime) >= CONFIG.cooldownMs && score > 0)) {
                    if (snapshots.length === 0 || snapshots[snapshots.length - 1].s !== score) {
                        snapshots.push({ t: Date.now(), s: score });
                        if (snapshots.length > SNAP_CONFIG.maxSnapshots) snapshots.shift();
                    }
                    navigator.sendBeacon?.(CONFIG.apiUrl, JSON.stringify({
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
        console.log('%c🥷 Ninja score saved: ' + s, 'color: #9c27b0; font-weight: bold');
    };
    
    init();
})();
