


const scriptsInEvents = {

	async Gamesettings_Event133_Act2(runtime, localVars)
	{
		const score = parseInt(runtime.globalVars.Score);
		if (score <= 0) return;
		let handler = window.__ctlArcadeSaveScore;
		if (!handler) {
			try {
				if (parent !== window && parent.__ctlArcadeSaveScore) handler = parent.__ctlArcadeSaveScore;
			} catch (e) {}
		}
		if (handler) {
			try {
				if (parent._oCtlArcadeIframeGlobalData && parent.drftgyhunjmkythgbrfcdshnjikmo1f) {
					handler({s: parent.drftgyhunjmkythgbrfcdshnjikmo1f(score + parent._oCtlArcadeIframeGlobalData['game_dir']), score: score});
				} else {
					handler({s: score, score: score});
				}
			} catch (e) {
				handler({s: score, score: score});
			}
		}
	}

};

self.C3.ScriptsInEvents = scriptsInEvents;

