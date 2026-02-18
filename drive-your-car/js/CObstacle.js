function CObstacle(iStartX,iStartY,oSpriteSheet,iWidth,iHeight,iRegX,iRegY){
    var _bActive = true;
    var _iWidth;
    var _iHeight;
	var _iHalfHeight;
    var _iScale;
    var _iSpeed;
    var _iStartX;
    var _iStartY;
	var _iSquareHeight;
    var _bNextCalled;
    var _oSpriteObj;
    var _oAnimationRun;
    var _iDistTraveled;
    
    this._init = function(iStartX,iStartY,oSpriteSheet,iWidth,iHeight,iRegX,iRegY){
        _iDistTraveled = 0;
        _iSpeed = -1;
        _bNextCalled = false;
        _iScale = 1;
	_oSpriteObj = oSpriteSheet;

	var iRandEnemy = Math.floor(Math.random() * (12 - 1) + 1);
        _oAnimationRun = createSprite(_oSpriteObj, iRandEnemy,Math.abs(iRegX),Math.abs(iRegY),iWidth,iHeight);
       _oAnimationRun.stop();

        _oAnimationRun.x = iStartX;
        _oAnimationRun.y = iStartY;
        s_oStage.addChild(_oAnimationRun);

        _iWidth = 100;
        _iHeight = iHeight;

	_iHalfHeight = _iHeight/2; 
        _iStartX = iStartX;
        _iStartY = iStartY;
	_iSquareHeight = _iHeight*_iHeight - (50*50);
    };
    
    this.reset = function(){ 
        _oAnimationRun.y -= ((CANVAS_HEIGHT*8)+DISTANCE_AMONG_OBSTACLES);
    };
    
    this.getPos = function(){
        return { x: _oAnimationRun.x, y: _oAnimationRun.y};
    };
    
    this.getY = function(){
        return _oAnimationRun.y;
    };
    
    this.getFront = function(){
        return _oAnimationRun.y - _iHalfHeight; 
    };
	
	this.getSquareRadius = function(){
		return _iSquareHeight;
	}
    
    this.isActive = function(){
      return _bActive;  
    };
    
    this.update = function(iHeroSpeed){
        _oAnimationRun.y =_oAnimationRun.y + (iHeroSpeed+_iSpeed); 
    };
    
    this._init(iStartX,iStartY,oSpriteSheet,iWidth,iHeight,iRegX,iRegY);
}