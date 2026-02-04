/**
 * لعبة "من أنا؟" - Who Am I?
 * تتواصل مع الصفحة الأم عبر postMessage
 */

(function() {
    'use strict';
    
    // ===== الحالة =====
    let currentQuestion = null;
    let revealedHints = 1; // التلميح الأول مكشوف دائماً
    const totalHints = 3;
    let lang = 'ar';
    let isWaiting = true;
    
    // ===== العناصر =====
    const screens = {
        loading: document.getElementById('loadingScreen'),
        game: document.getElementById('gameScreen'),
        result: document.getElementById('resultScreen')
    };
    
    const elements = {
        loadingText: document.getElementById('loadingText'),
        hint1: document.getElementById('hint1'),
        hint1Text: document.getElementById('hint1Text'),
        hint2: document.getElementById('hint2'),
        hint2Text: document.getElementById('hint2Text'),
        hint3: document.getElementById('hint3'),
        hint3Text: document.getElementById('hint3Text'),
        revealBtn: document.getElementById('revealHintBtn'),
        revealBtnText: document.getElementById('revealBtnText'),
        answerInput: document.getElementById('answerInput'),
        answerHint: document.getElementById('answerHint'),
        submitBtn: document.getElementById('submitBtn'),
        resultIcon: document.getElementById('resultIcon'),
        resultTitle: document.getElementById('resultTitle'),
        resultAnswer: document.getElementById('resultAnswer'),
        resultCoins: document.getElementById('resultCoins'),
        coinsEarned: document.getElementById('coinsEarned'),
        resultNext: document.getElementById('resultNext')
    };
    
    // ===== التهيئة =====
    function init() {
        // قراءة اللغة من URL
        const urlParams = new URLSearchParams(window.location.search);
        lang = urlParams.get('lang') || 'ar';
        
        // ضبط اتجاه الصفحة
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        // تحديث النصوص
        updateTexts();
        
        // ربط الأحداث
        elements.answerInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitAnswer();
            }
        });
        
        // الاستماع للرسائل من الصفحة الأم
        window.addEventListener('message', handleMessage);
        
        // إعلام الصفحة الأم أن اللعبة جاهزة
        sendToParent({ type: 'ready' });
        
        console.log('[Who Am I] Game initialized, lang:', lang);
    }
    
    // ===== تحديث النصوص حسب اللغة =====
    function updateTexts() {
        const texts = {
            ar: {
                loading: 'جاري التحميل...',
                revealHint: 'كشف تلميح',
                allRevealed: 'كل التلميحات مكشوفة',
                placeholder: 'اكتب إجابتك هنا...',
                guessHint: 'خمّن من أنا من التلميحات!',
                correct: 'أحسنت! 🎉',
                wrong: 'للأسف! 😔',
                theAnswer: 'الإجابة الصحيحة:',
                nextQuestion: 'السؤال التالي...'
            },
            en: {
                loading: 'Loading...',
                revealHint: 'Reveal Hint',
                allRevealed: 'All hints revealed',
                placeholder: 'Type your answer...',
                guessHint: 'Guess who am I from the hints!',
                correct: 'Correct! 🎉',
                wrong: 'Wrong! 😔',
                theAnswer: 'The correct answer:',
                nextQuestion: 'Next question...'
            }
        };
        
        const t = texts[lang] || texts.ar;
        
        elements.loadingText.textContent = t.loading;
        elements.revealBtnText.textContent = t.revealHint;
        elements.answerInput.placeholder = t.placeholder;
        elements.answerHint.textContent = t.guessHint;
        elements.resultNext.textContent = t.nextQuestion;
    }
    
    // ===== التعامل مع الرسائل =====
    function handleMessage(event) {
        const data = event.data;
        
        if (!data || !data.type) return;
        
        console.log('[Who Am I] Received message:', data.type);
        
        switch (data.type) {
            case 'question':
                loadQuestion(data.data);
                break;
                
            case 'result':
                showResult(data.isCorrect, data.correctAnswer, data.alreadyAnswered);
                if (typeof data.earnedLandCoin === 'number' && data.earnedLandCoin > 0) {
                    elements.coinsEarned.textContent = '+' + data.earnedLandCoin;
                } else if (data.alreadyAnswered) {
                    elements.coinsEarned.textContent = lang === 'ar' ? 'أجبت من قبل' : 'Answered before';
                }
                break;
                
            case 'feedback':
                // يمكن إضافة تأثيرات إضافية هنا لاحقاً
                break;
        }
    }
    
    // ===== تحميل سؤال جديد =====
    function loadQuestion(data) {
        console.log('[Who Am I] Loading question:', data);
        
        currentQuestion = data;
        revealedHints = 1;
        isWaiting = false;
        
        const hints = [
            data.field1 || '؟؟؟',
            data.field2 || '؟؟؟',
            data.field3 || '؟؟؟'
        ];
        
        elements.hint1.classList.remove('locked');
        elements.hint1.classList.add('revealed');
        elements.hint1Text.textContent = hints[0];
        
        elements.hint2.classList.add('locked');
        elements.hint2.classList.remove('revealed');
        elements.hint2Text.textContent = '🔒';
        elements.hint2.dataset.text = hints[1];
        
        elements.hint3.classList.add('locked');
        elements.hint3.classList.remove('revealed');
        elements.hint3Text.textContent = '🔒';
        elements.hint3.dataset.text = hints[2];
        
        updateRevealButton();
        
        elements.answerInput.value = '';
        elements.answerInput.disabled = false;
        elements.submitBtn.disabled = false;
        
        showScreen('game');
        
        setTimeout(() => elements.answerInput.focus(), 250);
    }
    
    // ===== كشف التلميح التالي =====
    window.revealNextHint = function() {
        if (revealedHints >= totalHints) return;
        
        revealedHints++;
        
        if (revealedHints === 2) {
            elements.hint2.classList.remove('locked');
            elements.hint2.classList.add('revealed');
            elements.hint2Text.textContent = elements.hint2.dataset.text || '؟؟؟';
        } else if (revealedHints === 3) {
            elements.hint3.classList.remove('locked');
            elements.hint3.classList.add('revealed');
            elements.hint3Text.textContent = elements.hint3.dataset.text || '؟؟؟';
        }
        
        updateRevealButton();
    };
    
    // ===== تحديث زر الكشف =====
    function updateRevealButton() {
        const texts = lang === 'ar' 
            ? { reveal: 'كشف تلميح', all: 'كل التلميحات مكشوفة' }
            : { reveal: 'Reveal Hint', all: 'All hints revealed' };
        
        if (revealedHints >= totalHints) {
            elements.revealBtn.disabled = true;
            elements.revealBtnText.textContent = texts.all;
        } else {
            elements.revealBtn.disabled = false;
            elements.revealBtnText.textContent = texts.reveal + ' (' + (totalHints - revealedHints) + ')';
        }
    }
    
    // ===== إرسال الإجابة =====
    window.submitAnswer = function() {
        if (isWaiting) return;
        
        const answer = elements.answerInput.value.trim();
        
        if (!answer) {
            elements.answerInput.classList.add('shake');
            setTimeout(() => elements.answerInput.classList.remove('shake'), 500);
            return;
        }
        
        isWaiting = true;
        elements.answerInput.disabled = true;
        elements.submitBtn.disabled = true;
        
        sendToParent({
            type: 'answer',
            answer: answer
        });
        
        console.log('[Who Am I] Answer submitted:', answer);
    };
    
    // ===== عرض النتيجة =====
    function showResult(isCorrect, correctAnswer, alreadyAnswered) {
        const texts = lang === 'ar'
            ? { correct: 'أحسنت! 🎉', wrong: 'للأسف! 😔', alreadyAnswered: 'أجبت على هذا السؤال من قبل' }
            : { correct: 'Correct! 🎉', wrong: 'Wrong! 😔', alreadyAnswered: 'You answered this question before' };
        
        elements.resultIcon.textContent = isCorrect ? '✓' : '✗';
        elements.resultIcon.className = 'result-icon ' + (isCorrect ? 'correct' : 'wrong');
        
        elements.resultTitle.textContent = (isCorrect && alreadyAnswered) ? texts.alreadyAnswered : (isCorrect ? texts.correct : texts.wrong);
        elements.resultTitle.className = 'result-title ' + (isCorrect ? 'correct' : 'wrong');
        
        // لا تظهر الإجابة الصحيحة
        elements.resultAnswer.style.display = 'none';
        
        if (isCorrect) {
            elements.resultCoins.classList.remove('hidden');
        } else {
            elements.resultCoins.classList.add('hidden');
        }
        
        showScreen('result');
    }
    
    // ===== التبديل بين الشاشات =====
    function showScreen(screenName) {
        Object.keys(screens).forEach(key => {
            screens[key].classList.remove('active');
        });
        
        if (screens[screenName]) {
            screens[screenName].classList.add('active');
        }
    }
    
    // ===== إرسال رسالة للصفحة الأم =====
    function sendToParent(data) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(data, '*');
        }
    }
    
    // ===== إضافة CSS للـ shake =====
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        .shake {
            animation: shake 0.3s ease;
            border-color: var(--red) !important;
        }
    `;
    document.head.appendChild(style);
    
    // ===== بدء اللعبة =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
