////////////////////////////////////////////////////////////
// CANVAS LOADER
////////////////////////////////////////////////////////////

 /*!
 * 
 * START CANVAS PRELOADER - This is the function that runs to preload canvas asserts
 * 
 */
function initPreload(){
	toggleLoader(true);
	checkMobileEvent();
	
	$(window).resize(function(){
		resizeGameFunc();
	});
	resizeGameFunc();
	
	loader = new createjs.LoadQueue(false);
	manifest=[
			{src:'assets/background.png', id:'background'},
			{src:'assets/scene.png', id:'scene'},
			{src:'assets/logo.png', id:'logo'},
			{src:'assets/stroke_Spritesheet5x4.png', id:'stroke'},
			{src:'assets/ghost_Spritesheet4x4.png', id:'ghost'},
			{src:'assets/wizard_Spritesheet2x2.png', id:'wizard'},
			{src:'assets/wizard.png', id:'wizardHit'},
			{src:'assets/icon_wand.png', id:'wand'},
			{src:'assets/result.png', id:'result'},
			{src:'assets/button_share.png', id:'buttonShare'},
			{src:'assets/button_save.png', id:'buttonSave'},
			{src:'assets/social/button_facebook.png', id:'buttonFacebook'},
			{src:'assets/social/button_twitter.png', id:'buttonTwitter'},
			{src:'assets/social/button_whatsapp.png', id:'buttonWhatsapp'},
			{src:'assets/social/button_telegram.png', id:'buttonTelegram'},
			{src:'assets/social/button_reddit.png', id:'buttonReddit'},
			{src:'assets/social/button_linkedin.png', id:'buttonLinkedin'},
			
			{src:'assets/button_fullscreen.png', id:'buttonFullscreen'},
			{src:'assets/button_sound_on.png', id:'buttonSoundOn'},
			{src:'assets/button_sound_off.png', id:'buttonSoundOff'},
			{src:'assets/button_music_on.png', id:'buttonMusicOn'},
			{src:'assets/button_music_off.png', id:'buttonMusicOff'},
			
			{src:'assets/button_confirm.png', id:'buttonConfirm'},
				{src:'assets/button_cancel.png', id:'buttonCancel'},
				{src:'assets/item_exit.png', id:'itemExit'},
				{src:'assets/button_exit.png', id:'buttonExit'},
				{src:'assets/button_settings.png', id:'buttonSettings'}];
			
	for(n=0;n<symbols_arr.length;n++){
		manifest.push({src:symbols_arr[n].src, id:symbols_arr[n].id});	
	}
	
	if ( typeof addScoreboardAssets == 'function' ) { 
		addScoreboardAssets();
	}
	
	audioOn = true;
	if(!isDesktop){
		if(!enableMobileAudio){
			audioOn=false;
		}
	}else{
		if(!enableDesktopAudio){
			audioOn=false;
		}
	}
	
	if(audioOn){
		manifest.push({src:'assets/sounds/fail.ogg', id:'soundFail'});
		manifest.push({src:'assets/sounds/hit.ogg', id:'soundHit'});
		manifest.push({src:'assets/sounds/wand_01.ogg', id:'soundWand1'});
		manifest.push({src:'assets/sounds/wand_02.ogg', id:'soundWand2'});
		manifest.push({src:'assets/sounds/wand_03.ogg', id:'soundWand3'});
		manifest.push({src:'assets/sounds/musicMain.ogg', id:'musicMain'});
		manifest.push({src:'assets/sounds/musicGame.ogg', id:'musicGame'});
		manifest.push({src:'assets/sounds/ghost_01.ogg', id:'soundGhost1'});
		manifest.push({src:'assets/sounds/ghost_02.ogg', id:'soundGhost2'});
		manifest.push({src:'assets/sounds/life.ogg', id:'soundLife'});
		
		createjs.Sound.alternateExtensions = ["mp3"];
		loader.installPlugin(createjs.Sound);
	}
	
	loader.addEventListener("complete", handleComplete);
	loader.addEventListener("fileload", fileComplete);
	loader.addEventListener("error",handleFileError);
	loader.on("progress", handleProgress, this);
	loader.loadManifest(manifest);
}

/*!
 * 
 * CANVAS FILE COMPLETE EVENT - This is the function that runs to update when file loaded complete
 * 
 */
function fileComplete(evt) {
	var item = evt.item;
	//console.log("Event Callback file loaded ", item.id);
}

/*!
 * 
 * CANVAS FILE HANDLE EVENT - This is the function that runs to handle file error
 * 
 */
function handleFileError(evt) {
	console.log("error ", evt);
}

/*!
 * 
 * CANVAS PRELOADER UPDATE - This is the function that runs to update preloder progress
 * 
 */
function handleProgress() {
	$('#mainLoader span').html(Math.round(loader.progress/1*100)+'%');
}

/*!
 * 
 * CANVAS PRELOADER COMPLETE - This is the function that runs when preloader is complete
 * 
 */
function handleComplete() {
	toggleLoader(false);
	initMain();
};

/*!
 * 
 * TOGGLE LOADER - This is the function that runs to display/hide loader
 * 
 */
function toggleLoader(con){
	if(con){
		$('#mainLoader').show();
	}else{
		$('#mainLoader').hide();
	}
}