var EASE_LINEAR = 0;
var EASE_CUBIC_IN = 1;
var EASE_QUART_BACKIN = 2;
var EASE_BACKIN = 3;
var EASE_SIN_IN = 4;
var EASE_QUAD_IN = 5;
var EASE_CUBIC_OUT = 6;
var EASE_ELASTIC_OUT = 7;
var EASE_BACKOUT = 8;
var EASE_QUINT_OUT = 9;
var EASE_CUBIC_INOUT = 10;


function CTweenController(){
    
    this.tweenValue = function( fStart, fEnd, fLerp ){
        return fStart + fLerp *( fEnd-fStart);     
    };
    
    this.easeLinear = function(t, b, c, d) {
            return c*t/d + b;
    };
    
    this.easeInCubic = function(t, b, c, d) {
	var tc=(t/=d)*t*t;
	return b+c*(tc);
    };


    this.easeBackInQuart =  function(t, b, c, d) {
	var ts=(t/=d)*t;
	var tc=ts*t;
	return b+c*(2*ts*ts + 2*tc + -3*ts);
    };
    
    this.easeInBack = function(t, b, c, d ) {
        return c*(t/=d)*t*((1.70158+1)*t - 1.70158) + b;
    };
    
    this.easeInSine = function (t, b, c, d) {
            return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
    };
    
    this.easeInQuad = function (t, b, c, d){
            return c*(t/=d)*t + b;
    };
    
    this.easeOutCubic = function(t, b, c, d){
        return c*((t=t/d-1)*t*t + 1) + b;
    };
    
    this.easeOutElastic = function(t, b, c, d){
	var s = 0;
        var a;
        var p;
        
        if (t === 0) {
                return b;
        }
        if ((t /= d) === 1) {
                return b + c;  
        }

        p=d*.3;
        a = c; 
        s = p / 4; 

        return (a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b);
    };
    
    this.easeOutBack =  function(t, b, c, d) {
        var s = 1.70158;
        return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
    };
    
    this.easeInOutCubic = function(t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b;
        return c/2*((t-=2)*t*t + 2) + b;
    };
    
    this.easeOutQuint = function (t, b, c, d) {
            return c*((t=t/d-1)*t*t*t*t + 1) + b;
    };
    
}