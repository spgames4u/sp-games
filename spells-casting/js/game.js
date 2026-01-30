////////////////////////////////////////////////////////////
// GAME v1.9
////////////////////////////////////////////////////////////

/*!
 * 
 * GAME SETTING CUSTOMIZATION START
 * 
 */
 
const symbols_arr = [{colour:'#FDB514', src:'assets/symbol_vertical.png', id:'VERTICAL'},
				  {colour:'#84C441', src:'assets/symbol_horizontal.png', id:'HORIZONTAL'},
				  {colour:'#FBE20B', src:'assets/symbol_lighting.png', id:'LIGHTING'},
				  {colour:'#ED1F24', src:'assets/symbol_circle.png', id:'CIRCLE'}];

const gesture_arr = [{direction:["up"], id:'VERTICAL', accuracy:100},
					{direction:["down"], id:'VERTICAL', accuracy:100},
					{direction:["left"], id:'HORIZONTAL', accuracy:100},
					{direction:["right"], id:'HORIZONTAL', accuracy:100},
					{direction:["down left", "right", "down left"], id:'LIGHTING', accuracy:100},
					{direction:["up right", "left", "up right"], id:'LIGHTING', accuracy:100},
					{direction:["up", "up right", "right", "down right", "down", "down left", "left", "up left"], id:'CIRCLE', accuracy:70}];

//ghoul appear position				
const position_arr = [{x:147, y:335},
					{x:217, y:482},
					{x:417, y:559},
					{x:832, y:559},
					{x:1052, y:482},
					{x:1122, y:335}];


const gestureToStart = 'CIRCLE'; //gesture id name to start game

const instructionText = "Draw symbols floating above each ghoul's head\n to defeat them"; //text for game instruction
const totalLife = 6; //total game life
const scorePoint = 50; //total score for each defeated ghoul
const scoreDisplay = '[NUMBER]pts'; //text for game score

const strokeColor = '#fff'; //stroke default colour
const strokeNum = 10; //stroke number

const symbolPos = {x:0, y:-80}; //symbol postion above the ghoul

const levelData = {tweenSpeedStart:20, //ghoul move tween speed
				 tweenSpeedDecrease:2, //ghoul move tween speed decrease
				 tweenSpeedNext:250, //ghoul move tween speed next score increase
				 symbolTypeStart:2, //total type of symbol to start
				 symbolTypeIncrease:1, //total type of symbol to increase
				 symbolTypeNext:500, //symbol type next score increase
				 symbolAmountStart:1, //total amount of symbol to start
				 symbolAmountIncrease:1, //total amount of symbol to increase
				 symbolAmountMax:3, //maximum amount of symbol
				 symbolAmountNext:150, //ghoul timer next score increase
				 ghoulTimer:2500, //ghoul timer appear
				 ghoulTimerDecrease:300, //ghoul timer descrease
				 ghoulTimerNext:500 //ghoul timer next score increase
				 };
				 
const resultTitleText = 'Best Score:'; //text for game result

const exitMessage = 'Are you sure you want\nto quit the game?'; //quit game message

//Social share, [SCORE] will replace with game score
const shareText ='share your score'; //text for share instruction
const shareSettings = {
	enable:true,
	options:['facebook','twitter','whatsapp','telegram','reddit','linkedin'],
	shareTitle:'Highscore on Spells Casting Game is [SCORE]pts',
	shareText:'[SCORE]pts is mine new highscore on Spells Casting Game! Try it now!',
	customScore:true, //share a custom score to Facebook, it use customize share.php (Facebook and PHP only)
	gtag:true //Google Tag
};

/*!
 *
 * GAME SETTING CUSTOMIZATION END
 *
 */
const playerData = {score:0, life:0};
// جعل playerData متاح على window للوصول من sp-score.js
if (typeof window !== 'undefined') {
    window.playerData = playerData;
}
const gameData = {
	nowTimer:0,
	beforeTimer:0,
	ghoulTimer:3000,
	ghoulTimerNext:3000,
	tweenSpeedStart:20,
	tweenSpeedDecrease:2,
	tweenSpeedNext:300,
	symbolTypeStart:2,
	symbolTypeNext:300,
	symbolAmountStart:1,
	symbolAmountNext:300,
	posArr:[],
	posNum:0,
	animateHurt:false,
	gameplay:false,
	paused:true
};
				 
