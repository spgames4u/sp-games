function CHelpPanel(){
    var _bExitPress;
    
    var _oText1;
    var _oText2;
    var _oText3;
    var _oText3Back;
    var _oHelpBg;
    var _oGroup;
    var _oImage0;
    var _oImage1;
    var _oImage2;

    var _oFade;
    var _oParent;

    var _pStartPanelPos;

    this._init = function(){
        
        _bExitPress = false;
        
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        _oFade.alpha = 0;
        _oFade.on("mousedown",function(){});
        s_oStage.addChild(_oFade);
        
        new createjs.Tween.get(_oFade).to({alpha:0.7},500);
        
        var oSprite = s_oSpriteLibrary.getSprite('general_panel');
        _oGroup = new createjs.Container();
        s_oStage.addChild(_oGroup);

        _oGroup.x = CANVAS_WIDTH/2;
        _oGroup.y = CANVAS_HEIGHT + oSprite.height/2;  
        _pStartPanelPos = {x: _oGroup.x, y: _oGroup.y};
        new createjs.Tween.get(_oGroup).to({y:CANVAS_HEIGHT/2},500, createjs.Ease.quartIn);
        
        _oHelpBg = createBitmap(oSprite);
        _oHelpBg.regX = oSprite.width/2;
        _oHelpBg.regY = oSprite.height/2;
        _oGroup.addChild(_oHelpBg);
        
        var pTextPos = {x:-270, y:-170};        
        
        _oText1 = new CTLText(_oGroup, 
                    pTextPos.x, pTextPos.y+22 , 260, 66, 
                    22, "left", "#fff", PRIMARY_FONT, 1,
                    0, 0,
                    " ",
                    true, true, true,
                    false );



        _oImage0 = createBitmap(s_oSpriteLibrary.getSprite('scope'));
        _oImage0.x = pTextPos.x + 290;
        _oImage0.y = pTextPos.y;

        _oImage1 = createBitmap(s_oSpriteLibrary.getSprite('keys'));
        _oImage1.x = pTextPos.x + 415;
        _oImage1.y = pTextPos.y + 10;

        
        if(!s_bMobile){ 
            _oText2 = new CTLText(_oGroup, 
                    pTextPos.x, pTextPos.y+140 , 260, 66, 
                    22, "left", "#fff", PRIMARY_FONT, 1,
                    0, 0,
                    " ",
                    true, true, true,
                    false );

        }else{
            _oText2 = new CTLText(_oGroup, 
                    20,-150 , 260, 66, 
                    22, "left", "#fff", PRIMARY_FONT, 1,
                    0, 0,
                    TEXT_HELP_MOB2,
                    true, true, true,
                    false );

        }
        
        
        _oImage2 = createBitmap(s_oSpriteLibrary.getSprite('space_bar'));
        _oImage2.x = pTextPos.x + 305;
        _oImage2.y = pTextPos.y + 145;
        
        _oText3Back = new CTLText(_oGroup, 
                    -250, pTextPos.y + 277 , 500, 60, 
                    30, "center", "#fff", PRIMARY_FONT, 1,
                    0, 0,
                    TEXT_HELP3,
                    true, true, true,
                    false );

	
        if(!s_bMobile){ 
            _oText1.refreshText(TEXT_HELP1);
            _oText2.refreshText(TEXT_HELP2);

        } else {
            
            _oText1.refreshText(TEXT_HELP_MOB1);
            _oText1.setX( -150);
  
            
            _oText1.setScale(0.8);
            _oText2.setScale(0.8);
            
            var oSprite = s_oSpriteLibrary.getSprite('dividing_line');
            var oDivide = createBitmap(oSprite);
            oDivide.regX = oSprite.width/2;

            oDivide.y = -160;
            _oGroup.addChild(oDivide);
            
            var oSprite = s_oSpriteLibrary.getSprite('joypad');
            var oData = {   
                        images: [oSprite], 
                        // width, height & registration point of each sprite
                        frames: {width: oSprite.width/2, height: oSprite.height, regX: (oSprite.width/2)/2, regY: oSprite.height/2}, 
                        animations: {bg:[0],stick:[1]}
                   };
                   
            var oSpriteSheet = new createjs.SpriteSheet(oData);
            _oImage0 = createSprite(oSpriteSheet, "bg",(oSprite.width/2)/2,oSprite.height/2,oSprite.width/2,oSprite.height);
            _oImage0.scaleX = _oImage0.scaleY = 0.5;
            _oImage0.x  = -150;
            _oImage0.y  = -20;
            
            var xPos = pTextPos.x + 40;
            var yPos = -20;
            var oSprite = s_oSpriteLibrary.getSprite('swift_hand');
            _oImage1.regY = oSprite.height/2;
            _oImage1.x = xPos;
            _oImage1.y = yPos + 30;
            _oImage1.image = oSprite;
            createjs.Tween.get(_oImage1, {loop:true}).to({x:_oImage1.x+50}, 1000, createjs.Ease.cubicIn).to({x:xPos}, 1000, createjs.Ease.cubicIn);
            createjs.Tween.get(_oImage1, {loop:true}).to({y:_oImage1.y+30}, 500, createjs.Ease.sinOut).to({y:yPos + 30}, 500, createjs.Ease.sinIn);

            var oSprite = s_oSpriteLibrary.getSprite('touch_hand');
            _oImage2.regX = oSprite.width/2;
            _oImage2.regY = oSprite.height/2;
            _oImage2.x = 150;
            _oImage2.y = yPos+20;
            _oImage2.image = oSprite;
    
            createjs.Tween.get(_oImage2, {loop:true}).to({scaleX:0.9, scaleY:0.9}, 250, createjs.Ease.cubicIn).to({scaleX:1, scaleY:1}, 250, createjs.Ease.cubicIn);
         
        }

        _oGroup.addChild(_oImage0, _oImage1, _oImage2);
        
        _oGroup.on("pressup",this._onExitHelp);
        _oGroup.on("mouseover",this._buttonOver);

    };
    
    this._buttonOver = function(evt){
        if(!s_bMobile){
            evt.target.cursor = "pointer";
        }  
    };

    this.unload = function(){
        s_oStage.removeChild(_oGroup);

        _oGroup.off("pressup",this._onExitHelp);
        _oGroup.off("mouseover",this._buttonOver);
    };

    this._onExitHelp = function(){
        if(_bExitPress){
            return;
        };
        
        _bExitPress = true;

        new createjs.Tween.get(_oFade).to({alpha:0},500);
        new createjs.Tween.get(_oGroup).to({y:_pStartPanelPos.y},400, createjs.Ease.backIn).call(function(){
            _oParent.unload();
            s_oGame._onExitHelp();
        });
       
    };

    _oParent = this;
    this._init();

}