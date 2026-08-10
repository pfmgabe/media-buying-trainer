/* BUILD FRESHNESS (2026-08-10).
   GitHub Pages serves index.html with Cache-Control: max-age=600. The ?v= query on every script
   only busts the SCRIPTS -- it cannot bust the document that references them. So for ten minutes
   after a deploy a normal refresh loads the OLD index.html, which loads the OLD scripts, and the
   page keeps behaving like the previous build while the server is already serving the new one.
   That is invisible from the inside: nothing errors, the app just is not the app you shipped.

   This asks the server for index.html with cache:"no-store", reads the build number it declares,
   and compares it with the build the running page actually loaded. If they differ, it says so and
   offers a reload that cannot be served from cache. Silent when fresh, silent when offline. */
(function(){
  var running=null;
  try{
    var tags=document.querySelectorAll('script[src*="?v="]');
    if(tags.length){
      var m=String(tags[0].getAttribute("src")||"").match(/\?v=(\d+)/);
      if(m)running=m[1];
    }
  }catch(e){}
  if(!running||typeof fetch!=="function"||typeof document==="undefined")return;

  function banner(latest){
    if(document.getElementById("buildStale"))return;
    var host=document.body||document.documentElement;
    if(!host||typeof document.createElement!=="function")return;
    var bar=document.createElement("div");
    bar.id="buildStale";
    bar.className="build-stale";
    bar.setAttribute("role","status");
    var text=document.createElement("span");
    text.textContent="Your browser is running build "+running+". Build "+latest+" is live — your refresh reused a cached page.";
    var btn=document.createElement("button");
    btn.type="button";
    btn.textContent="Load build "+latest;
    btn.onclick=function(){
      try{
        var url=new URL(location.href);
        /* A URL the browser has never seen cannot come from its cache. */
        url.searchParams.set("build",latest);
        location.replace(url.toString());
      }catch(e){location.reload();}
    };
    bar.appendChild(text);
    bar.appendChild(btn);
    host.appendChild(bar);
  }

  function check(){
    var base=location.pathname.replace(/[^/]*$/,"");
    fetch(base+"index.html",{cache:"no-store"})
      .then(function(r){return r&&r.ok?r.text():null;})
      .then(function(html){
        if(!html)return;
        var m=html.match(/\?v=(\d+)/);
        if(!m||m[1]===running)return;
        banner(m[1]);
      })
      .catch(function(){});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",check);
  else check();
})();
