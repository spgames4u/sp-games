/**
 * sp-score.js - Score Bridge for sp.games
 * v6.0 - Game Integration Module
 */

(function() {
    'use strict';
    
    window.__ctlArcadeSaveScore = function(data) {};
    
    window.addEventListener('load', function() {
        setTimeout(function() {
            var _origEval = window.eval;
            window.eval = function(code) {
                if (typeof code === 'string'
                    && code.indexOf('parent.__ctlArcadeSaveScore') !== -1) {
                    code = code.replace(
                        /parent\.__ctlArcadeSaveScore/g,
                        'window.__ctlArcadeSaveScore'
                    );
                }
                return _origEval.call(window, code);
            };
            console.log('[sp-score] eval patch applied after game load');
        }, 3000);
    });
    
    const guardKey = '__SP_SCORE_RUNNING_' + (
        new URLSearchParams(location.search).get('gameSlug')
        || (() => {
            const parts = location.pathname.split('/').filter(Boolean);
            return parts[parts.length - 1] || 'connect-4';
        })()
    );
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
        gameSlug: new URLSearchParams(location.search).get('gameSlug')
            || (() => {
                const parts = location.pathname.split('/').filter(Boolean);
                return parts[parts.length - 1] || 'connect-4';
            })(),
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
                        log('Input detected:', event);
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
                            log('Input detected:', event);
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
                            log('Input detected via postMessage');
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
    
    function newCtlArcadeSaveScore(arg) {
        const stack = new Error().stack || '';
        const fromGame = stack.includes('c3runtime');
        
        const raw = (typeof arg === 'object' && arg !== null && 'score' in arg) ? arg.score : arg;
        
        if (!fromGame) {
            const disp = (typeof raw === 'number' && !isNaN(raw)) ? raw : (typeof raw === 'object' ? 0 : raw);
            console.log('%c[Connect 4] New high score: ' + disp + '!', 'color: #1976d2; font-weight: bold');
            return;
        }
        
        const sanitizedScore = Math.floor(Math.abs(raw)) || 0;
        if (sanitizedScore >= CONFIG.minScore) {
            updateScoreHistory(sanitizedScore);
            recordSnapshot(sanitizedScore);
            if (proofState.hasInput) {
                sendScore(sanitizedScore);
            }
        }
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
                log('Score failed 3 times, backoff:', score);
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
                        try {
                            window.parent.postMessage({
                                type: 'SP_SCORE_SAVED',
                                score: score,
                                result: result,
                                gameSlug: CONFIG.gameSlug
                            }, '*');
                        } catch (e) {}
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
    
    window.__ctlArcadeSaveScore = newCtlArcadeSaveScore;
    
    function reinstallHandler() {
        if (window.__ctlArcadeSaveScore !== newCtlArcadeSaveScore) {
            window.__ctlArcadeSaveScore = newCtlArcadeSaveScore;
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
        
        await getNonce();
        
        reinstallHandler();
        setInterval(reinstallHandler, 500);
        
        log('Ready!');
    }
    
    init();
})();