var strokeData = {oldPt:'', oldMidPt:''};
var gestureData = {pX:'', pY:'', pX2:'', pY2:'', lastDirection:-1, curDirection:-1, directionArr:[]};
var ghoul_arr = [];
var pos_arr = [];
const collisionMethod = ndgmr.checkPixelCollision;

/*!
 * 
 * GAME BUTTONS - This is the function that runs to setup button event
 * 
 */
function buildGameButton(){
	$(window).focus(function() {
		if(!buttonSoundOn.visible){
			toggleSoundInMute(false);
		}

		if (typeof buttonMusicOn != "undefined") {
			if(!buttonMusicOn.visible){
				toggleMusicInMute(false);
			}
		}
	});
	
	$(window).blur(function() {
		if(!buttonSoundOn.visible){
			toggleSoundInMute(true);
		}

		if (typeof buttonMusicOn != "undefined") {
			if(!buttonMusicOn.visible){
				toggleMusicInMute(true);
			}
		}
	});

	if(audioOn){
		if(muteSoundOn){
			toggleSoundMute(true);
		}
		if(muteMusicOn){
			toggleMusicMute(true);
		}
	}

	if(shareSettings.enable){
		buttonShare.cursor = "pointer";
		buttonShare.addEventListener("click", function(evt) {
			playSound('soundButton');
			toggleSocialShare(true);
		});

		for(let n=0; n<shareSettings.options.length; n++){
			$.share['button'+n].cursor = "pointer";
			$.share['button'+n].addEventListener("click", function(evt) {
				shareLinks(evt.target.shareOption, addCommas(playerData.score));
			});
		}
	};
	
	//confirm
	buttonConfirm.cursor = "pointer";
	buttonConfirm.addEventListener("click", function(evt) {
		playSound('soundClick');
		togglePop(false);
		stopGame(true);
		goPage('main');
	});
	
	buttonCancel.cursor = "pointer";
	buttonCancel.addEventListener("click", function(evt) {
		playSound('soundClick');
		togglePop(false);
	});
	
	itemExit.addEventListener("click", function(evt) {
	});
	
	//options
	buttonSoundOff.cursor = "pointer";
	buttonSoundOff.addEventListener("click", function(evt) {
		toggleSoundMute(true);
	});
	
	buttonSoundOn.cursor = "pointer";
	buttonSoundOn.addEventListener("click", function(evt) {
		toggleSoundMute(false);
	});

	if (typeof buttonMusicOff != "undefined") {
		buttonMusicOff.cursor = "pointer";
		buttonMusicOff.addEventListener("click", function(evt) {
			toggleMusicMute(true);
		});
	}
	
	if (typeof buttonMusicOn != "undefined") {
		buttonMusicOn.cursor = "pointer";
		buttonMusicOn.addEventListener("click", function(evt) {
			toggleMusicMute(false);
		});
	}
	
	buttonFullscreen.cursor = "pointer";
	buttonFullscreen.addEventListener("click", function(evt) {
		toggleFullScreen();
	});
	
	buttonSettings.cursor = "pointer";
	buttonSettings.addEventListener("click", function(evt) {
		toggleOptions();
	});
	
	buttonExit.cursor = "pointer";
	buttonExit.addEventListener("click", function(evt) {
		togglePop(true);
		toggleOptions();
	});
}

/*!
 * 
 * TOGGLE SOCIAL SHARE - This is the function that runs to toggle social share
 * 
 */
function toggleSocialShare(con){
	if(!shareSettings.enable){return;}
	buttonShare.visible = con == true ? false : true;
	shareSaveContainer.visible = con == true ? false : true;
	socialContainer.visible = con;

	if(con){
		if (typeof buttonSave !== 'undefined') {
			TweenMax.to(buttonShare, 3, {overwrite:true, onComplete:toggleSocialShare, onCompleteParams:[false]});
		}
	}
}

function positionShareButtons(){
	if(!shareSettings.enable){return;}
	if (typeof buttonShare !== 'undefined') {
		if (typeof buttonSave !== 'undefined') {
			if(buttonSave.visible){
				buttonShare.x = -((buttonShare.image.naturalWidth/2) + 5);
				buttonSave.x = ((buttonShare.image.naturalWidth/2) + 5);
			}else{
				buttonShare.x = 0;
			}
		}
	}
}

/*!
 * 
 * DISPLAY PAGES - This is the function that runs to display pages
 * 
 */
