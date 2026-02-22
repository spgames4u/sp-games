 function ctlArcadeSaveScore(iScore){
        if(parent.__ctlArcadeSaveScore){
            parent.__ctlArcadeSaveScore({score:iScore});
        }
    }


    function ctlArcadeStartSession(){
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
	
    var LEVEL_N_ID = '2607377724595618';
    var LEVEL_MAX_ID = '4889907286101801';
    function ctlArcadeEndLevel(){
        var lvl = 0;
        try {
            var rt = (document.getElementById('c2canvas') && document.getElementById('c2canvas').c2runtime) || window.c2runtime || (window.cr_getC2Runtime && window.cr_getC2Runtime());
            if (rt && rt.Mh) {
                var ln = rt.Mh[LEVEL_N_ID], lm = rt.Mh[LEVEL_MAX_ID];
                if (ln != null && ln.data != null) lvl = Math.max(lvl, Math.floor(parseFloat(ln.data)));
                if (lm != null && lm.data != null) lvl = Math.max(lvl, Math.floor(parseFloat(lm.data)));
                if (lvl === 0) {
                    for (var k in rt.Mh) {
                        if (rt.Mh.hasOwnProperty(k) && rt.Mh[k].data != null) {
                            var v = Math.floor(parseFloat(rt.Mh[k].data));
                            if (v >= 1 && v <= 15) lvl = Math.max(lvl, v);
                        }
                    }
                }
            }
            if (lvl === 0 && rt && rt.Ca && typeof rt.Ca.ja === 'number') {
                lvl = Math.min(Math.max(rt.Ca.ja, 1), 15);
            }
            lvl = Math.min(Math.max(lvl, 1), 15);
        } catch (e) {}
        if (lvl > 0 && parent.__ctlArcadeSaveScore) {
            parent.__ctlArcadeSaveScore({ score: lvl * 100, level: lvl });
        }
        if (typeof window.__SP_OnLevelEnd === 'function') {
            window.__SP_OnLevelEnd();
        }
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