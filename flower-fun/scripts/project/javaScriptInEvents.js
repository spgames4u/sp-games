

const scriptsInEvents = {

	async Game_Event263_Act4(runtime, localVars)
	{
		if (parseInt(runtime.globalVars.Level) <= 0) return;
		try {
			parent.__ctlArcadeSaveScore({
				s: parent.drftgyhunjmkythgbrfcdshnjikmo1f(
					parseInt(runtime.globalVars.Level) + 
					parent._oCtlArcadeIframeGlobalData['game_dir']
				),
				score: parseInt(runtime.globalVars.Level)
			});
		} catch (e) {
			// Cross-origin: لا يمكن الوصول لـ parent من iframe؛ الحفظ يتم عبر sp-score.js و IndexedDB
		}
	}
};

globalThis.C3.JavaScriptInEvents = scriptsInEvents;
