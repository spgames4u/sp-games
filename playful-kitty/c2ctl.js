 function ctlArcadeSaveScore(iScore){
        console.log('🎯 ctlArcadeSaveScore called with score:', iScore);
        
        // دالة مساعدة لحفظ النتيجة مع إعادة تهيئة تلقائية إذا لزم الأمر
        const saveScoreWithRetry = async () => {
            // محاولة حفظ النتيجة
            try {
                const result = await ScorePoint.submitScore(iScore);
                
                if (result.success) {
                    console.log('✅ Score saved to ScorePoint:', iScore);
                    // عرض رسالة نجاح مرئية
                    if (typeof showScorepointToast === 'function') {
                        showScorepointToast('✅ تم حفظ نتيجتك: ' + iScore + ' نقطة!', 'success');
                    }
                    // إعادة تهيئة SDK للجلسة التالية
                    if (window.gameId) {
                        ScorePoint.init(window.gameId).then(initResult => {
                            if (initResult.success) {
                                window.sdkInitialized = true;
                                console.log('✅ SDK re-initialized for next game');
                            }
                        });
                    }
                } else {
                    // إذا فشل بسبب عدم وجود session، إعادة تهيئة وحفظ مرة أخرى
                    if (result.error && result.error.includes('تهيئة SDK')) {
                        console.log('🔄 Re-initializing SDK and retrying...');
                        if (window.gameId) {
                            const initResult = await ScorePoint.init(window.gameId);
                            if (initResult.success) {
                                window.sdkInitialized = true;
                                // محاولة حفظ مرة أخرى
                                const retryResult = await ScorePoint.submitScore(iScore);
                                if (retryResult.success) {
                                    console.log('✅ Score saved after re-init:', iScore);
                                    if (typeof showScorepointToast === 'function') {
                                        showScorepointToast('✅ تم حفظ نتيجتك: ' + iScore + ' نقطة!', 'success');
                                    }
                                } else {
                                    throw new Error(retryResult.error);
                                }
                            } else {
                                throw new Error(initResult.error);
                            }
                        } else {
                            throw new Error('Game ID not found');
                        }
                    } else {
                        throw new Error(result.error);
                    }
                }
            } catch (err) {
                console.error('❌ Error saving score:', err);
                // عرض رسالة خطأ مرئية
                if (typeof showScorepointToast === 'function') {
                    showScorepointToast('❌ فشل في حفظ النتيجة: ' + err.message, 'error');
                }
            }
        };
        
        // حفظ النتيجة في ScorePoint إذا كان SDK متاحاً
        if (typeof ScorePoint !== 'undefined' && window.gameId) {
            // إذا لم يكن SDK مهيأ، إعادة تهيئته أولاً
            if (!window.sdkInitialized || !ScorePoint.sessionToken) {
                console.log('🔄 Initializing SDK before saving score...');
                ScorePoint.init(window.gameId).then(initResult => {
                    if (initResult.success) {
                        window.sdkInitialized = true;
                        saveScoreWithRetry();
                    } else {
                        console.error('❌ Failed to initialize SDK:', initResult.error);
                        if (typeof showScorepointToast === 'function') {
                            showScorepointToast('❌ فشل في تهيئة النظام', 'error');
                        }
                    }
                });
            } else {
                saveScoreWithRetry();
            }
        } else {
            console.warn('⚠️ ScorePoint SDK not ready. Score:', iScore);
            // عرض رسالة تحذير
            if (typeof showScorepointToast === 'function') {
                showScorepointToast('⚠️ جاري تهيئة النظام...', 'error');
            }
        }
        
        // استدعاء الدالة الأصلية في parent
        if(parent.__ctlArcadeSaveScore){
            parent.__ctlArcadeSaveScore({score:iScore});
        }
    }


    function ctlArcadeStartSession(){
        console.log('🎮 Game session started');
        // إعادة تهيئة SDK عند بدء جلسة جديدة
        if (typeof ScorePoint !== 'undefined' && window.gameId) {
            ScorePoint.init(window.gameId).then(result => {
                if (result.success) {
                    window.sdkInitialized = true;
                    console.log('✅ SDK initialized for new game session');
                } else {
                    console.error('❌ Failed to initialize SDK:', result.error);
                }
            });
        }
        
        if(parent.__ctlArcadeStartSession){
            parent.__ctlArcadeStartSession();
        }
    }

    function ctlArcadeEndSession(){
        if(parent.__ctlArcadeEndSession){
            parent.__ctlArcadeEndSession();
        }
    }

    function ctlArcadeRestartLevel(){
        if(parent.__ctlArcadeRestartLevel){
            parent.__ctlArcadeRestartLevel();
        }
    }
	
    function ctlArcadeStartLevel(){
        if(parent.__ctlArcadeStartLevel){
            parent.__ctlArcadeStartLevel();
        }
    }
	
    function ctlArcadeEndLevel(){
        if(parent.__ctlArcadeEndLevel){
            parent.__ctlArcadeEndLevel();
        }
    }

	function ctlArcadeShowInterlevelAD(){
        if(parent.__ctlArcadeShowInterlevelAD){
            parent.__ctlArcadeShowInterlevelAD();
        }
    }
	
	    function ctlArcadeShareEvent(szImg, szTitle, szMsg, szMsgShare){
			console.log (szImg);
			console.log (szTitle);
			console.log (szMsg);
			console.log (szMsgShare);
        if(parent.__ctlArcadeShareEvent){
            parent.__ctlArcadeShareEvent({ img : szImg, title: szTitle, msg : szMsg, msg_share: szMsgShare });
        }
    }
	
	function ctlArcadeResume(){
		c2_callFunction("c2ctlArcadeResume");
	}

	function ctlArcadePause(){
		c2_callFunction("c2ctlArcadePause");
	}
	
	function inIframe() {
		console.log ('enter');
	   try {
		   return window.self !== window.top;
	   } catch (e) {
		   return true;
	   }
	}