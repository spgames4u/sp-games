(function(){
'use strict';

/* ══════════════════════════════════════
   الكلمات المتقاطعة - ScoreLand Crossword
   v2 - Fixed & Optimized
   ══════════════════════════════════════ */

var lang='ar', sndOn=true, ac=null, lastSnd=0;
var words=[], clues=[], placed=[], gridData=null;
var gridW=0, gridH=0;
var selCell=null, selDir='across', solvedWords=[];
var wait=true, curQ=null, originalAnswer='';

var $=function(id){return document.getElementById(id)};
var S0=$('S0'),S1=$('S1'),S2=$('S2');
var qT=$('qTitle'),ctr=$('ctr'),grid=$('grid');
var progFill=$('progressFill'),sBtn=$('sndBtn');
var acClues=$('acrossClues'),dnClues=$('downClues');
var kb=$('hiddenInput');
var rI=$('resIcon'),rT=$('resTitle'),rC=$('resCoins'),rE=$('resAmt'),rN=$('resNext');

/* ══════ التهيئة ══════ */
function init(){
    var p=new URLSearchParams(location.search);
    lang=p.get('lang')||'ar';
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    if(lang!=='ar'){
        $('loadTxt').textContent='Loading...';
        rN.textContent='Next question...';
        $('acrossLabel').textContent='Across';
        $('downLabel').textContent='Down';
    }
    sBtn.onclick=function(){sndOn=!sndOn;sBtn.classList.toggle('off',!sndOn)};
    setupInput();
    document.addEventListener('keydown',onKeyDown);
    window.addEventListener('message',onMsg);
    window.addEventListener('resize',onResize);
    /* ✅ FIX: كرر ready كل 500ms حتى يوصل سؤال */
    var readyTimer=setInterval(function(){post({type:'ready'})},500);
    window.addEventListener('message',function once(e){
        if(e.data&&e.data.type==='question'){clearInterval(readyTimer);window.removeEventListener('message',once)}
    });
    post({type:'ready'});
}

function show(s){S0.classList.remove('on');S1.classList.remove('on');S2.classList.remove('on');s.classList.add('on')}
function onMsg(e){var d=e.data;if(!d||!d.type)return;if(d.type==='question')loadQ(d.data);else if(d.type==='result')showRes(d.isCorrect,d.alreadyAnswered,d.earnedLandCoin)}
function post(d){if(window.parent!==window)window.parent.postMessage(d,'*')}

/* ══════ تحميل سؤال ══════ */
function loadQ(d){
    curQ=d; wait=false; solvedWords=[]; selCell=null;
    qT.textContent=d.field1||'';
    /* ✅ FIX: حفظ الإجابة الأصلية كما هي */
    originalAnswer=d.field2||'';
    var sep=/[،,]/;
    words=(d.field2||'').split(sep).map(function(w){return w.trim().replace(/\s/g,'')}).filter(function(w){return w.length>0});
    clues=(d.field3||'').split(sep).map(function(c){return c.trim()}).filter(function(c){return c.length>0});
    while(clues.length<words.length)clues.push('...');
    if(words.length===0){post({type:'answer',answer:''});return}
    generateCrossword();
    renderGrid();
    renderClues();
    updateProgress();
    show(S1);
    setTimeout(function(){selectFirstCell()},150);
}

/* ══════ توليد الكلمات المتقاطعة ══════ */
function normChar(ch){
    if(!ch)return'';
    return ch.replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
}

function generateCrossword(){
    placed=[];
    var sorted=words.map(function(w,i){return{word:w,idx:i,len:w.length}})
                     .sort(function(a,b){return b.len-a.len});

    var best=null;
    for(var attempt=0;attempt<60;attempt++){
        var result=tryGenerate(sorted);
        if(!result)continue;
        /* ✅ FIX: بدون optional chaining */
        if(!best||result.placed.length>best.placed.length){
            best=result;
            if(best.placed.length===words.length)break;
        }
    }

    if(!best||best.placed.length===0) best=fallbackLayout(sorted);

    /* ✅ FIX: إضافة الكلمات اللي ما انوضعت */
    if(best.placed.length<words.length){
        var placedIdxs={};
        for(var i=0;i<best.placed.length;i++) placedIdxs[best.placed[i].idx]=true;
        var missing=[];
        for(var i=0;i<sorted.length;i++){
            if(!placedIdxs[sorted[i].idx]) missing.push(sorted[i]);
        }
        /* ضع الكلمات المفقودة تحت الشبكة */
        var extraRow=best.h+1;
        for(var i=0;i<missing.length;i++){
            var dir=i%2===0?'across':'down';
            var col=dir==='across'?0:i*2;
            var row=dir==='across'?extraRow:extraRow;
            best.placed.push({word:missing[i].word,idx:missing[i].idx,row:row,col:col,dir:dir,num:0});
            if(dir==='across'){
                best.w=Math.max(best.w,missing[i].len);
                extraRow++;
            } else {
                best.w=Math.max(best.w,col+1);
                extraRow=Math.max(extraRow,row+missing[i].len);
            }
            best.h=extraRow;
        }
    }

    placed=best.placed;
    gridW=best.w;
    gridH=best.h;

    gridData=[];
    var r,c;
    for(r=0;r<gridH;r++){gridData[r]=[];for(c=0;c<gridW;c++){gridData[r][c]={letter:null,answer:null,wordIds:[],num:0}}}
    for(var i=0;i<placed.length;i++){
        var p=placed[i];
        for(var j=0;j<p.word.length;j++){
            var rr=p.row+(p.dir==='down'?j:0);
            var cc=p.col+(p.dir==='across'?j:0);
            if(rr>=0&&rr<gridH&&cc>=0&&cc<gridW){gridData[rr][cc].answer=p.word[j];gridData[rr][cc].wordIds.push(i)}
        }
    }

    var num=1;
    for(r=0;r<gridH;r++){for(c=0;c<gridW;c++){
        if(!gridData[r][c].answer)continue;
        var needNum=false;
        for(var i=0;i<placed.length;i++){if(placed[i].row===r&&placed[i].col===c){needNum=true;placed[i].num=num}}
        if(needNum){gridData[r][c].num=num;num++}
    }}
}

function tryGenerate(sorted){
    var pl=[];
    var minR=0,maxR=0,minC=0,maxC=0;
    var first=sorted[0];
    pl.push({word:first.word,idx:first.idx,row:0,col:0,dir:'across',num:0});
    maxC=first.len-1;

    var remaining=sorted.slice(1);
    shuffleArray(remaining);

    for(var i=0;i<remaining.length;i++){
        var w=remaining[i];
        var bestP=null,bestInt=0;
        for(var pi=0;pi<pl.length;pi++){
            var ex=pl[pi];
            for(var ei=0;ei<ex.word.length;ei++){
                for(var wi=0;wi<w.word.length;wi++){
                    if(normChar(ex.word[ei])!==normChar(w.word[wi]))continue;
                    var newDir=ex.dir==='across'?'down':'across';
                    var exR=ex.row+(ex.dir==='down'?ei:0);
                    var exC=ex.col+(ex.dir==='across'?ei:0);
                    var nr,nc;
                    if(newDir==='across'){nr=exR;nc=exC-wi}else{nr=exR-wi;nc=exC}
                    if(canPlace(pl,w.word,nr,nc,newDir)){
                        var ints=countInt(pl,w.word,nr,nc,newDir);
                        if(ints>bestInt){bestInt=ints;bestP={word:w.word,idx:w.idx,row:nr,col:nc,dir:newDir,num:0}}
                    }
                }
            }
        }
        if(bestP){
            pl.push(bestP);
            minR=Math.min(minR,bestP.row);
            maxR=Math.max(maxR,bestP.row+(bestP.dir==='down'?bestP.word.length-1:0));
            minC=Math.min(minC,bestP.col);
            maxC=Math.max(maxC,bestP.col+(bestP.dir==='across'?bestP.word.length-1:0));
        }
    }
    if(pl.length<2&&sorted.length>1)return null;
    for(var i=0;i<pl.length;i++){pl[i].row-=minR;pl[i].col-=minC}
    return{placed:pl,w:maxC-minC+1,h:maxR-minR+1};
}

function canPlace(pl,word,row,col,dir){
    for(var i=0;i<word.length;i++){
        var r=row+(dir==='down'?i:0);var c=col+(dir==='across'?i:0);
        var ex=getChar(pl,r,c);
        if(ex!==null&&normChar(ex)!==normChar(word[i]))return false;
        if(ex===null){
            if(dir==='across'){if(getChar(pl,r-1,c)!==null||getChar(pl,r+1,c)!==null)return false}
            else{if(getChar(pl,r,c-1)!==null||getChar(pl,r,c+1)!==null)return false}
        }
    }
    var bR=row-(dir==='down'?1:0),bC=col-(dir==='across'?1:0);
    if(getChar(pl,bR,bC)!==null)return false;
    var aR=row+(dir==='down'?word.length:0),aC=col+(dir==='across'?word.length:0);
    if(getChar(pl,aR,aC)!==null)return false;
    return true;
}

function getChar(pl,r,c){
    for(var i=0;i<pl.length;i++){var p=pl[i];for(var j=0;j<p.word.length;j++){var pr=p.row+(p.dir==='down'?j:0);var pc=p.col+(p.dir==='across'?j:0);if(pr===r&&pc===c)return p.word[j]}}
    return null;
}

function countInt(pl,word,row,col,dir){
    var cnt=0;
    for(var i=0;i<word.length;i++){var r=row+(dir==='down'?i:0);var c=col+(dir==='across'?i:0);var ch=getChar(pl,r,c);if(ch!==null&&normChar(ch)===normChar(word[i]))cnt++}
    return cnt;
}

function fallbackLayout(sorted){
    var pl=[];
    var first=sorted[0];
    pl.push({word:first.word,idx:first.idx,row:0,col:0,dir:'across',num:0});
    var nextCol=0;
    for(var i=1;i<sorted.length;i++){
        pl.push({word:sorted[i].word,idx:sorted[i].idx,row:1,col:nextCol,dir:'down',num:0});
        nextCol+=2;
    }
    var mxR=0,mxC=first.len-1;
    for(var i=0;i<pl.length;i++){
        var eR=pl[i].row+(pl[i].dir==='down'?pl[i].word.length-1:0);
        var eC=pl[i].col+(pl[i].dir==='across'?pl[i].word.length-1:0);
        if(eR>mxR)mxR=eR;if(eC>mxC)mxC=eC;
    }
    return{placed:pl,w:mxC+1,h:mxR+1};
}

function shuffleArray(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}}

/* ══════ رسم الشبكة ══════ */
function renderGrid(){
    grid.innerHTML='';
    var aw=Math.min(window.innerWidth-16,420);
    var ah=window.innerHeight*0.42;
    var cw=Math.floor((aw-(gridW+1)*2)/gridW);
    var ch=Math.floor((ah-(gridH+1)*2)/gridH);
    var cs=Math.min(cw,ch,42);
    cs=Math.max(cs,22);
    var fs=Math.max(Math.round(cs*0.48),11);
    var nfs=Math.max(Math.round(cs*0.22),7);

    grid.style.gridTemplateColumns='repeat('+gridW+','+cs+'px)';
    grid.style.gridTemplateRows='repeat('+gridH+','+cs+'px)';

    for(var r=0;r<gridH;r++){for(var c=0;c<gridW;c++){
        var cell=document.createElement('div');
        cell.className='cw-cell';cell.dataset.r=r;cell.dataset.c=c;
        if(!gridData[r][c].answer){cell.classList.add('blank')}
        else{
            cell.classList.add('active');
            if(gridData[r][c].num>0){var n=document.createElement('span');n.className='cell-num';n.textContent=gridData[r][c].num;n.style.fontSize=nfs+'px';cell.appendChild(n)}
            var le=document.createElement('span');le.className='cell-letter';le.textContent='';le.style.fontSize=fs+'px';cell.appendChild(le);
            cell.addEventListener('click',mkCellClick(r,c));
        }
        grid.appendChild(cell);
    }}
}

function mkCellClick(r,c){return function(){
    if(wait)return;initAC();
    if(selCell&&selCell.r===r&&selCell.c===c){
        var wids=gridData[r][c].wordIds,hA=false,hD=false;
        for(var i=0;i<wids.length;i++){if(placed[wids[i]].dir==='across')hA=true;if(placed[wids[i]].dir==='down')hD=true}
        if(hA&&hD)selDir=selDir==='across'?'down':'across';
    }else{
        var wids=gridData[r][c].wordIds;
        if(wids.length>0){var hA=false,hD=false;for(var i=0;i<wids.length;i++){if(placed[wids[i]].dir==='across')hA=true;if(placed[wids[i]].dir==='down')hD=true}if(hA&&!hD)selDir='across';else if(hD&&!hA)selDir='down'}
    }
    selCell={r:r,c:c};highlightSelection();snd('sel');focusInput();
}}

function highlightSelection(){
    var cells=grid.querySelectorAll('.cw-cell');for(var i=0;i<cells.length;i++)cells[i].classList.remove('selected','highlighted');
    var ci=document.querySelectorAll('.clue-item');for(var i=0;i<ci.length;i++)ci[i].classList.remove('active');
    if(!selCell)return;
    var cell=getCell(selCell.r,selCell.c);if(cell)cell.classList.add('selected');
    var awi=findAW(selCell.r,selCell.c,selDir);
    if(awi<0){selDir=selDir==='across'?'down':'across';awi=findAW(selCell.r,selCell.c,selDir)}
    if(awi>=0){
        var p=placed[awi];
        for(var j=0;j<p.word.length;j++){var hr=p.row+(p.dir==='down'?j:0);var hc=p.col+(p.dir==='across'?j:0);var h=getCell(hr,hc);if(h&&!(hr===selCell.r&&hc===selCell.c))h.classList.add('highlighted')}
        var cl=document.querySelector('.clue-item[data-wi="'+awi+'"]');if(cl){cl.classList.add('active');cl.scrollIntoView({behavior:'smooth',block:'nearest'})}
    }
}
function findAW(r,c,dir){var w=gridData[r][c].wordIds;for(var i=0;i<w.length;i++){if(placed[w[i]].dir===dir)return w[i]}return w.length>0?w[0]:-1}
function selectFirstCell(){if(!placed.length)return;selCell={r:placed[0].row,c:placed[0].col};selDir=placed[0].dir;highlightSelection();focusInput()}
function getCell(r,c){return grid.querySelector('[data-r="'+r+'"][data-c="'+c+'"]')}

/* ══════ التلميحات ══════ */
function renderClues(){
    acClues.innerHTML='';dnClues.innerHTML='';
    for(var i=0;i<placed.length;i++){
        var p=placed[i];
        var item=document.createElement('div');item.className='clue-item';item.dataset.wi=i;
        var ns=document.createElement('span');ns.className='clue-num';ns.textContent=p.num;
        var ts=document.createElement('span');ts.className='clue-text';ts.textContent=clues[p.idx]||'...';
        item.appendChild(ns);item.appendChild(ts);
        item.addEventListener('click',(function(idx){return function(){if(wait)return;selCell={r:placed[idx].row,c:placed[idx].col};selDir=placed[idx].dir;highlightSelection();snd('sel');focusInput()}})(i));
        if(p.dir==='across')acClues.appendChild(item);else dnClues.appendChild(item);
    }
}

/* ══════ إدخال (hidden input + كيبورد النظام) ══════ */
function setupInput(){
    kb.addEventListener('input',onInput);
    kb.addEventListener('keydown',onKeyDown);
    /* منع الزوم على iOS عند الفوكس */
    kb.style.fontSize='16px';
}

function focusInput(){
    kb.value='';
    kb.focus({preventScroll:true});
}

function onInput(e){
    var val=kb.value;
    kb.value='';
    if(!val||wait||!selCell)return;
    /* آخر حرف مدخل */
    var ch=val.charAt(val.length-1);
    if(lang==='ar'&&/[\u0600-\u06FF]/.test(ch)){inputChar(ch)}
    else if(lang!=='ar'&&/[a-zA-Z]/.test(ch)){inputChar(ch.toUpperCase())}
}

/* ══════ إدخال ══════ */
function inputChar(ch){
    if(wait||!selCell)return;initAC();
    var cell=getCell(selCell.r,selCell.c);
    if(!cell||cell.classList.contains('correct')){moveToNext();return}
    var le=cell.querySelector('.cell-letter');
    if(le){le.textContent=ch;gridData[selCell.r][selCell.c].letter=ch;snd('sel');checkWordAtCell(selCell.r,selCell.c);moveToNext()}
}
function doDelete(){
    if(wait||!selCell)return;initAC();
    var cell=getCell(selCell.r,selCell.c);
    if(!cell)return;
    /* ✅ FIX: ما نمسح خلايا محلولة */
    if(cell.classList.contains('correct')){moveToPrevSkipCorrect();snd('sel');return}
    var le=cell.querySelector('.cell-letter');
    if(le&&le.textContent){le.textContent='';gridData[selCell.r][selCell.c].letter=null}
    else{moveToPrevSkipCorrect()}
    snd('sel');
}
function moveToNext(){
    if(!selCell)return;
    var dr=selDir==='down'?1:0,dc=selDir==='across'?1:0;
    var nr=selCell.r+dr,nc=selCell.c+dc;
    /* ✅ تخطي الخلايا المحلولة */
    while(nr>=0&&nr<gridH&&nc>=0&&nc<gridW&&gridData[nr][nc].answer){
        var c=getCell(nr,nc);
        if(c&&!c.classList.contains('correct')){selCell={r:nr,c:nc};highlightSelection();return}
        nr+=dr;nc+=dc;
    }
}
function moveToPrev(){
    if(!selCell)return;
    var dr=selDir==='down'?-1:0,dc=selDir==='across'?-1:0;
    var nr=selCell.r+dr,nc=selCell.c+dc;
    if(nr>=0&&nr<gridH&&nc>=0&&nc<gridW&&gridData[nr][nc].answer){
        selCell={r:nr,c:nc};
        var c=getCell(nr,nc);
        /* ✅ FIX: ما نمسح خلايا محلولة */
        if(c&&!c.classList.contains('correct')){
            var l=c.querySelector('.cell-letter');
            if(l){l.textContent='';gridData[nr][nc].letter=null}
        }
        highlightSelection();
    }
}
/* رجوع مع تخطي الخلايا المحلولة */
function moveToPrevSkipCorrect(){
    if(!selCell)return;
    var dr=selDir==='down'?-1:0,dc=selDir==='across'?-1:0;
    var nr=selCell.r+dr,nc=selCell.c+dc;
    while(nr>=0&&nr<gridH&&nc>=0&&nc<gridW&&gridData[nr][nc].answer){
        var c=getCell(nr,nc);
        if(c&&!c.classList.contains('correct')){
            selCell={r:nr,c:nc};highlightSelection();return;
        }
        nr+=dr;nc+=dc;
    }
}

function onKeyDown(e){
    if(wait||!selCell)return;
    if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();doDelete();return}
    if(e.key==='ArrowRight'){e.preventDefault();selDir='across';highlightSelection();return}
    if(e.key==='ArrowDown'){e.preventDefault();selDir='down';highlightSelection();return}
    if(e.key==='ArrowLeft'){e.preventDefault();moveToPrev();return}
    if(e.key==='ArrowUp'){e.preventDefault();selDir='down';moveToPrev();return}
    if(e.key==='Enter'){e.preventDefault();checkAll();return}
    if(e.key==='Tab'){e.preventDefault();selDir=selDir==='across'?'down':'across';highlightSelection();return}
    /* الحروف تُعالج من onInput */
}

