/* Motor de páginas: primitivas, desenhos e montagem dos slides (canvas/PDF/PPTX). */
/* ===== Motor: primitivas -> canvas (prévia/PDF) e PPTX ===== */
var SW = 13.333, SH = 7.5;
var COL = {NAVY:'000066',NAVY_D:'00003D',NAVY_L:'1B1B8F',PINK:'FF0066',PINK_D:'D6004F',PINK_S:'FFE6EF',BG:'F5F4FA',WHITE:'FFFFFF',INK:'15153F',MID:'6E6E8F',LINE:'E4E2EF'};
var FONT = {L:'Poppins Light',R:'Poppins',M:'Poppins Medium',B:'Poppins'};

function Slide(bg){ this.bg = bg || {c:COL.BG}; this.items = []; this.notes = ''; }
Slide.prototype.add = function(o){ this.items.push(o); return o; };
Slide.prototype.rect = function(x,y,w,h,o){ o=o||{}; return this.add({t:'rect',x:x,y:y,w:w,h:h,fill:o.fill,a:o.a,r:o.r,line:o.line,lw:o.lw,shadow:o.shadow,link:o.link}); };
Slide.prototype.oval = function(x,y,w,h,o){ o=o||{}; return this.add({t:'oval',x:x,y:y,w:w,h:h,fill:o.fill,a:o.a,line:o.line,lw:o.lw}); };
Slide.prototype.poly = function(pts,o){ o=o||{}; return this.add({t:'poly',pts:pts,fill:o.fill,a:o.a,line:o.line,lw:o.lw}); };
Slide.prototype.line = function(x1,y1,x2,y2,o){ o=o||{}; return this.add({t:'line',x1:x1,y1:y1,x2:x2,y2:y2,c:o.c||COL.NAVY,lw:o.lw||1,dash:o.dash,a:o.a,end:o.end}); };
Slide.prototype.text = function(x,y,w,h,str,o){ o=o||{}; return this.add({t:'text',x:x,y:y,w:w,h:h,str:str,size:o.size||12,f:o.f||'R',color:o.color||COL.INK,align:o.align||'l',valign:o.valign||'t',spc:o.spc,ls:o.ls||1,a:o.a,link:o.link,after:o.after,bold:o.bold}); };
Slide.prototype.img = function(x,y,w,h,asset,o){ o=o||{}; if(!asset) return null; return this.add({t:'img',x:x,y:y,w:w,h:h,asset:asset,r:o.r,contain:o.contain,name:o.name}); };
Slide.prototype.bars = function(x,y,w,h,cats,vals,o){ o=o||{}; return this.add({t:'bars',x:x,y:y,w:w,h:h,cats:cats,vals:vals,color:o.color||COL.PINK,fmt:o.fmt||'pct',hi:o.hi}); };
Slide.prototype.donut = function(x,y,d,vals,cats){ return this.add({t:'donut',x:x,y:y,w:d,h:d,vals:vals,cats:cats}); };

function hexA(c,a){ var n=parseInt(c,16); return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+(a==null?1:a/100)+')'; }
function fmtNum(v,fmt){
  if(fmt==='pct') return Math.round(v)+'%';
  if(fmt==='brl') return 'R$ '+Number(v).toLocaleString('pt-BR',{maximumFractionDigits:0});
  return Number(v).toLocaleString('pt-BR');
}

