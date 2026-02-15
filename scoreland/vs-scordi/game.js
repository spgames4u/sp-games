(function(){
'use strict';

var lang='ar', sndOn=true, ac=null, lastSnd=0;
var originalAnswer='', turn='player', wait=true;
var myWords=[], scordiWords=[], myLetters=[], scordiLetters=[], field=[];
var scordiDone=0;
var myCompletedWords=[];
var selWordIdx=-1, pickedLetters=[];
var playerDrewThisTurn=false;
var playerPowerCards={seize:0,drop:0,draw3:0};
var scordiPowerCards={seize:0,drop:0,draw3:0};
var seizeMode=false;
var dropMode=false;
var dropPicked=[];
var POWER_CHANCE=0.2;
var wordsPerPlayer=3;
var T={
    ar:{load:'جاري التحضير للمواجهة...',next:'جاري الانتقال...',yourTurn:'دورك',scordiTurn:'دور سكوردي',scordi:'سكوردي',scordiName:'سكوردي',playerName:'أنت',thinks:'يفكر...',hint:'اختر كلمة ثم اضغط على 3 حروف لتكوينها',legend:'\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8 استيلاء \uD83D\uDCA5 إسقاط \uD83C\uDF00 سحب3 \uD83D\uDCE5 الميدان',fieldLabel:'الميدان',win:'أحسنت! فزت!',lose:'خسارة! سكوردي فاز!',scordiComplete:'سكوردي أكمل:',scordiDraw:'سكوردي سحب حرف',yourTurnToast:'دورك!',seizeTitle:'استيلاء على حرف',dropTitle:'إسقاط حرفين',draw3Title:'سحب 3 حروف',fieldTitle:'سحب من الميدان',soundTitle:'الصوت',gotSeize:'حصلت على ورقة استيلاء!',gotDrop:'حصلت على ورقة إسقاط حرفين!',gotDraw3:'حصلت على ورقة سحب 3 حروف!',scordiGotSeize:'سكوردي حصل على ورقة استيلاء!',scordiGotDrop:'سكوردي حصل على ورقة إسقاط!',scordiGotDraw3:'سكوردي حصل على ورقة سحب 3!',seizeHint:'اختر حرفاً من حروف سكوردي لاستيلاء عليه',seizedByYou:'لقد استوليت على حرف ',scordiSeized:'سكوردي استولى على حرف ',cancelSeize:'إلغاء',dropHint:'اختر حرفين من حروف سكوردي لإسقاطهما',droppedByYou:'لقد أسقطت حرف ',scordiDropped:'سكوردي أسقط حرف ',and:' و '},
    en:{load:'Preparing for battle...',next:'Next question...',yourTurn:'Your turn',scordiTurn:'Scordi\'s turn',scordi:'Scordi',scordiName:'Scordi',playerName:'You',thinks:'Thinking...',hint:'Pick a word then tap 3 letters to form it',legend:'\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8 Seize \uD83D\uDCA5 Drop \uD83C\uDF00 Draw3 \uD83D\uDCE5 Field',fieldLabel:'Field',win:'You won!',lose:'Scordi won!',scordiComplete:'Scordi completed:',scordiDraw:'Scordi drew a letter',yourTurnToast:'Your turn!',seizeTitle:'Seize a letter',dropTitle:'Drop two letters',draw3Title:'Draw 3 letters',fieldTitle:'Draw from field',soundTitle:'Sound',gotSeize:'Got Seize card!',gotDrop:'Got Drop card!',gotDraw3:'Got Draw 3 card!',scordiGotSeize:'Scordi got Seize card!',scordiGotDrop:'Scordi got Drop card!',scordiGotDraw3:'Scordi got Draw 3 card!',seizeHint:'Choose a letter from Scordi to seize',seizedByYou:'You seized the letter ',scordiSeized:'Scordi seized the letter ',cancelSeize:'Cancel',dropHint:'Choose 2 letters from Scordi to drop',droppedByYou:'You dropped letters ',scordiDropped:'Scordi dropped letters ',and:' and '}
};

var AR_LETTERS='ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
var COMMON_LETTERS='االنمروهيلكبتسعف';
var EN_LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var EN_COMMON_LETTERS='ETAOINSRHLCDUPMFGYBWVKXJQZ';

var $=function(id){return document.getElementById(id)};
var S0=$('S0'),S1=$('S1'),S2=$('S2');
var qT=$('qTitle'),turnBadge=$('turnBadge'),sBtn=$('sndBtn');
var zoneScordi=$('zoneScordi'),zonePlayer=$('zonePlayer');
var scordiWordsEl=$('scordiWords'),scordiSlotsEl=$('scordiSlots');
var playerWordsEl=$('playerWords'),playerSlotsEl=$('playerSlots');
var fieldBtn=$('fieldBtn'),fieldCount=$('fieldCount');
var scordiScore=$('scordiScore'),playerScore=$('playerScore');
var scordiStatus=$('scordiStatus');
var hintTxt=$('hintTxt'),iconsLegend=$('iconsLegend');
var rI=$('resIcon'),rT=$('resTitle'),rC=$('resCoins'),rE=$('resAmt'),rN=$('resNext');
var toast=$('toast'),confettiCanvas=$('confettiCanvas');
var powerCardsEl=$('playerPowerCards');
var scordiPowerCardsEl=$('scordiPowerCards');

function t(k){return (T[lang]||T.ar)[k]||k}

function renderPowerCards(){
    if(!powerCardsEl)return;
    powerCardsEl.innerHTML='';
    var types=['seize','drop','draw3'];
    var emojis={seize:'\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8',drop:'\uD83D\uDCA5',draw3:'\uD83C\uDF00'};
    var titles={seize:'seizeTitle',drop:'dropTitle',draw3:'draw3Title'};
    for(var i=0;i<types.length;i++){
        var tpe=types[i];
        var cnt=playerPowerCards[tpe]||0;
        if(cnt<=0)continue;
        var btn=document.createElement('button');
        btn.className='power-btn';
        btn.title=t(titles[tpe]);
        btn.textContent=emojis[tpe];
        if(cnt>1){
            var b=document.createElement('span');
            b.className='badge';
            b.textContent=cnt;
            btn.appendChild(b);
        }
        btn.addEventListener('click',(function(tp){return function(){usePower(tp)}})(tpe));
        powerCardsEl.appendChild(btn);
    }
}

function renderScordiPowerCards(){
    if(!scordiPowerCardsEl)return;
    scordiPowerCardsEl.innerHTML='';
    var types=['seize','drop','draw3'];
    var emojis={seize:'\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8',drop:'\uD83D\uDCA5',draw3:'\uD83C\uDF00'};
    var titles={seize:'seizeTitle',drop:'dropTitle',draw3:'draw3Title'};
    for(var i=0;i<types.length;i++){
        var tpe=types[i];
        var cnt=scordiPowerCards[tpe]||0;
        if(cnt<=0)continue;
        var span=document.createElement('span');
        span.className='scordi-power-chip';
        span.title=t(titles[tpe]);
        span.textContent=emojis[tpe];
        if(cnt>1){
            var b=document.createElement('span');
            b.className='badge';
            b.textContent=cnt;
            span.appendChild(b);
        }
        scordiPowerCardsEl.appendChild(span);
    }
}

function init(){
    var p=new URLSearchParams(location.search);
    lang=p.get('lang')||'ar';
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    var loadTxt=$('loadTxt');if(loadTxt)loadTxt.textContent=t('load');
    if(rN)rN.textContent=t('next');
    if(hintTxt)hintTxt.textContent=t('hint');
    if(iconsLegend)iconsLegend.textContent=t('legend');
    var sn=$('scordiName');if(sn)sn.textContent=t('scordiName');
    var pn=$('playerName');if(pn)pn.textContent=t('playerName');
    var fn=$('fieldIcon');if(fn)fn.textContent='\uD83D\uDCE5';
    var btns=document.querySelectorAll('[data-title]');
    for(var i=0;i<btns.length;i++){var k=btns[i].getAttribute('data-title');if(k)btns[i].title=t(k)}
    document.title=lang==='ar'?'ضد سكوردي':'VS Scordi';
    if(sBtn){sBtn.title=t('soundTitle');sBtn.onclick=function(){sndOn=!sndOn;sBtn.classList.toggle('off',!sndOn)}}
    setupFieldBtn();
    var cancelSeize=$('cancelSeizeBtn');if(cancelSeize)cancelSeize.onclick=cancelSeizeMode;
    window.addEventListener('message',onMsg);
    var readyTimer=setInterval(function(){post({type:'ready'})},500);
    window.addEventListener('message',function once(e){
        if(e.data&&e.data.type==='question'){clearInterval(readyTimer);window.removeEventListener('message',once)}
    });
    post({type:'ready'});
}

function show(s){S0.classList.remove('on');S1.classList.remove('on');S2.classList.remove('on');s.classList.add('on')}
function onMsg(e){var d=e.data;if(!d||!d.type)return;if(d.type==='question')loadQ(d.data);else if(d.type==='result')showRes(d.isCorrect,d.alreadyAnswered,d.earnedLandCoin)}
function post(d){if(window.parent!==window)window.parent.postMessage(d,'*')}

function normChar(ch){
    if(!ch)return'';
    if(lang==='en')return String(ch).toUpperCase();
    return ch.replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
}
function getLetterPool(){return lang==='en'?EN_LETTERS:AR_LETTERS}
function getCommonLetters(){return lang==='en'?EN_COMMON_LETTERS:COMMON_LETTERS}

function loadQ(d){
    originalAnswer=d.field2||'';
    var title=d.field1||'';
    qT.textContent=title;
    var sep=/[،,]/;
    var allWords=(d.field2||'').split(sep).map(function(w){return w.trim()}).filter(function(w){return w.length===3});
    if(allWords.length===0){post({type:'answer',answer:''});return}
    wordsPerPlayer=parseInt(d.field3,10)||3;
    var totalNeeded=wordsPerPlayer*2;
    while(allWords.length<totalNeeded){for(var i=0;i<allWords.length&&allWords.length<totalNeeded;i++)allWords.push(allWords[i])}
    shuffleArray(allWords);
    var picked=allWords.slice(0,totalNeeded);
    myWords=picked.slice(0,wordsPerPlayer);
    scordiWords=picked.slice(wordsPerPlayer,totalNeeded);
    scordiDone=0;
    myCompletedWords=[];
    selWordIdx=-1;pickedLetters=[];
    turn='player';
    wait=false;
    letterAssign={};
    scordiLetterAssign={};
    playerDrewThisTurn=false;
    playerPowerCards={seize:0,drop:0,draw3:0};
    scordiPowerCards={seize:0,drop:0,draw3:0};

    var myChars=[],scordiChars=[];
    for(var i=0;i<myWords.length;i++){for(var j=0;j<3;j++)myChars.push(myWords[i][j])}
    for(var i=0;i<scordiWords.length;i++){for(var j=0;j<3;j++)scordiChars.push(scordiWords[i][j])}
    shuffleArray(myChars);
    shuffleArray(scordiChars);
    var extra=2+Math.floor(Math.random()*2);
    for(var i=0;i<extra;i++){
        myChars.push(getCommonLetters()[Math.floor(Math.random()*getCommonLetters().length)]);
        scordiChars.push(getCommonLetters()[Math.floor(Math.random()*getCommonLetters().length)]);
    }
    myLetters=myChars.slice(0,9);
    scordiLetters=scordiChars.slice(0,9);

    field=[];
    var pool=getLetterPool();var common=getCommonLetters();
    for(var i=0;i<20;i++)field.push(pool[Math.floor(Math.random()*pool.length)]);
    for(var i=0;i<6;i++)field.push(common[Math.floor(Math.random()*common.length)]);
    shuffleArray(field);

    renderAll();
    updateTurnBadge();
    updateZoneDim();
    show(S1);
}

function shuffleArray(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}}

function renderAll(){
    renderWords(playerWordsEl,myWords,myCompletedWords,true);
    renderWords(scordiWordsEl,scordiWords,scordiDone,false);
    var slotChars=[];
    for(var i=0;i<pickedLetters.length;i++){slotChars.push(myLetters[pickedLetters[i]])}
    renderSlots(playerSlotsEl,myWords,myCompletedWords,selWordIdx,slotChars,true);
    renderSlots(scordiSlotsEl,scordiWords,scordiDone,-1,[],false);
    renderPlayerLetters();
    renderScordiLetters();
    renderPowerCards();
    renderScordiPowerCards();
    fieldCount.textContent='\u221E';
    scordiScore.textContent=scordiDone+'/'+wordsPerPlayer;
    playerScore.textContent=myCompletedWords.length+'/'+wordsPerPlayer;
}

function renderWords(container,words,doneData,isPlayer){
    container.innerHTML='';
    var isDone=function(i){return isPlayer?(myCompletedWords.indexOf(i)>=0):(i<doneData)};
    for(var i=0;i<words.length;i++){
        var w=document.createElement('div');
        w.className='word-card'+(isDone(i)?' done':'')+(isPlayer&&selWordIdx===i?' selected':'');
        w.textContent=words[i];
        w.dataset.idx=i;
        if(isPlayer&&!isDone(i)){
            w.addEventListener('click',(function(idx){return function(){pickWord(idx)}})(i));
        }
        container.appendChild(w);
    }
}

function renderSlots(container,words,doneData,selIdx,letters,isPlayer){
    container.innerHTML='';
    var idx=selIdx>=0?selIdx:0;
    if(isPlayer){
        while(idx<words.length&&myCompletedWords.indexOf(idx)>=0)idx++;
    }else{if(idx<doneData)idx=doneData}
    var word=words[idx]||'';
    for(var i=0;i<3;i++){
        var s=document.createElement('div');
        s.className='letter-slot'+(i<letters.length?' filled':'')+(i<word.length&&letters.length>=3&&normChar(letters[i])===normChar(word[i])?' done':'');
        s.textContent=i<letters.length?letters[i]:'';
        container.appendChild(s);
    }
}

function renderPlayerLetters(){
    var wrap=zonePlayer.querySelector('.letters-wrap');
    if(!wrap){wrap=document.createElement('div');wrap.className='letters-wrap';zonePlayer.appendChild(wrap)}
    wrap.innerHTML='';
    for(var i=0;i<myLetters.length;i++){
        var el=document.createElement('div');
        el.className='letter-tile'+(pickedLetters.indexOf(i)>=0?' picked':'')+(getLetterUsed(i)?' used':'');
        el.textContent=myLetters[i];
        el.dataset.idx=i;
        if(!getLetterUsed(i)){
            el.addEventListener('click',(function(idx){return function(){pickLetter(idx)}})(i));
        }
        wrap.appendChild(el);
    }
}

function getLetterUsed(idx){
    if(pickedLetters.indexOf(idx)>=0)return true;
    for(var w=0;w<myWords.length;w++){
        if(myCompletedWords.indexOf(w)>=0)continue;
        for(var c=0;c<3;c++){
            if(getLetterIdxForSlot(w,c)===idx)return true;
        }
    }
    return false;
}

var letterAssign={};
function getLetterIdxForSlot(w,c){var k=w+','+c;return letterAssign[k]!==undefined?letterAssign[k]:-1}
function setLetterIdxForSlot(w,c,idx){letterAssign[w+','+c]=idx}

function renderScordiLetters(mode){
    var wrap=zoneScordi.querySelector('.letters-wrap');
    if(!wrap){wrap=document.createElement('div');wrap.className='letters-wrap';zoneScordi.appendChild(wrap)}
    wrap.innerHTML='';
    var clickable=mode==='seize'||mode==='drop';
    for(var i=0;i<scordiLetters.length;i++){
        var used=scordiLetterUsed(i);
        if(used)continue;
        var el=document.createElement('div');
        var picked=dropMode&&dropPicked.indexOf(i)>=0;
        el.className='letter-tile'+(clickable?' seizeable':'')+(picked?' picked':'');
        el.textContent=scordiLetters[i];
        el.dataset.idx=i;
        if(mode==='seize'){
            el.style.cursor='pointer';
            el.addEventListener('click',(function(idx){return function(){onSeizeLetter(idx)}})(i));
        }else if(mode==='drop'){
            el.style.cursor='pointer';
            el.addEventListener('click',(function(idx){return function(){onDropLetter(idx)}})(i));
        }
        wrap.appendChild(el);
    }
}

function onSeizeLetter(idx){
    if(!seizeMode||scordiLetterUsed(idx))return;
    initAC();
    var ch=scordiLetters[idx];
    scordiLetters.splice(idx,1);
    myLetters.push(ch);
    playerPowerCards['seize']=(playerPowerCards['seize']||1)-1;
    seizeMode=false;
    if(hintTxt)hintTxt.textContent=t('hint');
    var cb=$('cancelSeizeBtn');if(cb)cb.classList.add('hidden');
    updateZoneDim();
    toastShow(t('seizedByYou')+ch,'power');
    renderScordiLetters();
    renderPlayerLetters();
    renderPowerCards();
    renderScordiPowerCards();
    turn='scordi';
    updateTurnBadge();
    updateZoneDim();
    snd('turn');
    setTimeout(scordiTurn,800+Math.random()*800);
}

function cancelSeizeMode(){
    if(!seizeMode&&!dropMode)return;
    seizeMode=false;
    dropMode=false;
    dropPicked=[];
    if(hintTxt)hintTxt.textContent=t('hint');
    var cb=$('cancelSeizeBtn');if(cb)cb.classList.add('hidden');
    updateZoneDim();
    renderScordiLetters();
    renderPowerCards();
    renderScordiPowerCards();
}

function onDropLetter(idx){
    if(!dropMode||scordiLetterUsed(idx))return;
    var i=dropPicked.indexOf(idx);
    if(i>=0){dropPicked.splice(i,1)}else if(dropPicked.length<2){dropPicked.push(idx)}
    renderScordiLetters('drop');
    if(dropPicked.length===2){
        initAC();
        var toRemove=dropPicked.slice().sort(function(a,b){return b-a});
        var ch1=scordiLetters[toRemove[0]];
        var ch2=scordiLetters[toRemove[1]];
        for(var r=0;r<2;r++)scordiLetters.splice(toRemove[r],1);
        playerPowerCards['drop']=(playerPowerCards['drop']||1)-1;
        dropMode=false;
        dropPicked=[];
        if(hintTxt)hintTxt.textContent=t('hint');
        var cb=$('cancelSeizeBtn');if(cb)cb.classList.add('hidden');
        updateZoneDim();
        toastShowDrop(t('droppedByYou'),[ch1,ch2],false);
        renderScordiLetters();
        renderPowerCards();
        renderScordiPowerCards();
        turn='scordi';
        updateTurnBadge();
        updateZoneDim();
        snd('turn');
        setTimeout(scordiTurn,800+Math.random()*800);
    }
}

var scordiLetterAssign={};
function scordiLetterUsed(i){
    for(var w=0;w<scordiWords.length;w++){
        if(w>=scordiDone)continue;
        for(var c=0;c<3;c++){
            if(scordiLetterAssign[w+','+c]===i)return true;
        }
    }
    return false;
}

function updateTurnBadge(){
    if(!turnBadge)return;
    turnBadge.textContent=turn==='player'?t('yourTurn'):t('scordiTurn');
    turnBadge.className='turn-badge'+(turn==='scordi'?' scordi':'');
}
function updateZoneDim(){
    zonePlayer.classList.toggle('dimmed',turn==='scordi');
    zoneScordi.classList.toggle('dimmed',turn==='player'&&!seizeMode&&!dropMode);
    scordiStatus.textContent=turn==='scordi'?t('thinks'):'';
    scordiStatus.style.display=turn==='scordi'?'inline':'none';
}

function pickWord(idx){
    if(wait||turn!=='player'||seizeMode||dropMode)return;
    initAC();
    if(myCompletedWords.indexOf(idx)>=0)return;
    selWordIdx=idx;
    pickedLetters=[];
    for(var w=0;w<myWords.length;w++){for(var c=0;c<3;c++){delete letterAssign[w+','+c]}}
    renderAll();
    snd('sel');
}

function pickLetter(idx){
    if(wait||turn!=='player'||seizeMode||dropMode||selWordIdx<0||myCompletedWords.indexOf(selWordIdx)>=0)return;
    initAC();
    if(getLetterUsed(idx))return;
    if(pickedLetters.indexOf(idx)>=0)return;
    if(pickedLetters.length>=3)return;
    pickedLetters.push(idx);
    var c=pickedLetters.length-1;
    setLetterIdxForSlot(selWordIdx,c,idx);
    renderAll();
    snd('sel');
    if(pickedLetters.length===3){checkAndComplete()}
}

function checkAndComplete(){
    if(selWordIdx<0||myCompletedWords.indexOf(selWordIdx)>=0||pickedLetters.length!==3)return;
    var word=myWords[selWordIdx];
    var formed='';
    for(var i=0;i<3;i++)formed+=myLetters[pickedLetters[i]];
    var ok=true;
    for(var i=0;i<3;i++){
        if(normChar(formed[i])!==normChar(word[i])){ok=false;break}
    }
    if(ok){
        var toRemove=pickedLetters.slice().sort(function(a,b){return b-a});
        for(var r=0;r<3;r++)myLetters.splice(toRemove[r],1);
        myCompletedWords.push(selWordIdx);
        selWordIdx=-1;pickedLetters=[];
        letterAssign={};
        snd('ok');
        renderAll();
        if(myCompletedWords.length>=wordsPerPlayer){
            wait=true;
            confettiOn();
            setTimeout(function(){post({type:'answer',answer:originalAnswer})},1200);
            return;
        }
        turn='scordi';
        updateTurnBadge();
        updateZoneDim();
        toastShow(t('scordiTurn'),'info');
        snd('turn');
        setTimeout(scordiTurn,800+Math.random()*800);
    }else{
        pickedLetters=[];
        for(var w=0;w<myWords.length;w++){for(var c=0;c<3;c++){delete letterAssign[w+','+c]}}
        playerSlotsEl.classList.add('shake');
        snd('no');
        setTimeout(function(){playerSlotsEl.classList.remove('shake');renderAll()},400);
    }
}

function returnPickedLetters(){
    pickedLetters=[];
    for(var w=0;w<myWords.length;w++){for(var c=0;c<3;c++){delete letterAssign[w+','+c]}}
    renderAll();
}

function setupFieldBtn(){
    var fb=document.getElementById('fieldBtn');
    if(!fb)return;
    fb.onclick=function(){
        if(wait||turn!=='player')return;
        if(pickedLetters.length===0&&playerDrewThisTurn)return;
        initAC();
        if(pickedLetters.length>0){
            returnPickedLetters();
            snd('sel');
            return;
        }
        var gotCard=Math.random()<POWER_CHANCE;
        if(gotCard){
        var types=['seize','drop','draw3'];
        var tpe=types[Math.floor(Math.random()*3)];
        playerPowerCards[tpe]=(playerPowerCards[tpe]||0)+1;
        var msg=tpe==='seize'?t('gotSeize'):tpe==='drop'?t('gotDrop'):t('gotDraw3');
            toastShow(msg,'power');
        }else{
            var ch;
            if(field.length>0){ch=field.pop()}else{var c=getCommonLetters();ch=c[Math.floor(Math.random()*c.length)]}
            myLetters.push(ch);
        }
        playerDrewThisTurn=true;
        if(fieldCount)fieldCount.textContent='\u221E';
        renderPlayerLetters();
        renderPowerCards();
        turn='scordi';
        updateTurnBadge();
        updateZoneDim();
        toastShow(t('scordiTurn'),'info');
        snd('turn');
        setTimeout(scordiTurn,800+Math.random()*800);
    };
}

function usePower(type){
    if(wait||turn!=='player')return;
    var cnt=playerPowerCards[type]||0;
    if(cnt<=0)return;
    if(type==='seize'){
        var available=[];
        for(var i=0;i<scordiLetters.length;i++){if(!scordiLetterUsed(i))available.push(i)}
        if(available.length===0)return;
        seizeMode=true;
        if(hintTxt)hintTxt.textContent=t('seizeHint');
        var cb=$('cancelSeizeBtn');if(cb)cb.classList.remove('hidden');
        updateZoneDim();
        renderScordiLetters('seize');
        renderPowerCards();
        return;
    }
    if(type==='drop'){
        var available=[];
        for(var i=0;i<scordiLetters.length;i++){if(!scordiLetterUsed(i))available.push(i)}
        if(available.length<2)return;
        dropMode=true;
        dropPicked=[];
        if(hintTxt)hintTxt.textContent=t('dropHint');
        var cb=$('cancelSeizeBtn');if(cb)cb.classList.remove('hidden');
        updateZoneDim();
        renderScordiLetters('drop');
        renderPowerCards();
        return;
    }
    initAC();
    playerPowerCards[type]=cnt-1;
    renderPowerCards();
    if(type==='draw3'){
        for(var n=0;n<3;n++){
            var ch;
            if(field.length>0){ch=field.pop()}else{var c=getCommonLetters();ch=c[Math.floor(Math.random()*c.length)]}
            myLetters.push(ch);
        }
        fieldCount.textContent='\u221E';
        toastShow(t('draw3Title'),'power');
    }
    renderScordiLetters();
    renderPlayerLetters();
    renderPowerCards();
    turn='scordi';
    updateTurnBadge();
    updateZoneDim();
    setTimeout(function(){toastShow(t('scordiTurn'),'info')},1600);
    snd('turn');
    setTimeout(scordiTurn,800+Math.random()*800);
}

function scordiTurn(){
    if(wait||turn!=='scordi')return;
    turn='scordi';
    updateTurnBadge();
    updateZoneDim();
    var hasPower=(scordiPowerCards.seize||0)+(scordiPowerCards.drop||0)+(scordiPowerCards.draw3||0)>0;
    if(hasPower&&Math.random()<0.4){scordiUsePower();endScordiTurn();return}
    var completed=tryScordiComplete();
    if(completed>=0){
        var w=scordiWords[completed];
        scordiAnimateWord(completed,w,function(){
            toastShow(' '+t('scordiComplete')+' '+w,'info');
            scordiDone++;
            scordiScore.textContent=scordiDone+'/'+wordsPerPlayer;
            renderAll();
            if(scordiDone>=wordsPerPlayer){wait=true;setTimeout(function(){post({type:'answer',answer:'خسارة'})},700);return}
            endScordiTurn();
        });
        return;
    }
    var gotCard=Math.random()<POWER_CHANCE;
    if(gotCard){
        var types=['seize','drop','draw3'];
        var tpe=types[Math.floor(Math.random()*3)];
        scordiPowerCards[tpe]=(scordiPowerCards[tpe]||0)+1;
        var msg=tpe==='seize'?t('scordiGotSeize'):tpe==='drop'?t('scordiGotDrop'):t('scordiGotDraw3');
        toastShow(msg,'info');
    }else{
        var ch;
        if(field.length>0){ch=field.pop()}else{var c=getCommonLetters();ch=c[Math.floor(Math.random()*c.length)]}
        scordiLetters.push(ch);
        toastShow(t('scordiDraw'),'info');
    }
    fieldCount.textContent='\u221E';
    renderScordiLetters();
    renderScordiPowerCards();
    endScordiTurn();
}

function tryScordiComplete(){
    for(var wi=scordiDone;wi<scordiWords.length;wi++){
        var word=scordiWords[wi];
        var need=[normChar(word[0]),normChar(word[1]),normChar(word[2])];
        var has={};
        for(var i=0;i<scordiLetters.length;i++){
            if(scordiLetterUsed(i))continue;
            var n=normChar(scordiLetters[i]);
            has[n]=has[n]||[];has[n].push(i);
        }
        var usedIdx=[];
        var can=true;
        for(var c=0;c<3;c++){
            var n=need[c];
            if(has[n]&&has[n].length>0){
                var idx=has[n].shift();
                usedIdx.push(idx);
                scordiLetterAssign[wi+','+c]=idx;
            }else{can=false;break}
        }
        if(can&&usedIdx.length===3){
            var toRemove=usedIdx.slice().sort(function(a,b){return b-a});
            for(var r=0;r<3;r++)scordiLetters.splice(toRemove[r],1);
            for(var c=0;c<3;c++)delete scordiLetterAssign[wi+','+c];
            return wi;
        }
    }
    return -1;
}

function scordiAnimateWord(wi,word,cb){
    renderSlots(scordiSlotsEl,scordiWords,scordiDone,wi,[],false);
    var slots=scordiSlotsEl.querySelectorAll('.letter-slot');
    function fillNext(i){
        if(i>=3){if(cb)cb();return}
        if(slots[i]){slots[i].textContent=word[i];slots[i].classList.add('filled','done')}
        setTimeout(function(){fillNext(i+1)},400);
    }
    fillNext(0);
}

function scordiWouldBenefitFromSeize(){
    if(myLetters.length===0)return false;
    for(var wi=scordiDone;wi<scordiWords.length;wi++){
        var word=scordiWords[wi];
        var need=[normChar(word[0]),normChar(word[1]),normChar(word[2])];
        var hasCount={};
        for(var i=0;i<scordiLetters.length;i++){
            if(scordiLetterUsed(i))continue;
            var n=normChar(scordiLetters[i]);
            hasCount[n]=(hasCount[n]||0)+1;
        }
        var miss=null;
        for(var c=0;c<3;c++){
            if(!hasCount[need[c]]||hasCount[need[c]]<=0){miss=need[c];break}
            hasCount[need[c]]--;
        }
        if(miss){
            for(var mi=0;mi<myLetters.length;mi++){
                if(getLetterUsed(mi))continue;
                if(normChar(myLetters[mi])===miss)return true;
            }
        }
    }
    for(var wi=0;wi<myWords.length;wi++){
        if(myCompletedWords.indexOf(wi)>=0)continue;
        var word=myWords[wi];
        var need=[normChar(word[0]),normChar(word[1]),normChar(word[2])];
        var playerHas={};
        for(var mi=0;mi<myLetters.length;mi++){
            if(getLetterUsed(mi))continue;
            var x=normChar(myLetters[mi]);
            playerHas[x]=(playerHas[x]||0)+1;
        }
        var miss=null;
        for(var c=0;c<3;c++){
            if(!playerHas[need[c]]||playerHas[need[c]]<=0){miss=need[c];break}
            playerHas[need[c]]--;
        }
        if(miss){
            for(var mi=0;mi<myLetters.length;mi++){
                if(getLetterUsed(mi))continue;
                if(normChar(myLetters[mi])===miss)return true;
            }
        }
    }
    return false;
}

function scordiUsePower(){
    var hasSeize=(scordiPowerCards.seize||0)>0;
    var hasDrop=(scordiPowerCards.drop||0)>0;
    var hasDraw3=(scordiPowerCards.draw3||0)>0;
    if(hasSeize&&myLetters.length>0&&(scordiWouldBenefitFromSeize()||Math.random()<0.5)){
        var idx=scordiPickBestLetterFromPlayer();
        if(idx>=0){
            scordiPowerCards.seize=(scordiPowerCards.seize||1)-1;
            var ch=myLetters.splice(idx,1)[0];
            scordiLetters.push(ch);
            toastShow(t('scordiSeized')+ch,'info');
            renderScordiLetters();
            renderPlayerLetters();
            renderScordiPowerCards();
            return;
        }
    }
    if(hasDraw3&&Math.random()<0.5){
        scordiPowerCards.draw3=(scordiPowerCards.draw3||1)-1;
        for(var n=0;n<3;n++){
            var ch;if(field.length>0){ch=field.pop()}else{var c=getCommonLetters();ch=c[Math.floor(Math.random()*c.length)]}
            scordiLetters.push(ch);
        }
        fieldCount.textContent='\u221E';
    }else if(hasDrop&&myLetters.length>=2){
        var pair=scordiPickBestTwoLettersFromPlayer();
        if(pair.length===2){
            scordiPowerCards.drop=(scordiPowerCards.drop||1)-1;
            var ch1=myLetters[pair[0]];
            var ch2=myLetters[pair[1]];
            var toRemove=[pair[0],pair[1]].sort(function(a,b){return b-a});
            for(var r=0;r<2;r++)myLetters.splice(toRemove[r],1);
            toastShowDrop(t('scordiDropped'),[ch1,ch2],true);
        }
    }else if(hasSeize&&myLetters.length>0){
        var idx=scordiPickBestLetterFromPlayer();
        if(idx>=0){
            scordiPowerCards.seize=(scordiPowerCards.seize||1)-1;
            var ch=myLetters.splice(idx,1)[0];
            scordiLetters.push(ch);
            toastShow(t('scordiSeized')+ch,'info');
        }
    }
    renderScordiLetters();
    renderPlayerLetters();
    renderScordiPowerCards();
}

function scordiPickBestTwoLettersFromPlayer(){
    var available=[];
    for(var i=0;i<myLetters.length;i++){if(!getLetterUsed(i))available.push(i)}
    if(available.length<2)return [];
    var pair=[];
    var blockable=[];
    for(var wi=0;wi<myWords.length;wi++){
        if(myCompletedWords.indexOf(wi)>=0)continue;
        var word=myWords[wi];
        var need=[normChar(word[0]),normChar(word[1]),normChar(word[2])];
        var playerHas={};
        for(var mi=0;mi<myLetters.length;mi++){
            if(getLetterUsed(mi))continue;
            var n=normChar(myLetters[mi]);
            playerHas[n]=(playerHas[n]||0)+1;
        }
        for(var c=0;c<3;c++){
            var n=need[c];
            if(!playerHas[n]||playerHas[n]<=0){
                for(var mi=0;mi<myLetters.length;mi++){
                    if(getLetterUsed(mi))continue;
                    if(normChar(myLetters[mi])===n&&blockable.indexOf(mi)<0)blockable.push(mi);
                }
                break;
            }
            playerHas[n]--;
        }
    }
    if(blockable.length>=2){
        var a=blockable[Math.floor(Math.random()*blockable.length)];
        var b;
        do{b=blockable[Math.floor(Math.random()*blockable.length)]}while(b===a);
        return [a,b];
    }
    if(blockable.length>=1)pair.push(blockable[0]);
    if(blockable.length>=2)pair.push(blockable[1]);
    for(var j=0;j<available.length&&pair.length<2;j++){
        if(pair.indexOf(available[j])<0)pair.push(available[j]);
    }
    return pair.length>=2?pair.slice(0,2):[];
}

function scordiPickBestLetterFromPlayer(){
    var available=[];
    for(var i=0;i<myLetters.length;i++){if(!getLetterUsed(i))available.push(i)}
    if(available.length===0)return -1;
    var pick=function(arr){return arr.length>0?arr[Math.floor(Math.random()*arr.length)]:-1};
    var addIfMatch=function(targetChar,out){
        for(var mi=0;mi<myLetters.length;mi++){
            if(getLetterUsed(mi))continue;
            if(normChar(myLetters[mi])===targetChar&&out.indexOf(mi)<0)out.push(mi);
        }
    };
    var completeScordi=[];
    for(var wi=scordiDone;wi<scordiWords.length;wi++){
        var word=scordiWords[wi];
        var need=[normChar(word[0]),normChar(word[1]),normChar(word[2])];
        var hasCount={};
        for(var i=0;i<scordiLetters.length;i++){
            if(scordiLetterUsed(i))continue;
            var n=normChar(scordiLetters[i]);
            hasCount[n]=(hasCount[n]||0)+1;
        }
        var missCount=0;
        var missChar=null;
        for(var c=0;c<3;c++){
            var n=need[c];
            if(!hasCount[n]||hasCount[n]<=0){missCount++;missChar=n}
            else hasCount[n]--;
        }
        if(missCount===1&&missChar)addIfMatch(missChar,completeScordi);
    }
    if(completeScordi.length>0)return pick(completeScordi);
    var blockPlayer=[];
    for(var wi=0;wi<myWords.length;wi++){
        if(myCompletedWords.indexOf(wi)>=0)continue;
        var word=myWords[wi];
        var need=[normChar(word[0]),normChar(word[1]),normChar(word[2])];
        var playerHas={};
        for(var mi=0;mi<myLetters.length;mi++){
            if(getLetterUsed(mi))continue;
            var n=normChar(myLetters[mi]);
            playerHas[n]=(playerHas[n]||0)+1;
        }
        var miss=null;
        for(var c=0;c<3;c++){
            var n=need[c];
            if(!playerHas[n]||playerHas[n]<=0){miss=n;break}
            playerHas[n]--;
        }
        if(miss)addIfMatch(miss,blockPlayer);
    }
    if(blockPlayer.length>0)return pick(blockPlayer);
    var closer=[];
    for(var wi=scordiDone;wi<scordiWords.length;wi++){
        var word=scordiWords[wi];
        var need=[normChar(word[0]),normChar(word[1]),normChar(word[2])];
        var hasCount={};
        for(var i=0;i<scordiLetters.length;i++){
            if(scordiLetterUsed(i))continue;
            var n=normChar(scordiLetters[i]);
            hasCount[n]=(hasCount[n]||0)+1;
        }
        for(var c=0;c<3;c++){
            var n=need[c];
            if(!hasCount[n]||hasCount[n]<=0)addIfMatch(n,closer);
            else hasCount[n]--;
        }
    }
    if(closer.length>0)return pick(closer);
    return pick(available);
}

function endScordiTurn(){
    turn='player';
    playerDrewThisTurn=false;
    updateTurnBadge();
    updateZoneDim();
    setTimeout(function(){toastShow(t('yourTurnToast'),'info')},1500);
    snd('turn');
}

function toastShow(msg,type){
    toast.textContent=msg;
    toast.className='toast '+(type||'info')+' show';
    toast.style.display='block';
    clearTimeout(toast._t);
    toast._t=setTimeout(function(){toast.style.display='none'},1400);
}

function toastShowDrop(prefix,letters,isScordi){
    toast.innerHTML='';
    toast.appendChild(document.createTextNode(prefix));
    for(var i=0;i<letters.length;i++){
        if(i>0){var and=document.createTextNode(t('and'));toast.appendChild(and)}
        var sp=document.createElement('span');
        sp.className='toast-letter';
        sp.textContent=letters[i];
        toast.appendChild(sp);
    }
    toast.className='toast '+(isScordi?'info':'power')+' show';
    toast.style.display='block';
    clearTimeout(toast._t);
    toast._t=setTimeout(function(){toast.style.display='none'},1800);
}

function showRes(ok,dup,coins){
    var txt=lang==='ar'?{y:t('win'),n:t('lose'),d:'أجبت من قبل'}:{y:'You won!',n:'Scordi won!',d:'Already answered'};
    rI.textContent=ok?'\uD83C\uDFC6':'\uD83D\uDE14';
    rI.className='result-icon '+(ok?'ok':'no');
    rT.textContent=dup?txt.d:(ok?txt.y:txt.n);
    rT.className='result-title '+(ok?'ok':'no');
    var glow=document.querySelector('.result-glow');
    if(glow)glow.style.background=ok?'#22c55e':'#ef4444';
    if(ok)confettiOn();
    if(ok&&!dup&&typeof coins==='number'){rE.textContent='+'+coins;rC.classList.remove('hidden')}else{rC.classList.add('hidden')}
    show(S2);
}

function confettiOn(){
    var c=confettiCanvas;
    c.width=window.innerWidth;
    c.height=window.innerHeight;
    var ctx=c.getContext('2d');
    var colors=['#d4a930','#22c55e','#ff6b6b','#4ecdc4','#a855f7','#06b6d4'];
    var particles=[];
    for(var i=0;i<80;i++){
        particles.push({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-0.5)*8,vy:(Math.random()-0.5)*8-2,r:4+Math.random()*4,color:colors[Math.floor(Math.random()*colors.length)],rot:Math.random()*360,rotSpd:(Math.random()-0.5)*10});
    }
    var t0=Date.now();
    function anim(){
        ctx.clearRect(0,0,c.width,c.height);
        for(var i=0;i<particles.length;i++){
            var p=particles[i];
            p.vy+=0.15;p.vx*=0.99;p.vy*=0.99;
            p.x+=p.vx;p.y+=p.vy;p.rot+=p.rotSpd;
            if(p.y>c.height+20)continue;
            ctx.save();
            ctx.translate(p.x,p.y);
            ctx.rotate(p.rot*Math.PI/180);
            ctx.fillStyle=p.color;
            ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2);
            ctx.restore();
        }
        if(Date.now()-t0<2500)requestAnimationFrame(anim);
    }
    anim();
}

function initAC(){if(ac)return;try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}
function snd(type){
    if(!sndOn||!ac)return;
    try{
        if(ac.state==='suspended')ac.resume();
        if(type==='sel'){var n=Date.now();if(n-lastSnd<120)return;lastSnd=n;bip(500,'sine',0.03,0.04)}
        else if(type==='ok'){bip(523,'sine',0.05,0.1,0);bip(659,'sine',0.05,0.1,0.1);bip(784,'sine',0.05,0.12,0.2);bip(1047,'sine',0.04,0.15,0.3)}
        else if(type==='no'){bip(200,'sawtooth',0.03,0.12);bip(180,'sawtooth',0.03,0.12,0.12)}
        else if(type==='turn'){bip(440,'sine',0.04,0.08)}
    }catch(e){}
}
function bip(f,tp,v,dur,dl){dl=dl||0;var o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=tp;o.frequency.value=f;var t=ac.currentTime+dl;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.start(t);o.stop(t+dur)}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
