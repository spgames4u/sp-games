(function(){
'use strict';

/* ══════════════════════════════════════
   أغاني سكور بوينت - Song Quiz
   ScoreLand Game v1
   ══════════════════════════════════════ */

var lang = 'ar';
var wait = true, curQ = null, originalAnswer = '';
var questions = []; // [{text, answer}]
var videoReady = false;

var $ = function(id) { return document.getElementById(id) };
var S0 = $('S0'), S1 = $('S1'), S2 = $('S2');
var qT = $('qTitle');
var rI = $('resIcon'), rT = $('resTitle'), rC = $('resCoins'), rE = $('resAmt'), rN = $('resNext');

/* ══════ النصوص ══════ */
var T = {
    ar: {
        loading: 'جاري التحميل...',
        correct: 'أحسنت! 🎉',
        wrong: 'حاول مرة أخرى',
        already: 'أجبت من قبل',
        nextQ: 'السؤال التالي...',
        listen: '🎧 استمع جيداً.. كم مرة تم ذكر:',
        check: 'تحقق',
        wrongAnswer: 'الإجابة غير صحيحة، حاول مرة أخرى! 🎧',
        fillAll: 'أدخل جميع الإجابات'
    },
    en: {
        loading: 'Loading...',
        correct: 'Well done! 🎉',
        wrong: 'Try again',
        already: 'Already answered',
        nextQ: 'Next question...',
        listen: '🎧 Listen carefully.. How many times was mentioned:',
        check: 'Check',
        wrongAnswer: 'Wrong answer, try again! 🎧',
        fillAll: 'Fill in all answers'
    }
};

/* ══════ التهيئة ══════ */
function init() {
    var p = new URLSearchParams(location.search);
    lang = p.get('lang') || 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    applyLang();
    initVideo();
    $('checkBtn').onclick = checkAnswers;
    window.addEventListener('message', onMsg);

    /* ✅ إرسال ready كل 500ms حتى يوصل سؤال */
    var readyTimer = setInterval(function() { post({type: 'ready'}) }, 500);
    window.addEventListener('message', function once(e) {
        if (e.data && e.data.type === 'question') {
            clearInterval(readyTimer);
            window.removeEventListener('message', once);
        }
    });
    post({type: 'ready'});
}

function applyLang() {
    var t = T[lang];
    $('loadTxt').textContent = t.loading;
    $('resNext').textContent = t.nextQ;
    $('listenLabel').textContent = t.listen;
    $('checkBtn').textContent = t.check;
}

function show(s) { S0.classList.remove('on'); S1.classList.remove('on'); S2.classList.remove('on'); s.classList.add('on'); }
function onMsg(e) { var d = e.data; if (!d || !d.type) return; if (d.type === 'question') loadQ(d.data); else if (d.type === 'result') showRes(d.isCorrect, d.alreadyAnswered, d.earnedLandCoin); }
function post(d) { if (window.parent !== window) window.parent.postMessage(d, '*'); }

/* ══════ تحميل سؤال ══════ */
function loadQ(d) {
    curQ = d;
    wait = false;

    /* حفظ الإجابة الأصلية (field3 كامل) */
    originalAnswer = d.field3 || '';

    /* عنوان الأغنية */
    var title = lang === 'ar' ? d.field1 : (d.field1En || d.field1);
    qT.textContent = title || '';

    /* تحميل الفيديو */
    var songFile = (d.field2 || '01').trim();
    loadVideo(songFile);

    /* تحليل الأسئلة من field3, field4, field5 */
    questions = [];
    parseQuestion(lang === 'ar' ? d.field3 : (d.field3En || d.field3));
    parseQuestion(lang === 'ar' ? d.field4 : (d.field4En || d.field4));
    parseQuestion(lang === 'ar' ? d.field5 : (d.field5En || d.field5));

    renderQuestions();
    show(S1);
}

function parseQuestion(raw) {
    if (!raw || !raw.trim()) return;
    var parts = raw.split('-');
    if (parts.length < 2) return;
    var answer = parts[parts.length - 1].trim();
    var text = parts.slice(0, parts.length - 1).join('-').trim();
    if (text && answer) {
        questions.push({ text: text, answer: answer });
    }
}

function renderQuestions() {
    var list = $('questionsList');
    list.innerHTML = '';
    for (var i = 0; i < questions.length; i++) {
        var row = document.createElement('div');
        row.className = 'q-row';
        row.setAttribute('data-idx', i);
        row.innerHTML = '<span class="q-num">' + (i + 1) + '</span>' +
            '<span class="q-text">' + escHtml(questions[i].text) + '</span>' +
            '<input type="number" class="q-input" data-idx="' + i + '" inputmode="numeric" pattern="[0-9]*" autocomplete="off">';
        list.appendChild(row);
    }
    /* ربط Enter بالتحقق */
    var inputs = list.querySelectorAll('.q-input');
    for (var j = 0; j < inputs.length; j++) {
        inputs[j].addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); checkAnswers(); }
        });
    }
}