/* ---------- canvas ---------- */
function rrPath(c,x,y,w,h,r){ r=Math.min(r,w/2,h/2); c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function wrapLines(c,txt,maxw){
  var out=[]; String(txt).split('\n').forEach(function(par){
    var words=par.split(' '), cur='';
    words.forEach(function(wd){ var t=cur?cur+' '+wd:wd; if(cur && c.measureText(t).width>maxw){ out.push(cur); cur=wd; } else cur=t; });
    out.push(cur);
  }); return out;
}
function gradBg(c,W,H,bg){
  var g=c.createLinearGradient(0,0,W,H); g.addColorStop(0,'#'+bg.g[0]); g.addColorStop(1,'#'+bg.g[1]); c.fillStyle=g; c.fillRect(0,0,W,H);
}
function renderCanvas(slide, cv, W){
  var H=Math.round(W*SH/SW); cv.width=W; cv.height=H; var c=cv.getContext('2d'), k=W/SW;
  if(slide.bg.g) gradBg(c,W,H,slide.bg); else { c.fillStyle='#'+slide.bg.c; c.fillRect(0,0,W,H); }
  slide.items.forEach(function(o){
    c.save();
    try{ drawItem(c,o,k); }catch(e){ console.warn(e); }
    c.restore();
  });
  return cv;
}
function drawItem(c,o,k){
  if(o.t==='rect'){
    if(o.shadow){ c.shadowColor=hexA('000066',12); c.shadowBlur=18*k/96*1.6; c.shadowOffsetY=5*k/96*1.2; }
    if(o.r) rrPath(c,o.x*k,o.y*k,o.w*k,o.h*k,o.r*k); else { c.beginPath(); c.rect(o.x*k,o.y*k,o.w*k,o.h*k); }
    if(o.fill){ c.fillStyle=hexA(o.fill,o.a==null?100:o.a); c.fill(); }
    c.shadowColor='transparent';
    if(o.line){ c.strokeStyle='#'+o.line; c.lineWidth=(o.lw||0.75)*k/72; c.stroke(); }
  } else if(o.t==='oval'){
    c.beginPath(); c.ellipse((o.x+o.w/2)*k,(o.y+o.h/2)*k,o.w/2*k,o.h/2*k,0,0,7);
    if(o.fill){ c.fillStyle=hexA(o.fill,o.a==null?100:o.a); c.fill(); }
    if(o.line){ c.strokeStyle='#'+o.line; c.lineWidth=(o.lw||0.75)*k/72; c.stroke(); }
  } else if(o.t==='poly'){
    c.beginPath(); o.pts.forEach(function(p,i){ i?c.lineTo(p[0]*k,p[1]*k):c.moveTo(p[0]*k,p[1]*k); }); c.closePath();
    if(o.fill){ c.fillStyle=hexA(o.fill,o.a==null?100:o.a); c.fill(); }
    if(o.line){ c.strokeStyle='#'+o.line; c.lineWidth=(o.lw||0.75)*k/72; c.stroke(); }
  } else if(o.t==='line'){
    c.strokeStyle=hexA(o.c,o.a==null?100:o.a); c.lineWidth=o.lw*k/72; if(o.dash) c.setLineDash([4*k/72*2,3*k/72*2]);
    c.beginPath(); c.moveTo(o.x1*k,o.y1*k); c.lineTo(o.x2*k,o.y2*k); c.stroke();
  } else if(o.t==='img'){
    var im=o.asset.el; if(!im) return;
    var bw=o.w*k, bh=o.h*k, bx=o.x*k, by=o.y*k;
    if(o.r){ rrPath(c,bx,by,bw,bh,o.r*k); c.clip(); }
    if(o.contain){
      var s=Math.min(bw/o.asset.w,bh/o.asset.h), dw=o.asset.w*s, dh=o.asset.h*s;
      c.drawImage(im,bx+(bw-dw)/2,by+(bh-dh)/2,dw,dh);
    } else {
      var ra=bw/bh, ri=o.asset.w/o.asset.h, sx=0, sy=0, sw=o.asset.w, sh=o.asset.h;
      if(ri>ra){ sw=sh*ra; sx=(o.asset.w-sw)/2; } else { sh=sw/ra; sy=(o.asset.h-sh)/2; }
      c.drawImage(im,sx,sy,sw,sh,bx,by,bw,bh);
    }
  } else if(o.t==='text'){
    var px=o.size/72*k, fam=FONT[o.f], wt=(o.f==='B'||o.bold)?700:400;
    c.font=wt+' '+px+'px "'+fam+'", Poppins, "Segoe UI", sans-serif';
    c.fillStyle=hexA(o.color,o.a==null?100:o.a); c.textBaseline='alphabetic';
    if(o.spc){ try{ c.letterSpacing=(o.spc/100/72*k)+'px'; }catch(e){} }
    var runs = (typeof o.str==='string')? [o.str] : o.str;
    var lines=[]; runs.forEach(function(r){ wrapLines(c,r,o.w*k).forEach(function(l){ lines.push({t:l,gap:false}); }); });
    var lh=px*1.45*o.ls, total=lines.length*lh + (o.after? (lines.length-1)*o.after/72*k : 0);
    var y0 = o.valign==='m' ? o.y*k+(o.h*k-total)/2 : (o.valign==='b' ? o.y*k+o.h*k-total : o.y*k);
    lines.forEach(function(l,i){
      var base = y0 + i*(lh+(o.after||0)/72*k) + lh*0.5 + px*0.36;
      var tw=c.measureText(l.t).width, x=o.x*k;
      if(o.align==='c') x=o.x*k+(o.w*k-tw)/2; else if(o.align==='r') x=o.x*k+o.w*k-tw;
      c.fillText(l.t,x,base);
    });
  } else if(o.t==='bars'){
    var n=o.cats.length, mx=Math.max.apply(null,o.vals)||1, rowH=o.h*k/n, labW=Math.min(1.1,o.w*0.28)*k, maxBar=o.w*k-labW-0.7*k;
    o.vals.forEach(function(v,i){
      var cy=o.y*k+rowH*i+rowH/2, bh=rowH*0.5;
      c.font='400 '+(9.5/72*k)+'px "Poppins"'; c.fillStyle='#'+COL.MID; c.textBaseline='middle';
      c.fillText(o.cats[i],o.x*k,cy);
      var bwid=Math.max(2,v/mx*maxBar*0.92);
      c.fillStyle='#'+((o.hi==null||o.hi===i)?o.color:'C9C7E0'); rrPath(c,o.x*k+labW,cy-bh/2,bwid,bh,Math.min(bh/2,4*k/96)); c.fill();
      c.font='700 '+(10/72*k)+'px "Poppins Medium"'; c.fillStyle='#'+COL.NAVY; c.fillText(fmtNum(v,o.fmt),o.x*k+labW+bwid+6*k/96,cy);
    });
  } else if(o.t==='donut'){
    var cx=(o.x+o.w/2)*k, cy=(o.y+o.h/2)*k, R=o.w/2*k*0.92, tot=o.vals[0]+o.vals[1], a0=-Math.PI/2;
    [COL.PINK,COL.NAVY].forEach(function(col,i){
      var a1=a0+o.vals[i]/tot*Math.PI*2; c.beginPath(); c.arc(cx,cy,R,a0,a1); c.arc(cx,cy,R*0.72,a1,a0,true); c.closePath();
      c.fillStyle='#'+col; c.fill(); c.strokeStyle='#fff'; c.lineWidth=2*k/96; c.stroke(); a0=a1;
    });
  }
}

/* ---------- PPTX ---------- */
function gradImage(bg){
  var cv=document.createElement('canvas'); cv.width=640; cv.height=360; var c=cv.getContext('2d'); gradBg(c,640,360,bg);
  return cv.toDataURL('image/jpeg',0.92);
}
function tr(a){ return a==null?0:100-a; }
async function buildPptx(slides, meta){
  var p=new PptxGenJS(); p.defineLayout({name:'MEGA',width:SW,height:SH}); p.layout='MEGA';
  p.title=meta.title||'Mídia Kit'; p.company='Mega Mídia OOH';
  slides.forEach(function(sl){
    var s=p.addSlide();
    if(sl.bg.g) s.background={data:gradImage(sl.bg)}; else s.background={color:sl.bg.c};
    sl.items.forEach(function(o){
      if(o.t==='rect'){
        var op={x:o.x,y:o.y,w:o.w,h:o.h,fill:o.fill?{color:o.fill,transparency:tr(o.a)}:{type:'none'},line:o.line?{color:o.line,width:o.lw||0.75}:{type:'none'}};
        if(o.shadow) op.shadow={type:'outer',blur:12,offset:3,angle:90,color:'000066',opacity:0.12};
        if(o.r){ op.rectRadius=Math.min(o.r,o.w/2,o.h/2); s.addShape('roundRect',op); } else s.addShape('rect',op);
        if(o.link) s.addText(' ',{x:o.x,y:o.y,w:o.w,h:o.h,hyperlink:{url:o.link},fontSize:1});
      } else if(o.t==='oval'){
        s.addShape('ellipse',{x:o.x,y:o.y,w:o.w,h:o.h,fill:o.fill?{color:o.fill,transparency:tr(o.a)}:{type:'none'},line:o.line?{color:o.line,width:o.lw||0.75}:{type:'none'}});
      } else if(o.t==='poly'){
        var xs=o.pts.map(function(q){return q[0]}), ys=o.pts.map(function(q){return q[1]});
        var x0=Math.min.apply(null,xs), y0=Math.min.apply(null,ys), w=Math.max.apply(null,xs)-x0, h=Math.max.apply(null,ys)-y0;
        if(w<0.001) w=0.001; if(h<0.001) h=0.001;
        var pts=o.pts.map(function(q){return {x:q[0]-x0,y:q[1]-y0}}); pts.push({close:true});
        s.addShape('custGeom',{x:x0,y:y0,w:w,h:h,points:pts,fill:o.fill?{color:o.fill,transparency:tr(o.a)}:{type:'none'},line:o.line?{color:o.line,width:o.lw||0.75}:{type:'none'}});
      } else if(o.t==='line'){
        var lx=Math.min(o.x1,o.x2), ly=Math.min(o.y1,o.y2), lw=Math.abs(o.x2-o.x1), lh=Math.abs(o.y2-o.y1);
        var op2={x:lx,y:ly,w:lw,h:lh,line:{color:o.c,width:o.lw,transparency:tr(o.a),dashType:o.dash?'dash':'solid'}};
        if((o.x2-o.x1)*(o.y2-o.y1)<0) op2.flipV=true;
        s.addShape('line',op2);
      } else if(o.t==='img'){
        var A=o.asset, nat=3, ar=A.w/A.h, bo=o.w/o.h;
        var io={data:A.src,x:o.x,y:o.y,w:o.w,h:o.h};
        if(!o.contain){ var iw=ar>=bo? nat*ar : nat*bo, ih=ar>=bo? nat : nat*bo/ar*(1/bo)*bo; 
          // dimensões "naturais" com a proporção real da imagem
          iw=ar*3; ih=3; io.w=iw; io.h=ih; io.sizing={type:'cover',w:o.w,h:o.h}; }
        else { var s2=Math.min(o.w/ar,o.h); io.w=s2*ar; io.h=s2; io.x=o.x+(o.w-io.w)/2; io.y=o.y+(o.h-io.h)/2; }
        s.addImage(io);
      } else if(o.t==='text'){
        var runs=(typeof o.str==='string')?[o.str]:o.str, arr=[];
        runs.forEach(function(r,i){
          arr.push({text:String(r)+(i<runs.length-1?'':''),options:{breakLine:i<runs.length-1,fontFace:FONT[o.f],fontSize:o.size,bold:(o.f==='B'||!!o.bold),color:o.color,charSpacing:o.spc?o.spc/100:undefined,transparency:o.a==null?undefined:100-o.a,hyperlink:o.link?{url:o.link}:undefined,paraSpaceAfter:o.after}});
        });
        s.addText(arr,{x:o.x,y:o.y,w:o.w,h:o.h,margin:0,align:o.align==='c'?'center':(o.align==='r'?'right':'left'),valign:o.valign==='m'?'middle':(o.valign==='b'?'bottom':'top'),lineSpacingMultiple:o.ls,fit:'none',wrap:true});
      } else if(o.t==='bars'){
        var cols=o.cats.map(function(_,i){return (o.hi==null||o.hi===i)?o.color:'C9C7E0';});
        s.addChart(p.charts.BAR,[{name:'Série',labels:o.cats,values:o.vals}],{x:o.x,y:o.y,w:o.w,h:o.h,barDir:'bar',chartColors:cols,catAxisOrientation:'maxMin',valAxisHidden:true,valGridLine:{style:'none'},catGridLine:{style:'none'},valAxisMaxVal:Math.max.apply(null,o.vals)*1.3||1,valAxisMinVal:0,showValue:true,dataLabelFormatCode:o.fmt==='pct'?'0"%"':(o.fmt==='brl'?'"R$ "#,##0':'#,##0'),dataLabelColor:COL.NAVY,dataLabelFontSize:10,dataLabelFontBold:true,dataLabelPosition:'outEnd',barGapWidthPct:95,catAxisLabelFontSize:9.5,catAxisLabelColor:COL.MID,catAxisLabelFontFace:'Poppins',catAxisLineShow:false,showLegend:false});
      } else if(o.t==='donut'){
        s.addChart(p.charts.DOUGHNUT,[{name:'Série',labels:o.cats,values:o.vals}],{x:o.x,y:o.y,w:o.w,h:o.h,holeSize:72,chartColors:[COL.PINK,COL.NAVY],showLegend:false,showLabel:false,showPercent:false,showValue:false,dataBorder:{pt:2,color:'FFFFFF'}});
      }
    });
  });
  return await p.write({outputType:'blob'});
}

/* ---------- PDF ---------- */
async function buildPdf(slides, onProgress){
  var J=window.jspdf.jsPDF, pdf=new J({orientation:'landscape',unit:'in',format:[SW,SH],compress:true}), cv=document.createElement('canvas');
  for(var i=0;i<slides.length;i++){
    renderCanvas(slides[i],cv,1920);
    var d=cv.toDataURL('image/jpeg',0.88);
    if(i) pdf.addPage([SW,SH],'landscape');
    pdf.addImage(d,'JPEG',0,0,SW,SH,undefined,'FAST');
    slides[i].items.forEach(function(o){ if(o.link&&o.w&&o.h) pdf.link(o.x,o.y,o.w,o.h,{url:o.link}); });
    if(onProgress) onProgress(i+1,slides.length);
    await new Promise(function(r){setTimeout(r,0)});
  }
  return pdf.output('blob');
}

/* ===== Componentes e desenhos ===== */
var C=COL;
function card(S,x,y,w,h,r){ return S.rect(x,y,w,h,{fill:C.WHITE,r:r==null?0.2:r,shadow:true,line:C.LINE,lw:0.5}); }
function gcard(S,x,y,w,h,col,r){ return S.rect(x,y,w,h,{fill:col||C.NAVY,r:r==null?0.2:r,shadow:true}); }
function pill(S,x,y,w,h,t,o){ o=o||{}; S.rect(x,y,w,h,{fill:o.fill||C.PINK,r:h/2,line:o.line,lw:0.75,link:o.link});
  return S.text(x,y,w,h,t,{size:o.size||9.5,f:o.f||'B',color:o.color||C.WHITE,align:'c',valign:'m',spc:o.spc==null?60:o.spc}); }
function slantMotif(S,x,y,hgt,alpha,cols){ var bw=hgt*0.30, sl=hgt*0.32; cols=cols||[C.WHITE,C.PINK,C.WHITE];
  cols.forEach(function(c,i){ var x0=x+i*bw*1.12; S.poly([[x0+sl,y],[x0+sl+bw,y],[x0+bw,y+hgt],[x0,y+hgt]],{fill:c,a:alpha}); }); }
function tile(S,x,y,w,h,big,label,style,size,lsize){
  var fillc=null,bc=C.NAVY,lc=C.MID; style=style||'white';
  if(style==='white') card(S,x,y,w,h); else if(style==='navy'){ gcard(S,x,y,w,h,C.NAVY); bc=C.WHITE; lc='CCCCE0'; } else { gcard(S,x,y,w,h,C.PINK); bc=C.WHITE; lc='FFD6E6'; }
  S.rect(x+0.2,y+0.18,0.28,0.045,{fill:style==='pink'?C.WHITE:C.PINK});
  S.text(x+0.14,y+0.26,w-0.28,0.5,big,{size:size||22,f:'M',color:bc,valign:'m'});
  S.text(x+0.14,y+0.78,w-0.28,h-0.84,label,{size:lsize||9,f:'R',color:lc,ls:0.95});
}
function chips(S,y,items){ var n=items.length,gap=0.2,w=(SW-1.2-gap*(n-1))/n;
  items.forEach(function(it,i){ var x=0.6+i*(w+gap); card(S,x,y,w,0.88,0.12); S.rect(x,y+0.2,0.06,0.48,{fill:C.PINK});
    S.text(x+0.2,y+0.1,w-0.3,0.42,it[0],{size:19,f:'M',color:C.NAVY,valign:'m'});
    S.text(x+0.2,y+0.5,w-0.3,0.3,String(it[1]).toUpperCase(),{size:8,f:'R',color:C.MID,spc:100}); }); }
function cardTitle(S,x,y,t,sub){ S.text(x,y,4.5,0.3,t,{size:12,f:'M',color:C.NAVY}); if(sub) S.text(x,y+0.27,4.5,0.25,sub,{size:8.5,f:'L',color:C.MID}); }
function legendDot(S,x,y,col,label,val){ S.oval(x,y+0.07,0.14,0.14,{fill:col}); S.text(x+0.2,y,1.0,0.28,label,{size:10,f:'L',color:C.INK}); S.text(x+1.05,y,0.7,0.28,val,{size:10,f:'M',color:C.NAVY}); }

/* tabela "nativa" (formas) — células editáveis como caixas de texto */
function table(S,x,y,w,rows,colw,o){
  o=o||{}; var rowH=o.rowH||0.5, headH=o.headH||0.42, size=o.size||10.5, tot=colw.reduce(function(a,b){return a+b},0), al=o.aligns||[];
  var xs=[x]; colw.forEach(function(cw,i){ xs.push(xs[i]+w*cw/tot); });
  var cy=y;
  rows.forEach(function(r,ri){
    var h=ri===0?headH:rowH, last=o.total&&ri===rows.length-1;
    if(last) S.rect(x,cy,w,h,{fill:C.PINK_S,r:0.06});
    r.forEach(function(cell,ci){
      var cw=xs[ci+1]-xs[ci], a=al[ci]||'l';
      if(ri===0) S.text(xs[ci]+0.1,cy,cw-0.2,h,String(cell).toUpperCase(),{size:8.5,f:'B',color:C.MID,valign:'m',align:a,spc:100});
      else S.text(xs[ci]+0.1,cy,cw-0.2,h,String(cell),{size:size+(last?0.5:0),f:(ci===0||last)?'M':'L',color:(ci===0||last)?C.NAVY:C.INK,valign:'m',align:a,ls:0.92});
    });
    S.line(x,cy+h,x+w,cy+h,{c:ri===0?C.NAVY:C.LINE,lw:ri===0?1.25:0.75});
    cy+=h;
  });
  return cy-y;
}

/* ===== Desenhos vetoriais ===== */
function dimH(S,x1,x2,y,label,dark){ var c=dark?C.WHITE:C.NAVY; S.line(x1,y,x2,y,{c:c,lw:1,a:70});
  S.line(x1,y-0.06,x1,y+0.06,{c:c,lw:1,a:70}); S.line(x2,y-0.06,x2,y+0.06,{c:c,lw:1,a:70});
  var lw=Math.max(0.66,0.095*label.length+0.24), cx=(x1+x2)/2;
  S.rect(cx-lw/2,y-0.13,lw,0.26,{fill:dark?C.NAVY_L:C.WHITE,r:0.13,line:dark?C.WHITE:C.PINK,lw:0.75});
  S.text(cx-lw/2,y-0.13,lw,0.26,label,{size:8.5,f:'M',color:dark?C.WHITE:C.NAVY,align:'c',valign:'m'}); }
function dimV(S,x,y1,y2,label,dark){ var c=dark?C.WHITE:C.NAVY; S.line(x,y1,x,y2,{c:c,lw:1,a:70});
  S.line(x-0.06,y1,x+0.06,y1,{c:c,lw:1,a:70}); S.line(x-0.06,y2,x+0.06,y2,{c:c,lw:1,a:70});
  var lw=Math.max(0.66,0.095*label.length+0.24), cy=(y1+y2)/2;
  S.rect(x-lw/2,cy-0.13,lw,0.26,{fill:dark?C.NAVY_L:C.WHITE,r:0.13,line:dark?C.WHITE:C.PINK,lw:0.75});
  S.text(x-lw/2,cy-0.13,lw,0.26,label,{size:8.5,f:'M',color:dark?C.WHITE:C.NAVY,align:'c',valign:'m'}); }
function ground(S,x1,x2,y,dark){ S.oval(x1,y-0.04,x2-x1,0.1,{fill:dark?C.WHITE:C.NAVY,a:dark?10:10}); S.line(x1,y+0.01,x2,y+0.01,{c:dark?C.WHITE:C.NAVY,lw:0.75,a:30}); }
function screenMotif(S,sx,sy,sw,sh){
  var bw=Math.min(sw,sh*1.4)*0.13, sl=sh*0.28, gap=bw*0.18, tot=3*bw+2*gap+sl, x0=sx+(sw-tot)/2, cols=[C.WHITE,C.PINK,C.WHITE], al=[85,100,85], pad=sh*0.18;
  cols.forEach(function(c,i){ var xa=x0+i*(bw+gap); S.poly([[xa+sl,sy+pad],[xa+sl+bw,sy+pad],[xa+bw,sy+sh-pad],[xa,sy+sh-pad]],{fill:c,a:al[i]}); });
}
function ledPanel(S,x,y,w,h,o){ o=o||{}; var dk=o.dark, dims=o.dims, rb=dims?0.6:0.1, rr=dims?1.0:0.1, post=0.28;
  var aw=w-rr, ah=h-rb-post, bw=Math.min(aw,ah*o.ratio), bh=bw/o.ratio, bx=x+(aw-bw)/2, by=y+(ah-bh)/2;
  ground(S,bx-0.1,bx+bw+0.1,by+bh+post,dk);
  [0.3,0.7].forEach(function(f){ S.rect(bx+bw*f-0.05,by+bh,0.1,post,{fill:dk?C.WHITE:C.MID,a:dk?35:60}); });
  S.rect(bx,by,bw,bh,{fill:dk?C.WHITE:C.NAVY,a:dk?22:100,r:0.07});
  S.rect(bx+0.07,by+0.07,bw-0.14,bh-0.14,{fill:dk?C.NAVY_L:C.NAVY_L,r:0.04});
  screenMotif(S,bx+0.07,by+0.07,bw-0.14,bh-0.14);
  if(dims){ dimH(S,bx,bx+bw,by+bh+post+0.28,dims[0],dk); dimV(S,bx+bw+0.38,by,by+bh,dims[1],dk); }
}
function bancaDraw(S,x,y,w,h,o){ o=o||{}; var dk=o.dark, dims=o.dims, rb=dims?0.6:0.1, rr=dims?1.0:0.1, kind=o.kind||'led';
  var aw=w-rr, ah=h-rb-0.15, fw=Math.min(aw*0.68,ah*0.95), fh=fw*0.72, sd=fw*0.42, fx=x+(aw-(fw+sd))/2, fy=y+(ah-fh)/2+0.1, gy=fy+fh;
  ground(S,fx-0.1,fx+fw+sd+0.2,gy+0.02,dk);
  S.poly([[fx+fw,fy],[fx+fw+sd*0.7,fy-0.0],[fx+fw+sd*0.7,gy-0.05],[fx+fw,gy]],{fill:dk?C.WHITE:C.LINE,a:dk?30:100});
  S.rect(fx,fy,fw,fh,{fill:dk?C.WHITE:C.WHITE,a:dk?92:100,line:dk?null:C.LINE,r:0.03});
  S.poly([[fx-0.1,fy-0.02],[fx+fw+0.02,fy-0.02],[fx+fw+0.02,fy-0.14],[fx-0.1,fy-0.14]],{fill:C.PINK});
  S.poly([[fx+fw+0.02,fy-0.14],[fx+fw+sd*0.7+0.15,fy-0.2],[fx+fw+sd*0.7+0.1,fy-0.02],[fx+fw+0.02,fy-0.02]],{fill:C.PINK_D});
  if(kind==='led'){ var n=5,bwid=fw*0.1,g=(fw*0.8-n*bwid)/(n-1); for(var i=0;i<n;i++) S.rect(fx+fw*0.1+i*(bwid+g),fy+fh*0.12,bwid,fh*0.5,{fill:i%2?C.NAVY_L:C.PINK,r:0.01});
    S.rect(fx+fw*0.08,fy+fh*0.72,fw*0.84,fh*0.09,{fill:C.PINK,r:0.04}); }
  else { for(var r=0;r<3;r++) for(var k=0;k<5;k++) S.rect(fx+fw*0.1+k*fw*0.17,fy+fh*0.12+r*fh*0.26,fw*0.13,fh*0.2,{fill:(r+k)%2?C.NAVY_L:C.PINK,r:0.01}); }
  if(dims){ dimH(S,fx,fx+fw,gy+0.3,dims[0],dk); dimV(S,fx+fw+sd*0.7+0.42,fy,gy,dims[1],dk); }
}
function totemDraw(S,x,y,w,h,o){ o=o||{}; var dk=o.dark, dims=o.dims, rb=dims?0.5:0.1, rr=dims?0.9:0.1, ah=h-rb, tw=Math.min((w-rr)*0.7,ah*0.42), th=ah-0.15, tx=x+(w-rr-tw)/2;
  ground(S,tx-0.2,tx+tw+0.2,y+ah,dk);
  S.rect(tx,y,tw,th,{fill:dk?C.WHITE:C.NAVY,a:dk?22:100,r:0.06}); S.rect(tx+0.06,y+0.06,tw-0.12,th*0.78,{fill:C.NAVY_L,r:0.03});
  screenMotif(S,tx+0.06,y+0.06,tw-0.12,th*0.78);
  S.rect(tx+tw*0.3,y+th,tw*0.4,0.15,{fill:dk?C.WHITE:C.MID,a:dk?35:60});
  if(dims){ dimH(S,tx,tx+tw,y+ah+0.28,dims[0],dk); dimV(S,tx+tw+0.35,y,y+th,dims[1],dk); } }
function billboard(S,x,y,w,h,o){ o=o||{}; var dk=o.dark, lamps=o.lamps, bw=Math.min(w-0.2,(h-0.7)*o.ratio), bh=bw/o.ratio, bx=x+(w-bw)/2, by=y+(lamps?0.3:0.1);
  ground(S,bx-0.1,bx+bw+0.1,by+bh+0.55,dk);
  [0.28,0.72].forEach(function(f){ S.rect(bx+bw*f-0.05,by+bh,0.1,0.55,{fill:dk?C.WHITE:C.MID,a:dk?35:60}); });
  S.rect(bx,by,bw,bh,{fill:dk?C.WHITE:C.NAVY,a:dk?22:100,r:0.05}); S.rect(bx+0.06,by+0.06,bw-0.12,bh-0.12,{fill:dk?C.PINK:C.WHITE,a:dk?85:100,r:0.03});
  slantMotif(S,bx+bw*0.2,by+bh*0.18,bh*0.64,100,dk?[C.NAVY,C.WHITE,C.NAVY]:[C.NAVY,C.PINK,C.NAVY]);
  if(lamps){ [0.25,0.5,0.75].forEach(function(f){ S.line(bx+bw*f,by-0.05,bx+bw*f,by-0.25,{c:dk?C.WHITE:C.NAVY,lw:1.5,a:60}); S.oval(bx+bw*f-0.07,by-0.34,0.14,0.1,{fill:C.PINK}); }); } }
function buildingDraw(S,x,y,w,h,o){ o=o||{}; var dk=o.dark, bw=Math.min(w*0.62,h*0.62), bx=x+(w-bw)/2-0.25, by=y+0.05, bh=h-0.15;
  ground(S,bx-0.2,bx+bw+0.6,by+bh,dk);
  S.rect(bx,by,bw,bh,{fill:dk?C.WHITE:C.NAVY,a:dk?18:100,r:0.04});
  for(var r=0;r<7;r++) for(var k=0;k<4;k++) S.rect(bx+0.12+k*(bw-0.24)/4,by+0.45+r*(bh-0.7)/7,(bw-0.24)/4-0.08,(bh-0.7)/7-0.1,{fill:dk?C.WHITE:C.NAVY_L,a:dk?28:100});
  S.rect(bx+bw-0.02,by+bh*0.08,0.62,bh*0.5,{fill:C.PINK,r:0.03}); slantMotif(S,bx+bw+0.09,by+bh*0.12,bh*0.42,100,[C.WHITE,C.NAVY,C.WHITE]); }
function wheelDraw(S,x,y,d,o){ o=o||{}; var dk=o.dark, cx=x+d/2, cy=y+d*0.46, R=d*0.4, c=dk?C.WHITE:C.NAVY;
  S.oval(cx-R,cy-R,2*R,2*R,{line:c,lw:2.2}); S.oval(cx-R*0.62,cy-R*0.62,R*1.24,R*1.24,{line:c,lw:1,a:70});
  for(var i=0;i<8;i++){ var a=i*Math.PI/4; S.line(cx,cy,cx+R*Math.cos(a),cy+R*Math.sin(a),{c:c,lw:1.1,a:80});
    S.oval(cx+R*Math.cos(a)-0.07,cy+R*Math.sin(a)-0.07,0.14,0.14,{fill:i%2?C.PINK:(dk?C.WHITE:C.NAVY_L)}); }
  S.oval(cx-0.06,cy-0.06,0.12,0.12,{fill:C.PINK});
  S.line(cx,cy,cx-R*0.55,y+d*0.96,{c:c,lw:2.2}); S.line(cx,cy,cx+R*0.55,y+d*0.96,{c:c,lw:2.2}); ground(S,cx-R*0.8,cx+R*0.8,y+d*0.96,dk); }
function skyline(S,x,y,w,h,o){ var dk=(o||{}).dark, fillc=dk?C.WHITE:C.NAVY, a=dk?16:12, by=y+h;
  S.poly([[x,by],[x,y+h*0.62],[x+w*0.12,y+h*0.48],[x+w*0.22,y+h*0.55],[x+w*0.32,y+h*0.38],[x+w*0.42,y+h*0.5],[x+w*0.55,y+h*0.58],[x+w*0.66,y+h*0.42],[x+w*0.8,y+h*0.55],[x+w,y+h*0.5],[x+w,by]],{fill:fillc,a:a});
  var bl=[[0.05,0.44,0.06],[0.12,0.62,0.05],[0.19,0.5,0.05],[0.6,0.58,0.07],[0.69,0.45,0.05],[0.76,0.6,0.06],[0.86,0.5,0.06]];
  bl.forEach(function(b){ S.rect(x+w*b[0],by-h*b[1],w*b[2],h*b[1],{fill:fillc,a:a+8}); });
  var ax=x+w*0.44; S.rect(ax,by-h*0.92,w*0.045,h*0.92,{fill:fillc,a:a+16}); S.poly([[ax+w*0.0,by-h*0.92],[ax+w*0.0225,by-h*1.0],[ax+w*0.045,by-h*0.92]],{fill:fillc,a:a+16});
  [0.27,0.31,0.35].forEach(function(f,i){ S.oval(x+w*f,by-h*(0.3+i*0.04),w*0.04,h*0.3,{fill:fillc,a:a+10}); }); }
function pinIcon(S,x,y,s,col){ S.oval(x,y,s,s,{fill:col||C.PINK}); S.poly([[x+s*0.12,y+s*0.65],[x+s*0.88,y+s*0.65],[x+s*0.5,y+s*1.35]],{fill:col||C.PINK}); S.oval(x+s*0.32,y+s*0.3,s*0.36,s*0.36,{fill:C.WHITE}); }

/* ===== Brasília: Congresso Nacional e Metrô ===== */
function semi(cx,cy,r,up,n){ var pts=[]; for(var i=0;i<=n;i++){ var a=Math.PI*i/n; pts.push([cx+r*Math.cos(a),cy+(up?-1:1)*r*Math.sin(a)]); } return pts; }
function congresso(S,x,y,w,h,o){ o=o||{}; var dk=o.dark, fc=dk?C.WHITE:C.NAVY, a=dk?24:100, by=y+h, sl=h*0.1;
  ground(S,x,x+w,by,dk);
  S.rect(x+w*0.04,by-sl,w*0.92,sl,{fill:fc,a:dk?20:60});                                  // plataforma
  S.poly(semi(x+w*0.2,by-sl,w*0.14,true,16),{fill:fc,a:a});                                // cúpula (Senado)
  var bcx=x+w*0.8, br=w*0.1; S.poly(semi(bcx,by-sl-br,br,false,16),{fill:fc,a:a});                // tigela (Câmara)
  var tw=w*0.075, tx=x+w*0.46, th=h*0.86;
  [0,1].forEach(function(i){ var xx=tx+i*(tw+w*0.035); S.rect(xx,by-sl-th,tw,th,{fill:fc,a:dk?34:100}); for(var r=0;r<9;r++) S.line(xx+0.03,by-sl-th+0.12+r*th/9.5,xx+tw-0.03,by-sl-th+0.12+r*th/9.5,{c:dk?C.NAVY:C.WHITE,lw:0.75,a:dk?60:50}); });
  S.rect(tx+tw,by-sl-th*0.55,w*0.035,0.06,{fill:C.PINK}); S.oval(tx+tw+w*0.0175-0.03,by-sl-th-0.04,0.06,0.06,{fill:C.PINK}); }
function metroDraw(S,x,y,w,h,o){ o=o||{}; var dk=o.dark, k=o.kind||'ext', fc=dk?C.WHITE:C.NAVY, a=dk?24:100, gy=y+h-0.18;
  if(k==='ext'){ var bh=Math.min(h*0.62,w*0.26), by=gy-bh-0.12, bx=x+w*0.04, bw=w*0.92;
    S.line(x,gy,x+w,gy,{c:fc,lw:1.5,a:60}); S.rect(bx,by,bw,bh,{fill:fc,a:a,r:0.1});
    S.poly([[bx+bw*0.18,by],[bx+bw*0.18+bw*0.14,by],[bx+bw*0.14,by+bh],[bx,by+bh]],{fill:C.PINK}); S.poly([[bx+bw*0.4,by],[bx+bw*0.48,by],[bx+bw*0.44,by+bh],[bx+bw*0.36,by+bh]],{fill:C.PINK}); S.poly([[bx+bw*0.7,by],[bx+bw*0.78,by],[bx+bw*0.74,by+bh],[bx+bw*0.66,by+bh]],{fill:C.PINK});
    for(var i=0;i<6;i++) S.rect(bx+bw*(0.08+i*0.145),by+bh*0.18,bw*0.08,bh*0.34,{fill:dk?C.NAVY:C.WHITE,a:dk?70:100,r:0.03});
    [0.16,0.32,0.68,0.84].forEach(function(f){ S.oval(bx+bw*f-0.09,gy-0.2,0.18,0.18,{fill:fc,a:dk?60:100}); }); }
  else if(k==='cab'){ var bw2=Math.min(w*0.5,h*0.9), bh2=h*0.78, bx2=x+(w-bw2)/2, by2=y+0.05;
    S.line(x,gy,x+w,gy,{c:fc,lw:1.5,a:60}); S.rect(bx2,by2,bw2,bh2,{fill:fc,a:a,r:0.16}); S.rect(bx2+bw2*0.1,by2+bh2*0.1,bw2*0.8,bh2*0.42,{fill:C.NAVY_L,r:0.08}); S.poly([[bx2+bw2*0.1,by2+bh2*0.52],[bx2+bw2*0.9,by2+bh2*0.52],[bx2+bw2*0.9,by2+bh2*0.56],[bx2+bw2*0.1,by2+bh2*0.56]],{fill:C.PINK});
    S.oval(bx2+bw2*0.16,by2+bh2*0.7,0.14,0.14,{fill:C.PINK}); S.oval(bx2+bw2*0.84-0.14,by2+bh2*0.7,0.14,0.14,{fill:C.PINK}); S.rect(bx2+bw2*0.3,by2+bh2*0.68,bw2*0.4,0.08,{fill:dk?C.WHITE:C.MID,a:dk?40:70,r:0.04}); }
  else if(k==='int'){ var bx3=x+w*0.05, bw3=w*0.9, by3=y+h*0.05, bh3=h*0.8;
    S.rect(bx3,by3,bw3,bh3,{fill:fc,a:dk?16:12,r:0.1}); for(var i2=0;i2<3;i2++){ S.rect(bx3+bw3*(0.06+i2*0.31),by3+bh3*0.12,bw3*0.26,bh3*0.3,{fill:i2%2?C.NAVY_L:C.PINK,r:0.03}); S.poly([[bx3+bw3*(0.1+i2*0.31),by3+bh3*0.18],[bx3+bw3*(0.13+i2*0.31),by3+bh3*0.18],[bx3+bw3*(0.11+i2*0.31),by3+bh3*0.36],[bx3+bw3*(0.08+i2*0.31),by3+bh3*0.36]],{fill:C.WHITE,a:80}); }
    S.rect(bx3+bw3*0.04,by3+bh3*0.62,bw3*0.92,bh3*0.14,{fill:fc,a:dk?40:70,r:0.05}); S.line(bx3,by3+bh3,bx3+bw3,by3+bh3,{c:fc,lw:1.5,a:60}); }
  else { var bx4=x+w*0.06, bw4=w*0.88, by4=y+h*0.08, bh4=h*0.72;
    S.rect(bx4,by4,bw4,bh4,{fill:fc,a:dk?14:10,r:0.06}); var pw=bw4*0.62, ph=pw/3;
    S.rect(bx4+(bw4-pw)/2,by4+bh4*0.18,pw,ph,{fill:dk?C.WHITE:C.NAVY,a:dk?24:100,r:0.04}); S.rect(bx4+(bw4-pw)/2+0.06,by4+bh4*0.18+0.06,pw-0.12,ph-0.12,{fill:C.NAVY_L,r:0.02}); screenMotif(S,bx4+(bw4-pw)/2+0.06,by4+bh4*0.18+0.06,pw-0.12,ph-0.12);
    S.line(x,y+h*0.86,x+w,y+h*0.86,{c:fc,lw:1.5,a:60}); S.rect(x,y+h*0.86,w,0.06,{fill:C.PINK}); } }

/* ===== Estrutura do kit ===== */
var SEC = {
  led_bh:{nome:'Painéis de LED',praca:'Belo Horizonte',tipo:'Painel de LED',sep:2,cidade:'Belo Horizonte'},
  led_rm:{nome:'Painéis de LED',praca:'Região Metropolitana',tipo:'Painel de LED',sep:2},
  banca_led:{nome:'Bancas de LED',praca:'BH e região',tipo:'Banca de LED',sep:4},
  empena:{nome:'Empenas',praca:'',tipo:'Empena',sep:7},
  front:{nome:'Painéis frontlight',praca:'',tipo:'Frontlight',sep:8},
  mensal:{nome:'Mega Painéis',praca:'',tipo:'Mega painel',sep:9},
  outdoor:{nome:'Painéis outdoor',praca:'',tipo:'Outdoor',sep:13},
  revista:{nome:'Bancas Estáticas',praca:'',tipo:'Banca Estática',sep:10},
  mercado:{nome:'Mercado Central',praca:'',tipo:'Painel de LED',sep:5,tiles:[['FLUXO DE PESSOAS/MÊS','fluxo'],['VEICULAÇÕES/DIA','veic']]},
  guanabara:{nome:'Parque Guanabara',praca:'',tipo:'Circuito de LED',sep:6,tiles:[['VISITANTES POR MÊS','fluxo'],['VEICULAÇÕES/DIA','veic']]},
  metro:{nome:'Metrô-DF',praca:'',tipo:'Mídia no Metrô',sep:11,tiles:[['PASSAGEIROS/DIA','fluxo'],['PÚBLICO','publico']],nomap:true},
  df_painel:{nome:'Painéis de LED · Brasília',praca:'',tipo:'Painel de LED',sep:12,tiles:[['INSERÇÕES POR DIA','veic'],['FORMATO (PX)','pixels']]}
};
var SEC_ORDER=['led_bh','led_rm','banca_led','empena','front','mensal','revista','mercado','guanabara','metro','df_painel'];
var CIRCUITOS=['mercado','guanabara'];
var DONOS=[['padrao','Padrão'],['mega','MEGA'],['mega_r2','MEGA/R2'],['terceiros','Terceiros']];
function donoDe(p){ return p&&p.dono||'padrao'; }
function donoNome(k){ var r=DONOS.filter(function(d){return d[0]===k})[0]; return r?r[1]:k; }
function setCircuito(D,sec,val){ ptsOf(D,sec).forEach(function(p){ p.sel=val; }); }
function sincCircuitos(D){ CIRCUITOS.forEach(function(k){ var a=ptsOf(D,k); if(a.some(function(p){return p.sel;})) a.forEach(function(p){ p.sel=true; }); }); }
function vlr(v){ return typeof v==='number'?v:num(v); }
/* Grupos na ordem fixa do sistema (dono MEGA/R2/Terceiros é só interno) */
var GRUPOS=[
 {k:'mercado',nome:'Circuito Mercado Central',sec:['mercado']},
 {k:'led_mega',nome:'Painéis de LED MEGA',sec:['led_bh','led_rm'],r2:false},
 {k:'banca_mega',nome:'Bancas de LED MEGA',sec:['banca_led'],r2:false},
 {k:'led_r2',nome:'Painéis MEGA/R2',sec:['led_bh','led_rm'],r2:true},
 {k:'banca_r2',nome:'Bancas MEGA/R2',sec:['banca_led'],r2:true},
 {k:'guanabara',nome:'Parque Guanabara',sec:['guanabara']},
 {k:'empena',nome:'Empenas',sec:['empena']},
 {k:'front',nome:'Painéis Frontlight',sec:['front']},
 {k:'mensal',nome:'Mega Painéis',sec:['mensal']},
 {k:'outdoor',nome:'Painéis Outdoor',sec:['outdoor']},
 {k:'revista',nome:'Bancas Estáticas',sec:['revista']},
 {k:'metro',nome:'Metrô-DF',sec:['metro']},
 {k:'df_painel',nome:'Painéis de LED Brasília',sec:['df_painel']}
];
var GRUPO_NOVOS={led_mega:1,banca_mega:1,led_r2:1,banca_r2:1};
function grupoDe(p){ var r2=(p&&p.dono)==='mega_r2'; for(var i=0;i<GRUPOS.length;i++){ var g=GRUPOS[i]; if(g.sec.indexOf(p.secao)>=0&&(g.r2===undefined||g.r2===r2)) return g; } return GRUPOS[GRUPOS.length-1]; }
function grupoIdx(p){ return GRUPOS.indexOf(grupoDe(p)); }
function grupoPorK(k){ return GRUPOS.filter(function(g){return g.k===k})[0]; }
function ordenaPts(D){ D.pontos=D.pontos.map(function(p,i){return [p,i]}).sort(function(a,b){ return (grupoIdx(a[0])-grupoIdx(b[0]))||(a[1]-b[1]); }).map(function(x){return x[0]}); }
function aplicaGrupo(p,k){ var g=grupoPorK(k); if(!g) return;
  if(g.r2===true) p.dono='mega_r2'; else if(g.r2===false&&p.dono==='mega_r2') p.dono='padrao';
  if(g.sec.indexOf(p.secao)<0) p.secao=g.sec[0];
  if(g.sec.length>1) p.secao=(!p.cidade||/belo horizonte/i.test(p.cidade))?'led_bh':'led_rm'; }
function ptsOf(D,sec){ if(GRUPO_NOVOS[sec]) return D.pontos.filter(function(p){return grupoDe(p).k===sec;}); return D.pontos.filter(function(p){return p.secao===sec;}); }
function num(v){ v=parseFloat(String(v).replace(/\./g,'').replace(',','.')); return isNaN(v)?0:v; }
function brl(v){ return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function logoAt(S,asset,x,y,h){ if(!asset) return 0; var w=h*asset.w/asset.h; S.img(x,y,w,h,asset,{contain:true}); return w; }

function frame(S0,A,kicker,title,sub,partner){
  var S=new Slide({c:C.BG});
  S.text(0.6,0.42,7.5,0.3,String(kicker).toUpperCase(),{size:10,f:'B',color:C.PINK,spc:220});
  var tl=String(title).length; S.text(0.6,0.7,8.4,0.7,title,{size:tl>62?17:(tl>44?21:28),f:'M',color:C.NAVY,ls:0.95,valign:tl>44?'m':'t'});
  if(sub) S.text(0.6,1.38,8.6,0.35,sub,{size:12,f:'L',color:C.MID});
  var lw=logoAt(S,A.logoC,0,0.4,0.5); // reposiciona
  S.items.pop(); lw=0.5*A.logoC.w/A.logoC.h; S.img(SW-0.6-lw,0.4,lw,0.5,A.logoC,{contain:true});
  if(partner){ var dx=SW-0.6-lw-0.16; S.rect(dx,0.46,0.015,0.38,{fill:C.LINE});
    if(partner==='mercado'&&A.mercN){ var pw=0.5*A.mercN.w/A.mercN.h; S.img(dx-0.16-pw,0.4,pw,0.5,A.mercN,{contain:true}); }
    else if(partner==='guanabara') wheelDraw(S,dx-0.16-0.62,0.34,0.62,{dark:false}); }
  S.text(0.6,7.04,6,0.25,'MEGA MÍDIA OOH  ·  '+(A.D.kit.titulo||'MÍDIA KIT').toUpperCase(),{size:8,f:'R',color:C.MID,spc:120});
  S.rect(SW-1.1,7.02,0.5,0.26,{fill:C.NAVY,r:0.13});
  S.pn=S.text(SW-1.1,7.02,0.5,0.26,'00',{size:8.5,f:'B',color:C.WHITE,align:'c',valign:'m'});
  return S;
}

/* enquadramento da foto: x,y (0-100) = foco; z (100-300) = zoom; inteira = mostra a foto toda */
function cropRect(aw,ah,aspect,aj){ var z=Math.max(100,Math.min(300,+aj.z||100))/100, sw,sh; if(aw/ah>aspect){ sh=ah; sw=sh*aspect; } else { sw=aw; sh=sw/aspect; } sw/=z; sh/=z;
  var fx=aj.x==null?50:+aj.x, fy=aj.y==null?50:+aj.y; return {sx:(aw-sw)*fx/100,sy:(ah-sh)*fy/100,sw:sw,sh:sh}; }
var cropCache={};
function fotoAjustada(a,key,aspect,aj){ var ck=key+'|'+aspect.toFixed(3)+'|'+[aj.x,aj.y,aj.z].join(','); if(cropCache[ck]) return cropCache[ck];
  var W=1600, H=Math.round(W/aspect), cv=document.createElement('canvas'); cv.width=W; cv.height=H; var c=cv.getContext('2d'), r=cropRect(a.w,a.h,aspect,aj);
  c.drawImage(a.el,r.sx,r.sy,r.sw,r.sh,0,0,W,H); var o={src:cv.toDataURL('image/jpeg',0.92),w:W,h:H,el:cv}; cropCache[ck]=o; return o; }
function photoSlotP(S,A,p,x,y,w,h,r){ var key=Array.isArray(p.foto)?p.foto[0]:p.foto, a=A.photos[key], aj=p.fotoAj;
  if(!a||!aj||(!aj.inteira&&(aj.x==null||aj.x==50)&&(aj.y==null||aj.y==50)&&(!aj.z||aj.z==100))) return photoSlot(S,A,key,x,y,w,h,r);
  if(aj.inteira){ S.rect(x,y,w,h,{fill:C.NAVY,r:r||0}); S.img(x,y,w,h,a,{contain:true,r:r}); return; }
  S.img(x,y,w,h,fotoAjustada(a,key,w/h,aj),{r:r}); }
function photoSlot(S,A,key,x,y,w,h,r){ var a=A.photos[key]; if(a) S.img(x,y,w,h,a,{r:r}); else { S.rect(x,y,w,h,{fill:C.NAVY_L,a:100,r:r||0}); slantMotif(S,x+w/2-0.7,y+h/2-0.9,1.8,18); } }

function edge(S,A,x0,d,key,nomotif){
  var a=key&&A.photos[key];
  if(a) S.img(x0,0,SW-x0,SH,a); else { S.rect(x0,0,SW-x0,SH,{fill:C.NAVY_L}); if(!nomotif) slantMotif(S,x0+(SW-x0)/2-0.6,SH/2-1.4,2.8,16); }
  S.poly([[0,0],[x0+d,0],[x0,SH],[0,SH]],{fill:C.NAVY});
  S.poly([[x0+d-0.26,0],[x0+d-0.12,0],[x0-0.12,SH],[x0-0.26,SH]],{fill:C.PINK});
  S.poly([[x0+d-0.42,0],[x0+d-0.34,0],[x0-0.34,SH],[x0-0.42,SH]],{fill:C.WHITE,a:55});
}

/* ordem de exibição das capas no kit (os números i são estáveis; a posição vem daqui) */
var SEQ=[5,2,4,6,7,8,9,13,10,11,12];
function NP(i){ var n=SEQ.indexOf(i)+1; return (n<10?'0':'')+n; }
var SEPS=[
 {i:1,off:true,title:'Belo\nHorizonte',kick:'Praça',sub:'Painéis, bancas, empenas e mais',hero:function(S){skyline(S,0.35,1.3,4.0,2.1,{dark:true});},secs:['led_bh','banca_led']},
 {i:2,title:'Painéis\nde LED',kick:'Formato',sub:'Belo Horizonte e região metropolitana',hero:function(S){ledPanel(S,0.8,1.35,3.3,2.1,{dark:true,ratio:2.7});},secs:['led_mega','led_r2']},
 {i:3,off:true,title:'Região\nMetropolitana',kick:'Praça',sub:'Painéis de LED',hero:function(S){ledPanel(S,0.8,1.45,3.3,2.0,{dark:true,ratio:2.7});pinIcon(S,3.3,1.25,0.45);},secs:['led_rm']},
 {i:4,title:'Bancas\nde LED',kick:'Formato',sub:'Belo Horizonte e região metropolitana',hero:function(S){bancaDraw(S,0.9,1.35,3.0,2.1,{dark:true});},secs:['banca_mega','banca_r2']},
 {i:5,title:'Mercado\nCentral',kick:'Ponto especial',sub:'',hero:function(S,A){ if(A.mercW) S.img(1.0,1.2,2.8,2.2,A.mercW,{contain:true}); },secs:[],photo:'mercado_foto'},
 {i:6,title:'Parque\nGuanabara',kick:'Ponto especial',sub:'',hero:function(S){wheelDraw(S,1.0,1.15,2.4,{dark:true});},secs:[],photo:'guanabara_foto2'},
 {i:7,title:'Empenas',kick:'Formato',sub:'Mídia estática de grande formato',hero:function(S){buildingDraw(S,0.8,1.2,3.2,2.25,{dark:true});},secs:['empena']},
 {i:8,title:'Painéis\nfrontlight',kick:'Formato',sub:'',hero:function(S){billboard(S,0.5,1.15,3.7,2.3,{dark:true,lamps:true,ratio:2.8});},secs:['front']},
 {i:9,title:'Mega\nPainéis',kick:'Formato',sub:'Mega painéis em pontos estratégicos',hero:function(S){billboard(S,0.5,1.4,3.7,2.0,{dark:true,ratio:3.4});},secs:['mensal']},
 {i:10,title:'Bancas\nEstáticas',kick:'Formato',sub:'Mídia estática em bancas de revista',hero:function(S){bancaDraw(S,0.9,1.35,3.0,2.1,{dark:true,kind:'revista'});},secs:['revista']},
 {i:11,title:'Brasília',kick:'Praça',sub:'Metrô-DF e painéis de LED',hero:function(S){congresso(S,0.6,1.3,3.7,2.1,{dark:true});},secs:['metro','df_painel']},
 {i:12,title:'Painéis de LED\nBrasília',kick:'Formato',sub:'Distrito Federal',hero:function(S){ledPanel(S,1.2,1.1,2.6,2.4,{dark:true,ratio:0.67});pinIcon(S,3.4,1.1,0.45);},secs:['df_painel']},
 {i:13,title:'Painéis\noutdoor',kick:'Formato',sub:'Outdoors em vias de grande circulação',hero:function(S){billboard(S,0.5,1.4,3.7,2.0,{dark:true,ratio:3.0});},secs:['outdoor']}
];
var SEPINFO={
 1:{texto:'Capital de Minas Gerais, com mais de 2,3 milhões de habitantes e centro de uma região metropolitana de cerca de 6 milhões de pessoas. Principal polo econômico, cultural e de serviços do estado, concentra grandes avenidas, corredores de trânsito intenso e bairros de alto consumo: cenário ideal para mídia exterior de alto impacto.',stats:[['auto','pontos na capital'],['2,3 mi','habitantes'],['6 mi','na região metropolitana']],bullets:['Painéis de LED nos principais corredores viários','Bancas de LED no centro e nos bairros','Empenas, frontlight, painéis mensais e bancas de revista']},
 2:{texto:'Mídia digital em movimento: vídeos de 10 segundos, em loop, com no mínimo 500 inserções por dia em cada painel. Alta visibilidade dia e noite, troca de campanha rápida e flexibilidade para comunicar no momento certo.',stats:[['auto','painéis de LED'],['500','mínimo de inserções por dia / painel'],['10 s','duração do VT']],bullets:['Instalados em avenidas de grande circulação','Arquivo em MP4, até 20 MB','Ideal para awareness e ações de curto prazo']},
 3:{texto:'Painéis de LED nos principais acessos e avenidas das cidades da região metropolitana, levando a campanha para além da capital e alcançando quem circula todos os dias entre os municípios.',stats:[['auto','painéis na região'],['500','mínimo de inserções por dia / painel'],['10 s','duração do VT']],bullets:['Cobertura dos grandes eixos de ligação com BH','Mesmo formato e regras dos painéis da capital','Complementa a campanha com alcance regional']},
 4:{texto:'Bancas transformadas em painéis digitais de LED, espalhadas pelo centro e pelos bairros. Mídia na altura do olhar, que conversa com pedestres e motoristas e aproxima a marca do consumidor no dia a dia da cidade.',stats:[['auto','bancas de LED'],['500','mínimo de inserções por dia / banca'],['10 s','duração do VT']],bullets:['Presença em ruas de grande fluxo de pedestres','Comunicação próxima e de alta frequência','Arquivo em MP4, até 20 MB']},
 5:{texto:'Maior mercado da América Latina e um dos principais pontos turísticos e gastronômicos de BH, recebendo visitantes do mundo todo.',stats:[['400+','lojas'],['15 mi','pessoas por ano'],['40 mil','pessoas por dia']],bullets:['Circuito de 8 telas de LED','Estacionamento com 420 vagas rotativas','Espaço monitorado por 90 câmeras']},
 6:{texto:'Um dos parques de diversões mais tradicionais do Brasil, na região da Lagoa da Pampulha, um dos principais cartões-postais de BH. Conecta marcas a um público diverso nos momentos de lazer.',stats:[['70 mil','visitantes por mês'],['1951','ano de fundação'],['10','telas no circuito']],bullets:['Famílias, grupos escolares e turistas','Ambiente emocionalmente positivo','Estacionamento próprio no parque']},
 7:{texto:'Mídia estática de grande formato aplicada nas laterais de edifícios. Altíssima visibilidade e forte presença de marca, vista de longe por quem circula na região.',stats:[['auto','empenas'],['Grande','formato'],['Mensal','período de exposição']],bullets:['Pontos de grande visibilidade na cidade','Impacto de marca em escala urbana','Exposição contínua durante o período']},
 8:{texto:'Painéis iluminados que garantem a leitura da mensagem também à noite, instalados em vias de grande circulação.',stats:[['auto','painéis frontlight'],['Dia e noite','visibilidade'],['Mensal','período de exposição']],bullets:['Iluminação própria para leitura noturna','Vias de grande circulação','Exposição contínua durante o mês']},
 9:{texto:'Mega painéis em pontos estratégicos, com exposição contínua durante todo o mês e grande impacto visual.',stats:[['auto','mega painéis'],['Mega','formatos de impacto'],['Mensal','período de exposição']],bullets:['Pontos estratégicos de grande fluxo','Mídia de massa com alto alcance','Exposição contínua durante o mês']},
 10:{texto:'Bancas estáticas tradicionais da cidade, com comunicação impressa próxima ao pedestre, em pontos de grande circulação.',stats:[['auto','bancas estáticas'],['Rua','mídia na altura do olhar'],['Mensal','período de exposição']],bullets:['Localização em regiões de grande fluxo','Presença local e contato próximo','Boa opção para ações de proximidade']},
 11:{texto:'Capital federal, Patrimônio Cultural da Humanidade pela UNESCO e sede dos poderes da República. Com mais de 2,8 milhões de habitantes e uma das maiores rendas do país, reúne um público qualificado, que se desloca pelas grandes vias e pelo Metrô-DF.',stats:[['auto','pontos em Brasília'],['2,8 mi','habitantes'],['160 mil','usuários por dia no Metrô-DF']],bullets:['Mídia no Metrô-DF: vagões e estações','Painéis de LED nas principais vias','Público A, B e C']},
 13:{texto:'Outdoors em vias de grande circulação: formato tradicional da mídia exterior, com exposição contínua durante o mês e ótimo custo-benefício para construir presença de marca.',stats:[['auto','painéis outdoor'],['Mensal','período de exposição']],bullets:['Pontos de grande fluxo de pessoas e veículos','Visibilidade contínua, dia após dia','Ótimo custo-benefício']},
 12:{texto:'Painéis de LED nos eixos e rodovias que ligam o Plano Piloto ao restante do Distrito Federal, falando com quem se desloca todos os dias de carro.',stats:[['auto','painéis de LED'],['420','inserções por dia'],['10 s','duração do VT']],bullets:['Eixos e rodovias de grande fluxo','Vídeos de 10 segundos em MP4','Alta frequência e repetição de marca']}
};
function sepInfo(D,i){ D.sepInfo=D.sepInfo||{}; if(!D.sepInfo[i]) D.sepInfo[i]=JSON.parse(JSON.stringify(SEPINFO[i])); return D.sepInfo[i]; }
/* garantia comercial: 500 inserções por dia é o MÍNIMO entregue (vale também para textos já salvos) */
function minTxt(t){ t=String(t==null?'':t); return /m[ií]nimo/i.test(t)?t:t.replace(/(\b)500 inser/g,'$1no mínimo 500 inser'); }
function minLbl(val,lbl){ lbl=String(lbl||''); if(!/^\s*500/.test(String(val))||/m[ií]nimo/i.test(lbl)) return lbl; return lbl.replace(/^(inserções|veiculações)/i,function(m){ return 'mínimo de '+m.toLowerCase(); }); }
function separator(D,A,sp){
  var S=new Slide({c:C.NAVY}), info=sepInfo(D,sp.i), X=5.75;
  slantMotif(S,9.6,-0.5,6.2,10);
  S.rect(X-0.35,0,0.07,SH,{fill:C.PINK,a:100}); S.rect(X-0.55,0,0.04,SH,{fill:C.WHITE,a:35});
  logoAt(S,A.logoW,0.7,0.45,0.7); sp.hero(S,A);
  S.text(0.7,3.62,3.9,0.3,NP(sp.i)+'  ·  '+sp.kick.toUpperCase(),{size:9.5,f:'B',color:C.PINK,spc:200});
  S.text(0.7,3.95,4.0,1.5,sp.title,{size:32,f:'M',color:C.WHITE,ls:0.92});
  var sub=sp.sub; if(sp.i===5) sub=D.mercado.circuito; if(sp.i===6) sub=D.guanabara.circuito; if(sub) S.text(0.7,5.35,3.7,0.8,sub,{size:12,f:'L',color:'CCCCE0',ls:1.0});
  // direita: informação
  var cnt=0; sp.secs.forEach(function(k){ cnt+=ptsOf(D,k).length; }); if(sp.i===1) cnt=ptsOf(D,'led_bh').length+ptsOf(D,'banca_led').length+ptsOf(D,'empena').length+ptsOf(D,'front').length+ptsOf(D,'mensal').length+ptsOf(D,'revista').length; if(sp.i===5) cnt=D.mercado.nTelas||0; if(sp.i===6) cnt=D.guanabara.nTelas||0;
  var RX=X+0.15, RW=SW-RX-0.7;
  S.text(RX,1.05,RW,0.3,(sp.kick==='Praça'||sp.kick==='Ponto especial'?'SOBRE A PRAÇA':'SOBRE O FORMATO'),{size:9.5,f:'B',color:C.PINK,spc:200});
  S.rect(RX+0.02,1.42,0.9,0.06,{fill:C.PINK});
  var tx=minTxt(info.texto||''), tsz=tx.length>260?15:(tx.length>170?17:19);
  S.text(RX,1.7,RW,2.3,tx,{size:tsz,f:'L',color:C.WHITE,ls:1.05});
  var sts=(info.stats||[]).filter(function(st){ return st[0]!=='auto'; }).slice(0,3), sw=(RW-0.2*(sts.length-1))/Math.max(1,sts.length); sts.forEach(function(st,k){ var x=RX+k*(sw+0.2), val=st[0];
    gcard(S,x,4.15,sw,1.35,k===1?C.PINK:C.NAVY_L,0.14);
    S.text(x+0.2,4.3,sw-0.35,0.7,val,{size:String(val).length>6?24:32,f:'M',color:C.WHITE,valign:'m'});
    S.text(x+0.2,4.98,sw-0.35,0.45,minLbl(st[0],st[1]),{size:9.5,f:'L',color:k===1?C.WHITE:'CCCCE0',ls:1.0}); });
  (info.bullets||[]).slice(0,3).forEach(function(b,k){ var y=5.8+k*0.36; S.oval(RX+0.02,y+0.09,0.12,0.12,{fill:C.PINK}); S.text(RX+0.3,y,RW-0.3,0.32,b,{size:11,f:'L',color:'E6E6F2'}); });
  var xx=0.75; for(var i=0;i<SEQ.length;i++){ var cur=SEQ[i]===sp.i, w=cur?0.42:0.15; S.rect(xx,6.8,w,0.07,{fill:cur?C.PINK:'5A5A9A',r:0.035}); xx+=w+0.05; }
  return S;
}

function gmapsStreet(p){ return 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+p.lat+','+p.lng; }
function ficha(D,A,p){
  var sec=SEC[p.secao], S=frame(null,A,NP(sec.sep)+' · '+sec.nome+'  ·  Ficha de ponto',p.endereco||'Endereço',[p.bairro,p.cidade].filter(Boolean).join(' · '));
  photoSlotP(S,A,p,0.6,1.95,6.5,4.85,0.22);
  var tipoVal=p.tipoTxt||sec.tipo, tl=Math.max(1.4,Math.min(3.6,tipoVal.length*0.12+0.5));
  var cx=7.4, cw=5.33, tiles=sec.tiles||[['FLUXO DE CARROS/DIA','fluxo'],['IMPACTO SEMANAL','impacto']];
  [['Tipo',tipoVal],['Formato',p.tamanho||'—'],['Público',p.publico||'—']].forEach(function(kv,i){ var w=(cw-0.4)/3, x=cx+i*(w+0.2);
    card(S,x,1.95,w,1.0,0.14); S.text(x+0.12,2.05,w-0.2,0.25,kv[0].toUpperCase(),{size:8,f:'B',color:C.PINK,spc:100}); S.text(x+0.12,2.32,w-0.2,0.55,kv[1],{size:kv[1].length>16?10:12,f:'M',color:C.NAVY,ls:0.95}); });
  [[C.NAVY,0],[C.PINK,2.76]].forEach(function(t,i){ var cfg=tiles[i], val=p[cfg[1]]||'—'; gcard(S,cx+t[1],3.15,2.57,1.35,t[0],0.14);
    S.text(cx+t[1]+0.2,3.25,2.3,0.25,cfg[0],{size:8,f:'B',color:C.WHITE,spc:100}); S.text(cx+t[1]+0.2,3.58,2.2,0.8,val,{size:String(val).length>9?24:30,f:'M',color:C.WHITE,valign:'m'}); });
  card(S,cx,4.7,cw,2.1,0.2);
  var m=A.maps[p.id], hasll=p.lat!=null&&p.lat!==''&&!isNaN(p.lat);
  if(sec.nomap||!hasll){ S.rect(cx+0.15,4.85,2.6,1.8,{fill:C.NAVY,r:0.18}); if(sec.nomap) metroDraw(S,cx+0.25,4.95,2.4,1.5,{dark:true,kind:/cabeceira/i.test(p.endereco)&&!/interna/i.test(p.endereco)?'cab':(/interna/i.test(p.endereco)?'int':(/esta/i.test(p.endereco)?'est':'ext'))}); else pinIcon(S,cx+1.2,5.3,0.5,C.PINK);
    S.text(cx+2.95,4.85,2.3,0.25,'PRAÇA',{size:8,f:'B',color:C.PINK,spc:100}); S.text(cx+2.95,5.08,2.3,0.3,p.cidade||'Brasília-DF',{size:11,f:'M',color:C.NAVY});
    S.text(cx+2.95,5.45,2.3,0.25,'MÍDIA',{size:8,f:'B',color:C.PINK,spc:100}); S.text(cx+2.95,5.68,2.3,0.9,p.endereco||'',{size:9.5,f:'L',color:C.INK,ls:1.0});
    return S; }
  if(m) S.img(cx+0.15,4.85,2.6,1.8,m,{r:0.18}); else S.rect(cx+0.15,4.85,2.6,1.8,{fill:'EEF0F8',r:0.18});
  var long=(p.sentido||'').length>26;
  var temSent=String(p.sentido||'').trim()!=='';
  if(temSent){ S.text(cx+2.95,4.85,2.3,0.25,'SENTIDO',{size:8,f:'B',color:C.PINK,spc:100}); S.text(cx+2.95,5.08,2.3,long?0.62:0.3,p.sentido,{size:long?8.5:11,f:'M',color:C.NAVY,ls:long?0.95:1}); }
  var ly=temSent?(long?5.72:5.45):4.85;
  S.text(cx+2.95,ly,2.3,0.25,'LAT. / LONG.',{size:8,f:'B',color:C.PINK,spc:100});
  S.text(cx+2.95,ly+0.23,2.3,long?0.25:0.5,long?Number(p.lat).toFixed(5)+' , '+Number(p.lng).toFixed(5):[Number(p.lat).toFixed(7),Number(p.lng).toFixed(7)],{size:long?9:10.5,f:'L',color:C.INK,ls:1.0});
  pill(S,cx+2.97,temSent?(long?6.32:6.2):(ly+(long?0.78:1.08)),2.2,0.38,'LINK STREET VIEW  ↗',{fill:C.NAVY,size:8.5,link:gmapsStreet(p)});
  return S;
}

function specSlide(A,kicker,title,sub,rows,colw,drawFn,caption,chipItems,o){
  o=o||{}; var S=frame(null,A,kicker,title,sub,o.partner), n=rows.length-1, rowH=o.rowH||0.56, ch=Math.max(o.minH||3.4,0.3+0.42+n*rowH+0.2); ch=Math.min(ch,4.6);
  if(n*rowH+0.7>4.6) rowH=(4.6-0.7)/n;
  card(S,0.6,1.95,7.9,ch,0.2); table(S,0.85,2.2,7.4,rows,colw,{rowH:rowH,size:o.size||11.5,aligns:o.aligns});
  card(S,8.7,1.95,4.03,ch,0.2); S.text(8.92,2.1,3.6,0.25,'REPRESENTAÇÃO',{size:8,f:'B',color:C.PINK,spc:160});
  drawFn(S,8.9,2.45,3.65,ch-1.0); S.text(8.92,1.95+ch-0.45,3.6,0.35,caption,{size:8.5,f:'L',color:C.MID,ls:1.0});
  chips(S,1.95+ch+0.25,(chipItems||[]).map(function(c){ return [c[0],minLbl(c[0],c[1])]; })); return S;
}
/* uma linha por ponto (endereço · bairro) */
function groupSpec(pts,withVeic,maxc,label){ maxc=maxc||60;
  var N=function(v){ return String(v||'').replace(/\s+/g,'').toLowerCase(); };
  if(label&&pts.length>1){ var gr=[], idx={};
    pts.forEach(function(p){ var key=N(p.tamanho)+'|'+N(p.pixels)+'|'+(withVeic?N(p.veic):''); if(!(key in idx)){ idx[key]=gr.length; gr.push(p); } });
    return gr.map(function(q){ var r0=[label+(q.tamanho?' · '+q.tamanho:''),q.tamanho||'—',q.pixels||'—']; if(withVeic) r0.push(q.veic||'—'); return r0; });
  }
  return pts.map(function(p){ var loc=(p.endereco||'')+(p.bairro?' · '+p.bairro:''); if(loc.length>maxc) loc=loc.slice(0,maxc-1).trim()+'…'; var r=[loc,p.tamanho||'—',p.pixels||'—']; if(withVeic) r.push(p.veic||'—'); return r; });
}
function specPages(push,A,kick,sub,head,rows,colw,drawFn,cap,chips,o){ var per=7, nch=Math.max(1,Math.ceil(rows.length/per));
  for(var li=0;li<rows.length;li+=per) push(specSlide(A,kick,'Especificações técnicas'+(nch>1?' · '+(li/per+1)+'/'+nch:''),sub,[head].concat(rows.slice(li,li+per)),colw,drawFn,cap,chips,Object.assign({rowH:0.46,size:10.5,minH:3.2},o||{}))); }

/* ===== Montagem do kit completo ===== */
function migKit(D){ var K=D.kit; if(!K.v3){ K.v3=1; K.fotoCapa=null; K.fotoContra=null; } if(!K.capaTexto) K.capaTexto='Mídia exterior digital e estática, comunicação visual e projetos especiais para conectar a sua marca às pessoas nas ruas de Belo Horizonte, região metropolitana e Brasília.'; if(!K.capaStats) K.capaStats=[['auto','pontos de mídia'],['3','praças atendidas'],['11','formatos de mídia']]; if(!K.capaPilares) K.capaPilares=['Mídia OOH','Comunicação visual','Projetos especiais']; }
var ASS_CAMPOS=[['nome','Nome'],['cargo','Cargo'],['email','E-mail'],['tel1','Telefone / WhatsApp'],['tel2','Telefone fixo'],['site','Site']];
function assinaturaDe(uid){ var K=D.kit, R=Object.assign({},K.resp), a=(K.assinaturas&&uid&&K.assinaturas[uid])||null; if(a) ASS_CAMPOS.forEach(function(c){ if(String(a[c[0]]||'').trim()!=='') R[c[0]]=a[c[0]]; }); return R; }
function buildSlides(D0,A,mode){ migKit(D0);
  var full=(mode!=='proposta'&&mode!=='kit'), noPrice=(mode==='kit'), D=Object.assign({},D0); if(!full) D.pontos=D0.pontos.filter(function(p){return p.sel;});
  function has(k){ return ptsOf(D,k).length>0; }
  A.D=D; var out=[], K=D.kit, R=assinaturaDe(ME&&ME.uid);
  var CG=0; function push(S){ S.__g=CG; out.push(S); return S; }

  // 1 CAPA
  var S=new Slide({g:[C.NAVY_D,C.NAVY]}); edge(S,A,7.2,1.2,null,true);
  /* desenho de painéis, bem sutil, ao fundo do painel direito */
  ledPanel(S,7.75,2.0,5.2,3.9,{dark:true,ratio:2.4});
  S.rect(7.2,0,SW-7.2,SH,{fill:C.NAVY_L,a:86});
  logoAt(S,A.logoW,0.75,0.6,1.0); var pt=(!full&&K.cliente)?('PROPOSTA  ·  '+K.cliente.toUpperCase()):('MÍDIA KIT  ·  '+(K.ano||'2026')); pill(S,0.8,2.6,Math.max(2.6,pt.length*0.115+0.6),0.36,pt,{size:9.5});
  S.text(0.75,3.1,6.2,0.9,K.frase1||'Pense grande.',{size:44,f:'L',color:C.WHITE}); S.text(0.75,3.85,6.2,1.2,K.frase2||'Pense MEGA.',{size:58,f:'B',color:C.WHITE});
  S.rect(0.85,5.27,1.3,0.07,{fill:C.PINK}); S.text(0.75,5.55,5.4,0.9,K.subtitulo||'',{size:14,f:'L',color:'E6E6F0'});
  S.text(0.75,6.85,6,0.3,(R.site||'')+'   ·   '+(R.tel2||''),{size:9.5,f:'L',color:C.WHITE});
  var RX=8.2, RW=SW-RX-0.6;
  S.text(RX,0.95,RW,0.3,'SOBRE A MEGA MÍDIA OOH',{size:9.5,f:'B',color:C.PINK,spc:200}); S.rect(RX+0.02,1.32,0.9,0.06,{fill:C.PINK});
  S.text(RX,1.6,RW,2.3,K.sobre||'',{size:14,f:'L',color:C.WHITE,ls:1.15});
  [['Mídia OOH','Diversas opções de mídias'],['Comunicação visual','Equipe profissional capacitada'],['Projetos especiais','Qualquer projeto em Minas Gerais']].forEach(function(t,i){ var y=4.1+i*0.62; S.oval(RX+0.02,y+0.1,0.13,0.13,{fill:C.PINK}); S.text(RX+0.32,y,RW-0.3,0.28,t[0],{size:12,f:'M',color:C.WHITE}); S.text(RX+0.32,y+0.27,RW-0.3,0.26,t[1],{size:9.5,f:'L',color:'CCCCE0'}); });
  S.text(RX,6.85,RW,0.3,K.selo||'',{size:10,f:'M',color:'CCCCE0'});
  push(S);

  // 2 INTRO
  S=new Slide({c:C.BG}); S.rect(0,0,5.7,SH,{fill:C.NAVY}); slantMotif(S,0.8,3.95,2.2,18);
  S.text(0.7,0.75,4.8,0.9,'Pense',{size:40,f:'L',color:C.PINK}); S.text(0.7,1.45,4.8,0.9,'grande.',{size:40,f:'B',color:C.WHITE});
  S.text(0.7,2.25,4.8,0.9,'Pense',{size:40,f:'L',color:C.PINK}); S.text(0.7,2.95,4.8,0.9,'MEGA.',{size:40,f:'B',color:C.WHITE});
  logoAt(S,A.logoW,0.7,6.3,0.62);
  S.text(6.3,0.62,5,0.3,'SOBRE A MEGA',{size:10,f:'B',color:C.PINK,spc:220}); S.text(6.3,0.92,6.4,0.7,'Quem somos',{size:28,f:'M',color:C.NAVY});
  S.text(6.3,1.85,6.4,2.4,D.kit.sobre,{size:14,f:'L',color:C.INK,ls:1.3});
  [['Mídia OOH','Diversas opções de mídias'],['Comunicação visual','Equipe profissional capacitada'],['Projetos especiais','Qualquer projeto em Minas Gerais']].forEach(function(t,i){ var x=6.3+i*2.18;
    card(S,x,4.45,2.04,1.75,0.14); S.text(x+0.15,4.58,1,0.45,'0'+(i+1),{size:20,f:'M',color:C.PINK}); S.text(x+0.15,5.02,1.8,0.4,t[0],{size:11.5,f:'M',color:C.NAVY}); S.text(x+0.15,5.5,1.8,0.6,t[1],{size:9.5,f:'L',color:C.MID,ls:1.0}); });
  pill(S,6.3,6.5,4.2,0.4,'Atendimento exclusivo e personalizado',{fill:C.PINK_S,color:C.PINK_D,size:9.5}); push(S);

  // 3 MAPA GERAL
  var bhCount=['led_bh','banca_led','empena','front','mensal','outdoor','revista'].reduce(function(a,s){return a+ptsOf(D,s).length;},0);
  S=frame(null,A,'Cobertura','Onde estamos','Mega Mídia OOH em Belo Horizonte, região metropolitana e Brasília');
  card(S,0.6,1.95,7.7,4.85,0.2); if(A.mapGeral) S.img(0.8,2.15,7.3,4.45,A.mapGeral,{r:0.18}); else S.rect(0.8,2.15,7.3,4.45,{fill:'EEF0F8',r:0.18});
  [['Belo Horizonte','LED, bancas, empenas, frontlight, mega painéis e outdoors','01'],['Região Metropolitana','Painéis de LED','02'],['Mercado Central',D.mercado.circuito,'03'],['Parque Guanabara',D.guanabara.circuito,'04'],['Brasília · DF','Painéis de LED e mídia no Metrô-DF','05']].forEach(function(t,i){ var y=1.95+i*1.0;
    card(S,8.6,y,4.13,0.86,0.14); pill(S,8.78,y+0.2,0.46,0.46,t[2],{fill:i%2?C.NAVY:C.PINK,size:9.5}); S.text(9.42,y+0.1,3.2,0.34,t[0],{size:12.5,f:'M',color:C.NAVY}); S.text(9.42,y+0.43,3.2,0.4,t[1],{size:8.5,f:'L',color:C.MID,ls:1.0}); });
  push(S);

  // 4 BH
  if(full||bhCount>0){
  S=frame(null,A,'Belo Horizonte','Nossos formatos na capital','Formatos disponíveis');
  skyline(S,7.3,0.95,5.43,0.95,{dark:false});
  var fmts=[['led_bh','Painéis de LED','Mídia digital em movimento'],['banca_led','Bancas de LED','Telas de LED na altura do olhar'],['empena','Empenas','Grande formato em edifícios'],['front','Painéis frontlight','Iluminados, visíveis dia e noite'],['mensal','Mega Painéis','Grandes formatos em pontos estratégicos'],['outdoor','Painéis outdoor','Outdoors em vias de grande circulação'],['revista','Bancas Estáticas','Mídia estática em bancas']].filter(function(t){ return full||ptsOf(D,t[0]).length; });
  var cp=fmts.length>6, th=cp?1.55:2.25, ts=cp?1.75:2.45;
  fmts.forEach(function(t,i){ var x=0.6+(i%3)*4.06, y=1.95+Math.floor(i/3)*ts, first=i===0;
    if(first) gcard(S,x,y,3.85,th,C.NAVY,0.2); else card(S,x,y,3.85,th,0.2);
    S.rect(x+0.3,y+(cp?0.25:0.35),0.4,0.05,{fill:C.PINK}); S.text(x+0.28,y+(cp?0.35:0.6),3.3,cp?0.6:1.0,t[1],{size:cp?20:24,f:'M',color:first?C.WHITE:C.NAVY,valign:'m',ls:0.95}); S.text(x+0.28,y+(cp?1.0:1.55),3.3,0.45,t[2],{size:cp?11:12,f:'L',color:first?'DDDDEE':C.MID,ls:1.0}); });
  push(S);

  }
  // separadores + fichas
  var order=[1,2]; 
  function sepAndFichas(i,secs,g){ CG=g; if(full||secs.some(has)) push(separator(D,A,SEPS[i-1])); secs.forEach(function(s){ ptsOf(D,s).forEach(function(p){ push(ficha(D,A,p)); }); }); }
  sepAndFichas(2,['led_mega','led_r2'],2);
  // especificações LED
  var ledRows=groupSpec(ptsOf(D,'led_mega').concat(ptsOf(D,'led_r2')),false,0,'Painéis de LED');
  specPages(push,A,NP(2)+' · Painéis de LED','Belo Horizonte e região metropolitana',['Local','Tamanho','Formato (px)'],ledRows,[4.4,1.5,1.4],function(S,x,y,w,h){ledPanel(S,x,y,w,h,{dark:false,ratio:2.4,dims:['Largura','Altura']});},'Tamanho em metros · formato em pixels (resolução do arquivo).',D.specChips.led);
  sepAndFichas(4,['banca_mega','banca_r2'],3);
  var bRows=groupSpec(ptsOf(D,'banca_mega').concat(ptsOf(D,'banca_r2')),true,50,'Bancas de LED');
  specPages(push,A,NP(4)+' · Bancas de LED','Belo Horizonte e região metropolitana',['Local','Tamanho','Formato (px)','Veic./dia'],bRows,[3.7,1.5,1.4,1.2],function(S,x,y,w,h){bancaDraw(S,x,y,w,h,{dark:false,dims:['Largura','Altura']});},'Banca com tela de LED na frente e na lateral.',D.specChips.banca);

  // MERCADO
  var M=D.mercado; CG=1; if(full||has('mercado')){ push(separator(D,A,SEPS[4]));
  S=new Slide({c:C.BG}); if(A.mapM) S.img(0.6,0.6,5.0,6.3,A.mapM,{r:0.24}); else S.rect(0.6,0.6,5.0,6.3,{fill:'EEF0F8',r:0.24});
  S.rect(0.85,0.85,3.5,1.1,{fill:C.WHITE,r:0.2,a:96}); if(A.mercN){ var mw=0.86*A.mercN.w/A.mercN.h; S.img(1.05,0.97,mw,0.86,A.mercN,{contain:true}); }
  S.text(1.05+(A.mercN?0.86*A.mercN.w/A.mercN.h:0)+0.15,0.85,2.2,1.1,['MERCADO','CENTRAL'],{size:12.5,f:'M',color:C.NAVY,valign:'m',ls:0.95,spc:100});
  S.text(6.0,0.5,4.5,0.3,NP(5)+' · MERCADO CENTRAL',{size:10,f:'B',color:C.PINK,spc:220});
  var lw2=0.5*A.logoC.w/A.logoC.h; S.img(SW-0.6-lw2,0.4,lw2,0.5,A.logoC,{contain:true});
  S.text(6.0,0.95,6.75,1.1,'Mercado Central\nde Belo Horizonte',{size:26,f:'M',color:C.NAVY,ls:0.95}); S.text(6.0,2.05,6.7,0.8,M.texto,{size:11.5,f:'L',color:C.INK,ls:1.2});
  M.tiles.forEach(function(t,i){ tile(S,6.0+(i%3)*2.28,2.95+Math.floor(i/3)*1.38,2.18,1.25,t[0],t[1],i===0?'navy':'white',22,9); });
  pill(S,6.0,5.8,3.35,0.34,M.pill1,{fill:C.WHITE,color:C.NAVY,size:8.5,line:C.LINE,f:'M',spc:0}); pill(S,9.5,5.8,3.23,0.34,M.pill2,{fill:C.WHITE,color:C.NAVY,size:8.5,line:C.LINE,f:'M',spc:0});
  gcard(S,6.0,6.28,6.73,0.78,C.PINK,0.18); S.text(6.2,6.3,2.4,0.74,M.destaque[0],{size:12.5,f:'M',color:C.WHITE,valign:'m'}); S.text(8.55,6.3,4.1,0.74,M.destaque[1],{size:9.5,f:'L',color:C.WHITE,valign:'m',ls:1.0}); push(S);
  ptsOf(D,'mercado').forEach(function(p){ push(ficha(D,A,p)); });
  var md=M.demo;
  S=frame(null,A,NP(5)+' · Mercado Central','Perfil demográfico','Perfil da vizinhança · dados IBGE',  'mercado');
  md.tiles.forEach(function(t,i){ tile(S,0.6+i*3.06,1.95,2.9,1.2,t[0],t[1],i===0?'navy':'white',20,9); });
  card(S,0.6,3.35,7.4,3.5,0.2); cardTitle(S,0.85,3.55,'Faixa etária','Distribuição da população por idade'); S.bars(0.8,4.1,7.0,2.65,md.faixaCats,md.faixa,{hi:md.faixa.indexOf(Math.max.apply(null,md.faixa))});
  card(S,8.2,3.35,4.53,3.5,0.2); cardTitle(S,8.45,3.55,'Gênero','Média da vizinhança'); S.donut(8.55,4.0,2.4,md.genero,['Feminino','Masculino']);
  S.text(8.55,4.75,2.4,0.5,md.genero[0]+'%',{size:22,f:'M',color:C.NAVY,align:'c'}); S.text(8.55,5.2,2.4,0.3,'Feminino',{size:9,f:'L',color:C.MID,align:'c'});
  legendDot(S,11.15,4.85,C.PINK,'Feminino',md.genero[0]+'%'); legendDot(S,11.15,5.25,C.NAVY,'Masculino',md.genero[1]+'%'); push(S);
  S=frame(null,A,NP(5)+' · Mercado Central','Perfil demográfico · página 2','Classe social, renda e pontos de interesse da região','mercado');
  var cw3=3.88; [['Classe social','Média da vizinhança'],['Renda média mensal','Por classe social'],['Top 5 pontos de interesse','Nº de estabelecimentos']].forEach(function(t,i){ var x=0.6+i*(cw3+0.245); card(S,x,1.95,cw3,4.85,0.2); cardTitle(S,x+0.25,2.15,t[0],t[1]); });
  var cl=['Classe A','Classe B','Classe C','Classe D','Classe E'];
  var bx0=function(i){ return 0.6+i*(cw3+0.245)+0.25; }, bw0=cw3-0.5; S.bars(bx0(0),2.85,bw0,3.8,cl,md.classes,{hi:md.classes.indexOf(Math.max.apply(null,md.classes))}); S.bars(bx0(1),2.85,bw0,3.8,cl,md.renda,{color:C.NAVY,fmt:'brl',hi:0}); S.bars(bx0(2),2.85,bw0,3.8,md.intCats,md.intVals,{color:C.PINK,fmt:'num',hi:0}); push(S);
  push(specSlide(A,NP(5)+' · Mercado Central','Especificações técnicas',M.circuito,[['Ponto','Qtd.','Tamanho','Formato (px)']].concat(M.specs),[3.6,0.8,1.6,1.4],function(S,x,y,w,h){ledPanel(S,x,y,w,h,{dark:false,ratio:2.5,dims:M.dims||['Largura','Altura']});},M.caption,M.chips,{rowH:0.8,partner:'mercado'}));
  }

  // GUANABARA
  var G=D.guanabara; CG=4; if(full||has('guanabara')){ push(separator(D,A,SEPS[5]));
  S=new Slide({c:C.BG});
  if(G.fotoParque&&G.fotoParque.length&&A.photos[G.fotoParque[0]]) photoSlot(S,A,G.fotoParque[0],7.95,0.6,4.78,6.3,0.24);
  else { S.rect(7.95,0.6,4.78,6.3,{fill:C.NAVY,r:0.24}); slantMotif(S,9.2,-0.6,5.6,9); wheelDraw(S,8.75,0.95,3.2,{dark:true});
    S.text(8.3,4.35,3.9,0.3,'LAGOA DA PAMPULHA  ·  BELO HORIZONTE',{size:8.5,f:'B',color:C.PINK,spc:140,align:'c'});
    S.text(8.3,4.7,3.9,0.5,'Diversão, tradição e memória afetiva',{size:13,f:'M',color:C.WHITE,align:'c'});
    if(A.mapG) S.img(8.2,5.3,4.28,1.35,A.mapG,{r:0.16}); }
  S.text(0.6,0.45,6,0.3,NP(6)+' · PARQUE GUANABARA',{size:10,f:'B',color:C.PINK,spc:220}); S.text(0.6,0.78,7,0.7,'Parque Guanabara',{size:28,f:'M',color:C.NAVY});
  S.text(0.6,1.62,7.0,1.6,G.texto,{size:11.5,f:'L',color:C.INK,ls:1.25});
  G.tiles.forEach(function(t,i){ tile(S,0.6+i*2.38,3.35,2.25,1.25,t[0],t[1],i===0?'navy':'white',22,9); });
  S.text(0.6,4.85,5,0.3,'QUEM VISITA',{size:9,f:'B',color:C.PINK,spc:200});
  var px=0.6, py=5.2; G.quem.forEach(function(t){ var w=t.length*0.095+0.45; if(px+w>7.6){px=0.6;py+=0.45;} pill(S,px,py,w,0.34,t,{fill:C.WHITE,color:C.NAVY,size:8.5,line:C.LINE,f:'M',spc:0}); px+=w+0.12; });
  gcard(S,0.6,6.15,7.05,0.8,C.NAVY,0.18); S.text(0.8,6.15,1.9,0.8,'Por que anunciar?',{size:11,f:'M',color:C.WHITE,valign:'m'}); S.text(2.75,6.15,4.8,0.8,G.porque,{size:9,f:'L',color:C.WHITE,valign:'m',ls:1.0}); push(S);
  var gd=G.demo;
  S=frame(null,A,NP(6)+' · Parque Guanabara','Perfil demográfico',G.endereco,'guanabara');
  if(A.mapG2) S.img(0.6,1.95,4.2,4.85,A.mapG2,{r:0.2}); else S.rect(0.6,1.95,4.2,4.85,{fill:'EEF0F8',r:0.2});
  card(S,5.0,1.95,3.8,2.6,0.2); cardTitle(S,5.2,2.12,'Faixa etária'); S.bars(5.1,2.55,3.6,1.95,gd.faixaCats,gd.faixa,{hi:gd.faixa.indexOf(Math.max.apply(null,gd.faixa))});
  card(S,8.95,1.95,3.78,2.6,0.2); cardTitle(S,9.15,2.12,'Classe social'); S.bars(9.05,2.55,3.6,1.95,['A','B','C','D','E'],gd.classes,{color:C.NAVY,hi:gd.classes.indexOf(Math.max.apply(null,gd.classes))});
  card(S,5.0,4.75,3.8,2.05,0.2); cardTitle(S,5.2,4.9,'Gênero'); S.donut(5.15,5.2,1.5,gd.genero,['Mulheres','Homens']);
  S.text(5.15,5.7,1.5,0.4,gd.genero[1]+'%',{size:14,f:'M',color:C.NAVY,align:'c'}); legendDot(S,6.8,5.5,C.PINK,'Mulheres',gd.genero[0]+'%'); legendDot(S,6.8,5.9,C.NAVY,'Homens',gd.genero[1]+'%');
  gcard(S,8.95,4.75,3.78,2.05,C.NAVY,0.2); S.text(9.2,4.9,3.3,0.3,'AUDIÊNCIA',{size:8.5,f:'B',color:C.PINK,spc:200});
  gd.audiencia.forEach(function(kv,i){ var yy=5.28+i*0.5; S.text(9.2,yy,1.6,0.4,kv[0],{size:10.5,f:'L',color:'DDDDEE',valign:'m'}); S.text(10.6,yy,1.95,0.4,kv[1],{size:16,f:'M',color:C.WHITE,align:'r',valign:'m'}); if(i<2) S.line(9.2,yy+0.44,12.5,yy+0.44,{c:C.WHITE,lw:0.75,a:25}); }); push(S);
  ptsOf(D,'guanabara').forEach(function(p){ push(ficha(D,A,p)); });
  push(specSlide(A,NP(6)+' · Parque Guanabara','Especificações técnicas',G.circuito,[['Ponto','Tamanho','Formato (px)']].concat(G.specs),[3.4,1.8,1.6],function(S,x,y,w,h){ totemDraw(S,x,y,w*0.34,h,{dark:false,dims:['1,00 m','2,00 m']}); ledPanel(S,x+w*0.36,y,w*0.64,h,{dark:false,ratio:2.0,dims:['4,00 m','2,00 m']}); },G.caption,G.chips,{rowH:0.9,partner:'guanabara'}));
  }

  sepAndFichas(7,['empena'],5); sepAndFichas(8,['front'],6); sepAndFichas(9,['mensal'],7); sepAndFichas(13,['outdoor'],7.5); sepAndFichas(10,['revista'],8);


  // BRASÍLIA
  var B=D.brasilia; CG=9; if(full||has('metro')||has('df_painel')) push(separator(D,A,SEPS[10]));
  if(full||has('metro')){
  S=frame(null,A,NP(11)+' · Brasília','Metrô-DF','Brasília · Distrito Federal · público A, B e C');
  B.tiles.forEach(function(t,i){ tile(S,0.6+(i%3)*2.7,1.95+Math.floor(i/3)*1.45,2.55,1.3,t[0],t[1],i===0?'navy':'white',22,9); });
  card(S,0.6,4.9,8.05,1.9,0.2); S.text(0.85,5.05,5.3,0.3,'Quem usa o metrô',{size:12,f:'M',color:C.NAVY}); S.text(0.85,5.4,5.4,1.35,B.texto,{size:10,f:'L',color:C.INK,ls:1.15}); congresso(S,6.45,5.1,2.0,1.45,{dark:false});
  card(S,8.9,1.95,3.83,4.85,0.2); cardTitle(S,9.15,2.15,'Gênero','Perfil dos usuários'); S.donut(9.65,2.85,2.4,B.genero,['Feminino','Masculino']);
  S.text(9.65,3.6,2.4,0.5,B.genero[0]+'%',{size:22,f:'M',color:C.NAVY,align:'c'}); S.text(9.65,4.05,2.4,0.3,'Feminino',{size:9,f:'L',color:C.MID,align:'c'});
  legendDot(S,9.3,5.45,C.PINK,'Feminino',B.genero[0]+'%'); legendDot(S,9.3,5.82,C.NAVY,'Masculino',B.genero[1]+'%'); S.text(9.15,6.2,3.4,0.5,B.generoNota+'\n'+B.fonte,{size:7.5,f:'L',color:C.MID,ls:1.0}); push(S);
  S=frame(null,A,NP(11)+' · Brasília','Formatos de mídia no Metrô-DF','Alcance de '+B.tiles[1][0]+' usuários por dia');
  B.formatos.forEach(function(f,i){ var x=0.6+(i%3)*4.06, y=1.95+Math.floor(i/3)*2.45; card(S,x,y,3.85,2.25,0.2); S.rect(x+0.15,y+0.15,3.55,1.15,{fill:C.NAVY,r:0.14}); metroDraw(S,x+0.3,y+0.18,3.25,1.1,{dark:true,kind:['ext','cab','int','int','est'][i]||'ext'});
    S.text(x+0.25,y+1.4,3.4,0.35,f[0],{size:13,f:'M',color:C.NAVY}); S.text(x+0.25,y+1.75,3.4,0.45,f[1],{size:9,f:'L',color:C.MID,ls:1.0}); });
  if(B.formatos.length<6){ var xx=0.6+(B.formatos.length%3)*4.06, yy=1.95+Math.floor(B.formatos.length/3)*2.45; gcard(S,xx,yy,3.85,2.25,C.PINK,0.2); S.text(xx+0.3,yy+0.3,3.3,0.3,'ALCANCE DIÁRIO',{size:8.5,f:'B',color:C.WHITE,spc:140}); S.text(xx+0.3,yy+0.65,3.3,0.8,B.tiles[1][0],{size:34,f:'M',color:C.WHITE,valign:'m'}); S.text(xx+0.3,yy+1.5,3.3,0.6,'usuários · público A, B e C',{size:10,f:'L',color:C.WHITE}); }
  push(S);
  ptsOf(D,'metro').forEach(function(p){ push(ficha(D,A,p)); });
  }
  var dfp=ptsOf(D,'df_painel');
  if(full||dfp.length){
  push(separator(D,A,SEPS[11]));
  S=frame(null,A,NP(12)+' · Painéis de LED · Brasília','Onde estão os painéis',dfp.length+' painéis de LED no Distrito Federal');
  card(S,0.6,1.95,7.9,4.85,0.2); if(A.mapDF) S.img(0.8,2.15,7.5,4.45,A.mapDF,{r:0.18}); else S.rect(0.8,2.15,7.5,4.45,{fill:'EEF0F8',r:0.18});
  [[String(dfp.length),'painéis de LED em Brasília','navy'],[B.dims[0]+' x '+B.dims[1],'medida de cada painel','white'],[B.veic,'inserções por dia','pink']].forEach(function(t,i){ tile(S,8.7,1.95+i*1.65,4.03,1.5,t[0],t[1],t[2],26,10); });
  push(S);
  if(dfp.length||full) specPages(push,A,NP(12)+' · Painéis de LED · Brasília','Distrito Federal',['Local','Tamanho','Formato (px)'],groupSpec(dfp,false,0,'Painéis de LED · Brasília'),[4.4,1.5,1.4],function(S,x,y,w,h){ ledPanel(S,x+w*0.2,y,w*0.6,h,{dark:false,ratio:0.67,dims:B.dims}); },B.caption,B.painelChips);
  dfp.forEach(function(p){ push(ficha(D,A,p)); });
  }

  // PREÇOS
  CG=99;
  var rows=D.precos.filter(function(r){ return full||!r.auto||r.auto.split(',').some(function(k){return has(k);}); }).map(function(r){ return calcPreco(D,r); });
  /* linhas com o mesmo nome (ex.: Painéis MEGA + MEGA/R2) viram uma só na proposta: o dono é informação interna */
  if(!full){ var mg=[]; rows.forEach(function(r){ var o=mg.filter(function(x){return x.nome===r.nome})[0]; if(!o) mg.push(Object.assign({},r)); else { o.pontos+=r.pontos; o.insN+=r.insN; o.tabela+=r.tabela; o.neg+=r.neg; o.final+=r.final; o.desc=o.tabela?Math.round((1-o.neg/o.tabela)*10000)/100:0; o.insercoes=o.insN?String(o.insN).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'—'; } }); rows=mg; }
  window.LAST_ROWS=rows;
  if(!full&&!noPrice){
  S=frame(null,A,'Investimento','Tabela de preços','Valor de tabela, desconto e valor negociado ('+(D.modoGeral==='liquido'?'líquido de comissão':'bruto')+')');
  card(S,0.6,1.95,12.13,4.85,0.2);
  var tb=[['Formato','Pontos','Período','Mín. inserções/dia','Valor tabela','Desc.','Valor negociado'+(D.modoGeral==='liquido'?' (líq.)':' (bruto)')]], totT=0, totN=0;
  rows.forEach(function(c){ totT+=c.tabela; totN+=c.final; tb.push([c.nome,String(c.pontos),c.periodo,c.insercoes||'—',brl(c.tabela),(c.desc||0)+'%',brl(c.final)]); });
  tb.push(['Total','','','',brl(totT),'',brl(totN)]);
  var hh=Math.min(0.41,(4.85-0.3-0.4)/(tb.length-1));
  table(S,0.85,2.1,11.63,tb,[3.9,0.9,1.2,1.3,1.6,0.8,2.3],{rowH:hh,headH:0.4,size:10,total:true,aligns:['l','c','l','c','r','c','r']}); push(S);

  // INVESTIMENTO
  S=new Slide({g:[C.NAVY_D,C.NAVY]}); slantMotif(S,8.4,-0.4,8.6,10);
  logoAt(S,A.logoW,0.75,0.55,0.75); S.text(0.75,1.95,7,0.3,'INVESTIMENTO TOTAL',{size:10,f:'B',color:C.PINK,spc:240}); S.text(0.75,2.3,7.5,0.9,D.kit.investTitulo||'Plataforma de mídia OOH',{size:28,f:'L',color:C.WHITE});
  S.text(0.75,3.2,8,1.5,brl(totN),{size:60,f:'M',color:C.WHITE}); S.rect(0.85,4.8,1.3,0.07,{fill:C.PINK});
  var modoTxt=D.modoGeral==='liquido'?'Valor líquido negociado (descontados comissão de '+D.comissao+'%'+(num(D.bv)?' e BV de '+D.bv+'%':'')+')':'Valor bruto negociado'; 
  S.text(0.75,5.0,7.5,0.35,modoTxt,{size:12,f:'L',color:'CCCCE0'});
  S.rect(9.0,1.7,3.73,5.1,{fill:C.WHITE,r:0.2,a:8}); S.text(9.25,1.9,3.3,0.3,'COMPOSIÇÃO DO INVESTIMENTO',{size:8.5,f:'B',color:C.PINK,spc:160});
  var n=rows.length, rh=Math.min(0.52,4.2/n);
  rows.forEach(function(c,i){ var yy=2.4+i*rh; S.text(9.25,yy,2.25,rh-0.05,c.nome,{size:9,f:'L',color:C.WHITE,valign:'m',ls:0.95}); S.text(11.4,yy,1.15,rh-0.05,brl(c.final),{size:9,f:'M',color:C.WHITE,align:'r',valign:'m'}); if(i<n-1) S.line(9.25,yy+rh-0.02,12.55,yy+rh-0.02,{c:C.WHITE,lw:0.75,a:22}); });
  S.rect(0.8,5.85,7.9,1.0,{fill:C.WHITE,r:0.18,a:9}); S.text(1.05,5.88,7.4,0.95,[D.kit.pagamento||'',D.kit.validade||''],{size:10,f:'L',color:C.WHITE,valign:'m',after:3}); push(S);
  }

  // CONTRACAPA
  S=new Slide({g:[C.NAVY_D,C.NAVY]}); edge(S,A,7.2,1.2,K.fotoContra); logoAt(S,A.logoW,0.75,0.6,1.1);
  S.text(0.75,2.6,6,1.2,'Obrigado!',{size:54,f:'B',color:C.WHITE}); S.rect(0.85,3.95,1.3,0.07,{fill:C.PINK});
  S.rect(0.8,4.35,5.6,2.35,{fill:C.WHITE,r:0.2,a:9}); S.text(1.05,4.5,5.2,0.5,R.nome||'',{size:20,f:'M',color:C.WHITE}); S.text(1.05,5.0,5.2,0.3,String(R.cargo||'').toUpperCase(),{size:9,f:'B',color:C.PINK,spc:160});
  S.text(1.05,5.45,5.2,1.2,[R.email||'',[R.tel1,R.tel2].filter(Boolean).join('  ·  '),R.site||''],{size:11,f:'L',color:C.WHITE,after:4}); push(S);

  // ordem fixa dos grupos (estável) e numeração
  out=out.map(function(s,i){return [s,i]}).sort(function(a,b){ return ((a[0].__g||0)-(b[0].__g||0))||(a[1]-b[1]); }).map(function(x){return x[0]});
  out.forEach(function(s,i){ if(s.pn) s.pn.str=(i+1<10?'0':'')+(i+1); });
  return out;
}