var curPage=''
function goPage(page){
	curPage=page;
	
	mainContainer.visible=false;
	gameContainer.visible=false;
	resultContainer.visible = false;
	togglePop(false);
	toggleOptions(false);
	
	var targetContainer = ''
	switch(page){
		case 'main':
			playMusicLoop('musicMain');
			stopMusicLoop('musicGame');
			targetContainer = mainContainer;
			wizardAnimate.visible = false;
			strokeAnimate.visible = true;
			toggleBackground(false);
		break;
		
		case 'game':
			playMusicLoop('musicGame');
			stopMusicLoop('musicMain');
			targetContainer = gameContainer;
			wizardAnimate.visible = true;
			strokeAnimate.visible = false;
			toggleBackground(true);
			startGame();
		break;
		
		case 'result':
			playMusicLoop('musicMain');
			stopMusicLoop('musicGame');
			targetContainer = resultContainer;
			toggleSocialShare(false);
			wizardAnimate.visible = false;
			strokeAnimate.visible = true;
			playSound('soundFail');
			resultScoreTxt.text = resultScoreShadowTxt.text = scoreDisplay.replace('[NUMBER]', playerData.score);
			
			stopGame();
			saveGame(playerData.score);
			toggleBackground(false);
		break;
	}
	
	targetContainer.alpha=0;
	targetContainer.visible=true;
	$(targetContainer)
	.clearQueue()
	.stop(true,true)
	.animate({ alpha:1 }, 500);
	
	resizeCanvas();
}

function toggleBackground(con){
	if(con){
		TweenMax.to(sceneContainer, 1, {y:0, overwrite:true});
	}else{
		TweenMax.to(sceneContainer, 1, {y:250, overwrite:true});	
	}	
}

/*!
 * 
 * START GAME - This is the function that runs to start play game
 * 
 */
 function startGame(){
	instructionTxt.visible = true;
	playerData.life = totalLife;
	playerData.score = 0;
	updateScore();
	updateLife();
	
	gameData.animateHurt = false;
	gameData.tweenSpeedStart = levelData.tweenSpeedStart;
	gameData.tweenSpeedNext = levelData.tweenSpeedNext;
	gameData.symbolTypeStart = levelData.symbolTypeStart;
	gameData.symbolTypeNext = levelData.symbolTypeNext;
	gameData.symbolAmountStart = levelData.symbolAmountStart;
	gameData.symbolAmountNext = levelData.symbolAmountNext;
	gameData.ghoulTimer = levelData.ghoulTimer;
	gameData.ghoulTimerNext = levelData.ghoulTimerNext;
	gameData.posArr = position_arr;
	gameData.paused = setGameLaunch();
	shuffle(gameData.posArr);
	
	ghoul_arr = [];
	resetTimer();
	gameData.timerUpdate = true;
	gameData.gameplay = true;
}

 /*!
 * 
 * STOP GAME - This is the function that runs to stop play game
 * 
 */
function stopGame(){
	$.drawingCanvas['default'].graphics.clear();
	for(canvasNum=0;canvasNum<symbols_arr.length;canvasNum++){
		var iconID = symbols_arr[canvasNum].id;
		$.drawingCanvas[iconID].graphics.clear();
		$.drawingCanvas[iconID].visible = false;
	}
	
	gameData.gameplay = false;
	gameData.timerUpdate = false;
	TweenMax.killAll(false, true, false);
	ghoulContainer.removeAllChildren();
}

function saveGame(score){
	if ( typeof toggleScoreboardSave == 'function' ) { 
		$.scoreData.score = score;
		if(typeof type != 'undefined'){
			$.scoreData.type = type;	
		}
		toggleScoreboardSave(true);
	}

	/*$.ajax({
      type: "POST",
      url: 'saveResults.php',
      data: {score:score},
      success: function (result) {
          console.log(result);
      }
    });*/
}

/*!
 * 
 * CREATE ghoul - This is the function that runs to create a ghoul
 * 
 */
