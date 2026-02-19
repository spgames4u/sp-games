


const scriptsInEvents = {

	async Gamesettings_Event133_Act2(runtime, localVars)
	{
		if(parent.__ctlArcadeSaveScore && parseInt(runtime.globalVars.Score) > 0) {
			const score = parseInt(runtime.globalVars.Score);
			if (parent._oCtlArcadeIframeGlobalData && parent.drftgyhunjmkythgbrfcdshnjikmo1f) {
				parent.__ctlArcadeSaveScore({s: parent.drftgyhunjmkythgbrfcdshnjikmo1f(score + parent._oCtlArcadeIframeGlobalData['game_dir']), score: score});
			} else {
				parent.__ctlArcadeSaveScore({s: score, score: score});
			}
		}
	}

};

self.C3.ScriptsInEvents = scriptsInEvents;

