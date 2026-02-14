(function(){
'use strict';

/* ══════════════════════════════════════
   الكلمات المتقاطعة - ScoreLand Crossword
   ══════════════════════════════════════ */

/* ── حروف ── */
var AR_KEYS=[
    ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج'],
    ['ش','س','ي','ب','ل','ا','ت','ن','م','ك'],
    ['ئ','ء','ؤ','ر','لا','ى','ة','و','ز','د','ذ','ط','ظ']
];
var EN_KEYS=[
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M']
];

/* ── حالة ── */
var lang='ar', sndOn=true, ac=null, lastSnd=0;
var words=[], clues=[], placed=[], gridData=null;
var gridW=0, gridH=0;
var selCell=null, selDir='across', solvedWords=[];
var wait=true, curQ=null;

/* ── DOM ── */
var $=function(id){return document.getElementById(id)};
var S0=$('S0'),S1=$('S1'),S2=$('S2');
var qT=$('qTitle'),ctr=$('ctr'),grid=$('grid');
var progFill=$('progressFill'),sBtn=$('sndBtn');
var acClues=$('acrossClues'),dnClues=$('downClues');
var kb=$('keyboard'),cluesPanel=$('cluesPanel');
var rI=$('resIcon'),rT=$('resTitle'),rC=$('resCoins'),rE=$('resAmt'),rN=$('resNext');

/* ══════════════════
   التهيئة
   ══════════════════ */
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
    sBtn.onclick=function(){
        sndOn=!sndOn;
        sBtn.classList.toggle('off',!sndOn);
    };
    buildKeyboard();
    document.addEventListener('keydown',onKeyDown);
    window.addEventListener('message',onMsg);
    window.addEventListener('resize',onResize);
    post({type:'ready'});
}

/* ── الشاشات ── */
function show(s){
    S0.classList.remove('on');
    S1.classList.remove('on');
    S2.classList.remove('on');
    s.classList.add('on');
}

/* ── رسائل ── */
function onMsg(e){
    var d=e.data;
    if(!d||!d.type)return;
    if(d.type==='question')loadQ(d.data);
    else if(d.type==='result')showRes(d.isCorrect,d.alreadyAnswered,d.earnedLandCoin);
}
function post(d){if(window.parent!==window)window.parent.postMessage(d,'*')}

/* ══════════════════
   تحميل سؤال
   ══════════════════ */
function loadQ(d){
    curQ=d; wait=false; solvedWords=[]; selCell=null;
    
    /* field1 = العنوان, field2 = الكلمات, field3 = التلميحات */
    qT.textContent=d.field1||'الكلمات المتقاطعة';
    
    var sep=/[،,]/;
    words=(d.field2||'').split(sep).map(function(w){return w.trim().replace(/\s/g,'')}).filter(function(w){return w.length>0});
    clues=(d.field3||'').split(sep).map(function(c){return c.trim()}).filter(function(c){return c.length>0});
    
    /* ضمان تطابق عدد التلميحات مع الكلمات */
    while(clues.length<words.length)clues.push('...');
    
    if(words.length===0){
        post({type:'answer',answer:''});
        return;
    }
    
    generateCrossword();
    renderGrid();
    renderClues();
    updateProgress();
    buildKeyboard();
    show(S1);
    
    /* اختيار أول خلية */
    setTimeout(function(){
        selectFirstCell();
    },200);
}

/* ══════════════════
   توليد الكلمات المتقاطعة
   ══════════════════ */
function generateCrossword(){
    placed=[];
    var sorted=words.map(function(w,i){return{word:w,idx:i,len:w.length}})
                     .sort(function(a,b){return b.len-a.len});
    
    var best=null, bestScore=-1;
    
    for(var attempt=0;attempt<40;attempt++){
        var result=tryGenerate(sorted);
        if(result && result.placed.length>best?.placed.length){
            best=result;
            bestScore=result.placed.length;
            if(bestScore===words.length)break;
        }
    }
    
    if(!best||best.placed.length===0){
        /* Fallback: ضعها كلها أفقياً */
        best=fallbackLayout(sorted);
    }
    
    placed=best.placed;
    gridW=best.w;
    gridH=best.h;
    
    /* بناء الشبكة */
    gridData=[];
    for(var r=0;r<gridH;r++){
        gridData[r]=[];
        for(var c=0;c<gridW;c++){
            gridData[r][c]={letter:null,answer:null,wordIds:[],num:0};
        }
    }
    
    for(var i=0;i<placed.length;i++){
        var p=placed[i];
        for(var j=0;j<p.word.length;j++){
            var rr=p.row+(p.dir==='down'?j:0);
            var cc=p.col+(p.dir==='across'?j:0);
            if(rr>=0&&rr<gridH&&cc>=0&&cc<gridW){
                gridData[rr][cc].answer=p.word[j];
                gridData[rr][cc].wordIds.push(i);
            }
        }
    }
    
    /* ترقيم الخلايا */
    var num=1;
    for(var r=0;r<gridH;r++){
        for(var c=0;c<gridW;c++){
            if(!gridData[r][c].answer)continue;
            var needNum=false;
            for(var i=0;i<placed.length;i++){
                if(placed[i].row===r&&placed[i].col===c){needNum=true;placed[i].num=num}
            }
            if(needNum){gridData[r][c].num=num;num++}
        }
    }
}

function tryGenerate(sorted){
    var pl=[];
    var minR=0,maxR=0,minC=0,maxC=0;
    
    /* ضع أول كلمة أفقياً في المنتصف */
    var first=sorted[0];
    pl.push({word:first.word,idx:first.idx,row:0,col:0,dir:'across',num:0});
    maxC=first.len-1;
    
    /* حاول وضع بقية الكلمات */
    var remaining=sorted.slice(1);
    shuffleArray(remaining);
    
    for(var i=0;i<remaining.length;i++){
        var w=remaining[i];
        var bestP=null, bestIntersections=0;
        
        for(var pi=0;pi<pl.length;pi++){
            var existing=pl[pi];
            
            for(var ei=0;ei<existing.word.length;ei++){
                for(var wi=0;wi<w.word.length;wi++){
                    if(existing.word[ei]!==w.word[wi])continue;
                    
                    var newDir=existing.dir==='across'?'down':'across';
                    var nr,nc;
                    
                    if(newDir==='across'){
                        nr=existing.row+(existing.dir==='down'?ei:0);
                        nc=existing.col+(existing.dir==='across'?ei:0)-wi;
                    } else {
                        nr=existing.row+(existing.dir==='down'?ei:0)-wi;
                        nc=existing.col+(existing.dir==='across'?ei:0);
                    }
                    
                    if(canPlace(pl,w.word,nr,nc,newDir,minR,maxR,minC,maxC)){
                        var ints=countIntersections(pl,w.word,nr,nc,newDir);
                        if(ints>bestIntersections){
                            bestIntersections=ints;
                            bestP={word:w.word,idx:w.idx,row:nr,col:nc,dir:newDir,num:0};
                        }
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
    
    /* تعديل الإحداثيات لتبدأ من 0 */
    for(var i=0;i<pl.length;i++){
        pl[i].row-=minR;
        pl[i].col-=minC;
    }
    
    return{
        placed:pl,
        w:maxC-minC+1,
        h:maxR-minR+1
    };
}

function canPlace(pl,word,row,col,dir,minR,maxR,minC,maxC){
    for(var i=0;i<word.length;i++){
        var r=row+(dir==='down'?i:0);
        var c=col+(dir==='across'?i:0);
        
        var existing=getCellContent(pl,r,c);
        if(existing!==null && existing!==word[i])return false;
        
        /* تحقق من الجوار */
        if(existing===null){
            if(dir==='across'){
                var above=getCellContent(pl,r-1,c);
                var below=getCellContent(pl,r+1,c);
                if(above!==null||below!==null){
                    /* تحقق أنها ليست جزء من كلمة عمودية أخرى */
                    if(!isPartOfWord(pl,r-1,c,'down')&&above!==null)return false;
                    if(!isPartOfWord(pl,r+1,c,'down')&&below!==null)return false;
                }
            } else {
                var left=getCellContent(pl,r,c-1);
                var right=getCellContent(pl,r,c+1);
                if(left!==null||right!==null){
                    if(!isPartOfWord(pl,r,c-1,'across')&&left!==null)return false;
                    if(!isPartOfWord(pl,r,c+1,'across')&&right!==null)return false;
                }
            }
        }
    }
    
    /* تحقق من الخلايا قبل وبعد الكلمة */
    var beforeR=row-(dir==='down'?1:0);
    var beforeC=col-(dir==='across'?1:0);
    if(getCellContent(pl,beforeR,beforeC)!==null)return false;
    
    var afterR=row+(dir==='down'?word.length:0);
    var afterC=col+(dir==='across'?word.length:0);
    if(getCellContent(pl,afterR,afterC)!==null)return false;
    
    return true;
}

function getCellContent(pl,r,c){
    for(var i=0;i<pl.length;i++){
        var p=pl[i];
        for(var j=0;j<p.word.length;j++){
            var pr=p.row+(p.dir==='down'?j:0);
            var pc=p.col+(p.dir==='across'?j:0);
            if(pr===r&&pc===c)return p.word[j];
        }
    }
    return null;
}

function isPartOfWord(pl,r,c,dir){
    for(var i=0;i<pl.length;i++){
        if(pl[i].dir!==dir)continue;
        var p=pl[i];
        for(var j=0;j<p.word.length;j++){
            var pr=p.row+(p.dir==='down'?j:0);
            var pc=p.col+(p.dir==='across'?j:0);
            if(pr===r&&pc===c)return true;
        }
    }
    return false;
}

function countIntersections(pl,word,row,col,dir){
    var count=0;
    for(var i=0;i<word.length;i++){
        var r=row+(dir==='down'?i:0);
        var c=col+(dir==='across'?i:0);
        if(getCellContent(pl,r,c)===word[i])count++;
    }
    return count;
}

function fallbackLayout(sorted){
    var pl=[], row=0, maxW=0;
    for(var i=0;i<sorted.length;i++){
        var dir=i%2===0?'across':'down';
        if(dir==='across'){
            pl.push({word:sorted[i].word,idx:sorted[i].idx,row:row,col:0,dir:'across',num:0});
            maxW=Math.max(maxW,sorted[i].len);
            row++;
        } else {
            pl.push({word:sorted[i].word,idx:sorted[i].idx,row:row,col:0,dir:'down',num:0});
            row+=sorted[i].len;
        }
    }
    var maxH=0;
    for(var i=0;i<pl.length;i++){
        var endR=pl[i].row+(pl[i].dir==='down'?pl[i].word.length-1:0);
        var endC=pl[i].col+(pl[i].dir==='across'?pl[i].word.length-1:0);
        maxH=Math.max(maxH,endR);
        maxW=Math.max(maxW,endC);
    }
    return{placed:pl,w:maxW+1,h:maxH+1};
}

function shuffleArray(arr){
    for(var i=arr.length-1;i>0;i--){
        var j=Math.floor(Math.random()*(i+1));
        var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;
    }
}

/* ══════════════════
   رسم الشبكة
   ══════════════════ */
function renderGrid(){
    grid.innerHTML='';
    
    /* حساب الحجم المناسب */
    var maxGridW=Math.min(window.innerWidth-28,400);
    var maxGridH=window.innerHeight*0.38;
    var cellW=Math.floor((maxGridW-gridW*2)/gridW);
    var cellH=Math.floor((maxGridH-gridH*2)/gridH);
    var cs=Math.min(cellW,cellH,44);
    cs=Math.max(cs,26);
    
    document.documentElement.style.setProperty('--cell-size',cs+'px');
    grid.style.gridTemplateColumns='repeat('+gridW+',var(--cell-size))';
    grid.style.gridTemplateRows='repeat('+gridH+',var(--cell-size))';
    
    for(var r=0;r<gridH;r++){
        for(var c=0;c<gridW;c++){
            var cell=document.createElement('div');
            cell.className='cw-cell';
            cell.dataset.r=r;
            cell.dataset.c=c;
            
            if(!gridData[r][c].answer){
                cell.classList.add('blank');
            } else {
                cell.classList.add('active');
                
                if(gridData[r][c].num>0){
                    var numEl=document.createElement('span');
                    numEl.className='cell-num';
                    numEl.textContent=gridData[r][c].num;
                    cell.appendChild(numEl);
                }
                
                var letterEl=document.createElement('span');
                letterEl.className='cell-letter';
                letterEl.textContent='';
                cell.appendChild(letterEl);
                
                cell.addEventListener('click',mkCellClick(r,c));
            }
            
            grid.appendChild(cell);
        }
    }
}

function mkCellClick(r,c){
    return function(){
        if(wait)return;
        initAC();
        
        /* إذا ضغط على نفس الخلية، بدّل الاتجاه */
        if(selCell&&selCell.r===r&&selCell.c===c){
            var wids=gridData[r][c].wordIds;
            var dirs=[];
            for(var i=0;i<wids.length;i++){
                dirs.push(placed[wids[i]].dir);
            }
            if(dirs.indexOf('across')>=0&&dirs.indexOf('down')>=0){
                selDir=selDir==='across'?'down':'across';
            }
        } else {
            /* حدد الاتجاه بناءً على الكلمات في الخلية */
            var wids=gridData[r][c].wordIds;
            if(wids.length>0){
                var hasAcross=false,hasDown=false;
                for(var i=0;i<wids.length;i++){
                    if(placed[wids[i]].dir==='across')hasAcross=true;
                    if(placed[wids[i]].dir==='down')hasDown=true;
                }
                if(hasAcross&&!hasDown)selDir='across';
                else if(hasDown&&!hasAcross)selDir='down';
            }
        }
        
        selCell={r:r,c:c};
        highlightSelection();
        snd('sel');
    };
}

function highlightSelection(){
    /* إزالة كل التظليل */
    var cells=grid.querySelectorAll('.cw-cell');
    for(var i=0;i<cells.length;i++){
        cells[i].classList.remove('selected','highlighted');
    }
    /* إزالة التلميح النشط */
    var ci=document.querySelectorAll('.clue-item');
    for(var i=0;i<ci.length;i++)ci[i].classList.remove('active');
    
    if(!selCell)return;
    
    var cell=getCell(selCell.r,selCell.c);
    if(cell)cell.classList.add('selected');
    
    /* إيجاد الكلمة النشطة */
    var activeWordIdx=findActiveWord(selCell.r,selCell.c,selDir);
    if(activeWordIdx<0){
        /* جرب الاتجاه الآخر */
        selDir=selDir==='across'?'down':'across';
        activeWordIdx=findActiveWord(selCell.r,selCell.c,selDir);
    }
    
    if(activeWordIdx>=0){
        var p=placed[activeWordIdx];
        for(var j=0;j<p.word.length;j++){
            var hr=p.row+(p.dir==='down'?j:0);
            var hc=p.col+(p.dir==='across'?j:0);
            var hCell=getCell(hr,hc);
            if(hCell&&!(hr===selCell.r&&hc===selCell.c)){
                hCell.classList.add('highlighted');
            }
        }
        
        /* تظليل التلميح */
        var clueEl=document.querySelector('.clue-item[data-word-idx="'+activeWordIdx+'"]');
        if(clueEl){
            clueEl.classList.add('active');
            clueEl.scrollIntoView({behavior:'smooth',block:'nearest'});
        }
    }
}

function findActiveWord(r,c,dir){
    var wids=gridData[r][c].wordIds;
    for(var i=0;i<wids.length;i++){
        if(placed[wids[i]].dir===dir)return wids[i];
    }
    /* fallback */
    if(wids.length>0)return wids[0];
    return -1;
}

function selectFirstCell(){
    if(placed.length===0)return;
    var p=placed[0];
    selCell={r:p.row,c:p.col};
    selDir=p.dir;
    highlightSelection();
}

function getCell(r,c){
    return grid.querySelector('[data-r="'+r+'"][data-c="'+c+'"]');
}

/* ══════════════════
   رسم التلميحات
   ══════════════════ */
function renderClues(){
    acClues.innerHTML='';
    dnClues.innerHTML='';
    
    for(var i=0;i<placed.length;i++){
        var p=placed[i];
        var clueText=clues[p.idx]||'...';
        
        var item=document.createElement('div');
        item.className='clue-item';
        item.dataset.wordIdx=i;
        item.dataset.dir=p.dir;
        
        var numSpan=document.createElement('span');
        numSpan.className='clue-num';
        numSpan.textContent=p.num;
        
        var textSpan=document.createElement('span');
        textSpan.className='clue-text';
        textSpan.textContent=clueText;
        
        item.appendChild(numSpan);
        item.appendChild(textSpan);
        item.addEventListener('click',mkClueClick(i));
        
        if(p.dir==='across')acClues.appendChild(item);
        else dnClues.appendChild(item);
    }
}

function mkClueClick(idx){
    return function(){
        if(wait)return;
        var p=placed[idx];
        selCell={r:p.row,c:p.col};
        selDir=p.dir;
        highlightSelection();
        snd('sel');
    };
}

/* ══════════════════
   لوحة المفاتيح
   ══════════════════ */
function buildKeyboard(){
    kb.innerHTML='';
    var keys=lang==='ar'?AR_KEYS:EN_KEYS;
    
    for(var i=0;i<keys.length;i++){
        var row=document.createElement('div');
        row.className='kb-row';
        
        /* زر المسح في الصف الأخير */
        if(i===keys.length-1){
            var delBtn=document.createElement('button');
            delBtn.className='kb-key special del-key';
            delBtn.textContent='⌫';
            delBtn.addEventListener('click',function(){inputKey('del')});
            row.appendChild(delBtn);
        }
        
        for(var j=0;j<keys[i].length;j++){
            var btn=document.createElement('button');
            btn.className='kb-key';
            btn.textContent=keys[i][j];
            btn.addEventListener('click',mkKeyClick(keys[i][j]));
            row.appendChild(btn);
        }
        
        /* زر تأكيد في الصف الأخير */
        if(i===keys.length-1){
            var enterBtn=document.createElement('button');
            enterBtn.className='kb-key special enter-key';
            enterBtn.textContent=lang==='ar'?'تحقق':'Check';
            enterBtn.addEventListener('click',function(){checkAll()});
            row.appendChild(enterBtn);
        }
        
        kb.appendChild(row);
    }
}

function mkKeyClick(ch){
    return function(){inputKey(ch)};
}

function inputKey(ch){
    if(wait||!selCell)return;
    initAC();
    
    if(ch==='del'){
        /* مسح الحرف الحالي أو الرجوع */
        var cell=getCell(selCell.r,selCell.c);
        if(cell){
            var letterEl=cell.querySelector('.cell-letter');
            if(letterEl&&letterEl.textContent){
                letterEl.textContent='';
                gridData[selCell.r][selCell.c].letter=null;
                cell.classList.remove('correct');
            } else {
                moveToPrev();
            }
        }
        snd('sel');
        return;
    }
    
    /* إدخال حرف */
    var cell=getCell(selCell.r,selCell.c);
    if(!cell||cell.classList.contains('correct'))return;
    
    var letterEl=cell.querySelector('.cell-letter');
    if(letterEl){
        letterEl.textContent=ch;
        gridData[selCell.r][selCell.c].letter=ch;
        snd('sel');
        
        /* تحقق من الكلمة */
        checkWordAtCell(selCell.r,selCell.c);
        
        /* انتقل للخلية التالية */
        moveToNext();
    }
}

function moveToNext(){
    if(!selCell)return;
    var dr=selDir==='down'?1:0;
    var dc=selDir==='across'?1:0;
    var nr=selCell.r+dr;
    var nc=selCell.c+dc;
    
    if(nr>=0&&nr<gridH&&nc>=0&&nc<gridW&&gridData[nr][nc].answer){
        selCell={r:nr,c:nc};
        highlightSelection();
    }
}

function moveToPrev(){
    if(!selCell)return;
    var dr=selDir==='down'?-1:0;
    var dc=selDir==='across'?-1:0;
    var nr=selCell.r+dr;
    var nc=selCell.c+dc;
    
    if(nr>=0&&nr<gridH&&nc>=0&&nc<gridW&&gridData[nr][nc].answer){
        selCell={r:nr,c:nc};
        var cell=getCell(nr,nc);
        if(cell){
            var letterEl=cell.querySelector('.cell-letter');
            if(letterEl){
                letterEl.textContent='';
                gridData[nr][nc].letter=null;
                cell.classList.remove('correct');
            }
        }
        highlightSelection();
    }
}

/* ── كيبورد فيزيائي ── */
function onKeyDown(e){
    if(wait||!selCell)return;
    
    if(e.key==='Backspace'||e.key==='Delete'){
        e.preventDefault();
        inputKey('del');
        return;
    }
    if(e.key==='ArrowRight'){
        e.preventDefault();
        selDir='across';
        highlightSelection();
        return;
    }
    if(e.key==='ArrowDown'){
        e.preventDefault();
        selDir='down';
        highlightSelection();
        return;
    }
    if(e.key==='ArrowLeft'){
        e.preventDefault();
        moveToPrev();
        return;
    }
    if(e.key==='ArrowUp'){
        e.preventDefault();
        selDir='down';
        moveToPrev();
        return;
    }
    if(e.key==='Enter'){
        e.preventDefault();
        checkAll();
        return;
    }
    if(e.key==='Tab'){
        e.preventDefault();
        selDir=selDir==='across'?'down':'across';
        highlightSelection();
        return;
    }
    
    /* حرف عادي */
    var ch=e.key;
    if(ch.length===1){
        if(lang==='ar'&&/[\u0600-\u06FF]/.test(ch)){
            e.preventDefault();
            inputKey(ch);
        } else if(lang!=='ar'&&/[a-zA-Z]/.test(ch)){
            e.preventDefault();
            inputKey(ch.toUpperCase());
        }
    }
}

/* ══════════════════
   التحقق
   ══════════════════ */
function checkWordAtCell(r,c){
    var wids=gridData[r][c].wordIds;
    
    for(var i=0;i<wids.length;i++){
        var wi=wids[i];
        if(solvedWords.indexOf(wi)>=0)continue;
        
        var p=placed[wi];
        var complete=true, correct=true;
        
        for(var j=0;j<p.word.length;j++){
            var wr=p.row+(p.dir==='down'?j:0);
            var wc=p.col+(p.dir==='across'?j:0);
            var letter=gridData[wr][wc].letter;
            
            if(!letter){complete=false;correct=false;break}
            if(normalizeAr(letter)!==normalizeAr(p.word[j])){correct=false}
        }
        
        if(complete&&correct){
            solvedWords.push(wi);
            markWordSolved(wi);
            snd('ok');
            updateProgress();
            
            /* تحقق من إكمال كل الكلمات */
            if(solvedWords.length>=placed.length){
                wait=true;
                setTimeout(function(){
                    var sep=lang==='ar'?'، ':',';
                    post({type:'answer',answer:words.join(sep)});
                },800);
            }
        }
    }
}

function checkAll(){
    if(wait)return;
    
    for(var i=0;i<placed.length;i++){
        if(solvedWords.indexOf(i)>=0)continue;
        
        var p=placed[i];
        var complete=true, correct=true;
        
        for(var j=0;j<p.word.length;j++){
            var wr=p.row+(p.dir==='down'?j:0);
            var wc=p.col+(p.dir==='across'?j:0);
            var letter=gridData[wr][wc].letter;
            
            if(!letter){complete=false;break}
            if(normalizeAr(letter)!==normalizeAr(p.word[j]))correct=false;
        }
        
        if(complete&&correct){
            solvedWords.push(i);
            markWordSolved(i);
            snd('ok');
        } else if(complete&&!correct){
            /* تأثير خطأ */
            for(var j=0;j<p.word.length;j++){
                var wr=p.row+(p.dir==='down'?j:0);
                var wc=p.col+(p.dir==='across'?j:0);
                var cell=getCell(wr,wc);
                if(cell&&!cell.classList.contains('correct')){
                    cell.style.animation='none';
                    cell.offsetHeight;
                    cell.style.animation='shake .4s ease';
                }
            }
            snd('no');
        }
    }
    
    updateProgress();
    
    if(solvedWords.length>=placed.length){
        wait=true;
        setTimeout(function(){
            var sep=lang==='ar'?'، ':',';
            post({type:'answer',answer:words.join(sep)});
        },800);
    }
}

function markWordSolved(wi){
    var p=placed[wi];
    
    for(var j=0;j<p.word.length;j++){
        var wr=p.row+(p.dir==='down'?j:0);
        var wc=p.col+(p.dir==='across'?j:0);
        var cell=getCell(wr,wc);
        if(cell){
            cell.classList.add('correct','pop','word-complete');
            cell.classList.remove('selected','highlighted');
            var letterEl=cell.querySelector('.cell-letter');
            if(letterEl)letterEl.textContent=p.word[j];
            gridData[wr][wc].letter=p.word[j];
        }
    }
    
    /* وسم التلميح */
    var clueEl=document.querySelector('.clue-item[data-word-idx="'+wi+'"]');
    if(clueEl)clueEl.classList.add('solved');
    
    /* انتقل لأول كلمة غير محلولة */
    setTimeout(function(){
        for(var k=0;k<placed.length;k++){
            if(solvedWords.indexOf(k)<0){
                selCell={r:placed[k].row,c:placed[k].col};
                selDir=placed[k].dir;
                highlightSelection();
                break;
            }
        }
    },200);
}

function normalizeAr(ch){
    if(!ch)return'';
    ch=ch.replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
    return ch;
}

/* ══════════════════
   التقدم
   ══════════════════ */
function updateProgress(){
    var total=placed.length;
    var done=solvedWords.length;
    ctr.textContent=done+'/'+total;
    var pct=total>0?(done/total)*100:0;
    progFill.style.width=pct+'%';
}

/* ══════════════════
   النتيجة
   ══════════════════ */
function showRes(ok,dup,coins){
    var txt=lang==='ar'
        ?{y:'أحسنت! 🎉',n:'حاول مرة أخرى',d:'أجبت من قبل'}
        :{y:'Well done! 🎉',n:'Try again',d:'Already answered'};
    
    rI.textContent=ok?'✓':'✗';
    rI.className='result-icon '+(ok?'ok':'no');
    rT.textContent=dup?txt.d:(ok?txt.y:txt.n);
    rT.className='result-title '+(ok?'ok':'no');
    
    /* الوهج */
    var glow=document.querySelector('.result-glow');
    if(glow)glow.style.background=ok?'var(--emerald)':'var(--danger)';
    
    if(ok&&!dup&&typeof coins==='number'){
        rE.textContent='+'+coins;
        rC.classList.remove('hidden');
    } else {
        rC.classList.add('hidden');
    }
    show(S2);
}

/* ══════════════════
   Resize
   ══════════════════ */
function onResize(){
    if(!gridData||wait)return;
    renderGrid();
    
    /* إعادة ملء الحروف */
    for(var r=0;r<gridH;r++){
        for(var c=0;c<gridW;c++){
            if(gridData[r][c].letter){
                var cell=getCell(r,c);
                if(cell){
                    var letterEl=cell.querySelector('.cell-letter');
                    if(letterEl)letterEl.textContent=gridData[r][c].letter;
                }
            }
        }
    }
    
    /* إعادة التلوين */
    for(var i=0;i<solvedWords.length;i++){
        var p=placed[solvedWords[i]];
        for(var j=0;j<p.word.length;j++){
            var wr=p.row+(p.dir==='down'?j:0);
            var wc=p.col+(p.dir==='across'?j:0);
            var cell=getCell(wr,wc);
            if(cell)cell.classList.add('correct');
        }
    }
    
    if(selCell)highlightSelection();
}

/* ══════════════════
   صوت
   ══════════════════ */
function initAC(){if(ac)return;try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}
function snd(type){
    if(!sndOn||!ac)return;
    try{
        if(ac.state==='suspended')ac.resume();
        if(type==='sel'){
            var n=Date.now();if(n-lastSnd<120)return;lastSnd=n;
            bip(500,'sine',0.03,0.04);
        } else if(type==='ok'){
            bip(523,'sine',0.05,0.1,0);
            bip(659,'sine',0.05,0.1,0.1);
            bip(784,'sine',0.05,0.12,0.2);
            bip(1047,'sine',0.04,0.15,0.3);
        } else if(type==='no'){
            bip(200,'sawtooth',0.03,0.12);
            bip(180,'sawtooth',0.03,0.12,0.12);
        }
    }catch(e){}
}
function bip(f,tp,v,dur,dl){
    dl=dl||0;
    var o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);
    o.type=tp;o.frequency.value=f;
    var t=ac.currentTime+dl;
    g.gain.setValueAtTime(v,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.start(t);o.stop(t+dur);
    o.onended=function(){g.disconnect();o.disconnect()};
}

/* ── CSS للاهتزاز ── */
(function(){
    var s=document.createElement('style');
    s.textContent='@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}';
    document.head.appendChild(s);
})();

/* ── تشغيل ── */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();
