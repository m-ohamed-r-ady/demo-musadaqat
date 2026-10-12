
(function(){
'use strict';
var clamp=function(v,a,b){a=a==null?0:a;b=b==null?1:b;return Math.min(b,Math.max(a,v))};
var lerp=function(a,b,t){return a+(b-a)*t};
var io=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
var out=function(t){return 1-Math.pow(1-t,3)};
var lin=function(t){return t};
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};

/* ---------- signature + pen ---------- */
function SigCtl(svg){
  var p1=$('.s1',svg),p2=$('.s2',svg),pen=$('.pen',svg);
  var l1=p1.getTotalLength()||1,l2=p2.getTotalLength()||1;
  p1.style.strokeDasharray=l1;p2.style.strokeDasharray=l2;
  var penO=0,pt={x:10,y:50};
  function place(){
    var e=out(penO);
    pen.setAttribute('transform','translate('+(pt.x+(1-e)*70)+' '+(pt.y-(1-e)*50)+')');
    pen.style.opacity=e;
  }
  var api={
    draw:function(p){
      var L=l1+l2,q=clamp(p)*L;
      p1.style.strokeDashoffset=l1*(1-clamp(q/l1));
      p2.style.strokeDashoffset=l2*(1-clamp((q-l1)/l2));
      pt=q<=l1?p1.getPointAtLength(q):p2.getPointAtLength(q-l1);
      place();
    },
    setPen:function(o){penO=o;place()}
  };
  api.draw(0);
  return api;
}
function SigQrSwap(sigEl,qrEl,p){
  var t=clamp(p),e=out(t),fade=out(clamp(t/.42));
  var settle=out(clamp((t-.68)/.32));
  sigEl.style.opacity=1-fade;
  sigEl.style.transform='translateY('+(-5*fade)+'px) scale('+(1-.04*fade)+')';
  qrEl.style.opacity=clamp((t-.08)/.25);
  qrEl.style.transform='translate3d('+((1-e)*18)+'px,'+((1-e)*-20)+'px,0) rotate('+((1-e)*6)+'deg) scale('+(0.72+0.31*e-0.03*settle)+')';
  qrEl.style.filter='blur('+((1-e)*2.5)+'px) drop-shadow(0 '+(5+7*e)+'px '+(10+8*e)+'px rgba(44,44,42,'+(0.08+0.08*e)+'))';
}
function SealCtl(svg){
  var c=$('.ring',svg),k=$('.tick',svg),f=$('.fill',svg);
  var lc=2*Math.PI*21,lk=k.getTotalLength()||30;
  c.style.strokeDasharray=lc;k.style.strokeDasharray=lk;
  return {draw:function(p){
    c.style.strokeDashoffset=lc*(1-out(clamp(p/.65)));
    k.style.strokeDashoffset=lk*(1-out(clamp((p-.55)/.45)));
    f.style.opacity=clamp((p-.5)/.5);
  }};
}

/* ---------- document controller ---------- */
var LABELS={draft:'Draft',sent:'Sent',review:'In review',confirmed:'Confirmed'};
function DocCtl(root,labels){
  var items=$$('[data-r]',root),badge=$('[data-badge]',root);
  var sigEl=$('.sigsvg',root),qrEl=$('.qrmark',root),sig=SigCtl(sigEl),seal=SealCtl($('.seal svg',root));
  var sealEl=$('.seal',root),ver=$('.doc-foot',root),cmt=$('.cmt',root),hint=$('.sign-hint',root);
  var st='',sp=0,saV=0;
  function hintUpd(){hint.style.opacity=saV*(1-clamp(sp*10))}
  var api={
    el:root,sig:sig,
    reveal:function(p){
      var n=items.length;
      items.forEach(function(el,i){
        var l=clamp((p-i/n*.7)/.3),e=out(l);
        el.style.opacity=e;
        if(l>=1){el.style.clipPath='none';el.style.transform='none'}
        else{
          el.style.clipPath=el.getAttribute('data-r')==='fade'?'none':'inset(-20% '+((1-e)*100)+'% -20% -5%)';
          el.style.transform='translateY('+((1-e)*6)+'px)';
        }
      });
    },
    state:function(s){
      if(s===st)return;st=s;
      root.setAttribute('data-st',s);
      badge.setAttribute('data-s',s);badge.textContent=(labels||LABELS)[s];
      badge.classList.remove('flip');void badge.offsetWidth;badge.classList.add('flip');
    },
    hl:function(v){root.style.setProperty('--hl',v)},
    sa:function(v){saV=v;root.style.setProperty('--sa',v);root.setAttribute('data-sa',v>.05?'1':'0');hintUpd()},
    drawSig:function(p){sp=p;sig.draw(p);hintUpd()},
    qrSwap:function(p){SigQrSwap(sigEl,qrEl,p)},
    cmt:function(v){cmt.style.opacity=v;cmt.style.transform='translateY('+((1-v)*8)+'px)'},
    seal:function(p){seal.draw(p);sealEl.style.opacity=p>0?1:0},
    ver:function(p){ver.style.opacity=p;ver.style.transform='translateY('+((1-p)*6)+'px)'}
  };
  return api;
}
function mkDoc(host,templateId,labels){
  var t=$(templateId).content.cloneNode(true);
  var slot=$('[data-slot="doc"]',host);
  var el=t.firstElementChild;
  slot.parentNode.replaceChild(el,slot);
  return DocCtl(el,labels);
}
function RailCtl(el){
  var lis=$$('li',el),fill=$('.fill',el),pos=[0,1/3,2/3,1];
  var col={draft:'var(--muted)',sent:'var(--p)',review:'var(--v)',confirmed:'var(--ok)'};
  return {set:function(f,s){
    fill.style.width=(f*75)+'%';fill.style.background=col[s];
    lis.forEach(function(li,i){li.classList.toggle('on',f>=pos[i]-.001)});
  }};
}
function xf(w,o){
  var ry=lerp(-10,0,o.fwd)+o.px*3.5,rx=lerp(5,0,o.fwd)-o.py*2.5,sc=lerp(.93,1,o.fwd)*(1-.05*o.comp),ty=lerp(22,0,o.fwd);
  w.style.transform='translate3d('+(o.px*10)+'px,'+ty+'px,0) rotateX('+rx+'deg) rotateY('+ry+'deg) scale('+sc+')';
  w.style.setProperty('--sx',(-o.px*16)+'px');
}
function ghosts(g1,g2,tr,px){
  g1.style.transform='translate('+(-14-tr*26-px*4)+'px,'+(12+tr*16)+'px) rotate('+(-1.6-tr*2)+'deg)';
  g2.style.transform='translate('+(-28-tr*52-px*8)+'px,'+(24+tr*30)+'px) rotate('+(-3-tr*4)+'deg)';
}

/* ---------- tween runner ---------- */
function Runner(){
  var id=0;
  return {
    cancel:function(){id++},
    start:function(){
      var my=++id;
      var T=function(ms,fn,e){
        e=e||io;
        return new Promise(function(res,rej){
          var t0=performance.now();
          (function f(n){
            if(my!==id)return rej('stale');
            var k=clamp((n-t0)/ms);fn(e(k));
            k<1?requestAnimationFrame(f):res();
          })(t0);
        });
      };
      return {T:T,W:function(ms){return T(ms,function(){},lin)}};
    }
  };
}

/* ================= HERO ================= */
var heroEl=$('#heroStage'),heroDoc=mkDoc($('#heroWrap'),'#heroDocTpl'),heroRail=RailCtl($('#heroRail'));
var heroWrap=$('#heroWrap'),hg1=$('#hg1'),hg2=$('#hg2'),ledger=$('#ledger'),cta=$('#heroCta');
var heroStatus=$('#heroStatus');
var H={fwd:0,comp:0,tr:0},px=0,py=0,tpx=0,tpy=0,heroVis=true,heroRaf=0;
function heroFrame(){
  px+=(tpx-px)*.08;py+=(tpy-py)*.08;
  xf(heroWrap,{fwd:H.fwd,comp:H.comp,px:px,py:py});
  ghosts(hg1,hg2,H.tr,px);
  ledger.style.transform='translate3d('+(px*-14)+'px,'+(py*-10)+'px,0)';
  heroRaf=heroVis?requestAnimationFrame(heroFrame):0;
}
function heroReset(){
  H.fwd=0;H.comp=0;H.tr=0;
  heroDoc.reveal(0);heroDoc.state('draft');heroDoc.hl(0);heroDoc.sa(0);heroDoc.drawSig(0);heroDoc.sig.setPen(0);heroDoc.qrSwap(0);heroDoc.seal(0);heroDoc.ver(0);heroDoc.cmt(0);
  heroRail.set(0,'draft');cta.classList.remove('emph');
  heroStatus.textContent='Preparing the request';
}
function heroFinal(){
  H.fwd=1;H.comp=0;H.tr=0;
  heroDoc.reveal(1);heroDoc.state('confirmed');heroDoc.hl(0);heroDoc.sa(0);heroDoc.drawSig(1);heroDoc.sig.setPen(0);heroDoc.qrSwap(1);heroDoc.seal(1);heroDoc.ver(1);heroDoc.cmt(0);
  heroRail.set(1,'confirmed');cta.classList.add('emph');
  heroStatus.textContent='Recipient response verified and recorded';
}
var heroRun=Runner();
function playHero(){
  if(RM){heroFinal();return}
  var r=heroRun.start(),T=r.T,W=r.W;
  heroReset();
  (async function(){
    try{
      await W(500);
      await T(2300,function(p){heroDoc.reveal(p)},lin);
      await W(500);
      heroDoc.state('sent');
      await T(1200,function(e){H.fwd=e;H.tr=Math.sin(Math.PI*e);heroRail.set(lerp(0,1/3,e),'sent')});
      heroStatus.textContent='Delivered to the recipient. Awaiting response';
      await W(650);
      heroStatus.textContent='Recipient response received. Verifying details';
      heroDoc.state('review');
      await T(800,function(e){heroDoc.hl(e);heroRail.set(lerp(1/3,2/3,e),'review')});
      await W(300);
      await T(600,function(e){heroDoc.sa(e)});
      await T(650,function(e){heroDoc.sig.setPen(e)});
      await T(2700,function(e){heroDoc.drawSig(e)});
      await T(500,function(e){heroDoc.sig.setPen(1-e)});
      await W(250);
      await T(600,function(e){heroDoc.qrSwap(e)});
      await W(150);
      heroDoc.state('confirmed');
      T(500,function(e){heroDoc.hl(1-e);heroDoc.sa(1-e)});
      T(900,function(e){heroDoc.seal(e)});
      T(900,function(e){heroRail.set(lerp(2/3,1,e),'confirmed')});
      await W(500);
      await T(700,function(e){heroDoc.ver(e);H.comp=Math.sin(Math.PI*e)*.5});
      cta.classList.add('emph');
      heroStatus.textContent='Recipient response verified and recorded. Replaying in 5 seconds';
      await W(5000);
      playHero();
    }catch(e){if(e!=='stale')throw e}
  })();
}
$('#replay').addEventListener('click',playHero);
if(!RM&&matchMedia('(hover:hover)').matches){
  $('#hero').addEventListener('pointermove',function(e){tpx=(e.clientX/innerWidth)*2-1;tpy=(e.clientY/innerHeight)*2-1});
  $('#hero').addEventListener('pointerleave',function(){tpx=0;tpy=0});
}
new IntersectionObserver(function(en){
  heroVis=en[0].isIntersecting;
  if(heroVis&&!heroRaf)heroFrame();
},{threshold:0}).observe($('#hero'));
heroFrame();

/* ================= RECONCILIATION ================= */
var storyEl=$('#story'),reconWorkspace=$('#reconWorkspace'),reconButtons=$$('[data-recon-step]',reconWorkspace),reconTimers=[],reconTouched=false;
function setReconStep(step,focus){
  reconWorkspace.setAttribute('data-step',step);
  reconButtons.forEach(function(button,index){button.setAttribute('aria-pressed',index===step?'true':'false')});
  if(focus)reconButtons[step].focus();
}
function stopRecon(){reconTimers.forEach(clearTimeout);reconTimers=[]}
reconButtons.forEach(function(button,index){
  button.addEventListener('click',function(){reconTouched=true;stopRecon();setReconStep(index)});
  button.addEventListener('keydown',function(event){
    var next=-1;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%reconButtons.length;
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index+reconButtons.length-1)%reconButtons.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=reconButtons.length-1;
    if(next>=0){event.preventDefault();reconTouched=true;stopRecon();setReconStep(next,true)}
  });
});
reconWorkspace.classList.add('is-ready');
new IntersectionObserver(function(entries,observer){
  if(!entries[0].isIntersecting)return;
  reconWorkspace.classList.add('is-visible');
  if(RM){setReconStep(2)}else if(!reconTouched){
    reconTimers.push(setTimeout(function(){setReconStep(1)},850));
    reconTimers.push(setTimeout(function(){setReconStep(2)},1850));
  }
  observer.disconnect();
},{threshold:.35}).observe(reconWorkspace);

