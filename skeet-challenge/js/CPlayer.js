function CPlayer(oParentContainer){
    var _iAnimState;
    var _iCurFrame;
    
    var _aAim;
    var _aRecharge;
    var _aShootDirection;
    
    var _oPlayer;
    var _oCurFrame;
    var _oShootDirectionCell;
    
    this._init = function(oParentContainer){
        
        _iAnimState = PLAYER_IDLE;
        _iCurFrame = 0;
        
        _oShootDirectionCell = {width: CANVAS_WIDTH/7.99, height:CANVAS_HEIGHT/2.99};
        
        _oPlayer = new createjs.Container();
        _oPlayer.x = 0;
        _oPlayer.y = CANVAS_HEIGHT;
        oParentContainer.addChild(_oPlayer);
        
        _aAim = new Array();
        for(var i=0; i<10; i++){
            var oSprite = s_oSpriteLibrary.getSprite("mss_goto_aim_"+i);
            var oBitmap = createBitmap(oSprite);
            oBitmap.regY = oSprite.height;
            oBitmap.visible = false;
            _aAim.push(oBitmap);
            _oPlayer.addChild(oBitmap);
        }
        
        _aRecharge = new Array();
        for(var i=0; i<25; i++){
            var oSprite = s_oSpriteLibrary.getSprite("mss_recharge_"+i);
            var oBitmap = createBitmap(oSprite);
            oBitmap.regY = oSprite.height;
            oBitmap.visible = false;
            _aRecharge.push(oBitmap);
            _oPlayer.addChild(oBitmap);
        }
        
        _aShootDirection = new Array();
        for(var i=0; i<3; i++){
            _aShootDirection[i] = new Array();
            var iRow = 2-i;
            for(var j=0; j<8; j++){
                var oSprite = s_oSpriteLibrary.getSprite("mss_turn"+iRow+"_"+j);
                var oBitmap = createBitmap(oSprite);
                oBitmap.regY = oSprite.height;
                oBitmap.visible = false;
                _aShootDirection[i][j] = oBitmap;
                _oPlayer.addChild(oBitmap);
            }
        }
        
        _oCurFrame = _aAim[0];
    };
    
    this.resetAnim = function(){
        
    };
    
    this.playIdle = function(){
        _iAnimState = PLAYER_IDLE;
        _oCurFrame.visible = false;
        _aAim[0].visible = true;
        _oCurFrame = _aAim[0];
    };
    
    this.playAimAnim = function(){
        _iAnimState = PLAYER_AIM;
    };
    
    this.playRecharge = function(){
        playSound("reload",1,false);
        _iAnimState = PLAYER_RECHARGE;
    };
    
    this.playShootDirection = function(){
        _iAnimState = PLAYER_SHOOT;
    };
    
    this._rechargeAnim = function(){
        _oCurFrame.visible = false;
        
        _iCurFrame++;
        
        _aRecharge[_iCurFrame].visible = true;
        _oCurFrame = _aRecharge[_iCurFrame];
       
        if(_iCurFrame === _aRecharge.length-1){
            _iCurFrame = 0;
            this.playIdle();
        }
    };
    
    this._aimAnim = function(){
        _oCurFrame.visible = false;
        
        _iCurFrame++;
        if(_iCurFrame > _aAim.length){
            _iCurFrame = 1;
        }

        _aAim[_iCurFrame].visible = true;
        _oCurFrame = _aAim[_iCurFrame];

        if(_iCurFrame === _aAim.length-1){
       
            _iCurFrame = 0;
            _iAnimState = PLAYER_IDLE;
            
            s_oGame.playerReadyToShot();
            
        }
    };
    
    this._setShootDirection = function(oScopePos){
        _oCurFrame.visible = false;
        
        var iRow = Math.floor(oScopePos.y/_oShootDirectionCell.height);
        var iCol = Math.floor(oScopePos.x/_oShootDirectionCell.width);
        
        _oCurFrame.visible = false;
        
        _aShootDirection[iRow][iCol].visible = true;
        _oCurFrame = _aShootDirection[iRow][iCol];
    };
    
    this.update = function(oScopePos){
        
        switch(_iAnimState){
            case PLAYER_AIM: {
                    this._aimAnim();
                    break;
            }
            case PLAYER_RECHARGE: {
                    this._rechargeAnim();
                    break;
            }
            case PLAYER_SHOOT: {
                    this._setShootDirection(oScopePos);
                    break;
            }
            default: {
                    
            }
        }
        
    };
    
    this._init(oParentContainer);
};


