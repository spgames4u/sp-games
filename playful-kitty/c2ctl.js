/**
 * c2ctl.js - Construct 2 Control Bridge
 * 
 * هذا الملف مطلوب من c2runtime.js لكن لا يحتوي على أي كود
 * لأن sp-score.js يتولى جميع الوظائف
 */

// التحقق من وجود الدالة أولاً (sp-score.js يعرّفها قبل هذا الملف)
// استخدام var بدلاً من function declaration لتجنب hoisting
if (typeof window.ctlArcadeSaveScore === 'undefined') {
    // دالة فارغة فقط إذا لم تكن موجودة
    window.ctlArcadeSaveScore = function(iScore) {
        // sp-score.js يستبدل هذه الدالة تلقائياً
        // لا حاجة لأي كود هنا
    };
}
