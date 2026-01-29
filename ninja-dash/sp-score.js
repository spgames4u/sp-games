/**
 * sp-score.js - Score Bridge for sp.games
 * v3.0 - يرسل فوراً + يُحدّث الإحصائيات
 */

(function() {
    'use strict';
    
    const CONFIG = {
        apiUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api/games/save-score'
            : 'https://new.sp.games/api/games/save-score',
        gameSlug: (() => {
            const parts = location.pathname.split('/').filter(Boolean);
            return parts[0] === 'games' ? (parts[1] || 'unknown') : (parts[0] || 'unknown');
        })(),
        pollInterval: 2000,
        minScore: 1,
        debug: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    };
    
    let projectId = null;
    let lastSentScore = 0;
    let isSending = false;
    
    const log = CONFIG.debug 
        ? (...args) => console.log('%c[SP-Score]', 'color: #00c853; font-weight: bold', ...args)
        : () => {};
    
    async function detectProjectId() {
        if (indexedDB.databases) {
            try {
                const dbs = await indexedDB.databases();
                for (const db of dbs) {
                    if (db.name?.startsWith('c3-localstorage-')) {
                        return db.name.replace('c3-localstorage-', '');
                    }
                }
            } catch (e) {}
        }
        try {
            const resp = await fetch('data.json');
            const data = await resp.json();
            if (data.project?.[31]) return data.project[31];
        } catch (e) {}
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
            return Math.floor(last || best) || null;
        } catch (e) { return null; }
    }
    
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
    
    async function poll() {
        const score = await detectScore();
        if (score && score > lastSentScore) {
            await sendScore(score);
        }
    }
    
    async function init() {
        log('Initializing...');
        log('Game:', CONFIG.gameSlug);
        
        await new Promise(r => {
            if (document.readyState === 'complete') r();
            else window.addEventListener('load', r);
        });
        
        await new Promise(r => setTimeout(r, 2500));
        
        projectId = await detectProjectId();
        if (!projectId) { log('❌ Not a Construct 3 game'); return; }
        
        log('✅ Ready! Project:', projectId);
        
        setInterval(poll, CONFIG.pollInterval);
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) poll();
        });
        
        window.addEventListener('beforeunload', async () => {
            const score = await detectScore();
            if (score && score > lastSentScore) {
                navigator.sendBeacon?.(CONFIG.apiUrl, JSON.stringify({
                    gameSlug: CONFIG.gameSlug, score: score
                }));
            }
        });
        
        setTimeout(poll, 1000);
    }
    
    init();
})();
