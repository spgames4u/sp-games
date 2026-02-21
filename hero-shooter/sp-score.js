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
        let gameIdx = parts.indexOf('game.html');
        if (gameIdx === -1) gameIdx = parts.indexOf('game');
        if (gameIdx > 0) return parts[gameIdx - 1];
        return parts[parts.length - 1] || 'hero-shooter';
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
    let lastRoleLv = 0;
    
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
        let inputDetectedLogged = false;
        inputEvents.forEach(event => {
            document.addEventListener(event, () => {
                if (!proofState.hasInput) {
                    proofState.hasInput = true;
                    if (!inputDetectedLogged) { log('✅ Input detected:', event); inputDetectedLogged = true; }
                }
            }, { once: false, passive: true, capture: true });
        });
        if (window.parent !== window) {
            const allowedOrigins = ['http://localhost:4000', 'http://127.0.0.1:4000', 'https://sp.games', 'https://sp.games'];
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
                    if (!proofState.hasInput) {
                        proofState.hasInput = true;
                        if (!inputDetectedLogged) { log('✅ Input detected via postMessage'); inputDetectedLogged = true; }
                    }
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
                    log('🔑 Nonce received');
                    return true;
                }
            }
        } catch (e) { log('⚠️ Nonce request failed:', e.message); }
        return false;
    }
    
    const log = CONFIG.debug ? (...args) => console.log('%c[SP-Score]', 'color: #00c853; font-weight: bold', ...args) : () => {};
    
    function hookTjSDK() {
        if (typeof tjSDK !== 'undefined' && tjSDK.onEvent && !tjSDK.onEvent._spWrapped) {
            const orig = tjSDK.onEvent;
            tjSDK.onEvent = function(ev, args) {
                const stack = new Error().stack || '';
                const fromSDK = stack.includes('tjSDK') || stack.includes('onEvent') || stack.includes('cc.') || stack.includes('kit');
                if (fromSDK && (ev === 'role_up' || ev === 'enter_game') && args) {
                    const lv = parseInt(args.rolelv || args.roleLv || args, 10);
                    if (!isNaN(lv) && lv > 0) {
                        lastRoleLv = Math.max(lastRoleLv, lv);
                        const score = lv * 1000;
                        log('🎯 tjSDK captured:', ev, 'rolelv:', lv, '→ score:', score);
                        updateScoreHistory(score);
                        recordSnapshot(score);
                        if (proofState.hasInput) sendScore(score);
                    }
                }
                return orig.apply(this, arguments);
            };
            tjSDK.onEvent._spWrapped = true;
            log('tjSDK.onEvent hooked');
        }
    }
    
    function extractScore() {
        let score = 0;
        let roleLv = lastRoleLv;
        try {
            if (roleLv > 0) score = roleLv * 1000;
            if (typeof kit !== 'undefined') {
                const mm = kit.menuManager;
                if (mm && typeof mm === 'object') {
                    const rlv = parseInt(mm.rolelv || mm.roleLv || mm.role_level, 10);
                    if (!isNaN(rlv) && rlv > 0) roleLv = Math.max(roleLv, rlv);
                    for (const k of ['level', 'curLevel', 'maxLevel', 'chapter']) {
                        if (typeof mm[k] === 'number' && mm[k] > 0) {
                            const v = mm[k];
                            if (k === 'level' || k === 'curLevel' || k === 'maxLevel') roleLv = Math.max(roleLv, v);
                            score = Math.max(score, v);
                        }
                    }
                    const pt = mm.pageTurning;
                    if (pt && Array.isArray(pt)) {
                        [pt[1], pt[2]].forEach(function(p) {
                            if (p && typeof p.best === 'number' && p.best > 0) score = Math.max(score, p.best);
                        });
                    }
                }
                if (kit.pageTurning && Array.isArray(kit.pageTurning)) {
                    [kit.pageTurning[1], kit.pageTurning[2]].forEach(function(p) {
                        if (p && typeof p.best === 'number' && p.best > 0) score = Math.max(score, p.best);
                    });
                }
                if (kit.game) {
                    const g = kit.game;
                    const rlv = parseInt(g.rolelv || g.roleLv, 10);
                    if (!isNaN(rlv) && rlv > 0) roleLv = Math.max(roleLv, rlv);
                    for (const k of ['level', 'curLevel', 'chapter', 'rolelv', 'roleLv', 'coinGold', 'goldCoin', 'gold', 'coin', 'coins', 'money', 'diamond', 'dmd', 'goldNum', 'collectGold',
                        'waveNum', 'dot', 'curWave', 'killCount', 'wave', 'score', 'bestScore']) {
                        if (typeof g[k] === 'number' && g[k] > 0) {
                            if (k === 'rolelv' || k === 'roleLv' || k === 'level' || k === 'curLevel') roleLv = Math.max(roleLv, g[k]);
                            score = Math.max(score, g[k]);
                        }
                    }
                }
            }
            if (typeof menuManager !== 'undefined' && menuManager) {
                const rlv = parseInt(menuManager.rolelv || menuManager.roleLv, 10);
                if (!isNaN(rlv) && rlv > 0) roleLv = Math.max(roleLv, rlv);
                for (const k of ['level', 'curLevel', 'maxLevel', 'chapter']) {
                    if (typeof menuManager[k] === 'number' && menuManager[k] > 0) {
                        const v = menuManager[k];
                        if (k === 'level' || k === 'curLevel' || k === 'maxLevel') roleLv = Math.max(roleLv, v);
                        score = Math.max(score, v);
                    }
                }
                const pt = menuManager.pageTurning;
                if (pt && Array.isArray(pt)) {
                    [pt[1], pt[2]].forEach(function(p) {
                        if (p && typeof p.best === 'number' && p.best > 0) score = Math.max(score, p.best);
                    });
                }
            }
            if (typeof window.game !== 'undefined') {
                const g = window.game;
                const rlv = parseInt(g.rolelv || g.roleLv, 10);
                if (!isNaN(rlv) && rlv > 0) roleLv = Math.max(roleLv, rlv);
                for (const k of ['level', 'curLevel', 'chapter', 'rolelv', 'roleLv', 'coinGold', 'goldCoin', 'gold', 'coin', 'coins', 'money', 'goldNum', 'waveNum', 'dot', 'curWave', 'killCount', 'wave', 'score']) {
                    if (typeof g[k] === 'number' && g[k] > 0) {
                        if (k === 'rolelv' || k === 'roleLv' || k === 'level' || k === 'curLevel') roleLv = Math.max(roleLv, g[k]);
                        score = Math.max(score, g[k]);
                    }
                }
            }
            if (typeof cc !== 'undefined' && cc.sys && cc.sys.localStorage) {
                const rlv = parseInt(cc.sys.localStorage.getItem('rolelv') || cc.sys.localStorage.getItem('roleLv'), 10);
                if (!isNaN(rlv) && rlv > 0) roleLv = Math.max(roleLv, rlv);
                const keys = ['level', 'curLevel', 'chapter', 'coinGold', 'goldCoin', 'gold', 'coins', 'money', 'bestGold', 'bestScore', 'highScore', 'score', 'lastScore', 'bestWave', 'wave', 'dot', 'bestDot'];
                for (const k of keys) {
                    const v = cc.sys.localStorage.getItem(k);
                    if (v) { const n = parseInt(v, 10); if (!isNaN(n) && n > 0) { if (k === 'level') roleLv = Math.max(roleLv, n); score = Math.max(score, n); } }
                }
            }
            try {
                const rlv = parseInt(localStorage.getItem('hero_shooter_rolelv') || localStorage.getItem('rolelv'), 10);
                if (!isNaN(rlv) && rlv > 0) roleLv = Math.max(roleLv, rlv);
                for (const k of ['hero_shooter_level', 'hero_shooter_gold', 'hero_shooter_score', 'hero_shooter_best', 'hero_shooter_wave']) {
                    const v = localStorage.getItem(k);
                    if (v) { const n = parseInt(v, 10); if (!isNaN(n) && n > 0) { if (k === 'hero_shooter_level') roleLv = Math.max(roleLv, n); score = Math.max(score, n); } }
                }
            } catch (e) {}
            if (roleLv > 0) score = Math.max(score, roleLv * 1000);
        } catch (e) { log('extractScore error:', e); }
        return Math.floor(score) || 0;
    }
    
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
                    log('✅ Score saved!', result);
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
                    log('⚠️ Save failed:', result.error);
                }
            } else {
                log('❌ HTTP Error:', response.status);
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
    
    window.__gameEndLoad = function() {
        console.log('%c🎮 Hero score saved', 'color: #795548; font-weight: bold');
    };
    
    function hookGameEndLoad() {
        if (typeof gameEndLoad !== 'function') {
            log('gameEndLoad not found, retrying...');
            setTimeout(hookGameEndLoad, 500);
            return;
        }
        const orig = gameEndLoad;
        window.gameEndLoad = function() {
            const stack = new Error().stack || '';
            const fromGame = stack.includes('gameEndLoad') || stack.includes('boot') || stack.includes('cocos') || stack.includes('cc.') || stack.includes('kit');
            
            if (!fromGame) {
                console.log('%c🎮 Hero score saved', 'color: #795548; font-weight: bold');
                orig.apply(this, arguments);
                return;
            }
            
            const score = extractScore();
            log('gameEndLoad called, extracted score:', score);
            if (score >= CONFIG.minScore) {
                updateScoreHistory(score);
                recordSnapshot(score);
                if (!proofState.hasInput) {
                    log('⏳ Waiting for user input before sending score...');
                } else {
                    sendScore(score);
                }
            }
            orig.apply(this, arguments);
        };
        log('gameEndLoad hooked');
    }
    
    async function init() {
        log('Initializing...');
        log('Game:', CONFIG.gameSlug);
        initHoneypot();
        startTracking();
        hookTjSDK();
        const tjCheck = setInterval(hookTjSDK, 500);
        setTimeout(() => { clearInterval(tjCheck); }, 10000);
        if (document.readyState === 'complete') {
            hookGameEndLoad();
        } else {
            window.addEventListener('load', () => hookGameEndLoad());
        }
        setTimeout(hookGameEndLoad, 2000);
        await getNonce();
        log('✅ Ready! Listening for gameEndLoad');
    }
    
    init();
})();