function createGhoul(){
	var newGhoul = ghoulAnime.clone();
	
	var randomX = 0;
	var randomY = 0;
	var randomNumX = Math.random()*20;
	var randomNumY = Math.random()*20;
	randomX = randomNumX - 10;
	randomY = randomNumY - 10;
	newGhoul.x = gameData.posArr[gameData.posNum].x + randomX;
	newGhoul.y = gameData.posArr[gameData.posNum].y + randomY;
	
	if(newGhoul.x < canvasW/2){
		newGhoul.side = 'left';	
	}else{
		newGhoul.scaleX = -1;
		newGhoul.side = 'right';	
	}
	gameData.posNum++;
	if(gameData.posNum >= gameData.posArr.length){
		shuffle(gameData.posArr);
		gameData.posNum = 0;	
	}
	
	var ghoulTween = TweenMax.to(newGhoul, gameData.tweenSpeedStart, {x:wizardAnimate.x, y:wizardAnimate.y, overwrite:true, onComplete:function(){}});
	
	var symbolsContainer = new createjs.Container();
	ghoulContainer.addChild(newGhoul, symbolsContainer);
	
	ghoul_arr.push({obj:newGhoul, container:symbolsContainer, symbols:generateSymbols(gameData.symbolAmountStart), tween:ghoulTween, active:true});
	createSymbols(ghoul_arr.length-1);
	adjustScale(ghoul_arr.length-1);
}

/*!
 * 
 * GENERATE SYMBOLS - This is the function that runs to generate symbols
 * 
 */
function generateSymbols(totalSymbols){
	var symbols = [];
	for(var num=0;num<totalSymbols;num++){
		symbols.push(symbols_arr[Math.floor(Math.random()*gameData.symbolTypeStart)].id);	
	}
	return symbols;
}

/*!
 * 
 * CREATE SYMBOLS - This is the function that runs to create symbols
 * 
 */
function createSymbols(index){
	ghoul_arr[index].container.removeAllChildren();
	
	var iconSpace = 10;
	var totalWidth = 0;
	for(var num=0;num<ghoul_arr[index].symbols.length;num++){
		totalWidth += ($.symbols[ghoul_arr[index].symbols[num]].image.naturalWidth)+iconSpace;
	}
	totalWidth -= iconSpace;
	var startX = -(totalWidth/2);
	
	for(var num=0;num<ghoul_arr[index].symbols.length;num++){
		var iconSymbol = $.symbols[ghoul_arr[index].symbols[num]].clone();
		startX += ($.symbols[ghoul_arr[index].symbols[num]].image.naturalWidth/2);
		iconSymbol.x = startX;
		startX += ($.symbols[ghoul_arr[index].symbols[num]].image.naturalWidth/2) + iconSpace;
		ghoul_arr[index].container.addChild(iconSymbol);
	}
}

/*!
 * 
 * DAMAGE ghoul - This is the function that runs to damage ghoul
 * 
 */
function damageghoul(id){
	var ghoulDamage = false;
	for(ghoulNum=0;ghoulNum<ghoul_arr.length;ghoulNum++){
		var findIndexNum = ghoul_arr[ghoulNum].symbols.indexOf(id);
		if(findIndexNum != -1){
			ghoul_arr[ghoulNum].symbols.splice(findIndexNum,1);
			createSymbols(ghoulNum);
			ghoul_arr[ghoulNum].tween.pause();
			ghoul_arr[ghoulNum].obj.gotoAndPlay('hit');
			
			if(ghoul_arr[ghoulNum].symbols.length == 0){
				TweenMax.to(ghoul_arr[ghoulNum].container, 1, {delay:1, alpha:0, overwrite:true, onComplete:damageghoulComplete, onCompleteParams:[ghoulNum]});
				TweenMax.to(ghoul_arr[ghoulNum].obj, .5, {delay:.5, alpha:0, overwrite:true});
				increaseScore();
			}else{
				TweenMax.to(ghoul_arr[ghoulNum].container, 1, {overwrite:true, onComplete:damageghoulComplete, onCompleteParams:[ghoulNum]});	
			}
			ghoulDamage = true;
		}
	}
	
	if(ghoulDamage){
		var wandNum = Math.floor(Math.random()*2)+1;
		playSound('soundghoul'+wandNum);	
	}
}

function damageghoulComplete(index){
	if (ghoul_arr[index].active) {
		if(ghoul_arr[index].symbols.length == 0){
			removeghoul(index, false);
		}else{
			ghoul_arr[index].tween.resume();
			ghoul_arr[index].obj.gotoAndPlay('walk');
		}
	}
}

function removeghoul(index, con){
	TweenMax.killTweensOf(ghoul_arr[index].obj);
	TweenMax.killTweensOf(ghoul_arr[index].container);
	ghoulContainer.removeChild(ghoul_arr[index].obj, ghoul_arr[index].container);
	ghoul_arr[index].active = false;
	
	if(con){
		decreaseLife();	
	}
}

/*!
 * 
 * LOOP ghoul - This is the function that runs to loop ghoul details
 * 
 */
