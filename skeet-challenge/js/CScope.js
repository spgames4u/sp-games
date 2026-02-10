function CScope(_oGameSceneContainer){
    
    var _oSprite;
    var _oExplosion;
    
    var _bLeft=false;
    var _bRight=false;
    var _bUp=false;
    var _bDown=false;
    var _iXMove;
    var _iYMove;
    
    var _iXCenter;
    var _iYCenter;
    
    this._init = function(_oGameSceneContainer){                
        
        _iXMove=0;
        _iYMove=0;
        
       
        var oSprite = s_oSpriteLibrary.getSprite('scope');
        _oSprite = createBitmap(oSprite);
        _oSprite.x = CANVAS_WIDTH/2;
        _oSprite.y = CANVAS_HEIGHT/2;
        _oSprite.regX = oSprite.width/2;
        _oSprite.regY = oSprite.height/2;
        _oGameSceneContainer.addChild(_oSprite);
        
        var oSpriteExplosion = s_oSpriteLibrary.getSprite('tap_shot');
        var oData = {   // image to use
                        images: [oSpriteExplosion], 
                        // width, height & registration point of each sprite
                        frames: {width: 200, height: 200, regX: 100, regY: 100}, 
                        animations: {  show: [0, 19,"hide"],hide:[20,21] }
                        
        };
    };
    
    this.resetAllDirection = function (){
        _bLeft=false;
        _bRight=false;
        _bUp=false;
        _bDown=false;
    };
    
    this.stopMovement = function(){
        _iXMove = 0;
        _iYMove = 0;
    };
    
    this.onAnimationEnd = function(){
	_oExplosion.visible = false;
    };
    
    this.playShot = function(){
        _oExplosion.x = _oSprite.x;
        _oExplosion.y = _oSprite.y;
        _oExplosion.visible = true;
        _oExplosion.gotoAndPlay("show");
        
        playSound("shot",1,false);
    };
    
    //Set canvas bound for the scope
    this._checkBoundary = function(){
        if( ((_oSprite.x) > CANVAS_WIDTH)){  
            _oSprite.x = CANVAS_WIDTH;
        }
     
        if( ((_oSprite.x) < 0)){  
            _oSprite.x = 0;
        }
     
        if( ((_oSprite.y) > CANVAS_HEIGHT)){  
            _oSprite.y = CANVAS_HEIGHT;
        }
     
        if( ((_oSprite.y) < 0)){  
            _oSprite.y = 0;
        };
    };
        
    this.bullsEye=function(){
        _iXCenter = _oSprite.x;
        _iYCenter = _oSprite.y;
        return{x:_iXCenter, y:_iYCenter};
    };    

    
    this.upStop = function(){
        _bUp=false;
    };
    
    this.downStop = function(){
        _bDown=false;   
    };
    
    this.leftStop = function(){
        _bLeft=false; 
    };
    
    this.rightStop = function(){
        _bRight=false;
       
    };
    
    this.moveLeft = function(){
        _bLeft=true;
        _bRight=false;
    };
    
    this.moveRight = function(){
        _bRight=true;
        _bLeft=false;
    };
       
    this.moveUp = function(){
        _bUp=true;
        _bDown=false;
    };
      
    this.moveDown = function(){
        _bDown=true;
        _bUp=false;
    };
    
    this.getSprite = function(){
        return _oSprite;
    };
    
    this.setPos = function(iX, iY){
        _oSprite.x = iX;
        _oSprite.y = iY;
    };
    
    this.setVisible = function(bVal){
        if(bVal){
            _oSprite.alpha = 1;
        } else {
            _oSprite.alpha = 0;
        }
         
    };
    
    this.setFadeVisible = function(bVal){
        if(bVal){
            new createjs.Tween.get(_oSprite).to({alpha: 1},500);
        } else {
            new createjs.Tween.get(_oSprite).to({alpha: 0},500);
        }
    };
    
    this.update = function(){ 
        //Set scope movements

        if(_bRight &&_bUp){
            _iXMove += SCOPE_ACCELERATION;
            _iYMove -= SCOPE_ACCELERATION;
        }else if(_bRight &&_bDown){
            _iXMove += SCOPE_ACCELERATION;
            _iYMove += SCOPE_ACCELERATION;
        } else if(_bLeft &&_bDown){
            _iXMove -= SCOPE_ACCELERATION;
            _iYMove += SCOPE_ACCELERATION;
        }else if(_bLeft &&_bUp){
            _iXMove -= SCOPE_ACCELERATION;
            _iYMove -= SCOPE_ACCELERATION;
        } else if(_bLeft){
            _iXMove -= SCOPE_ACCELERATION;
            
        }else if(_bRight){
           _iXMove += SCOPE_ACCELERATION;
        }else if(_bUp){
           _iYMove -= SCOPE_ACCELERATION;     
        }else if(_bDown){
           _iYMove += SCOPE_ACCELERATION;    
        }

        
        _oSprite.x += _iXMove;
        _oSprite.y += _iYMove;        
        _iXMove *= SCOPE_FRICTION;
        _iYMove *= SCOPE_FRICTION;
        
        if (_iXMove > MAX_SCOPE_SPEED) {
                _iXMove = MAX_SCOPE_SPEED;
        }
        
        if (_iXMove < -MAX_SCOPE_SPEED) {
                _iXMove = -MAX_SCOPE_SPEED;
        }
        
         if (_iYMove > MAX_SCOPE_SPEED) {
                _iYMove = MAX_SCOPE_SPEED;
        }
        
        if (_iYMove < -MAX_SCOPE_SPEED) {
                _iYMove = -MAX_SCOPE_SPEED;
        }
        
        if ( Math.abs(_iXMove) < 0.2 ) {
                _iXMove = 0;
        }
        
        if ( Math.abs(_iYMove) < 0.2 ) {
                _iYMove = 0;
        }
        
        this._checkBoundary();
    };
    this._init(_oGameSceneContainer);
}