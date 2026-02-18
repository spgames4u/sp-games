function CHero(iStartX,oSprite){
    var _bJumping = false;
    var _oHeroSprite;
    
    this._init = function(iStartX,oSprite){        
        _oHeroSprite = createBitmap(oSprite);
        _oHeroSprite.regX = oSprite.width/2;
        _oHeroSprite.regY = oSprite.height/2;
        _oHeroSprite.x = iStartX;
        _oHeroSprite.y = CANVAS_HEIGHT - 250;
        s_oStage.addChild(_oHeroSprite);
    };
    
    this.move = function(iNewXPos){
      createjs.Tween.get(_oHeroSprite).to({x:iNewXPos }, 150,createjs.Ease.cubicOut);  
    };
    
    this.jump = function(iSpeed){
        createjs.Tween.get(_oHeroSprite).to({scaleX:1.3,scaleY:1.3} , 17000/iSpeed,createjs.Ease.cubicOut).call(function() {
           playSound("jump_end",1,false);
           createjs.Tween.get(_oHeroSprite).to({scaleX:1,scaleY:1} , 20000/iSpeed,createjs.Ease.bounceOut).call(function() {  });
        });
    };
    
    this.getPos = function(){
        return { x: _oHeroSprite.x, y: _oHeroSprite.y};
    };
    
    this.getY = function(){
        return _oHeroSprite.y;
    };
    
    this.isTweening = function(){
        return createjs.Tween.hasActiveTweens(_oHeroSprite);
    };
    
    this.isJumping = function(){
        return _bJumping;
    };
    
    this.update = function(){
      if(_oHeroSprite.scaleY >1.1){
          _bJumping = true;
      }else{
          _bJumping = false;
      }
    };
    
    this._init(iStartX,oSprite);
}