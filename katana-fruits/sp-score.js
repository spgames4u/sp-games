/**
 * sp-score.js - Score Bridge for sp.games + Game Integration Module
 */

(function() {
    'use strict';

    const gameSlugFallback = (() => {
        const parts = location.pathname.split('/').filter(Boolean);
        return new URLSearchParams(location.search).get('gameSlug') || parts[parts.length - 1] || 'katana-fruits';
    })();

    const guardKey = '__SP_SCORE_RUNNING_' + gameSlugFallback;
    if (window[guardKey]) {
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
        gameSlug: gameSlugFallback,
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
        inputEvents.forEach(event => {
            document.addEventListener(event, () => {
                if (!proofState.hasInput) proofState.hasInput = true;
            }, { once: false, passive: true, capture: true });
        });

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
                        const allowedLower = allowed.toLowerCase();
                        if (eOrigin === allowedLower ||
                            (allowedLower.indexOf('localhost') >= 0 && eOrigin.indexOf('http://localhost') === 0) ||
                            (allowedLower.indexOf('127.0.0.1') >= 0 && eOrigin.indexOf('http://127.0.0.1') === 0)) {
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
        proofState.history.push({ score: score, timestamp: now });
        if (proofState.history.length > 5000) {
            proofState.history.shift();
        }
        proofState.historyLength = proofState.history.length;
        if (proofState.history.length >= 2) {
            proofState.historySpanMs = proofState.history[proofState.history.length - 1].timestamp - proofState.history[0].timestamp;
        }
    }

    function getNonce() {
        return fetch(CONFIG.nonceUrl + '?gameSlug=' + encodeURIComponent(CONFIG.gameSlug), {
            method: 'GET',
            credentials: 'include'
        }).then(function(response) {
            if (response.ok) {
                return response.json();
            }
            return null;
        }).then(function(data) {
            if (data && data.nonce) {
                currentNonce = data.nonce;
                return true;
            }
            return false;
        }).catch(function() {
            return false;
        });
    }

    const log = CONFIG.debug
        ? function() {
            var args = ['%c[SP-Score]', 'color: #00c853; font-weight: bold'];
            for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
            console.log.apply(console, args);
        }
        : function() {};

    function processScore(iScore) {
        var raw = typeof iScore === 'object' && iScore !== null && 'score' in iScore ? iScore.score : iScore;
        var sanitizedScore = Math.floor(Math.abs(raw)) || 0;

        if (sanitizedScore >= CONFIG.minScore) {
            updateScoreHistory(sanitizedScore);
            recordSnapshot(sanitizedScore);
            if (!proofState.hasInput) return;
            sendScore(sanitizedScore);
        }
    }

    if (window.parent === window) {
        window.__ctlArcadeSaveScore = function(arg) {
            var raw = typeof arg === 'object' && arg !== null && 'score' in arg ? arg.score : arg;
            console.log('%c\u2705 Score submitted successfully', 'color: green');
        };
    }

    window.SP_SAVE_SCORE = processScore;

    function sendScore(score) {
        var now = Date.now();
        if (isSending || score < CONFIG.minScore) return Promise.resolve(false);

        if (score <= lastSentScore) {
            if ((now - lastSentTime) < CONFIG.cooldownMs) {
                return Promise.resolve(false);
            }
        }

        if (score === lastFailedScore) {
            if ((now - lastFailedTime) < 10000) {
                return Promise.resolve(false);
            }
        }

        var fd = failedAttempts.get(score);
        if (fd && fd.count >= 3) {
            if ((now - fd.lastAttempt) < 10000) {
                return Promise.resolve(false);
            }
        }

        return (currentNonce ? Promise.resolve(true) : getNonce()).then(function(gotNonce) {
            if (!gotNonce) return false;
            isSending = true;

            if (proofState.visibleStart && !document.hidden) {
                proofState.visibleMs += Date.now() - proofState.visibleStart;
                proofState.visibleStart = Date.now();
            }
            if (proofState.focusStart && document.hasFocus && document.hasFocus()) {
                proofState.focusMs += Date.now() - proofState.focusStart;
                proofState.focusStart = Date.now();
            }

            var curVisible = proofState.visibleMs + (proofState.visibleStart ? (Date.now() - proofState.visibleStart) : 0);
            var curFocus = proofState.focusMs + (proofState.focusStart ? (Date.now() - proofState.focusStart) : 0);
            var honeypotTouched = checkHoneypot();
            var proofData = {
                visibleMs: Math.min(curVisible, 43200000),
                focusMs: Math.min(curFocus, 43200000),
                hasInput: proofState.hasInput,
                historyLength: Math.min(proofState.historyLength, 5000),
                historySpanMs: Math.min(proofState.historySpanMs, 43200000)
            };

            if (snapshots.length === 0 || snapshots[snapshots.length - 1].s !== score) {
                snapshots.push({ t: Date.now(), s: score });
                if (snapshots.length > SNAP_CONFIG.maxSnapshots) snapshots.shift();
            }

            return fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    gameSlug: CONFIG.gameSlug,
                    score: score,
                    nonce: currentNonce,
                    proof: proofData,
                    honeypotTouched: honeypotTouched,
                    snapshots: snapshots.map(function(s) { return { t: s.t, s: s.s }; })
                })
            }).then(function(response) {
                return response.json().then(function(result) {
                    if (response.ok && result.ok !== false) {
                        lastSentScore = score;
                        lastSentTime = Date.now();
                        currentNonce = null;
                        resetProof();
                        snapshots = [];
                        lastSnapTime = 0;
                        setTimeout(function() { getNonce(); }, 100);
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
                    }
                    currentNonce = null;
                    var f = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
                    f.count++;
                    f.lastAttempt = Date.now();
                    failedAttempts.set(score, f);
                    lastFailedScore = score;
                    lastFailedTime = Date.now();
                    return false;
                });
            }).catch(function(e) {
                currentNonce = null;
                var f = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
                f.count++;
                f.lastAttempt = Date.now();
                failedAttempts.set(score, f);
                lastFailedScore = score;
                lastFailedTime = Date.now();
                return false;
            }).finally(function() {
                isSending = false;
            });
        });
    }

    function showNotification(score) {
        if (window.innerWidth < 300) return;
        var div = document.createElement('div');
        var lang = (document.documentElement && document.documentElement.lang) || navigator.language || 'en';
        var isArabic = lang.indexOf('ar') === 0;
        var message = isArabic ? '\uD83C\uDF89 \u0631\u0642\u0645 \u0642\u064A\u0627\u0633\u064A!' : '\uD83C\uDF89 New High Score!';
        var direction = isArabic ? 'rtl' : 'ltr';
        div.innerHTML = message + '<br><b>' + score.toLocaleString() + '</b>';
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:25px;font:bold 14px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:999999;direction:' + direction + ';';
        document.body.appendChild(div);
        setTimeout(function() { div.remove(); }, 3500);
    }

    function init() {
        initHoneypot();
        startTracking();

        function doInit() {
            getNonce();

            window.addEventListener('beforeunload', function() {
                var lastScore = proofState.history.length > 0
                    ? proofState.history[proofState.history.length - 1].score
                    : 0;
                if (lastScore >= CONFIG.minScore && lastScore > lastSentScore && currentNonce) {
                    if (snapshots.length === 0 || snapshots[snapshots.length - 1].s !== lastScore) {
                        snapshots.push({ t: Date.now(), s: lastScore });
                        if (snapshots.length > SNAP_CONFIG.maxSnapshots) snapshots.shift();
                    }
                    var payload = {
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
                        snapshots: snapshots.map(function(s) { return { t: s.t, s: s.s }; })
                    };
                    var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                    if (navigator.sendBeacon) navigator.sendBeacon(CONFIG.apiUrl, blob);
                }
            });
        }

        if (document.readyState === 'complete') {
            doInit();
        } else {
            window.addEventListener('load', doInit);
        }
    }

    init();
})();
