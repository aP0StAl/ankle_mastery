'use strict';

function observationsFor(l,ts=now()){
  return historyValue('observations:'+l.id+':'+ts,()=>state.symptomReports.filter(r=>r.ts<=ts&&r.logId===l.id));
}
// Older morning reports used midnight as the stored day key. Keep their original associations.
function morningDayHour(r){return new Date(r.trainingDay).getHours()===0?0:5;}
function morningMatches(r,activityTs){return r.phase==='morning'&&r.trainingDay===startOfDay(activityTs,morningDayHour(r));}
function validMorningDay(r){const hour=morningDayHour(r);return nextDayStart(r.trainingDay,hour)===startOfDay(r.ts,hour);}
function morningFor(l,ts=now()){
  return historyValue('morning:'+l.ts+':'+ts,()=>state.symptomReports.filter(r=>r.ts<=ts&&morningMatches(r,l.ts)&&validMorningDay(r)).slice(-1)[0]);
}
function exerciseResponse(l,ts=now()){
  const reports=observationsFor(l,ts),rank={steady:0,shaky:1,giving_way:2};
  const immediate=l.steadiness||(l.instability?'giving_way':'steady');
  const morning=morningFor(l,ts);
  return {pain:Math.max(l.painDuring||0,l.painAfter||0,...reports.map(r=>r.pain||0)),painBefore:l.painBefore||0,
    fatigue:l.fatigue,technique:l.technique,difficulty:l.difficulty,phase:'after',
    steadiness:reports.reduce((v,r)=>(rank[r.steadiness]||0)>rank[v]?r.steadiness:v,immediate),
    swelling:!!l.swelling||reports.some(r=>r.swelling),
    worse:l.sameDay==='worse'||l.nextDay==='worse'||reports.some(r=>r.worse),
    morning:morning?.response||((startOfDay(l.ts)<startOfDay(ts))?l.nextDay:null)};
}
function responseLevel(r){
  if(r.pain>=5||r.swelling||r.steadiness==='giving_way')return 'pause';
  if(r.pain>=3||r.worse||r.steadiness==='shaky'||r.technique==='poor'||(r.phase!=='after'&&r.fatigue==='high'))return 'reduce';
  if(r.pain>Math.max(1,r.painBefore||0))return 'mild';
  return 'normal';
}
function minorReaction(r){
  return !!r&&r.context!=='exercise'&&r.worse&&!r.historyWorse&&r.pain>0&&r.pain<=1&&!r.swelling&&(!r.steadiness||r.steadiness==='steady')&&r.technique!=='poor'&&r.fatigue!=='high'&&r.generalFatigue!=='high';
}
function loadResponseLevel(r){return minorReaction(r)?'hold':responseLevel(r);}
function morningReaction(ts=now()){
  return state.symptomReports.filter(r=>r.phase==='morning'&&validMorningDay(r)&&r.ts<=ts&&startOfDay(r.ts)===startOfDay(ts)).at(-1);
}
function repeatedMorningReaction(ts=now()){
  const days=new Map();
  for(const r of state.symptomReports.filter(r=>r.phase==='morning'&&validMorningDay(r)&&r.ts<=ts).sort((a,b)=>a.ts-b.ts))days.set(startOfDay(r.ts),r);
  let bad=0,good=0,held=false,previous=null;
  for(const [day,r] of [...days].sort((a,b)=>a[0]-b[0])){
    if(previous!=null&&nextDayStart(previous)!==day){bad=0;good=0;}
    if(!r.historyKnown){bad=0;good=0;}
    else if(r.worse||r.historyWorse||responseLevel(r)!=='normal'){bad++;good=0;if(bad>=2)held=true;}
    else {good++;bad=0;if(good>=2)held=false;}
    previous=day;
  }
  return held;
}
function progressionHeld(ts=now()){
  const morning=morningReaction(ts);
  return repeatedMorningReaction(ts)||morning&&(responseLevel(morning)!=='normal'||morning.historyWorse);
}
function reactingStep(r,ts=now()){
  if(!r||r.context==='exercise'||['normal','hold'].includes(loadResponseLevel(r)))return null;
  return state.logs.filter(l=>l.ts<=r.ts&&l.ts<=ts&&(l.programChange??(l.variantProbe||l.transitionFrom||l.frequencyBlocks||l.doseReason==='trial'))&&
    (r.phase==='morning'?morningMatches(r,l.ts):startOfDay(l.ts)===startOfDay(r.ts))).sort((a,b)=>a.ts-b.ts).at(-1);
}
function confirmedSafe(l,ts=now()){
  const r=exerciseResponse(l,ts),m=morningFor(l,ts);
  return !!l.actualDose&&isSuccessful(l,ts)&&!!r.morning&&r.morning!=='worse'&&
    (!m||(responseLevel(m)==='normal'&&m.historyKnown&&!m.historyWorse))&&
    !reportedSymptoms(ts).some(x=>x.ts>=l.ts&&x.ts<=(m?.ts||l.ts+DAY)&&responseLevel(x)!=='normal');
}
function confirmedEasy(l,ts=now()){
  return confirmedSafe(l,ts)&&l.difficulty==='easy'&&l.fatigue!=='high'&&l.technique==='good';
}
function sameDose(a,b){
  return sameConditions(a,b)&&(doseFields[a.type]||[]).every(([k])=>a[k]===b[k]);
}
function sameConditions(a,b){
  return a.type===b.type&&['support','range','weight_distribution','resistance','weight_kg','equipment','tempo','protocol_id','sides'].every(k=>{
    const fallback=k==='weight_distribution'?'even':k==='support'||k==='range'?'usual':k==='sides'?1:null;
    return String(a[k]??fallback)===String(b[k]??fallback);
  });
}
function reportedSymptoms(ts=now()){
  return [...historyValue('symptoms:'+ts,()=>{
  const reports=state.symptomReports.filter(r=>r.ts<=ts).sort((a,b)=>a.ts-b.ts);
  const reportsByDay=new Map();
  for(const r of reports){const day=startOfDay(r.ts);if(!reportsByDay.has(day))reportsByDay.set(day,[]);reportsByDay.get(day).push(r);}
  const overall=state.logs.filter(l=>(l.symptomScope==='combined'||l.symptomScope==null&&l.phase==='after')&&l.ts<=ts).map(l=>({ts:l.ts,pain:l.painAfter,painBefore:l.painBefore||0,
    steadiness:l.steadiness||(l.instability?'giving_way':'steady'),swelling:!!l.swelling,fatigue:l.fatigue,phase:'current',context:'combined',sourceLogId:l.id,
    generalFatigue:reportsByDay.get(startOfDay(l.ts))?.findLast(r=>r.ts<=l.ts)?.generalFatigue||'unknown'}));
  return [...overall,...reports];
  })];
}
function currentSymptoms(ts=now()){
  const explicit=reportedSymptoms(ts).sort((a,b)=>a.ts-b.ts).slice(-1)[0];
  const exercise=state.logs.filter(l=>l.ts<=ts&&l.painAfter!=null).sort((a,b)=>a.ts-b.ts).slice(-1)[0];
  const session=state.assessment_sessions.filter(s=>s.pain_after!=null&&(s.reaction_at||s.completed_at)<=ts).sort((a,b)=>(a.reaction_at||a.completed_at)-(b.reaction_at||b.completed_at)).slice(-1)[0];
  const assessment=session&&{ts:session.reaction_at||session.completed_at,painAfter:session.pain_after,fatigue:{easy:'low',moderate:'medium',strong:'high'}[session.perceived_fatigue],steadiness:session.instability?'giving_way':'steady',swelling:session.swelling,context:'assessment',id:session.id,worse:session.same_day_response==='worse'||session.next_day_response==='worse'};
  const unresolved=assessment&&(!explicit||explicit.ts<assessment.ts)&&(assessment.fatigue==='high'||responseLevel({...assessment,pain:assessment.painAfter})!=='normal');
  const last=assessment&&(unresolved||!exercise||assessment.ts>=exercise.ts)?assessment:exercise;
  if(explicit&&responseLevel(explicit)!=='normal'&&!unresolved||!last||explicit&&explicit.ts>=last.ts)return explicit;
  return {ts:last.ts,pain:last.painAfter,painBefore:last.painBefore||0,steadiness:last.steadiness||(last.instability?'giving_way':'steady'),swelling:!!last.swelling,fatigue:last.fatigue,generalFatigue:explicit&&startOfDay(explicit.ts)===startOfDay(ts)?explicit.generalFatigue:'unknown',phase:'after',context:last.context||'exercise',logId:last.id,worse:!!last.worse};
}
function testSupportsProgression(evidence,ts=now()){
  const {log}=evidence,morning=morningFor(log,ts),session=state.assessment_sessions.find(s=>s.test_log_ids.includes(log.id));
  const pain=log.pain_after??session?.pain_after;
  return ['easy','normal'].includes(log.difficulty)&&['cap','planned'].includes(log.stop_reason)&&
    pain!=null&&pain<=1&&morning&&morning.historyKnown&&!morning.historyWorse&&responseLevel(morning)==='normal'&&
    !session?.swelling&&!session?.instability&&session?.same_day_response!=='worse'&&session?.next_day_response!=='worse'&&
    !reactionEntries(ts).some(r=>r.ts>=log.ts&&r.ts<=morning.ts&&(r.pain>=3||r.swelling||r.instability||r.worse));
}