/* ================= CINEMATIC SIGNATURE ================= */
var signingStage=$('#signingStage'),signingReplay=$('#signingReplay');
function playSigning(){
  signingStage.classList.remove('is-signing','is-complete');
  void signingStage.offsetWidth;
  signingStage.classList.add('is-signing','is-complete');
}
signingReplay.addEventListener('click',playSigning);
new IntersectionObserver(function(entries,observer){
  if(!entries[0].isIntersecting)return;
  playSigning();
  observer.disconnect();
},{threshold:.28}).observe(signingStage);

/* ================= DASH EMERGE ================= */
var dash=$('#dash'),dashWrap=$('#dashWrap'),newRow=$('#newRow'),flashed=false;
function dashRender(){
  var r=dashWrap.getBoundingClientRect(),vh=innerHeight;
  var e=clamp((vh-r.top)/(vh*.8)),k=out(e);
  dash.style.transform='rotateX('+((1-k)*12)+'deg) translateY('+((1-k)*56)+'px) scale('+(.93+.07*k)+')';
  if(e>.9&&!flashed){flashed=true;newRow.classList.add('flash')}
}

/* ================= scroll plumbing ================= */
var tick=false,nav=$('#nav');
function onScroll(){
  if(tick)return;tick=true;
  requestAnimationFrame(function(){
    tick=false;
    nav.classList.toggle('sc',scrollY>8);
    dashRender();
  });
}
addEventListener('scroll',onScroll,{passive:true});
addEventListener('resize',onScroll);
dashRender();

