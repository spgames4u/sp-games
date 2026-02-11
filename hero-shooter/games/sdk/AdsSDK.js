/**
 * @version 3.0.0
 * @description 
 */
class AdsSDK {
    constructor(options = {}) {
       
        this.options = {
            adTest: options.adTest||false,

            adClient: options.adClient || 'ca-pub-9019520406029768',
       
            adIntervalTime: options.adIntervalTime || 60, 
            ...options
        };
          
        this.isLoadComplete = false;
        this.isOpen = false;
        this.adShowTime = new Date().getTime();
        this.isAdSDKLoaded = false;
        
        this._initAdSDK();
        
    }

    /**
     * init sdk
     * @private
     */
    _initAdSDK() {

        this._loadAdScript(() => {
            this.isAdSDKLoaded = true;
        });
    }

    /**
     * 
     * @private
     */
    _loadAdScript(callback) {
      
        const script = document.createElement('script');
        const head = document.head || document.getElementsByTagName('head')[0];
        script.async = true;

        callback = callback || function() {};

        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        
        script.setAttribute('data-ad-client', this.options.adClient);
        script.setAttribute('crossorigin', 'anonymous');
        script.setAttribute('data-ad-frequency-hint', this.options.adIntervalTime + 's');
        this.options.adTest&&script.setAttribute('data-adbreak-test', 'on');
        
        head?.appendChild(script);
        

        script.onload = () => {
            window.adsbygoogle = window.adsbygoogle || []; 
            window.adBreak = window.adConfig = function(o) {adsbygoogle.push(o);} 
            window.adConfig({preloadAdBreaks: 'on'});
            callback && callback();
        };
    }

    





    showAd(ad_type,success,failed){
        switch (ad_type) {
            case 'Interstitial':
                this.showInterstitialAd(success);
                break;

            case 'Reward':
                this.showRewardAd(success, failed);
                break;

            default:
                break;
        }
    }


    showInterstitialAd(success) {

        if (!window.adBreak) {
            window.adsbygoogle = window.adsbygoogle || [];
            window.adBreak = window.adConfig = function(o) {
                adsbygoogle.push(o);
            };
            window.adConfig({preloadAdBreaks: 'on'});
        }

        const lastShowAdTime = (new Date().getTime() - this.adShowTime) / 1000;
        
        console.log(lastShowAdTime);

        if (lastShowAdTime > this.options.adIntervalTime) {
            this.adShowTime = new Date().getTime();
            
            try {
                window.adBreak({
                    type: "next",
                    name: "next", 
                    adBreakDone: () => {
                        success && success();
                    },
                });
            } catch (error) {
                success && success();
            }
        } else {
            success && success();
        }
    }


    showRewardAd(success, failed) {
      
        console.log("showRewardAd");

        if (!window.adBreak) {
            window.adsbygoogle = window.adsbygoogle || [];
            window.adBreak = window.adConfig = function(o) {
                adsbygoogle.push(o);
            };
            window.adConfig({preloadAdBreaks: 'on'});
        }

        try {


            window.adBreak &&  window.adBreak({
                type: "reward",
                name: "reward",
                beforeReward: (showAdFn) => {
                    showAdFn();
                },
                adViewed: () => {
                    success && success();
                },
                adDismissed: () => {
                    console.log("adDismissed");
                },
                adBreakDone: (placementInfo) => {
                    if (placementInfo.breakStatus !== "viewed") {
                        failed && failed();
                    }
                },
        }); 
        } catch (error) {
            failed && failed();
        }
        

        if (!window.adBreak) {
            failed && failed();
        }
    }

    showGameLoadingCompleted() {
       
           if(this.isLoadComplete){
              return;
           }
           try {
               console.log("----uploadCYLoadComplete----");
             
               window.adBreak && window.adBreak({
                   type: "preroll",
                   name: "my_preroll",
                   adBreakDone: () => {},
               });
           } catch (e) {}
          
           this.isLoadComplete = true;
    }
}


if (typeof window !== 'undefined') {
    window.AdsSDK = AdsSDK;
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdsSDK;
}
