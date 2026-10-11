/* Question generator for an 8-task mixed route. Titles are teacher metadata only and are never shown to students. */
(function(root){
  'use strict';
  const key=q=>[...q.a,...q.b].join(',');
  const all=[];
  for(let ax=-4;ax<=4;ax++) for(let ay=-4;ay<=4;ay++) for(let bx=-4;bx<=4;bx++) for(let by=-4;by<=4;by++){
    const dx=bx-ax,dy=by-ay;
    if((!dx&&!dy)||Math.max(Math.abs(dx),Math.abs(dy))<2) continue;
    all.push({a:[ax,ay],b:[bx,by],dx,dy});
  }
  const pools={
    slopeOne:all.filter(q=>q.dx!==0 && q.dy/q.dx===1),
    integer:all.filter(q=>q.dx!==0 && Number.isInteger(q.dy/q.dx) && q.dy!==0 && Math.abs(q.dy/q.dx)>=1 && Math.abs(q.dy/q.dx)<=3),
    fraction:all.filter(q=>q.dx!==0 && q.dy!==0 && !Number.isInteger(q.dy/q.dx) && Math.abs(q.dy/q.dx)<1),
    steepFraction:all.filter(q=>q.dx!==0 && q.dy!==0 && !Number.isInteger(q.dy/q.dx) && Math.abs(q.dy/q.dx)>1),
    negative:all.filter(q=>q.dx!==0 && q.dy/q.dx<0),
    left:all.filter(q=>q.dx<0 && q.dy!==0),
    horizontal:all.filter(q=>q.dx!==0 && q.dy===0),
    vertical:all.filter(q=>q.dx===0 && q.dy!==0)
  };
  const labels={slopeOne:'שיפוע 1',integer:'שיפוע שלם',fraction:'שיפוע שברי',steepFraction:'שיפוע שברי תלול',negative:'שיפוע שלילי',left:'כיוון שמאלה',horizontal:'ישר אופקי',vertical:'ישר אנכי'};
  // Designed to vary difficulty and ensure horizontal/vertical are separated.
  const patterns=[
    ['slopeOne','integer','fraction','negative','horizontal','steepFraction','left','vertical'],
    ['integer','slopeOne','negative','fraction','vertical','left','steepFraction','horizontal'],
    ['slopeOne','negative','integer','vertical','fraction','left','horizontal','steepFraction']
  ];
  function shuffled(pool,random){const a=[...pool];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function createDealer(random=Math.random,previous={}){
    return {drawRun(){
      const pattern=patterns[Math.floor(random()*patterns.length)];
      const used=new Set();
      return pattern.map((type,i)=>{
        let candidates=shuffled(pools[type],random).filter(q=>!used.has(key(q))&&key(q)!==previous[type]);
        if(!candidates.length)candidates=shuffled(pools[type],random);
        const q=candidates[0]; used.add(key(q)); previous[type]=key(q);
        return {a:[...q.a],b:[...q.b],stageId:type,title:labels[type],difficulty:i===0?1:Math.min(5,2+Math.floor(i/2))};
      });
    },previous(){return {...previous};}};
  }
  const api={createDealer,key,pools};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SlopeQuestions=api;
})(typeof globalThis!=='undefined'?globalThis:this);
