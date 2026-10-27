'use strict';

function recordExercise(id,dose,response,ts=now(),suggested=suggestedDose(EXMAP[id],ts).dose,offered=null){
  return withHistoryCache(()=>{
  const ex=EXMAP[id],fields=doseFields[ex?.dose?.type]||[];
  if(!ex||fields.some(([k])=>!Number.isInteger(dose[k])||dose[k]<1||dose[k]>10000))throw new Error('Проверь фактически выполненный объём');
  const option=doseOptions[id];
  if(option?.key==='weight_kg'){if(!Number.isFinite(Number(dose.weight_kg))||Number(dose.weight_kg)<=0)throw new Error('Укажи фактический положительный вес груза');}
  else if(option&&dose[option.key]&&!option.values.some(v=>v[0]===dose[option.key]))throw new Error('Проверь вариант упражнения');
  const actualDose={...ex.dose,...Object.fromEntries(fields.map(([k])=>[k,dose[k]])),...(option&&dose[option.key]?{[option.key]:dose[option.key]}:{})};
  const log={id:makeId('l'),exerciseId:id,ts,...response,actualDose,rulesVersion:RULES_VERSION,suggestedDose:{...suggested},
    doseFactor:doseVolume(actualDose)/doseVolume(ex.dose||{}),doseReason:response.doseReason||'capacity',sameDay:null,nextDay:null};
  const progress=exerciseProgress(ex,ts),upgrade=selectedProgramUpgrade(ts),change=exerciseChangeNotice(ex,actualDose,ts,response.transitionFrom);
  const returning=homeReturnState(ex,ts,progress);
  if(returning&&sameConditions(actualDose,returning.goal)&&doseVolume(actualDose)<=doseVolume(returning.goal)){
    log.returnGoal={...returning.goal};log.returnFrom={...returning.dose};if(!['time','daily_load'].includes(log.doseReason))log.doseReason='return';
    log.returnStep=forwardDose(ex,actualDose,returning.dose);
    log.returnBlocked=log.returnStep&&(!returning.ready||dailyLoadPlan(ex,ts).status!=='normal'||upgrade?.id!==id||upgrade.kind!=='return'||upgrade.performed);
  }
  if(change)log.changeNotice={key:change.key,kind:change.kind,target:change.target,startedAt:change.startedAt,text:change.text};
  if(upgrade?.kind==='frequency'&&upgrade.id===id&&sameDose(actualDose,upgrade.dose))log.frequencyBlocks=upgrade.blocks;
  if(progress.confirmed&&sameDose(actualDose,progress.working)&&!log.frequencyBlocks&&!log.transitionFrom){
    if(!unprescribedFrequency(ex)&&['capacity','trial'].includes(log.doseReason))log.suggestedDose={...progress.working};
    if(log.doseReason==='trial')log.doseReason='capacity';
  }
  log.variantProbe=!log.returnGoal&&progress.confirmed&&(!sameConditions(actualDose,progress.working)||doseVolume(actualDose)>doseVolume(progress.working));
  const adverse=lastAdverseExercise(ex,ts),continuing=progress.logs.some(l=>l.ts>(adverse?.ts||0)&&ts-l.ts<=30*DAY&&sameDose(l.actualDose,actualDose)&&(l.variantProbe||l.transitionFrom||l.doseReason==='trial'));
  log.programChange=!!(log.returnStep||log.frequencyBlocks||(log.variantProbe||log.transitionFrom||log.doseReason==='trial')&&!continuing);
  if(!log.limitCause)log.limitCause=actualDose.sets<suggested.sets&&actualDose[doseKey(ex)]===suggested[doseKey(ex)]?'sets':'unknown';
  settleAdditionalPlan(ts);
  const currentPlan=autoAdditionalPlan(ts);let preview=currentPlan;
  if(offered?.status==='ready'){
    if(currentPlan.status==='ready')preview={...currentPlan,targets:Object.fromEntries(Object.entries(offered.targets).filter(([id,dose])=>currentPlan.targets[id]&&sameConditions(dose,currentPlan.targets[id])).map(([id,dose])=>[id,doseVolume(dose)<=doseVolume(currentPlan.targets[id])?dose:currentPlan.targets[id]]))};
    else if(currentPlan.status==='feedback'&&offered.day!==startOfDay(ts)&&offered.evidenceStamp===planningEvidenceStamp())preview=offered;
  }
  if(unprescribedFrequency(ex)&&!['ongoing','waiting','recovery'].includes(currentPlan.status)&&preview.status==='ready'&&preview.targets[id]){
    const created=startAdditionalPlan(Object.keys(preview.targets),ts,preview.targets,preview);
    created.source='automatic';created.planningDay=preview.day;created.reasons={...preview.reasons};
    created.trialIds=preview.trialIds||[];
  }
  const plan=state.additionalPlan;
  if(plan&&plan.closedAt==null&&plan.endedAt==null&&plan.startedAt<=ts&&plan.targets[id]){
    log.additionalPlanId=plan.id;
    if(plan.trialIds?.includes(id)&&sameDose(actualDose,plan.targets[id])&&!response.doseReason)log.doseReason='trial';
    if(state.logs.some(l=>l.additionalPlanId===plan.id&&l.exerciseId===id&&l.ts<=ts))log.additionalPlanPart=true;
    const entry=recordedAdditionalState(ex,ts);
    if(response.fatigue!=='medium'&&!['time','planned_remainder'].includes(log.doseReason)&&doseVolume(actualDose)<entry.remaining){
      plan.itemStops={...plan.itemStops,[id]:'Выполнение закончено с меньшим объёмом. Остаток не нужно наверстывать'};
      recordDecision('item_stopped',plan.itemStops[id],{planId:plan.id,exerciseId:id,original:plan.targets[id],actual:actualDose},ts);
    }
  }
  ensureDailyPlan(ts);
  state.logs.push(log);historyCache.values.clear();addXp(ex,log);maybeAddDelayedCheck(log);
  if(log.returnStep)recordDecision('return_step','Возвращаем прежнюю дозу; остальные домашние группы сохраняют свой объём',{logId:log.id,exerciseId:id,from:log.returnFrom,actual:actualDose,goal:log.returnGoal,blocked:log.returnBlocked},ts);
  else if(log.doseReason==='trial'||log.variantProbe)recordDecision('trial_started','Записана отдельная проба; прежний рабочий уровень сохранён',{logId:log.id,exerciseId:id,offered:suggested,actual:actualDose},ts);
  settleAdditionalPlan(ts);
  return log;
  });
}
function activeExercises(){ return EX.filter(x=>state.exerciseStatuses[x.id]==='active'); }
function logsToday(){ return state.logs.filter(l=>l.ts>=startOfDay()); }
function customToday(){ return state.customActivities.filter(l=>l.ts>=startOfDay()); }
function allLoadEvents(){
  const exEvents = state.logs.map(l => {
    const ex=EXMAP[l.exerciseId]; if(!ex)return null;
    const factor = l.doseFactor ?? 1;
    const load={};
    for(const k of Object.keys(APP.fatigue_channels)) load[k]=(ex.load_channels?.[k]||0)*45*factor;
    return {id:'load_'+l.id,timestamp:l.ts,channels:load,source_type:'exercise',source_id:l.id,exerciseId:l.exerciseId};
  }).filter(Boolean);
  const cEvents = state.customActivities.map(a=>({id:'load_'+a.id,timestamp:a.ts,channels:a.load||{},source_type:'custom_activity',source_id:a.id}));
  // Existing exercise/custom events stay derived from their original logs; test events are persisted.
  return [...exEvents,...cEvents,...state.load_events];
}
function exposureEvents(ts=now()){
  const rows=[],conditions=d=>JSON.stringify(Object.fromEntries(['support','range','weight_distribution','resistance','weight_kg','equipment','tempo','protocol_id','sides'].map(k=>[k,d[k]??null])));
  const unit=d=>['duration','duration_sets','hold_reps','cycles'].includes(d.type)?'сек':d.type==='steps'?'шагов':d.type==='directional_rounds'?'направлений':'повторений';
  for(const l of state.logs.filter(l=>l.ts<=ts&&l.actualDose)){
    const ex=EXMAP[l.exerciseId];if(!ex)continue;
    const sides=l.actualDose.sides===2?['left','right']:[ex.id==='single_leg_calf_raise'||ex.id==='assisted_single_leg_calf_raise'?'right':'both'];
    for(const side of sides)rows.push({sourceId:l.id,ts:l.ts,movement:ex.id,side,conditions:conditions(l.actualDose),unit:unit(l.actualDose),quantity:doseVolume(l.actualDose)/sides.length});
  }
  for(const t of RDCFG.tests){
    for(const l of testHistory(t).filter(l=>l.ts<=ts)){
      const ex=EXMAP[t.dose_exercise_id],keys=t.bilateral?['left','right']:['value'];
      for(const key of keys)rows.push({sourceId:l.id,ts:l.ts,movement:ex?.id||'test:'+t.id,side:key==='value'?'both':key,conditions:ex&&(!l.conditions||l.conditions==='standard')?conditions(ex.dose):l.conditions||t.protocol_id,unit:ex?unit(ex.dose):t.metric==='errors_per_30s'?'сек':t.unit_short,quantity:t.metric==='errors_per_30s'?30:l[key]});
    }
  }
  for(const a of state.customActivities.filter(a=>a.ts<=ts))rows.push({sourceId:a.id,ts:a.ts,movement:a.running?'run:'+a.running.mode:'activity:'+a.presetId,side:'both',conditions:a.running?.surface||'usual',unit:'мин',quantity:a.running?.runMinutes||a.minutes});
  return rows;
}
function exposureSummary(ts=now(),since=startOfDay(ts)){
  const totals=new Map();
  for(const row of exposureEvents(ts).filter(r=>r.ts>=since)){
    const key=JSON.stringify([row.movement,row.side,row.conditions,row.unit]);
    const old=totals.get(key);totals.set(key,{...row,quantity:(old?.quantity||0)+row.quantity,sources:[...(old?.sources||[]),row.sourceId]});
  }
  return [...totals.values()];
}
function fatigueAt(ts=now()){
  return historyValue('fatigue:'+ts,()=>{
  const out={}; Object.keys(APP.fatigue_channels).forEach(k=>out[k]=0);
  for(const ev of allLoadEvents()){
    if(ev.timestamp>ts) continue;
    const hours=(ts-ev.timestamp)/3600000;
    for(const [k,cfg] of Object.entries(APP.fatigue_channels)){
      const val=ev.channels?.[k]||0;
      out[k]+=val*Math.pow(0.5,hours/cfg.decay_half_life_hours);
    }
  }
  for(const k in out) out[k]=Math.min(100,out[k]);
  return out;
  });
}
function relevantFatigue(ex,ts=now()){
  const f=fatigueAt(ts), loads=ex.load_channels||{};
  let num=0,den=0;
  for(const k of Object.keys(APP.fatigue_channels)){ const w=loads[k]||0; num+=w*(f[k]||0); den+=w; }
  const demand=clamp(Math.max(0,...Object.values(loads))/APP.scheduler.fatigue_demand_reference);
  return den?num/den*demand:0;
}
function makeId(prefix){return prefix+Math.random().toString(36).slice(2);}
function reactionEntries(ts=now()){
  return historyValue('reactions:'+ts,()=>[
    ...reportedSymptoms(ts).filter(r=>r.sourceLogId).map(r=>({...r,source_type:'symptoms',instability:r.steadiness==='giving_way',normal:responseLevel(r)==='normal'})),
    ...state.logs.filter(l=>l.ts<=ts).map(l=>({source_type:'exercise',ts:l.ts,pain:Math.max(l.painDuring||0,l.painAfter||0),swelling:l.swelling,instability:l.instability||l.steadiness==='giving_way',worse:l.sameDay==='worse'||l.nextDay==='worse',normal:!observationsFor(l,ts).length&&l.nextDay&&isSuccessful(l,ts)})),
    ...state.customActivities.map(a=>({ts:a.ts,pain:a.painAfter||0,worse:a.response==='worse',swelling:a.swelling,instability:a.instability,normal:false})),
    ...state.testLogs.filter(l=>l.pain_after!=null).map(l=>({ts:l.ts,pain:l.pain_after,normal:false,source_type:'test'})),
    ...state.symptomReports.map(r=>({...r,source_type:'symptoms',instability:r.steadiness==='giving_way',normal:responseLevel(r)==='normal'})),
    ...state.assessment_sessions.filter(s=>s.pain_after!=null).map(s=>({ts:s.reaction_at||s.completed_at||sessionLastAt(s),pain:s.pain_after,swelling:s.swelling,instability:s.instability,worse:s.same_day_response==='worse'||s.next_day_response==='worse',normal:s.next_day_response&&s.next_day_response!=='worse'&&s.same_day_response!=='worse'&&s.pain_after<=2&&!s.swelling&&!s.instability}))
  ].filter(r=>r.ts<=ts).sort((a,b)=>a.ts-b.ts));
}
function safetyFlag(ts=now()){
  let flagged=false;
  for(const r of reactionEntries(ts)){
    if(r.pain>=APP.assessment.safety_pain_from||r.swelling||r.instability)flagged=true;
    else if(r.normal)flagged=false;
  }
  return flagged;
}
function assessmentSymptomModifier(ex,ts=now()){
  const demand=Math.max(0,...Object.values(ex.load_channels||{}));
  if(safetyFlag(ts))return demand>=.5?0:.55;
  // Use the latest reported response per channel. A normal follow-up resolves an older reaction.
  let modifier=1;
  for(const k of Object.keys(APP.fatigue_channels)){
    if((ex.load_channels?.[k]||0)<.25)continue;
    const s=state.assessment_sessions.filter(s=>s.pain_after!=null&&(s.reaction_at||sessionLastAt(s))<=ts&&(s.aggregate_load[k]||0)>0).sort((a,b)=>(a.reaction_at||sessionLastAt(a))-(b.reaction_at||sessionLastAt(b))).slice(-1)[0];
    const followup=currentSymptoms(ts),resolved=followup&&followup.ts>(s?.reaction_at||s?.completed_at||0)&&responseLevel(followup)==='normal';
    if(s&&!resolved&&(s.pain_after>=APP.assessment.moderate_pain_from||s.same_day_response==='worse'||s.next_day_response==='worse'))modifier=Math.min(modifier,APP.assessment.reaction_modifier);
  }
  return modifier;
}
