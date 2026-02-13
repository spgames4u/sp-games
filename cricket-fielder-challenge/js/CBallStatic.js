function CBallStatic(oParentContainerBall) {

    var _oParentContainer = oParentContainerBall;
    var _oBall;


    this._init = function () {
        var oSpriteBall = s_oSpriteLibrary.getSprite("ball");
        _oBall = createBitmap(oSpriteBall);
        _oBall.regX = oSpriteBall.width * 0.5;
        _oBall.regY = oSpriteBall.height * 0.5;

        _oParentContainer.addChild(_oBall);
    };

    this.setPosition = function (iX, iY) {
        _oBall.x = iX;
        _oBall.y = iY;
    };

    this._init();

    return this;

}