/* ══════ التحقق ══════ */
function checkWordAtCell(r,c){
    var wids=gridData[r][c].wordIds;
    for(var i=0;i<wids.length;i++){
        var wi=wids[i];if(solvedWords.indexOf(wi)>=0)continue;
        var p=placed[wi],ok=true;
        for(var j=0;j<p.word.length;j++){var wr=p.row+(p.dir==='down'?j:0),wc=p.col+(p.dir==='across'?j:0);var lt=gridData[wr][wc].letter;if(!lt||normChar(lt)!==normChar(p.word[j])){ok=false;break}}
        if(ok){solvedWords.push(wi);markSolved(wi);snd('ok');updateProgress();
            if(solvedWords.length>=placed.length){wait=true;setTimeout(function(){post({type:'answer',answer:originalAnswer})},700)}}
    }
}

function checkAll(){
    if(wait)return;
    for(var i=0;i<placed.length;i++){
        if(solvedWords.indexOf(i)>=0)continue;
        var p=placed[i],comp=true,corr=true;
        for(var j=0;j<p.word.length;j++){var wr=p.row+(p.dir==='down'?j:0),wc=p.col+(p.dir==='across'?j:0);var lt=gridData[wr][wc].letter;if(!lt){comp=false;break}if(normChar(lt)!==normChar(p.word[j]))corr=false}
        if(comp&&corr){solvedWords.push(i);markSolved(i);snd('ok')}
        else if(comp&&!corr){shakeWord(i);snd('no')}
    }
    updateProgress();
    if(solvedWords.length>=placed.length){wait=true;setTimeout(function(){post({type:'answer',answer:originalAnswer})},700)}
}

