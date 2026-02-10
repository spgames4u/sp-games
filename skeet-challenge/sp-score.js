/**
 * sp-score.js - Score Bridge for Skeet Challenge with Anti-Cheat
 * v4.0 - نفس نظام playful-kitty
 */

(function() {
    'use strict';
    
    const params = new URLSearchParams(location.search);
    const isTestMode = params.get('scorepointTest') === '1';
    
    const CONFIG = {
        apiUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/save-score'
            : 'https://new.sp.games/api/games/save-score',
        nonceUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/nonce'
            : 'https://new.sp.games/api/games/nonce',
        gameSlug: (() => {
            const parts = location.pathname.split('/').filter(Boolean);
            const params = new URLSearchParams(location.search);
            if (params.get('gameSlug')) return params.get('gameSlug');
            return parts.length > 0 ? parts[parts.length - 1] : 'skeet-challenge';
        })(),
        minScore: 1,
        cooldownMs: 30000, // 30 ثانية
        debug: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    };
    
    let lastSentScore = 0;
    let lastSentTime = 0;
    let isSending = false;
    let currentNonce = null;
    let failedAttempts = new Map(); // Map<score, {count, lastAttempt}>
    let lastFailedScore = null;
    let lastFailedTime = 0;
    
    // ==================== Proof Tracking ====================
    let proofState = {
        visibleStart: null,
        visibleMs: 0,
        focusStart: null,
        focusMs: 0,
        hasInput: false,
        history: [], // [{score, timestamp}]
        historyLength: 0,
        historySpanMs: 0
    };
    
    // ==================== Honeypot ====================
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
            } catch (e) {
                // localStorage full or disabled
            }
        });
    }
    
    function checkHoneypot() {
        let touched = false;
        honeypotKeys.forEach(key => {
            try {
                const stored = localStorage.getItem(key);
                if (stored === null) {
                    // محذوف - لا تعتبر tamper
                    return;
                }
                if (stored !== originalHoneypot[key]) {
                    // محاولة parse للتحقق من الشكل
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
            } catch (e) {
                // ignore
            }
        });
        return touched;
    }
    
    function resetProof() {
        proofState = {
            visibleStart: null,
            visibleMs: 0,
            focusStart: null,
            focusMs: 0,
            hasInput: proofState.hasInput, // احتفظ بـ hasInput
            history: [],
            historyLength: 0,
            historySpanMs: 0
        };
    }
    
    // ==================== Proof Event Listeners ====================
    function startTracking() {
        // Visibility tracking
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
        
        // Focus tracking
        window.addEventListener('focus', () => {
            proofState.focusStart = Date.now();
        });
        window.addEventListener('blur', () => {
            if (proofState.focusStart) {
                proofState.focusMs += Date.now() - proofState.focusStart;
                proofState.focusStart = null;
            }
        });
        
        // Input tracking - يعمل في iframe و parent
        const inputEvents = ['pointerdown', 'keydown', 'touchstart', 'mousedown'];
        let inputDetectedLogged = false; // لتجنب spam في logs
        
        // على document (يعمل في iframe)
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
        
        // على window أيضاً (للحالات الخاصة) - لكن فقط داخل iframe
        if (window.self !== window.top) {
            // نحن في iframe - استمع على window أيضاً
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
        
        // إذا كان في iframe، استمع أيضاً من parent (مقيد بالأمان)
        if (window.parent !== window) {
            const allowedOrigins = [
                'http://localhost:4000',
                'http://127.0.0.1:4000',
                'https://sp.games',
                'https://new.sp.games',
                'https://games.sp.games'
            ];
            
            window.addEventListener('message', (e) => {
                // التحقق من origin (مقارنة دقيقة لتجنب bypass)
                let originAllowed = false;
                try {
                    const eOrigin = e.origin.toLowerCase();
                    for (const allowed of allowedOrigins) {
                        const allowedLower = allowed.toLowerCase();
                        // مطابقة دقيقة أو localhost مع أي port
                        if (eOrigin === allowedLower || 
                            (allowedLower.includes('localhost') && eOrigin.startsWith('http://localhost')) ||
                            (allowedLower.includes('127.0.0.1') && eOrigin.startsWith('http://127.0.0.1'))) {
                            originAllowed = true;
                            break;
                        }
                    }
                } catch (err) {
                    return; // origin غير صالح
                }
                
                if (!originAllowed) {
                    return; // origin غير مسموح
                }
                
                // التحقق من نوع الرسالة
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
        
        // Initialize visibility
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
        
        // Keep only last 5000 entries
        if (proofState.history.length > 5000) {
            proofState.history.shift();
        }
        
        proofState.historyLength = proofState.history.length;
        if (proofState.history.length >= 2) {
            proofState.historySpanMs = proofState.history[proofState.history.length - 1].timestamp - proofState.history[0].timestamp;
        }
    }
    
    // ==================== Nonce Management ====================
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
        ? (...args) => console.log('%c[SP-Score-Skeet]', 'color: #00c853; font-weight: bold', ...args)
        : () => {};
    
    async function sendScore(score) {
        // Cooldown check
        const now = Date.now();
        if (isSending || score < CONFIG.minScore) return false;
        
        // منع إرسال نفس السكور مرتين (إلا إذا مر cooldown)
        if (score <= lastSentScore) {
            if ((now - lastSentTime) < CONFIG.cooldownMs) {
                return false; // لم يمر cooldown
            }
        }
        
        // Backoff: منع إعادة المحاولة لنفس السكور الفاشل
        if (score === lastFailedScore) {
            const timeSinceFailure = now - lastFailedTime;
            if (timeSinceFailure < 10000) { // 10 ثواني minimum backoff
                return false;
            }
        }
        
        // Check failed attempts for this score (backoff قصير بدل skip نهائي)
        const failedData = failedAttempts.get(score);
        if (failedData && failedData.count >= 3) {
            const timeSinceLastAttempt = now - failedData.lastAttempt;
            if (timeSinceLastAttempt < 10000) { // 10 ثواني backoff
                log('⚠️ Score failed 3 times, backoff:', score, 'wait', Math.ceil((10000 - timeSinceLastAttempt) / 1000), 's');
                return false;
            }
            // بعد 10 ثواني، اسمح بمحاولة جديدة (لكن فقط إذا تغيّر السكور أو زاد historyLength)
            // هذا يتم التحقق منه في الشرط التالي (score > lastSentScore أو cooldown)
        }
        
        // Need nonce
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
        
        // Update score history
        updateScoreHistory(score);
        
        // تحديث عدادات الوقت قبل الإرسال (للمساعدة في قياس presence)
        if (proofState.visibleStart && !document.hidden) {
            proofState.visibleMs += now - proofState.visibleStart;
            proofState.visibleStart = now; // Reset for next calculation
        }
        if (proofState.focusStart && document.hasFocus && document.hasFocus()) {
            proofState.focusMs += now - proofState.focusStart;
            proofState.focusStart = now; // Reset for next calculation
        }
        
        // Calculate proof
        const currentVisibleMs = proofState.visibleMs + (proofState.visibleStart ? (now - proofState.visibleStart) : 0);
        const currentFocusMs = proofState.focusMs + (proofState.focusStart ? (now - proofState.focusStart) : 0);
        
        // Check honeypot
        const honeypotTouched = checkHoneypot();
        
        // Prepare proof data
        const proofData = {
            visibleMs: Math.min(currentVisibleMs, 43200000), // max 12h
            focusMs: Math.min(currentFocusMs, 43200000),
            hasInput: proofState.hasInput,
            historyLength: Math.min(proofState.historyLength, 5000),
            historySpanMs: Math.min(proofState.historySpanMs, 43200000)
        };
        
        // Log proof before sending
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
                    honeypotTouched: honeypotTouched
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.ok !== false) {
                    log('✅ Score saved!', result);
                    lastSentScore = score;
                    lastSentTime = now;
                    currentNonce = null; // Consumed
                    resetProof();
                    
                    // Get new nonce for next time
                    setTimeout(() => getNonce(), 100);
                    
                    // إخبار الصفحة الأم
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
                    // Track failed attempt
                    const failedData = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
                    failedData.count++;
                    failedData.lastAttempt = Date.now();
                    failedAttempts.set(score, failedData);
                    
                    lastFailedScore = score;
                    lastFailedTime = Date.now();
                    
                    // Consume nonce (don't reuse failed nonce)
                    currentNonce = null;
                    
                    // Clean old failed attempts (older than 5 minutes)
                    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                    for (const [s, data] of failedAttempts.entries()) {
                        if (data.lastAttempt < fiveMinutesAgo) {
                            failedAttempts.delete(s);
                        }
                    }
                    
                    // لا تطلب nonce جديد عند الفشل - انتظر الاستدعاء التالي
                    // لا تحاول مباشرة - انتظر backoff
                }
            } else {
                // HTTP error
                log('❌ HTTP Error:', response.status);
                const failedData = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
                failedData.count++;
                failedData.lastAttempt = Date.now();
                failedAttempts.set(score, failedData);
                lastFailedScore = score;
                lastFailedTime = Date.now();
                currentNonce = null; // Consume nonce
            }
        } catch (e) {
            log('❌ Error:', e.message);
            const failedData = failedAttempts.get(score) || { count: 0, lastAttempt: 0 };
            failedData.count++;
            failedData.lastAttempt = Date.now();
            failedAttempts.set(score, failedData);
            lastFailedScore = score;
            lastFailedTime = Date.now();
            currentNonce = null; // Consume nonce
        } finally {
            isSending = false;
        }
        return false;
    }
    
    function showNotification(score) {
        if (window.innerWidth < 300) return;
        const div = document.createElement('div');
        // التحقق من اللغة
        const lang = document.documentElement.lang || navigator.language || 'en';
        const isArabic = lang.startsWith('ar');
        const message = isArabic ? '🎉 رقم قياسي!' : '🎉 New High Score!';
        const direction = isArabic ? 'rtl' : 'ltr';
        div.innerHTML = message + '<br><b>' + score.toLocaleString() + '</b>';
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:25px;font:bold 14px Arial;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:999999;direction:' + direction + ';';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3500);
    }
    
    function showTestResult(ok) {
        const div = document.createElement('div');
        const lang = document.documentElement.lang || navigator.language || 'en';
        const isArabic = lang.startsWith('ar');
        const msg = ok ? (isArabic ? '✅ اختبار: تم إرسال النتيجة بنجاح' : '✅ Test: Score sent successfully') : (isArabic ? '❌ اختبار: فشل إرسال النتيجة' : '❌ Test: Failed to send score');
        const bg = ok ? '#00c853' : '#b71c1c';
        const dir = isArabic ? 'rtl' : 'ltr';
        div.textContent = msg;
        div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:' + bg + ';color:#fff;padding:20px 30px;border-radius:12px;font:bold 16px Arial;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3);z-index:999999;direction:' + dir + ';';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }
    
    // حفظ الدالة الأصلية
    const originalCtlArcadeSaveScore = window.ctlArcadeSaveScore;
    
    // دالة جديدة لاستبدال ctlArcadeSaveScore
    function newCtlArcadeSaveScore(iScore) {
        log('🎯 ctlArcadeSaveScore called with score:', iScore);
        
        // إرسال للـ API الجديد مع Anti-Cheat
        const sanitizedScore = Math.floor(Math.abs(iScore)) || 0;
        if (sanitizedScore >= CONFIG.minScore) {
            // لا ترسل إذا لم يكن هناك input بعد (منع إرسال سكور قديم)
            if (!proofState.hasInput) {
                log('⏳ Waiting for user input before sending score...');
                return; // انتظر حتى يكون هناك تفاعل
            }
            sendScore(sanitizedScore);
        }
        
        // استدعاء الدالة الأصلية إذا كانت موجودة (للتوافق)
        if (typeof originalCtlArcadeSaveScore === 'function') {
            originalCtlArcadeSaveScore(iScore);
        }
        
        // استدعاء parent إذا كان موجود
        try {
            if (window.parent !== window && typeof window.parent.__ctlArcadeSaveScore === 'function') {
                window.parent.__ctlArcadeSaveScore({ score: iScore });
            }
        } catch (e) {}
    }
    
    // استبدال ctlArcadeSaveScore فوراً
    window.ctlArcadeSaveScore = newCtlArcadeSaveScore;
    
    // حماية الدالة من إعادة التعريف باستخدام Object.defineProperty
    try {
        Object.defineProperty(window, 'ctlArcadeSaveScore', {
            value: newCtlArcadeSaveScore,
            writable: false,
            configurable: false
        });
    } catch (e) {
        // إذا فشل، نستخدم الطريقة العادية
        log('⚠️ Could not protect ctlArcadeSaveScore, using normal assignment');
    }
    
    // إعادة استبدال الدالة بعد تحميل c2runtime.js
    function reinstallHandler() {
        if (window.ctlArcadeSaveScore !== newCtlArcadeSaveScore) {
            log('🔄 Reinstalling ctlArcadeSaveScore handler');
            try {
                Object.defineProperty(window, 'ctlArcadeSaveScore', {
                    value: newCtlArcadeSaveScore,
                    writable: false,
                    configurable: false
                });
            } catch (e) {
                window.ctlArcadeSaveScore = newCtlArcadeSaveScore;
            }
        }
    }
    
    // مراقبة أي محاولات لإعادة التعريف
    const handlerInterval = setInterval(() => {
        reinstallHandler();
    }, 100);
    
    async function init() {
        log('Initializing...');
        log('Game:', CONFIG.gameSlug);
        
        // Initialize Anti-Cheat
        initHoneypot();
        startTracking();
        await getNonce(); // Get initial nonce
        
        await new Promise(r => {
            if (document.readyState === 'complete') r();
            else window.addEventListener('load', r);
        });
        
        // إعادة استبدال بعد تحميل الصفحة
        setTimeout(() => {
            reinstallHandler();
            clearInterval(handlerInterval);
            // مراقبة دورية كل ثانية بعد التحميل
            setInterval(reinstallHandler, 1000);
        }, 2000);
        
        log('✅ Ready! Listening for ctlArcadeSaveScore calls with Anti-Cheat');
        
        if (isTestMode) {
            proofState.hasInput = true;
            setTimeout(async () => {
                const ok = await sendScore(10);
                showTestResult(ok);
            }, 800);
        }
    }
    
    init();
})();
