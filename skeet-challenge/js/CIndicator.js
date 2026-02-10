function CIndicator(iX, iY, iNum){
    
    var _oIndicator;
    
    this._init = function(iX, iY, iNum){
        
        _oIndicator = new createjs.Container();

        var oSprite = s_oSpriteLibrary.getSprite('indicator');
        var oSpriteIndicator = createBitmap(oSprite);
        _oIndicator.addChild(oSpriteIndicator);
        
        var oNumShadow = new createjs.Text(iNum," 24px "+PRIMARY_FONT, "#000000");
        oNumShadow.y = 30;
        oNumShadow.x = 18;
        oNumShadow.textAlign = "center";
        oNumShadow.textBaseline = "middle";
        oNumShadow.lineWidth = 200;
        _oIndicator.addChild(oNumShadow);

        var oNum = new createjs.Text(iNum," 24px "+PRIMARY_FONT, "#ffffff");
        oNum.x = oNumShadow.x - 2;
        oNum.y = oNumShadow.y - 2;
        oNum.textAlign = "center";
        oNum.textBaseline = "middle";
        oNum.lineWidth = 200;
        _oIndicator.addChild(oNum);
        
        
        if(iX < 0){
            _oIndicator.scaleX =-1;
            oNumShadow.scaleX = oNum.scaleX = -1;
            _oIndicator.x = s_iOffsetX + oSprite.width;
        }else {
            _oIndicator.x = CANVAS_WIDTH - s_iOffsetX - oSprite.width;
        }
        
        if(iY < 0){
            _oIndicator.rotation = -90;
            oNumShadow.rotation = oNum.rotation = 90;
            _oIndicator.y = s_iOffsetY + oSprite.height;
            _oIndicator.x = iX;
        } else {
            _oIndicator.y = iY;
        }

        _oIndicator.alpha = 0;
        s_oStage.addChild(_oIndicator);
        
        new createjs.Tween.get(_oIndicator).to({alpha:1}, 1000);
    };
    
    this.remove = function(){
        new createjs.Tween.get(_oIndicator).to({alpha:0}, 500).call(function(){
            s_oStage.removeChild(_oIndicator);
        });
    };
    
    this._init(iX, iY, iNum);
}


