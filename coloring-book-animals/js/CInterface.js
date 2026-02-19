function CInterface(){
    var _bErase;
    
    var _szColorActive;
    
    var _iCurPenActive;
    
    var _aPen;
    
    var _oAudioToggle;
    var _oButExit;
    var _oButSaveAsImg;
    var _oButPrintAsImg;
    var _oButRestart;
    var _oHelpPanel=null;
    var _oPenContainer;
    var _oSliderContainer;
    var _oSlider;
    var _oBox;
    var _oButFullscreen;
    
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;
    
    var _pStartPosExit;
    var _pStartPosAudio;
    var _pStartPosSave;
    var _pStartPosPrint;
    var _pStartPosRestart;
    var _pStartPosFullscreen;
    
    this._init = function(){    
        _bErase = false;
        
        _szColorActive = null;
        
        _iCurPenActive= null;
        
        var oExitX;        
        
        var oSprite = s_oSpriteLibrary.getSprite('but_exit');
        _pStartPosExit = {x: CANVAS_WIDTH - (oSprite.height/2)- 20, y: (oSprite.height/2) + 10};
        _oButExit = new CGfxButton(_pStartPosExit.x, _pStartPosExit.y, oSprite,true);
        _oButExit.addEventListener(ON_MOUSE_UP, this._onExit, this);
        
        oExitX = CANVAS_WIDTH - (oSprite.width/2) - 180;
        _pStartPosAudio = {x: CANVAS_WIDTH - (oSprite.width/2) - 20, y: 250};
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            var oSprite = s_oSpriteLibrary.getSprite('audio_icon');
            _oAudioToggle = new CToggle(_pStartPosAudio.x,_pStartPosAudio.y,oSprite,s_bAudioActive);
            _oAudioToggle.addEventListener(ON_MOUSE_UP, this._onAudioToggle, this);          
        }

        var doc = window.document;
        var docEl = doc.documentElement;
        _fRequestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        _fCancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

        if(ENABLE_FULLSCREEN === false){
            _fRequestFullScreen = false;
        }

        var oSprite = s_oSpriteLibrary.getSprite("but_fullscreen");
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _pStartPosFullscreen = {x: _pStartPosAudio.x, y: _pStartPosAudio.y + oSprite.width/2 + 10};            
        }else {
            _pStartPosFullscreen = {x: CANVAS_WIDTH - (oSprite.width/4) - 20, y: 250};
        }

        if (_fRequestFullScreen && screenfull.isEnabled){
            _oButFullscreen = new CToggle(_pStartPosFullscreen.x,_pStartPosFullscreen.y,oSprite,s_bFullscreen, s_oStage);
            _oButFullscreen.addEventListener(ON_MOUSE_UP,this._onFullscreenRelease,this);
        }
        
        var oSprite = s_oSpriteLibrary.getSprite('but_save');
        var iY = (oSprite.height/2) + 10;

        _pStartPosSave = {x: (oSprite.height/2)+ 20, y: iY};
        _oButSaveAsImg = new CGfxButton(_pStartPosSave.x, _pStartPosSave.y, oSprite,true);
        _oButSaveAsImg.addEventListener(ON_MOUSE_UP, this._onSaveAsImg, this);
        if(!ENABLE_SAVEIMAGE){
            _oButSaveAsImg.setVisible(false);
        }else {
            iY += oSprite.height + 10;
        }
        
        var oSprite = s_oSpriteLibrary.getSprite('but_print');
        _pStartPosPrint = {x: (oSprite.height/2)+ 20, y: iY};
        _oButPrintAsImg = new CGfxButton(_pStartPosPrint.x, _pStartPosPrint.y, oSprite,true);
        _oButPrintAsImg.addEventListener(ON_MOUSE_UP, this._onPrinteAsImg, this);
        if(!ENABLE_PRINT){
            _oButPrintAsImg.setVisible(false);
        }else {
            iY += oSprite.height + 10;
        }

        var oSprite = s_oSpriteLibrary.getSprite('but_restart');
        _pStartPosRestart = {x: (oSprite.height/2)+ 20, y: iY};
        _oButRestart = new CGfxButton(_pStartPosRestart.x, _pStartPosRestart.y, oSprite,true);
        _oButRestart.addEventListener(ON_MOUSE_UP, this._onButRestartRelease, this);
        

        _oPenContainer = new createjs.Container();
        var oStartPenPoint = {x:CANVAS_WIDTH/2 , y:1000 - EDGEBOARD_Y};
        _oPenContainer.x = oStartPenPoint.x;
        _oPenContainer.y = oStartPenPoint.y;
        _aPen = new Array();        
        for(var i=0; i<COLORS.length; i++){
            _aPen[i] = new CPen(i*50, 0, COLORS[i], i, _oPenContainer);
        }
        s_oInteractiveStage.addChild(_oPenContainer);

        ///ERASER////
        _aPen[COLORS.length] = new CPen(-100, 0, "eraser", COLORS.length, _oPenContainer);
        
        _oSliderContainer = new createjs.Container();
        _oSliderContainer.x = 1600;
        _oSliderContainer.y = 1000;
        s_oInteractiveStage.addChild(_oSliderContainer);
        
        var oSprite = s_oSpriteLibrary.getSprite('slider');
        _oSlider = new CSlider(0,-125,oSprite,MIN_STROKE,MAX_STROKE, _oSliderContainer);
        
        var oSprite = s_oSpriteLibrary.getSprite('sliderbox');
        _oBox = new CSliderBox(0,0,oSprite,_oSliderContainer);
      
        var iValue = _oSlider.getValue();
        this.setStroke(iValue);
        
        var rBounds = _oPenContainer.getBounds();
        _oPenContainer.regX = (rBounds.width-100)/2 ;
       this.refreshButtonPos(s_iOffsetX,s_iOffsetY);

       s_oInteractiveStage.update();
       
    };
    
    this.unload = function(){
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.unload();
            _oAudioToggle = null;
        }

        for(var i=0; i<_aPen.length; i++){
            _aPen[i].unload();
        }

        if (_fRequestFullScreen && screenfull.isEnabled){
                _oButFullscreen.unload();
        }

        _oButExit.unload();
        _oButSaveAsImg.unload();
        _oButPrintAsImg.unload();
        _oButRestart.unload();
        _oSlider.unload();
        _oBox.unload();
        s_oInterface = null;
    };
    
    this.disableStroke = function(){
        s_oGame.deleteStroke(false);
    };
    
    this.restartStroke = function(){
        s_oGame.setColor(_szColorActive);
    };
    
    this.setStroke = function(iSize){
        s_oGame.setStroke(iSize);
    };
    
    this.getStroke = function(){
        return _oSlider.getValue();
    };
    
    this.setActivePen = function(szColor, iIndex){
        this.setSliderVisible(false);
        s_oGame.setColor(szColor);
        s_oGame.colorAdvice(false);
        _szColorActive = szColor;
        _oBox.setActive(false);
        _bErase = false;
        
        if(_iCurPenActive !== null){
            _aPen[_iCurPenActive].setActive(false);
        }
        
        _iCurPenActive = iIndex;

    };
    
    this.getCircleSize = function(){
        return _oSlider.getValue();
    };
    
    this.setCircleImage = function (iSize, szColor){
        _oBox.setCircle(iSize, szColor);
    };
    
    this.setSliderVisible = function(bActive){
        _oSlider.setVisible(bActive);
        _oBox.setSliderVisible(bActive);
        if(!bActive){
            _oBox.setActive(false);
        }
    };
    
    this.getSliderVisible = function(){
        return _oSlider.getVisible();
    };

    this._onSaveAsImg = function(){
       s_oGame.saveImg();      
    };
    
    this._onPrinteAsImg = function(){
       s_oGame.printImg();
    };
    
    this.refreshButtonPos = function(iNewX,iNewY){
        _oButExit.setPosition(_pStartPosExit.x - iNewX,iNewY + _pStartPosExit.y);        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _oAudioToggle.setPosition(_pStartPosAudio.x - iNewX,iNewY + _pStartPosAudio.y);
        }
        _oButSaveAsImg.setPosition(_pStartPosSave.x + iNewX,iNewY + _pStartPosSave.y);
        _oButPrintAsImg.setPosition(_pStartPosPrint.x + iNewX,iNewY + _pStartPosPrint.y);
        _oButRestart.setPosition(_pStartPosRestart.x + iNewX,iNewY + _pStartPosRestart.y);

        if (_fRequestFullScreen && screenfull.isEnabled){
                _oButFullscreen.setPosition(_pStartPosFullscreen.x - iNewX, _pStartPosFullscreen.y + iNewY);
        }

        s_oInteractiveStage.update();
    };

    this._onButHelpRelease = function(){
        _oHelpPanel = new CHelpPanel();
    };
    
    this._onButRestartRelease = function(){
        $(s_oMain).trigger("restart_level",1);
        $(s_oMain).trigger("show_interlevel_ad");
        s_oGame.restartGame();
    };
    
    this.onExitFromHelp = function(){
        _oHelpPanel.unload();
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
    
    this._onAudioToggle = function(){
        Howler.mute(s_bAudioActive);
        s_bAudioActive = !s_bAudioActive;
    };
    
    this._onExit = function(){
        $(s_oMain).trigger("end_level",1);
        $(s_oMain).trigger("end_session");
        $(s_oMain).trigger("show_interlevel_ad");
      s_oGame.onExit();  
    };
    
    s_oInterface = this;
    
    this._init();
    
    return this;
}

var s_oInterface = null;