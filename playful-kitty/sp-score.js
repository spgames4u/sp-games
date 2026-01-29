/**
 * sp-score.js - Score Bridge for Construct 2 Games
 * v2.0 - يرسل فوراً + يُحدّث الإحصائيات
 * 
 * هذا الملف مخصص لألعاب Construct 2
 * يستمع لاستدعاءات ctlArcadeSaveScore ويرسل النتيجة للـ API
 */

(function() {
    'use strict';
    
    const CONFIG = {
        apiUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/save-score'
            : 'https://new.sp.games/api/games/save-score',
        gameSlug: (() => {
            const params = new URLSearchParams(location.search);
            if (params.get('gameSlug')) return params.get('gameSlug');
            const parts = location.pathname.split('/').filter(Boolean);
            return parts[0] === 'games' ? (parts[1] || 'playful-kitty') : (parts[0] || 'playful-kitty');
        })(),
        minScore: 1,
        debug: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    };
    
    let lastSentScore = 0;
    let isSending = false;
    
    const log = CONFIG.debug 
        ? (...args) => console.log('%c[SP-Score-C2]', 'color: #00c853; font-weight: bold', ...args)
        : () => {};
    
    async function sendScore(score) {
        if (isSending || score < CONFIG.minScore || score <= lastSentScore) return false;
        
        isSending = true;
        log('📤 Sending score:', score);
        
        try {
            const response = await fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ gameSlug: CONFIG.gameSlug, score: score })
            });
            
            if (response.ok) {
                const result = await response.json();
                log('✅ Score saved!', result);
                lastSentScore = score;
                
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
                log('❌ API Error:', response.status, response.statusText);
            }
        } catch (e) {
            log('❌ Error:', e.message);
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
    
    // حفظ الدالة الأصلية
    const originalCtlArcadeSaveScore = window.ctlArcadeSaveScore;
    
    // دالة جديدة لاستبدال ctlArcadeSaveScore
    function newCtlArcadeSaveScore(iScore) {
        log('🎯 ctlArcadeSaveScore called with score:', iScore);
        
        // إرسال للـ API الجديد
        const sanitizedScore = Math.floor(Math.abs(iScore)) || 0;
        if (sanitizedScore >= CONFIG.minScore) {
            sendScore(sanitizedScore);
        }
        
        // استدعاء الدالة الأصلية إذا كانت موجودة (للتوافق)
        if (typeof originalCtlArcadeSaveScore === 'function') {
            originalCtlArcadeSaveScore(iScore);
        }
        
        // استدعاء parent إذا كان موجود
        if (window.parent !== window && window.parent.__ctlArcadeSaveScore) {
            window.parent.__ctlArcadeSaveScore({ score: iScore });
        }
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
        
        log('✅ Ready! Listening for ctlArcadeSaveScore calls');
    }
    
    init();
})();
