function CHelpPanel(oSprite){
    var _oText;
    var _oTextBack;
    var _oHelpBg;
    var _oGroup;

    this._init = function(oSprite){
        _oHelpBg = createBitmap(oSprite); 

        _oTextBack = new createjs.Text(TEXT_HELP1,"34px "+FONT_GAME, "#000000");
        _oTextBack.textAlign = "center";
        _oTextBack.lineWidth = 500;
        _oTextBack.x = CANVAS_WIDTH/2 + 2;
        _oTextBack.y = 412;
		
	_oText = new createjs.Text(TEXT_HELP1,"34px "+FONT_GAME, "#ffffff");
        _oText.textAlign = "center";
        _oText.lineWidth = 500;
        _oText.x = CANVAS_WIDTH/2;
        _oText.y = 410;

        var oTextBack2 = new createjs.Text(TEXT_HELP2,"40px "+FONT_GAME, "#000000");
        oTextBack2.textAlign = "center";
        oTextBack2.lineWidth = 500;
        oTextBack2.x = CANVAS_WIDTH/2 + 2;
        oTextBack2.y = 739;
		
	var oText2 = new createjs.Text(TEXT_HELP2,"40px "+FONT_GAME, "#ffffff");
        oText2.textAlign = "center";
        oText2.lineWidth = 500;
        oText2.x = CANVAS_WIDTH/2;
        oText2.y = 737;

        _oGroup = new createjs.Container();
        _oGroup.addChild(_oHelpBg,_oTextBack,_oText,oTextBack2,oText2);
        s_oStage.addChild(_oGroup);
        
        var oParent = this;
        _oGroup.on("pressup",function(){oParent._onExitHelp()});
    };

    this.unload = function(){
        s_oStage.removeChild(_oGroup);

        var oParent = this;
        _oGroup.off("pressup",function(){oParent._onExitHelp()});
    };

    this._onExitHelp = function(){
        this.unload();
        s_oGame._onExitHelp();
    };

    this._init(oSprite);

}