var timeInterval = 60;
var timeVideo = 0;
var adSetVedioCall = null;
setInterval(function () {
    if (timeInterval > 0) {
        timeInterval--;
    }
    if (timeVideo > 0) {
        timeVideo--;
    }
}, 1000)
function adSetInter() {
    console.log('=========播放插屏')
    if (timeInterval > 0) {
        console.log("时间间隔未到" + timeInterval);
        return;
    }
    console.log('=========播放插屏成功');
    timeInterval = 60;
    window.parent.postMessage({ "type": 1 }, '*');
}
//视频广告
function adSetVideo(call) {
    console.log('播放视频');
    if (timeVideo > 0) {
        console.log("视频时间间隔未到" + timeVideo);
        call(false);
        showAdTips();
        return;
    }
    timeVideo = 10;
    adSetVedioCall = call;
    window.parent.postMessage({ "type": 2 }, '*');
}
var canShowTips = true;
function showAdTips() {
    if (!canShowTips) return;
    canShowTips = false;
    document.getElementById("adTips").style.display = "block";
    setTimeout(function () {
        canShowTips = true;
        document.getElementById("adTips").style.display = "none";
    }, 1500)
}
window.addEventListener("message", (e) => {
    console.log(e.data)
    if (e.data == 1) {
        if (adSetVedioCall) adSetVedioCall(true);
    } else {
        showAdTips();
        if (adSetVedioCall) adSetVedioCall(false);
    }
    adSetVedioCall = null;
});