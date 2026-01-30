////////////////////////////////////////////////////////////
// CANVAS
////////////////////////////////////////////////////////////
var stage;
var canvasW=0;
var canvasH=0;

/*!
 * 
 * START GAME CANVAS - This is the function that runs to setup game canvas
 * 
 */
function initGameCanvas(w,h){
	const gameCanvas = document.getElementById("gameCanvas");
	gameCanvas.width = w;
	gameCanvas.height = h;
	
	canvasW=w;
	canvasH=h;
	stage = new createjs.Stage("gameCanvas",{ antialias: true });
	
	createjs.Touch.enable(stage);
	stage.enableMouseOver(20);
	stage.mouseMoveOutside = true;
	
	createjs.Ticker.framerate = 60;
	createjs.Ticker.addEventListener("tick", tick);	
}

var safeZoneGuide = false;
var canvasContainer, mainContainer, gameContainer, resultContainer, exitContainer, optionsContainer, shareContainer, shareSaveContainer, socialContainer;
var guideline, bg, bgP, logo, logoP;
var itemExit, itemExitP, popTitleTxt, popDescTxt, buttonConfirm, buttonCancel;
var itemResult, itemResultP, buttonContinue, resultTitleTxt, resultDescTxt, buttonShare, buttonSave;
var resultTitleOutlineTxt,resultDescOutlineTxt,resultShareTxt,resultShareOutlineTxt,popTitleOutlineTxt,popDescOutlineTxt;
var buttonSettings, buttonFullscreen, buttonSoundOn, buttonSoundOff, buttonMusicOn, buttonMusicOff, buttonExit;
$.share = {};

var sceneContainer, ghoulContainer, drawingContainer, wandContainer;
var background, strokeAnimate, wizardData, wizardAnimate, wizardHit, ghoulData, ghoulAnime, txtScore, wand, instructionTxt,  result, resultScoreTxt, resultScoreShadowTxt, resultTitleTxt, resultTitleShadowTxt, saveStatusTxt, saveStatusShadowTxt;
var confirmMessageTxt;
$.symbols={};
$.colours={};
$.drawingCanvas={};
$.wand={};

/*!
 * 
 * BUILD GAME CANVAS ASSERTS - This is the function that runs to build game canvas asserts
 * 
 */
