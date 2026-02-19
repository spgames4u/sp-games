function CSliderBox(iXPos,iYPos,oSprite,oParentContainer){
        
    var _bSliderVisible;
    var _bActive = false;
    
    var _oBoxContainer;
    var _oButton;
    var _oShape;
    
    this._init =function(iXPos,iYPos,oSprite,oParentContainer){
        
        _bSliderVisible = false;
        
        _oBoxContainer = new createjs.Container();
        _oBoxContainer.x = iXPos;
        _oBoxContainer.y = iYPos; 
        _oBoxContainer.cursor = "pointer";
        oParentContainer.addChild(_oBoxContainer);
        
        var oData = {   
                        images: [oSprite], 
                        // width, height & registration point of each sprite
                        frames: {width: oSprite.width/2, height: oSprite.height, regX: (oSprite.width/2)/2, regY: oSprite.height/2}, 
                        animations: {state_true:[0],state_false:[1]}
                   };
                   
        var oSpriteSheet = new createjs.SpriteSheet(oData);
        _oButton = createSprite(oSpriteSheet, "state_"+_bActive,(oSprite.width/2)/2,oSprite.height/2,oSprite.width/2,oSprite.height);
       
        _oShape = new createjs.Shape();
        _oShape.graphics.beginFill("white").drawCircle(0,0,s_oInterface.getStroke()*0.5);
       
        _oBoxContainer.addChild(_oButton, _oShape);        
        
        this._initListener();
    };
    
    this.unload = function(){
       _oBoxContainer.off("mousedown", this.buttonDown);
       _oBoxContainer.off("pressup" , this.buttonRelease); 
       
       oParentContainer.removeChild(_oBoxContainer);
    };
    
    this.setVisible = function(bVisible){
        _oBoxContainer.visible = bVisible;
    };
    
    this.setSliderVisible = function(bVisible){
        _bSliderVisible = bVisible;
    };
    
    this.setCircle = function(iSize, szColor){
        _oShape.graphics.clear();
        if(szColor === null){
            szColor = "#FFFFFF";
        }
        _oShape.graphics.beginFill(szColor).drawCircle(0,0,iSize*0.5);        
    };
    
    this._initListener = function(){
       _oBoxContainer.on("mousedown", this.buttonDown);
       _oBoxContainer.on("pressup" , this.buttonRelease);      
    };
    
    this.buttonRelease = function(){
        _oBoxContainer.scaleX = 1;
        _oBoxContainer.scaleY = 1;
        _bSliderVisible = !_bSliderVisible;
        s_oInterface.setSliderVisible(_bSliderVisible);
        
        if(!_bSliderVisible){
            s_oGame.setTempColor();
        }
        _bActive = !_bActive;
        _oButton.gotoAndStop("state_"+_bActive);
        
        s_oInteractiveStage.update();
    };
    
    this.buttonDown = function(){
        _oBoxContainer.scaleX = 0.9;
        _oBoxContainer.scaleY = 0.9;
        if(!_bSliderVisible){
            s_oGame.saveTempColor();
        }
        playSound("click", 1, false);
        s_oInterface.disableStroke();

        s_oInteractiveStage.update();
    };
    
    this.setPosition = function(iXPos,iYPos){
         _oBoxContainer.x = iXPos;
         _oBoxContainer.y = iYPos;
    };
    
    this.setX = function(iXPos){
         _oBoxContainer.x = iXPos;
    };
    
    this.setY = function(iYPos){
         _oBoxContainer.y = iYPos;
    };
    
    this.getButtonImage = function(){
        return _oBoxContainer;
    };
    
    
    this.getX = function(){
        return _oBoxContainer.x;
    };
    
    this.getY = function(){
        return _oBoxContainer.y;
    };

    this.setActive = function(bVal){
        _bActive = bVal;
        if(!_bActive){
            _oButton.gotoAndStop("state_"+_bActive);
        }
    };

    this._init(iXPos,iYPos,oSprite,oParentContainer);
    
    return this;
}