/* scrollspy */
var links=$$('.nav nav a'),navSectionMap={story:'story',evidence:'story',product:'product',models:'models',custody:'models',tracking:'tracking',contact:'contact'};
var secs=Object.keys(navSectionMap).map(function(id){return document.getElementById(id)});
var spy=new IntersectionObserver(function(en){
  en.forEach(function(x){
    if(x.isIntersecting){var id=navSectionMap[x.target.id];links.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+id)})}
  });
},{rootMargin:'-45% 0px -50% 0px'});
secs.forEach(function(s){spy.observe(s)});

/* ================= MODELS ================= */
var MODELS=[
 {t:'Auditor-stated',cap:'The auditor enters the amount. The recipient confirms it or corrects it.',
  h:'<div class="fld"><label>Balance per client records</label><div class="inp filled">﷼ 2,450,000.000</div></div><div class="fld"><label>Recipient response</label><div class="opt on"><i></i>The balance is correct</div><div class="opt"><i></i>The balance differs. I will enter the correct amount.</div></div>'},
 {t:'Blank',cap:'The recipient provides the balance directly from its own records.',
  h:'<div class="fld"><label>Balance per your records</label><div class="inp empty"><span class="caret"></span>Enter the balance</div></div><div class="fld"><label>Balance date</label><div class="inp">31 May 2026</div></div><div class="fld"><label>Recipient response</label><div class="opt"><i></i>I confirm the balance entered above</div></div>'},
 {t:'Attachment',cap:'The client’s document is attached as subject matter, not as the request.',
  h:'<div class="fld"><label>Attached document</label><div class="file"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg><div><b>Facility_agreement_2026.pdf</b><small>1.2 MB · uploaded by the client</small></div><span class="tag">Subject matter</span></div></div><div class="fld"><label>Recipient response</label><div class="opt on"><i></i>The attached document is accurate</div><div class="opt"><i></i>The attached document differs from our records</div></div>'}
];
var tabs=$$('.tab'),host=$('#sheetHost'),capEl=$('#sheetCap'),panel=$('#panel');
function showModel(i,focus){
  tabs.forEach(function(t,k){t.setAttribute('aria-selected',k===i?'true':'false');t.tabIndex=k===i?0:-1});
  panel.setAttribute('aria-labelledby','tab'+i);
  var m=MODELS[i];
  host.innerHTML='<div class="sheet paper"><div class="sheet-top"><span class="pill" data-s="'+(i===0?'sent':i===1?'draft':'review')+'">'+m.t+'</span><span class="r">MSQ-2026-0041</span></div><h3>Audit confirmation request</h3>'+m.h+'</div>';
  capEl.textContent=m.cap;
  if(focus)tabs[i].focus();
}
tabs.forEach(function(t,i){
  t.addEventListener('click',function(){showModel(i)});
  t.addEventListener('keydown',function(e){
    var k=e.key,n=-1;
    if(k==='ArrowDown'||k==='ArrowRight')n=(i+1)%3;
    else if(k==='ArrowUp'||k==='ArrowLeft')n=(i+2)%3;
    else if(k==='Home')n=0;else if(k==='End')n=2;
    if(n>=0){e.preventDefault();showModel(n,true)}
  });
});
showModel(0);