function loopghoul(){
	pos_arr = [];
	
	for(var n=0;n<ghoul_arr.length;n++){
		if(ghoul_arr[n].active){
			var percent = ghoul_arr[n].obj.y - wizardHit.y;
			var scaleNum = (percent * .05) * .1;
			
			ghoul_arr[n].obj.scaleX = .8 + scaleNum;
			ghoul_arr[n].obj.scaleY = .8 + scaleNum;
			if(ghoul_arr[n].obj.side == 'right'){
				ghoul_arr[n].obj.scaleX = -(.8 + scaleNum);
			}
			adjustScale(n);
			
			ghoul_arr[n].container.x = ghoul_arr[n].obj.x + (symbolPos.x * ghoul_arr[n].obj.scaleY);
			ghoul_arr[n].container.y = ghoul_arr[n].obj.y + (symbolPos.y * ghoul_arr[n].obj.scaleY);
			
			//var intersection = collisionMethod(wizardHit, ghoul_arr[n].obj);
			var checkDistance = getDistance(wizardHit.x, wizardHit.y, ghoul_arr[n].obj.x, ghoul_arr[n].obj.y);
			if(checkDistance < 100){
				removeghoul(n, true);
			}else{
				pos_arr.push({index:n, y:ghoul_arr[n].obj.y});	
			}
		}
	}
	sortghoulIndex();
}

function sortghoulIndex(){
	sortOnObject(pos_arr, 'y');
	
	var depthNum = 0;
	for(var s=0;s<pos_arr.length;s++){
		var indexNum = pos_arr[s].index;
		ghoulContainer.setChildIndex(ghoul_arr[indexNum].obj, depthNum);
		depthNum++;
		ghoulContainer.setChildIndex(ghoul_arr[indexNum].container, depthNum);
		depthNum++;
	}
}

function adjustScale(index){
	var percent = ghoul_arr[index].obj.y - wizardHit.y;
	var scaleNum = (percent * .02) * .1;
	
	ghoul_arr[index].obj.scaleX = .8 + scaleNum;
	ghoul_arr[index].obj.scaleY = .8 + scaleNum;
	if(ghoul_arr[index].obj.side == 'right'){
		ghoul_arr[index].obj.scaleX = -(.8 + scaleNum);
	}	
}


/*!
 * 
 * UPDATE GAME - This is the function that runs to loop game update
 * 
 */
function updateGame(){
	if(gameData.gameplay){
		loopghoul();
		loopTimer();
	}
}

/*!
 * 
 * LOOP TIMER - This is the function that runs to loop timer
 * 
 */
function loopTimer(){
	if(gameData.timerUpdate){
		gameData.nowTimer = new Date();
		
		var distanceTime = (gameData.nowTimer.getTime() - gameData.beforeTimer.getTime());
		if(distanceTime > gameData.ghoulTimer){
			resetTimer()
			createGhoul();
		}
	}
}

function resetTimer(){
	gameData.beforeTimer = new Date();	
}

/*!
 * 
 * GAME GESTURE EVENTS - This is the function that runs to build game gesture events
 * 
 */
function buildGameGesture(){
	stage.addEventListener("stagemousedown", handleMouseDown);
	stage.addEventListener("stagemouseup", handleMouseUp);
}

function handleMouseDown(event) {
	if (!event.primary) { return; }
	
	instructionTxt.visible = false;
	$.drawingCanvas['default'].graphics.clear();
	for(canvasNum=0;canvasNum<symbols_arr.length;canvasNum++){
		var iconID = symbols_arr[canvasNum].id;
		$.drawingCanvas[iconID].graphics.clear();
		$.drawingCanvas[iconID].visible = false;
	}
	toggleDrawingCanvas('visible');
	strokeData.oldPt = new createjs.Point((stage.mouseX/dpr), (stage.mouseY/dpr));
	strokeData.oldMidPt = strokeData.oldPt.clone();
	
	gestureData.curDirection=-1;
	gestureData.lastDirection=-1;
	gestureData.pX=gestureData.pX2=(stage.mouseX/dpr);
	gestureData.pY=gestureData.pY2=(stage.mouseY/dpr);
	gestureData.directionArr = [];
	
	stage.addEventListener("stagemousemove", handleMouseMove);
}

