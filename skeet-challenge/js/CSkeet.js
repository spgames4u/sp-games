function CSkeet(iStartX, iStartY, oParentContainer, iFinalX, iFinalY, iMovementType, iSpeed, iIndexShot){
    
    var _bLaunched;
    var _bDestroyed;
    
    var _iIndex;
    var _iCntFrames;
    var _iMaxFrames;
    var _iHalfHeight;
    var _iMovementType;
    var _iSquareColliderRadius;
    
    var _aTrajectoryPoint;
    
    var _oSkeet;
    var _oSkeetSprite;
    var _oParticleSkeet;
    var _oThis;
    
    var _pStartPoint;
    var _pEndPoint;
    
    this._init = function(iStartX, iStartY, oParentContainer, iFinalX, iFinalY, iMovementType, iSpeed, iIndexShot){
        _bLaunched = false;
        _bDestroyed = false;
        
        _iIndex = iIndexShot;
        _iCntFrames = 0;
        _iMaxFrames = iSpeed;
        _iHalfHeight =500;
        _iMovementType = iMovementType;
        
        _oSkeet = new createjs.Container();
        _oSkeet.x = iStartX;
        _oSkeet.y = iStartY;
        oParentContainer.addChild(_oSkeet);
        
        var oSprite = s_oSpriteLibrary.getSprite('skeet');
        var oData = {   
                        images: [oSprite], 
                        // width, height & registration point of each sprite
                        frames: {width: oSprite.width/2, height: oSprite.height, regX: (oSprite.width/2)/2, regY: oSprite.height/2}, 
                        animations: {flawless:[0],damaged:[1]}
                   };
                   
        var oSpriteSheet = new createjs.SpriteSheet(oData);
	_oSkeetSprite = createSprite(oSpriteSheet, "flawless",(oSprite.width/2)/2,oSprite.height/2,oSprite.width/2,oSprite.height);
        _oSkeet.addChild(_oSkeetSprite);

        var oSprite = s_oSpriteLibrary.getSprite('particle_skeet');
        var oData = {   
                        framerate:20,
                        images: [oSprite], 
                        // width, height & registration point of each sprite
                        frames: {width: oSprite.width/8, height: oSprite.height/5, regX: (oSprite.width/8)/2, regY: (oSprite.height/5)/2}, 
                        animations: {idle:[39], explosion:[0,39, "idle"]}
                   };
                   
        var oSpriteSheet = new createjs.SpriteSheet(oData);
	_oParticleSkeet = createSprite(oSpriteSheet, "idle",(oSprite.width/8)/2,(oSprite.height/5)/2,oSprite.width/8,oSprite.height/5);
        _oParticleSkeet.gotoAndStop("idle");
        oParentContainer.addChild(_oParticleSkeet);

        _aTrajectoryPoint = new Array();

        _pStartPoint = {x: iStartX, y: iStartY};
        _pEndPoint = {x: iFinalX, y: iFinalY};


        this._calculateMid();
        
        _iSquareColliderRadius = Math.pow(50,2);
    };
    
    this.unload = function(){
        oParentContainer.removeChild(_oSkeet);
    };
    
    this._calculateMid = function(){
        var t0;
       
       t0 = new createjs.Point(iFinalX - ((iFinalX-iStartX)*0.2), iFinalY - _iHalfHeight/2);
        
        _aTrajectoryPoint = {start:_pStartPoint,end:_pEndPoint,traj:t0};
    };
    
    this._awayMovement = function(){
        _iCntFrames++;
        
        if ( _iCntFrames > _iMaxFrames ){
            _iCntFrames = 0;
            _bLaunched = false;
            
            s_oGame.endStage(_iIndex, SKEET_GONE);
            _oThis.unload();

        } else {
            
            var fLerpX = s_oTweenController.easeOutCubic( _iCntFrames, 0 ,1, _iMaxFrames);
            var iValue = s_oTweenController.tweenValue( iStartX, iFinalX, fLerpX);

            _oSkeet.x = iValue;
            
            var fLerpY = s_oTweenController.easeOutCubic( _iCntFrames, 0 ,1, _iMaxFrames);
            var iValue = s_oTweenController.tweenValue( iStartY, iFinalY, fLerpY);

            _oSkeet.y = iValue;	

            var fLerpScale = s_oTweenController.easeOutCubic( _iCntFrames, 0 ,1, _iMaxFrames);
            var iValue = s_oTweenController.tweenValue( 1.5, 0.1, fLerpScale);

            _oSkeet.scaleX = _oSkeet.scaleY = iValue;
        }
    };
    
    this._linearMovement = function(){
        _iCntFrames++;
        
        if ( _iCntFrames > _iMaxFrames ){
            _iCntFrames = 0;
            _bLaunched = false;
            
            s_oGame.endStage(_iIndex, SKEET_GONE);
            _oThis.unload();

        } else {
            var fLerpX = s_oTweenController.easeOutCubic( _iCntFrames, 0 ,1, _iMaxFrames);
            var iValue = s_oTweenController.tweenValue( iStartX, iFinalX, fLerpX);

            _oSkeet.x = iValue;
            
            var fLerpY = s_oTweenController.easeOutCubic( _iCntFrames, 0 ,1, _iMaxFrames);
            var iValue = s_oTweenController.tweenValue( iStartY, iFinalY, fLerpY);

            _oSkeet.y = iValue;
            
            var fLerpScale = s_oTweenController.easeOutCubic( _iCntFrames, 0 ,1, _iMaxFrames);
            var iValue = s_oTweenController.tweenValue( 1, 0.8, fLerpScale);

            _oSkeet.scaleX = _oSkeet.scaleY = iValue; 
        }
    };
    
    this._parabolicMovement = function(){
        _iCntFrames++;
        
        if ( _iCntFrames > _iMaxFrames ){
            _iCntFrames = 0;
            _bLaunched = false;
            
            s_oGame.endStage(_iIndex, SKEET_GONE);
            _oThis.unload();

        } else {
            var fLerp = s_oTweenController.easeOutCubic( _iCntFrames, 0 ,1, _iMaxFrames);
            
            var pPos = getTrajectoryPoint(fLerp, _aTrajectoryPoint);

            _oSkeet.x = pPos.x;
            _oSkeet.y = pPos.y;
            
            var fLerpScale = s_oTweenController.easeLinear( _iCntFrames, 0 ,1, _iMaxFrames);
            var iValue = s_oTweenController.tweenValue( 1, 0.01, fLerpScale);

            _oSkeet.scaleX = _oSkeet.scaleY = iValue;
                
        }
    };
    
    this.lauch = function(){
        _bLaunched = true;
        playSound("disc_launch",1,false);
    };
    
    this.checkCollision = function(iX, iY){
        var iXDiff = iX - _oSkeet.x;
        var iYDiff = iY - _oSkeet.y;
        
        var iHitDistanceFromCenter = iXDiff*iXDiff + iYDiff*iYDiff;
        var iRadius = _iSquareColliderRadius*_oSkeet.scaleX*_oSkeet.scaleX;
        
        return ({hit:iHitDistanceFromCenter < iRadius, hitdistance: iHitDistanceFromCenter, collisionradius: iRadius});
    };
    
    this.getPos = function(){
        return {x: _oSkeet.x, y: _oSkeet.y};
    };
    
    this.getIndex = function(){
        return _iIndex;
    };
    
    this.getDestroyed = function(){
        return _bDestroyed;
    };
    
    this.destroy = function(){
        _bDestroyed = true;
        
        _oSkeetSprite.gotoAndStop("damaged");
        new createjs.Tween.get(_oSkeet, {loop: true}).to({rotation: 7}, 100).to({rotation: -7}, 100);
        
        _oParticleSkeet.x = _oSkeet.x + 10*_oSkeet.scaleX;
        _oParticleSkeet.y = _oSkeet.y - 20*_oSkeet.scaleX;
        _oParticleSkeet.scaleX = _oParticleSkeet.scaleY = _oSkeet.scaleX;
        _oParticleSkeet.gotoAndPlay("explosion");

        new createjs.Tween.get(_oSkeet).to({alpha: 0}, 800).call(function(){
            _bLaunched = false;
            s_oGame.endStage(_iIndex, SKEET_DESTROYED);
            _oThis.unload();
        });
    };
    
    this.update = function(){
        if(_bLaunched){
            switch(_iMovementType){
                case SKEET_AWAY:{
                        this._awayMovement();
                        break;
                }
                case SKEET_LINEAR:{
                        this._linearMovement();
                        break;
                }
                case SKEET_PARABOLIC:{
                        this._parabolicMovement();
                        break;
                }
            }
        }
    };
    
    _oThis = this;
    this._init(iStartX, iStartY, oParentContainer, iFinalX, iFinalY, iMovementType, iSpeed, iIndexShot);
    
}