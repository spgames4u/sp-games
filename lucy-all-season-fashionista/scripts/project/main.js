
// Import any other script files here, e.g.:
// import * as myModule from "./mymodule.js";
var Analytics;
var Analytics_script;

runOnStartup(async runtime =>
{
	// Code to run on the loading screen.
	// Note layouts, objects etc. are not yet available.
	
	runtime.addEventListener("beforeprojectstart", () => OnBeforeProjectStart(runtime));

// Google Analytics
 Analytics = document.createElement('script');
     Analytics.setAttribute("async", "");
    Analytics.src = 'https://www.googletagmanager.com/gtag/js?id=G-F52QBK293J';
    document.getElementsByTagName('head')[0].appendChild(Analytics);
    
 Analytics_script = document.createElement('script');
    
    Analytics_script.innerHTML = `window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-F52QBK293J');`;
          document.getElementsByTagName('head')[0].appendChild(Analytics_script);
});

function Tick(runtime)
{
}

async function OnBeforeProjectStart(runtime)
{
	runtime.addEventListener("tick", () => Tick(runtime));
}
