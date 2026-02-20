/**
 * sp-score.js - Score Bridge for sp.games + Game Integration Module
 */

(function() {
    'use strict';

    function getGameSlug() {
        const params = new URLSearchParams(location.search);
        if (params.get('gameSlug')) return params.get('gameSlug');
        const parts = location.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || 'pop-adventure';
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
        const message = isArabic ? '\u0631\u0642\u0645 \u0642\u064a\u0627\u0633\u064a!' : 'New High Score!';
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
        const message = isNewHigh ? (isArabic ? '\u0631\u0642\u0645 \u0642\u064a\u0627\u0633\u064a!' : 'New High Score!') : (isArabic ? '\u062a\u0645 \u062d\u0641\u0638 \u0646\u062a\u064a\u062c\u062a\u0643' : 'Score saved');
        const direction = isArabic ? 'rtl' : 'ltr';
        div.innerHTML = message + '<br><b>' + score.toLocaleString() + '</b>';
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:25px;font:bold 14px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:999999;direction:' + direction + ';';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3500);
    }

    let cachedValue = null;

    function extractStage(obj, depth) {
        if (!obj || typeof obj !== 'object' || (depth || 0) > 5) return null;
        const d = (depth || 0) + 1;
        const num = (v) => (typeof v === 'number' && !isNaN(v) && v >= 0) ? Math.floor(v) : null;
        const strNum = (v) => { if (typeof v !== 'string') return null; const n = parseInt(v, 10); return isNaN(n) ? null : Math.floor(n); };
        for (const k of ['_curStageId', '_curactualStageId', 'curStage', 'curLevel', 'stage', 'level']) {
            if (k in obj) {
                const n = num(obj[k]) || strNum(obj[k]);
                if (n !== null && n >= 0) return n;
            }
        }
        for (const k of Object.keys(obj)) {
            if (typeof obj[k] === 'object') {
                const n = extractStage(obj[k], d);
                if (n !== null) return n;
            }
        }
        return null;
    }

    function detectStageForDisplay() {
        try {
            const storages = [];
            if (typeof cc !== 'undefined' && cc.sys && cc.sys.localStorage) storages.push(cc.sys.localStorage);
            if (typeof localStorage !== 'undefined') storages.push(localStorage);
            for (const storage of storages) {
                if (!storage || typeof storage.getItem !== 'function') continue;
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    if (!key || key.indexOf('score_cache') >= 0 || key.indexOf('profile_state') >= 0 || key.indexOf('ui_sync') >= 0) continue;
                    try {
                        const raw = storage.getItem(key);
                        if (!raw || raw.length > 500000) continue;
                        let data = null;
                        try { data = JSON.parse(raw); } catch (e1) {
                            try { data = JSON.parse(decodeURIComponent(raw)); } catch (e2) {
                                try { data = JSON.parse(atob(raw)); } catch (e3) {}
                            }
                        }
                        const stage = extractStage(data, 0);
                        if (stage !== null) return stage;
                    } catch (e) {}
                }
            }
        } catch (e) {}
        return null;
    }

    function extractStageForScore(obj, depth) {
        if (!obj || typeof obj !== 'object' || (depth || 0) > 5) return null;
        const d = (depth || 0) + 1;
        const num = (v) => (typeof v === 'number' && !isNaN(v) && v >= 0) ? Math.floor(v) : null;
        const strNum = (v) => { if (typeof v !== 'string') return null; const n = parseInt(v, 10); return isNaN(n) ? null : Math.floor(n); };
        for (const k of ['_curStageId', '_curactualStageId']) {
            if (k in obj) {
                const n = num(obj[k]) || strNum(obj[k]);
                if (n !== null && n >= 0) return n;
            }
        }
        for (const k of Object.keys(obj)) {
            if (typeof obj[k] === 'object') {
                const n = extractStageForScore(obj[k], d);
                if (n !== null) return n;
            }
        }
        return null;
    }

    function extractScore(obj, depth) {
        if (!obj || typeof obj !== 'object' || (depth || 0) > 5) return null;
        const d = (depth || 0) + 1;
        const stage = extractStageForScore(obj, 0);
        if (stage !== null) return stage * 10;
        const num = (v) => (typeof v === 'number' && !isNaN(v) && v >= 0) ? Math.floor(v) : null;
        const strNum = (v) => { if (typeof v !== 'string') return null; const n = parseInt(v, 10); return isNaN(n) ? null : Math.floor(n); };
        const keys = ['score', 'highScore', 'totalScore', 'bestScore', 'points', 'level', 'lv', 'stageId', 'stage', 'curLevel', '__age__'];
        for (const k of keys) {
            if (k in obj) {
                const v = obj[k];
                const n = num(v) || strNum(v);
                if (n !== null && n >= 0) return n;
            }
        }
        for (const k of Object.keys(obj)) {
            if (typeof obj[k] === 'object') {
                const n = extractScore(obj[k], d);
                if (n !== null) return n;
            }
        }
        return null;
    }

    function parseValueFromData(data) {
        if (!data || typeof data !== 'object') return null;
        const scoreVal = extractScore(data, 0);
        if (scoreVal !== null) return scoreVal;
        return null;
    }

    function detectScoreFromStorage(storage) {
        if (!storage || typeof storage.getItem !== 'function') return null;
        let best = null;
        try {
            const keysToTry = ['record_game1', 'PopAdventure_userData', 'PopAdventure_userData_backup', 'pop_adventure_userData'];
            for (const key of keysToTry) {
                const raw = storage.getItem(key);
                if (!raw || typeof raw !== 'string') continue;
                let data = null;
                try { data = JSON.parse(raw); } catch (e1) {
                    try { data = JSON.parse(decodeURIComponent(raw)); } catch (e2) {
                        try { data = JSON.parse(atob(raw)); } catch (e3) {}
                    }
                }
                const v = parseValueFromData(data);
                if (v !== null && (best === null || v > best)) best = v;
            }
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (!key) continue;
                if (key.indexOf('score_cache') >= 0 || key.indexOf('profile_state') >= 0 || key.indexOf('ui_sync') >= 0) continue;
                try {
                    const raw = storage.getItem(key);
                    if (!raw || raw.length > 500000) continue;
                    let data = null;
                    try { data = JSON.parse(raw); } catch (e1) {
                        try { data = JSON.parse(decodeURIComponent(raw)); } catch (e2) {
                            try { data = JSON.parse(atob(raw)); } catch (e3) {}
                        }
                    }
                    const v = parseValueFromData(data);
                    if (v !== null && v >= CONFIG.minScore && (best === null || v > best)) best = v;
                } catch (e) {}
            }
        } catch (e) {}
        return best;
    }

    function detectScore() {
        if (cachedValue !== null && cachedValue > 0) return cachedValue;
        try {
            const storages = [];
            if (typeof cc !== 'undefined' && cc.sys && cc.sys.localStorage) storages.push(cc.sys.localStorage);
            if (typeof localStorage !== 'undefined') storages.push(localStorage);
            for (const storage of storages) {
                const v = detectScoreFromStorage(storage);
                if (v !== null && v >= CONFIG.minScore) {
                    cachedValue = v;
                    return v;
                }
            }
        } catch (e) {}
        return null;
    }

    async function decompressAndGetScore() {
        try {
            const storage = (typeof cc !== 'undefined' && cc.sys && cc.sys.localStorage) ? cc.sys.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
            if (!storage) return null;
            let raw = storage.getItem('record_game1');
            if (raw && typeof raw === 'string') {
                try {
                    const data = JSON.parse(raw);
                    const v = parseValueFromData(data);
                    if (v !== null) { cachedValue = v; return v; }
                } catch (e) {}
            }
            raw = storage.getItem('PopAdventure_userData');
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
                    const v = parseValueFromData(data);
                    if (v !== null) { cachedValue = v; return v; }
                } catch (e) {}
            }
        } catch (e) {}
        return null;
    }

    window.addEventListener('message', function(e) {
        if (e.source === window) return;
        if (!e.data || typeof e.data !== 'object') return;
        const d = e.data.data || e.data;
        const score = (typeof d.score === 'number') ? Math.floor(d.score) : null;
        if (score !== null && score >= CONFIG.minScore && proofState.hasInput) {
            updateScoreHistory(score);
            recordSnapshot(score);
            sendScore(score).then(r => {
                if (r && r.ok && !r.newHighScore) showScoreSavedNotification(score, false);
            });
        }
    });

    async function init() {
        log('Initializing...');
        log('Game:', CONFIG.gameSlug);

        initHoneypot();
        startTracking();
        await getNonce();

        await new Promise(r => {
            if (document.readyState === 'complete') r();
            else window.addEventListener('load', r);
        });

        await decompressAndGetScore();
        let lastLoggedVal = -1;
        let lastSentVal = 0;
        let pendingVal = null;
        let pendingSince = 0;
        let lastStageLogged = -1;
        const STABLE_MS = 2500;
        setInterval(() => {
            decompressAndGetScore().then(val => {
                if (val === null) { cachedValue = null; val = detectScore(); }
                const stage = detectStageForDisplay();
                if (CONFIG.debug && stage != null && stage !== lastStageLogged) {
                    lastStageLogged = stage;
                    console.log('%c[SP-Score] المرحلة الحالية:', 'color:#0af;font-weight:bold', stage);
                }
                if (val !== null && val !== lastLoggedVal) lastLoggedVal = val;
                if (val === null || val < CONFIG.minScore || !proofState.hasInput) {
                    pendingVal = null;
                    return;
                }
                const now = Date.now();
                if (val !== pendingVal) {
                    pendingVal = val;
                    pendingSince = now;
                    return;
                }
                if (val <= lastSentVal) return;
                if (now - pendingSince < STABLE_MS) return;
                lastSentVal = val;
                pendingVal = null;
                updateScoreHistory(val);
                recordSnapshot(val);
                sendScore(val).then(r => {
                    if (r && r.ok && !r.newHighScore) showScoreSavedNotification(val, false);
                });
            });
        }, 1500);

        window.spDebugStage = function() {
            console.log('%c[SP-Debug] spDebugStage يعمل ✓', 'color:#0f0;font-weight:bold');
            console.log('%c[SP-Debug] === بدء الفحص ===', 'color:#0f0');
            const storage = (typeof cc !== 'undefined' && cc.sys && cc.sys.localStorage) ? cc.sys.localStorage : localStorage;
            const raw = storage.getItem('record_game1');
            if (!raw) {
                console.log('%c[SP-Debug] record_game1 غير موجود', 'color:#f80');
                const keys = [];
                for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));
                console.log('المفاتيح:', keys);
                return;
            }
            try {
                const d = JSON.parse(raw);
                console.log('%c[SP-Debug] record_game1 محمّل. المفاتيح:', 'color:#0af', Object.keys(d));
                function findVals(o, path) {
                    if (!o || typeof o !== 'object') return;
                    for (const k of Object.keys(o)) {
                        const v = o[k];
                        const p = path ? path + '.' + k : k;
                        if (typeof v === 'number') console.log('  ' + p + ' =', v);
                        else if (typeof v === 'string' && /^\d+$/.test(v)) console.log('  ' + p + ' =', v, '(string)');
                        else if (typeof v === 'object') findVals(v, p);
                    }
                }
                console.log('%c[SP-Debug] كل الأرقام (ابحث عن 4):', 'color:#0af');
                findVals(d, '');
            } catch (e) {
                console.log('%c[SP-Debug] خطأ:', 'color:#f00', e.message);
            }
            console.log('%c[SP-Debug] === نهاية الفحص ===', 'color:#0f0');
            const storages = [];
            if (typeof cc !== 'undefined' && cc.sys && cc.sys.localStorage) storages.push({ name: 'cc.sys.localStorage', s: cc.sys.localStorage });
            if (typeof localStorage !== 'undefined') storages.push({ name: 'localStorage', s: localStorage });
            for (const { name, s } of storages) {
                if (!s) continue;
                const len = typeof s.length === 'number' ? s.length : 0;
                const keys = [];
                for (let i = 0; i < len; i++) {
                    try { const k = s.key(i); if (k) keys.push(k); } catch (e) {}
                }
                console.log('%c[SP-Debug] ' + name + ' (' + keys.length + '):', 'color:#0af', keys);
                for (const k of keys) {
                    if (k.indexOf('score_cache') >= 0 || k.indexOf('profile_state') >= 0 || k.indexOf('ui_sync') >= 0) continue;
                    try {
                        const raw = s.getItem(k);
                        const preview = raw ? (raw.length > 800 ? raw.substring(0, 800) + '...' : raw) : '(empty)';
                        console.log('%c  ' + k + ':', 'color:#888', preview);
                    } catch (e) {}
                }
            }
            if (typeof indexedDB !== 'undefined') {
                indexedDB.databases().then(dbs => {
                    console.log('%c[SP-Debug] IndexedDB:', 'color:#0af', dbs.map(d => d.name));
                }).catch(() => {});
            }
        };
        if (window.parent !== window) {
            const win = window;
            window.parent.spDebugStage = function() {
                try {
                    if (win.spDebugStage) { win.spDebugStage(); }
                    else { console.log('%c[SP-Debug] انتظر تحميل اللعبة ثم جرّب مجدداً', 'color:#f80'); }
                } catch (e) { console.log('%c[SP-Debug] خطأ:', 'color:#f00', e.message); }
            };
        }
        log('Ready!');
    }

    init();
})();