function markSolved(wi){
    var p=placed[wi];
    for(var j=0;j<p.word.length;j++){var wr=p.row+(p.dir==='down'?j:0),wc=p.col+(p.dir==='across'?j:0);var cell=getCell(wr,wc);if(cell){cell.classList.add('correct','pop');cell.classList.remove('selected','highlighted');var le=cell.querySelector('.cell-letter');if(le)le.textContent=p.word[j];gridData[wr][wc].letter=p.word[j]}}
    var cl=document.querySelector('.clue-item[data-wi="'+wi+'"]');if(cl)cl.classList.add('solved');
    setTimeout(function(){for(var k=0;k<placed.length;k++){if(solvedWords.indexOf(k)<0){selCell={r:placed[k].row,c:placed[k].col};selDir=placed[k].dir;highlightSelection();break}}},150);
}

function shakeWord(wi){var p=placed[wi];for(var j=0;j<p.word.length;j++){var wr=p.row+(p.dir==='down'?j:0),wc=p.col+(p.dir==='across'?j:0);var c=getCell(wr,wc);if(c&&!c.classList.contains('correct')){c.style.animation='none';c.offsetHeight;c.style.animation='shake .4s ease'}}}

function updateProgress(){var t=placed.length,d=solvedWords.length;ctr.textContent=d+'/'+t;progFill.style.width=(t>0?(d/t)*100:0)+'%'}

