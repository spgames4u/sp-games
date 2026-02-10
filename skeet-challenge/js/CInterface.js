function CInterface(){
    var _oAudioToggle;
    var _oButExit;
    var _oHelpPanel=null;
    var _oTextContainer;
    var _oUpperText;
    var _oScoreNumShadow;
    var _oScoreNum;
    var _oInfoContainer;
    var _oButFullscreen;
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;
    
    var _aHitIcon;
    
    var _pStartPosExit;
    var _pStartPosAudio;
    var _pStartPosBottomPanel;
    var _pStartPosFullscreen;
    
    var _oTweenText;
    
    this._init = function(){                
        var oSprite = s_oSpriteLibrary.getSprite('but_exit');
        _pStartPosExit = {x: CANVAS_WIDTH - (oSprite.height/2)- 10, y: (oSprite.height/2) + 10};
        _oButExit = new CGfxButton(_pStartPosExit.x, _pStartPosExit.y, oSprite,s_oStage);
        _oButExit.addEventListener(ON_MOUSE_UP, this._onExit, this);
        
        
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _pStartPosAudio = {x: CANVAS_WIDTH - (oSprite.width/2) - 90, y: (oSprite.height/2) + 10};
            var oSprite = s_oSpriteLibrary.getSprite('audio_icon');
            _oAudioToggle = new CToggle(_pStartPosAudio.x,_pStartPosAudio.y,oSprite,s_bAudioActive, s_oStage);
            _oAudioToggle.addEventListener(ON_MOUSE_UP, this._onAudioToggle, this);          
            
            oSprite = s_oSpriteLibrary.getSprite('but_fullscreen');
            _pStartPosFullscreen = {x:_pStartPosAudio.x - oSprite.width/2 - 10,y:oSprite.height/2 + 10};
        }else{
            _pStartPosFullscreen = {x: CANVAS_WIDTH - (oSprite.width/2) - 90, y: (oSprite.height/2) + 10};
        }
        
        var doc = window.document;
        var docEl = doc.documentElement;
        _fRequestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        _fCancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
        
        if(ENABLE_FULLSCREEN === false){
            _fRequestFullScreen = false;
        }

        if (_fRequestFullScreen && screenfull.isEnabled){
            
            oSprite = s_oSpriteLibrary.getSprite('but_fullscreen');
            _oButFullscreen = new CToggle(_pStartPosFullscreen.x, _pStartPosFullscreen.y, oSprite, s_bFullscreen, s_oStage);
            _oButFullscreen.addEventListener(ON_MOUSE_UP, this._onFullscreenRelease, this);
        }
        
        _oTextContainer = new createjs.Container();
        _oTextContainer.x = CANVAS_WIDTH/2;
        _oTextContainer.y = CANVAS_HEIGHT/2-200;
        _oTextContainer.alpha = 0;
        s_oStage.addChild(_oTextContainer);
        
        var oSprite = s_oSpriteLibrary.getSprite('advice_panel');
        var oPanelBg = createBitmap(oSprite);
        oPanelBg.regX = oSprite.width/2;
        oPanelBg.regY = oSprite.height/2;
        _oTextContainer.addChild(oPanelBg);
        
        _oUpperText = new CTLText(_oTextContainer, 
                    -250, -oSprite.height/2 , 500, oSprite.height, 
                    34, "center", "#fff", PRIMARY_FONT, 1,
                    0, 0,
                    TEXT_PREPARE,
                    true, true, false,
                    false );
 

        
        _pStartPosBottomPanel = {x: 400, y: 743};
        _oInfoContainer = new createjs.Container();
        _oInfoContainer.x = _pStartPosBottomPanel.x;
        _oInfoContainer.y = _pStartPosBottomPanel.y;
        s_oStage.addChild(_oInfoContainer);

        var oSprite = s_oSpriteLibrary.getSprite('bottom_panel');
        var oBottomPanel = createBitmap(oSprite);
        oBottomPanel.x = -60;
        oBottomPanel.y = -20;
        _oInfoContainer.addChild(oBottomPanel); //Draws on canvas

        var oSprite = s_oSpriteLibrary.getSprite('skeet_icon');
        var oData = {   
                        images: [oSprite], 
                        // width, height & registration point of each sprite
                        frames: {width: oSprite.width/3, height: oSprite.height, regX: (oSprite.width/3)/2, regY: oSprite.height/2}, 
                        animations: {hit:[0],available:[1], nohit:[2]}
                   };
                   
        var oSpriteSheet = new createjs.SpriteSheet(oData);
        _aHitIcon = new Array();
        for(var i=0; i<25; i++){
            _aHitIcon.push(createSprite(oSpriteSheet, "available",(oSprite.width/3)/2,oSprite.height/2,oSprite.width/3,oSprite.height));
            _aHitIcon[i].x = i*(oSprite.width/3);
            _oInfoContainer.addChild(_aHitIcon[i]);
        }
        
        _oScoreNumShadow = new createjs.Text("0"," 24px "+PRIMARY_FONT, "#000000");
        _oScoreNumShadow.x = 680;
        _oScoreNumShadow.y = 10;
        _oScoreNumShadow.textAlign = "right";
        _oScoreNumShadow.textBaseline = "alphabetic";
        _oScoreNumShadow.lineWidth = 200;
        _oInfoContainer.addChild(_oScoreNumShadow);

        _oScoreNum = new createjs.Text("0"," 24px "+PRIMARY_FONT, "#ffffff");
        _oScoreNum.x = _oScoreNumShadow.x - 2;
        _oScoreNum.y = _oScoreNumShadow.y - 2;
        _oScoreNum.textAlign = "right";
        _oScoreNum.textBaseline = "alphabetic";
        _oScoreNum.lineWidth = 200;
        _oInfoContainer.addChild(_oScoreNum);
       
        this.refreshButtonPos(s_iOffsetX,s_iOffsetY);
    };
    
    this.unload = function(){
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.unload();
            _oAudioToggle = null;
        }
        
        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.unload();
        }
        
        _oButExit.unload();

        if(_oHelpPanel!==null){
            _oHelpPanel.unload();
        }
        
        s_oInterface = null;
        
    };
    
    this.refreshButtonPos = function(iNewX,iNewY){
        _oButExit.setPosition(_pStartPosExit.x - iNewX,iNewY + _pStartPosExit.y);
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.setPosition(_pStartPosAudio.x - iNewX,iNewY + _pStartPosAudio.y);
        }
        
        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen.setPosition(_pStartPosFullscreen.x - iNewX,_pStartPosFullscreen.y + iNewY);
        }
        
        _oInfoContainer.x = _pStartPosBottomPanel.x;
        _oInfoContainer.y = _pStartPosBottomPanel.y - iNewY;
    };

    this.refreshScore = function(iValue){        
        new CRollingTextController(_oScoreNum, _oScoreNumShadow, iValue, 500, EASE_CUBIC_OUT);
    };

    this.startText = function(){
        _oUpperText.refreshText(TEXT_PREPARE);

        _oTweenText = new createjs.Tween.get(_oTextContainer).to({alpha: 1},500);

        _oTweenText = new createjs.Tween.get(_oUpperText.getText()).to({alpha: 1},500).wait(500).to({alpha: 1},500).call(function(){
            _oUpperText.refreshText(TEXT_PULL);
            _oUpperText.setAlpha(1);
            s_oGame.startStage();
            
            playSound("pull",1,false);
            
            _oTweenText = new createjs.Tween.get(_oTextContainer).wait(500).to({alpha: 0},1000);
        });
        
    };  
    
    this.setTweenPause = function(bVal){
        _oTweenText.setPaused(bVal);
    };

    this.setSkeetInfo = function(iIndex, iSkeetResult){
        if(iSkeetResult === SKEET_DESTROYED){
            _aHitIcon[iIndex].gotoAndStop("hit");
        } else {
            _aHitIcon[iIndex].gotoAndStop("nohit");
        }
    };
    
    this.onExitFromHelp = function(){
        _oHelpPanel.unload();
    };
    
    this._onAudioToggle = function(){
        Howler.mute(s_bAudioActive);
        s_bAudioActive = !s_bAudioActive;
    };
    
    this._onExit = function(){
        new CAreYouSurePanel(s_oStage);
    };
    
    this.resetFullscreenBut = function(){
	if (_fRequestFullScreen && screenfull.isEnabled){
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
    
    s_oInterface = this;
    
    this._init();
    
    return this;
}

var s_oInterface = null;