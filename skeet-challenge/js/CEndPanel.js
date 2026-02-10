function CEndPanel(iScore, iSkeetHit, iNumShot){
    
    var _oFade;
    var _oPanelContainer;
    var _oParent;
    var _oSkeetHitText;
    
    var _pStartPanelPos;
    
    this._init = function(iScore, iSkeetHit, iNumShot){
        
        var szMessages;
        if(iSkeetHit > 15){
            szMessages = TEXT_CONGRATULATIONS;
            playSound("applauses",1,false);
        } else {
            szMessages = TEXT_BADSCORE;
            playSound("game_over",1,false);
        }
        
        
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        _oFade.alpha = 0;
        _oFade.on("mousedown",function(){});
        s_oStage.addChild(_oFade);
        
        new createjs.Tween.get(_oFade).to({alpha:0.7},500);
        
        _oPanelContainer = new createjs.Container();
        s_oStage.addChild(_oPanelContainer);
        
        var oSprite = s_oSpriteLibrary.getSprite('small_panel');
        var oPanel = createBitmap(oSprite);        
        oPanel.regX = oSprite.width/2;
        oPanel.regY = oSprite.height/2;
        _oPanelContainer.addChild(oPanel);
        
        _oPanelContainer.x = CANVAS_WIDTH/2;
        _oPanelContainer.y = CANVAS_HEIGHT + oSprite.height/2;   
        _pStartPanelPos = {x: _oPanelContainer.x, y: _oPanelContainer.y};
        new createjs.Tween.get(_oPanelContainer).to({y:CANVAS_HEIGHT/2},500, createjs.Ease.quartIn);
        

        var oTitle = new CTLText(_oPanelContainer, 
                    -200, -oSprite.height/2 + 20 , 400, 34, 
                    34, "center", "#fff", PRIMARY_FONT, 1,
                    0, 0,
                    szMessages,
                    true, true, true,
                    false );

        var iNewY = -90;
        new CSkeet(-45, iNewY + 60, _oPanelContainer, 0, 0, 0, 0, 0);

        _oSkeetHitText = new createjs.Text(iSkeetHit + " / " + 25," 24px "+PRIMARY_FONT, "#ffffff");
        _oSkeetHitText.x = -5;
        _oSkeetHitText.y = iNewY +60;
        _oSkeetHitText.textAlign = "left";
        _oSkeetHitText.textBaseline = "middle";
        _oSkeetHitText.lineWidth = 400;
        _oPanelContainer.addChild(_oSkeetHitText);
        
        
        var oSprite = s_oSpriteLibrary.getSprite('scope');
        var oScope = createBitmap(oSprite);        
        oScope.regX = oSprite.width/2;
        oScope.regY = oSprite.height/2;
        oScope.scaleX = oScope.scaleY = 0.5;
        oScope.x = -45;
        oScope.y = iNewY + 110;
        _oPanelContainer.addChild(oScope);
        
        
        var iHitRatio = (iSkeetHit/iNumShot*100).toFixed(1);
        if(iSkeetHit === 0 && iNumShot === 0){
            iHitRatio = 0;
        }
        var oHitRatioText = new createjs.Text(iHitRatio +"%"," 24px "+PRIMARY_FONT, "#ffffff");
        oHitRatioText.x = -5;
        oHitRatioText.y = oScope.y;
        oHitRatioText.textAlign = "left";
        oHitRatioText.textBaseline = "middle";
        oHitRatioText.lineWidth = 400;
        _oPanelContainer.addChild(oHitRatioText);
        
        
        $(s_oMain).trigger("save_score",iScore, "standard");                
        $(s_oMain).trigger("share_event",iScore);
        

        var oScore = new CTLText(_oPanelContainer, 
                    -200, iNewY + 180 , 400, 24, 
                    24, "center", "#fff", PRIMARY_FONT, 1,
                    0, 0,
                    TEXT_TOTAL_SCORE + " " +iScore,
                    true, true, false,
                    false );

        
        _oPanelContainer.on("pressup",this._onExit);
        _oPanelContainer.on("mouseover",this._buttonOver);
        
    };
    
    this._buttonOver = function(evt){
        if(!s_bMobile){
            evt.target.cursor = "pointer";
        }  
    };
    
    this.unload = function(){
        s_oStage.removeChild(_oPanelContainer);
        _oFade.off("mousedown",function(){});
        
        _oPanelContainer.off("pressup",this._onExit);
        _oPanelContainer.off("mouseover",this._buttonOver);
    };
    
    this._onExit = function(){
        
        $(s_oMain).trigger("show_interlevel_ad");
        
        new createjs.Tween.get(_oFade).to({alpha:0},500);
        new createjs.Tween.get(_oPanelContainer).to({y:_pStartPanelPos.y},400, createjs.Ease.backIn).call(function(){
            _oParent.unload();
            s_oGame.onExit();
        });
    };
    
    _oParent = this;
    this._init(iScore, iSkeetHit, iNumShot);
    
    return this;
}