function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

/* ══════ التحقق من الإجابات ══════ */
function checkAnswers() {
    if (wait) return;
    var t = T[lang];
    var inputs = document.querySelectorAll('.q-input');
    var rows = document.querySelectorAll('.q-row');

    /* تأكد من ملء الكل */
    var allFilled = true;
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].value.trim() === '') { allFilled = false; break; }
    }
    if (!allFilled) { showToast(t.fillAll, 'info'); return; }

    /* تحقق */
    var allCorrect = true;
    for (var j = 0; j < questions.length; j++) {
        var userVal = inputs[j].value.trim();
        var correctVal = questions[j].answer.trim();
        if (userVal !== correctVal) { allCorrect = false; }
    }

    if (allCorrect) {
        /* كل الإجابات صحيحة */
        for (var k = 0; k < rows.length; k++) {
            rows[k].classList.remove('wrong');
            rows[k].classList.add('correct');
            inputs[k].disabled = true;
        }
        $('checkBtn').disabled = true;
        snd('ok');
        wait = true;
        setTimeout(function() {
            post({ type: 'answer', answer: originalAnswer });
        }, 600);
    } else {
        /* إجابة خاطئة - بدون كشف أي وحدة */
        for (var m = 0; m < rows.length; m++) {
            rows[m].classList.remove('wrong', 'correct');
        }
        /* هز كل الأسئلة */
        setTimeout(function() {
            for (var n = 0; n < rows.length; n++) {
                rows[n].classList.add('wrong');
            }
        }, 10);
        showToast(t.wrongAnswer, 'error');
        snd('no');
        /* إزالة الكلاس بعد الأنيميشن */
        setTimeout(function() {
            for (var r = 0; r < rows.length; r++) {
                rows[r].classList.remove('wrong');
            }
        }, 500);
    }
}

/* ══════ مشغل الفيديو ══════ */
var video, speeds = [0.5, 0.75, 1, 1.25, 1.5, 2], speedIdx = 2;
var isDragging = false;

function initVideo() {
    video = $('videoPlayer');

    /* أزرار التحكم */
    $('playBigBtn').onclick = togglePlay;
    $('playPauseBtn').onclick = togglePlay;
    $('videoOverlay').onclick = function(e) { if (e.target === this || e.target === $('playBigBtn') || e.target.closest('.play-big-btn')) togglePlay(); };
    $('speedBtn').onclick = cycleSpeed;
    $('volBtn').onclick = toggleMute;
    $('volSlider').oninput = function() { video.volume = this.value / 100; updateVolIcon(); };
    $('fullscreenBtn').onclick = toggleFullscreen;

    /* Progress seek */
    var track = $('progressTrack');
    track.addEventListener('mousedown', startSeek);
    track.addEventListener('touchstart', startSeek, {passive: false});

    /* أحداث الفيديو */
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', function() { videoReady = true; updateProgress(); });
    video.addEventListener('play', updatePlayState);
    video.addEventListener('pause', updatePlayState);
    video.addEventListener('ended', function() { updatePlayState(); $('videoOverlay').classList.remove('hide'); });
    video.addEventListener('click', togglePlay);

    /* Volume init */
    video.volume = 0.8;
}

function loadVideo(fileName) {
    videoReady = false;
    video.pause();
    $('videoSrc').src = 'song/' + fileName + '.mp4';
    video.load();
    $('videoOverlay').classList.remove('hide');
    updatePlayState();
    speedIdx = 2;
    video.playbackRate = 1;
    $('speedBtn').textContent = '1x';
    $('progressPlayed').style.width = '0';
    $('progressHandle').style.left = '0';
    $('timeDisplay').textContent = '0:00 / 0:00';
}

function togglePlay() {
    initAC();
    if (video.paused || video.ended) {
        video.play().catch(function() {});
        $('videoOverlay').classList.add('hide');
    } else {
        video.pause();
    }
}

function updatePlayState() {
    var playing = !video.paused && !video.ended;
    var iconPlay = $('playPauseBtn').querySelector('.icon-play');
    var iconPause = $('playPauseBtn').querySelector('.icon-pause');
    if (playing) {
        iconPlay.classList.add('hidden');
        iconPause.classList.remove('hidden');
    } else {
        iconPlay.classList.remove('hidden');
        iconPause.classList.add('hidden');
    }
}

