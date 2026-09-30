'use strict';
const $=s=>document.querySelector(s);
let previousQuestions = {};
try { previousQuestions = JSON.parse(localStorage.getItem('prisma-slope-previous') || '{}') || {}; } catch {}
if(typeof previousQuestions!=='object'||Array.isArray(previousQuestions))previousQuestions={};
const dealer = SlopeQuestions.createDealer(Math.random, previousQuestions);
let questions = [];
const s={a:[-3,-2],b:[3,2],mode:'home',index:0,stairs:true,coins:0,streak:0,best:0,stars:0,tries:0,solved:false,muted:false,pace:false,seconds:0,questionSeconds:0,active:false,started:false};
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
const delta=axis=>`<mrow><mi>Δ</mi><mi>${axis}</mi></mrow>`;
const fraction=(top,bottom)=>`<mfrac>${top}${bottom}</mfrac>`;
const math=body=>`<math dir="ltr">${body}</math>`;
function slopeMarkup(a=s.a,b=s.b){const dx=b[0]-a[0],dy=b[1]-a[1];if(!dx)return '<span>לא מוגדר</span>';if(!dy)return math(mn(0));const g=gcd(Math.abs(dx),Math.abs(dy)),top=dy/g*Math.sign(dx),bottom=Math.abs(dx/g);return math(bottom===1?mn(top):(top<0?'<mo>−</mo>':'')+fraction(mn(Math.abs(top)),mn(bottom)));}
function parseNumber(value){const t=value.trim().replace(/−/g,'-');return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(t)?Number(t):NaN;}
let answerMode='number';
function setAnswerMode(mode,focus=true){answerMode=mode;$('#slope').hidden=mode!=='number';$('#fraction-entry').hidden=mode!=='fraction';$('#undefined-value').hidden=mode!=='undefined';for(const [id,value] of [['number-mode','number'],['fraction-mode','fraction'],['undefined','undefined']])$('#'+id).setAttribute('aria-pressed',String(value===mode));lastInput=mode==='fraction'?$('#numerator'):$('#slope');if(focus&&mode!=='undefined')lastInput.focus();}
function makeFraction(){if(answerMode==='number'&&$('#slope').value.trim())$('#numerator').value=$('#slope').value;setAnswerMode('fraction');lastInput=$('#denominator');lastInput.focus();}
function feedback(message,kind=''){const el=$('#feedback');el.innerHTML=message;el.dataset.kind=kind;}
function showScreen(mode){stopAudio();s.mode=mode;if(mode==='quiz'){s.a=[...questions[s.index].a];s.b=[...questions[s.index].b];}$('#welcome').hidden=mode!=='home';$('#activity').hidden=!['quiz','explore'].includes(mode);$('#finish').hidden=mode!=='finish';if(['quiz','explore'].includes(mode))render();}
function stats(){ $('#coins').textContent=s.coins;$('#hearts').textContent=Math.max(0,3-s.tries%3);$('#streak').textContent=s.streak;$('#elapsed').textContent=`${Math.floor(s.seconds/60)}:${String(s.seconds%60).padStart(2,'0')}`;$('#pace').hidden=!s.pace||s.mode!=='quiz';const p=Math.min(60,s.questionSeconds);$('#pace-progress').style.width=`${p/60*192}px`;$('#pace-progress').setAttribute('aria-valuenow',p);}
function loadQuestion(){const q=questions[s.index];s.a=[...q.a];s.b=[...q.b];s.tries=0;s.solved=false;s.questionSeconds=0;lastCheck=0;$('#answer-form').reset();setAnswerMode('number',false);feedback('');showScreen('quiz');}
function start(){questions=dealer.drawRun();try{localStorage.setItem('prisma-slope-previous',JSON.stringify(dealer.previous()));}catch{}Object.assign(s,{index:0,coins:0,streak:0,best:0,stars:0,seconds:0,active:true,started:true});loadQuestion();}
function lab(){s.a=[-3,-2];s.b=[3,2];feedback('');showScreen('explore');}
function render(){const quiz=s.mode==='quiz';$('#stage-title').textContent=quiz?`משימה ${s.index+1} מתוך ${questions.length} · ${questions[s.index].title}`:'מעבדה חופשית';$('#instruction').textContent=quiz?'מהו השיפוע? אפשר להיעזר במדרגות קטנות או בשינוי הכולל — בחרו בדרך שנוחה לכם.':'גררו את A ואת B או שנו את המחוונים. התבוננו במדרגות ובשיפוע.';$('#stats').hidden=!quiz;$('#levels').hidden=!quiz;$('#answer-form').hidden=!quiz;$('#point-controls').hidden=quiz;$('#values').hidden=quiz;$('#hint').hidden=!quiz;$('#next').hidden=!quiz||!s.solved;$('#next').lastChild.textContent=s.index===questions.length-1?'סיום המשחק':'המשימה הבאה';$('#check').disabled=s.solved;$('#stairs').checked=s.stairs;for(const input of $('#answer-form').querySelectorAll('input,button:not(#check)'))input.disabled=s.solved;
if(!quiz){$('#point-controls').innerHTML=['a','b'].map(k=>`<div>${k.toUpperCase()}${[0,1].map(j=>`<label>${j?'Y':'X'}<input type="range" min="-5" max="5" step="1" value="${s[k][j]}" data-k="${k}" data-j="${j}" aria-label="${j?'Y':'X'} של ${k.toUpperCase()}"></label>`).join('')}</div>`).join('');}
updateValues();stats();draw();}
function updateValues(){const [ax,ay]=s.a,[bx,by]=s.b;$('#coordinates').innerHTML=`<span class="math">A = (${ax}, ${ay})</span><span class="math">B = (${bx}, ${by})</span>`;const subtract=(axis,end,start)=>math(delta(axis)+'<mo>=</mo>'+mn(end)+'<mo>−</mo><mo>(</mo>'+mn(start)+'<mo>)</mo><mo>=</mo>'+mn(end-start));$('#values').innerHTML=`<div>${subtract('X',bx,ax)}</div><div>${subtract('Y',by,ay)}</div><div class="math-equation">${math('<mi>m</mi><mo>=</mo>')}${bx===ax?'<span dir="rtl">לא מוגדר</span>':math(fraction(mn(by-ay),mn(bx-ax))+'<mo>=</mo>')+slopeMarkup()}</div>`;}
function draw(){
const w=Math.max(240,svg.getBoundingClientRect().width),pad=38,unit=Math.min((w-2*pad)/14,30),h=14*unit+2*pad,ox=w/2,oy=h/2;geom={w,h,unit,ox,oy};svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.style.height=h+'px';let out='';
const x=v=>ox+v*unit,y=v=>oy-v*unit;
const line=(x1,y1,x2,y2,color,width=1,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
for(let i=-6;i<=6;i++){out+=line(x(i),y(-6),x(i),y(6),'var(--border)');out+=line(x(-6),y(i),x(6),y(i),'var(--border)');}
out+=line(x(-6),y(0),x(6),y(0),'var(--muted-foreground)',1.5)+line(x(0),y(-6),x(0),y(6),'var(--muted-foreground)',1.5);out+=`<text x="${x(6)+14}" y="${y(0)+4}">X</text><text x="${x(0)}" y="${y(6)-14}" text-anchor="middle">Y</text>`;
let [ax,ay]=s.a,[bx,by]=s.b,dx=bx-ax,dy=by-ay;let n=s.stairs?(gcd(Math.abs(dx),Math.abs(dy))||1):1;
out+=line(x(ax),y(ay),x(bx),y(by),'var(--viz-series-1)',3);
for(let i=0;i<n;i++){let px=ax+i*dx/n,py=ay+i*dy/n,qx=px+dx/n,qy=py+dy/n;out+=line(x(px),y(py),x(qx),y(py),'var(--viz-series-2)',3)+line(x(qx),y(py),x(qx),y(qy),'var(--viz-series-3)',3);if(dx)out+=`<path d="M ${x(qx)-Math.sign(dx)*6} ${y(py)-4} L ${x(qx)} ${y(py)} L ${x(qx)-Math.sign(dx)*6} ${y(py)+4}" fill="none" stroke="var(--viz-series-2)"/>`;if(dy)out+=`<path d="M ${x(qx)-4} ${y(qy)+Math.sign(dy)*6} L ${x(qx)} ${y(qy)} L ${x(qx)+4} ${y(qy)+Math.sign(dy)*6}" fill="none" stroke="var(--viz-series-3)"/>`;}
for(const [k,p]of [['a',s.a],['b',s.b]]){out+=`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="7" fill="var(--foreground)"/><text x="${x(p[0])+12}" y="${y(p[1])-12}">${k.toUpperCase()}</text><circle data-point="${k}" cx="${x(p[0])}" cy="${y(p[1])}" r="21" fill="transparent" style="cursor:grab"/>`;}
// Tick labels sit beside the axes, above the plotted lines for legibility.
for(let i=-6;i<=6;i++){if(!i||w<=450&&i%2!==0)continue;out+=line(x(i),y(0)-3,x(i),y(0)+3,'var(--muted-foreground)')+line(x(0)-3,y(i),x(0)+3,y(i),'var(--muted-foreground)');out+=`<text class="axis-number" data-axis="x" x="${x(i)}" y="${y(0)+18}" text-anchor="middle">${String(i).replace('-','−')}</text><text class="axis-number" data-axis="y" x="${x(0)-9}" y="${y(i)+4}" text-anchor="end">${String(i).replace('-','−')}</text>`;}
out+=`<text class="axis-number" x="${x(0)+7}" y="${y(0)+18}" text-anchor="start">0</text>`;
svg.innerHTML='<title>מדרגות השיפוע</title><desc>מנקודה A אל נקודה B. הקו האופקי הוא השינוי ב־X והקו האנכי הוא השינוי ב־Y.</desc>'+out;
}
function setPoint(k,p){const other=s[k==='a'?'b':'a'];if(p[0]===other[0]&&p[1]===other[1]){feedback('כדי לקבוע שיפוע דרושות שתי נקודות שונות.');return false;}s[k]=p;feedback('');updateValues();draw();return true;}
$('#point-controls').addEventListener('input',e=>{const t=e.target,k=t.dataset.k;if(!k)return;const p=[...s[k]];p[+t.dataset.j]=+t.value;if(!setPoint(k,p))t.value=s[k][+t.dataset.j];});
svg.addEventListener('pointerdown',e=>{if(s.mode!=='explore'||!e.target.dataset.point)return;drag=e.target.dataset.point;svg.setPointerCapture(e.pointerId);});
svg.addEventListener('pointermove',e=>{if(!drag)return;const r=svg.getBoundingClientRect();const p=[Math.max(-5,Math.min(5,Math.round((e.clientX-r.left-geom.ox)/geom.unit))),Math.max(-5,Math.min(5,Math.round((geom.oy-e.clientY+r.top)/geom.unit)))];if(setPoint(drag,p))$('#point-controls').querySelectorAll(`[data-k="${drag}"]`).forEach(t=>t.value=s[drag][+t.dataset.j]);});
['pointerup','pointercancel','lostpointercapture'].forEach(event=>svg.addEventListener(event,()=>drag=null));
$('#stairs').onchange=e=>{s.stairs=e.target.checked;draw();};
function hint(){feedback('אפשר לבחור מדרגה קטנה אחת או את השינוי הכולל מ־A ל־B. ימינה ולמעלה — חיובי; שמאלה ולמטה — שלילי. היחס הוא '+math('<mi>m</mi><mo>=</mo>'+fraction(delta('Y'),delta('X')))+'.');}
$('#hint').onclick=hint;
$('#answer-form').onsubmit=e=>{e.preventDefault();if(s.solved||s.mode!=='quiz'||Date.now()-lastCheck<500)return;
const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1];let m;
if(answerMode==='number'){m=parseNumber($('#slope').value);if(!Number.isFinite(m)){feedback('הזינו מספר או בחרו שבר עם מונה ומכנה.');return;}}
if(answerMode==='fraction'){const top=parseNumber($('#numerator').value),bottom=parseNumber($('#denominator').value);if(!Number.isFinite(top)||!Number.isFinite(bottom)){feedback('מלאו את המונה ואת המכנה.');return;}if(bottom===0){feedback('מכנה לא יכול להיות אפס. אם הישר אנכי, בחרו ״לא מוגדר״.');return;}m=top/bottom;}
lastCheck=Date.now();const correct=dx===0?answerMode==='undefined':answerMode!=='undefined'&&Number.isFinite(m)&&Math.abs(m-dy/dx)<1e-8;
if(!correct){s.tries++;s.streak=0;play('error');let message=dx?'נסו שוב. בדקו את הכיוון ואת היחס בין הצעד האנכי לצעד האופקי: '+math(fraction(delta('Y'),delta('X')))+'.':'זהו ישר אנכי. השינוי ב־X הוא אפס, ולכן השיפוע לא מוגדר.';if(s.tries%3===0)message+=' רמז נוסף: '+math(delta('X')+'<mo>=</mo>'+mn(dx))+' וגם '+math(delta('Y')+'<mo>=</mo>'+mn(dy))+'. קיבלתם עוד שלושה ניסיונות.';feedback(message,'error');stats();return;}
s.solved=true;s.coins++;if(s.tries===0){s.stars++;s.streak++;s.best=Math.max(s.best,s.streak);}else s.streak=0;play('success');render();feedback(`נכון! השיפוע הוא ${slopeMarkup()}. קיבלתם מטבע${s.tries===0?' וכוכב על פתרון בניסיון הראשון':''}.`,'success');};
$('#undefined').onclick=()=>setAnswerMode('undefined');
$('#number-mode').onclick=()=>setAnswerMode('number');
$('#fraction-mode').onclick=makeFraction;
$('#next').onclick=()=>{if(!s.solved)return;if(s.index<questions.length-1){s.index++;loadQuestion();}else{s.active=false;showScreen('finish');$('#summary').textContent=`פתרתם ${s.coins} מתוך ${questions.length} משימות וצברתם ${s.coins} מטבעות. הרצף הטוב ביותר: ${s.best}. זמן פעיל: ${$('#elapsed').textContent}.`;$('#stars-summary').innerHTML=`<img src="assets/icons/star_circle.svg" alt="כוכב"> ${s.stars} פתרונות בניסיון הראשון מתוך ${questions.length}`;play('finish');}};
$('#start').onclick=()=>{if(s.started&&s.active){showScreen('quiz');}else start();};$('#restart').onclick=start;$('#explore').onclick=lab;$('#finish-lab').onclick=lab;$('#home').onclick=()=>showScreen('home');
function openDialog(html){stopAudio();$('#dialog-content').innerHTML=html;$('#dialog').showModal();}
$('#close-dialog').onclick=()=>$('#dialog').close();
const helpHTML='<h2>איך משחקים?</h2><p>מתחילים בנקודה A ומסיימים בנקודה B. החלק האופקי של המדרגות מייצג את השינוי ב־X, והחלק האנכי את השינוי ב־Y.</p><div class="help-equations"><math dir="ltr"><mi>Δ</mi><mi>X</mi><mo>=</mo><msub><mi>x</mi><mi>B</mi></msub><mo>−</mo><msub><mi>x</mi><mi>A</mi></msub></math><math dir="ltr"><mi>Δ</mi><mi>Y</mi><mo>=</mo><msub><mi>y</mi><mi>B</mi></msub><mo>−</mo><msub><mi>y</mi><mi>A</mi></msub></math><math dir="ltr"><mi>m</mi><mo>=</mo><mfrac><mrow><mi>Δ</mi><mi>Y</mi></mrow><mrow><mi>Δ</mi><mi>X</mi></mrow></mfrac></math></div><p>ימינה ולמעלה: שינוי חיובי. שמאלה ולמטה: שינוי שלילי. ישר אופקי: שיפוע 0. ישר אנכי: השיפוע לא מוגדר. מדרגות קטנות וגדולות נותנות אותו יחס.</p><ul><li>מטבע אחד לכל משימה שנפתרה, פעם אחת בלבד.</li><li>כוכב על פתרון בניסיון הראשון. רצף הוא מספר משימות רצופות שנפתרו בניסיון הראשון.</li><li>שלושה לבבות הם שלושה ניסיונות עד רמז נוסף. אחרי שלוש טעויות מופיע רמז והניסיונות מתחדשים. אין פסילה.</li><li>השעון מודד זמן פעיל במשימות. אפשר להפעיל מד דקה בהגדרות; הוא עזר לקצב בלבד, ללא קנס.</li><li>במעבדה אפשר לגרור נקודות או להשתמש במחוונים ובמקשי החצים. במשימות הנקודות קבועות.</li><li>מזינים רק את השיפוע. אפשר לחשב לפי מדרגה קטנה אחת או לפי השינוי הכולל. בלחיצה על כפתור השבר ממלאים מונה מעל הקו ומכנה מתחתיו. אפשר להקליד מינוס ומספרים גם במקלדת רגילה. הצלילים ניתנים להשתקה.</li></ul>';
$('#help').onclick=()=>openDialog(helpHTML);
function settings(){openDialog('<h2>הגדרות</h2><label class="check"><input id="pace-setting" type="checkbox" '+(s.pace?'checked':'')+'> הצגת מד דקה אישי במשימות</label><p>המד נעצר בדקה; אפשר להמשיך לחשוב ללא הגבלת זמן.</p>');$('#pace-setting').onchange=e=>{s.pace=e.target.checked;stats();};}
$('#settings').onclick=settings;
$('#menu').onclick=()=>{openDialog('<h2>תפריט</h2><div class="menu-items"><button id="resume"><img src="assets/icons/play_circle.svg" alt="">'+(s.started&&s.active?'המשך המשחק':'התחלת משחק')+'</button><button id="menu-settings"><img src="assets/icons/settings_circle.svg" alt="">הגדרות</button><button id="menu-restart"><img src="assets/icons/restart_circle.svg" alt="">התחלה מחדש</button></div>');$('#resume').onclick=()=>{$('#dialog').close();if(s.started&&s.active)showScreen('quiz');else start();};$('#menu-settings').onclick=()=>{$('#dialog').close();settings();};$('#menu-restart').onclick=()=>{$('#dialog').close();start();};};
$('#levels').onclick=()=>openDialog('<h2>מסלול המשימות</h2><ol class="level-list">'+questions.map((q,i)=>`<li>${q.title} — ${i<s.index||i===s.index&&s.solved?'נפתרה':i===s.index?'המשימה הנוכחית':'בהמשך'}</li>`).join('')+'</ol>');
$('#mute').onclick=()=>{s.muted=!s.muted;stopAudio();updateMute();try{localStorage.setItem('prisma-slope-muted',String(s.muted));}catch{}};
const answerInputs=[...$('#answer-form').querySelectorAll('input')];
for(const input of answerInputs){input.addEventListener('focus',()=>lastInput=input);input.addEventListener('keydown',e=>{if(e.key==='/'){e.preventDefault();makeFraction();}if(answerMode==='fraction'&&e.key==='ArrowDown'){e.preventDefault();$('#denominator').focus();}if(answerMode==='fraction'&&e.key==='ArrowUp'){e.preventDefault();$('#numerator').focus();}});input.addEventListener('paste',e=>{const text=e.clipboardData.getData('text').trim(),match=text.match(/^([−+-]?\d+(?:\.\d+)?)\s*\/\s*([−+-]?\d+(?:\.\d+)?)$/);if(match){e.preventDefault();$('#numerator').value=match[1];$('#denominator').value=match[2];setAnswerMode('fraction');}});}
for(const key of ['1','2','3','4','5','6','7','8','9','0','−','fraction','.','מחיקה']){const b=document.createElement('button');b.type='button';if(key==='fraction')b.innerHTML='<span class="fraction-icon" aria-hidden="true"><span>א</span><span>ב</span></span>';else b.textContent=key;b.setAttribute('aria-label',key==='−'?'מינוס':key==='fraction'?'קו שבר':key);b.onclick=()=>{if(s.solved)return;if(key==='fraction'){makeFraction();return;}if(answerMode==='undefined')setAnswerMode('number');const start=lastInput.selectionStart??lastInput.value.length,end=lastInput.selectionEnd??start,v=lastInput.value;const position=key==='מחיקה'?Math.max(0,start-Number(start===end)):start;const inserted=key==='מחיקה'?'':key;lastInput.value=v.slice(0,position)+inserted+v.slice(end);lastInput.focus();lastInput.setSelectionRange(position+inserted.length,position+inserted.length);};$('.keypad').append(b);}
setInterval(()=>{if(s.mode==='quiz'&&!s.solved&&!document.hidden&&!$('#dialog').open){s.seconds++;s.questionSeconds++;stats();}},1000);
new ResizeObserver(()=>{if(!$('#activity').hidden)draw();}).observe($('.graph-panel'));
updateMute();
