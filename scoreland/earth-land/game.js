(function(){
'use strict';

/* ══════════════════════════════════════
   Earth Land 🌍 - ScoreLand Geography Game
   v2 - Universal: Countries, Islands, Landmarks, Cities
   
   FIELD MAPPING:
   field1    = Location name (Arabic)
   field1En  = Location name (English)
   field2    = Coordinates "lat,lng" (from admin panel) — OR empty to use DB
   field3    = Custom radius in km (from admin panel) — OR empty for default
   field4    = Answer key (country code/name for server validation)
   field5    = Emoji icon override (optional, e.g. 🏝️ 🕌 🏔️)
   ══════════════════════════════════════ */

var lang='ar', sndOn=true, ac=null, lastSnd=0;
var map=null, tileLayer=null;
var curQ=null, target=null;
var guesses=[], guessMarkers=[], correctMarker=null, lineLayer=null;
var wait=true, found=false;
var DEFAULT_RADIUS=200;

var $=function(id){return document.getElementById(id)};
var S0=$('S0'),S1=$('S1'),S2=$('S2');
var qT=$('qTitle');
var countryName=$('countryName'),countryFlag=$('countryFlag');
var hintPanel=$('hintPanel'),hintDist=$('hintDist'),hintDir=$('hintDir'),hintLabel=$('hintLabel');
var dirArrow=$('dirArrow');
var clickHint=$('clickHint'),clickHintTxt=$('clickHintTxt');
var attemptsNum=$('attemptsNum');
var guessesBar=$('guessesBar');
var sBtn=$('sndBtn');
var rI=$('resIcon'),rT=$('resTitle'),rC=$('resCoins'),rE=$('resAmt'),rN=$('resNext');
var resInfo=$('resInfo');

/* ══════════════════════════════════════
   🌍 COUNTRY DATABASE (fallback when field2 is empty)
   ══════════════════════════════════════ */
var COUNTRIES=[
{code:'SA',name:'السعودية',nameEn:'Saudi Arabia',lat:23.8859,lng:45.0792,radius:350,flag:'🇸🇦'},
{code:'AE',name:'الإمارات',nameEn:'UAE',lat:23.4241,lng:53.8478,radius:120,flag:'🇦🇪'},
{code:'KW',name:'الكويت',nameEn:'Kuwait',lat:29.3117,lng:47.4818,radius:60,flag:'🇰🇼'},
{code:'QA',name:'قطر',nameEn:'Qatar',lat:25.3548,lng:51.1839,radius:40,flag:'🇶🇦'},
{code:'BH',name:'البحرين',nameEn:'Bahrain',lat:26.0667,lng:50.5577,radius:25,flag:'🇧🇭'},
{code:'OM',name:'عُمان',nameEn:'Oman',lat:21.4735,lng:55.9754,radius:200,flag:'🇴🇲'},
{code:'YE',name:'اليمن',nameEn:'Yemen',lat:15.5527,lng:48.5164,radius:200,flag:'🇾🇪'},
{code:'IQ',name:'العراق',nameEn:'Iraq',lat:33.2232,lng:43.6793,radius:200,flag:'🇮🇶'},
{code:'SY',name:'سوريا',nameEn:'Syria',lat:34.8021,lng:38.9968,radius:120,flag:'🇸🇾'},
{code:'JO',name:'الأردن',nameEn:'Jordan',lat:30.5852,lng:36.2384,radius:80,flag:'🇯🇴'},
{code:'LB',name:'لبنان',nameEn:'Lebanon',lat:33.8547,lng:35.8623,radius:40,flag:'🇱🇧'},
{code:'PS',name:'فلسطين',nameEn:'Palestine',lat:31.9522,lng:35.2332,radius:40,flag:'🇵🇸'},
{code:'EG',name:'مصر',nameEn:'Egypt',lat:26.8206,lng:30.8025,radius:300,flag:'🇪🇬'},
{code:'SD',name:'السودان',nameEn:'Sudan',lat:12.8628,lng:30.2176,radius:350,flag:'🇸🇩'},
{code:'LY',name:'ليبيا',nameEn:'Libya',lat:26.3351,lng:17.2283,radius:400,flag:'🇱🇾'},
{code:'TN',name:'تونس',nameEn:'Tunisia',lat:33.8869,lng:9.5375,radius:120,flag:'🇹🇳'},
{code:'DZ',name:'الجزائر',nameEn:'Algeria',lat:28.0339,lng:1.6596,radius:500,flag:'🇩🇿'},
{code:'MA',name:'المغرب',nameEn:'Morocco',lat:31.7917,lng:-7.0926,radius:250,flag:'🇲🇦'},
{code:'MR',name:'موريتانيا',nameEn:'Mauritania',lat:21.0079,lng:-10.9408,radius:350,flag:'🇲🇷'},
{code:'SO',name:'الصومال',nameEn:'Somalia',lat:5.1521,lng:46.1996,radius:300,flag:'🇸🇴'},
{code:'DJ',name:'جيبوتي',nameEn:'Djibouti',lat:11.8251,lng:42.5903,radius:40,flag:'🇩🇯'},
{code:'KM',name:'جزر القمر',nameEn:'Comoros',lat:-11.6455,lng:43.3333,radius:40,flag:'🇰🇲'},
{code:'TR',name:'تركيا',nameEn:'Turkey',lat:38.9637,lng:35.2433,radius:300,flag:'🇹🇷'},
{code:'IR',name:'إيران',nameEn:'Iran',lat:32.4279,lng:53.6880,radius:400,flag:'🇮🇷'},
{code:'PK',name:'باكستان',nameEn:'Pakistan',lat:30.3753,lng:69.3451,radius:350,flag:'🇵🇰'},
{code:'AF',name:'أفغانستان',nameEn:'Afghanistan',lat:33.9391,lng:67.7100,radius:250,flag:'🇦🇫'},
{code:'IN',name:'الهند',nameEn:'India',lat:20.5937,lng:78.9629,radius:500,flag:'🇮🇳'},
{code:'CN',name:'الصين',nameEn:'China',lat:35.8617,lng:104.1954,radius:600,flag:'🇨🇳'},
{code:'JP',name:'اليابان',nameEn:'Japan',lat:36.2048,lng:138.2529,radius:300,flag:'🇯🇵'},
{code:'KR',name:'كوريا الجنوبية',nameEn:'South Korea',lat:35.9078,lng:127.7669,radius:120,flag:'🇰🇷'},
{code:'KP',name:'كوريا الشمالية',nameEn:'North Korea',lat:40.3399,lng:127.5101,radius:120,flag:'🇰🇵'},
{code:'TH',name:'تايلاند',nameEn:'Thailand',lat:15.8700,lng:100.9925,radius:200,flag:'🇹🇭'},
{code:'VN',name:'فيتنام',nameEn:'Vietnam',lat:14.0583,lng:108.2772,radius:200,flag:'🇻🇳'},
{code:'MY',name:'ماليزيا',nameEn:'Malaysia',lat:4.2105,lng:101.9758,radius:200,flag:'🇲🇾'},
{code:'ID',name:'إندونيسيا',nameEn:'Indonesia',lat:-0.7893,lng:113.9213,radius:500,flag:'🇮🇩'},
{code:'PH',name:'الفلبين',nameEn:'Philippines',lat:12.8797,lng:121.7740,radius:250,flag:'🇵🇭'},
{code:'BD',name:'بنغلاديش',nameEn:'Bangladesh',lat:23.6850,lng:90.3563,radius:100,flag:'🇧🇩'},
{code:'MM',name:'ميانمار',nameEn:'Myanmar',lat:21.9162,lng:95.9560,radius:200,flag:'🇲🇲'},
{code:'NP',name:'نيبال',nameEn:'Nepal',lat:28.3949,lng:84.1240,radius:100,flag:'🇳🇵'},
{code:'LK',name:'سريلانكا',nameEn:'Sri Lanka',lat:7.8731,lng:80.7718,radius:80,flag:'🇱🇰'},
{code:'KZ',name:'كازاخستان',nameEn:'Kazakhstan',lat:48.0196,lng:66.9237,radius:500,flag:'🇰🇿'},
{code:'UZ',name:'أوزبكستان',nameEn:'Uzbekistan',lat:41.3775,lng:64.5853,radius:200,flag:'🇺🇿'},
{code:'GE',name:'جورجيا',nameEn:'Georgia',lat:42.3154,lng:43.3569,radius:80,flag:'🇬🇪'},
{code:'AZ',name:'أذربيجان',nameEn:'Azerbaijan',lat:40.1431,lng:47.5769,radius:80,flag:'🇦🇿'},
{code:'SG',name:'سنغافورة',nameEn:'Singapore',lat:1.3521,lng:103.8198,radius:20,flag:'🇸🇬'},
{code:'MN',name:'منغوليا',nameEn:'Mongolia',lat:46.8625,lng:103.8467,radius:400,flag:'🇲🇳'},
{code:'KH',name:'كمبوديا',nameEn:'Cambodia',lat:12.5657,lng:104.9910,radius:120,flag:'🇰🇭'},
{code:'LA',name:'لاوس',nameEn:'Laos',lat:19.8563,lng:102.4955,radius:120,flag:'🇱🇦'},
{code:'GB',name:'بريطانيا',nameEn:'United Kingdom',lat:55.3781,lng:-3.4360,radius:200,flag:'🇬🇧'},
{code:'FR',name:'فرنسا',nameEn:'France',lat:46.2276,lng:2.2137,radius:250,flag:'🇫🇷'},
{code:'DE',name:'ألمانيا',nameEn:'Germany',lat:51.1657,lng:10.4515,radius:200,flag:'🇩🇪'},
{code:'IT',name:'إيطاليا',nameEn:'Italy',lat:41.8719,lng:12.5674,radius:200,flag:'🇮🇹'},
{code:'ES',name:'إسبانيا',nameEn:'Spain',lat:40.4637,lng:-3.7492,radius:250,flag:'🇪🇸'},
{code:'PT',name:'البرتغال',nameEn:'Portugal',lat:39.3999,lng:-8.2245,radius:120,flag:'🇵🇹'},
{code:'NL',name:'هولندا',nameEn:'Netherlands',lat:52.1326,lng:5.2913,radius:60,flag:'🇳🇱'},
{code:'BE',name:'بلجيكا',nameEn:'Belgium',lat:50.5039,lng:4.4699,radius:50,flag:'🇧🇪'},
{code:'CH',name:'سويسرا',nameEn:'Switzerland',lat:46.8182,lng:8.2275,radius:60,flag:'🇨🇭'},
{code:'AT',name:'النمسا',nameEn:'Austria',lat:47.5162,lng:14.5501,radius:80,flag:'🇦🇹'},
{code:'SE',name:'السويد',nameEn:'Sweden',lat:60.1282,lng:18.6435,radius:250,flag:'🇸🇪'},
{code:'NO',name:'النرويج',nameEn:'Norway',lat:60.4720,lng:8.4689,radius:250,flag:'🇳🇴'},
{code:'FI',name:'فنلندا',nameEn:'Finland',lat:61.9241,lng:25.7482,radius:200,flag:'🇫🇮'},
{code:'DK',name:'الدنمارك',nameEn:'Denmark',lat:56.2639,lng:9.5018,radius:80,flag:'🇩🇰'},
{code:'PL',name:'بولندا',nameEn:'Poland',lat:51.9194,lng:19.1451,radius:180,flag:'🇵🇱'},
{code:'CZ',name:'التشيك',nameEn:'Czech Republic',lat:49.8175,lng:15.4730,radius:80,flag:'🇨🇿'},
{code:'GR',name:'اليونان',nameEn:'Greece',lat:39.0742,lng:21.8243,radius:120,flag:'🇬🇷'},
{code:'RO',name:'رومانيا',nameEn:'Romania',lat:45.9432,lng:24.9668,radius:150,flag:'🇷🇴'},
{code:'UA',name:'أوكرانيا',nameEn:'Ukraine',lat:48.3794,lng:31.1656,radius:250,flag:'🇺🇦'},
{code:'RU',name:'روسيا',nameEn:'Russia',lat:61.5240,lng:105.3188,radius:1200,flag:'🇷🇺'},
{code:'HU',name:'المجر',nameEn:'Hungary',lat:47.1625,lng:19.5033,radius:80,flag:'🇭🇺'},
{code:'IE',name:'أيرلندا',nameEn:'Ireland',lat:53.1424,lng:-7.6921,radius:80,flag:'🇮🇪'},
{code:'RS',name:'صربيا',nameEn:'Serbia',lat:44.0165,lng:21.0059,radius:80,flag:'🇷🇸'},
{code:'HR',name:'كرواتيا',nameEn:'Croatia',lat:45.1000,lng:15.2000,radius:80,flag:'🇭🇷'},
{code:'BG',name:'بلغاريا',nameEn:'Bulgaria',lat:42.7339,lng:25.4858,radius:80,flag:'🇧🇬'},
{code:'IS',name:'آيسلندا',nameEn:'Iceland',lat:64.9631,lng:-19.0208,radius:120,flag:'🇮🇸'},
{code:'AL',name:'ألبانيا',nameEn:'Albania',lat:41.1533,lng:20.1683,radius:50,flag:'🇦🇱'},
{code:'BA',name:'البوسنة',nameEn:'Bosnia',lat:43.9159,lng:17.6791,radius:60,flag:'🇧🇦'},
{code:'NG',name:'نيجيريا',nameEn:'Nigeria',lat:9.0820,lng:8.6753,radius:300,flag:'🇳🇬'},
{code:'ZA',name:'جنوب أفريقيا',nameEn:'South Africa',lat:-30.5595,lng:22.9375,radius:350,flag:'🇿🇦'},
{code:'KE',name:'كينيا',nameEn:'Kenya',lat:-0.0236,lng:37.9062,radius:200,flag:'🇰🇪'},
{code:'ET',name:'إثيوبيا',nameEn:'Ethiopia',lat:9.1450,lng:40.4897,radius:300,flag:'🇪🇹'},
{code:'GH',name:'غانا',nameEn:'Ghana',lat:7.9465,lng:-1.0232,radius:120,flag:'🇬🇭'},
{code:'TZ',name:'تنزانيا',nameEn:'Tanzania',lat:-6.3690,lng:34.8888,radius:250,flag:'🇹🇿'},
{code:'CD',name:'الكونغو',nameEn:'DR Congo',lat:-4.0383,lng:21.7587,radius:400,flag:'🇨🇩'},
{code:'CM',name:'الكاميرون',nameEn:'Cameroon',lat:7.3697,lng:12.3547,radius:200,flag:'🇨🇲'},
{code:'SN',name:'السنغال',nameEn:'Senegal',lat:14.4974,lng:-14.4524,radius:120,flag:'🇸🇳'},
{code:'ML',name:'مالي',nameEn:'Mali',lat:17.5707,lng:-3.9962,radius:350,flag:'🇲🇱'},
{code:'NE',name:'النيجر',nameEn:'Niger',lat:17.6078,lng:8.0817,radius:350,flag:'🇳🇪'},
{code:'TD',name:'تشاد',nameEn:'Chad',lat:15.4542,lng:18.7322,radius:350,flag:'🇹🇩'},
{code:'MG',name:'مدغشقر',nameEn:'Madagascar',lat:-18.7669,lng:46.8691,radius:250,flag:'🇲🇬'},
{code:'AO',name:'أنغولا',nameEn:'Angola',lat:-11.2027,lng:17.8739,radius:300,flag:'🇦🇴'},
{code:'MZ',name:'موزمبيق',nameEn:'Mozambique',lat:-18.6657,lng:35.5296,radius:250,flag:'🇲🇿'},
{code:'ZW',name:'زيمبابوي',nameEn:'Zimbabwe',lat:-19.0154,lng:29.1549,radius:150,flag:'🇿🇼'},
{code:'UG',name:'أوغندا',nameEn:'Uganda',lat:1.3733,lng:32.2903,radius:120,flag:'🇺🇬'},
{code:'RW',name:'رواندا',nameEn:'Rwanda',lat:-1.9403,lng:29.8739,radius:40,flag:'🇷🇼'},
{code:'CI',name:'ساحل العاج',nameEn:'Ivory Coast',lat:7.5400,lng:-5.5471,radius:150,flag:'🇨🇮'},
{code:'US',name:'أمريكا',nameEn:'United States',lat:37.0902,lng:-95.7129,radius:700,flag:'🇺🇸'},
{code:'CA',name:'كندا',nameEn:'Canada',lat:56.1304,lng:-106.3468,radius:800,flag:'🇨🇦'},
{code:'MX',name:'المكسيك',nameEn:'Mexico',lat:23.6345,lng:-102.5528,radius:400,flag:'🇲🇽'},
{code:'CU',name:'كوبا',nameEn:'Cuba',lat:21.5218,lng:-77.7812,radius:150,flag:'🇨🇺'},
{code:'GT',name:'غواتيمالا',nameEn:'Guatemala',lat:15.7835,lng:-90.2308,radius:80,flag:'🇬🇹'},
{code:'PA',name:'بنما',nameEn:'Panama',lat:8.5380,lng:-80.7821,radius:80,flag:'🇵🇦'},
{code:'CR',name:'كوستاريكا',nameEn:'Costa Rica',lat:9.7489,lng:-83.7534,radius:60,flag:'🇨🇷'},
{code:'JM',name:'جامايكا',nameEn:'Jamaica',lat:18.1096,lng:-77.2975,radius:40,flag:'🇯🇲'},
{code:'HN',name:'هندوراس',nameEn:'Honduras',lat:15.2000,lng:-86.2419,radius:80,flag:'🇭🇳'},
{code:'BR',name:'البرازيل',nameEn:'Brazil',lat:-14.2350,lng:-51.9253,radius:700,flag:'🇧🇷'},
{code:'AR',name:'الأرجنتين',nameEn:'Argentina',lat:-38.4161,lng:-63.6167,radius:500,flag:'🇦🇷'},
{code:'CO',name:'كولومبيا',nameEn:'Colombia',lat:4.5709,lng:-74.2973,radius:250,flag:'🇨🇴'},
{code:'CL',name:'تشيلي',nameEn:'Chile',lat:-35.6751,lng:-71.5430,radius:350,flag:'🇨🇱'},
{code:'PE',name:'بيرو',nameEn:'Peru',lat:-9.1900,lng:-75.0152,radius:300,flag:'🇵🇪'},
{code:'VE',name:'فنزويلا',nameEn:'Venezuela',lat:6.4238,lng:-66.5897,radius:250,flag:'🇻🇪'},
{code:'EC',name:'الإكوادور',nameEn:'Ecuador',lat:-1.8312,lng:-78.1834,radius:120,flag:'🇪🇨'},
{code:'BO',name:'بوليفيا',nameEn:'Bolivia',lat:-16.2902,lng:-63.5887,radius:250,flag:'🇧🇴'},
{code:'PY',name:'باراغواي',nameEn:'Paraguay',lat:-23.4425,lng:-58.4438,radius:150,flag:'🇵🇾'},
{code:'UY',name:'أوروغواي',nameEn:'Uruguay',lat:-32.5228,lng:-55.7658,radius:80,flag:'🇺🇾'},
{code:'AU',name:'أستراليا',nameEn:'Australia',lat:-25.2744,lng:133.7751,radius:700,flag:'🇦🇺'},
{code:'NZ',name:'نيوزيلندا',nameEn:'New Zealand',lat:-40.9006,lng:174.8860,radius:200,flag:'🇳🇿'},
{code:'FJ',name:'فيجي',nameEn:'Fiji',lat:-17.7134,lng:178.0650,radius:60,flag:'🇫🇯'},
{code:'PG',name:'بابوا غينيا',nameEn:'Papua New Guinea',lat:-6.3150,lng:143.9555,radius:200,flag:'🇵🇬'}
];

/* ══════ Lookup helpers ══════ */
var countryByCode={}, countryByName={}, countryByNameEn={};
(function(){
    for(var i=0;i<COUNTRIES.length;i++){
        var c=COUNTRIES[i];
        countryByCode[c.code.toUpperCase()]=c;
        countryByName[c.name]=c;
        countryByNameEn[c.nameEn.toLowerCase()]=c;
    }
    countryByNameEn['usa']=countryByCode['US'];
    countryByNameEn['uk']=countryByCode['GB'];
    countryByNameEn['united arab emirates']=countryByCode['AE'];
    countryByNameEn['korea']=countryByCode['KR'];
    countryByNameEn['congo']=countryByCode['CD'];
})();

function findCountryDB(str){
    if(!str) return null;
    str=str.trim();
    if(str.length<=3){ var bc=countryByCode[str.toUpperCase()]; if(bc) return bc; }
    var ba=countryByName[str]; if(ba) return ba;
    var be=countryByNameEn[str.toLowerCase()]; if(be) return be;
    var lower=str.toLowerCase();
    for(var i=0;i<COUNTRIES.length;i++){
        if(COUNTRIES[i].nameEn.toLowerCase().indexOf(lower)>=0) return COUNTRIES[i];
        if(COUNTRIES[i].name.indexOf(str)>=0) return COUNTRIES[i];
    }
    return null;
}

/* ══════ Parse coordinates from field2 ══════ */
function parseCoords(str){
    if(!str) return null;
    str=str.trim();
    var parts=str.split(/[,،\s]+/).map(function(s){return parseFloat(s.trim())});
    if(parts.length>=2 && !isNaN(parts[0]) && !isNaN(parts[1])){
        if(parts[0]>=-90 && parts[0]<=90 && parts[1]>=-180 && parts[1]<=180){
            return {lat:parts[0],lng:parts[1]};
        }
    }
    return null;
}

/* ══════ Detect icon for location type ══════ */
function detectIcon(name,nameEn,field5){
    /* field5 override */
    if(field5 && field5.trim()) return field5.trim();
    var n=((name||'')+(nameEn||'')).toLowerCase();
    var c=findCountryDB(name)||findCountryDB(nameEn);
    if(c) return c.flag;
    if(/جزيرة|جزر|island/i.test(n)) return '🏝️';
    if(/برج|tower|تمثال|statue/i.test(n)) return '🗼';
    if(/مسجد|mosque|كنيسة|church|كعبة|حرم|kaaba|أقصى/i.test(n)) return '🕌';
    if(/ملعب|stadium/i.test(n)) return '🏟️';
    if(/جبل|mount|قمة|peak|بركان|volcano/i.test(n)) return '🏔️';
    if(/شلال|waterfall|نهر|river|بحيرة|lake/i.test(n)) return '🌊';
    if(/قصر|palace|قلعة|castle/i.test(n)) return '🏰';
    if(/هرم|pyramid|أثر|ruins|معبد|temple/i.test(n)) return '🏛️';
    if(/حديقة|park|غابة|forest/i.test(n)) return '🌳';
    if(/مدينة|city|عاصمة|capital/i.test(n)) return '🏙️';
    if(/بحر|sea|محيط|ocean|خليج|gulf/i.test(n)) return '🌊';
    if(/صحراء|desert/i.test(n)) return '🏜️';
    return '📍';
}

/* ══════ Math Helpers ══════ */
function toRad(d){return d*Math.PI/180}
function toDeg(r){return r*180/Math.PI}

function haversine(lat1,lng1,lat2,lng2){
    var R=6371;
    var dLat=toRad(lat2-lat1);
    var dLng=toRad(lng2-lng1);
    var a=Math.sin(dLat/2)*Math.sin(dLat/2)+
          Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*
          Math.sin(dLng/2)*Math.sin(dLng/2);
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function bearing(lat1,lng1,lat2,lng2){
    var dLng=toRad(lng2-lng1);
    var y=Math.sin(dLng)*Math.cos(toRad(lat2));
    var x=Math.cos(toRad(lat1))*Math.sin(toRad(lat2))-
          Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(dLng);
    return (toDeg(Math.atan2(y,x))+360)%360;
}

function bearingToDir(b){
    if(lang==='ar'){
        if(b>=337.5||b<22.5)return'شمال ⬆';
        if(b<67.5)return'شمال شرق ↗';
        if(b<112.5)return'شرق ➡';
        if(b<157.5)return'جنوب شرق ↘';
        if(b<202.5)return'جنوب ⬇';
        if(b<247.5)return'جنوب غرب ↙';
        if(b<292.5)return'غرب ⬅';
        return'شمال غرب ↖';
    }
    if(b>=337.5||b<22.5)return'North ⬆';
    if(b<67.5)return'NE ↗';
    if(b<112.5)return'East ➡';
    if(b<157.5)return'SE ↘';
    if(b<202.5)return'South ⬇';
    if(b<247.5)return'SW ↙';
    if(b<292.5)return'West ⬅';
    return'NW ↖';
}

function formatDist(km){
    if(km<1) return(km*1000).toFixed(0)+(lang==='ar'?' متر':' m');
    if(km<100) return km.toFixed(1)+(lang==='ar'?' كم':' km');
    return Math.round(km).toLocaleString()+(lang==='ar'?' كم':' km');
}

function distClass(km, radius){
    var r=radius||DEFAULT_RADIUS;
    if(km<=r*3) return'hot';
    if(km<=r*10) return'warm';
    return'cold';
}

/* ══════ Sound ══════ */
function playTone(freq,dur,type){
    if(!sndOn) return;
    try{
        if(!ac) ac=new(window.AudioContext||window.webkitAudioContext)();
        var now=Date.now();
        if(now-lastSnd<80) return;
        lastSnd=now;
        var o=ac.createOscillator();
        var g=ac.createGain();
        o.type=type||'sine';
        o.frequency.value=freq;
        g.gain.setValueAtTime(0.15,ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
        o.connect(g);g.connect(ac.destination);
        o.start();o.stop(ac.currentTime+dur);
    }catch(e){}
}
function sndClick(){playTone(600,0.08)}
function sndWrong(){playTone(200,0.25,'square')}
function sndClose(){playTone(800,0.12)}
function sndCorrect(){
    playTone(523,0.15);
    setTimeout(function(){playTone(659,0.15)},120);
    setTimeout(function(){playTone(784,0.3)},240);
}

/* ══════ Init ══════ */
function init(){
    var p=new URLSearchParams(location.search);
    lang=p.get('lang')||'ar';
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';

    if(lang!=='ar'){
        $('loadTxt').textContent='Loading...';
        rN.textContent='Next question...';
        clickHintTxt.textContent='Click on the location';
    }

    sBtn.onclick=function(){sndOn=!sndOn;sBtn.classList.toggle('off',!sndOn)};
    initMap();
    window.addEventListener('message',onMsg);

    var readyTimer=setInterval(function(){post({type:'ready'})},500);
    window.addEventListener('message',function once(e){
        if(e.data&&e.data.type==='question'){clearInterval(readyTimer);window.removeEventListener('message',once)}
    });
    post({type:'ready'});
}

var TILE_VOYAGER='https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';
var TILE_VOYAGER_LABELS='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
var currentTileUrl='';

function initMap(){
    map=L.map('map',{
        center:[25,45],
        zoom:3,
        minZoom:2,
        maxZoom:18,
        zoomControl:true,
        attributionControl:false,
        worldCopyJump:true
    });

    currentTileUrl=TILE_VOYAGER;
    tileLayer=L.tileLayer(TILE_VOYAGER,{
        subdomains:'abcd',
        maxZoom:19
    }).addTo(map);

    map.on('click',onMapClick);
}

/* Switch tiles based on field6: "labels" = with names, anything else = no names */
function updateTiles(field6){
    var wantLabels=(field6||'').trim().toLowerCase()==='labels';
    var newUrl=wantLabels?TILE_VOYAGER_LABELS:TILE_VOYAGER;
    if(newUrl!==currentTileUrl){
        map.removeLayer(tileLayer);
        tileLayer=L.tileLayer(newUrl,{subdomains:'abcd',maxZoom:19}).addTo(map);
        currentTileUrl=newUrl;
    }
}

function show(s){S0.classList.remove('on');S1.classList.remove('on');S2.classList.remove('on');s.classList.add('on')}
function onMsg(e){
    var d=e.data;
    if(!d||!d.type)return;
    if(d.type==='question') loadQ(d.data);
    else if(d.type==='result') showRes(d.isCorrect===true,d.alreadyAnswered,d.earnedLandCoin);
    else if(d.type==='timeout'||d.type==='timeup'||d.type==='time-up') showRes(false,false,0);
}
function post(d){if(window.parent!==window)window.parent.postMessage(d,'*')}

/* ══════════════════════════════════════
   LOAD QUESTION - Universal Parser
   ══════════════════════════════════════
   🔵 Mode A: field2 has "lat,lng" → custom location (islands, landmarks, cities, etc.)
   🟢 Mode B: field2 empty → lookup field4/field1 in country database
   ══════════════════════════════════════ */
function loadQ(d){
    curQ=d;
    wait=false;
    found=false;
    guesses=[];
    clearMapLayers();

    target=null;
    var coords=parseCoords(d.field2)||parseCoords(d.field2En);
    var customRadius=parseInt(d.field3||d.field3En)||0;

    if(coords){
        /* ✅ MODE A: Custom coordinates from admin */
        var dbMatch=findCountryDB(d.field4)||findCountryDB(d.field1);
        target={
            name: d.field1||'',
            nameEn: d.field1En||d.field1||'',
            lat: coords.lat,
            lng: coords.lng,
            radius: customRadius>0 ? customRadius : (dbMatch ? dbMatch.radius : DEFAULT_RADIUS),
            flag: detectIcon(d.field1, d.field1En, d.field5||d.field5En)
        };
    } else {
        /* ✅ MODE B: Country database fallback */
        var country=findCountryDB(d.field4)||findCountryDB(d.field4En)||findCountryDB(d.field1)||findCountryDB(d.field1En);
        if(country){
            target={
                name: d.field1||country.name,
                nameEn: d.field1En||country.nameEn,
                lat: country.lat,
                lng: country.lng,
                radius: customRadius>0 ? customRadius : country.radius,
                flag: detectIcon(d.field1, d.field1En, d.field5||d.field5En)||country.flag
            };
        }
    }

    if(!target){
        post({type:'answer',answer:''});
        return;
    }

    /* ── Display ── */
    updateTiles(d.field6||d.field6En);
    qT.textContent=lang==='ar'?'أين يقع هذا المكان؟':'Where is this place?';
    countryName.textContent=lang==='ar'?target.name:target.nameEn;
    countryFlag.textContent=target.flag;

    attemptsNum.textContent='0';
    guessesBar.innerHTML='';

    hintPanel.classList.add('hidden');
    clickHint.classList.remove('hidden');
    hintLabel.textContent=lang==='ar'?'انقر على الخريطة!':'Click on the map!';

    /* Start zoom: wider for big targets, tighter view for small */
    var startZoom=2;
    map.setView([20,0],startZoom,{animate:true,duration:0.5});

    show(S1);
    setTimeout(function(){map.invalidateSize()},100);
}

function clearMapLayers(){
    for(var i=0;i<guessMarkers.length;i++) map.removeLayer(guessMarkers[i]);
    guessMarkers=[];
    if(correctMarker){map.removeLayer(correctMarker);correctMarker=null}
    if(lineLayer){map.removeLayer(lineLayer);lineLayer=null}
}

/* ══════ Map Click ══════ */
function onMapClick(e){
    if(wait||found||!target) return;

    var lat=e.latlng.lat;
    var lng=e.latlng.lng;
    var dist=haversine(lat,lng,target.lat,target.lng);
    var bear=bearing(lat,lng,target.lat,target.lng);
    var attempt=guesses.length+1;

    guesses.push({lat:lat,lng:lng,dist:dist,bearing:bear});
    attemptsNum.textContent=attempt;

    /* ✅ Check if within radius */
    if(dist<=target.radius){
        onCorrect(lat,lng,dist);
        return;
    }

    sndClick();
    if(dist<target.radius*3) sndClose();

    /* Guess marker */
    var cls=distClass(dist,target.radius);
    var markerDiv=L.divIcon({
        className:'',
        html:'<div class="guess-marker '+cls+'-m">'+attempt+'</div>',
        iconSize:[28,28],
        iconAnchor:[14,14]
    });
    var m=L.marker([lat,lng],{icon:markerDiv,interactive:false}).addTo(map);
    guessMarkers.push(m);

    /* Trail line */
    if(lineLayer){map.removeLayer(lineLayer);lineLayer=null}
    var pts=[];
    for(var i=0;i<guesses.length;i++) pts.push([guesses[i].lat,guesses[i].lng]);
    if(pts.length>1){
        lineLayer=L.polyline(pts,{color:'rgba(13,17,32,0.35)',weight:2,dashArray:'6,8'}).addTo(map);
    }

    /* Hint panel */
    hintPanel.classList.remove('hidden');
    clickHint.classList.add('hidden');
    hintDist.textContent=formatDist(dist);
    hintDist.className='hint-distance '+cls;
    dirArrow.style.transform='rotate('+bear+'deg)';
    hintLabel.textContent=bearingToDir(bear);

    /* Guess chip */
    var chip=document.createElement('div');
    chip.className='guess-chip '+cls+'-c';
    chip.innerHTML='<span>#'+attempt+'</span> <span>'+formatDist(dist)+'</span>';
    guessesBar.insertBefore(chip,guessesBar.firstChild);
    guessesBar.scrollLeft=0;
}

/* ══════ Correct! ══════ */
function onCorrect(lat,lng,dist){
    found=true;
    sndCorrect();
    showCorrectLocation(true);

    var overlay=document.createElement('div');
    overlay.className='found-overlay';
    overlay.innerHTML='<div class="found-text">'+(lang==='ar'?'🎉 أحسنت!':'🎉 Correct!')+'</div>';
    document.body.appendChild(overlay);

    setTimeout(function(){
        if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
        var answerVal=curQ.field4||curQ.field1||target.nameEn;
        post({type:'answer',answer:answerVal});
    },2000);
}

function showCorrectLocation(isCorrect){
    var iconHtml=isCorrect?
        '<div class="correct-marker">'+target.flag+'</div>':
        '<div class="target-marker">'+target.flag+'</div>';

    var icon=L.divIcon({
        className:'',
        html:iconHtml,
        iconSize:[40,40],
        iconAnchor:[20,20]
    });

    correctMarker=L.marker([target.lat,target.lng],{icon:icon}).addTo(map);

    var popupName=lang==='ar'?target.name:target.nameEn;
    correctMarker.bindPopup(
        '<div style="text-align:center;font-weight:700;font-size:0.85rem">'+
        target.flag+' '+popupName+'</div>',
        {closeButton:false,autoClose:false,closeOnClick:false}
    ).openPopup();

    /* Smart fly zoom based on radius */
    var flyZoom=5;
    if(target.radius<=5) flyZoom=16;
    else if(target.radius<=15) flyZoom=13;
    else if(target.radius<=40) flyZoom=10;
    else if(target.radius<=100) flyZoom=8;
    else if(target.radius<=250) flyZoom=6;
    else if(target.radius<=500) flyZoom=4;

    map.flyTo([target.lat,target.lng],flyZoom,{duration:1.2});
}

/* ══════ Show Result ══════ */
function showRes(isCorrect,alreadyAnswered,earnedLandCoin){
    wait=true;

    /* ══════ BULLETPROOF: Trust ONLY our own variable ══════
       found = player clicked correct location = WIN
       !found = player never found it = LOSS
       We IGNORE server isCorrect for display — our game KNOWS the truth
    */

    var locName=target?(target.flag+' '+(lang==='ar'?target.name:target.nameEn)):'';

    if(found){
        rI.className='result-icon ok';
        rI.textContent='🌍';
        rT.className='result-title ok';
        if(alreadyAnswered){
            rT.textContent=lang==='ar'?'إجابة صحيحة (سبق الإجابة)':'Correct! (Already answered)';
        } else {
            var attTxt=guesses.length===1?
                (lang==='ar'?'من أول محاولة! 🎯':'First try! 🎯'):
                (lang==='ar'?'بعد '+guesses.length+' محاولة':'After '+guesses.length+' attempts');
            rT.textContent=(lang==='ar'?'🎉 أحسنت! ':'🎉 Correct! ')+attTxt;
        }
        resInfo.textContent=locName;
    } else {
        rI.className='result-icon fail';
        rI.textContent='😔';
        rT.className='result-title fail';
        rT.textContent=lang==='ar'?'خطأ! انتهى الوقت':'Wrong! Time\'s up!';
        resInfo.textContent=(lang==='ar'?'الإجابة الصحيحة: ':'Correct answer: ')+locName;
        if(target && !correctMarker) showCorrectLocation(false);
    }

    if(found && earnedLandCoin>0 && !alreadyAnswered){
        rC.classList.remove('hidden');
        rE.textContent='+'+earnedLandCoin;
    } else {
        rC.classList.add('hidden');
    }

    var glow=document.querySelector('.result-glow');
    if(glow) glow.style.background=found?'rgba(46,204,113,0.3)':'rgba(231,76,60,0.3)';

    show(S2);
    setTimeout(function(){wait=false;post({type:'next'})},3000);
}

/* ══════ Start ══════ */
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();

})();
