var SHOT = new Array();

/////////////STAGE 1//////////
SHOT[0] = {startX: -50, startY:400, endX:1400, endY:200, type:SKEET_LINEAR, speed:150};

SHOT[1] = {startX: -500, startY:200, endX:1500, endY:500, type:SKEET_LINEAR, speed:150};

SHOT[2] = {startX: -50, startY:300, endX:1500, endY:350, type:SKEET_LINEAR, speed:150};

SHOT[3] = {startX: 1350, startY:500, endX:-150, endY:200, type:SKEET_LINEAR, speed:150};
SHOT[4] = {startX: 1350, startY:400, endX:-50, endY:300, type:SKEET_PARABOLIC, speed:150};

/////////////STAGE 2//////////
SHOT[5] = {startX: -50, startY:400, endX:1400, endY:200, type:SKEET_LINEAR, speed:150};

SHOT[6] = {startX: -50, startY:200, endX:1300, endY:500, type:SKEET_PARABOLIC, speed:150};
SHOT[7] = {startX: 1350, startY:300, endX:-100, endY:200, type:SKEET_LINEAR, speed:150};

SHOT[8] = {startX: 1350, startY:500, endX:-150, endY:200, type:SKEET_PARABOLIC, speed:150};
SHOT[9] = {startX: -50, startY:400, endX:1300, endY:300, type:SKEET_PARABOLIC, speed:120};

/////////////STAGE 3//////////
SHOT[10] = {startX: 1350, startY:550, endX:-50, endY:550, type:SKEET_PARABOLIC, speed:150};
SHOT[11] = {startX: 700, startY:-50, endX:1000, endY:600, type:SKEET_AWAY, speed:200};

SHOT[12] = {startX: -50, startY:550, endX:1400, endY:500, type:SKEET_LINEAR, speed:120};

SHOT[13] = {startX: 1350, startY:550, endX:-100, endY:500, type:SKEET_LINEAR, speed:120};

SHOT[14] = {startX: 1350, startY:500, endX:-100, endY:550, type:SKEET_LINEAR, speed:120};

/////////////STAGE 4//////////
SHOT[15] = {startX: 1000, startY:-30, endX:600, endY:600, type:SKEET_AWAY, speed:150};
SHOT[16] = {startX: 400, startY:-30, endX:1100, endY:600, type:SKEET_AWAY, speed:150};

SHOT[17] = {startX: 1350, startY:550, endX:-50, endY:200, type:SKEET_PARABOLIC, speed:120};
SHOT[18] = {startX: 1350, startY:200, endX:-50, endY:550, type:SKEET_PARABOLIC, speed:120};

SHOT[19] = {startX: -50, startY:300, endX:1300, endY:300, type:SKEET_PARABOLIC, speed:120};

/////////////STAGE 5//////////
SHOT[20] = {startX: 1000, startY:-30, endX:600, endY:600, type:SKEET_AWAY, speed:120};
SHOT[21] = {startX: 1350, startY:200, endX:-50, endY:300, type:SKEET_PARABOLIC, speed:120};

SHOT[22] = {startX: -150, startY:-30, endX:1300, endY:550, type:SKEET_PARABOLIC, speed:120};
SHOT[23] = {startX: 1350, startY:120, endX:-50, endY:300, type:SKEET_PARABOLIC, speed:120};

SHOT[24] = {startX: -150, startY:550, endX:1300, endY:500, type:SKEET_PARABOLIC, speed:100};


var SHOT_MODE = new Array();
SHOT_MODE[0] = SHOT_SINGLE;
SHOT_MODE[1] = SHOT_SINGLE; 
SHOT_MODE[2] = SHOT_SINGLE; 
SHOT_MODE[3] = SHOT_DOUBLE; 

SHOT_MODE[4] = SHOT_SINGLE; 
SHOT_MODE[5] = SHOT_DOUBLE; 
SHOT_MODE[6] = SHOT_DOUBLE;

SHOT_MODE[7] = SHOT_DOUBLE; 
SHOT_MODE[8] = SHOT_SINGLE; 
SHOT_MODE[9] = SHOT_SINGLE; 
SHOT_MODE[10] = SHOT_SINGLE;

SHOT_MODE[11] = SHOT_DOUBLE; 
SHOT_MODE[12] = SHOT_DOUBLE; 
SHOT_MODE[13] = SHOT_SINGLE; 

SHOT_MODE[14] = SHOT_DOUBLE; 
SHOT_MODE[15] = SHOT_DOUBLE; 
SHOT_MODE[16] = SHOT_SINGLE; 