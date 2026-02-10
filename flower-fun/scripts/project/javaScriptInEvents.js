

const scriptsInEvents = {

	async Game_Event263_Act4(runtime, localVars)
	{
		if(parent.__ctlArcadeSaveScore && parseInt(runtime.globalVars.Level) > 0) {
		    parent.__ctlArcadeSaveScore({
		        s: parent.drftgyhunjmkythgbrfcdshnjikmo1f(
		            parseInt(runtime.globalVars.Level) + 
		            parent._oCtlArcadeIframeGlobalData['game_dir']
		        ),
		        score: parseInt(runtime.globalVars.Level)
		    });
		}
	}
};

globalThis.C3.JavaScriptInEvents = scriptsInEvents;
