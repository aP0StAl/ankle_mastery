'use strict';

function testCap(t){return t.max_test_steps||t.max_value||null;}
function validMeasurement(t,l){
  const vals=t.bilateral?[l.left,l.right]:[l.value];
  return vals.every(v=>Number.isFinite(v)&&v>=0&&(t.metric==='cm'||t.metric==='seconds'||Number.isInteger(v)));
}
function testHistory(t,protocol=t.protocol_id){
  return state.testLogs.filter(l=>l.testId===t.id&&l.protocol_id===protocol&&validMeasurement(t,l)).sort((a,b)=>a.ts-b.ts);
}
function currentMeasurement(t,ts=now()){
  const latest=state.testLogs.filter(l=>l.testId===t.id&&l.ts<=ts&&validMeasurement(t,l)).sort((a,b)=>a.ts-b.ts).at(-1);
  if(!latest)return null;
  const comparable=latest.protocol_id===t.protocol_id&&(!latest.conditions||latest.conditions==='standard');
  return {latest,log:comparable?latest:null,status:comparable?'current':'incomparable',ageDays:Math.floor((ts-latest.ts)/DAY)};
}
function measurementScore(t,l){
  if(t.lower_is_better)return 1/(1+l.right);
  if(t.bilateral){const absolute=t.target_injured_side_sec||(['single_leg_calf_raise_test','single_leg_hop_basic','lateral_hop'].includes(t.id)?t.reference_volume:null);return Math.min(clamp(symmetry(t,l)),absolute?clamp(l.right/absolute):1);}
  return clamp(l.value/t.readiness_reference);
}
function symmetry(t,l){
  if(t.lower_is_better)return l.right===0?1:l.left/l.right;
  return l.left>0?l.right/l.left:0;
}
function testLoad(t,values){
  const ex=EXMAP[t.dose_exercise_id];
  if(ex){
    const volume=t.bilateral?values.left+values.right:values.value;
    return Object.fromEntries(Object.keys(APP.fatigue_channels).map(k=>[k,(ex.load_channels[k]||0)*45*volume/doseVolume(ex.dose)]));
  }
  // A ROM distance is a result, not time or repetitions performed.
  const volume=t.metric==='errors_per_30s'?60:t.metric==='cm'?t.reference_volume:t.bilateral?values.left+values.right:values.value;
  const cfg=APP.assessment,factor=clamp(volume/t.reference_volume,cfg.load_factor_min,cfg.load_factor_max);
  return Object.fromEntries(Object.keys(APP.fatigue_channels).map(k=>[k,(t.test_load_vector[k]||0)*cfg.nominal_load*factor]));
}

