function CMain(oData) {
    var _bUpdate;
    var _iCurResource = 0;
    var RESOURCE_TO_LOAD = 0;
    var _iState = STATE_LOADING;
    var _oData;

    var _oPreloader;
    var _oMenu;
    var _oGame;
    var _oTeamChoose;

    var _aTeamLoadedBowler = new Array();

    this.initContainer = function () {
        s_oCanvas = document.getElementById("canvas");
        s_oStage = new createjs.Stage(s_oCanvas);
        createjs.Touch.enable(s_oStage);

        s_bMobile = jQuery.browser.mobile;
        if (s_bMobile === false) {
            s_oStage.enableMouseOver(20);
            $('body').on('contextmenu', '#canvas', function (e) {
                return false;
            });
        }

        s_iPrevTime = new Date().getTime();

        createjs.Ticker.addEventListener("tick", this._update);
        createjs.Ticker.framerate = 30;

        if (navigator.userAgent.match(/Windows Phone/i)) {
            DISABLE_SOUND_MOBILE = true;
        }

        s_oSpriteLibrary = new CSpriteLibrary();

        this.setLoadedArray();

        //ADD PRELOADER
        _oPreloader = new CPreloader();
    };

    this.preloaderReady = function () {
        this._loadImages();
        
        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
            this._initSounds();
        }

        
        _bUpdate = true;
    };

    this.soundLoaded = function (evt) {
        _iCurResource++;
        var iPerc = Math.floor(_iCurResource / RESOURCE_TO_LOAD * 100);
        _oPreloader.refreshLoader(iPerc);

    };
    
    this._initSounds = function(){
    
        var aSoundsInfo = new Array();
        aSoundsInfo.push({path: './sounds/',filename:'buzzer',loop:false,volume:1, ingamename: 'buzzer'});
        aSoundsInfo.push({path: './sounds/',filename:'click',loop:false,volume:1, ingamename: 'click'});
        aSoundsInfo.push({path: './sounds/',filename:'drop_bounce_grass',loop:false,volume:1, ingamename: 'drop_bounce_grass'});
        aSoundsInfo.push({path: './sounds/',filename:'hit_ball',loop:false,volume:1, ingamename: 'hit_ball'});
        aSoundsInfo.push({path: './sounds/',filename:'crowd_cheering',loop:false,volume:1, ingamename: 'crowd_cheering'});
        aSoundsInfo.push({path: './sounds/',filename:'applauses',loop:false,volume:1, ingamename: 'applauses'});
        aSoundsInfo.push({path: './sounds/',filename:'crowd_ohhh',loop:false,volume:1, ingamename: 'crowd_ohhh'});
        aSoundsInfo.push({path: './sounds/',filename:'kick',loop:false,volume:1, ingamename: 'kick'});
        aSoundsInfo.push({path: './sounds/',filename:'soundtrack',loop:true,volume:1, ingamename: 'soundtrack'});
        
        RESOURCE_TO_LOAD += aSoundsInfo.length;

        s_aSounds = new Array();
        for(var i=0; i<aSoundsInfo.length; i++){
            s_aSounds[aSoundsInfo[i].ingamename] = new Howl({ 
                                                            src: [aSoundsInfo[i].path+aSoundsInfo[i].filename+'.mp3'],
                                                            autoplay: false,
                                                            preload: true,
                                                            loop: aSoundsInfo[i].loop, 
                                                            volume: aSoundsInfo[i].volume,
                                                            onload: s_oMain.soundLoaded
                                                        });
        }
        
    };  

    this._loadImages = function () {
        s_oSpriteLibrary.init(this._onImagesLoaded, this._onAllImagesLoaded, this);
        
        s_oSpriteLibrary.addSprite("bg_menu", "./sprites/bg_menu.jpg");
        s_oSpriteLibrary.addSprite("but_play", "./sprites/but_play.png");
        s_oSpriteLibrary.addSprite("msg_box", "./sprites/msg_box.png");

        s_oSpriteLibrary.addSprite("but_exit", "./sprites/but_exit.png");
        s_oSpriteLibrary.addSprite("logo_menu", "./sprites/logo_menu.png");

        s_oSpriteLibrary.addSprite("audio_icon", "./sprites/audio_icon.png");
        s_oSpriteLibrary.addSprite("preloader_anim", "./sprites/preloader_anim.png");

        s_oSpriteLibrary.addSprite("score_panel", "./sprites/score_panel.png");
        s_oSpriteLibrary.addSprite("ball", "./sprites/ball.png");

        s_oSpriteLibrary.addSprite("1", "./sprites/1.png");
        s_oSpriteLibrary.addSprite("2", "./sprites/2.png");
        s_oSpriteLibrary.addSprite("3", "./sprites/3.png");
        s_oSpriteLibrary.addSprite("but_credits", "./sprites/but_credits.png");
        s_oSpriteLibrary.addSprite("logo_credits", "./sprites/logo_credits.png");

        s_oSpriteLibrary.addSprite("bg_select_team", "./sprites/bg_select_team.jpg");
        s_oSpriteLibrary.addSprite("bg_select_mode", "./sprites/bg_select_mode.jpg");
        s_oSpriteLibrary.addSprite("flag_selection", "./sprites/flag_selection.png");
        s_oSpriteLibrary.addSprite("but_continue", "./sprites/but_continue.png");

        s_oSpriteLibrary.addSprite("but_pause", "./sprites/but_pause.png");
        s_oSpriteLibrary.addSprite("but_yes", "./sprites/but_yes.png");
        s_oSpriteLibrary.addSprite("but_no", "./sprites/but_no.png");

        s_oSpriteLibrary.addSprite("bg_text", "./sprites/bg_text.png");
        s_oSpriteLibrary.addSprite("bowler_mode", "./sprites/bowler_mode.png");

        s_oSpriteLibrary.addSprite("bg_game_bowler", "./sprites/bg_game_bowler.jpg");
        s_oSpriteLibrary.addSprite("ball_game", "./sprites/ball_game.png");
        s_oSpriteLibrary.addSprite("ball_shadow", "./sprites/ball_shadow.png");
        s_oSpriteLibrary.addSprite("but_home", "./sprites/but_home.png");
        s_oSpriteLibrary.addSprite("but_restart", "./sprites/but_restart.png");

        s_oSpriteLibrary.addSprite("bg_help", "./sprites/bg_help.png");
        s_oSpriteLibrary.addSprite("help_mouse", "./sprites/help_mouse.png");
        s_oSpriteLibrary.addSprite("help_touch", "./sprites/help_touch.png");
        s_oSpriteLibrary.addSprite("but_fullscreen", "./sprites/but_fullscreen.png");

        for (var j = 0; j < TOT_TEAMS; j++) {
            s_oSpriteLibrary.addSprite("glove_" + j, "./sprites/glove_" + j + ".png");
            s_oSpriteLibrary.addSprite("flag_" + j, "./sprites/flag_" + j + ".png");
        }
        RESOURCE_TO_LOAD += s_oSpriteLibrary.getNumSprites();
        s_oSpriteLibrary.loadSprites();
    };

    this._onImagesLoaded = function () {
        _iCurResource++;
        var iPerc = Math.floor(_iCurResource / RESOURCE_TO_LOAD * 100);
        _oPreloader.refreshLoader(iPerc);

    };

    this._loadChoosedTeam = function (iPlayerTeam, iOpponentTeam) {
        s_iPlayerTeam = iPlayerTeam;
        s_iOpponentTeam = iOpponentTeam;
        _iCurResource = 0;
        RESOURCE_TO_LOAD = 0;

        if (_aTeamLoadedBowler[iOpponentTeam]) {
            this.gotoGame(s_iPlayerTeam, s_iOpponentTeam);
            return;
        }

        s_oSpriteLibrary.init(this._onTeamsLoaded, this._onAllImagesLoaded, this);

        for (var i = 0; i < NUM_SPRITE_BATTER_BOWLER_MODE; i++) {
            if (_aTeamLoadedBowler[iOpponentTeam] === false) {
                s_oSpriteLibrary.addSprite("batter_" + iOpponentTeam + "_" + i, "./sprites/batter_" + iOpponentTeam + "/batter_" + iOpponentTeam + "_" + i + ".png");
            }
        }
        RESOURCE_TO_LOAD += s_oSpriteLibrary.getNumSprites();
        s_oSpriteLibrary.loadSprites();
    };

    this._onTeamsLoaded = function () {
        _iCurResource++;
        if (_iCurResource === RESOURCE_TO_LOAD) {
            this.gotoGame(s_iPlayerTeam, s_iOpponentTeam);
        }
    };

    this._onAllImagesLoaded = function () {

    };

    this._onRemovePreloader = function(){
        _oPreloader.unload();
        
        s_oSoundTrack = playSound("soundtrack", 1, true);
        
        s_oMain.gotoMenu();
    };

    this.setLoadedArray = function () {
        for (var i = 0; i < TOT_TEAMS; i++) {
            _aTeamLoadedBowler[i] = false;
        }
    };

    this.gotoMenu = function () {
        _oMenu = new CMenu();
        _iState = STATE_MENU;
    };

    this.gotoGame = function (iPlayerTeam, iOpponentTeam) {
        _oTeamChoose.unload();

        _aTeamLoadedBowler[s_iOpponentTeam] = true;
        _oGame = new CGame(_oData, iPlayerTeam, iOpponentTeam);

        _iState = STATE_GAME;
    };

    this.gotoTeamChoose = function () {
        _oTeamChoose = new CTeamChoose();
        _iState = STATE_MENU;
    };

    this.stopUpdate = function(){
        _bUpdate = false;
        createjs.Ticker.paused = true;
        $("#block_game").css("display","block");
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            Howler.mute(true);
        }
        
    };

    this.startUpdate = function(){
        s_iPrevTime = new Date().getTime();
        _bUpdate = true;
        createjs.Ticker.paused = false;
        $("#block_game").css("display","none");
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            if(s_bAudioActive){
                Howler.mute(false);
            }
        }
        
    };

    this._update = function (event) {
        if (_bUpdate === false) {
            return;
        }
        var iCurTime = new Date().getTime();
        s_iTimeElaps = iCurTime - s_iPrevTime;
        s_iCntTime += s_iTimeElaps;
        s_iCntFps++;
        s_iPrevTime = iCurTime;

        if (s_iCntTime >= 1000) {
            s_iCurFps = s_iCntFps;
            s_iCntTime -= 1000;
            s_iCntFps = 0;
        }

        if (_iState === STATE_GAME) {
            _oGame.update();
        }

        s_oStage.update(event);
    };

    s_oMain = this;

    _oData = oData;
    ENABLE_FULLSCREEN = oData.fullscreen;
    ENABLE_CHECK_ORIENTATION = oData.check_orientation;
    
    this.initContainer();
}
var s_bMobile;
var s_bAudioActive = true;
var s_bFullscreen = false;
var s_iCntTime = 0;
var s_iTimeElaps = 0;
var s_iPrevTime = 0;
var s_iCntFps = 0;
var s_iCurFps = 0;
var s_iPlayerTeam;
var s_iOpponentTeam;
var s_iAdsLevel = 1;

var s_oStage;
var s_oMain;
var s_oBall;
var s_oSpriteLibrary;
var s_oSoundTrack = null;

var s_oCanvas;
var s_iCanvasResizeHeight;
var s_iCanvasResizeWidth;
var s_iCanvasOffsetHeight;
var s_iCanvasOffsetWidth;
var s_aSounds;