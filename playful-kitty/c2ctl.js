/**
 * c2ctl.js - Construct 2 Control Functions
 * 
 * هذا الملف يحتوي على الدوال الأساسية لـ Construct 2
 * حفظ النتيجة يتم الآن عبر sp-score.js (النظام الجديد)
 */

function ctlArcadeSaveScore(iScore){
    // sp-score.js يستمع لهذه الدالة ويستبدلها تلقائياً
    // هذا الكود موجود فقط للتوافق مع Construct 2
    if (window.parent !== window && window.parent.__ctlArcadeSaveScore) {
        window.parent.__ctlArcadeSaveScore({score: iScore});
    }
}

function ctlArcadeStartSession(){
    if (window.parent !== window && window.parent.__ctlArcadeStartSession) {
        window.parent.__ctlArcadeStartSession();
    }
}

function ctlArcadeEndSession(){
    if (window.parent !== window && window.parent.__ctlArcadeEndSession) {
        window.parent.__ctlArcadeEndSession();
    }
}

function ctlArcadeRestartLevel(){
    if (window.parent !== window && window.parent.__ctlArcadeRestartLevel) {
        window.parent.__ctlArcadeRestartLevel();
    }
}

function ctlArcadeStartLevel(){
    if (window.parent !== window && window.parent.__ctlArcadeStartLevel) {
        window.parent.__ctlArcadeStartLevel();
    }
}

function ctlArcadeEndLevel(){
    if (window.parent !== window && window.parent.__ctlArcadeEndLevel) {
        window.parent.__ctlArcadeEndLevel();
    }
}

function ctlArcadeShowInterlevelAD(){
    if (window.parent !== window && window.parent.__ctlArcadeShowInterlevelAD) {
        window.parent.__ctlArcadeShowInterlevelAD();
    }
}

function ctlArcadeShareEvent(szImg, szTitle, szMsg, szMsgShare){
    if (window.parent !== window && window.parent.__ctlArcadeShareEvent) {
        window.parent.__ctlArcadeShareEvent({ 
            img: szImg, 
            title: szTitle, 
            msg: szMsg, 
            msg_share: szMsgShare 
        });
    }
}

function ctlArcadeResume(){
    if (typeof c2_callFunction === 'function') {
        c2_callFunction("c2ctlArcadeResume");
    }
}

function ctlArcadePause(){
    if (typeof c2_callFunction === 'function') {
        c2_callFunction("c2ctlArcadePause");
    }
}

function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}