function sessionLastAt(s){
  return Math.max(s.started_at,...state.testLogs.filter(l=>s.test_log_ids.includes(l.id)).map(l=>l.ts));
}
function activeAssessment(ts=now()){
  return state.assessment_sessions.findLast(s=>sessionLastAt(s)<=ts&&startOfDay(sessionLastAt(s))===startOfDay(ts)&&ts-sessionLastAt(s)<=APP.assessment.session_gap_minutes*60000);
}
function recalculateSession(s){
  const multiplier=APP.assessment.fatigue_multipliers[s.perceived_fatigue]||1;
  s.aggregate_load=Object.fromEntries(Object.keys(APP.fatigue_channels).map(k=>[k,0]));
  for(const id of s.test_log_ids){
    const log=state.testLogs.find(l=>l.id===id),ev=state.load_events.find(e=>e.id===log?.generated_load_event_id);
    if(!ev)continue;
    for(const k of Object.keys(s.aggregate_load)){
      ev.channels[k]=(ev.base_channels[k]||0)*multiplier;
      s.aggregate_load[k]+=ev.channels[k];
    }
  }
}
function recordTest(id,values,ts=now()){
  const t=RDCFG.tests.find(x=>x.id===id);
  if(!t||!testAvailable(t,ts)||!validMeasurement(t,values))throw new Error('Проверь результат теста');
  const capped={...values},cap=testCap(t);
  if(cap)for(const k of t.bilateral?['left','right']:['value'])capped[k]=Math.min(cap,capped[k]);
  let session=activeAssessment(ts);
  if(!session){
    session={id:makeId('s'),started_at:ts,completed_at:null,test_log_ids:[],aggregate_load:{},perceived_fatigue:null,pain_after:null,instability:false,swelling:false,same_day_response:null,next_day_response:null};
    state.assessment_sessions.push(session);
  }
  session.completed_at=null;
  const preparation_context={trainingDay:startOfDay(ts),exerciseIds:state.logs.filter(l=>l.ts>=startOfDay(ts)&&l.ts<=ts&&overlapsTest(t,EXMAP[l.exerciseId]?.load_channels)).map(l=>l.id),activityIds:state.customActivities.filter(a=>a.ts>=startOfDay(ts)&&a.ts<=ts&&overlapsTest(t,a.load)).map(a=>a.id),reportedFatigue:currentSymptoms(ts)?.fatigue||null};
  const eventId=makeId('load'),log={id:makeId('t'),testId:id,protocol_id:t.protocol_id,ts,...capped,preparation_context,generated_load_event_id:eventId};
  const channels=testLoad(t,capped);
  state.testLogs.push(log);
  ensureDailyPlan(ts);
  state.load_events.push({id:eventId,timestamp:ts,source_type:'test',source_id:log.id,channels:{...channels},base_channels:{...channels}});
  session.test_log_ids.push(log.id);recalculateSession(session);
  return session;
}
function testAvailable(t,ts=now()){
  if(t.status!=='locked')return true;
  return !impactTestLockReason(t,ts);
}
function overlapsTest(t,channels){return t.preparation_channels.some(k=>(channels?.[k]||0)>=.25);}
function testPreparationUntil(t,ts=now()){
  let until=0;
  for(const l of state.logs.filter(l=>l.ts<=ts)){
    const ex=EXMAP[l.exerciseId];if(!ex)continue;
    if((l.doseFactor??(l.actualDose?doseVolume(l.actualDose)/doseVolume(ex.dose):1))<.5)continue;
    const matching=t.dose_exercise_id===ex.id||t.dose_exercise_id&&ex.prescription_credit?.group===EXMAP[t.dose_exercise_id]?.prescription_credit?.group;
    if(matching||overlapsTest(t,ex.load_channels))until=Math.max(until,l.ts+(matching?t.preparation_minutes:Math.min(t.preparation_minutes,ex.min_rest_minutes||0))*60000);
  }
  for(const a of state.customActivities.filter(a=>a.ts<=ts)){
    if(t.preparation_channels.some(k=>(a.load?.[k]||0)>=45*.25))until=Math.max(until,a.ts+t.preparation_minutes*60000);
  }
  for(const previous of RDCFG.tests){
    if(!overlapsTest(t,EXMAP[previous.dose_exercise_id]?.load_channels||previous.test_load_vector))continue;
    for(const l of testHistory(previous).filter(l=>l.ts<=ts&&Object.values(testLoad(previous,l)).some(v=>v>0)))
      until=Math.max(until,l.ts+Math.min(t.preparation_minutes,previous.preparation_minutes)*60000);
  }
  return until;
}
function exerciseAfterTestUntil(ex,ts=now()){
  let until=0;
  for(const t of RDCFG.tests){
    if(!overlapsTest(t,ex.load_channels))continue;
    for(const l of testHistory(t).filter(l=>l.ts<=ts&&Object.values(testLoad(t,l)).some(v=>v>0)))
      until=Math.max(until,l.ts+Math.min(t.preparation_minutes,ex.min_rest_minutes||0)*60000);
  }
  return until;
}
function testPlans(ts=now()){
  const current=currentSymptoms(ts),recent=reactionEntries(ts).slice(-1)[0];
  const unfinished=state.assessment_sessions.find(s=>!s.completed_at&&sessionLastAt(s)<=ts);
  const morning=pendingMorningDays(ts).some(day=>nextDayStart(day)===startOfDay(ts));
  const measuredToday=RDCFG.tests.some(t=>testHistory(t).some(l=>l.ts>=startOfDay(ts)&&l.ts<=ts));
  const covered=new Set(RDCFG.tests.filter(t=>testHistory(t).some(l=>l.ts<=ts)).map(t=>t.domain));
  return RDCFG.tests.filter(t=>testAvailable(t,ts)).flatMap(t=>{
    if(postponedUntil('test',t.id,ts))return [];
    const latest=testHistory(t).filter(l=>l.ts<=ts).at(-1),age=latest?(ts-latest.ts)/DAY:Infinity;
    if(age<TEST_REPEAT_DAYS)return [];
    let status='ready',after=ts,reason='Первое измерение — до следующей похожей тренировки';
    if(unfinished){status='feedback';reason='Нужна оценка самочувствия после незавершённой серии тестов';}
    else if(safetyFlag(ts)||current&&(responseLevel(current)!=='normal'||current.fatigue==='high'||current.generalFatigue==='high')||recent?.pain>=3||recent?.worse){status='recovery';reason='Тест ждёт нормальной повторной оценки боли, устойчивости и усталости';}
    else if(morning){status='feedback';reason='Сначала оцени восстановление после вчерашней нагрузки';}
    else if(!current||startOfDay(current.ts)<startOfDay(ts)){status='feedback';reason='Сначала отметь сегодняшнее самочувствие';}
    else if(current.fatigue==='medium'&&t.effort!=='brief'){status='recovery';reason='После отмеченной усталости сначала проверь восстановление перед нагрузочным тестом';}
    else if(measuredToday){status='tomorrow';after=nextDayStart(ts);reason='Сегодня измерение уже было; следующий блок — после утренней проверки';}
    else {
      after=Math.max(ts,testPreparationUntil(t,ts));
      if(after>ts){status='waiting';reason=`До измерения нужен перерыв после похожей работы — ориентир ${fmtDate(after)} ${fmtTime(after)}`;}
      else if(latest)reason='Плановое повторное измерение — до следующей похожей тренировки';
    }
    const score=.7+(!covered.has(t.domain)?.12:0)+(t.effort==='brief'?.08:0)+.04*(latest?clamp((age-7)/14):1);
    return [{kind:'test',test:t,latest,score,status,after,reasons:[reason,latest?`последнее измерение: ${fmtDate(latest.ts)}`:'исходного измерения ещё нет','Расчёт похожей нагрузки не измеряет восстановление и сам по себе не запрещает тест']}];
  }).sort((a,b)=>Number(!b.latest)-Number(!a.latest)||({ready:0,waiting:1,feedback:2,recovery:3,tomorrow:4}[a.status]-{ready:0,waiting:1,feedback:2,recovery:3,tomorrow:4}[b.status])||b.score-a.score);
}
function measurementPlan(ts=now()){return testPlans(ts).find(r=>['ready','waiting','feedback'].includes(r.status))||null;}
function testRecommendations(ts=now()){
  return testPlans(ts).filter(r=>r.status==='ready').map(r=>({...r,status:'green'}));
}