function buildGameCanvas(){
	canvasContainer = new createjs.Container();
    mainContainer = new createjs.Container();
    gameContainer = new createjs.Container();
    exitContainer = new createjs.Container();
    resultContainer = new createjs.Container();
    shareContainer = new createjs.Container();
    shareSaveContainer = new createjs.Container();
    socialContainer = new createjs.Container();
	
	sceneContainer = new createjs.Container();
	ghoulContainer = new createjs.Container();
	drawingContainer = new createjs.Container();
	wandContainer = new createjs.Container();
	
	background = new createjs.Bitmap(loader.getResult('background'));
	logo = new createjs.Bitmap(loader.getResult('logo'));
	
	var _frameW=190;
	var _frameH=192;
	var _frame = {"regX": (_frameW/2), "regY": (_frameH/2), "height": _frameH, "count": 20, "width": _frameW};
	var _animations = {anime:{frames: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19], speed:1, next:'hold'},
						hold:{frames: [19,19,19,19,19], speed:1, next:'anime'}};
						
	strokeData = new createjs.SpriteSheet({
		"images": [loader.getResult("stroke").src],
		"frames": _frame,
		"animations": _animations
	});
	
	strokeAnimate = new createjs.Sprite(strokeData, "anime");
	strokeAnimate.framerate = 20;
	strokeAnimate.x = canvasW/2;
	strokeAnimate.y = canvasH/100 * 56;
	strokeAnimate.scaleX = strokeAnimate.scaleY = .8;
	
	scene = new createjs.Bitmap(loader.getResult('scene'));
	scene.x = -50;
	
	var _frameW=210;
	var _frameH=200;
	var _frame = {"regX": (_frameW/2), "regY": (_frameH/2), "height": _frameH, "count": 4, "width": _frameW};
	var _animations = {anime:{frames: [0,1,2,3], speed:.1, next:'anime'}};
						
	wizardData = new createjs.SpriteSheet({
		"images": [loader.getResult("wizard").src],
		"frames": _frame,
		"animations": _animations
	});
	
	wizardAnimate = new createjs.Sprite(wizardData, "anime");
	wizardAnimate.framerate = 20;
	wizardAnimate.x = canvasW/2;
	wizardAnimate.y = canvasH/100 * 42;
	
	wizardHit = new createjs.Bitmap(loader.getResult('wizardHit'));
	centerReg(wizardHit);
	wizardHit.x = wizardAnimate.x;
	wizardHit.y = wizardAnimate.y;
	
	var _frameW=160;
	var _frameH=190;
	var _frame = {"regX": 110, "regY": 54, "height": _frameH, "count": 15, "width": _frameW};
	var _animations = {walk:{frames: [0,1,2,3,4,5,6,7,8,9,8,7,6,5,4,3,2,1], speed:1, next:'walk'},
						hit:{frames: [10,11,12,13,14,13,12,11], speed:1, next:'hit'}};
						
	ghoulData = new createjs.SpriteSheet({
		"images": [loader.getResult("ghost").src],
		"frames": _frame,
		"animations": _animations
	});
	
	ghoulAnime = new createjs.Sprite(ghoulData, "walk");
	ghoulAnime.framerate = 20;
	ghoulAnime.x = -200;
	ghoulAnime.y = 0;
	
	$.drawingCanvas['default'] = new createjs.Shape();
	drawingContainer.addChild($.drawingCanvas['default']);
	
	for(var n=0;n<symbols_arr.length;n++){
		var iconID = symbols_arr[n].id;
		$.symbols[iconID] = new createjs.Bitmap(loader.getResult(symbols_arr[n].id));
		$.symbols[iconID].widthNum = symbols_arr[n].width;
		$.colours[iconID] = symbols_arr[n].colour;
		$.symbols[iconID].x = -100;
		centerReg($.symbols[iconID]);
		sceneContainer.addChild($.symbols[iconID]);
		$.drawingCanvas[iconID] = new createjs.Shape();
		drawingContainer.addChild($.drawingCanvas[iconID]);
	}
	
	txtScore = new createjs.Text();
	txtScore.font = "50px cardenio_modernbold";
	txtScore.color = '#ffd200';
	txtScore.text = '';
	txtScore.textAlign = "center";
	txtScore.textBaseline='alphabetic';
	
	wand = new createjs.Bitmap(loader.getResult('wand'));
	wand.x = -100;
	centerReg(wand);
	
	instructionTxt = new createjs.Text();
	instructionTxt.font = "40px cardenio_modernbold";
	instructionTxt.color = '#e5e198';
	instructionTxt.text = instructionText;
	instructionTxt.textAlign = "center";
	instructionTxt.textBaseline='alphabetic';
	instructionTxt.x = canvasW/2;
	instructionTxt.y = canvasH/100 * 65;
	instructionTxt.lineHeight = 45;
	
	//result
	result = new createjs.Bitmap(loader.getResult('result'));
	
	resultTitleTxt = new createjs.Text();
	resultTitleTxt.font = "120px cardenio_modernbold";
	resultTitleTxt.color = "#574670";
	resultTitleTxt.text = resultTitleText;
	resultTitleTxt.textAlign = "center";
	resultTitleTxt.textBaseline='alphabetic';
	resultTitleTxt.x = canvasW/2;
	resultTitleTxt.y = canvasH/100*30;
	
	resultTitleShadowTxt = new createjs.Text();
	resultTitleShadowTxt.font = "120px cardenio_modernbold";
	resultTitleShadowTxt.color = "#fff";
	resultTitleShadowTxt.text = resultTitleText;
	resultTitleShadowTxt.textAlign = "center";
	resultTitleShadowTxt.textBaseline='alphabetic';
	resultTitleShadowTxt.x = resultTitleTxt.x
	resultTitleShadowTxt.y = resultTitleTxt.y + 8;
	
	resultScoreTxt = new createjs.Text();
	resultScoreTxt.font = "100px cardenio_modernbold";
	resultScoreTxt.color = "#e5e198";
	resultScoreTxt.textAlign = "center";
	resultScoreTxt.textBaseline='alphabetic';
	resultScoreTxt.x = canvasW/2;
	resultScoreTxt.y = canvasH/100*43;
	
	resultScoreShadowTxt = new createjs.Text();
	resultScoreShadowTxt.font = "100px cardenio_modernbold";
	resultScoreShadowTxt.color = "#fff";
	resultScoreShadowTxt.textAlign = "center";
	resultScoreShadowTxt.textBaseline='alphabetic';
	resultScoreShadowTxt.x = resultScoreTxt.x;
	resultScoreShadowTxt.y = resultScoreTxt.y + 8;
	
	// Save status text (جاري الحفظ... / تم الحفظ بنجاح)
	saveStatusTxt = new createjs.Text();
	saveStatusTxt.font = "30px cardenio_modernbold";
	saveStatusTxt.color = "#84C441";
	saveStatusTxt.textAlign = "center";
	saveStatusTxt.textBaseline='alphabetic';
	saveStatusTxt.x = canvasW/2;
	saveStatusTxt.y = resultScoreTxt.y + 120;
	saveStatusTxt.text = '';
	saveStatusTxt.visible = false;
	
	saveStatusShadowTxt = new createjs.Text();
	saveStatusShadowTxt.font = "30px cardenio_modernbold";
	saveStatusShadowTxt.color = "#fff";
	saveStatusShadowTxt.textAlign = "center";
	saveStatusShadowTxt.textBaseline='alphabetic';
	saveStatusShadowTxt.x = saveStatusTxt.x;
	saveStatusShadowTxt.y = saveStatusTxt.y + 4;
	saveStatusShadowTxt.text = '';
	saveStatusShadowTxt.visible = false;
	
	shareContainer.x = shareSaveContainer.x = canvasW/2;
    shareContainer.y = shareSaveContainer.y = canvasH/100 * 70;

    socialContainer.visible = false;
    socialContainer.scale = 1;
    shareContainer.addChild(socialContainer);

    if(shareSettings.enable){
        buttonShare = new createjs.Bitmap(loader.getResult('buttonShare'));
        centerReg(buttonShare);
        
        var pos = {x:0, y:45, spaceX:65};
        pos.x = -(((shareSettings.options.length-1) * pos.spaceX)/2)
        for(let n=0; n<shareSettings.options.length; n++){
            var shareOption = shareSettings.options[n];
            var shareAsset = String(shareOption[0]).toUpperCase() + String(shareOption).slice(1);
            $.share['button'+n] = new createjs.Bitmap(loader.getResult('button'+shareAsset));
            $.share['button'+n].shareOption = shareOption;
            centerReg($.share['button'+n]);
            $.share['button'+n].x = pos.x;
            $.share['button'+n].y = pos.y;
            socialContainer.addChild($.share['button'+n]);
            pos.x += pos.spaceX;
        }
        buttonShare.y = (buttonShare.image.naturalHeight/2) + 10;
        shareContainer.addChild(buttonShare);
    }

    if ( typeof toggleScoreboardSave == 'function' ) { 
        buttonSave = new createjs.Bitmap(loader.getResult('buttonSave'));
        centerReg(buttonSave);
        buttonSave.y = (buttonSave.image.naturalHeight/2) + 10;
        shareSaveContainer.addChild(buttonSave);
    }
	
	exitContainer = new createjs.Container();
	optionsContainer = new createjs.Container();
	
	//option
	buttonFullscreen = new createjs.Bitmap(loader.getResult('buttonFullscreen'));
	centerReg(buttonFullscreen);
	buttonSoundOn = new createjs.Bitmap(loader.getResult('buttonSoundOn'));
	centerReg(buttonSoundOn);
	buttonSoundOff = new createjs.Bitmap(loader.getResult('buttonSoundOff'));
	centerReg(buttonSoundOff);
	buttonSoundOn.visible = false;
	buttonMusicOn = new createjs.Bitmap(loader.getResult('buttonMusicOn'));
	centerReg(buttonMusicOn);
	buttonMusicOff = new createjs.Bitmap(loader.getResult('buttonMusicOff'));
	centerReg(buttonMusicOff);
	buttonMusicOn.visible = false;
	
	buttonExit = new createjs.Bitmap(loader.getResult('buttonExit'));
	centerReg(buttonExit);
	buttonSettings = new createjs.Bitmap(loader.getResult('buttonSettings'));
	centerReg(buttonSettings);
	
	createHitarea(buttonFullscreen);
	createHitarea(buttonSoundOn);
	createHitarea(buttonSoundOff);
	createHitarea(buttonMusicOn);
	createHitarea(buttonMusicOff);
	createHitarea(buttonExit);
	createHitarea(buttonSettings);
	optionsContainer = new createjs.Container();
	optionsContainer.addChild(buttonFullscreen, buttonSoundOn, buttonSoundOff, buttonMusicOn, buttonMusicOff, buttonExit);
	optionsContainer.visible = false;
	
	//exit
	itemExit = new createjs.Bitmap(loader.getResult('itemExit'));
	centerReg(itemExit);
	itemExit.x = canvasW/2;
	itemExit.y = canvasH/2;
	
	buttonConfirm = new createjs.Bitmap(loader.getResult('buttonConfirm'));
	centerReg(buttonConfirm);
	createHitarea(buttonConfirm)
	buttonConfirm.x = canvasW/100* 35;
	buttonConfirm.y = canvasH/100 * 63;
	
	buttonCancel = new createjs.Bitmap(loader.getResult('buttonCancel'));
	centerReg(buttonCancel);
	createHitarea(buttonCancel)
	buttonCancel.x = canvasW/100 * 65;
	buttonCancel.y = canvasH/100 * 63;
	
	confirmMessageTxt = new createjs.Text();
	confirmMessageTxt.font = "40px cardenio_modernbold";
	confirmMessageTxt.lineHeight = 65;
	confirmMessageTxt.color = "#fff";
	confirmMessageTxt.textAlign = "center";
	confirmMessageTxt.textBaseline='alphabetic';
	confirmMessageTxt.text = exitMessage;
	confirmMessageTxt.x = canvasW/2;
	confirmMessageTxt.y = canvasH/100 *40;
	
	exitContainer.addChild(itemExit, buttonConfirm, buttonCancel, confirmMessageTxt);
	exitContainer.visible = false;
	
	guideline = new createjs.Shape();
	
	mainContainer.addChild(logo);
	sceneContainer.addChild(wand, wizardHit, scene, wizardAnimate, ghoulAnime, ghoulContainer);
	
	var startX = 0;
	for(var n=0;n<totalLife;n++){
		$.wand[n] = wand.clone();
		$.wand[n].x = startX;
		startX -= 20;
		wandContainer.addChild($.wand[n]);	
	}
	
	gameContainer.addChild(txtScore, wandContainer, instructionTxt);
	resultContainer.addChild(result, resultScoreShadowTxt, resultScoreTxt, resultTitleShadowTxt, resultTitleTxt, saveStatusShadowTxt, saveStatusTxt, shareContainer, shareSaveContainer);
	
	canvasContainer.addChild(background, sceneContainer, mainContainer, gameContainer, resultContainer, strokeAnimate, drawingContainer, exitContainer, optionsContainer, buttonSettings, guideline);
	stage.addChild(canvasContainer);
	
	resizeCanvas();
}


