/**
 * sp-score.js - Score Bridge for Hero-Shooter (Cocos2d-JS) with Anti-Cheat
 * v1.0 - نظام Anti-Cheat: Nonce + Proof + Honeypot
 * 
 * هذا الملف مخصص لألعاب Cocos2d-JS/Cocos Creator
 * يعترض gameEndLoad ويستخرج النتيجة ثم يرسلها للنظام
 */

(function() {
    'use strict';
    
    const guardKey = '__SP_SCORE_RUNNING_hero-shooter';
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
            const parts = location.pathname.split('/').filter(Boolean);
            const gameIdx = parts.indexOf('game.html');
            if (gameIdx > 0) return parts[gameIdx - 1];
            if (parts.includes('hero-shooter')) return 'hero-shooter';
            const gi = parts.indexOf('games');
            if (gi >= 0 && parts[gi + 1]) return parts[gi + 1];
            return parts[parts.length - 1] || 'hero-shooter';
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
    let lastRoleLv = 0;
    
    const proofState = {
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
                if (stored !== null && stored !== originalHoneypot[key]) touched = true;
            } catch (e) {}
        });
        return touched;
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
        ['pointerdown', 'keydown', 'touchstart', 'mousedown'].forEach(ev => {
            document.addEventListener(ev, () => { proofState.hasInput = true; }, { passive: true, capture: true });
        });
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
            const r = await fetch(`${CONFIG.nonceUrl}?gameSlug=${encodeURIComponent(CONFIG.gameSlug)}`, {
                method: 'GET', credentials: 'include'
            });
            if (r.ok) {
                const d = await r.json();
                if (d.nonce) { currentNonce = d.nonce; return true; }
            }
        } catch (e) {}
        return false;
    }
    
    const log = CONFIG.debug ? (...a) => console.log('%c[SP-Score]', 'color:#00c853;font-weight:bold', ...a) : () => {};
    
    function hookTjSDK() {
        if (typeof tjSDK !== 'undefined' && tjSDK.onEvent && !tjSDK.onEvent._spWrapped) {
            const orig = tjSDK.onEvent;
            tjSDK.onEvent = function(ev, args) {
                if ((ev === 'role_up' || ev === 'enter_game') && args) {
                    const lv = parseInt(args.rolelv || args.roleLv || args, 10);
                    if (!isNaN(lv) && lv > 0) {
                        lastRoleLv = Math.max(lastRoleLv, lv);
                        const score = lv * 1000;
                        console.log('%c[SP-Score] ' + ev + ' captured, rolelv: ' + lv + ' → score: ' + score, 'color:#00c853;font-weight:bold');
                        updateScoreHistory(score);
                        sendScore(score);
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
                    if (CONFIG.debug && score === 0) log('kit.game keys:', Object.keys(g).filter(k => typeof g[k] === 'number'));
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
        const fd = failedAttempts.get(score);
        if (fd && fd.count >= 3 && (now - fd.lastAttempt) < 10000) return false;
        
        if (!currentNonce) {
            const got = await getNonce();
            if (!got) return false;
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
        
        const proofData = {
            visibleMs: Math.min(proofState.visibleMs + (proofState.visibleStart ? now - proofState.visibleStart : 0), 43200000),
            focusMs: Math.min(proofState.focusMs + (proofState.focusStart ? now - proofState.focusStart : 0), 43200000),
            hasInput: proofState.hasInput,
            historyLength: Math.min(proofState.historyLength, 5000),
            historySpanMs: Math.min(proofState.historySpanMs, 43200000)
        };
        
        try {
            const r = await fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    gameSlug: CONFIG.gameSlug,
                    score,
                    nonce: currentNonce,
                    proof: proofData,
                    honeypotTouched: checkHoneypot()
                })
            });
            
            if (r.ok) {
                const result = await r.json();
                if (result.ok !== false) {
                    log('Score saved!', result);
                    lastSentScore = score;
                    lastSentTime = now;
                    currentNonce = null;
                    if (window.parent !== window) {
                        window.parent.postMessage({ type: 'SP_SCORE_SAVED', score, result, gameSlug: CONFIG.gameSlug }, '*');
                    }
                    showNotification(score, !!result.newHighScore);
                    return true;
                }
            }
            const f = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
            f.count++; f.lastAttempt = now;
            failedAttempts.set(score, f);
            lastFailedScore = score; lastFailedTime = now;
            currentNonce = null;
            log('Save failed');
        } catch (e) {
            log('Error:', e.message);
            const f = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
            f.count++; f.lastAttempt = now;
            failedAttempts.set(score, f);
            lastFailedScore = score; lastFailedTime = now;
            currentNonce = null;
        } finally {
            isSending = false;
        }
        return false;
    }
    
    function showNotification(score, isNewHigh) {
        if (window.innerWidth < 300) return;
        const div = document.createElement('div');
        const isAr = (document.documentElement.lang || navigator.language || '').startsWith('ar');
        const msg = isNewHigh 
            ? (isAr ? '🎉 رقم قياسي جديد!' : '🎉 New High Score!')
            : (isAr ? '✅ نتيجتك' : '✅ Your Score');
        div.innerHTML = msg + '<br><b>' + score.toLocaleString() + '</b>';
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#4CAF50,#45a049);color:#fff;padding:12px 24px;border-radius:25px;font:bold 14px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:999999;direction:' + (isAr ? 'rtl' : 'ltr');
        document.body.appendChild(div);
        setTimeout(function() { div.remove(); }, 3500);
    }
    
    function hookGameEndLoad() {
        if (typeof gameEndLoad !== 'function') {
            log('gameEndLoad not found, retrying...');
            setTimeout(hookGameEndLoad, 500);
            return;
        }
        const orig = gameEndLoad;
        window.gameEndLoad = function() {
            const score = extractScore();
            log('gameEndLoad called, extracted score:', score);
            if (score >= CONFIG.minScore && proofState.hasInput) {
                updateScoreHistory(score);
                sendScore(score);
            } else if (score > 0 && !proofState.hasInput) {
                updateScoreHistory(score);
                sendScore(score);
            }
            orig.apply(this, arguments);
        };
        log('gameEndLoad hooked');
    }
    
    function init() {
        log('Initializing (Cocos Hero-Shooter)...');
        log('Game:', CONFIG.gameSlug);
        initHoneypot();
        startTracking();
        hookTjSDK();
        const tjCheck = setInterval(hookTjSDK, 500);
        setTimeout(function() { clearInterval(tjCheck); }, 10000);
        if (document.readyState === 'complete') {
            hookGameEndLoad();
        } else {
            window.addEventListener('load', () => hookGameEndLoad());
        }
        setTimeout(hookGameEndLoad, 2000);
        getNonce();
    }
    
    init();
})();