/* ══════ النتيجة ══════ */
function showRes(ok,dup,coins){
    var txt=lang==='ar'?{y:'أحسنت!',n:'حاول مرة أخرى',d:'أجبت من قبل'}:{y:'Well done!',n:'Try again',d:'Already answered'};
    rI.textContent=ok?'✓':'✗';rI.className='result-icon '+(ok?'ok':'no');
    rT.textContent=dup?txt.d:(ok?txt.y:txt.n);rT.className='result-title '+(ok?'ok':'no');
    var glow=document.querySelector('.result-glow');if(glow)glow.style.background=ok?'#22c55e':'#ef4444';
    if(ok&&!dup&&typeof coins==='number'){rE.textContent='+'+coins;rC.classList.remove('hidden')}else{rC.classList.add('hidden')}
    show(S2);
}

/* ══════ Resize ══════ */
function onResize(){
    if(!gridData||wait)return;renderGrid();
    for(var r=0;r<gridH;r++){for(var c=0;c<gridW;c++){if(gridData[r][c].letter){var cell=getCell(r,c);if(cell){var le=cell.querySelector('.cell-letter');if(le)le.textContent=gridData[r][c].letter}}}}
    for(var i=0;i<solvedWords.length;i++){var p=placed[solvedWords[i]];for(var j=0;j<p.word.length;j++){var wr=p.row+(p.dir==='down'?j:0),wc=p.col+(p.dir==='across'?j:0);var cell=getCell(wr,wc);if(cell)cell.classList.add('correct')}}
    if(selCell)highlightSelection();
}

/* ══════ صوت ══════ */
function initAC(){if(ac)return;try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}
function snd(type){if(!sndOn||!ac)return;try{if(ac.state==='suspended')ac.resume();if(type==='sel'){var n=Date.now();if(n-lastSnd<120)return;lastSnd=n;bip(500,'sine',0.03,0.04)}else if(type==='ok'){bip(523,'sine',0.05,0.1,0);bip(659,'sine',0.05,0.1,0.1);bip(784,'sine',0.05,0.12,0.2);bip(1047,'sine',0.04,0.15,0.3)}else if(type==='no'){bip(200,'sawtooth',0.03,0.12);bip(180,'sawtooth',0.03,0.12,0.12)}}catch(e){}}
function bip(f,tp,v,dur,dl){dl=dl||0;var o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=tp;o.frequency.value=f;var t=ac.currentTime+dl;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.start(t);o.stop(t+dur);o.onended=function(){g.disconnect();o.disconnect()}}

/* shake keyframe */
(function(){var s=document.createElement('style');s.textContent='@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}';document.head.appendChild(s)})();

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