/*!
 * 
 * RESIZE GAME CANVAS - This is the function that runs to resize game canvas
 * 
 */
function resizeCanvas(){
	const cssWidth = stageW * scalePercent;
	const cssHeight = stageH * scalePercent;
	const gameCanvas = document.getElementById("gameCanvas");
	gameCanvas.style.width = cssWidth + "px";
	gameCanvas.style.height = cssHeight + "px";

	gameCanvas.style.left = (offset.left/2) + "px";
	gameCanvas.style.top = (offset.top/2) + "px";
	
	gameCanvas.width = stageW * dpr;
	gameCanvas.height = stageH * dpr;
	
 	if(canvasContainer!=undefined){
		stage.scaleX = stage.scaleY = dpr;
		
		if(safeZoneGuide){	
			guideline.graphics.clear().setStrokeStyle(2).beginStroke('red').drawRect((stageW-contentW)/2, (stageH-contentH)/2, contentW, contentH);
		}

		txtScore.x = canvasW/2;
		txtScore.y = offset.y;
		txtScore.y += 50;
		
		wandContainer.x = offset.x;
		wandContainer.y = offset.y;
		wandContainer.x += 150;
		wandContainer.y += 50;
		
		buttonSettings.x = (canvasW - offset.x) - 60;
		buttonSettings.y = offset.y + 45;
		
		var distanceNum = 65;
		var nextCount = 0;
		buttonSoundOn.x = buttonSoundOff.x = buttonSettings.x;
		buttonSoundOn.y = buttonSoundOff.y = buttonSettings.y+distanceNum;
		buttonSoundOn.x = buttonSoundOff.x;
		buttonSoundOn.y = buttonSoundOff.y = buttonSettings.y+distanceNum;
		if (typeof buttonMusicOn != "undefined") {
			buttonMusicOn.x = buttonMusicOff.x = buttonSettings.x;
			buttonMusicOn.y = buttonMusicOff.y = buttonSettings.y+(distanceNum*2);
			buttonMusicOn.x = buttonMusicOff.x;
			buttonMusicOn.y = buttonMusicOff.y = buttonSettings.y+(distanceNum*2);
			nextCount = 2;
		}else{
			nextCount = 1;
		}
		buttonFullscreen.x = buttonSettings.x;
		buttonFullscreen.y = buttonSettings.y+(distanceNum*(nextCount+1));

		if(curPage == 'main' || curPage == 'result'){
			buttonExit.visible = false;			
			buttonFullscreen.x = buttonSettings.x;
			buttonFullscreen.y = buttonSettings.y+(distanceNum*(nextCount+1));
		}else{
			buttonExit.visible = true;			
			buttonExit.x = buttonSettings.x;
			buttonExit.y = buttonSettings.y+(distanceNum*(nextCount+2));
		}
	}
}

/*!
 * 
 * REMOVE GAME CANVAS - This is the function that runs to remove game canvas
 * 
 */
 function removeGameCanvas(){
	 stage.autoClear = true;
	 stage.removeAllChildren();
	 stage.update();
	 createjs.Ticker.removeEventListener("tick", tick);
	 createjs.Ticker.removeEventListener("tick", stage);
 }

/*!
 * 
 * CANVAS LOOP - This is the function that runs for canvas loop
 * 
 */ 
function tick(event) {
	updateGame();
	stage.update(event);
}

/*!
 * 
 * CANVAS MISC FUNCTIONS
 * 
 */
function centerReg(obj){
	obj.regX=obj.image.naturalWidth/2;
	obj.regY=obj.image.naturalHeight/2;
}

function createHitarea(obj){
	obj.hitArea = new createjs.Shape(new createjs.Graphics().beginFill("#000").drawRect(0, 0, obj.image.naturalWidth, obj.image.naturalHeight));	
}