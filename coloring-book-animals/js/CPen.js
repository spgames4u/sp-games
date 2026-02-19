function CPen(iX, iY, szColor, iIndex, oParentContainer){
   
    var _iOffsetActive;
    var _iIndex;
    
    var _oPen;
    var _oParent;
    var _oParentContainer;
    
    this._init = function(iX, iY, szColor, iIndex, oParentContainer){
        
        _iOffsetActive = 50;
        _iIndex = iIndex;
        
        _oParentContainer = oParentContainer;
        
        if(szColor === "eraser"){
            var oSprite = s_oSpriteLibrary.getSprite('eraser');
            _oPen= createBitmap(oSprite);
            _oPen.x = iX;
            _oPen.y = iY; 
            
            _oPen.cache(0,0,100,200);
            _oPen.on("mousedown", this._setEraser);
            
        } else {
            var oSprite = s_oSpriteLibrary.getSprite('pen');
            _oPen= createBitmap(oSprite);
            _oPen.x = iX;
            _oPen.y = iY;      


            // Apply a filter
            var oRed = hexToRgb(szColor).r;
            var oGreen = hexToRgb(szColor).g;
            var oBlue = hexToRgb(szColor).b;

            var oMultRed = oRed/255;
            var oMultGreen = oGreen/255;
            var oMultBlue = oBlue/255;

            try{
                var oFilter = new createjs.ColorFilter(oMultRed,oMultGreen,oMultBlue,1);
                _oPen.filters = [oFilter];
                _oPen.cache(0,0,50,200);
            }catch(e){
                console.log(e);
            }
            
           
            
            _oPen.on("mousedown", this._setColor);
        }       
        _oPen.cursor = "pointer";
        
        
        // Add to stage                    
        _oParentContainer.addChild(_oPen);


        
    };
   
    this.unload = function(){
        _oPen.off("mousedown", this._setColor);
        _oParentContainer.removeChild(_oPen);
    };
    
    this._setColor = function(){
        playSound("click", 1, false);
        s_oInterface.setActivePen(szColor, _iIndex);
        _oParent.setActive(true);
    };
    
    this._setEraser = function(){
        playSound("click", 1, false);
        s_oInterface.setActivePen("#FFFFFF", _iIndex);
        _oParent.setActive(true);
    };
    
    this.setActive = function(bActive){
        if(bActive){
            _oPen.y = iY - _iOffsetActive;
        }else {
            _oPen.y = iY;
        }    
        try{
            _oPen.updateCache();
        }catch(e){
            console.log(e);
        }
        

        s_oInterface.setCircleImage(s_oInterface.getCircleSize(),s_oGame.getColor());
        
        s_oInteractiveStage.update();
    };
    
    
    _oParent = this;
    this._init(iX, iY, szColor, iIndex, oParentContainer);
    
};