/* ================= EVIDENCE ASSEMBLY ================= */
var assemblyStage=$('#assemblyStage'),assemblyReplay=$('#assemblyReplay');
function playAssembly(){
  assemblyStage.classList.remove('is-assembling');
  void assemblyStage.offsetWidth;
  assemblyStage.classList.add('is-assembling');
}
assemblyReplay.addEventListener('click',playAssembly);
new IntersectionObserver(function(entries,observer){
  if(!entries[0].isIntersecting)return;
  playAssembly();
  observer.disconnect();
},{threshold:.28}).observe(assemblyStage);

/* ================= TRACKING ================= */
var stations=$$('.station'),stationsEl=$('#stations'),stationsViewport=$('.stations-viewport'),trackingSection=$('#tracking');
var statusLine=$('.status-line'),statusSignal=$('.status-signal'),statusDetail=$('#statusDetail');
var statusDetailName=$('#statusDetailName'),statusDetailDescription=$('#statusDetailDescription'),statusDetailCount=$('#statusDetailCount');
var KEYS=['sent','pending','overdue','review','confirmed','rejected'];
var activeStation=0,signalTimer=0;
function positionTrack(k){
  var lineBox=statusLine.getBoundingClientRect(),stationBox=stations[k].getBoundingClientRect();
  var signalX=stationBox.left+stationBox.width/2-lineBox.left-statusSignal.offsetWidth/2;
  stationsEl.style.setProperty('--active-x',signalX+'px');
  stationsEl.style.setProperty('--track-progress',k/(stations.length-1));
}
function setStation(k,bringIntoView){
  var changed=k!==activeStation;
  activeStation=k;
  stations.forEach(function(s,j){
    s.classList.toggle('on',j===k);
    s.setAttribute('aria-pressed',j===k?'true':'false');
  });
  var key=KEYS[k];
  var s=stations[k];
  statusLine.setAttribute('data-s',key);
  statusDetail.setAttribute('data-s',key);
  statusDetailName.textContent=$('b',s).textContent;
  statusDetailDescription.textContent=$('.station-description',s).textContent;
  statusDetailCount.textContent=$('.station-count',s).textContent;
  positionTrack(k);
  if(changed&&stationsEl.classList.contains('is-visible')&&!RM){
    statusDetail.classList.remove('is-changing');
    statusSignal.classList.remove('is-travelling');
    void statusDetail.offsetWidth;
    statusDetail.classList.add('is-changing');
    statusSignal.classList.add('is-travelling');
    clearTimeout(signalTimer);
    signalTimer=setTimeout(function(){statusDetail.classList.remove('is-changing');statusSignal.classList.remove('is-travelling')},600);
  }
  if(bringIntoView&&stationsViewport.scrollWidth>stationsViewport.clientWidth){
    stationsViewport.scrollTo({left:s.offsetLeft-(stationsViewport.clientWidth-s.offsetWidth)/2,behavior:RM?'auto':'smooth'});
  }
}
stations.forEach(function(station,index){
  station.addEventListener('click',function(){
    setStation(index,true);
  });
  station.addEventListener('keydown',function(event){
    var next=-1,rtl=getComputedStyle(stationsEl).direction==='rtl';
    if(event.key==='ArrowDown')next=(index+1)%stations.length;
    else if(event.key==='ArrowUp')next=(index+stations.length-1)%stations.length;
    else if(event.key==='ArrowRight')next=(index+(rtl?-1:1)+stations.length)%stations.length;
    else if(event.key==='ArrowLeft')next=(index+(rtl?1:-1)+stations.length)%stations.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=stations.length-1;
    if(next>=0){event.preventDefault();setStation(next,true);stations[next].focus()}
  });
});
setStation(0,false);
if(RM){stationsEl.classList.add('is-visible');trackingSection.classList.add('is-visible')}else{
  new IntersectionObserver(function(entries,observer){
    if(!entries[0].isIntersecting)return;
    stationsEl.classList.add('is-visible');trackingSection.classList.add('is-visible');positionTrack(activeStation);observer.disconnect();
  },{threshold:.25}).observe(stationsEl);
}
addEventListener('resize',function(){positionTrack(activeStation)});

