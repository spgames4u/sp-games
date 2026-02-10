function CRollingTextController(oTarget,oTargetStroke,iAmountToIncrease,iTime,szEasing){
    var _iCntFrames;
    var _iMaxFrames;
    var _iCurStart;
    var _iTotWin;
    var _iTime;
    var _iNextAmount;
    var _iIdUpdateInterval;
    var _szCurEasing;
    var _aCbCompleted;
    var _aCbOwner;
    var _aRollingNotifyPoint;
    
    var _oTarget;
    var _oTargetStroke;
    
    this._init = function(oTarget,oTargetStroke,iAmountToIncrease,iTime,szEasing){
        _aCbCompleted=new Array();
        _aCbOwner =new Array();
        
        _iTime = iTime;
        this.setUpdateInfo(iAmountToIncrease);
        
        _szCurEasing = szEasing;
        
        _oTarget = oTarget;
        _oTargetStroke = oTargetStroke;
        
        _aRollingNotifyPoint = new Array();
        
    };
    
    this.unload = function(){
        clearInterval(_iIdUpdateInterval);
    };
    
    this.setUpdateInfo = function(iAmountToIncrease){
        _iCurStart = parseFloat(oTarget.text);
        _iTotWin = _iCurStart + iAmountToIncrease;

        _iCntFrames = 0;
        _iMaxFrames = Math.round(_iTime/FPS);
        _iNextAmount = 0;
        
        var _oParent = this;
        _iIdUpdateInterval = setInterval(function(){
            _oParent.update();
        }, FPS_TIME);
    };
    
    this.addEventListener = function( iEvent,cbCompleted, cbOwner ){
        _aCbCompleted[iEvent] = cbCompleted;
        _aCbOwner[iEvent] = cbOwner; 
    };
    
    this.addRollingListener = function(cbCompleted, cbOwner, aRollingStep){
        _aCbCompleted[ON_CONTROLLER_ROLL] = cbCompleted;
        _aCbOwner[ON_CONTROLLER_ROLL] = cbOwner; 
        
        _aRollingNotifyPoint = new Array();
        for(var i=0; i<aRollingStep.length; i++){
            _aRollingNotifyPoint[i] = {step: aRollingStep[i], flag:false};
        }
        
    };
    
    this.increaseValue = function(iNewAmount){
        _iNextAmount = iNewAmount;
    };
    
    this.getTarget = function(){
        return _oTarget;
    };
    
    this.update = function(){
        _iCntFrames++;
        if ( _iCntFrames > _iMaxFrames ){
            _iCntFrames = 0;
            
            _oTarget.text =  _iTotWin.toFixed(0);
            if(_oTargetStroke !== null){
                _oTargetStroke.text =  _iTotWin.toFixed(0);
            } 
            
            clearInterval(_iIdUpdateInterval);
            
           
            return;
        }
        
        var fLerpY;
        switch(_szCurEasing){
            case EASE_BACKIN: {
                    fLerpY = s_oTweenController.easeInBack( _iCntFrames, 0 ,1, _iMaxFrames);
                    break;
            }
            case EASE_BACKOUT:{
                    fLerpY = s_oTweenController.easeOutBack( _iCntFrames, 0 ,1, _iMaxFrames);
                    break;
            }
            case EASE_CUBIC_IN:{
                    fLerpY = s_oTweenController.easeInCubic( _iCntFrames, 0 ,1, _iMaxFrames);
                    break;
            }
            case EASE_CUBIC_OUT:{
                    fLerpY = s_oTweenController.easeOutCubic( _iCntFrames, 0 ,1, _iMaxFrames);
                    break;
            }
            case EASE_ELASTIC_OUT:{
                    fLerpY = s_oTweenController.easeOutElastic( _iCntFrames, 0 ,1, _iMaxFrames);
                    break;
            }
            case EASE_LINEAR:{
                    fLerpY = s_oTweenController.easeLinear( _iCntFrames, 0 ,1, _iMaxFrames);
                    break;
            }
            case EASE_QUART_BACKIN:{
                    fLerpY = s_oTweenController.easeBackInQuart( _iCntFrames, 0 ,1, _iMaxFrames);
                    break;
            }
            default:{
                    fLerpY = s_oTweenController.easeLinear( _iCntFrames, 0 ,1, _iMaxFrames);
            }
        }
        
        var iValue = s_oTweenController.tweenValue( _iCurStart, _iTotWin, fLerpY);

        for(var i=0; i<_aRollingNotifyPoint.length; i++){
            if(iValue > _aRollingNotifyPoint[i].step && !_aRollingNotifyPoint[i].flag){
                _aRollingNotifyPoint[i].flag = true;
                if(_aCbCompleted[ON_CONTROLLER_ROLL] !== null){
                    _aCbCompleted[ON_CONTROLLER_ROLL].call(_aCbOwner[ON_CONTROLLER_ROLL],i);
                }
            }
        }
        
        _oTarget.text =  iValue.toFixed(0);
        if(_oTargetStroke !== null){
            _oTargetStroke.text =  iValue.toFixed(0);
        }        
    };
    
    this._init(oTarget,oTargetStroke,iAmountToIncrease,iTime,szEasing);
};