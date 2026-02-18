function CGame(oInfo){
    var _bUpdate = false;
    var _bKeyDown = false; 
    var _iSpeed;
    var _iMaxHeroSpeed;
    var _iScore = 0;
    var _iScoreInterval = 0;
    var _iLives;
    var _iCurHeroX;
    var _iTimeElaps = 0;    
    var _oButExit;  
    var _aLineXPos;
    var _aObstaclePos;
    var _aObstacleInScene;
    var _oHero;
    var _oLife;
    var _oHurt;
    var _oButLeft;
    var _oButRight;
    var _oButJump;
    var _oScoreText;
    var _oLivesText;
    var _oGameOverPanel;
    var _oScrollingBg;
    var _oHelpBg;
    var _oAudioToggle;
    var _oFadeUp;
    var _oFadeDown;
    var _oButFullscreen;
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;
    
    var _pStartPosLife;
    var _pStartPosExit;
    var _pStartPosAudio;
    var _pStartPosLeft;
    var _pStartPosRight;
    var _pStartPosJump;
    var _pStartPosFullscreen;
    
    this._init = function(){
        var oBgCanvas = new createjs.Shape();
        oBgCanvas.graphics.beginFill("#5B89A1").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        s_oStage.addChild(oBgCanvas);
        
        this._initLineObjects();
        this._initObstacles();
        
        _oFadeUp = new createjs.Shape();
        _oFadeUp.graphics.beginFill("rgba(0,0,0,1)").drawRect(0,50,CANVAS_WIDTH,100);
        s_oStage.addChild(_oFadeUp);

        _oFadeDown = new createjs.Shape();
        _oFadeDown.graphics.beginFill("rgba(0,0,0,1)").drawRect(0,CANVAS_HEIGHT-100,CANVAS_WIDTH,100);
        s_oStage.addChild(_oFadeDown);

        var oSprite = s_oSpriteLibrary.getSprite('but_exit');
        _pStartPosExit = {x:CANVAS_WIDTH - (oSprite.width/2) - 10,y:10+ (oSprite.height/2)};
        _oButExit = new CGfxButton(_pStartPosExit.x,_pStartPosExit.y,oSprite,s_oStage);
        _oButExit.addEventListener(ON_MOUSE_UP, this._onExit, this);
        
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            var oSprite = s_oSpriteLibrary.getSprite('audio_icon');
            _pStartPosAudio = {x:_pStartPosExit.x - oSprite.width/2 - 10,y:_pStartPosExit.y};
            _oAudioToggle = new CToggle(_pStartPosAudio.x,_pStartPosAudio.y,oSprite,s_bAudioActive,s_oStage);
            _oAudioToggle.addEventListener(ON_MOUSE_UP, this._onAudioToggle, this);
            
            oSprite = s_oSpriteLibrary.getSprite('but_fullscreen');
            _pStartPosFullscreen = {x: _pStartPosAudio.x - oSprite.width/2 - 10,y:_pStartPosAudio.y};
        }else{
            oSprite = s_oSpriteLibrary.getSprite('but_fullscreen');
            _pStartPosFullscreen = {x:CANVAS_WIDTH - 150,y:10+ (oSprite.height/2)};
        }
        
        var doc = window.document;
        var docEl = doc.documentElement;
        _fRequestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        _fCancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
        
        if(ENABLE_FULLSCREEN === false){
            _fRequestFullScreen = false;
        }
        
        if (_fRequestFullScreen && screenfull.enabled){
            

            _oButFullscreen = new CToggle(_pStartPosFullscreen.x,_pStartPosFullscreen.y,oSprite,s_bFullscreen,s_oStage);
            _oButFullscreen.addEventListener(ON_MOUSE_UP, this._onFullscreenRelease, this);
        }
        
        if(s_bMobile === false){
            document.onkeydown   = onKeyDown; 
            document.onkeyup   = onKeyUp; 
        }
        
        _iLives = NUM_LIVES;
        _iCurHeroX  = 1;
        var oSpriteHero = s_oSpriteLibrary.getSprite('hero');
        _oHero = new CHero(_aLineXPos[_iCurHeroX],oSpriteHero);
        
        var oSpriteLife = s_oSpriteLibrary.getSprite("life"); 
        _oLife = createBitmap(oSpriteLife);
        _pStartPosLife = {x:10,y:105};
        _oLife.x = _pStartPosLife.x;
        _oLife.y = _pStartPosLife.y;
        s_oStage.addChild(_oLife);
        
        _oScoreText = new createjs.Text(TEXT_SCORE+": 0","50px "+FONT_GAME, "#ffffff");
        _oScoreText.x = (CANVAS_WIDTH/2);
        _oScoreText.y = 30;
        _oScoreText.textAlign = "left";
        s_oStage.addChild(_oScoreText);

        _oLivesText = new createjs.Text("X"+_iLives,"50px "+FONT_GAME, "#ffffff");
        _oLivesText.x = _oLife.x + 75;
        _oLivesText.y = 30;
        _oLivesText.textAlign = "left";
        s_oStage.addChild(_oLivesText);
        
        _oHurt = new createjs.Shape();
        _oHurt.graphics.beginFill("red").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        _oHurt.alpha = 0.1;
        _oHurt.visible =  false;
        
        s_oStage.addChild(_oHurt);
        
        oSprite = s_oSpriteLibrary.getSprite('but_left');
        _pStartPosLeft = {x:oSprite.width/2 + 10,y:CANVAS_HEIGHT-oSprite.height/2 - 10};
        _oButLeft = new CGfxButton(_pStartPosLeft.x,_pStartPosLeft.y,oSprite,s_oStage);
        _oButLeft.addEventListener(ON_MOUSE_DOWN, this._onReleaseLeft, this);
        
        oSprite = s_oSpriteLibrary.getSprite('but_right');
        _pStartPosRight = {x:CANVAS_WIDTH - oSprite.width/2 - 10,y:CANVAS_HEIGHT-oSprite.height/2 - 10};
        _oButRight = new CGfxButton(_pStartPosRight.x,_pStartPosRight.y,oSprite,s_oStage);
        _oButRight.addEventListener(ON_MOUSE_DOWN, this._onReleaseRight, this);
        
        oSprite = s_oSpriteLibrary.getSprite('but_jump');
        _pStartPosJump = {x:CANVAS_WIDTH/2,y:CANVAS_HEIGHT-oSprite.height/2 - 10};
        _oButJump = new CTextButton(_pStartPosJump.x,_pStartPosRight.y,oSprite,TEXT_JUMP,FONT_GAME,"#383838",40,s_oStage);
        _oButJump.addEventListener(ON_MOUSE_DOWN, this._onReleaseJump, this);
        _oButJump.getButtonImage().visible = false;
       
       _oHelpBg = new CHelpPanel(s_oSpriteLibrary.getSprite('bg_help'));
       
        _iSpeed = 0;
        _iMaxHeroSpeed = MAX_STARTING_SPEED;
        
        this.refreshButtonPos(s_iOffsetX,s_iOffsetY);
        
    };
    
    this.refreshButtonPos = function(iNewX,iNewY){
        _oButExit.setPosition(_pStartPosExit.x - iNewX,iNewY + _pStartPosExit.y);
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.setPosition(_pStartPosAudio.x - iNewX,iNewY + _pStartPosAudio.y);
        }      
        
        if (_fRequestFullScreen && screenfull.enabled){
            _oButFullscreen.setPosition(_pStartPosFullscreen.x - s_iOffsetX,_pStartPosFullscreen.y + s_iOffsetY);
        }
        
        _oButRight.setPosition(_pStartPosRight.x - iNewX,_pStartPosRight.y - iNewY);
        _oButLeft.setPosition(_pStartPosLeft.x + iNewX,_pStartPosLeft.y - iNewY);
        _oButJump.setPosition(_pStartPosJump.x, _pStartPosJump.y - iNewY);
        
        _oLife.x = _pStartPosLife.x + iNewX;
        _oLife.y = _pStartPosLife.y + iNewY;
        _oLivesText.x = _oLife.x + 75;
        _oLivesText.y = 100 + iNewY;
        _oScoreText.y = 30 + iNewY;
        _oScoreText.x = 10 + iNewX;
        
        _oFadeUp.graphics.clear();
        _oFadeUp.graphics.beginFill("rgba(0,0,0,1)").drawRect(0,iNewY,CANVAS_WIDTH,100);
        
        _oFadeDown.graphics.clear();
        _oFadeDown.graphics.beginFill("rgba(0,0,0,1)").drawRect(0,CANVAS_HEIGHT - 100 -iNewY,CANVAS_WIDTH,100);
    };
    
    this.unload = function(){
        _oButExit.unload();       
        _oButExit = null;
        
        _oButLeft.unload();
        _oButLeft = null;
        
        _oButRight.unload();
        _oButRight = null;
	
        if (_fRequestFullScreen && screenfull.enabled){
            _oButFullscreen.unload();
        }
        
	if(s_bMobile === false){
            document.onkeydown   = null; 
            document.onkeyup   = null; 
        }
		
	s_oStage.removeAllChildren();
        
        s_oGame = null;
    };
    
    function onKeyUp(evt) { 
            _bKeyDown = false;
    }
	
    function onKeyDown(evt) { 
        if ( _bUpdate === false || _bKeyDown){
            evt.preventDefault();
            return false;
        }
        
        if(!evt){ 
            var evt = window.event; 
        }  

	_bKeyDown = true;
		
        switch(evt.keyCode) {  
           // left  
           case 37: s_oGame.shiftLeft();
           break;                    
           // right  
           case 39: s_oGame.shiftRight();
           break;  
           //SPACEBAR
           case 32: s_oGame.jump();
           break;
        }  
        
        evt.preventDefault();
	return false; 
    }
       
    this.shiftLeft = function(){
            this._onReleaseLeft();
    };
    
    this.shiftRight = function(){
            this._onReleaseRight();
    };
    
    this.jump = function(){
        if(_oButJump.getButtonImage().visible === false){
            return;
        }
        this._onReleaseJump();
    };
    
    this._onExitHelp = function(){
        _oHelpBg.unload();
        s_oStage.removeChild(_oHelpBg);
        
        _bUpdate = true;
        
        $(s_oMain).trigger("start_level",1);
    };
    
    this._initLineObjects = function(){
        _aLineXPos = new Array(228,484,740);

         var oSprite = s_oSpriteLibrary.getSprite('road_tile');
         _oScrollingBg = new CScrollingBg(oSprite);
    };
    
     this._initObstacles = function(){
         
         _aObstaclePos = new Array();
         
         _aObstaclePos[0]  = [_aLineXPos[0]];
         _aObstaclePos[1]  = [_aLineXPos[1]];
         _aObstaclePos[2]  = [_aLineXPos[2]];
         _aObstaclePos[3]  = [_aLineXPos[0],_aLineXPos[1]];
         _aObstaclePos[4]  = [_aLineXPos[1],_aLineXPos[2]];
         _aObstaclePos[5]  = [_aLineXPos[2],_aLineXPos[0]];
         _aObstaclePos[6]  = [_aLineXPos[0],_aLineXPos[1]];
         _aObstaclePos[7]  = [_aLineXPos[1],_aLineXPos[2]];
         _aObstaclePos[8]  = [_aLineXPos[2],_aLineXPos[0]];
         _aObstaclePos[9]  = [_aLineXPos[2],_aLineXPos[0]];
         _aObstaclePos[10] = [_aLineXPos[0],_aLineXPos[1]];
         _aObstaclePos[11] = [_aLineXPos[1],_aLineXPos[2]];
         _aObstaclePos[12] = [_aLineXPos[2],_aLineXPos[0]];
         _aObstaclePos[13] = [_aLineXPos[0],_aLineXPos[1]];
         _aObstaclePos[14] = [_aLineXPos[1],_aLineXPos[2]];
         _aObstaclePos[15] = [_aLineXPos[0],_aLineXPos[1],_aLineXPos[2]];
         
         _aObstaclePos = shuffle(_aObstaclePos);
         
         _aObstacleInScene = new Array();
         var oSprite = s_oSpriteLibrary.getSprite('enemy');
		 var oData = {   // image to use
                images: [oSprite], 
                // x,y,width, height,page, x registration point, y registration point
                frames:[[0,0,98,200,0,49,100],
                       [98,0,98,200,0,49,100],
                       [196,0,98,200,0,49,100],
                       [294,0,96,200,0,48,100],
                       [388,0,96,200,0,48,100],
                       [484,0,96,200,0,48,100],
                       [580,0,108,168,0,54,84],
                       [688,0,108,168,0,54,84],
                       [796,0,108,168,0,54,84],
                       [904,0,80,200,0,40,100],
                       [984,0,80,200,0,40,100],
                       [1064,0,80,200,0,40,100]

                ]
        };
	
        
        
	var SpriteObj = new createjs.SpriteSheet(oData);
         var iCont = 0;
         var iYPos = -oSprite.height;
         
         while(iYPos > - (CANVAS_HEIGHT*7)){
             for(var k=0;k<_aObstaclePos[iCont].length;k++){
                 var oObstacle = new CObstacle(_aObstaclePos[iCont][k],iYPos,SpriteObj,SpriteObj.getFrameBounds(iCont).width,SpriteObj.getFrameBounds(iCont).height,
                                                                                SpriteObj.getFrameBounds(iCont).x,SpriteObj.getFrameBounds(iCont).y);
                 _aObstacleInScene.push(oObstacle);    
             }
             iYPos -= (oSprite.height + DISTANCE_AMONG_OBSTACLES);
             iCont++;
         }
     };
     
     this._increaseScore = function(){
         _iScore += SCORE_INCREASE;
         _oScoreText.text = TEXT_SCORE+": "+_iScore;

         
         _iScoreInterval += SCORE_INCREASE;
         if(_iScoreInterval > INCREASE_SPEED_UP_INTERVAL){
             _iScoreInterval = 0;
             _iMaxHeroSpeed += INCREASE_SPEED;
         }
     };
     
     this._lifeLost = function(){
        _oHurt.visible = true;
        var oParent = this;
        
        createjs.Tween.get(_oHurt).to({alpha:0.6 }, 400).call(function() {oParent._resetHurt();});
        
        
        _iScore -= MALUS_SCORE;
        if(_iScore<0){
            _iScore = 0;
        }
        
        _oScoreText.text = TEXT_SCORE+": "+_iScore;
        
        playSound("crash",1,false);
        
        _iLives--;
        _oLivesText.text = "X"+_iLives;
        
        if(_iLives === 0){
            this._gameOver();
        }
    };
    
    this._resetHurt = function(){
        _oHurt.visible = false;
        _oHurt.alpha = 0.5;
    };
    
    this._gameOver = function(){
        _bUpdate = false;
        
        var oSprite = s_oSpriteLibrary.getSprite('msg_box');
        _oGameOverPanel = new CEndPanel(oSprite);
        _oGameOverPanel.show(_iScore);
        
        $(s_oMain).trigger("end_level",1);
    };
    
    this._onReleaseLeft = function(){
        if(_iCurHeroX === 0 ||  _oHero.isJumping()){
            return;
        }
        
        _iCurHeroX--;
        _oHero.move(_aLineXPos[_iCurHeroX]);

        playSound("steer",1,false);
    };
    
    this._onReleaseRight = function(){
        if(_iCurHeroX === NUM_LINES ||  _oHero.isJumping()){
            return;
        }
        
        _iCurHeroX++;
        _oHero.move(_aLineXPos[_iCurHeroX],1-((NUM_LINES-_iCurHeroX)*0.2));
		
	playSound("steer",1,false);
    };
    
    this._onReleaseJump = function(){
        if(_oHero.isJumping()){
			return;
		}
        _oHero.jump(_iSpeed);
        
        playSound("jump",1,false);
    };
    
    this._onExit = function(){
        this.unload();
        
        $(s_oMain).trigger("end_session");
        $(s_oMain).trigger("share_event",_iScore);
        
        s_oMain.gotoMenu();
    };
    
    this._onAudioToggle = function(){
        Howler.mute(s_bAudioActive);
	s_bAudioActive = !s_bAudioActive;
    };
    
    this._checkCollision = function(  oObstacle ){
        var vHeroPos        = _oHero.getPos();
        var vObstaclePos    = oObstacle.getPos();
        var fObstacleRadius = oObstacle.getSquareRadius();
        
        var fDistance =  ( (vObstaclePos.x - vHeroPos.x)*(vObstaclePos.x - vHeroPos.x) ) + 
                                    ( (vObstaclePos.y - vHeroPos.y)*(vObstaclePos.y - vHeroPos.y) ) ;
		
        if ( fDistance < fObstacleRadius ){
            return true;
        }else{
            return false;
        }
    };
    
    this._updateMove = function(){
       _iSpeed += ACCELLERATION;
       if(_iSpeed > _iMaxHeroSpeed){
          _iSpeed = _iMaxHeroSpeed;
          _oButJump.getButtonImage().visible = true;
       }
       
       _oHero.update();
       _oScrollingBg.update(Math.floor(_iSpeed)); 
        
    };
    
    this.updateObstacles = function(){
        for(var i=0;i<_aObstacleInScene.length;i++){
            _aObstacleInScene[i].update((_iSpeed*s_fCurForceFactor)); 
            if( _oHero.isJumping() === false && this._checkCollision(_aObstacleInScene[i]) ){
                _aObstacleInScene[i].reset();
                
                this._lifeLost();
            }else if(_aObstacleInScene[i].getFront() > CANVAS_HEIGHT){
                _aObstacleInScene[i].reset();
            }
            
        }
    };
    
    this.resetFullscreenBut = function(){
	if (_fRequestFullScreen && screenfull.enabled){
		_oButFullscreen.setActive(s_bFullscreen);
	}
    };
    
    this._onFullscreenRelease = function(){
        if(s_bFullscreen) { 
		_fCancelFullScreen.call(window.document);
	}else{
		_fRequestFullScreen.call(window.document.documentElement);
	}
        
        sizeHandler();
    };
    
    this.update = function(){
        if(_bUpdate === false){
            return;
        }

        this._updateMove();
        this.updateObstacles();    
		
		_iTimeElaps += s_iTimeElaps;
		if(_iTimeElaps >= 1000){
			_iTimeElaps -= 1000;
			this._increaseScore();
		}
    };
    
    s_oGame=this;
    
    MAX_STARTING_SPEED = oInfo.max_start_speed;
    INCREASE_SPEED_UP_INTERVAL = oInfo.increase_speed_up_interval;
    INCREASE_SPEED = oInfo.increase_speed;
    DISTANCE_AMONG_OBSTACLES = oInfo.dist_obstacles;
    ACCELLERATION = oInfo.accelleration;
    SCORE_INCREASE = oInfo.score_increase;
    MALUS_SCORE = oInfo.malus_score;
    NUM_LIVES = oInfo.lives;
    
    this._init();
}

var s_oGame = null;
