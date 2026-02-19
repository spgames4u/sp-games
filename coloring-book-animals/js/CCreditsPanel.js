function CCreditsPanel(){
    
    var _oFade;
    var _oPanelContainer;
    var _oButExit;
    var _oLogo;
    
    var _pStartPanelPos;
    
    this._init = function(){
        
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        _oFade.alpha = 0.7;
        _oFade.on("mousedown",function(){});
        s_oInteractiveStage.addChild(_oFade);
        
        //new createjs.Tween.get(_oFade).to({alpha:0.7},500);
        
        _oPanelContainer = new createjs.Container();        
        s_oInteractiveStage.addChild(_oPanelContainer);
        
        var oSprite = s_oSpriteLibrary.getSprite('msg_box');
        var oPanel = createBitmap(oSprite);        
        oPanel.regX = oSprite.width/2;
        oPanel.regY = oSprite.height/2;
        _oPanelContainer.addChild(oPanel);
        
        _oPanelContainer.x = CANVAS_WIDTH/2;
        _oPanelContainer.y = CANVAS_HEIGHT/2;  

       
        var iWidth = oSprite.width-400;
        var iHeight = 50;
        var iX = 0;
        var iY = -120;
        var oTitle = new CTLText(_oPanelContainer, 
                    iX-iWidth/2, iY-iHeight/2, iWidth, iHeight, 
                    40, "center", "#008df0", PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_DEVELOPED,
                    true, true, false,
                    false );
       
        var iWidth = oSprite.width-300;
        var iHeight = 0;
        var iX = 0;
        var iY = 100;
        var oLink = new CTLText(_oPanelContainer, 
                    iX-iWidth/2, iY-iHeight/2, iWidth, 40, 
                    40, "center", "#008df0", PRIMARY_FONT, 1,
                    2, 2,
                    "SP.Games",
                    true, true, false,
                    false );
       
        var oSprite = s_oSpriteLibrary.getSprite('ctl_logo');
        _oLogo = createBitmap(oSprite);
        _oLogo.on("mousedown",this._onLogoButRelease);
        _oLogo.regX = oSprite.width/2;
        _oLogo.regY = oSprite.height/2;
        _oPanelContainer.addChild(_oLogo);
      
        var oSprite = s_oSpriteLibrary.getSprite('but_exit');
        _oButExit = new CGfxButton(1320, 330, oSprite, _oPanelContainer);
        _oButExit.addEventListener(ON_MOUSE_UP, this.unload, this);
        
    };
    
    this.unload = function(){
        s_oInteractiveStage.removeChild(_oFade);
        s_oInteractiveStage.removeChild(_oPanelContainer);

        _oButExit.unload();
        
        _oFade.off("mousedown",function(){});
        _oLogo.off("mousedown",this._onLogoButRelease);
        
        
    };
    
    this._onLogoButRelease = function(){
        window.open("https://sp.games/","_blank");
    };

    this._init();
    
    
};


