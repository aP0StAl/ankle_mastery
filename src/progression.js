'use strict';

function strengthExercise(ex){return ['calf_strength','weighted_strength','reps_then_variant'].includes(ex.progression?.type);}
function progressConfirmations(ex,established=false){return established&&(strengthExercise(ex)||['duration_levels','pogo_ladder'].includes(ex.progression?.type))?2:3;}
function forwardDose(ex,a,b){
  if(sameConditions(a,b))return doseVolume(a)>doseVolume(b)||doseVolume(a)===doseVolume(b)&&(a.sets||1)>(b.sets||1);
  const option=doseOptions[ex.id];
  if(option?.key==='weight_kg')return Number(a.weight_kg)>Number(b.weight_kg);
  return option&&option.values.findIndex(v=>v[0]===a[option.key])>option.values.findIndex(v=>v[0]===(b[option.key]||option.values[0][0]));
}
function exerciseProgress(ex,ts=now()){
  return historyValue('progress:'+ex.id+':'+ts,()=>{
  const logs=state.logs.filter(l=>l.exerciseId===ex.id&&!l.additionalPlanPart&&l.actualDose?.type===ex.dose?.type&&l.ts<=ts&&(!ex.dose.protocol_id||l.actualDose.protocol_id===ex.dose.protocol_id)&&(!ex.dose.sides||l.actualDose.sides===ex.dose.sides)).sort((a,b)=>a.ts-b.ts);
  const symptoms=reportedSymptoms(ts);
  let working={...ex.dose},confirmed=false,confirmedAt=null,transition=null,adverse=false;
  const banks=new Map(),achievements=[];let candidate=null;
  const signature=d=>JSON.stringify([d.type,...['support','range','weight_distribution','resistance','weight_kg','equipment','tempo','protocol_id','sides'].map(k=>d[k]??(k==='weight_distribution'?'even':k==='support'||k==='range'?'usual':k==='sides'?1:null)),...(doseFields[d.type]||[]).map(([k])=>d[k])]);
  for(const l of logs){
    const option=doseOptions[ex.id],known=!['resistance','weight_kg'].includes(option?.key)||l.actualDose[option.key]!=null;
    const response=exerciseResponse(l,ts),m=morningFor(l,ts);
    if(known&&!confirmed&&!['time','daily_load','trial','calibration','test'].includes(l.doseReason)&&responseLevel(response)==='normal')working={...l.actualDose};
    const failed=!isSuccessful(l,ts)||l.difficulty==='hard'||l.fatigue==='high'||m&&(responseLevel(m)!=='normal'||m.historyWorse)||symptoms.some(r=>r.ts>=l.ts&&r.ts<=(m?.ts||l.ts+DAY)&&responseLevel(r)!=='normal');
    if(failed){banks.clear();candidate=null;adverse=true;continue;}
    if(!known||['time','daily_load','planned_remainder'].includes(l.doseReason))continue;
    const key=signature(l.actualDose),entry=banks.get(key)||{dose:{...l.actualDose},logs:[]};
    if(!banks.has(key))banks.set(key,entry);
    if(!sameDose(l.actualDose,working)&&(forwardDose(ex,l.actualDose,working)||l.doseReason==='trial'&&(!sameConditions(l.actualDose,working)||!logs.some(x=>x.ts<l.ts&&x.ts>=l.ts-30*DAY))))candidate=entry;
    if(!confirmedSafe(l,ts))continue;
    const at=entry.logs.findIndex(x=>startOfDay(x.ts)===startOfDay(l.ts));
    if(at<0)entry.logs.push(l);else if(confirmedEasy(l,ts)&&!confirmedEasy(entry.logs[at],ts))entry.logs[at]=l;
    const required=progressConfirmations(ex,confirmed&&sameConditions(entry.dose,working));
    const returning=confirmed&&ex.prescription_credit?.group&&sameConditions(entry.dose,working)&&doseVolume(entry.dose)<doseVolume(working);
    if(!returning&&entry.logs.length>=required&&(!confirmed||sameDose(entry.dose,working)||forwardDose(ex,entry.dose,working)||adverse)){
      const newlyConfirmed=!confirmed||!sameDose(entry.dose,working)||adverse;
      if(!sameDose(entry.dose,working))transition=forwardDose(ex,entry.dose,working)?{from:{...working},to:{...entry.dose},at:m?.ts||l.ts}:null;
      working={...entry.dose};confirmed=true;if(newlyConfirmed)confirmedAt=m?.ts||l.ts;adverse=false;
      if(!achievements.some(a=>sameDose(a.dose,entry.dose)))achievements.push({dose:{...entry.dose},at:confirmedAt,logIds:entry.logs.map(x=>x.id)});
      if(candidate===entry)candidate=null;
    }
  }
  const run=banks.get(signature(working))?.logs||[];
  if(candidate&&sameDose(candidate.dose,working))candidate=null;
  return {working,confirmed,confirmedAt,transition,achievements,logs,run,candidate:candidate?.dose||null,candidateRun:candidate?.logs||[],candidateDays:Math.min(3,candidate?candidate.logs.length:run.length),confirmedDays:confirmed?3:Math.min(3,run.length)};
  });
}
function doseKey(ex){return doseFields[ex.dose?.type]?.[0]?.[0];}
function doseCeiling(ex,working,ts=now()){
  const key=doseKey(ex);
  return Math.max(working?.[key]||0,ex.progression?.ceiling||ex.dose?.[key]||0);
}
function reduceDose(ex,anchor,cause='unknown'){
  const dose={...anchor},key=doseKey(ex);if(!key)return dose;
  // The cause selects a parameter; an unknown cause uses a small, declared step.
  if(cause==='sets'&&dose.sets>1)dose.sets--;
  else {const step=ex.progression?.reduce_step||(key==='target_sec'?5:1);dose[key]=Math.max(1,dose[key]-step);}
  return dose;
}
function unprescribedFrequency(ex){return !ex.prescription_credit?.group;}
function doseWithinVolume(ex,anchor,volume){
  const dose={...anchor},key=doseKey(ex);
  if(doseVolume(dose)<=volume)return dose;
  if(dose.sets>1)dose.sets=Math.max(1,Math.floor(volume/(doseVolume(dose)/dose.sets)));
  if(key&&doseVolume(dose)>volume)dose[key]=Math.floor(dose[key]*volume/doseVolume(dose));
  return key&&dose[key]>=1&&doseVolume(dose)<=volume?dose:null;
}
function dailyLoadPlan(ex,ts=now()){
  const demand=Math.max(0,...Object.values(ex.load_channels||{})),current=currentSymptoms(ts);
  const level=current?responseLevel(current):'normal';
  const evidence=ex.id&&testDoseEvidence(ex,ts);
  if(evidence?.capacity===0&&!state.logs.some(l=>l.exerciseId===ex.id&&l.ts>evidence.log.ts&&l.ts<=ts&&isSuccessful(l,ts)))return {status:'pause',reason:'Тест этого варианта дал 0: выбери более простой вариант или уточни результат'};
  if(safetyFlag(ts)&&demand>=.25)return {status:'pause',reason:'Выраженная реакция: нужна повторная оценка самочувствия'};
  if(demand<.25)return {status:'normal',reason:''};
  if(level==='pause')return {status:'pause',reason:'Выраженная реакция: отдых и повторная оценка самочувствия'};
  const morning=morningReaction(ts);
  if(minorReaction(current)||level==='normal'&&current?.fatigue!=='high'&&current?.generalFatigue!=='high'&&(minorReaction(morning)||repeatedMorningReaction(ts)))return {status:'hold',reason:repeatedMorningReaction(ts)?'Утром повторяется ухудшение: сохраняем дозу и пересматриваем нагрузку. Для следующего шага нужны два нормальных утра':'Слабая реакция: сохраняем текущий объём без нового повышения и наблюдаем самочувствие'};
  // Reported incomplete recovery calls for feedback, not a fixed daily load budget.
  if(level==='reduce'){
    let episode=null;
    for(const r of reportedSymptoms(ts).sort((a,b)=>a.ts-b.ts)){
      if(responseLevel(r)==='normal')episode=null;else if(episode==null)episode=r.ts;
    }
    const already=state.logs.some(l=>l.ts>(episode??current.ts)&&l.ts<=ts&&Math.max(0,...Object.values(EXMAP[l.exerciseId]?.load_channels||{}))>=.25);
    if(already)return {status:'pause',reason:'После облегчённого выполнения оцени самочувствие перед следующим',needsFeedback:true};
    const step=reactingStep(current,ts);
    if(step&&ex.prescription_credit?.group&&step.exerciseId!==ex.id)return {status:'hold',reason:'После последней прибавки отмечена реакция. Здесь сохраняем прежнюю дозу без повышения; оцени самочувствие после выполнения'};
    return {status:'light',reason:'Уменьшаем объём из-за отмеченного самочувствия'+(unprescribedFrequency(ex)?'':'; частота пока сохраняется')};
  }
  if(current?.generalFatigue==='high'&&startOfDay(current.ts)===startOfDay(ts))return {status:'light',reason:'Сегодня меньший объём из-за общей усталости; переносимость упражнения не ухудшаем'};
  if(morning&&reactingStep(morning,ts)&&ex.prescription_credit?.group)return {status:'hold',reason:'После прибавки было хуже: возвращаем только проверяемую дозу, остальные переносимые упражнения сохраняем'};
  if(current?.fatigue==='high'||morning&&(responseLevel(morning)!=='normal'||morning.historyWorse))return {status:'light',reason:'Сегодня меньший объём после неполного восстановления; оцени реакцию на него'};
  return {status:'normal',reason:''};
}
function testDoseEvidence(ex,ts=now()){
  const t=RDCFG.tests.find(t=>t.dose_exercise_id===ex.id);
  if(!t)return null;
  const log=currentMeasurement(t,ts)?.log;
  if(!log)return null;
  return {test:t,log,capacity:t.bilateral?log.right:log.value};
}
function lastRelatedExecution(ex,ts=now()){
  const group=ex.prescription_credit?.group;
  const matches=id=>id===ex.id||group&&EXMAP[id]?.prescription_credit?.group===group;
  return [...state.logs.filter(l=>matches(l.exerciseId)),...state.testLogs.filter(l=>RDCFG.tests.some(t=>t.id===l.testId&&l.protocol_id===t.protocol_id&&matches(t.dose_exercise_id)))].filter(l=>l.ts<=ts).sort((a,b)=>a.ts-b.ts).slice(-1)[0];
}
function exerciseRestUntil(ex,ts=now()){
  if(unprescribedFrequency(ex))return 0;
  const group=ex.prescription_credit?.group;
  return state.logs.filter(l=>l.ts<=ts&&(l.exerciseId===ex.id||group&&EXMAP[l.exerciseId]?.prescription_credit?.group===group)).reduce((until,l)=>Math.max(until,l.ts+Math.max(ex.min_rest_minutes||0,EXMAP[l.exerciseId]?.min_rest_minutes||0)*60000),0);
}
function nextVariant(ex,ts=now(),select=true){
  const next=EXMAP[ex.progression?.next_exercise_id];
  if(!next||homeReturns(ts).length||progressionHeld(ts)||!['active','available'].includes(state.exerciseStatuses[next.id])||!progressionAdherence(ts).allowed)return null;
  const progress=exerciseProgress(ex,ts),evidence=testDoseEvidence(ex,ts),current=currentSymptoms(ts);
  if(!recoveredAfter(progress,lastAdverseExercise(ex,ts),ts)||safetyFlag(ts)||current&&(responseLevel(current)!=='normal'||current.fatigue==='high'||current.generalFatigue==='high'&&startOfDay(current.ts)===startOfDay(ts)))return null;
  const recent=progress.run.filter(l=>ts-l.ts<=30*DAY&&confirmedEasy(l,ts));
  const passedTest=evidence&&evidence.capacity>=testCap(evidence.test)&&testSupportsProgression(evidence,ts)&&evidence.log.stop_reason==='cap';
  if(ex.id==='right_leg_balance_left_front_back'){
    if(progress.working.support!=='none'||progress.working.cycles<5||recent.length<3||!homeRamp(ex,progress,ts).complete)return null;
  }else if(ex.id==='single_leg_calf_raise'){
    if(!progress.confirmed||progress.working.sets<3||progress.working.reps<12||strengthCadence(ts).freeze)return null;
  }else if(!passedTest&&!(progress.confirmed&&progress.working[doseKey(ex)]>=ex.dose[doseKey(ex)]&&recent.length>=3))return null;
  if(evidence&&evidence.capacity<progress.working[doseKey(ex)]&&!recent.some(l=>l.ts>evidence.log.ts))return null;
  if(dailyLoadPlan(ex,ts).status!=='normal'||dailyLoadPlan(next,ts).status!=='normal'||maxPerDayReached(next,ts)||postponedUntil('exercise',next.id,ts))return null;
  const adverse=lastAdverseExercise(next,ts),nextProgress=exerciseProgress(next,ts);
  if(!recoveredAfter(nextProgress,adverse,ts)&&recent.filter(l=>l.ts>adverse.ts).length<3)return null;
  const session=evidence&&state.assessment_sessions.find(s=>s.test_log_ids.includes(evidence.log.id));
  if(session&&(session.pain_after>=3||session.swelling||session.instability||session.same_day_response==='worse'||session.next_day_response==='worse'))return null;
  if(!unprescribedFrequency(next)){const np=exerciseProgress(next,ts),limit=homeRamp(next,np,ts,progress.working).limit;if(np.logs.filter(l=>l.ts>=startOfDay(ts)).length>=limit)return null;}
  if(select&&selectedProgramUpgrade(ts)?.id!==next.id)return null;
  return {ex:next,test:RDCFG.tests.find(t=>t.dose_exercise_id===next.id),after:Math.max(ts,exerciseRestUntil(next,ts))};
}
function lastAdverseExercise(ex,ts){
  return state.logs.filter(l=>l.exerciseId===ex.id&&l.ts<=ts&&(!l.actualDose||l.actualDose.type===ex.dose.type)).sort((a,b)=>a.ts-b.ts).filter(l=>{
    const response=exerciseResponse(l,ts),morning=morningFor(l,ts);
    const shared=l.symptomScope==='combined'||l.symptomScope==null&&l.phase==='after';
    const reports=observationsFor(l,ts),own={...response,context:'exercise',pain:Math.max(l.painDuring||0,...reports.map(r=>r.pain||0),shared?0:l.painAfter||0),
      worse:reports.some(r=>r.worse)||!shared&&(l.sameDay==='worse'||l.nextDay==='worse'),
      steadiness:shared&&!reports.length?'steady':response.steadiness,swelling:shared?reports.some(r=>r.swelling):response.swelling};
    const trial=l.returnStep||l.variantProbe||l.doseReason==='trial',delayed=morning&&(morning.historyWorse||!['normal','hold'].includes(loadResponseLevel(morning)));
    return !['normal','hold'].includes(loadResponseLevel(own))||l.difficulty==='hard'||l.fatigue==='high'||trial&&(delayed||reportedSymptoms(ts).some(r=>r.ts>=l.ts&&reactingStep(r,ts)?.id===l.id));
  }).at(-1);
}
function recoveredAfter(progress,adverse,ts){
  return !adverse||progress.confirmed&&new Set(progress.logs.filter(l=>l.ts>adverse.ts&&sameDose(l.actualDose,progress.working)&&!['time','daily_load'].includes(l.doseReason)&&l.difficulty!=='hard'&&l.fatigue!=='high'&&confirmedSafe(l,ts)).map(l=>startOfDay(l.ts))).size>=3;
}
function homeReturnState(ex,ts=now(),progress=exerciseProgress(ex,ts)){
  if(!ex.prescription_credit?.group||!progress.confirmed)return null;
  const goal=progress.working,key=doseKey(ex),compatible=d=>sameConditions(d,goal)&&(doseFields[goal.type]||[]).every(([k])=>k===key||d[k]===goal[k]);
  const logs=progress.logs.filter(l=>!l.returnBlocked&&l.doseReason!=='time'&&compatible(l.actualDose));
  const latestReduced=logs.findLast(l=>l.actualDose[key]<goal[key]&&['recovery','return'].includes(l.doseReason));
  if(!latestReduced)return null;
  const previousGoal=latestReduced.returnGoal||progress.achievements.filter(a=>a.at<=latestReduced.ts).sort((a,b)=>a.at-b.at).at(-1)?.dose;
  if(previousGoal&&forwardDose(ex,goal,previousGoal))return null;
  const anchor=logs.findLast(l=>l.ts<latestReduced.ts&&l.actualDose[key]>=goal[key]);
  const reduced=logs.find(l=>l.ts>(anchor?.ts||0)&&l.actualDose[key]<goal[key]&&['recovery','return'].includes(l.doseReason));
  const last=logs.findLast(l=>l.doseReason!=='daily_load');if(last.actualDose[key]>goal[key])return null;
  const adverse=lastAdverseExercise(ex,ts);
  let dose={...last.actualDose};
  const step=logs.findLast(l=>l.returnStep);
  if(adverse?.returnFrom&&adverse.id===step?.id&&doseVolume(dose)>doseVolume(adverse.returnFrom))dose={...adverse.returnFrom};
  else if(adverse&&adverse.ts>=last.ts)dose=adverse.returnFrom?{...adverse.returnFrom}:reduceDose(ex,dose,adverse.limitCause);
  const evidence=testDoseEvidence(ex,ts),doseFromTest=evidence?.capacity>0&&evidence.capacity<dose[key]&&!progress.logs.some(l=>l.ts>evidence.log.ts&&confirmedSafe(l,ts));
  if(doseFromTest){const probe=ex.progression?.test_probe||reduceDose(ex,dose);dose={...dose,...probe,[key]:Math.max(1,Math.min(probe[key],Math.floor(evidence.capacity)-1))};}
  const observations=reportedSymptoms(ts).filter(r=>r.ts>=reduced.ts&&(responseLevel(r)!=='normal'||r.historyWorse||r.fatigue==='high'||r.generalFatigue==='high'));
  const assessments=state.assessment_sessions.filter(s=>(s.reaction_at||s.completed_at)<=ts&&(s.perceived_fatigue==='strong'||s.pain_after>=3||s.swelling||s.instability||s.same_day_response==='worse'||s.next_day_response==='worse'));
  const cutoff=Math.max(reduced.ts-1,adverse?.ts||0,doseFromTest?evidence.log.ts:0,...observations.map(r=>r.ts),...assessments.map(s=>s.reaction_at||s.completed_at));
  const changed=logs.findLast(l=>l.ts>=reduced.ts&&!sameDose(l.actualDose,dose));
  const since=Math.max(cutoff,changed?.ts||0,ts-30*DAY),days=new Map();
  for(const l of logs.filter(l=>l.ts>since&&sameDose(l.actualDose,dose)&&l.difficulty!=='hard'&&l.fatigue!=='high'&&
    exerciseRestUntil(ex,l.ts-1)<=l.ts&&exerciseAfterTestUntil(ex,l.ts)<=l.ts&&confirmedSafe(l,ts))){
    const day=startOfDay(l.ts);days.set(day,(days.get(day)||0)+1);
  }
  const full=[...days].filter(([,n])=>n>=APP.program.prescription_groups[ex.prescription_credit.group].target_per_day);
  if(sameDose(dose,goal)&&full.length>=2)return null;
  const next=dose[key]<goal[key]?{...dose,[key]:Math.min(goal[key],dose[key]+(ex.progression?.reduce_step||(key==='target_sec'?5:1)))}:null;
  return {goal:{...goal},dose,next,evidence,doseFromTest,days:Math.min(2,full.length),ready:!!next&&full.length>=2,at:full.length?morningFor(logs.findLast(l=>startOfDay(l.ts)===full.at(-1)[0]),ts)?.ts||ts:ts,
    reason:`${doseFromTest?'Результат теста ниже текущей дозы: проверяем меньший объём. ':''}${sameDose(dose,goal)?'Прежний объём возвращён: '+doseText(ex,goal):'Возвращаем прежний объём: '+doseText(ex,dose)+' → '+doseText(ex,goal)}. Полных переносимых дней на этой ступени: ${Math.min(2,full.length)}/2. Частота сохраняется`};
}
function homeReturns(ts=now()){
  const order=['bilateral_tiptoe_static','right_leg_balance_left_front_back','tandem_walk_flat','left_side_lunge_right_leg_straight','towel_stretch_straight_knee','towel_stretch_bent_knee'];
  return order.filter(id=>state.exerciseStatuses[id]==='active').map(id=>({ex:EXMAP[id],...homeReturnState(EXMAP[id],ts)})).filter(r=>r.goal);
}
function homeRamp(ex,progress,ts=now(),from=null){
  if(unprescribedFrequency(ex))return {limit:Infinity,complete:true};
  const transition=from?{from,to:progress.working,at:progress.confirmedAt}:progress.transition;
  if(!progress.confirmed)return {limit:1,complete:false};
  if(!transition)return {limit:3,complete:true};
  const days=new Map();
  for(const l of progress.logs.filter(l=>l.ts>=startOfDay(transition.at)&&sameDose(l.actualDose,transition.to)&&confirmedSafe(l,ts))){
    const day=startOfDay(l.ts);days.set(day,(days.get(day)||0)+1);
  }
  if([...days.values()].some(n=>n>=3))return {limit:3,adopted:3,complete:true,from:transition.from};
  const limit=[...days.values()].some(n=>n>=2)?3:2,adopted=Math.min(3,Math.max(1,...days.values(),...progress.logs.filter(l=>l.ts>=transition.at&&sameDose(l.actualDose,transition.to)).map(l=>l.frequencyBlocks||1)));
  return {limit,adopted,complete:false,from:transition.from};
}
function homeVariantChoice(ex,ts=now()){
  const group=ex.prescription_credit?.group,base=group&&EX.find(b=>b.prescription_credit?.group===group&&EXMAP[b.progression?.next_exercise_id]?.prescription_credit?.group===group&&(b.id===ex.id||b.progression?.next_exercise_id===ex.id));
  if(!base)return {ex};
  if(homeReturns(ts).length)return {ex:base,base};
  const next=EXMAP[base.progression.next_exercise_id],progress=exerciseProgress(next,ts),adverse=[lastAdverseExercise(base,ts),lastAdverseExercise(next,ts)].filter(Boolean).sort((a,b)=>a.ts-b.ts).at(-1);
  const recovered=recoveredAfter(progress,adverse,ts),last=progress.logs.at(-1);
  const probing=last?.transitionFrom===base.id&&(!adverse||recovered);
  const ready=state.exerciseStatuses[next.id]==='active'&&!postponedUntil('exercise',next.id,ts)&&dailyLoadPlan(next,ts).status==='normal';
  const rawRamp=homeRamp(next,progress,ts,exerciseProgress(base,ts).working),upgrade=selectedProgramUpgrade(ts),ramp={...rawRamp,limit:rawRamp.adopted&&upgrade?.id!==next.id?rawRamp.adopted:rawRamp.limit},today=progress.logs.filter(l=>l.ts>=startOfDay(ts)).length;
  const selected=ready&&today<ramp.limit&&(progress.confirmed&&recovered||probing||nextVariant(base,ts))?next:base;
  return {ex:selected,base,transition:selected.id===next.id&&(!ramp.complete||!recovered)};
}
function upgradeSessionEligible(ts){
  const day=startOfDay(ts),days=additionalTrainingDays(ts),limit=state.exerciseStatuses.single_leg_calf_raise==='active'?strengthCadence(ts).limit:3;
  if(state.additionalPlan&&state.additionalPlan.closedAt==null&&state.additionalPlan.endedAt==null)return false;
  if(days.at(-1)!=null&&day<trainingDayOffset(days.at(-1),2))return false;
  return additionalSessionDays(ts).filter(d=>d>=trainingDayOffset(day,-6)).length<limit;
}
function upgradeKey(step){return JSON.stringify([step.id,step.kind||'dose',step.blocks||null,Object.entries(step.dose).sort(([a],[b])=>a.localeCompare(b))]);}
function upgradeReadyAt(ex,progress,ts){
  const required=progressConfirmations(ex,progress.confirmed),good=progress.run.filter(l=>strengthExercise(ex)?confirmedSafe(l,ts)&&l.difficulty!=='hard'&&l.technique==='good':confirmedEasy(l,ts));
  const proof=good[required-1],evidence=testDoseEvidence(ex,ts),testAt=evidence&&testSupportsProgression(evidence,ts)?morningFor(evidence.log,ts)?.ts:null;
  const practiceAt=proof?Math.max(progress.confirmedAt||0,morningFor(proof,ts)?.ts||nextDayStart(proof.ts)):null;
  return Math.min(...[practiceAt,testAt].filter(Number.isFinite),ts);
}
function selectedProgramUpgrade(ts=now()){
  const changed=state.logs.filter(l=>l.ts<=ts&&(l.programChange??(l.variantProbe||l.transitionFrom||l.frequencyBlocks||l.doseReason==='trial'))).sort((a,b)=>a.ts-b.ts);
  const today=changed.find(l=>l.ts>=startOfDay(ts));
  if(today)return {id:today.exerciseId,dose:today.actualDose,kind:today.returnGoal?'return':today.frequencyBlocks?'frequency':undefined,performed:true};
  const last=changed.at(-1);
  if(last&&!morningFor(last,ts)&&!state.logs.some(l=>l.ts>last.ts&&confirmedSafe(l,ts)))return null;
  const current=currentSymptoms(ts);
  if(progressionHeld(ts)||safetyFlag(ts)||current&&(responseLevel(current)!=='normal'||current.fatigue==='high'||current.generalFatigue==='high'))return null;
  const returns=homeReturns(ts);
  if(returns.length){
    if(pendingMorningDays(ts).some(day=>nextDayStart(day)===startOfDay(ts)))return null;
    const ready=returns.filter(r=>r.ready&&dailyLoadPlan(r.ex,ts).status==='normal'&&!postponedUntil('exercise',r.ex.id,ts));
    const offers=state.decisionLog.filter(d=>d.action==='upgrade_scheduled'&&d.ts<=ts),chosen=offers.findLast(d=>d.ts>=startOfDay(ts));
    const step=ready.find(r=>r.ex.id===chosen?.details.exerciseId)||ready[0];
    return step?{id:step.ex.id,dose:step.next,kind:'return',readyAt:step.at,key:upgradeKey({id:step.ex.id,dose:step.next,kind:'return'})}:null;
  }
  if(!progressionAdherence(ts).allowed)return null;
  const extra=upgradeSessionEligible(ts),steps=[],add=(step,readyAt)=>{step.key=upgradeKey(step);step.readyAt=readyAt;steps.push(step);};
  for(const ex of EX){
    if(!ex.dose||state.exerciseStatuses[ex.id]!=='active'||postponedUntil('exercise',ex.id,ts)||unprescribedFrequency(ex)&&!extra)continue;
    const progress=exerciseProgress(ex,ts),readyAt=upgradeReadyAt(ex,progress,ts),ramp=homeRamp(ex,progress,ts);
    if(unprescribedFrequency(ex)&&isNewPractice(ex,ts)){add({id:ex.id,dose:{...ex.dose},kind:'new'},readyAt);continue;}
    if(!ramp.complete&&ramp.adopted&&ramp.limit>ramp.adopted){add({id:ex.id,dose:{...progress.working},kind:'frequency',blocks:ramp.limit},ramp.limit===2?progress.confirmedAt||ts:Math.max(progress.confirmedAt||0,...progress.logs.filter(l=>l.frequencyBlocks===2&&confirmedSafe(l,ts)).map(l=>morningFor(l,ts)?.ts||l.ts)));continue;}
    const proposed=suggestedDose(ex,ts,false);
    if(proposed.trial){add({id:ex.id,dose:proposed.trial},readyAt);continue;}
    const variant=nextVariant(ex,ts,false);if(!variant)continue;
    const next=exerciseProgress(variant.ex,ts),r=homeRamp(variant.ex,next,ts,unprescribedFrequency(variant.ex)?null:progress.working);
    if(!next.confirmed||!recoveredAfter(next,lastAdverseExercise(variant.ex,ts),ts))add({id:variant.ex.id,dose:{...variant.ex.dose},kind:'variant',fromId:ex.id},readyAt);
    else if(!r.complete&&r.limit>r.adopted)add({id:variant.ex.id,dose:{...next.working},kind:'frequency',blocks:r.limit,fromId:ex.id},next.confirmedAt||ts);
  }
  const offers=state.decisionLog.filter(d=>d.action==='upgrade_scheduled'&&d.ts<=ts),chosen=offers.findLast(d=>d.ts>=startOfDay(ts));
  const retained=chosen&&steps.find(step=>step.key===chosen.details.stepKey);if(retained)return retained;
  const previousOffer=step=>offers.findLast(d=>d.details.stepKey===step.key&&d.ts<startOfDay(ts))?.ts;
  const waiting=step=>Math.max(step.readyAt,previousOffer(step)||0);
  return steps.sort((a,b)=>Number(previousOffer(a)!=null)-Number(previousOffer(b)!=null)||waiting(a)-waiting(b)||EXMAP[a.id].order_in_tier-EXMAP[b.id].order_in_tier||a.id.localeCompare(b.id))[0]||null;
}
function rememberProgramUpgrade(ts=now()){
  const step=selectedProgramUpgrade(ts);if(!step||step.performed)return;
  const key='upgrade:'+startOfDay(ts)+':'+step.key;if(state.decisionLog.some(d=>d.key===key))return;
  recordDecision('upgrade_scheduled','Выбран следующий шаг на этот день: '+EXMAP[step.id].name,{exerciseId:step.id,stepKey:step.key,dose:step.dose,kind:step.kind,blocks:step.blocks},ts,key);
  localStorage.setItem(KEY,JSON.stringify(state));
}
function upgradeWaitReason(ex,ts=now()){
  if(unprescribedFrequency(ex)&&state.additionalPlan?.closedAt==null&&state.additionalPlan?.endedAt==null&&state.additionalPlan?.targets[ex.id])return 'Продолжаем оставшийся объём начатого занятия; новую дозу выберем для следующего занятия';
  if(homeReturns(ts).length)return 'Сначала возвращаем прежний домашний объём. Новые варианты, объём и частота ждут окончания возврата';
  const adherence=progressionAdherence(ts);if(!adherence.allowed)return adherence.reason;
  const step=selectedProgramUpgrade(ts);
  if(step&&step.id!==ex.id)return `${step.performed?'Сегодня уже выполнена проба':'На этот день выбрана проба'}: ${EXMAP[step.id].name} · ${doseText(EXMAP[step.id],step.dose)}${step.blocks?' · до '+step.blocks+' блоков за день':''}. Здесь сохраняем рабочий объём; очередь пересматривается в следующий тренировочный день после оценки восстановления`;
  const current=currentSymptoms(ts);
  if(safetyFlag(ts)||current&&(responseLevel(current)!=='normal'||current.fatigue==='high'||current.generalFatigue==='high'))return 'Новое повышение ждёт нормального самочувствия и восстановления после отмеченной усталости или реакции';
  if(unprescribedFrequency(ex))return 'Новое повышение ждёт следующего дополнительного занятия по расписанию';
  const last=state.logs.filter(l=>l.ts<=ts&&(l.variantProbe||l.transitionFrom||l.frequencyBlocks||l.doseReason==='trial')).sort((a,b)=>a.ts-b.ts).at(-1);
  return last&&!morningFor(last,ts)?'Новый шаг пока не выбран: нужна известная нормальная реакция после предыдущей пробы. Здесь сохраняем рабочий объём':'Новый шаг сейчас не выбран; продолжаем установленный рабочий объём';
}
function strengthCadence(ts=now()){
  const ids=['single_leg_calf_raise','weighted_calf_raise'],logs=state.logs.filter(l=>ids.includes(l.exerciseId)&&l.ts<=ts&&!l.additionalPlanPart&&l.actualDose&&(!EXMAP[l.exerciseId].dose.sides||l.actualDose.sides===EXMAP[l.exerciseId].dose.sides)&&(!EXMAP[l.exerciseId].dose.protocol_id||l.actualDose.protocol_id===EXMAP[l.exerciseId].dose.protocol_id)).sort((a,b)=>a.ts-b.ts);
  if(!logs.length)return {limit:3,freeze:true,initial:null};
  const first=logs[0],initial=first.actualDose,known=[];
  for(const l of logs.filter(l=>sameDose(l.actualDose,initial)&&confirmedSafe(l,ts)&&l.difficulty!=='hard'))if(!known.some(k=>startOfDay(k.ts)===startOfDay(l.ts)))known.push(l);
  const introEnd=trainingDayOffset(startOfDay(first.ts),7),second=known[1],expansionStart=second?Math.max(introEnd,nextDayStart(morningFor(second,ts)?.ts||nextDayStart(second.ts))):Infinity;
  const expansion=known.filter(l=>l.ts>=expansionStart);
  const fullWeek=expansion.some(l=>expansion.filter(k=>k.ts<=l.ts&&k.ts>=trainingDayOffset(startOfDay(l.ts),-6)).length>=3);
  return {limit:ts<expansionStart?2:3,freeze:ts<trainingDayOffset(expansionStart,7)||!fullWeek,initial};
}
function suggestedDose(ex,ts=now(),select=true){
  const progress=exerciseProgress(ex,ts),working=progress.working,key=doseKey(ex),last=progress.logs.at(-1),adherence=progressionAdherence(ts);
  const returning=homeReturnState(ex,ts,progress);
  if(returning){
    const plan=dailyLoadPlan(ex,ts),step=select?selectedProgramUpgrade(ts):null;
    const trial=returning.ready&&plan.status==='normal'&&!progressionHeld(ts)&&(!select||step?.id===ex.id&&step.kind==='return'&&!step.performed)?returning.next:null;
    const adverse=lastAdverseExercise(ex,ts),dose=plan.status==='light'&&!adverse?.returnStep?reduceDose(ex,returning.dose):returning.dose;
    return {dose,working,confirmed:true,confirmedDays:3,trial,returning,evidence:returning.evidence,doseFromTest:returning.doseFromTest,reason:plan.status!=='normal'?plan.reason:returning.reason,status:plan.status};
  }
  let dose={...working},reason=progress.confirmed?'Рабочий объём подтверждён в разные дни':'Начальный рабочий объём — уточняем переносимость',trial=null;
  const adverse=lastAdverseExercise(ex,ts),recovering=adverse&&!recoveredAfter(progress,adverse,ts),plan=dailyLoadPlan(ex,ts);
  if(recovering){
    const after=progress.logs.filter(l=>l.ts>adverse.ts&&l.doseReason!=='time').at(-1);
    dose=after&&responseLevel(exerciseResponse(after,ts))==='normal'?{...after.actualDose}:adverse.variantProbe||['trial','calibration','test'].includes(adverse.doseReason)?{...working}:reduceDose(ex,adverse.actualDose||working,adverse.limitCause);
    const option=doseOptions[ex.id];
    if(adverse.technique==='poor'&&option?.key==='support'&&!adverse.variantProbe){const index=option.values.findIndex(([v])=>v===(dose.support||option.values[0][0]));if(index>0)dose={...working,support:option.values[index-1][0]};}
    reason='Проверяем меньший объём после реакции или выполнения без запаса'+(unprescribedFrequency(ex)?'':'; частота сохраняется');
  }else if(progress.candidate){dose={...progress.candidate};reason=`Продолжаем выбранную пробу: ${progress.candidateDays}/3 подтверждений в разные дни`;}
  if(plan.status==='light'){if(!recovering)dose=reduceDose(ex,dose);reason=plan.reason;}
  if(plan.status==='pause')reason=plan.reason;
  const required=progressConfirmations(ex,progress.confirmed),recent=progress.run.filter(l=>ts-l.ts<=30*DAY).slice(-required);
  const suitable=l=>strengthExercise(ex)||ex.progression?.type==='pogo_ladder'?confirmedSafe(l,ts)&&l.difficulty!=='hard'&&l.technique==='good'&&l.fatigue!=='high':confirmedEasy(l,ts);
  const ramp=homeRamp(ex,progress,ts);
  if(key&&progress.confirmed&&!progress.candidate&&recent.length===required&&recent.every(suitable)&&sameDose(dose,working)&&ramp.complete&&plan.status==='normal'&&!safetyFlag(ts)&&ex.progression?.type!=='none'){
    const option=doseOptions[ex.id],index=option?option.values.findIndex(v=>v[0]===(dose[option.key]||option.values[0][0])):-1,ceiling=doseCeiling(ex,working,ts),step=ex.progression?.step||(key==='target_sec'?2:1);
    if(ex.progression?.type==='unlock_next'&&dose[key]>=ex.dose[key])reason=nextVariant(ex,ts,false)?'Обычная линия освоена: выбрана отдельная проба ходьбы на носках по указанию реабилитолога':'Сохраняем освоенную обычную линию. Переход на носки ждёт восстановления или следующего выполнения';
    else if(ex.progression?.type==='calf_strength'&&dose.reps>=12&&dose.sets===2)trial={...dose,reps:8,sets:3};
    else if(ex.progression?.type==='weighted_strength'&&dose.reps>=12)trial={...dose,reps:8,weight_kg:String(Number(dose.weight_kg||1)+1)};
    else if(ex.progression?.type==='pogo_ladder'&&dose.reps<10)trial={...dose,reps:dose.reps<8?8:10};
    else if(ex.progression?.type==='reduce_support'&&dose.cycles>=5&&index<option.values.length-1)trial={...dose,support:option.values[index+1][0],cycles:3};
    else if(option&&!['weight_distribution','support','weight_kg'].includes(option.key)&&dose[key]>=ceiling&&index<option.values.length-1)trial={...dose,[option.key]:option.values[index+1][0],[key]:ex.progression.probe_reps||dose[key]};
    else if(option?.key==='support'&&ex.id==='assisted_single_leg_calf_raise'&&dose[key]>=ceiling&&index<option.values.length-1)trial={...dose,support:option.values[index+1][0]};
    else if(dose[key]<ceiling)trial={...dose,[key]:Math.min(ceiling,dose[key]+step)};
    else reason='Короткая задача освоена. Сохраняем для практики; следующую развиваемую задачу выбирает программа';
    if(trial)reason='Выбрана отдельная проба для следующего планового выполнения';
    if(trial&&(!adherence.allowed||homeReturns(ts).length||progressionHeld(ts))){trial=null;reason=homeReturns(ts).length?'Сначала заканчиваем возврат прежнего домашнего объёма':progressionHeld(ts)?'Повышение ждёт проверки реакции следующим утром':adherence.reason;}
  }
  if(ex.progression?.type==='weighted_strength'&&!recovering&&!progress.candidate&&last?.actualDose.reps===8&&last.actualDose.sets===3&&confirmedEasy(last,ts)&&adherence.allowed&&plan.status==='normal'){
    const base=exerciseProgress(EXMAP.single_leg_calf_raise,ts);
    if(base.achievements.some(a=>a.dose.reps>=12&&a.dose.sets>=3)){trial={...last.actualDose,reps:12};reason='Лёгкая проба груза перенесена. Возвращаем освоенные 3×12 с тем же грузом';}
  }
  if(['calf_strength','weighted_strength'].includes(ex.progression?.type)){
    const cadence=strengthCadence(ts);
    if(cadence.freeze){trial=null;if(cadence.initial&&sameConditions(dose,cadence.initial)&&doseVolume(dose)>doseVolume(cadence.initial))dose={...cadence.initial};reason='Закрепляем частоту силовой работы: два вводных занятия, затем неделя до трёх на прежней дозе';}
  }
  const evidence=testDoseEvidence(ex,ts);let doseFromTest=false;
  if(evidence&&key&&evidence.capacity>0){
    const {log,capacity}=evidence;
    if(capacity<dose[key]&&!progress.logs.some(l=>l.ts>log.ts&&confirmedSafe(l,ts))){const probe=ex.progression?.test_probe||reduceDose(ex,dose);dose={...dose,...probe,[key]:Math.max(1,Math.min(probe[key],Math.floor(capacity)-1))};reason='Результат теста ниже рабочего объёма: проверяем меньшую дозу';trial=null;doseFromTest=true;}
    if(trial&&log.ts>recent.at(-1)?.ts&&!testSupportsProgression(evidence,ts)){trial=null;reason='Перед повышением нужна известная нормальная реакция следующим утром после теста';}
  }
  const reentry=!!last&&ts-last.ts>30*DAY&&ex.progression?.type!=='none';
  if(reentry){dose=doseVolume(ex.dose)<doseVolume(working)?{...ex.dose}:reduceDose(ex,working,'sets');trial=null;reason='После перерыва начинаем с небольшой пробы. Прежний посильный уровень сохранён в истории';}
  if(!unprescribedFrequency(ex)&&!recovering&&plan.status==='normal'){
    const transitioning=progress.confirmed&&progress.transition&&!ramp.complete,target=trial||progress.candidate||(transitioning?working:null),limit=trial||progress.candidate?1:select&&ramp.adopted&&selectedProgramUpgrade(ts)?.id!==ex.id?ramp.adopted:ramp.limit;
    if(target){
      const used=progress.logs.filter(l=>l.ts>=startOfDay(ts)&&sameDose(l.actualDose,target)).length;
      if(used>=limit){dose={...(ramp.from||working)};trial=null;reason='Новая доза на сегодня уже проверена. Остальные домашние блоки — прежние';}
      else if(transitioning&&!trial&&!progress.candidate){dose={...working};reason=limit===ramp.adopted&&ramp.limit>limit?`Сохраняем новую дозу в ${limit} блоке дня; расширение частоты ждёт выбранного шага программы`:`Расширяем переносимую новую дозу: до ${limit} блоков за день. Следующее повышение после нормального утра полного дня`;}
    }
  }
  if(select&&trial&&selectedProgramUpgrade(ts)?.id!==ex.id){trial=null;reason=upgradeWaitReason(ex,ts);}
  const confirmedDays=sameDose(dose,working)?progress.confirmedDays:Math.min(3,progress.candidateRun.length);
  if(unprescribedFrequency(ex)&&state.additionalPlan?.closedAt==null&&state.additionalPlan?.endedAt==null&&state.additionalPlan?.targets[ex.id])trial=null;
  return {dose,working,confirmed:progress.confirmed,confirmedDays,trial,reentry,doseFromTest,evidence,reason,status:plan.status};
}
function exerciseChangeNotice(ex,dose,ts=now(),fromId=null){
  if(!dose||!ex.dose)return null;
  const progress=exerciseProgress(ex,ts),step=selectedProgramUpgrade(ts),selected=step?.id===ex.id&&sameDose(step.dose,dose)?step:null;
  fromId=fromId||selected?.fromId||null;
  const kind=selected?.kind==='frequency'?'frequency':fromId?'variant':!sameDose(dose,progress.working)&&forwardDose(ex,dose,progress.working)?'dose':isNewPractice(ex,ts)?'new':null;
  const key=kind?upgradeKey({id:ex.id,dose,kind,blocks:selected?.blocks}):null;
  const previous=state.logs.filter(l=>l.exerciseId===ex.id&&l.ts<=ts&&l.changeNotice).sort((a,b)=>a.ts-b.ts).at(-1)?.changeNotice;
  let change=previous&&sameDose(previous.target,dose)&&(!kind||previous.key===key)?previous:null;
  if(!change&&kind){
    const from=fromId?exerciseProgress(EXMAP[fromId],ts).working:progress.working;
    const text=kind==='frequency'?`Теперь до ${selected.blocks} блоков новой дозы за день`:kind==='variant'?`${EXMAP[fromId].name} → ${ex.name}. Новый объём: ${doseText(ex,dose)}`:kind==='new'?`Новое упражнение: ${doseText(ex,dose)}`:`${doseText(ex,from)} → ${doseText(ex,dose)}`;
    change={key,kind,target:{...dose},startedAt:ts,text};
  }
  if(!change)return null;
  const completed=state.logs.filter(l=>l.exerciseId===ex.id&&l.ts>=change.startedAt&&l.ts<=ts&&!l.additionalPlanPart&&l.actualDose&&sameDose(l.actualDose,change.target)).length;
  return completed<5?{...change,completed,next:completed+1}:null;
}
function changeNoticeHTML(change){
  return change?`<div class="change-notice"><span class="change-badge">✦ Изменение · ${change.next}/5</span><div>${esc(change.text)}</div><small>Напоминание на первые пять выполнений. Проверь вариант и объём.</small></div>`:'';
}
function syncProgram(ts=now()){
  const calf=EXMAP.single_leg_calf_raise,evidence=testDoseEvidence(calf,ts),m=evidence&&morningFor(evidence.log,ts),session=evidence&&state.assessment_sessions.find(s=>s.test_log_ids.includes(evidence.log.id));
  if(state.exerciseStatuses[calf.id]==='available'&&evidence?.capacity>=10&&m?.historyKnown&&!m.historyWorse&&responseLevel(m)==='normal'&&(evidence.log.pain_after??session?.pain_after)<=1)state.exerciseStatuses[calf.id]='active';
  for(const id of ['right_leg_balance_left_front_back','single_leg_calf_raise']){
    const next=nextVariant(EXMAP[id],ts);if(next&&state.exerciseStatuses[next.ex.id]==='available')state.exerciseStatuses[next.ex.id]='active';
  }
  if(currentStage().order>=1&&impactDoseConfirmed('hop_to_stabilization',5,ts)&&state.exerciseStatuses.bilateral_pogo==='available')state.exerciseStatuses.bilateral_pogo='active';
}
function staticMaintenanceFrom(ts=now()){
  const ex=EXMAP.bilateral_tiptoe_static,p=exerciseProgress(ex,ts);
  if(!p.confirmed||p.working.reps<10||(p.working.weight_distribution||'even')!=='even'||!homeRamp(ex,p,ts).complete)return Infinity;
  const strength=exerciseProgress(EXMAP.single_leg_calf_raise,ts),sessions=strength.logs.filter(l=>l.actualDose.sets>=2&&l.actualDose.reps>=5&&confirmedSafe(l,ts)&&l.difficulty!=='hard');
  const days=[...new Set(sessions.map(l=>startOfDay(l.ts)))];if(days.length<3)return Infinity;
  const fullDays=new Map();for(const l of p.logs.filter(l=>l.actualDose.reps>=10&&confirmedSafe(l,ts))){const day=startOfDay(l.ts);fullDays.set(day,(fullDays.get(day)||0)+1);}
  const full=[...fullDays].find(([,n])=>n>=3);if(!full)return Infinity;
  const holdMorning=Math.max(...p.logs.filter(l=>startOfDay(l.ts)===full[0]).map(l=>morningFor(l,ts)?.ts||0)),strengthMorning=morningFor(sessions.find(l=>startOfDay(l.ts)===days[2]),ts)?.ts||0;
  return nextDayStart(Math.max(holdMorning,strengthMorning));
}