function handleMouseMove(event) {
	if (!event.primary) { return; }
	var midPt = new createjs.Point(strokeData.oldPt.x + (stage.mouseX/dpr) >> 1, strokeData.oldPt.y + (stage.mouseY/dpr) >> 1);

	$.drawingCanvas['default'].graphics.setStrokeStyle(strokeNum, 'round', 'round').beginStroke(strokeColor).moveTo(midPt.x, midPt.y).curveTo(strokeData.oldPt.x, strokeData.oldPt.y, strokeData.oldMidPt.x, strokeData.oldMidPt.y);
	for(canvasNum=0;canvasNum<symbols_arr.length;canvasNum++){
		var iconID = symbols_arr[canvasNum].id;
		$.drawingCanvas[iconID].graphics.setStrokeStyle(strokeNum, 'round', 'round').beginStroke($.colours[iconID]).moveTo(midPt.x, midPt.y).curveTo(strokeData.oldPt.x, strokeData.oldPt.y, strokeData.oldMidPt.x, strokeData.oldMidPt.y);
	}

	strokeData.oldPt.x = (stage.mouseX/dpr);
	strokeData.oldPt.y = (stage.mouseY/dpr);

	strokeData.oldMidPt.x = midPt.x;
	strokeData.oldMidPt.y = midPt.y;
	
	var dX=gestureData.pX-(stage.mouseX/dpr);
	var dY=gestureData.pY-(stage.mouseY/dpr);
	var distance=dX*dX+dY*dY;
	if (distance>400) {
		var angle=Math.atan2(dY,dX)*57.2957795;
		var refinedAngle;
		var directionString;
		if (angle>=22*-1&&angle<23) {
			refinedAngle=0;
			directionString="left";
		}
		if (angle>=23&&angle<68) {
			refinedAngle=Math.PI/4;
			directionString="up left";
		}
		if (angle>=68&&angle<113) {
			refinedAngle=Math.PI/2;
			directionString="up";
		}
		if (angle>=113&&angle<158) {
			refinedAngle=Math.PI/4*3;
			directionString="up right";
		}
		if (angle>=158||angle<157*-1) {
			refinedAngle=Math.PI;
			directionString="right";
		}
		if (angle>=157*-1&&angle<112*-1) {
			refinedAngle=- Math.PI/4*3;
			directionString="down right";
		}
		if (angle>=112*-1&&angle<67*-1) {
			refinedAngle=- Math.PI/2;
			directionString="down";
		}
		if (angle>=67*-1&&angle<22*-1) {
			refinedAngle=- Math.PI/4;
			directionString="down left";
		}
		gestureData.pX2-=Math.sqrt(distance)*Math.cos(refinedAngle);
		gestureData.pY2-=Math.sqrt(distance)*Math.sin(refinedAngle);
		if (refinedAngle!=gestureData.lastDirection) {
			gestureData.lastDirection=refinedAngle;
		}
		else {
			if (gestureData.curDirection!=gestureData.lastDirection) {
				gestureData.directionArr.push(directionString);
				gestureData.curDirection=gestureData.lastDirection;
			}
		}
		gestureData.pX=(stage.mouseX/dpr);
		gestureData.pY=(stage.mouseY/dpr);
	}
}

function handleMouseUp(event) {
	if (!event.primary) { return; }
	stage.removeEventListener("stagemousemove", handleMouseMove);
	findGesture();
}

/*!
 * 
 * FIND MATCH GESTURE - This is the function that runs to find match gesture
 * 
 */
function findGesture(){
	var matchCon = false
	for(gesNum=0;gesNum < gesture_arr.length;gesNum++){
		if(mathGestureDirection(gesture_arr[gesNum].direction, gesture_arr[gesNum].accuracy)){
			var wandNum = Math.floor(Math.random()*3)+1;
			playSound('soundWand'+wandNum);
			
			toggleDrawingCanvas('fadein', gesture_arr[gesNum].id);
			if(gameData.gameplay){
				damageghoul(gesture_arr[gesNum].id);
				shakeCamera();
				
				matchCon = true;
			}else{
				if(gestureToStart == gesture_arr[gesNum].id){
					goPage('game');	
				}
			}
			gesNum = gesture_arr.length;
		}
	}
	
	if(!matchCon){
		toggleDrawingCanvas('fadeout')	
	}
}

