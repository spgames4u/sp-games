function CCreditsPanel(){
    
    var _oBg;
    var _oButLogo;
    var _oButExit;
    var _oMsgText;
    
    var _oHitArea;
    
    var _oLink;
    
    var _pStartPosExit;
    
    var _oContainer;
    
    this._init = function(){
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        var oFade = new createjs.Shape();
        oFade.graphics.beginFill("rgba(0,0,0,0.7)").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        _oContainer.addChild(oFade);
        
        var oSpriteBg = s_oSpriteLibrary.getSprite('msg_box');
        _oBg = createBitmap(oSpriteBg);
        _oBg.regX = oSpriteBg.width/2;
        _oBg.regY = oSpriteBg.height/2;
        _oBg.x = CANVAS_WIDTH/2;
        _oBg.y = CANVAS_HEIGHT/2;
        _oContainer.addChild(_oBg);
        
        _oHitArea = new createjs.Shape();
        _oHitArea.graphics.beginFill("#0f0f0f").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oHitArea.alpha = 0.01;
        _oHitArea.on("click", this._onLogoButRelease);
        _oContainer.addChild(_oHitArea);
                
        var oSprite = s_oSpriteLibrary.getSprite('but_exit');
        _pStartPosExit = {x: 760, y: 440};  
        _oButExit = new CGfxButton(_pStartPosExit.x, _pStartPosExit.y, oSprite, _oContainer);
        _oButExit.addEventListener(ON_MOUSE_UP, this.unload, this);
       
        _oMsgText = new createjs.Text(TEXT_CREDITS_DEVELOPED, "30px " + FONT_GAME, "#000");
        _oMsgText.textAlign = "center";
        _oMsgText.textBaseline = "alphabetic";
	_oMsgText.x = CANVAS_WIDTH/2;
        _oMsgText.y = CANVAS_HEIGHT/2 - 55;
	_oContainer.addChild(_oMsgText);
		
        oSprite = s_oSpriteLibrary.getSprite('logo_ctl');
        _oButLogo = createBitmap(oSprite);
        _oButLogo.regX = oSprite.width/2;
        _oButLogo.regY = oSprite.height/2;
        _oButLogo.x = CANVAS_WIDTH/2;
        _oButLogo.y = CANVAS_HEIGHT/2;
        _oContainer.addChild(_oButLogo);
        
        _oLink = new createjs.Text("SP.Games", "26px " + FONT_GAME, "#000");
        _oLink.textAlign = "center";
        _oLink.textBaseline = "alphabetic";
	_oLink.x = CANVAS_WIDTH/2;
        _oLink.y = CANVAS_HEIGHT/2 + 70;
        _oContainer.addChild(_oLink);
    };
    
    this.unload = function(){
        _oHitArea.off("click", this._onLogoButRelease);
        
        _oButExit.unload(); 
        _oButExit = null;

        s_oStage.removeChild(_oContainer);
    };
    
    this._onLogoButRelease = function(){
        window.open("https://sp.games/","_blank");
    };
    
    this._init();
    
    
};


