function CGame(oData){

    var _bStartGame;
    var _bStartShoot;
    
    var _iSegmentOffset;
    var _iScore;    
    var _iNumAmmoShot;
    var _iStage;
    var _iCurShotType;
    var _iNumSkeetToDestroy;
    var _iTimeElaps;
    var _iCurSkeetUpdate;
    var _iSkeetHit;
    var _iNumShot;

    var _oGameSceneContainer;
    var _oSkeetContainer;
    var _oInterface;
    var _oHelpPanel;
    var _oEndPanel = null;
    var _oParent;
    
    var _aIndicator;
    var _aSkeet;
    
    var _oPlayer;
    var _oScope;
    var _oJoypad;
    
    this._init = function(){
        
        _bStartGame=true;
        _bStartShoot = false;
        
        _iSegmentOffset = Math.PI / 8;
        _iScore=0;  
        _iNumAmmoShot = MAX_NUM_AMMO;
        _iStage = 0;
        _iCurShotType = 0;
        _iTimeElaps = 0;
        _iCurSkeetUpdate = 0;
        _iSkeetHit = 0;
        _iNumShot = 0;
        
        playSound("ambience",1,true);
        
        _oGameSceneContainer = new createjs.Container();
        s_oStage.addChild(_oGameSceneContainer);
        
        _oInterface = new CInterface();
        _oInterface.refreshScore(_iScore);  
        
        var oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_game'));
        _oGameSceneContainer.addChild(oBg); //Draws on canvas

        _oSkeetContainer = new createjs.Container();
        _oGameSceneContainer.addChild(_oSkeetContainer);

        _oScope = new CScope(_oGameSceneContainer);
        _oScope.setVisible(false);

        _oPlayer = new CPlayer(_oGameSceneContainer);
        _oPlayer.playIdle();

        _oHelpPanel = CHelpPanel();

    };

    function onKeyUp(evt) { 
        //SPACEBAR
        evt.preventDefault();
        switch(evt.keyCode) {  
           // left  
           case 37: {
                   _oScope.leftStop();
                   break; 
               }
           //up  
           case 38: {
                   _oScope.upStop();
                   break; 
               }         
                
           // right  
           case 39: {
                   _oScope.rightStop();
                   break; 
               }
		   //down
           case 40: {
                   _oScope.downStop();
                   break; 
               }     
        }  
    }

    function onKeyDown(evt) { 
        if(!evt){ 
            evt = window.event; 
        } 
        evt.preventDefault();
        switch(evt.keyCode) {
           
            case 32:{                    
                    s_oGame._onShot();                    
                    break;
            }
            // left  
            case 37: {
                    _oScope.moveLeft();
                    break; 
                }
            //up  
            case 38: {
                    _oScope.moveUp();
                    break; 
                }         

            // right  
            case 39: {
                    _oScope.moveRight();
                    break; 
                }
                    //down
            case 40: {
                   _oScope.moveDown();
                   break; 
                }     
        } 
    }
    
    this.checkController = function(iDirection){
        
        if(iDirection === null){
            _oScope.resetAllDirection();
        } else {
            
            if(iDirection >= -_iSegmentOffset && iDirection < _iSegmentOffset ){
                //RIGHT;
                _oScope.moveRight();
            
                _oScope.downStop();
                _oScope.upStop();
                _oScope.leftStop();
                return;
                
            } else if(iDirection >= _iSegmentOffset && iDirection < _iSegmentOffset*3){
                //DOWNRIGHT;
                _oScope.moveDown();
                _oScope.moveRight();

                _oScope.upStop();
                _oScope.leftStop();
                return;
                
            } else if(iDirection >= _iSegmentOffset*3 && iDirection < _iSegmentOffset*5){
                //DOWN;
                _oScope.moveDown();
            
                _oScope.upStop();
                _oScope.rightStop();
                _oScope.leftStop();
                return;
            } else if(iDirection >= _iSegmentOffset*5 && iDirection < _iSegmentOffset*7){
                //DOWNLEFT;
                _oScope.moveDown();
                _oScope.moveLeft();

                _oScope.upStop();
                _oScope.rightStop();
                return;
                
            } else if(iDirection >= _iSegmentOffset*7 || iDirection < -_iSegmentOffset*7){
                //LEFT;
                _oScope.moveLeft();
            
                _oScope.downStop();
                _oScope.rightStop();
                _oScope.upStop();
                return;
                
            } else if(iDirection >= -_iSegmentOffset*7 && iDirection < -_iSegmentOffset*5){
                //LEFTUP;
                _oScope.moveUp();
                _oScope.moveLeft();

                _oScope.downStop();
                _oScope.rightStop();
                return;
                
            } else if(iDirection >= -_iSegmentOffset*5 && iDirection < -_iSegmentOffset*3){
                //UP;
                _oScope.moveUp();
            
                _oScope.downStop();
                _oScope.rightStop();
                _oScope.leftStop();
			
                return;
                
            } else if(iDirection >= -_iSegmentOffset*3 && iDirection < -_iSegmentOffset){
                //UPRIGHT;
                _oScope.moveUp();
                _oScope.moveRight();

                _oScope.downStop();
                _oScope.leftStop();
                return;
            }    
        }

    };
    
    this._onShot = function(){
        if(_iNumAmmoShot === 0 || !_bStartShoot){
            return;
        }
        _iNumShot++;
        
        playSound("shot",1,false);

        var oCollisionData;
        for(var i=0; i<_aSkeet.length; i++){
            oCollisionData = _aSkeet[i].checkCollision(_oScope.bullsEye().x, _oScope.bullsEye().y);
            
            if(oCollisionData.hit){
                
                playSound("hit_disc",1,false);
                
                _iSkeetHit++;
                _aSkeet[i].destroy();
                this.setScore(oCollisionData.hitdistance, oCollisionData.collisionradius, _oScope.bullsEye());
            }
        }

        _iNumAmmoShot--;
        
        _oGameSceneContainer.x = _oScope.bullsEye().x;
        _oGameSceneContainer.y = _oScope.bullsEye().y;
        _oGameSceneContainer.regX = _oScope.bullsEye().x;
        _oGameSceneContainer.regY = _oScope.bullsEye().y;
        
        new createjs.Tween.get(_oGameSceneContainer).to({scaleX: 1.1, scaleY:1.1},80).to({scaleX: 1, scaleY:1},10);
        
        if(_iNumAmmoShot === 0){
            setTimeout(function(){
                _oPlayer.playRecharge();
            }, 500);
            _oScope.setVisible(false);
        }
    };
    
    this.setScore = function(iHitDistance, iColliderRadius, oPos){
        
        var iScore = Math.floor( -(iHitDistance - iColliderRadius)/(iColliderRadius)*MAX_POINTS_EARN );
        new CScoreText(iScore, oPos.x, oPos.y);
        
        _iScore += iScore;
        
        _oInterface.refreshScore(iScore);
        $(s_oMain).trigger("save_score", _iScore, "standard");
    };
    
    this.beginNewRound = function(){
        if(_iStage < SHOT_MODE.length){
            _oPlayer.playAimAnim();
        } else {
            this.gameOver();
        }
        
    };
    
    this.playerReadyToShot = function(){
        this._initStage();
    };
 
    this._getSkeetValue = function(iCurShotType){
        var iStartX = SHOT[iCurShotType].startX;
        var iEndX = SHOT[iCurShotType].endX;
        var iStartY = SHOT[iCurShotType].startY;
        var iEndY = SHOT[iCurShotType].endY;
        
        if(SHOT[_iCurShotType].startY > 0){
            iStartY = SHOT[iCurShotType].startY + randomFloatBetween(-TRAJECTOR_RANGE_Y,TRAJECTOR_RANGE_Y,1);
            iEndY = SHOT[iCurShotType].endY + randomFloatBetween(-TRAJECTOR_RANGE_Y,TRAJECTOR_RANGE_Y,1);
        } else {
            iStartX = SHOT[iCurShotType].startX + randomFloatBetween(-TRAJECTOR_RANGE_X,TRAJECTOR_RANGE_X,1);
            iEndX = SHOT[iCurShotType].endX + randomFloatBetween(-TRAJECTOR_RANGE_X,TRAJECTOR_RANGE_X,1);
        }
        
        var iSpeed = Math.floor(SHOT[iCurShotType].speed/STANDARD_SPEED_FACTOR);
        if(s_bMobile){
            iSpeed = Math.floor(SHOT[iCurShotType].speed/MOBILE_SPEED_FACTOR/STANDARD_SPEED_FACTOR);
        }
        
        return {startX: iStartX, endX: iEndX, startY: iStartY, endY: iEndY, speed:iSpeed};
        
    };
 
    this._initStage = function(){
        
        _iTimeElaps = 0;
        
        _iNumAmmoShot = MAX_NUM_AMMO;
        _oScope.setPos(CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
        _oScope.setFadeVisible(true);
        _oScope.stopMovement();
        
        _iCurSkeetUpdate = 0;
        
        var oSkeetData;
        _aSkeet = new Array();
        if(SHOT_MODE[_iStage] === SHOT_SINGLE){
            _iNumSkeetToDestroy = 1;
            
            oSkeetData = this._getSkeetValue(_iCurShotType);
            _aSkeet[0] = new CSkeet(oSkeetData.startX, oSkeetData.startY, _oSkeetContainer, oSkeetData.endX, oSkeetData.endY, SHOT[_iCurShotType].type, oSkeetData.speed, _iCurShotType);
        } else {
            _iNumSkeetToDestroy = 2;
            
            oSkeetData = this._getSkeetValue(_iCurShotType);
            _aSkeet[0] = new CSkeet(oSkeetData.startX, oSkeetData.startY, _oSkeetContainer, oSkeetData.endX, oSkeetData.endY, SHOT[_iCurShotType].type, oSkeetData.speed, _iCurShotType);
            
            _iCurShotType++;
            oSkeetData = this._getSkeetValue(_iCurShotType);
            _aSkeet[1] = new CSkeet(oSkeetData.startX, oSkeetData.startY, _oSkeetContainer, oSkeetData.endX, oSkeetData.endY, SHOT[_iCurShotType].type, oSkeetData.speed, _iCurShotType);
        }
        _iCurShotType++;
        _iStage++;
        
        _aIndicator = new Array();
        for(var i=0; i<_aSkeet.length; i++){
            _aIndicator[i] = new CIndicator(_aSkeet[i].getPos().x, _aSkeet[i].getPos().y, i+1);
        };
        
        _oInterface.startText();
    };
    
    this.startStage = function(){
        _oPlayer.playShootDirection();        
        
        _bStartShoot = true;
    };
    
    this.endStage = function(iIndex, iSkeetResult){
        _iNumSkeetToDestroy--;
        
        _oInterface.setSkeetInfo(iIndex, iSkeetResult);
        
        if(_iNumSkeetToDestroy === 0){
            _bStartShoot = false;
            
            setTimeout(function(){
                s_oGame.beginNewRound();
            },1500);
            
            var bApplause = true;
            for(var i=0; i<_aSkeet.length; i++){
                if(!_aSkeet[i].getDestroyed() || _aSkeet.length === 1){
                    bApplause = false;
                }
            }
            if(bApplause){
                playSound("applauses",1,false);
            }
            
            if(_iNumAmmoShot > 0){
                setTimeout(function(){
                    _oPlayer.playRecharge();
                },500);
                _oScope.setVisible(false);
            }
        }
    };       
    
    this.unload = function(){
        _bStartGame = false;
        
        _oInterface.unload();
        if(_oEndPanel !== null){
            _oEndPanel.unload();
        }
        
        createjs.Tween.removeAllTweens();
        s_oStage.removeAllChildren();
    };
 
    this.onExit = function(){
        $(s_oMain).trigger("end_session");
        $(s_oMain).trigger("end_level",1);
        stopSound("ambience");
        setVolume("soundtrack", 1);
        
        this.unload();
        s_oMain.gotoMenu();
    };
    
    this._onExitHelp = function () {
        _bStartGame = true;
        $(s_oMain).trigger("start_level",1);

        setVolume("soundtrack", 0);

        this.beginNewRound();
         
         //TOUCH EVENTS
        if(!s_bMobile) {
            //KEY LISTENER
            document.onkeydown   = onKeyDown; 
            document.onkeyup   = onKeyUp; 
 
        } else {
            var oJoypadSprite = s_oSpriteLibrary.getSprite('joypad');
            _oJoypad = new CJoypad(oJoypadSprite, 100, 700, s_oStage, false);
            _oJoypad.addFireButtonListener(ON_MOUSE_DOWN, this._onShot, this);
        }
        
    };
    
    this.gameOver = function(){  
        _oEndPanel = new CEndPanel(_iScore, _iSkeetHit, _iNumShot);
    };

    this.startUpdate = function(){
        _bStartGame = true;
        _oInterface.setTweenPause(false);
    };

    this.stopUpdate = function(){
        _bStartGame = false;
        _oInterface.setTweenPause(true);
    };
    
    this.update = function(){
        if(_bStartGame){
            if(_oJoypad){
                this.checkController(_oJoypad.update());
            } 

            _oPlayer.update(_oScope.bullsEye());

            if(_bStartShoot){


                for(var i=0; i<_aSkeet.length; i++){
                    _aSkeet[i].update();
                } 

                _oScope.update();

                _iTimeElaps += s_iTimeElaps;

                if(_iTimeElaps > 2000 && _iCurSkeetUpdate < _aSkeet.length){
                    _iTimeElaps = 0;
                    _aSkeet[_iCurSkeetUpdate].lauch();
                    _aIndicator[_iCurSkeetUpdate].remove();
                    _iCurSkeetUpdate++;
                }
            }
        }
    };

    s_oGame=this;
    
    SCOPE_ACCELERATION = oData.scope_accelleration;
    SCOPE_FRICTION = oData.scope_friction;
    MAX_SCOPE_SPEED = oData.max_scope_speed;

    MAX_POINTS_EARN = oData.max_points_earned_per_skeet;
    
    STANDARD_SPEED_FACTOR = oData.standard_skeet_speed;
    MOBILE_SPEED_FACTOR = oData.mobile_skeet_speed_factor;
    
    _oParent=this;
    this._init();
}

var s_oGame;