function mathGestureDirection(directionArr, accuracy){
	var matchNum = 0;
	var matches = 0;
	var maxn = 0;
	var percent = 0;
	
	if(gestureData.directionArr.length >= 2 && directionArr.length >= 2){
		var indexNum = directionArr.indexOf(gestureData.directionArr[0]);
		for(dirNum=0;dirNum < gestureData.directionArr.length;dirNum++){
			var drawDirection = gestureData.directionArr[dirNum];
			var checkDirection = directionArr[indexNum];
			indexNum++;
			indexNum = indexNum > directionArr.length - 1 ? 0 : indexNum;
			if(drawDirection == checkDirection){
				matchNum++;
			}
		}
		$.each(gestureData.directionArr, function(i, a1val){
		  if($.inArray(a1val, directionArr) != -1) matches++;
		});
		maxn = Math.max(gestureData.directionArr.length, directionArr.length);
		percent = matches/maxn * 100;
		
		if(matchNum == directionArr.length){
			return true;
		}else if(percent >= accuracy){
			return true;
		}else{
			return false;	
		}
	}else{
		for(dirNum=0;dirNum < directionArr.length;dirNum++){
			var drawDirection = gestureData.directionArr[dirNum];
			var checkDirection = directionArr[dirNum];
			if(drawDirection == checkDirection){
				matchNum++;
			}
		}
		
		if(matchNum == directionArr.length && gestureData.directionArr.length == directionArr.length){
			return true;
		}else{
			return false;
		}
	}
}

/*!
 * 
 * TOGGLE DRAWING - This is the function that runs to toggle drawing
 * 
 */
function toggleDrawingCanvas(con, id){
	if(con == 'visible'){
		for(canvasNum=0;canvasNum<symbols_arr.length;canvasNum++){
			var iconID = symbols_arr[canvasNum].id;
			TweenMax.killTweensOf($.drawingCanvas[iconID]);
		}
		TweenMax.killTweensOf(drawingContainer);
		drawingContainer.alpha = 1;
	}else if(con == 'fadein'){
		$.drawingCanvas[id].visible = true;
		$.drawingCanvas[id].alpha = 0;
		TweenMax.to($.drawingCanvas[id], .2, {alpha:1, overwrite:true, onComplete:toggleDrawingCanvas, onCompleteParams:['fadeout']});
	}else if(con == 'fadeout'){
		drawingContainer.alpha = 1;
		TweenMax.to(drawingContainer, .2, {delay:1, alpha:0, overwrite:true});
	}
}

/*!
 * 
 * SHAKE CAMERA - This is the function that runs to shake camera
 * 
 */
function shakeCamera(){
	var randomX = Math.random()*40;
	var randomY = Math.random()*40;
	
	TweenMax.to(sceneContainer, .1, {x:randomX, y:randomY, overwrite:true, onComplete:function(){
		randomX = Math.random()*20;
		randomY = Math.random()*20;
		TweenMax.to(sceneContainer, .1, {x:randomX, y:randomY, overwrite:true, onComplete:function(){
			TweenMax.to(sceneContainer, .1, {x:0, y:0, overwrite:true});
		}});
	}});
}

/*!
 * 
 * SCORE - This is the function that runs to update score
 * 
 */
function increaseScore(){
	playerData.score += scorePoint;
	
	if(playerData.score >= gameData.tweenSpeedNext){
		gameData.tweenSpeedStart -= levelData.tweenSpeedDecrease;
		gameData.tweenSpeedNext += levelData.tweenSpeedNext;	
	}
	
	if(playerData.score >= gameData.symbolTypeNext){
		gameData.symbolTypeStart += levelData.symbolTypeIncrease;
		gameData.symbolTypeStart = gameData.symbolTypeStart >= symbols_arr.length ? symbols_arr.length : gameData.symbolAmountStart;
		gameData.symbolTypeNext += levelData.symbolTypeNext;	
	}
	
	if(playerData.score >= gameData.symbolAmountNext){
		gameData.symbolAmountStart += levelData.symbolAmountIncrease;
		gameData.symbolAmountStart = gameData.symbolAmountStart >= levelData.symbolAmountMax ? levelData.symbolAmountMax : gameData.symbolAmountStart;
		gameData.symbolAmountNext += levelData.symbolAmountNext;	
	}
	
	if(playerData.score >= gameData.ghoulTimerNext){
		gameData.ghoulTimer -= levelData.ghoulTimerDecrease;
		gameData.ghoulTimerNext += levelData.ghoulTimerNext;	
	}
	updateScore();
}

function updateScore(){
	txtScore.text = scoreDisplay.replace('[NUMBER]',playerData.score);
}

/*!
 * 
 * LIFE - This is the function that runs to update life
 * 
 */