function updateProgress() {
    if (isDragging || !videoReady) return;
    var cur = video.currentTime || 0;
    var dur = video.duration || 0;
    var pct = dur > 0 ? (cur / dur) * 100 : 0;
    $('progressPlayed').style.width = pct + '%';
    $('progressHandle').style.left = pct + '%';
    $('timeDisplay').textContent = fmtTime(cur) + ' / ' + fmtTime(dur);
}

function fmtTime(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function startSeek(e) {
    e.preventDefault();
    isDragging = true;
    $('progressTrack').classList.add('dragging');
    seekTo(e);
    document.addEventListener('mousemove', seekTo);
    document.addEventListener('mouseup', endSeek);
    document.addEventListener('touchmove', seekTo, {passive: false});
    document.addEventListener('touchend', endSeek);
}

function seekTo(e) {
    var track = $('progressTrack');
    var rect = track.getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var pct = (clientX - rect.left) / rect.width;
    /* RTL flip */
    if (document.documentElement.dir === 'rtl') { pct = 1 - pct; }
    pct = Math.max(0, Math.min(1, pct));
    $('progressPlayed').style.width = (pct * 100) + '%';
    $('progressHandle').style.left = (pct * 100) + '%';
    if (video.duration) {
        video.currentTime = pct * video.duration;
    }
}

function endSeek() {
    isDragging = false;
    $('progressTrack').classList.remove('dragging');
    document.removeEventListener('mousemove', seekTo);
    document.removeEventListener('mouseup', endSeek);
    document.removeEventListener('touchmove', seekTo);
    document.removeEventListener('touchend', endSeek);
}

function cycleSpeed() {
    speedIdx = (speedIdx + 1) % speeds.length;
    video.playbackRate = speeds[speedIdx];
    $('speedBtn').textContent = speeds[speedIdx] + 'x';
}

function toggleMute() {
    video.muted = !video.muted;
    updateVolIcon();
}

function updateVolIcon() {
    var muted = video.muted || video.volume === 0;
    $('volBtn').querySelector('.icon-vol').classList.toggle('hidden', muted);
    $('volBtn').querySelector('.icon-mute').classList.toggle('hidden', !muted);
    if (!video.muted) { $('volSlider').value = Math.round(video.volume * 100); }
}

function toggleFullscreen() {
    var container = $('videoContainer');
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (container.requestFullscreen) container.requestFullscreen();
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
        else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); /* iOS */
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
}

/* ══════ Toast ══════ */
var toastTimer = null;
function showToast(msg, type) {
    var box = $('toastBox');
    box.innerHTML = '<div class="toast ' + (type || '') + '">' + msg + '</div>';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { box.innerHTML = ''; }, 2000);
}

/* ══════ النتيجة ══════ */
function showRes(ok, dup, coins) {
    var t = T[lang];
    rI.textContent = ok ? '✓' : '✗';
    rI.className = 'result-icon ' + (ok ? 'ok' : 'no');
    rT.textContent = dup ? t.already : (ok ? t.correct : t.wrong);
    rT.className = 'result-title ' + (ok ? 'ok' : 'no');
    var glow = document.querySelector('.result-glow');
    if (glow) glow.style.background = ok ? '#22c55e' : '#ef4444';
    if (ok && !dup && typeof coins === 'number') {
        rE.textContent = '+' + coins;
        rC.classList.remove('hidden');
    } else {
        rC.classList.add('hidden');
    }
    /* وقف الفيديو */
    if (video) video.pause();
    show(S2);
}

/* ══════ صوت (Web Audio API) ══════ */
var ac = null;
function initAC() { if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
function bip(f, tp, v, dur, dl) {
    dl = dl || 0;
    var o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = tp; o.frequency.value = f;
    var t = ac.currentTime + dl;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur);
    o.onended = function() { g.disconnect(); o.disconnect(); };
}
function snd(type) {
    if (!ac) return;
    try {
        if (ac.state === 'suspended') ac.resume();
        if (type === 'ok') {
            bip(523,'sine',0.05,0.1,0); bip(659,'sine',0.05,0.1,0.1);
            bip(784,'sine',0.05,0.12,0.2); bip(1047,'sine',0.04,0.15,0.3);
        } else if (type === 'no') {
            bip(200,'sawtooth',0.03,0.12); bip(180,'sawtooth',0.03,0.12,0.12);
        }
    } catch(e) {}
}

/* ══════ Start ══════ */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
