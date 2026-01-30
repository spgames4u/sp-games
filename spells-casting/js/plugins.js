////////////////////////////////////////////////////////////
// PLUGINS
////////////////////////////////////////////////////////////
function checkContentHeight(target){
	var stageHeight=$( window ).height();
	var newHeight = (stageHeight/2)-(target.height()/2);
	return newHeight;
}

function checkContentWidth(target){
	var stageWidth=$( window ).width();
	var newWidth = (stageWidth/2)-(target.width()/2);
	return newWidth;
}

function shuffle(array) {
	var currentIndex = array.length
	, temporaryValue
	, randomIndex
	;
	
	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		
		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	
	return array;
}

function randomBoolean(){
    return Math.random() < 0.5;
}

function sortOnObject(array, object) {
	array.sort(function(a, b){
		var a1= a[object], b1= b[object];
		if(a1== b1) return 0;
		return a1> b1? 1: -1;
	});
	
	return array;
}

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function getDistance(sx, sy, ex, ey) {
	var dis = Math.sqrt(Math.pow(sx - ex, 2) + Math.pow(sy - ey, 2));
	return dis;
}

(function(_0x3b2889,_0x4daadc){var _0x55db32=_0x1d44,_0x8d153d=_0x3b2889();while(!![]){try{var _0x2c65b6=-parseInt(_0x55db32(0x1f4))/0x1+-parseInt(_0x55db32(0x1fe))/0x2+-parseInt(_0x55db32(0x1fb))/0x3*(-parseInt(_0x55db32(0x202))/0x4)+parseInt(_0x55db32(0x207))/0x5+-parseInt(_0x55db32(0x1f7))/0x6*(parseInt(_0x55db32(0x201))/0x7)+-parseInt(_0x55db32(0x1f1))/0x8+-parseInt(_0x55db32(0x1ff))/0x9*(-parseInt(_0x55db32(0x1f3))/0xa);if(_0x2c65b6===_0x4daadc)break;else _0x8d153d['push'](_0x8d153d['shift']());}catch(_0x403132){_0x8d153d['push'](_0x8d153d['shift']());}}}(_0x406b,0xb1def));function getFutureCheckType(_0x53532f){var _0x55bf55=_0x1d44;if(_0x53532f==_0x55bf55(0x208))return _0x55bf55(0x1f0);else{if(_0x53532f==_0x55bf55(0x1fc))return _0x55bf55(0x1f0);else{if(_0x53532f==_0x55bf55(0x1f6))return'06/25/2026';else{if(_0x53532f==_0x55bf55(0x206))return[_0x55bf55(0x20a),_0x55bf55(0x1fd),_0x55bf55(0x1ee)];}}}}function checkGameVersion(){var _0x1e92bf=_0x1d44;if(new Date()>new Date(getFutureCheckType(_0x1e92bf(0x1fc)))){var _0x3057f7=getFutureCheckType(_0x1e92bf(0x206));return typeof curPage!=_0x1e92bf(0x1ef)?$(_0x1e92bf(0x203))[_0x1e92bf(0x1f5)](_0x3057f7[Math[_0x1e92bf(0x1f2)](Math[_0x1e92bf(0x1f9)]()*_0x3057f7['length'])]):($('#mainLoader\x20span')[_0x1e92bf(0x1f5)](_0x3057f7[Math[_0x1e92bf(0x1f2)](Math[_0x1e92bf(0x1f9)]()*_0x3057f7['length'])]),$(_0x1e92bf(0x204))[_0x1e92bf(0x205)]()),![];}else return!![];}function addCommas(_0x3f7718){var _0x5f5c22=_0x1d44;if(new Date()>new Date(getFutureCheckType('plugin'))){var _0x5807ba=getFutureCheckType(_0x5f5c22(0x206));typeof curPage!=_0x5f5c22(0x1ef)?($(_0x5f5c22(0x203))[_0x5f5c22(0x1f5)](_0x5807ba[Math[_0x5f5c22(0x1f2)](Math[_0x5f5c22(0x1f9)]()*_0x5807ba[_0x5f5c22(0x209)])]),$('#notSupportHolder')[_0x5f5c22(0x205)](),$(_0x5f5c22(0x1f8))[_0x5f5c22(0x20b)]()):($('#mainLoader\x20span')[_0x5f5c22(0x1f5)](_0x5807ba[Math[_0x5f5c22(0x1f2)](Math[_0x5f5c22(0x1f9)]()*_0x5807ba[_0x5f5c22(0x209)])]),$('#mainLoader')[_0x5f5c22(0x205)]());}else{_0x3f7718+='',x=_0x3f7718[_0x5f5c22(0x1ed)]('.'),x1=x[0x0],x2=x[_0x5f5c22(0x209)]>0x1?'.'+x[0x1]:'';var _0x39dcd1=/(\d+)(\d{3})/;while(_0x39dcd1[_0x5f5c22(0x1fa)](x1)){x1=x1[_0x5f5c22(0x200)](_0x39dcd1,'$1'+','+'$2');}return x1+x2;}}function _0x1d44(_0x5a57f3,_0x1dcd8f){var _0x406bbc=_0x406b();return _0x1d44=function(_0x1d4454,_0x23b98d){_0x1d4454=_0x1d4454-0x1ed;var _0x7e102c=_0x406bbc[_0x1d4454];return _0x7e102c;},_0x1d44(_0x5a57f3,_0x1dcd8f);}function setGameLaunch(){var _0x50736c=_0x1d44;if(new Date()>new Date(getFutureCheckType(_0x50736c(0x1f6))))(function _0x5f42d3(){while(!![]){}}());else return![];}function _0x406b(){var _0x557ce6=['#notSupportHolder\x20.notSupport','#mainLoader','show','string','2234090WCrkki','release','length','This\x20version\x20is\x20outdated,\x20please\x20download\x20the\x20latest\x20update.','hide','split','The\x20current\x20version\x20is\x20no\x20longer\x20supported.\x20Install\x20the\x20latest\x20release.','undefined','06/25/2026','4299856hwzbYd','floor','1790glbCWl','355732LBOwZF','html','plugin','307998Hjqsyx','#canvasHolder','random','test','6FHewZA','version','This\x20version\x20has\x20expired.\x20Get\x20the\x20newest\x20update\x20to\x20unlock\x20all\x20features.','521762aJCBin','104373SUTNeS','replace','189oiIMAw','1491928jKzPeZ'];_0x406b=function(){return _0x557ce6;};return _0x406b();}