function decreaseLife(){
	playSound('soundLife');
	playerData.life--;
	updateLife();
	animateHurt();
}

function animateHurt(){
	if(!gameData.animateHurt){
		gameData.animateHurt = true;
		wizardAnimate.alpha = 1;
		var tweenSpeed = .1;
		TweenMax.to(wizardAnimate, tweenSpeed, {alpha:.3, overwrite:true, onComplete:function(){
			TweenMax.to(wizardAnimate, tweenSpeed, {alpha:.5, overwrite:true, onComplete:function(){
				TweenMax.to(wizardAnimate, tweenSpeed, {alpha:.3, overwrite:true, onComplete:function(){
					TweenMax.to(wizardAnimate, tweenSpeed, {alpha:.5, overwrite:true, onComplete:function(){
						wizardAnimate.alpha = 1;
						gameData.animateHurt = false;
						if(playerData.life <= 0){
							goPage('result');	
						}
					}});	
				}});
			}});	
		}});
	}
}

function updateLife(){
	for(var n=totalLife-1;n>=0;n--){
		if(n >= totalLife - playerData.life){
			$.wand[n].visible = true;
		}else{
			$.wand[n].visible = false;	
		}
	}	
}

/*!
 * 
 * CONFIRM - This is the function that runs to toggle confirm
 * 
 */
function togglePop(con){
	exitContainer.visible = con;
	
	if(curPage == 'game'){
		if(con){
			TweenMax.pauseAll(true, true);
			gameData.timerUpdate = false;
		}else{
			TweenMax.resumeAll(true, true);
			gameData.timerUpdate = true;
		}
	}
}

/*!
 * 
 * OPTIONS - This is the function that runs to toggle options
 * 
 */

function toggleOptions(con){
	if(optionsContainer.visible){
		optionsContainer.visible = false;
	}else{
		optionsContainer.visible = true;
	}
	if(con!=undefined){
		optionsContainer.visible = con;
	}
}

/*!
 * 
 * OPTIONS - This is the function that runs to mute and fullscreen
 * 
 */
function toggleSoundMute(con){
	buttonSoundOff.visible = false;
	buttonSoundOn.visible = false;
	toggleSoundInMute(con);
	if(con){
		buttonSoundOn.visible = true;
	}else{
		buttonSoundOff.visible = true;	
	}
}

function toggleMusicMute(con){
	buttonMusicOff.visible = false;
	buttonMusicOn.visible = false;
	toggleMusicInMute(con);
	if(con){
		buttonMusicOn.visible = true;
	}else{
		buttonMusicOff.visible = true;	
	}
}

function toggleFullScreen() {
  if (!document.fullscreenElement &&    // alternative standard method
      !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

/*!
 * 
 * SHARE - This is the function that runs to open share url
 * 
 */
function shareLinks(action, shareScore){
	if(shareSettings.gtag){
		gtag('event','click',{'event_category':'share','event_label':action});
	}

	var gameURL = location.href;
	gameURL = encodeURIComponent(gameURL.substring(0,gameURL.lastIndexOf("/") + 1));

	var shareTitle = shareSettings.shareTitle.replace("[SCORE]", shareScore);
	var shareText = shareSettings.shareText.replace("[SCORE]", shareScore);

	var shareURL = '';
	if( action == 'facebook' ){
		if(shareSettings.customScore){
			gameURL = decodeURIComponent(gameURL);
			shareURL = `https://www.facebook.com/sharer/sharer.php?u=`+encodeURIComponent(`${gameURL}share.php?title=${shareTitle}&url=${gameURL}&thumb=${gameURL}share.jpg`);
		}else{
			shareURL = `https://www.facebook.com/sharer/sharer.php?u=${gameURL}`;
		}
	}else if( action == 'twitter' ){
		shareURL = `https://twitter.com/intent/tweet?text=${shareText}&url=${gameURL}`;
	}else if( action == 'whatsapp' ){
		shareURL = `https://api.whatsapp.com/send?text=${shareText}%20${gameURL}`;
	}else if( action == 'telegram' ){
		shareURL = `https://t.me/share/url?url=${gameURL}&text=${shareText}`;
	}else if( action == 'reddit' ){
		shareURL = `https://www.reddit.com/submit?url=${gameURL}&title=${shareText}`;
	}else if( action == 'linkedin' ){
		shareURL = `https://www.linkedin.com/sharing/share-offsite/?url=${gameURL}`;
	}

	window.open(shareURL);
}