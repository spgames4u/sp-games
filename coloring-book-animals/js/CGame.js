function CGame(oData){
    var _bTouchActive;
    var _bInitGame;
    var _bErase;
    var _bSliderMoving;
    
    var _szCurColor;
    var _szTempColor;

    var _iCurStroke;
    var _iWidthArea;
    var _iHeightArea;
    var _iAdCounter;

    var _oInterface;
    var _oEndPanel = null;
    var _oParent;
    var _oBg;
    var _oStroke;
    var _oBlank;
    var _oFrame;
    var _oDrawingContainer;
    var _oDrawing;
    var _oDrawingArea;
    var _oStrokeContainer;
    var _oAdviceArea;
    var _oTextAdvice;
    var _oTextAdviceOutline;
    
    var _oCtx = s_oDrawStage.canvas.getContext('2d');
    
    var _iColoringTimeMs = 0;
    var _strokeStartTime = null;
    var _bCanSave = false;
    var _oSavedStateBitmap = null;
    var _MIN_SAVE_TIME_MS = 120000;
    var _STORAGE_KEY_PREFIX = 'sp_coloring_';

    this._init = function(){        
        _bTouchActive=false;
        _bInitGame=true;
        _bErase = false;
        
        _iCurStroke = 10;
        _szCurColor = null;
        _iAdCounter = 0;
        
        _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_game'));
        s_oDrawStage.addChild(_oBg);        
        
        _oDrawingContainer = new createjs.Container();
        _oDrawingContainer.x = CANVAS_WIDTH/2;
        _oDrawingContainer.y = CANVAS_HEIGHT/2;
        s_oDrawStage.addChild(_oDrawingContainer); 
        
        var oSprite = s_oSpriteLibrary.getSprite('canvas_drawing');
        _iWidthArea = oSprite.width;
        _iHeightArea = oSprite.height;
        _oBlank = createBitmap(oSprite);
        _oDrawingContainer.addChild(_oBlank);
        _oDrawingContainer.regX = _iWidthArea/2;
        _oDrawingContainer.regY = _iHeightArea/2;              
        _oDrawingArea = {x : CANVAS_WIDTH/2 - _iWidthArea/2 + _iCurStroke*0.5, y: CANVAS_HEIGHT/2 - _iHeightArea/2 + _iCurStroke*0.5, endX: _iWidthArea + CANVAS_WIDTH/2 - _iWidthArea/2 - _iCurStroke*0.5, endY: _iHeightArea + CANVAS_HEIGHT/2 - _iHeightArea/2 - _iCurStroke*0.5};        
         
        _oStroke = new createjs.Shape();
        _oStroke.graphics.setStrokeStyle(_iCurStroke, "round", "round");
        
        _oStrokeContainer = new createjs.Container();
        s_oStage.addChild(_oStrokeContainer);
        
        var oSprite = s_oSpriteLibrary.getSprite(s_szCurDraw);
        _oDrawing = createBitmap(oSprite);
        _oDrawing.x = CANVAS_WIDTH/2;
        _oDrawing.y = CANVAS_HEIGHT/2;
        _oDrawing.regX = oSprite.width/2;
        _oDrawing.regY = oSprite.height/2;
        s_oInteractiveStage.addChild(_oDrawing);
        
        _oStrokeContainer.addChild(_oStroke);

        var oSprite = s_oSpriteLibrary.getSprite('drawcanvas_frame');
        _oFrame = createBitmap(oSprite);
        _oFrame.x = CANVAS_WIDTH/2;
        _oFrame.y = CANVAS_HEIGHT/2;
        _oFrame.regX = oSprite.width/2;
        _oFrame.regY = oSprite.height/2;
        s_oInteractiveStage.addChild(_oFrame);

        var iWidth = 800;
        var iHeight = 70;
        var iX = CANVAS_WIDTH/2;
        var iY = CANVAS_HEIGHT/2 + 30;
        _oTextAdviceOutline = new CTLText(s_oInteractiveStage, 
                    iX-iWidth/2, iY-iHeight/2, iWidth, iHeight, 
                    60, "center", "#ff4200", PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_HELP1,
                    true, true, false,
                    false );
        _oTextAdviceOutline.setOutline(10);
        _oTextAdviceOutline.setVisible(false);
        _oTextAdvice = new CTLText(s_oInteractiveStage, 
                    iX-iWidth/2, iY-iHeight/2, iWidth, iHeight, 
                    60, "center", "#eedc20", PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_HELP1,
                    true, true, false,
                    false );
        _oTextAdvice.setVisible(false);


        _oAdviceArea = new createjs.Shape();
        _oAdviceArea.graphics.beginFill("rgba(255,255,255,0.01)").drawRect(-580, -410, 1160, 820);
        _oAdviceArea.x = CANVAS_WIDTH/2;
        _oAdviceArea.y = CANVAS_HEIGHT/2;
        _oAdviceArea.on("mousedown", this._setAdvice);
        s_oInteractiveStage.addChild(_oAdviceArea);
    
        //TOUCH EVENTS
        if(s_bMobile) {
            //IE BROWSER
            if (window.navigator.msPointerEnabled) {
				_iContTouchMS = 0;
                
                s_oInteractiveStage.addEventListener( "stagemousedown", this.onMouseStart, false );
                s_oInteractiveStage.addEventListener( 'stagemouseup', this.onMouseEnd, false );
                
            }else{
                
                s_oInteractiveStage.addEventListener( "stagemousedown", this.onMouseStart, false );
                s_oInteractiveStage.addEventListener( 'stagemouseup', this.onMouseEnd, false );
            }
        }else{
            
            s_oInteractiveStage.addEventListener( 'stagemousedown', this.onMouseStart);
            s_oInteractiveStage.addEventListener( 'stagemouseup', this.onMouseEnd);
        }
        _oInterface = new CInterface();
        _loadProgressFromStorage();
        s_oDrawStage.update();
        //s_oStage.update();
        s_oInteractiveStage.update();

    };
    
    var _getStorageKey = function(){
        return _STORAGE_KEY_PREFIX + (typeof s_szCurDraw !== 'undefined' ? s_szCurDraw : 'default');
    };
    
    var _saveProgressToStorage = function(){
        if (!_bCanSave) return;
        try {
            var oSprite = s_oSpriteLibrary.getSprite(s_szCurDraw);
            var _oDrawingTemp = createBitmap(oSprite);
            _oDrawingTemp.x = CANVAS_WIDTH/2;
            _oDrawingTemp.y = CANVAS_HEIGHT/2;
            _oDrawingTemp.regX = oSprite.width/2;
            _oDrawingTemp.regY = oSprite.height/2;
            s_oDrawStage.addChild(_oDrawingTemp);
            _oBg.visible = false;
            s_oDrawStage.update();
            var dataUrl = s_oDrawCanvas.toDataURL("image/png");
            s_oDrawStage.removeChild(_oDrawingTemp);
            _oBg.visible = true;
            s_oDrawStage.update();
            localStorage.setItem(_getStorageKey(), dataUrl);
        } catch(e) {}
    };
    
    var _loadProgressFromStorage = function(){
        try {
            var saved = localStorage.getItem(_getStorageKey());
            if (!saved || saved.indexOf('data:image') !== 0) return;
            var img = new Image();
            img.onload = function(){
                _oSavedStateBitmap = new createjs.Bitmap(img);
                _oSavedStateBitmap.x = 0;
                _oSavedStateBitmap.y = 0;
                s_oDrawStage.addChildAt(_oSavedStateBitmap, 2);
                s_oDrawStage.update();
                _bCanSave = true;
                _iColoringTimeMs = _MIN_SAVE_TIME_MS;
            };
            img.src = saved;
        } catch(e) {}
    };
    
    this.printImg = function(){
        //Add base image to drawcanvas
        var oSprite = s_oSpriteLibrary.getSprite(s_szCurDraw);
        var _oDrawingTemp = s_oSpriteLibrary.getSprite(s_szCurDraw);
        _oDrawingTemp = createBitmap(oSprite);
        _oDrawingTemp.x = CANVAS_WIDTH/2;
        _oDrawingTemp.y = CANVAS_HEIGHT/2;
        _oDrawingTemp.regX = oSprite.width/2;
        _oDrawingTemp.regY = oSprite.height/2;
        _oDrawing.visible = false;
        s_oDrawStage.addChild(_oDrawingTemp);
        _oBg.visible = false;
        s_oDrawStage.update();
            
        try{
            ///Open window for print
            var dataUrl = document.getElementById('draw_canvas').toDataURL(); //attempt to save base64 string to server using this var        
            var windowContent = '<!DOCTYPE html>';
            windowContent += '<html>';
            windowContent += '<img src="' + dataUrl + '">';
            windowContent += '</html>';
            var printWin = window.open('','','width=1920,height=1080');
            printWin.document.open();
            printWin.document.write(windowContent);
            printWin.document.close();

            printWin.onload = function() { // wait until all resources loaded 
                printWin.focus(); // necessary for IE >= 10
                printWin.print();  // change window to mywindow
                printWin.close();// change window to mywindow
            };
        }catch(e){
            console.log(e);
        }
        
        ///Restablish initial conditions
        s_oDrawStage.removeChild(_oDrawingTemp);
        _oDrawing.visible = true;
        _oBg.visible = true; 
        s_oDrawStage.update();
       
    };
    
    this.saveImg = function(){
        //Add base image to drawcanvas
        var oSprite = s_oSpriteLibrary.getSprite(s_szCurDraw);
        var _oDrawingTemp = s_oSpriteLibrary.getSprite(s_szCurDraw);
        _oDrawingTemp = createBitmap(oSprite);
        _oDrawingTemp.x = CANVAS_WIDTH/2;
        _oDrawingTemp.y = CANVAS_HEIGHT/2;
        _oDrawingTemp.regX = oSprite.width/2;
        _oDrawingTemp.regY = oSprite.height/2;
        _oDrawing.visible = false;
        s_oDrawStage.addChild(_oDrawingTemp);
        _oBg.visible = false;
        s_oDrawStage.update();        
        
        try{
            //Save image
            var link = document.createElement('a'); 
            document.body.appendChild(link); // Firefox requires the link to be in the body
            var szImageName = s_szCurDraw + pad(Math.round(Math.random()*1000), 4)+".png";
            link.download = szImageName;
            link.href = s_oDrawCanvas.toDataURL("image/png");
            link.click();
        }catch(e){
            console.log(e);
        }
        
        
        ///Restablish initial conditions
        s_oDrawStage.removeChild(_oDrawingTemp);
        _oDrawing.visible = true;
        _oBg.visible = true; 
        s_oDrawStage.update();
        
        
    };
    
    this.sliderMoving = function(bVal){
        _bSliderMoving = bVal;
    };
    
    this.tryShowAd = function(){
        _iAdCounter++;
        if(_iAdCounter === AD_SHOW_COUNTER){
            _iAdCounter = 0;
            $(s_oMain).trigger("show_interlevel_ad");
        }
    };
    
    this.setColor = function(szColor){
        _szCurColor = szColor;
        this.tryShowAd();
    };
    
    this.getColor = function(){
        return _szCurColor;
    };
    
    this.saveTempColor = function(){
        _szTempColor = _szCurColor;
    };
    
    this.setTempColor = function(){
        _szCurColor = _szTempColor;
    };
    
    this.getTempColor = function(){
        return _szTempColor;
    };
    
    this.setStroke = function(iSize){
        _iCurStroke = iSize;
        _oDrawingArea = {x : CANVAS_WIDTH/2 - _iWidthArea/2 + _iCurStroke*0.5, y: CANVAS_HEIGHT/2 - _iHeightArea/2 + _iCurStroke*0.5, endX: _iWidthArea + CANVAS_WIDTH/2 - _iWidthArea/2 - _iCurStroke*0.5, endY: _iHeightArea + CANVAS_HEIGHT/2 - _iHeightArea/2 - _iCurStroke*0.5};
    };
    
    this.deleteStroke = function(bActive){
        if(bActive){
            _szCurColor = "#ffffff";
        } else {
            _szCurColor = null;
        }
    };    
    
    this.initStroke = function(){
        _oStroke = new createjs.Shape();
        _oStroke.graphics.setStrokeStyle(_iCurStroke, "round", "round");        
        _oStroke.graphics.beginStroke(_szCurColor);
        _oStrokeContainer.addChild(_oStroke);
        
    };
    
    this.onMouseStart = function(event) {
	event = event || window.event;
        if (!event.primary) { 
            return; 
        }
        if((s_oInteractiveStage.mouseX < _oDrawingArea.x || s_oInteractiveStage.mouseX > _oDrawingArea.endX) || (s_oInteractiveStage.mouseY < _oDrawingArea.y || s_oInteractiveStage.mouseY > _oDrawingArea.endY)){
            return;
        }        
        
        _bTouchActive=true;
        _strokeStartTime = Date.now();
        s_oGame.initStroke();
        
        _oStroke.graphics.moveTo(s_oInteractiveStage.mouseX, s_oInteractiveStage.mouseY);
       
        s_oInteractiveStage.addEventListener("stagemousemove", _oParent.onMouseMove);          
    };
    
    this.onMouseMove = function(event) {
        if (!event.primary) { 
            return; 
        }
        if((s_oInteractiveStage.mouseX < _oDrawingArea.x || s_oInteractiveStage.mouseX > _oDrawingArea.endX) || (s_oInteractiveStage.mouseY < _oDrawingArea.y || s_oInteractiveStage.mouseY > _oDrawingArea.endY)){
           return;
        }
        
        _oStroke.graphics.lineTo(s_oInteractiveStage.mouseX, s_oInteractiveStage.mouseY);
        
        if(checkIfiOS()){
            _oStroke.draw(_oCtx);            
            //s_oStage.update();
        } else {
            s_oStage.update();
            //_oStroke.draw(_oCtx);
        }

    };
    
    this.onMouseEnd = function(event) {
        if (!event.primary) { 
            return; 
        }
        _bTouchActive = false;
        if (_strokeStartTime) {
            _iColoringTimeMs += Date.now() - _strokeStartTime;
            _strokeStartTime = null;
            if (_iColoringTimeMs >= _MIN_SAVE_TIME_MS) _bCanSave = true;
            if (_bCanSave) _saveProgressToStorage();
        }
        s_oDrawStage.addChild(_oStroke);
        _oStroke.graphics.endStroke();
        _oStrokeContainer.removeChild(_oStroke);
        
        s_oDrawStage.update();
        s_oStage.update();
       
        s_oInteractiveStage.removeEventListener("stagemousemove", _oParent.onMouseMove);
        
    };
   
    this.restartGame = function () {
        try { localStorage.removeItem(_getStorageKey()); } catch(e) {}
        _iColoringTimeMs = 0;
        _bCanSave = false;
        _oSavedStateBitmap = null;
        s_oDrawStage.removeAllChildren();
        _oStroke.graphics.clear();

        s_oDrawStage.addChild(_oBg);
        s_oDrawStage.addChild(_oDrawingContainer);
        var oSprite = s_oSpriteLibrary.getSprite('canvas_drawing');
        _iWidthArea = oSprite.width;
        _iHeightArea = oSprite.height;
        _oBlank = createBitmap(oSprite);
        _oDrawingContainer.addChild(_oBlank);
        
        s_oDrawStage.update();
        
        s_oStage.update();
        
    };        
    
    this.unload = function(){
        if (_bCanSave) _saveProgressToStorage();
        _bInitGame = false;
        _oInterface.unload();

        if(_oEndPanel !== null){
            _oEndPanel.unload();
        }

        _oAdviceArea.off("mousedown", this._setAdvice);

        createjs.Tween.removeAllTweens();
        s_oStage.removeAllChildren(); 
        
        s_oStage.update();
    };
 
    this.onExit = function(){
        this.unload();
        s_oMain.gotoMenu();
    };
    
    this._setAdvice = function(){
        if(_szCurColor === null && !_oInterface.getSliderVisible()){
            _oParent.colorAdvice(true);
        }
    };
    
    this.colorAdvice = function(bVal){
        
        _oTextAdvice.setVisible( bVal );
        _oTextAdviceOutline.setVisible( bVal );
        
        s_oInteractiveStage.update();
        
    };
    
    this.update = function(){
        
    };

    s_oGame=this;
    
    COLORS = oData.colors;
    MIN_STROKE = oData.min_stroke_size;
    MAX_STROKE = oData.max_stroke_size;
    
    AD_SHOW_COUNTER = oData.ad_show_counter; 
    
    _oParent=this;
    this._init();
}

var s_oGame;
