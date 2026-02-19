var CANVAS_WIDTH = 1920;
var CANVAS_HEIGHT = 1080;

var EDGEBOARD_X = 200;
var EDGEBOARD_Y = 35;

var FPS = 30;
var FPS_TIME      = 1000/FPS;
var DISABLE_SOUND_MOBILE = false;

var SOUNDTRACK_VOLUME_IN_GAME = 1;

var PRIMARY_FONT  = "walibi";
var SECONDARY_FONT = "Arial";

var STATE_LOADING = 0;
var STATE_MENU    = 1;
var STATE_HELP    = 1;
var STATE_GAME    = 3;

var ON_MOUSE_DOWN  = 0;
var ON_MOUSE_UP    = 1;
var ON_MOUSE_OVER  = 2;
var ON_MOUSE_OUT   = 3;
var ON_DRAG_START  = 4;
var ON_DRAG_END    = 5;

var COLORS = new Array();
var MIN_STROKE;
var MAX_STROKE;

var AD_SHOW_COUNTER; 
var ENABLE_PRINT;
var ENABLE_SAVEIMAGE;
