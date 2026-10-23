'use strict';
const $=s=>document.querySelector(s);
let previousQuestions = {};
try { previousQuestions = JSON.parse(localStorage.getItem('prisma-slope-previous') || '{}') || {}; } catch {}
if(typeof previousQuestions!=='object'||Array.isArray(previousQuestions))previousQuestions={};
const dealer = SlopeQuestions.createDealer(Math.random, previousQuestions);
let questions = [];
const s={a:[-3,-2],b:[3,2],mode:'home',index:0,stairs:true,coins:0,streak:0,best:0,stars:0,tries:0,solved:false,muted:false,pace:false,seconds:0,questionSeconds:0,active:false,started:false,questionHadError:false,firstFiveWrong:0};
let drag=null,geom,lastInput=$('#slope'),lastCheck=0,audioTimer;
const svg=$('#plot');
const sounds=Object.fromEntries(['success','error','finish'].map(k=>[k,new Audio(`assets/sounds/${k}.mp3`)]));
try{s.muted=localStorage.getItem('prisma-slope-muted')==='true';}catch{}
function stopAudio(){clearTimeout(audioTimer);Object.values(sounds).forEach(a=>{a.pause();a.currentTime=0;});}
function play(kind){stopAudio();if(s.muted)return;const a=sounds[kind];a.volume=.35;a.play().catch(()=>{});audioTimer=setTimeout(()=>a.pause(),kind==='finish'?4500:1200);}
function updateMute(){const b=$('#mute');b.setAttribute('aria-pressed',String(s.muted));b.setAttribute('aria-label',s.muted?'הפעלת צלילים':'השתקת צלילים');b.querySelector('img').src=`assets/icons/${s.muted?'mute':'speaker'}_circle.svg`;}
function gcd(a,b){return b?gcd(b,a%b):a;}
// Native MathML keeps fractions and subscripts in textbook notation.
const mn=n=>`<mn>${String(n).replace(/-/g,'−')}</mn>`;
const sub=(v,i)=>`<msub><mi>${v}</mi><mn>${i}</mn></msub>`;
// Grade 8: differences are written as y₂ − y₁ and x₂ − x₁ (A is point 1, B is point 2), never as Δ.
const diff=v=>`<mrow>${sub(v,2)}<mo>−</mo>${sub(v,1)}</mrow>`;
const op=c=>`<mo stretchy="false">${c}</mo>`;
const pair=(u,v)=>`${op('(')}${u}<mo separator="true">,</mo>${v}${op(')')}`;
const fraction=(top,bottom)=>`<mfrac>${top}${bottom}</mfrac>`;
const math=body=>`<math dir="ltr">${body}</math>`;
const slopeFormula=()=>fraction(diff('y'),diff('x'));
function slopeMarkup(a=s.a,b=s.b){const dx=b[0]-a[0],dy=b[1]-a[1];if(!dx)return '<span>לא מוגדר</span>';if(!dy)return math(mn(0));const g=gcd(Math.abs(dx),Math.abs(dy)),top=dy/g*Math.sign(dx),bottom=Math.abs(dx/g);return math(bottom===1?mn(top):(top<0?'<mo>−</mo>':'')+fraction(mn(Math.abs(top)),mn(bottom)));}
function parseNumber(value){const t=value.trim().replace(/−/g,'-');return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(t)?Number(t):NaN;}
let answerMode='number';
function setAnswerMode(mode,focus=true){answerMode=mode;$('#slope').hidden=mode!=='number';$('#fraction-entry').hidden=mode!=='fraction';$('#undefined-value').hidden=mode!=='undefined';for(const [id,value] of [['number-mode','number'],['fraction-mode','fraction'],['undefined','undefined']])$('#'+id).setAttribute('aria-pressed',String(value===mode));lastInput=mode==='fraction'?$('#numerator'):$('#slope');if(focus&&mode!=='undefined')lastInput.focus();}
function makeFraction(){if(answerMode==='number'&&$('#slope').value.trim())$('#numerator').value=$('#slope').value;setAnswerMode('fraction');lastInput=$('#denominator');lastInput.focus();}
function feedback(message,kind=''){const el=$('#feedback');el.innerHTML=message;el.dataset.kind=kind;}
function showScreen(mode){stopAudio();s.mode=mode;if(mode==='quiz'){s.a=[...questions[s.index].a];s.b=[...questions[s.index].b];}$('#welcome').hidden=mode!=='home';$('#activity').hidden=!['quiz','explore'].includes(mode);$('#finish').hidden=mode!=='finish';if(['quiz','explore'].includes(mode))render();}
function stats(){ $('#coins').textContent=s.coins;$('#hearts').textContent=Math.max(0,3-s.tries%3);$('#streak').textContent=s.streak;const time=`${Math.floor(s.seconds/60)}:${String(s.seconds%60).padStart(2,'0')}`;$('#elapsed').textContent=time;$('#graph-elapsed').textContent=time;$('#graph-time-badge').hidden=s.mode!=='quiz';$('#pace').hidden=!s.pace||s.mode!=='quiz';const p=Math.min(60,s.questionSeconds);$('#pace-progress').style.width=`${p/60*192}px`;$('#pace-progress').setAttribute('aria-valuenow',p);}
function loadQuestion(){const q=questions[s.index];s.a=[...q.a];s.b=[...q.b];s.tries=0;s.solved=false;s.questionHadError=false;s.questionSeconds=0;lastCheck=0;$('#answer-form').reset();setAnswerMode('number',false);feedback('');showScreen('quiz');}
function start(){questions=dealer.drawRun();try{localStorage.setItem('prisma-slope-previous',JSON.stringify(dealer.previous()));}catch{}Object.assign(s,{index:0,coins:0,streak:0,best:0,stars:0,seconds:0,active:true,started:true,firstFiveWrong:0,questionHadError:false});loadQuestion();}
function lab(){s.a=[-3,-2];s.b=[3,2];feedback('');resetTask();showScreen('explore');}
// Lab "build tasks": random order, no checking — ideas for a student who asks "what do I do here?".
const T='שנו את A ואת B כך שהשיפוע יהיה ';
const buildTasks=[T+math(mn(2))+'.',T+math(mn(-2))+'.',T+math(fraction(mn(1),mn(2)))+'.','שימו את A בראשית הצירים, ושנו את B כך שהשיפוע יהיה '+math(mn(3))+'.',T+math(mn(0))+'. מה זה אומר על השיעורים?',T+math(mn(1))+'.',T+math(mn(-1))+'. מה זה אומר על השיעורים?','מצאו שתי נקודות שהשיפוע ביניהן לא מוגדר.'];
let lastTask=-1;
function resetTask(){lastTask=-1;$('#task-text').hidden=true;$('#task-text').innerHTML='';$('#task-button span').textContent='משימת בנייה';}
$('#task-button').onclick=()=>{let i;do{i=Math.floor(Math.random()*buildTasks.length);}while(i===lastTask);lastTask=i;$('#task-text').innerHTML=buildTasks[i];$('#task-text').hidden=false;$('#task-button span').textContent='משימה אחרת';};
function render(){const quiz=s.mode==='quiz';$('#stage-title').textContent=quiz?`משימה ${s.index+1} מתוך ${questions.length}`:'מעבדה חופשית';$('#instruction').textContent=quiz?'מהו השיפוע? אפשר להיעזר במדרגות קטנות או בשינוי הכולל — בחרו בדרך שנוחה לכם.':'שנו את השיעורים של A ושל B בסליידרים, או גררו את הנקודות בשרטוט. אפשר גם לגרור את הישר כולו — הוא זז בלי שהשיפוע משתנה.';$('#stats').hidden=!quiz;$('#coordinates').hidden=!quiz;$('#lab-tasks').hidden=quiz;$('#answer-form').hidden=!quiz;$('#point-controls').hidden=quiz;$('#values').hidden=quiz;$('#hint').hidden=!quiz;$('#next').hidden=!quiz||!s.solved;$('#next').lastChild.textContent=s.index===questions.length-1?'סיום המשחק':'המשימה הבאה';$('#check').disabled=s.solved;$('#stairs').checked=s.stairs;for(const input of $('#answer-form').querySelectorAll('input,button:not(#check)'))input.disabled=s.solved;
if(!quiz){$('#point-controls').innerHTML=['a','b'].map((k,i)=>`<div class="point-group"><div class="point-title" id="title-${k}"></div>${[0,1].map(j=>`<label><span class="slider-name">${math(sub(j?'y':'x',i+1))}</span><input type="range" min="-5" max="5" step="1" value="${s[k][j]}" data-k="${k}" data-j="${j}" aria-label="${j?'y':'x'}${i+1}, שיעור ה־${j?'y':'x'} של ${k.toUpperCase()}"><output id="out-${k}-${j}" dir="ltr"></output></label>`).join('')}</div>`).join('');}
updateValues();stats();draw();}
function updateValues(){const [ax,ay]=s.a,[bx,by]=s.b,dx=bx-ax,dy=by-ay;$('#coordinates').innerHTML=`<span class="math">A = (${ax}, ${ay})</span><span class="math">B = (${bx}, ${by})</span>`.replace(/-/g,'−');
if(s.mode!=='explore')return;
// Point headings and slider readouts (the sliders follow drags on the graph too).
['a','b'].forEach((k,i)=>{const p=s[k];const t=$('#title-'+k);if(t)t.innerHTML=math(`<mi mathvariant="normal">${k.toUpperCase()}</mi><mo>=</mo>${pair(sub('x',i+1),sub('y',i+1))}<mo>=</mo>${pair(mn(p[0]),mn(p[1]))}`);[0,1].forEach(j=>{const o=$(`#out-${k}-${j}`);if(o)o.textContent=String(p[j]).replace('-','−');const r=$(`#point-controls [data-k="${k}"][data-j="${j}"]`);if(r&&+r.value!==p[j])r.value=p[j];});});
const paren=n=>n<0?op('(')+mn(n)+op(')'):mn(n);
const subtract=(v,end,start)=>math(diff(v)+'<mo>=</mo>'+mn(end)+'<mo>−</mo>'+paren(start)+'<mo>=</mo>'+mn(end-start));
let slope;
// The whole slope line is ONE <math> element, so it can never break into two lines.
if(dx===0)slope=math('<mi>m</mi><mo>=</mo>'+slopeFormula())+'<div dir="rtl" class="undefined-note">לא מוגדר, כי '+math(diff('x')+'<mo>=</mo><mn>0</mn>')+'</div>';
else{const g=gcd(Math.abs(dx),Math.abs(dy));const sameAsReduced=dy!==0&&dx>1&&g===1;// reduced form only when it differs (no "7/8 = 7/8")
let reduced='';if(!sameAsReduced){if(!dy)reduced=mn(0);else{const top=dy/g*Math.sign(dx),bottom=Math.abs(dx/g);reduced=bottom===1?mn(top):(top<0?'<mo>−</mo>':'')+fraction(mn(Math.abs(top)),mn(bottom));}}
slope=math('<mi>m</mi><mo>=</mo>'+slopeFormula()+'<mo>=</mo>'+fraction(mn(dy),mn(dx))+(reduced?'<mo>=</mo>'+reduced:''));}
$('#values').innerHTML=`<div class="calc-lines" dir="ltr"><div class="delta-x-value">${subtract('x',bx,ax)}</div><div class="delta-y-value">${subtract('y',by,ay)}</div></div><div class="slope-result"><div class="slope-box" dir="ltr">${slope}</div></div>`;fitSlope();}
// Safety net for fonts that render wider than expected: shrink the slope line, never wrap it.
function fitSlope(){const box=$('.slope-box'),m=box&&box.querySelector(':scope>math');if(!m)return;m.style.fontSize='';const avail=box.clientWidth-28,w=m.getBoundingClientRect().width;if(w>avail&&w>0)m.style.fontSize=(parseFloat(getComputedStyle(m).fontSize)*avail/w)+'px';}
function draw(){
const w=Math.max(240,svg.getBoundingClientRect().width),pad=38,unit=Math.min((w-2*pad)/14,30),h=14*unit+2*pad,ox=w/2,oy=h/2;geom={w,h,unit,ox,oy};svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.style.height=h+'px';let out='';
const x=v=>ox+v*unit,y=v=>oy-v*unit;
const line=(x1,y1,x2,y2,color,width=1,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
for(let i=-6;i<=6;i++){out+=line(x(i),y(-6),x(i),y(6),'var(--border)');out+=line(x(-6),y(i),x(6),y(i),'var(--border)');}
const tip=6.55,ah=11,aw=6;// axes end in arrowheads at the positive ends
out+=line(x(-6),y(0),x(tip),y(0),'var(--muted-foreground)',1.5)+line(x(0),y(-6),x(0),y(tip),'var(--muted-foreground)',1.5);
out+=`<path class="axis-arrow" d="M ${x(tip)+2} ${y(0)} L ${x(tip)+2-ah} ${y(0)-aw} L ${x(tip)+2-ah} ${y(0)+aw} Z" fill="var(--muted-foreground)"/><path class="axis-arrow" d="M ${x(0)} ${y(tip)-2} L ${x(0)-aw} ${y(tip)-2+ah} L ${x(0)+aw} ${y(tip)-2+ah} Z" fill="var(--muted-foreground)"/>`;
out+=`<text class="axis-name" x="${x(tip)+2}" y="${y(0)-12}" text-anchor="end">X</text><text class="axis-name" x="${x(0)+12}" y="${y(tip)+6}" text-anchor="start">Y</text>`;
let [ax,ay]=s.a,[bx,by]=s.b,dx=bx-ax,dy=by-ay;let n=s.stairs?(gcd(Math.abs(dx),Math.abs(dy))||1):1;
const extend=20;const len=Math.hypot(dx,dy)||1;const ux=dx/len,uy=dy/len;const lx1=ax-ux*extend,ly1=ay-uy*extend,lx2=bx+ux*extend,ly2=by+uy*extend;out+=line(x(lx1),y(ly1),x(lx2),y(ly2),'var(--viz-series-1)',3);if(s.mode==='explore')out+=line(x(lx1),y(ly1),x(lx2),y(ly2),'transparent',20,'data-line="true" style="cursor:grab"');
for(let i=0;i<n;i++){let px=ax+i*dx/n,py=ay+i*dy/n,qx=px+dx/n,qy=py+dy/n;out+=line(x(px),y(py),x(qx),y(py),'var(--viz-series-2)',3)+line(x(qx),y(py),x(qx),y(qy),'var(--viz-series-3)',3);if(dx)out+=`<path d="M ${x(qx)-Math.sign(dx)*6} ${y(py)-4} L ${x(qx)} ${y(py)} L ${x(qx)-Math.sign(dx)*6} ${y(py)+4}" fill="none" stroke="var(--viz-series-2)"/>`;if(dy)out+=`<path d="M ${x(qx)-4} ${y(qy)+Math.sign(dy)*6} L ${x(qx)} ${y(qy)} L ${x(qx)+4} ${y(qy)+Math.sign(dy)*6}" fill="none" stroke="var(--viz-series-3)"/>`;}
for(const [k,p]of [['a',s.a],['b',s.b]]){out+=`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="7" fill="var(--foreground)"/><text x="${x(p[0])+12}" y="${y(p[1])-12}">${k.toUpperCase()}</text><circle data-point="${k}" cx="${x(p[0])}" cy="${y(p[1])}" r="21" fill="transparent" style="cursor:grab"/>`;}
// Tick labels sit beside the axes, above the plotted lines for legibility.
for(let i=-6;i<=6;i++){if(!i||w<=450&&i%2!==0)continue;out+=line(x(i),y(0)-3,x(i),y(0)+3,'var(--muted-foreground)')+line(x(0)-3,y(i),x(0)+3,y(i),'var(--muted-foreground)');out+=`<text class="axis-number" data-axis="x" x="${x(i)}" y="${y(0)+18}" text-anchor="middle">${String(i).replace('-','−')}</text><text class="axis-number" data-axis="y" x="${x(0)-9}" y="${y(i)+4}" text-anchor="end">${String(i).replace('-','−')}</text>`;}
out+=`<text class="axis-number" x="${x(0)+7}" y="${y(0)+18}" text-anchor="start">0</text>`;
svg.innerHTML='<title>מדרגות השיפוע</title><desc>מנקודה A אל נקודה B. הקו האופקי הוא השינוי ב־X והקו האנכי הוא השינוי ב־Y.</desc>'+out;
}
function setPoint(k,p){const other=s[k==='a'?'b':'a'];if(p[0]===other[0]&&p[1]===other[1]){feedback('כדי לקבוע שיפוע דרושות שתי נקודות שונות.');return false;}s[k]=p;feedback('');updateValues();draw();return true;}
$('#point-controls').addEventListener('input',e=>{const t=e.target,k=t.dataset.k;if(!k)return;const p=[...s[k]];p[+t.dataset.j]=+t.value;if(!setPoint(k,p))t.value=s[k][+t.dataset.j];});
svg.addEventListener('pointerdown',e=>{if(s.mode!=='explore')return;if(e.target.dataset.point){drag={type:'point',k:e.target.dataset.point};}else if(e.target.dataset.line){const r=svg.getBoundingClientRect();drag={type:'line',start:[Math.round((e.clientX-r.left-geom.ox)/geom.unit),Math.round((geom.oy-e.clientY+r.top)/geom.unit)],a:[...s.a],b:[...s.b]};}else return;svg.setPointerCapture(e.pointerId);});
svg.addEventListener('pointermove',e=>{if(!drag)return;const r=svg.getBoundingClientRect();const p=[Math.max(-5,Math.min(5,Math.round((e.clientX-r.left-geom.ox)/geom.unit))),Math.max(-5,Math.min(5,Math.round((geom.oy-e.clientY+r.top)/geom.unit)))];if(drag.type==='point'){if(setPoint(drag.k,p))$('#point-controls').querySelectorAll(`[data-k="${drag.k}"]`).forEach(t=>t.value=s[drag.k][+t.dataset.j]);return;}const raw=[p[0]-drag.start[0],p[1]-drag.start[1]];const minDx=Math.max(-5-drag.a[0],-5-drag.b[0]),maxDx=Math.min(5-drag.a[0],5-drag.b[0]),minDy=Math.max(-5-drag.a[1],-5-drag.b[1]),maxDy=Math.min(5-drag.a[1],5-drag.b[1]);const d=[Math.max(minDx,Math.min(maxDx,raw[0])),Math.max(minDy,Math.min(maxDy,raw[1]))];s.a=[drag.a[0]+d[0],drag.a[1]+d[1]];s.b=[drag.b[0]+d[0],drag.b[1]+d[1]];feedback('');updateValues();draw();for(const k of ['a','b'])$('#point-controls').querySelectorAll(`[data-k="${k}"]`).forEach(t=>t.value=s[k][+t.dataset.j]);});
['pointerup','pointercancel','lostpointercapture'].forEach(event=>svg.addEventListener(event,()=>drag=null));
$('#stairs').onchange=e=>{s.stairs=e.target.checked;draw();};
function hint(){feedback('אפשר לבחור מדרגה קטנה אחת או את השינוי הכולל מ־A ל־B. ימינה ולמעלה — חיובי; שמאלה ולמטה — שלילי. לפי הנוסחה '+math('<mi>m</mi><mo>=</mo>'+slopeFormula())+', כאשר '+math('<mi mathvariant="normal">A</mi><mo>=</mo>'+pair(sub('x',1),sub('y',1)))+' ו־'+math('<mi mathvariant="normal">B</mi><mo>=</mo>'+pair(sub('x',2),sub('y',2)))+'.');}
$('#hint').onclick=hint;
$('#answer-form').onsubmit=e=>{e.preventDefault();if(s.solved||s.mode!=='quiz'||Date.now()-lastCheck<500)return;
const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1];let m;
if(answerMode==='number'){m=parseNumber($('#slope').value);if(!Number.isFinite(m)){feedback('הזינו מספר או בחרו שבר עם מונה ומכנה.');return;}}
if(answerMode==='fraction'){const top=parseNumber($('#numerator').value),bottom=parseNumber($('#denominator').value);if(!Number.isFinite(top)||!Number.isFinite(bottom)){feedback('מלאו את המונה ואת המכנה.');return;}if(bottom===0){feedback('מכנה לא יכול להיות אפס. אם הישר אנכי, בחרו ״לא מוגדר״.');return;}m=top/bottom;}
lastCheck=Date.now();const correct=dx===0?answerMode==='undefined':answerMode!=='undefined'&&Number.isFinite(m)&&Math.abs(m-dy/dx)<1e-8;
if(!correct){s.tries++;s.streak=0;if(!s.questionHadError){s.questionHadError=true;if(s.index<5)s.firstFiveWrong++;}play('error');let message='';const target=dx===0?null:dy/dx;if(dx===0){message=answerMode==='undefined'?'בדקו שוב את הבחירה.':'זהו ישר אנכי: השינוי ב־X הוא 0, ולכן השיפוע לא מוגדר.';}else if(answerMode==='undefined'){message='כאן השינוי ב־X אינו 0, ולכן השיפוע כן מוגדר. נסו לחשב את היחס בין השינוי ב־Y לשינוי ב־X.';}else if(Number.isFinite(m)&&dy!==0&&Math.abs(m-dx/dy)<1e-8){message='שימו לב מהו המונה ומהו המכנה: בשיפוע מחשבים שינוי ב־Y חלקי שינוי ב־X.';}else if(Number.isFinite(m)&&target<0&&m>0&&Math.abs(m-Math.abs(target))<1e-8){message='לתשומת הלב: הישר הזה יורד. בדקו את סימן השיפוע.';}else if(dy===0&&Number.isFinite(m)&&m!==0){message='זהו ישר אופקי. השינוי ב־Y הוא 0, ולכן מה צריך להיות השיפוע?';}else{message='נסו שוב. בדקו את הכיוון ואת היחס בין הצעד האנכי לצעד האופקי: '+math('<mi>m</mi><mo>=</mo>'+slopeFormula())+'.';}if(s.tries%3===0)message+=' רמז נוסף: '+math(diff('x')+'<mo>=</mo>'+mn(dx))+' וגם '+math(diff('y')+'<mo>=</mo>'+mn(dy))+'. קיבלתם עוד שלושה ניסיונות.';if(s.index===4&&s.firstFiveWrong===5)message+='<br><strong>כדאי לעצור לרגע ולחזור לתזכורת לפני שממשיכים — חמש המשימות הראשונות דרשו תיקון, ולכן עדיף לחזק את הרעיון ולא לנחש.</strong>';feedback(message,'error');stats();return;}
s.solved=true;s.coins++;if(s.tries===0){s.stars++;s.streak++;s.best=Math.max(s.best,s.streak);}else s.streak=0;play('success');render();feedback(`נכון! השיפוע הוא ${slopeMarkup()}. קיבלתם מטבע${s.tries===0?' וכוכב על פתרון בניסיון הראשון':''}.`,'success');};
$('#undefined').onclick=()=>setAnswerMode('undefined');
$('#number-mode').onclick=()=>setAnswerMode('number');
$('#fraction-mode').onclick=makeFraction;
$('#next').onclick=()=>{if(!s.solved)return;if(s.index<questions.length-1){s.index++;loadQuestion();}else{s.active=false;showScreen('finish');$('#summary').innerHTML=`<div><span>משימות שנפתרו</span><strong>${s.coins} מתוך ${questions.length}</strong></div><div><span>מטבעות</span><strong>${s.coins}</strong></div><div><span>הרצף הטוב ביותר</span><strong>${s.best}</strong></div><div><span>זמן פעיל</span><strong>${$('#elapsed').textContent}</strong></div>`;$('#stars-summary').innerHTML=`<img src="assets/icons/star_circle.svg" alt="כוכב"> ${s.stars} פתרונות בניסיון הראשון מתוך ${questions.length}`;play('finish');}};
$('#start').onclick=()=>{if(s.started&&s.active){showScreen('quiz');}else start();};$('#restart').onclick=start;$('#explore').onclick=lab;$('#finish-lab').onclick=lab;$('#home').onclick=()=>showScreen('home');$('#activity-home').onclick=()=>showScreen('home');
function openDialog(html){stopAudio();$('#dialog-content').innerHTML=html;$('#dialog').showModal();}
$('#close-dialog').onclick=()=>$('#dialog').close();
const helpHTML='<h2>איך משחקים?</h2><p>בכל משימה מוצג ישר העובר דרך הנקודות A ו־B. המטרה היא לקבוע את השיפוע שלו.</p><ul><li>אפשר להיעזר במדרגות הצבעוניות: החלק האופקי הוא השינוי ב־X והחלק האנכי הוא השינוי ב־Y.</li><li>בחרו אם התשובה היא מספר, שבר או שיפוע לא מוגדר.</li><li>אפשר להשתמש ברמז. אחרי שלוש טעויות תקבלו מידע נוסף.</li><li>במעבדה החופשית אפשר לשנות את השיעורים של A ושל B בסליידרים או בגרירת הנקודות, וגם לגרור את הישר כולו. הכפתור <strong>משימת בנייה</strong> מציע רעיון לחקר.</li><li>השעון מודד זמן פעיל בלבד. מד הדקה, אם הופעל, הוא כלי לקצב ללא קנס.</li></ul><p>לנוסחאות ולכללי הסימנים השתמשו בכפתור <strong>תזכורת</strong>.</p>';
$('#help').onclick=()=>openDialog(helpHTML);
const reminderHTML='<h2>תזכורת לחישוב שיפוע</h2><div class="help-equations">'+math('<mi mathvariant="normal">A</mi><mo>=</mo>'+pair(sub('x',1),sub('y',1)))+math('<mi mathvariant="normal">B</mi><mo>=</mo>'+pair(sub('x',2),sub('y',2)))+math('<mi>m</mi><mo>=</mo>'+slopeFormula())+'</div><p><strong>סימנים:</strong> ימינה ולמעלה הם שינויים חיוביים; שמאלה ולמטה הם שינויים שליליים.</p><p>ישר אופקי: '+math(diff('y')+'<mo>=</mo><mn>0</mn>')+', ולכן השיפוע 0. ישר אנכי: '+math(diff('x')+'<mo>=</mo><mn>0</mn>')+', ולכן השיפוע לא מוגדר.</p>';
$('#reminder').onclick=()=>openDialog(reminderHTML);
function settings(){openDialog('<h2>הגדרות</h2><label class="check"><input id="pace-setting" type="checkbox" '+(s.pace?'checked':'')+'> הצגת מד דקה אישי במשימות</label><p>המד נעצר בדקה; אפשר להמשיך לחשוב ללא הגבלת זמן.</p>');$('#pace-setting').onchange=e=>{s.pace=e.target.checked;stats();};}
$('#settings').onclick=settings;
$('#menu').onclick=()=>{openDialog('<h2>תפריט</h2><div class="menu-items"><button id="resume"><img src="assets/icons/play_circle.svg" alt="">'+(s.started&&s.active?'המשך המשחק':'התחלת משחק')+'</button><button id="menu-settings"><img src="assets/icons/settings_circle.svg" alt="">הגדרות</button><button id="menu-restart"><img src="assets/icons/restart_circle.svg" alt="">התחלה מחדש</button></div>');$('#resume').onclick=()=>{$('#dialog').close();if(s.started&&s.active)showScreen('quiz');else start();};$('#menu-settings').onclick=()=>{$('#dialog').close();settings();};$('#menu-restart').onclick=()=>{$('#dialog').close();start();};};
$('#mute').onclick=()=>{s.muted=!s.muted;stopAudio();updateMute();try{localStorage.setItem('prisma-slope-muted',String(s.muted));}catch{}};
const answerInputs=[...$('#answer-form').querySelectorAll('input')];
for(const input of answerInputs){input.addEventListener('focus',()=>lastInput=input);input.addEventListener('keydown',e=>{if(e.key==='/'){e.preventDefault();makeFraction();}if(answerMode==='fraction'&&e.key==='ArrowDown'){e.preventDefault();$('#denominator').focus();}if(answerMode==='fraction'&&e.key==='ArrowUp'){e.preventDefault();$('#numerator').focus();}});input.addEventListener('paste',e=>{const text=e.clipboardData.getData('text').trim(),match=text.match(/^([−+-]?\d+(?:\.\d+)?)\s*\/\s*([−+-]?\d+(?:\.\d+)?)$/);if(match){e.preventDefault();$('#numerator').value=match[1];$('#denominator').value=match[2];setAnswerMode('fraction');}});}
for(const key of ['1','2','3','4','5','6','7','8','9','0','−','fraction','.','מחיקה']){const b=document.createElement('button');b.type='button';if(key==='fraction')b.innerHTML='<span class="fraction-icon" aria-hidden="true"><span>א</span><span>ב</span></span>';else b.textContent=key;b.setAttribute('aria-label',key==='−'?'מינוס':key==='fraction'?'קו שבר':key);b.onclick=()=>{if(s.solved)return;if(key==='fraction'){makeFraction();return;}if(answerMode==='undefined')setAnswerMode('number');const start=lastInput.selectionStart??lastInput.value.length,end=lastInput.selectionEnd??start,v=lastInput.value;const position=key==='מחיקה'?Math.max(0,start-Number(start===end)):start;const inserted=key==='מחיקה'?'':key;lastInput.value=v.slice(0,position)+inserted+v.slice(end);lastInput.focus();lastInput.setSelectionRange(position+inserted.length,position+inserted.length);};$('.keypad').append(b);}
setInterval(()=>{if(s.mode==='quiz'&&!s.solved&&!document.hidden&&!$('#dialog').open){s.seconds++;s.questionSeconds++;stats();}},1000);
new ResizeObserver(()=>{if(!$('#activity').hidden){draw();fitSlope();}}).observe($('.graph-panel'));
updateMute();