/* ================= CONTACT ================= */
var contactForm=$('#contactForm'),contactSubmit=$('#contactSubmit'),formStatus=$('#formStatus'),startedAt=$('#startedAt');
function resetContactClock(){startedAt.value=Date.now()}
function clearContactErrors(){
  $$('.field-error',contactForm).forEach(function(el){el.textContent=''});
  $$('[aria-invalid="true"]',contactForm).forEach(function(el){el.removeAttribute('aria-invalid')});
}
function setContactErrors(errors){
  Object.keys(errors||{}).forEach(function(name){
    var field=$('[name="'+name+'"]',contactForm),error=$('#'+name+'Error');
    if(field&&error){field.setAttribute('aria-invalid','true');error.textContent=errors[name]}
  });
}
resetContactClock();
contactForm.addEventListener('submit',function(event){
  event.preventDefault();
  clearContactErrors();
  formStatus.className='form-status';
  if(!contactForm.checkValidity()){
    contactForm.reportValidity();
    formStatus.textContent='Please complete the required fields.';
    formStatus.classList.add('is-error');
    return;
  }
  contactSubmit.disabled=true;
  contactSubmit.classList.add('is-loading');
  contactSubmit.firstChild.nodeValue='Sending message';
  formStatus.textContent='Sending your message securely…';
  fetch('/api/contact',{
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify(Object.fromEntries(new FormData(contactForm).entries()))
  }).then(function(response){
    return response.json().then(function(data){return {ok:response.ok,data:data}});
  }).then(function(result){
    setContactErrors(result.data.errors);
    formStatus.textContent=result.data.message;
    formStatus.classList.add(result.ok?'is-success':'is-error');
    if(result.ok){contactForm.reset();resetContactClock()}
  }).catch(function(){
    formStatus.textContent='We could not reach the server. Check your connection and try again.';
    formStatus.classList.add('is-error');
  }).finally(function(){
    contactSubmit.disabled=false;
    contactSubmit.classList.remove('is-loading');
    contactSubmit.firstChild.nodeValue='Send message';
  });
});

/* ================= boot ================= */
var started=false;
function boot(){if(started)return;started=true;playHero()}
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(boot);setTimeout(boot,1200)}else boot();
})();
