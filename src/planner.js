'use strict';

function recordedAdditionalState(ex,ts=now()){
  const plan=state.additionalPlan,targetDose=plan?.targets[ex.id];
  if(!plan||plan.startedAt>ts||plan.closedAt!=null||!targetDose)return {status:'unplanned',reason:'Это упражнение не входит в текущее дополнительное занятие'};
  const logs=state.logs.filter(l=>l.additionalPlanId===plan.id&&l.exerciseId===ex.id&&l.ts>=plan.startedAt&&l.ts<=ts);
  const valid=l=>l.actualDose?.type===targetDose.type&&(doseFields[targetDose.type]||[]).every(([key])=>Number.isInteger(l.actualDose[key])&&l.actualDose[key]>=1)&&Number.isFinite(doseVolume(l.actualDose))&&doseVolume(l.actualDose)>0;
  const target=Math.min(doseVolume(targetDose),plan.limits?.[ex.id]??Infinity),used=logs.filter(l=>valid(l)&&sameConditions(l.actualDose,targetDose)).reduce((sum,l)=>sum+doseVolume(l.actualDose),0),remaining=Math.max(0,target-used);
  const common={target,used,remaining,targetDose,originalTarget:doseVolume(targetDose)};
  if(logs.some(l=>!valid(l)))return {...common,status:'uncertain',reason:'Объём одного выполнения неизвестен или записан в других единицах. Остаток не предлагаем; занятие можно завершить без наверстывания'};
  if(state.exerciseStatuses[ex.id]!=='active')return {...common,status:'stopped',reason:'Упражнение убрано из активных. Его остаток не переносим в другой вариант'};
  if(logs.some(l=>!sameConditions(l.actualDose,targetDose)))return {...common,status:'stopped',reason:'Условия упражнения изменились. Проба прежнего варианта закончена; его остаток не переносим'};
  if(!remaining)return {...common,status:'complete',reason:`Выбранный объём занятия выполнен: ${doseText(ex,targetDose)}. Новое выполнение автоматически не назначаем`};
  if(plan.itemStops?.[ex.id])return {...common,status:'stopped',reason:plan.itemStops[ex.id]};
  if(logs.some(l=>!['normal','hold'].includes(loadResponseLevel(exerciseResponse(l,ts)))||l.difficulty==='hard'||l.fatigue==='high'||l.technique==='poor'||!sameConditions(l.actualDose,targetDose)))return {...common,status:'stopped',reason:'Здесь проба закончена после реакции, потери качества или смены условий. Остаток не нужно наверстывать'};
  if(plan.endedAt!=null&&plan.endedAt<=ts)return {...common,status:'stopped',reason:plan.endedReason||'Занятие уже закончено. Изменение истории не назначает оставшийся объём повторно'};
  const dose=doseWithinVolume(ex,plan.remainingDoses?.[ex.id]||targetDose,remaining);
  return {...common,status:'remaining',dose,reason:used?`Остаток выбранного занятия: ${doseText(ex,dose)}; весь выбранный объём — ${doseText(ex,targetDose)}`:`Объём занятия: ${doseText(ex,targetDose)}. ${plan.reasons?.[ex.id]||'Следующее занятие предлагается отдельно по ритму программы'}`};
}
function additionalPlanEntries(ts=now()){
  return Object.keys(state.additionalPlan?.targets||{}).map(id=>({ex:EXMAP[id],...recordedAdditionalState(EXMAP[id],ts)}));
}
function startAdditionalPlan(ids,ts=now(),offered=null,context=null){
  if(additionalPlanEntries(ts).some(entry=>['remaining','uncertain'].includes(entry.status)))throw new Error('Сначала заверши текущее дополнительное занятие');
  const selected=[...new Set(ids)].map(id=>EXMAP[id]);
  if(!selected.length||selected.some(ex=>!ex||!unprescribedFrequency(ex)||state.exerciseStatuses[ex.id]!=='active'||!doseFields[ex.dose?.type]))throw new Error('Выбери активные дополнительные упражнения');
  const targets=Object.fromEntries(selected.map(ex=>[ex.id,{...(offered?.[ex.id]||suggestedDose(ex,ts).dose)}]));
  if(selected.some(ex=>targets[ex.id].type!==ex.dose.type||doseFields[ex.dose.type].some(([key])=>!Number.isInteger(targets[ex.id][key])||targets[ex.id][key]<1)))throw new Error('Проверь выбранный объём занятия');
  state.additionalPlan={id:makeId('p'),startedAt:ts,targets,closedAt:null,endedAt:null,source:context?'automatic':'manual',reasons:context?.reasons||{}};
  recordDecision('plan_selected',context?.reason||'Выбран конечный состав дополнительного занятия',{planId:state.additionalPlan.id,source:state.additionalPlan.source,targets,reasons:state.additionalPlan.reasons},ts);
  return state.additionalPlan;
}
function finishAdditionalPlan(ts=now()){
  if(state.additionalPlan&&state.additionalPlan.closedAt==null){state.additionalPlan.closedAt=ts;recordDecision('plan_closed','Занятие завершено вручную. Остаток не нужно наверстывать',{planId:state.additionalPlan.id},ts);}
}
function settleAdditionalPlan(ts){
  const plan=state.additionalPlan;
  if(!plan||plan.closedAt!=null||plan.endedAt!=null)return;
  const current=currentSymptoms(ts);
  if(current&&state.logs.some(l=>l.additionalPlanId===plan.id&&l.ts<=current.ts)){
    if(!['normal','hold'].includes(loadResponseLevel(current))||current.fatigue==='high'||['medium','high'].includes(current.generalFatigue)){
      endAdditionalPlan(plan,ts,'Дополнительное занятие закончено с выполненным объёмом после отмеченной усталости или ухудшения самочувствия. Остаток не нужно наверстывать');
      return;
    }
    if(current.fatigue==='medium'&&!plan.localFatigueAdjusted){
      plan.localFatigueAdjusted=ts;plan.limits={...plan.limits};plan.remainingDoses={...plan.remainingDoses};
      for(const entry of additionalPlanEntries(ts).filter(e=>e.status==='remaining')){
        const ex=entry.ex;
        // An already selected light slide can remain; unstable/calf work shares the fatigue.
        if(Math.max(...Object.values(ex.load_channels||{}))<.3)continue;
        const dose=reduceDose(ex,entry.dose),allowed=doseVolume(dose);
        plan.limits[ex.id]=Math.min(entry.target,entry.used+allowed);
        plan.remainingDoses[ex.id]=dose;
      }
      plan.adjustmentReason='Умеренная местная усталость: оставшаяся похожая работа уменьшена на один шаг; лёгкая работа сохранена';
      recordDecision('plan_reduced',plan.adjustmentReason,{planId:plan.id,original:plan.targets,limits:plan.limits,remainingDoses:plan.remainingDoses},ts,'local-fatigue:'+plan.id);
    }
  }
  const entries=additionalPlanEntries(ts);
  if(entries.every(entry=>['complete','stopped'].includes(entry.status)))endAdditionalPlan(plan,ts,entries.find(e=>e.status==='stopped')?.reason||plan.adjustmentReason||'На сегодня достаточно: выбранный объём выполнен. Остаток не нужно наверстывать');
}
function additionalLightState(current){return !!current&&(!['normal','hold'].includes(loadResponseLevel(current))||['medium','high'].includes(current.fatigue)||['medium','high'].includes(current.generalFatigue));}
function additionalPattern(ex){
  if(/^(balance_board|hemisphere)_both_tiptoe_/.test(ex.id))return 'unstable_balance';
  if(['tiptoe_sidewalk_ball_reaction','tiptoe_sidewalk_cone_reach'].includes(ex.id))return 'lateral_tiptoe';
  return ex.id;
}
function trainingDayOffset(day,n){const d=new Date(day);d.setDate(d.getDate()+n);return +d;}
function additionalTrainingDays(ts=now()){
  return [...new Set(state.logs.filter(l=>l.ts<=ts&&EXMAP[l.exerciseId]&&unprescribedFrequency(EXMAP[l.exerciseId])).map(l=>startOfDay(l.ts)))].sort((a,b)=>a-b);
}
function additionalSessionDays(ts){
  const logs=state.logs.filter(l=>l.ts<=ts&&EXMAP[l.exerciseId]&&unprescribedFrequency(EXMAP[l.exerciseId])),sessions=new Map(),managedDays=new Set();
  for(const log of logs)if(log.additionalPlanId){const day=startOfDay(log.ts);managedDays.add(day);sessions.set(log.additionalPlanId,Math.max(day,sessions.get(log.additionalPlanId)||0));}
  for(const log of logs){const day=startOfDay(log.ts);if(!log.additionalPlanId&&!managedDays.has(day))sessions.set('legacy_'+day,day);}
  return [...sessions.values()].sort((a,b)=>a-b);
}
function additionalChoice(ex,ts=now(),selected=[],context=null){
  const goal=APP.program.additional_goals.find(g=>g.exercises.includes(ex.id));
  if(goal?.id==='calf_dynamic'){const preferred=['weighted_calf_raise','single_leg_calf_raise','assisted_single_leg_calf_raise','bilateral_calf_raise'].find(id=>state.exerciseStatuses[id]==='active');if(ex.id!==preferred)return {score:0,reason:'Силовую задачу выполняем одним выбранным вариантом'};}
  if(goal?.id==='landing'&&ex.id!==(impactDoseConfirmed('hop_to_stabilization',5,ts)?'bilateral_pogo':'hop_to_stabilization'))return {score:0,reason:'Ударную работу выполняем одной последовательной ступенью'};
  if(!goal||selected.some(other=>goal.exercises.includes(other.id))||(goal.min_stage||0)>currentStage().order||!exercisePermitted(ex,ts))return {score:0,reason:'Это направление сейчас не входит в задачи этапа'};
  const newTrial=isNewPractice(ex,ts)||!!suggestedDose(ex,ts).trial||suggestedDose(ex,ts).reentry;
  if(isNewPractice(ex,ts)&&selectedProgramUpgrade(ts)?.id!==ex.id)return {score:0,reason:'Первая проба этого задания ждёт выбранного шага программы'};
  if(newTrial&&selected.some(other=>isNewPractice(other,ts)||!!suggestedDose(other,ts).trial||suggestedDose(other,ts).reentry))return {score:0,reason:'В занятии уже есть одна новая проба'};
  const covered=context?.covered||new Set();
  if(covered.has(goal.id))return {score:0,reason:'Эта работа уже покрыта домашним планом или сегодняшним занятием'};
  const t=RDCFG.tests.find(t=>t.id===goal.test),log=t&&currentMeasurement(t,ts)?.log;
  let need=goal.baseline?1:0;
  if(log){
    const value=t.bilateral?Math.min(clamp(symmetry(t,log)),clamp(log.right/(t.target_injured_side_sec||t.reference_volume))):clamp(log.value/t.readiness_reference);
    need=Math.max(need,1-value);
  }
  // A low calf result prioritizes an already permitted calf task; it is not a diagnosis.
  const calf=RDCFG.tests.find(t=>t.id==='single_leg_calf_raise_test'),calfLog=currentMeasurement(calf,ts)?.log;
  if((ex.load_channels?.calf||0)>=.5&&calfLog)need+=1-clamp(calfLog.right/calf.reference_volume);
  if(need<=0)return {score:0,reason:'Нет отдельной задачи для ещё одного похожего упражнения'};
  const last=state.logs.filter(l=>l.exerciseId===ex.id&&l.ts<=ts).sort((a,b)=>a.ts-b.ts).at(-1);
  const quality=last&&(last.difficulty==='hard'||last.technique==='poor'||last.fatigue==='high')?.65:1;
  const reason=(log||calfLog&&need>0?'По измерениям есть повод потренировать задание. ':'Задача текущего этапа. ')+goal.label+'. '+(quality<1?'После выполнения без запаса используем меньшую пробу. ':'')+'Не добавляем другое упражнение с той же целью';
  const warmup=goal.id==='calf_dynamic'&&ts>=staticMaintenanceFrom(ts)?' Перед силовой частью один разминочный блок: 10 удержаний на двух носках по 5 секунд; это часть этого занятия.':'';
  return {score:need*quality*tolerance(ex,ts)*fatigueModifier(ex,ts)+(newTrial?.1:0),reason:reason+warmup,goal:goal.id};
}
function exercisePermitted(ex,ts=now()){
  if(!ex.unlock_stage)return true;
  if(currentStage().order<(RDCFG.stages.find(s=>s.id===ex.unlock_stage)?.order??Infinity)||stageTransition('ready_for_impact',ts).reasons.length)return false;
  return ex.id!=='bilateral_pogo'||impactDoseConfirmed('hop_to_stabilization',5,ts);
}
function isNewPractice(ex,ts){return (ex.new_protocol||ex.source==='assistant_suggested_disabled')&&!state.logs.some(l=>l.exerciseId===ex.id&&l.ts<=ts);}
function newExerciseSuggestion(ts=now()){
  if(homeReturns(ts).length||progressionHeld(ts)||!progressionAdherence(ts).allowed||additionalLightState(currentSymptoms(ts)))return null;
  const candidates=[[impactDoseConfirmed('hop_to_stabilization',5,ts)?'bilateral_pogo':'hop_to_stabilization',null]];
  for(const [id,baseId] of candidates){
    const ex=EXMAP[id];if(state.exerciseStatuses[id]!=='available'||!exercisePermitted(ex,ts))continue;
    const base=EXMAP[baseId],progress=base&&exerciseProgress(base,ts),key=base&&doseKey(base);
    if(base&&!(progress.confirmed&&progress.run.filter(l=>ts-l.ts<=30*DAY&&confirmedEasy(l,ts)).length>=3&&progress.working[key]>=(baseId==='bilateral_tiptoe_static'?base.dose[key]:doseCeiling(base,progress.working,ts))))continue;
    return ex;
  }
  const reach=EXMAP.single_leg_multidirectional_reach,test=RDCFG.tests.find(t=>t.id==='multidirectional_control_clean_rounds'),measurement=currentMeasurement(test,ts)?.log;
  if(state.exerciseStatuses[reach.id]==='available'&&measurement&&measurementScore(test,measurement)<.85)return reach;
  return null;
}
function additionalPracticeContext(ts){
  const covered=new Set(),day=startOfDay(ts);
  // Planned home work affects selection only. It never becomes a completion credit.
  const home=activeExercises().filter(ex=>!unprescribedFrequency(ex)&&dailyLoadPlan(ex,ts).status!=='pause');
  for(const goal of APP.program.additional_goals){
    if(home.some(ex=>goal.exercises.includes(ex.id))||state.logs.some(l=>l.ts>=day&&l.ts<=ts&&goal.exercises.includes(l.exerciseId)))covered.add(goal.id);
    if(exposureSummary(ts).some(row=>goal.exercises.includes(row.movement)&&row.quantity>=doseVolume(EXMAP[row.movement].dose)))covered.add(goal.id);
  }
  return {covered};
}
function planningEvidenceStamp(){return JSON.stringify([state.logs.length,state.testLogs.length,state.symptomReports.length,state.customActivities.length,state.testCorrections?.length||0,state.assessment_sessions.map(s=>[s.id,s.reaction_at,s.completed_at])]);}
function autoAdditionalPlan(ts=now()){
  const entries=additionalPlanEntries(ts),pending=state.additionalPlan?.closedAt==null&&state.additionalPlan?.endedAt==null&&entries.some(e=>['remaining','uncertain'].includes(e.status));
  if(pending)return {status:'ongoing',targets:state.additionalPlan.targets,reasons:state.additionalPlan.reasons||{},reason:'Продолжаем только оставшийся объём начатого занятия'};
  const empty={targets:{},reasons:{}};
  const active=activeExercises().filter(ex=>unprescribedFrequency(ex)&&doseFields[ex.dose?.type]);
  if(!active.length)return {...empty,status:'unavailable',reason:'Нет активных дополнительных упражнений'};
  const day=startOfDay(ts),days=additionalTrainingDays(ts),week=additionalSessionDays(ts).filter(d=>d>=trainingDayOffset(day,-6)),limit=state.exerciseStatuses.single_leg_calf_raise==='active'?strengthCadence(ts).limit:APP.program.clinician_session_defaults.recommended_sessions_per_week;
  const today=state.logs.filter(l=>l.ts>=day&&l.ts<=ts&&EXMAP[l.exerciseId]&&unprescribedFrequency(EXMAP[l.exerciseId]));
  const donePatterns=new Set(today.map(l=>additionalPattern(EXMAP[l.exerciseId])));
  const prior=state.additionalPlan,endedToday=prior&&(prior.endedAt!=null||prior.closedAt!=null)&&startOfDay(prior.closedAt??prior.endedAt)===day&&(startOfDay(prior.startedAt)===day||today.some(l=>l.additionalPlanId===prior.id));
  const previous=days.filter(d=>d<day),previousWeek=week.filter(d=>d<day);
  let dayEligibleAfter=previous.length?trainingDayOffset(previous.at(-1),2):day;
  if(previousWeek.length>=limit)dayEligibleAfter=Math.max(dayEligibleAfter,trainingDayOffset(previousWeek[previousWeek.length-limit],7));
  const continuingToday=today.length>0&&!endedToday&&dayEligibleAfter<=day;
  const last=days.at(-1);let after=last==null?day:trainingDayOffset(last,2);
  if(week.length>=limit)after=Math.max(after,trainingDayOffset(week[week.length-limit],7));
  const waiting={...empty,status:'waiting',after,reason:`Дополнительная работа уже учтена. Следующее занятие — не раньше ${fmtDate(after)} ${fmtTime(after)}: ритм приложения до ${limit} занятий за 7 дней, с днём между ними`};
  if(endedToday&&prior.endedReason)waiting.reason=prior.endedReason+'. '+waiting.reason;
  if(after>ts&&!continuingToday)return waiting;
  const current=currentSymptoms(ts);
  if(safetyFlag(ts)||current&&responseLevel(current)==='pause')return {...empty,status:'recovery',reason:'Дополнительное занятие ждёт повторной оценки после боли, отёка или нестабильности'};
  if(current&&(current.fatigue==='high'||['medium','high'].includes(current.generalFatigue)))return {...empty,status:'recovery',reason:'Сильная местная или общая усталость: дополнительное занятие сейчас не начинаем'};
  const morning=pendingMorningDays(ts).find(d=>nextDayStart(d)===day);
  if(morning!=null)return {...empty,status:'feedback',reason:'Перед новым дополнительным занятием нужна общая оценка восстановления после вчерашней нагрузки'};
  if(!current||startOfDay(current.ts)!==day)return {...empty,status:'feedback',reason:'Перед дополнительным занятием нужно знать сегодняшнее самочувствие'};
  const measurement=measurementPlan(ts),context=additionalPracticeContext(ts);
  const candidates=active.filter(ex=>!donePatterns.has(additionalPattern(ex))&&!postponedUntil('exercise',ex.id,ts)&&dailyLoadPlan(ex,ts).status!=='pause'&&!(measurement&&overlapsTest(measurement.test,ex.load_channels))&&exerciseAfterTestUntil(ex,ts)<=ts);
  const lastExtra=state.logs.filter(l=>l.ts<=ts&&EXMAP[l.exerciseId]&&unprescribedFrequency(EXMAP[l.exerciseId])).sort((a,b)=>a.ts-b.ts).at(-1);
  const delayed=lastExtra&&morningFor(lastExtra,ts),delayedCaution=delayed&&(delayed.historyWorse||!['normal','hold'].includes(loadResponseLevel(delayed))||delayed.fatigue==='high');
  const light=additionalLightState(current)||delayedCaution;
  const count=Math.max(0,(light?1:APP.program.clinician_session_defaults.exercises_per_session[0])-donePatterns.size),selected=[],reasons={},targets={},trialIds=[];
  if(!count)return waiting;
  while(selected.length<count){
    const available=candidates.filter(ex=>!selected.some(other=>additionalPattern(other)===additionalPattern(ex))).map(ex=>({ex,...additionalChoice(ex,ts,selected,context)})).filter(choice=>choice.score>0).sort((a,b)=>(light?Math.max(...Object.values(a.ex.load_channels))-Math.max(...Object.values(b.ex.load_channels)):0)||b.score-a.score||a.ex.id.localeCompare(b.ex.id));
    const choice=available[0];if(!choice||choice.score<=0)break;
    const suggested=suggestedDose(choice.ex,ts);
    selected.push(choice.ex);targets[choice.ex.id]=light&&suggested.status==='normal'?reduceDose(choice.ex,suggested.dose):{...suggested.trial||suggested.dose};
    if(suggested.trial||suggested.reentry||isNewPractice(choice.ex,ts))trialIds.push(choice.ex.id);
    reasons[choice.ex.id]=choice.reason+(delayedCaution?'. После прошлого занятия утром было хуже: следующая проба меньше. Причина реакции на суммарную нагрузку неизвестна':light?'. Сегодня меньше работы из-за отмеченной усталости или неполного восстановления':'');
  }
  if(!selected.length)return {...empty,status:'unavailable',reason:measurement?'Сначала запланированное измерение; дополнительную похожую работу подберём после него':candidates.length?'Зарегистрированная практика уже покрывает направления программы; новый объём сейчас не добавляем':'Дополнительные варианты сейчас ждут оценки, перерыва после теста или окончания отсрочки'};
  return {status:'ready',day,logCount:state.logs.length,evidenceStamp:planningEvidenceStamp(),targets,reasons,trialIds,reason:light?'Одно облегчённое направление с учётом сегодняшнего состояния':'Выбраны конкретные задачи этапа. Выполни указанный объём — на сегодня достаточно'};
}
function additionalPlanState(ex,ts=now()){
  const automatic=autoAdditionalPlan(ts),recorded=recordedAdditionalState(ex,ts);
  if(automatic.status==='ongoing')return recorded;
  if(automatic.status==='ready'&&automatic.targets[ex.id]){
    const targetDose=automatic.targets[ex.id],target=doseVolume(targetDose);
    return {status:'remaining',targetDose,target,used:0,remaining:target,dose:{...targetDose},automaticPreview:automatic,reason:`Объём занятия: ${doseText(ex,targetDose)}. ${automatic.reasons[ex.id]}`};
  }
  if(recorded.status!=='unplanned')return recorded;
  return {status:'unplanned',reason:automatic.status==='ready'?'В этом занятии подобраны другие направления; похожие варианты не добавляем сверху':automatic.reason};
}
function recommendedDose(ex,ts=now()){
  const suggested=suggestedDose(ex,ts),entry=unprescribedFrequency(ex)&&additionalPlanState(ex,ts);
  if(!unprescribedFrequency(ex)){
    const choice=homeVariantChoice(ex,ts),transition=choice.ex.id===ex.id&&choice.transition;
    return {...suggested,dose:suggested.trial||suggested.dose,selectedTrial:!!suggested.trial||!!transition,transitionFrom:transition?choice.base.id:null,
      reason:transition?'Выбрана отдельная проба после освоения обычной линии. Объём — по собственной истории ходьбы на носках; дневная цель общая':suggested.reason};
  }
  if(entry?.status!=='remaining')return suggested;
  if((entry.automaticPreview?.trialIds||state.additionalPlan?.trialIds||[]).includes(ex.id))return {...suggested,dose:entry.dose,reason:entry.reason+' · Отдельная небольшая проба; прежний рабочий уровень сохраняется'};
  const anchor=doseVolume(suggested.dose)<doseVolume(entry.targetDose)?suggested.dose:entry.targetDose;
  return {...suggested,dose:doseWithinVolume(ex,anchor,entry.remaining)||entry.dose,reason:entry.reason+' · '+suggested.reason};
}
