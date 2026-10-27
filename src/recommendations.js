'use strict';

function prescriptionCounts(ts=now()){
  const counts={};
  for(const [g] of Object.entries(APP.program.prescription_groups)) counts[g]=0;
  for(const l of state.logs.filter(l=>l.ts>=startOfDay(ts)&&l.ts<=ts)){
    const ex=EXMAP[l.exerciseId]; const g=ex?.prescription_credit?.group;
    if(g) counts[g]=(counts[g]||0)+1;
  }
  return counts;
}
function dailyDeficit(ex,ts=now()){
  const g=ex.prescription_credit?.group; if(!g)return .35;
  const target=dailyTarget(ex,ts);
  if(!target)return 0;
  const n=planCounts(ts)[g]||0;
  return clamp((target-n)/target);
}
function dailyTarget(ex,ts=now()){
  return dailyPlan(ts).targets[ex.prescription_credit?.group]||0;
}
function dailyPlan(ts=now()){
  const day=startOfDay(ts),saved=state.dailyPlans[String(day)];
  if(saved)return saved;
  // No historical status snapshots exist in older backups; retain their original catalog goals.
  const exercises=day<startOfDay()?EX.filter(ex=>ex.status==='active'):activeExercises(),targets={};
  for(const ex of exercises){
    const group=ex.prescription_credit?.group,target=APP.program.prescription_groups[group]?.target_per_day||ex.prescription_credit?.target_per_day||0;
    if(group&&target>0&&!(group==='tiptoe_static'&&day>=staticMaintenanceFrom(ts)))targets[group]=target;
  }
  return {day,targets};
}
function ensureDailyPlan(ts=now()){
  const key=String(startOfDay(ts));
  if(!state.dailyPlans[key]){
    const targets={};
    for(const ex of activeExercises()){
      const group=ex.prescription_credit?.group,target=APP.program.prescription_groups[group]?.target_per_day||ex.prescription_credit?.target_per_day||0;
      if(group&&target>0&&!(group==='tiptoe_static'&&startOfDay(ts)>=staticMaintenanceFrom(ts)))targets[group]=target;
    }
    state.dailyPlans[key]={day:startOfDay(ts),targets};
  }
  return state.dailyPlans[key];
}
function planExecutions(ts=now()){
  return historyValue('executions:'+ts,()=>{
  const plan=dailyPlan(ts),counts=Object.fromEntries(Object.keys(plan.targets).map(g=>[g,0])),lastPerformed={},restUntil={},accepted=[];
  const logs=state.logs.filter(l=>l.ts<=ts).sort((a,b)=>a.ts-b.ts);
  for(const log of logs){
    const ex=EXMAP[log.exerciseId],group=ex?.prescription_credit?.group;
    if(!(group in counts)||log.additionalPlanId)continue;
    const until=Math.max(restUntil[group]||0,lastPerformed[group]!=null?lastPerformed[group]+(ex.min_rest_minutes||0)*60000:0);
    lastPerformed[group]=log.ts;restUntil[group]=Math.max(until,log.ts+(ex.min_rest_minutes||0)*60000);
    if(log.ts<plan.day||log.ts<until||exerciseAfterTestUntil(ex,log.ts)>log.ts)continue;
    const weakMorning=minorReaction(morningFor(log,ts))&&['normal','hold'].includes(loadResponseLevel(exerciseResponse(log,ts)))&&log.technique!=='poor';
    if(!isSuccessful(log,ts)&&!weakMorning)continue;
    if(log.actualDose){
      const suggested=log.suggestedDose||ex.dose,actualVolume=doseVolume(log.actualDose),suggestedVolume=doseVolume(suggested);
      if(log.actualDose.type!==suggested.type||!Number.isFinite(actualVolume)||!Number.isFinite(suggestedVolume)||suggestedVolume<=0||actualVolume<suggestedVolume)continue;
    }else if(log.painAfter==null||log.doseReason==='time')continue;
    counts[group]++;
    accepted.push(log);
  }
  return {counts,logs:accepted};
  });
}
function planCounts(ts=now()){return planExecutions(ts).counts;}
function adherencePercent(score){return score==null?'не применяется':(Math.round(score*1000)/10).toLocaleString('ru-RU')+'%';}
function progressionAdherence(ts=now()){
  return historyValue('adherence:'+ts,()=>{
  const groups=Object.keys(dailyPlan(ts).targets).map(id=>({id,label:EX.find(ex=>ex.prescription_credit?.group===id)?.name||id,count:0}));
  for(let i=1;i<=7;i++){
    const day=new Date(startOfDay(ts));day.setDate(day.getDate()-i);
    const counts=planCounts(nextDayStart(+day)-1);
    for(const group of groups)group.count+=counts[group.id]||0;
  }
  const minimumCount=groups.length?Math.min(...groups.map(g=>g.count)):null,score=minimumCount==null?null:minimumCount/21,allowed=score==null||score>=.7;
  const reason=score==null?'Обязательных домашних групп сейчас нет; условие регулярности не применяется':`Регулярность: ${adherencePercent(score)}. Минимум по домашним группам — ${minimumCount}/21 за последние 7 полных дней; для повышения нужно не меньше 70% (15/21 в каждой группе).`;
  return {groups,minimumCount,denominator:21,score,allowed,reason};
  });
}

function weeklySkillExposure(ts=now()){
  const since=ts-7*DAY, out={};
  for(const s of Object.keys(APP.skills)) out[s]=0;
  const valid=state.logs.filter(l=>l.ts>=since&&l.ts<=ts);
  for(const l of valid){
    const ex=EXMAP[l.exerciseId]; if(!ex)continue;
    for(const [s,v] of Object.entries(ex.skill_credit||{})) out[s]=(out[s]||0)+v*Math.min(1,l.doseFactor??1);
  }
  return out;
}
function skillDeficit(ex,ts=now()){
  const exp=weeklySkillExposure(ts), skills=Object.entries(ex.skill_credit||{});
  if(!skills.length)return .4;
  const vals=skills.map(([s])=>1-clamp((exp[s]||0)/6));
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function weeklyBalance(ex,ts=now()){ return skillDeficit(ex,ts); }
function variety(ex,ts=now()){
  const recent=state.logs.filter(l=>l.ts<=ts&&ts-l.ts<120*60000).sort((a,b)=>b.ts-a.ts);
  let v=1;
  if(recent[0]?.exerciseId===ex.id)v-=.5;
  const last2=state.logs.filter(l=>l.ts<=ts).sort((a,b)=>a.ts-b.ts).slice(-2).map(l=>EXMAP[l.exerciseId]?.primary_skills?.[0]);
  if(ex.primary_skills?.[0] && last2.includes(ex.primary_skills[0])) v-=.2;
  if(dailyDeficit(ex,ts)>.7)v+=.2;
  return clamp(v);
}
function classifyLog(l,ts=now()){
  const level=responseLevel(exerciseResponse(l,ts));
  return {pause:'safety_lock',reduce:'moderate_reaction',mild:'mild_reaction',normal:'normal'}[level];
}
function tolerance(ex,ts=now()){
  const ls=state.logs.filter(l=>l.exerciseId===ex.id&&l.ts<=ts).sort((a,b)=>a.ts-b.ts).slice(-5);
  if(!ls.length)return 1;
  const map=APP.exercise_tolerance.modifiers;
  const weights=[1,.8,.65,.5,.4].slice(0,ls.length).reverse();
  let n=0,d=0;
  ls.forEach((l,i)=>{n+=(map[classifyLog(l,ts)]??1)*weights[i];d+=weights[i]});
  return d?n/d:1;
}
function progressionValue(ex,ts=now()){
  if(!ex.mastery_tracking?.enabled)return .2;
  const req=ex.mastery_tracking.successful_sessions_required||APP.progression.successful_sessions_required_default||3;
  const good=state.logs.filter(l=>l.exerciseId===ex.id&&l.ts<=ts&&isSuccessful(l,ts)).slice(-req).length;
  return clamp(good/req);
}
function isSuccessful(l,ts=now()){
  const r=exerciseResponse(l,ts);
  return responseLevel(r)==='normal'&&r.morning!=='worse'&&(l.technique||'ok')!=='poor';
}
function maxPerDayReached(ex,ts=now()){
  if(unprescribedFrequency(ex))return false;
  const max=ex.prescription_credit?.max_per_day ?? ex.recommended_frequency?.max_per_day;
  if(max==null)return false;
  const group=ex.prescription_credit?.group;
  const own=state.logs.filter(l=>l.exerciseId===ex.id&&l.ts>=startOfDay(ts)&&l.ts<=ts).length;
  return (group?prescriptionCounts(ts)[group]:own)>=max||ex.id!=='tandem_walk_tiptoe'&&ex.recommended_frequency?.max_per_day>0&&own>=ex.recommended_frequency.max_per_day;
}
function symptomMultiplier(ex,ts=now()){
  const assessmentModifier=assessmentSymptomModifier(ex,ts),recent=reactionEntries(ts).slice(-1)[0],current=currentSymptoms(ts);
  if(current&&responseLevel(current)!=='normal')return Math.min(assessmentModifier,.7);
  if(recent?.source_type==='exercise'&&recent.worse)return Math.min(assessmentModifier,.7);
  return assessmentModifier;
}
function abilityDeficit(ex,ts=now()){
  const scores=readinessSummary(ts).domainScores;
  const domains=[];
  if((ex.load_channels?.calf||0)>=.5||(ex.primary_skills||[]).includes('mobility'))domains.push('ankle_capacity');
  if((ex.load_channels?.ankle_control||0)>=.25)domains.push('sensorimotor_control');
  if((ex.load_channels?.impact||0)>0)domains.push('impact_running_capacity');
  const known=domains.map(k=>scores[k]).filter(v=>v!=null);
  return known.length?1-known.reduce((a,b)=>a+b,0)/known.length:null;
}
function fatigueModifier(ex,ts=now()){
  const rf=relevantFatigue(ex,ts);
  if(rf>=70)return .35;
  if(rf>=45)return .65;
  if(rf>=30)return .82;
  return 1;
}
function scoreExercise(ex,ts=now()){
  const lifecycleStatus=state.exerciseStatuses[ex.id];
  if(lifecycleStatus!=='active')return {score:-1,status:'red',reasons:['не активно']};
  const choice=homeVariantChoice(ex,ts);
  if(choice.ex.id!==ex.id)return {score:-1,status:'yellow',reasons:[`В общей дневной группе выбрано: ${choice.ex.name}. Объём и история вариантов учитываются отдельно`]};
  if(!exercisePermitted(ex,ts))return {score:-1,status:'red',reasons:['Сначала нужны условия подготовки к ударной работе и её разрешение']};
  if(dailyLoadPlan(ex,ts).status==='pause')return {score:-1,status:'red',reasons:[dailyLoadPlan(ex,ts).reason]};
  const additional=unprescribedFrequency(ex)&&additionalPlanState(ex,ts);
  if(additional&&additional.status!=='remaining')return {score:-1,status:'yellow',reasons:[additional.reason]};
  if(maxPerDayReached(ex,ts))return {score:-1,status:'red',reasons:['достигнут максимум на сегодня для автоматических рекомендаций; дальнейшие выполнения можно записать через каталог']};
  const group=ex.prescription_credit?.group,counts=planCounts(ts),plan=dailyPlan(ts);
  if(group&&!(group in plan.targets))return {score:-1,status:'red',reasons:['новая дневная цель войдёт в план следующего дня']};
  const extraRound=!!group&&counts[group]>=dailyTarget(ex,ts);
  if(extraRound&&homeReturnState(ex,ts))return {score:-1,status:'yellow',reasons:['Три блока возврата выполнены. Сегодня достаточно; следующий шаг после проверки реакции утром']};
  const current=currentSymptoms(ts),last=lastRelatedExecution(ex,ts);
  if(extraRound&&(ex.source!=='clinician_home'||dailyLoadPlan(ex,ts).status!=='normal'||!current||additionalLightState(current)||!['easy','normal'].includes(last?.difficulty)||last.fatigue==='high'))
    return {score:-1,status:'yellow',reasons:['дневная цель выполнена; для дополнительного выполнения нужна известная нормальная переносимость и восстановление']};
  const measurement=measurementPlan(ts);
  const reserved=measurement&&overlapsTest(measurement.test,ex.load_channels);
  if(reserved&&(!group||extraRound))return {score:-1,status:'yellow',reasons:[`Сначала запланирован тест «${measurement.test.name}»; дополнительную похожую тренировку оставляем после измерения`]};
  if(exerciseRestUntil(ex,ts)>ts)return {score:-1,status:'yellow',reasons:['отдых после предыдущего выполнения']};
  const testUntil=exerciseAfterTestUntil(ex,ts);
  if(testUntil>ts)return {score:-1,status:'yellow',reasons:[`Перерыв после похожего теста — ориентир ${fmtTime(testUntil)}`]};

  const dd=dailyDeficit(ex,ts), sd=skillDeficit(ex,ts), fresh=clamp(1-relevantFatigue(ex,ts)/100),
        wb=weeklyBalance(ex,ts), va=variety(ex,ts), pv=progressionValue(ex,ts), tol=tolerance(ex,ts);
  const w=APP.scheduler.score_weights;
  let base=w.daily_deficit*dd+w.skill_deficit*sd+w.freshness*fresh+w.weekly_balance*wb+w.variety*va+w.progression_value*pv;
  const fm=fatigueModifier(ex,ts), sm=symptomMultiplier(ex,ts);
  const deficit=abilityDeficit(ex,ts);if(deficit!=null)base+=.08*deficit;
  let sc=base*fm*tol*sm*(reserved?.85:1);
  const rf=relevantFatigue(ex,ts);
  let status='green';
  if(sm===0)status='red';
  else if(tol<.75 || sm<1)status='yellow';
  const reasons=[];
  if(reserved)reasons.push(`Дневной план доступен; для сопоставимого измерения лучше сначала тест «${measurement.test.name}». Выполнение может сдвинуть время теста`);
  if(sm===0)reasons.push('сначала нужна нормальная реакция после боли, отёка или нестабильности');
  else if(sm<1)reasons.push('реакция после нагрузки снижает приоритет');
  if(rf>=38){
    const f=fatigueAt(ts),k=Object.keys(f).sort((a,b)=>(f[b]*(ex.load_channels?.[b]||0))-(f[a]*(ex.load_channels?.[a]||0)))[0];
    reasons.push(`${fatigueLabels[k]}: много похожей работы по расчёту; уточни ощущения, это не измерение усталости`);
  }
  if(group&&dd>0)reasons.unshift(`План этой группы: ${counts[group]||0} из ${dailyTarget(ex,ts)} выполнений зачтены`);
  if(sd>.65)reasons.push('По журналу мало практики; это не измерение слабости');
  if(fresh>.78)reasons.push('В журнале мало недавней похожей работы; восстановление оцениваем по самочувствию');
  if(fresh<.55)reasons.push('есть пересечение с недавней нагрузкой');
  if(va<.7)reasons.push('недавно уже был похожий паттерн');
  if(tol<.85)reasons.push('последняя переносимость снижает приоритет');
  const dose=recommendedDose(ex,ts);if(dose.reason)reasons.push(dose.reason);
  if(additional)reasons.unshift(additional.reason);
  if(extraRound)reasons.unshift('Дневная цель этой группы выполнена; дополнительное выполнение в назначенном диапазоне 3–4, с сохранением качества');
  if(deficit!=null&&deficit>.3)reasons.push('измерения показывают запас для улучшения этого навыка');
  if(pv>.65)reasons.push('Есть качественные выполнения; следующее повышение зависит от усилия и утренней реакции');
  if(!reasons.length)reasons.push('хорошо вписывается в текущий баланс нагрузки');
  return {score:sc,status,reasons,dose:dose.dose,extraRound,parts:{dd,sd,fresh,wb,va,pv,tol,rf}};
}
function nextGoodWindow(ex){
  const step=(APP.scheduler.next_time.resolution_minutes||15)*60000;
  const horizon=(APP.scheduler.next_time.search_horizon_hours||24)*3600000;
  for(let t=now();t<=now()+horizon;t+=step){
    const r=scoreExerciseAtTime(ex,t);
    if(r.score>=0 && r.status!=='red')return t;
  }
  return null;
}
function scoreExerciseAtTime(ex,ts){
  return scoreExercise(ex,ts);
}
function recommendations(ts=now()){
  return activeExercises().filter(ex=>!postponedUntil('exercise',ex.id,ts)).map(ex=>({ex,...scoreExercise(ex,ts)})).filter(x=>x.score>=0&&x.status!=='red').sort((a,b)=>b.score-a.score);
}
function exercisePauseReason(ex,rec,ts=now()){
  const reason=rec.reasons[0]||'';
  if(reason!=='отдых после предыдущего выполнения'&&!reason.startsWith('Перерыв после похожего теста'))return reason;
  const until=Math.max(exerciseRestUntil(ex,ts),exerciseAfterTestUntil(ex,ts));
  return `${reason==='отдых после предыдущего выполнения'?'Перерыв между выполнениями':'Перерыв после похожего теста'} — не раньше ${fmtTime(until)}${startOfDay(until,0)!==startOfDay(ts,0)?' '+fmtDate(until):''}`;
}
function feedbackRecommendation(ts=now()){
  const unfinished=state.assessment_sessions.findLast(s=>!s.completed_at&&sessionLastAt(s)<=ts);
  if(unfinished)return {kind:'feedback',mode:'assessment',id:unfinished.id,name:'Оценить самочувствие после тестов',detail:'Одна оценка для всей серии тестов',status:'green',score:1,reasons:['Тесты уже записаны; не хватает оценки реакции на эту серию.']};
  const day=pendingMorningDays(ts).find(day=>nextDayStart(day)===startOfDay(ts));
  if(day!=null)return {kind:'feedback',mode:'morning',id:day,name:'Оценить восстановление после вчерашней нагрузки',detail:'Одна общая оценка за день',status:'green',score:1,reasons:['Оценки сразу после упражнений известны; нужна отложенная реакция для выбора сегодняшнего объёма.']};
  const current=currentSymptoms(ts);
  const session=state.assessment_sessions.findLast(s=>s.reaction_at<=ts&&startOfDay(s.reaction_at)===startOfDay(ts)&&s.pain_after!=null);
  const feedback=activeExercises().map(ex=>dailyLoadPlan(ex,ts)).find(plan=>plan.needsFeedback);
  if(feedback)return {kind:'feedback',mode:'current',id:'current',name:'Оценить самочувствие после нагрузки',detail:'Как лодыжка в целом после комплекса',status:'green',score:1,reasons:[feedback.reason]};
  if((!current||startOfDay(current.ts)<startOfDay(ts))&&!session)return {kind:'feedback',mode:'current',id:'current',name:'Оценить самочувствие перед нагрузкой',detail:'Боль, устойчивость и усталость сейчас',status:'green',score:1,reasons:['Сегодня ещё нет оценки самочувствия. Оценка после выполнения упражнения тоже подойдёт.']};
  const impact=impactCheckStatus(ts);
  if((currentStage().order===0&&rehabWorkChecks(ts).every(c=>c.passed)||currentStage().order>0&&(impact.check||impact.invalidated))&&(!impact.check||impact.invalidated||IMPACT_CHECK_FIELDS.some(([id])=>impact.check.answers?.[id]==null)))return {kind:'feedback',mode:'impact',id:'impact',name:impact.invalidated?'Обновить проверку движений после подворачивания':impact.check?'Закончить проверку движений перед ударной работой':'Проверить движения перед первой ударной пробой',detail:'Известные ответы сохранены; проверь недостающие или изменившиеся пункты',status:'green',score:1,reasons:['Ходьба, подвижность, контроль движения и готовность к маленькой двуногой пробе сохраняются один раз.']};
  return null;
}
function openFeedback(mode,id){
  if(mode==='impact')openImpactCheck();
  else if(mode==='morning')openMorning(Number(id));
  else if(mode==='assessment')openAssessment(id);
  else openSymptoms();
}
function actionRecommendations(ts=now()){
  const order={green:0,yellow:1,red:2};
  const priority=r=>r.kind==='exercise'&&r.ex.source==='clinician_home'&&dailyDeficit(r.ex,ts)>0?0:r.kind==='test'?1:r.extraRound?3:2;
  const actions=[...recommendations(ts).map(r=>({...r,kind:'exercise'})),...testRecommendations(ts).slice(0,1)]
    .sort((a,b)=>priority(a)-priority(b)||order[a.status]-order[b.status]||b.score-a.score);
  const testIndex=actions.findIndex(r=>r.kind==='test');
  if(testIndex>=0){
    const [test]=actions.splice(testIndex,1);
    actions.splice(test.latest?Math.min(4,actions.filter(r=>priority(r)===0).length):0,0,test);
  }
  const run=runRecommendation(ts);if(run)actions.unshift(run);
  const feedback=feedbackRecommendation(ts);
  return feedback?[feedback,...actions]:actions;
}
function testDoseText(t){
  return `${t.bilateral?'Левая и правая нога':'Один тест'}${testCap(t)?' · до '+testCap(t)+' '+t.unit_short:t.metric==='errors_per_30s'?' · 30 секунд на сторону':''}`;
}
function actionButtonHTML(r){
  if(r.kind==='run')return `<button class="btn primary" onclick="${r.mode==='settings'?'AM.openRunningPlan()':`AM.openRun('${r.mode}')`}">${r.mode==='settings'?'Мой беговой план':'Записать пробежку'}</button>`;
  if(r.kind==='feedback')return `<button class="btn primary" onclick="AM.openFeedback('${r.mode}','${r.id}')">${r.mode==='impact'?'Проверить движения':'Оценить самочувствие'}</button>`;
  const buttons=r.kind==='test'?`<button class="btn primary" onclick="AM.openTest('${r.test.id}')">Пройти тест</button>`:`<button class="btn primary" onclick="AM.openExercise('${r.ex.id}')">Выполнить</button><button class="btn secondary" onclick="AM.openLog('${r.ex.id}')">Записать</button>`;
  return buttons+`<button class="btn ghost" onclick="AM.openPostpone('${r.kind}','${r.kind==='test'?r.test.id:r.ex.id}')">Отложить</button>`;
}
let lastPostponed=null,postponedTimer=null;
function postponedUntil(kind,id,ts=now()){
  const until=state.postponedActions[kind+':'+id];
  return until>ts?until:null;
}
function openPostpone(kind,id){
  const item=kind==='test'?RDCFG.tests.find(t=>t.id===id):EXMAP[id];
  document.getElementById('postponeModal').innerHTML=`<div class="modal-head"><h3>Отложить рекомендацию</h3><button class="x" aria-label="Закрыть" onclick="AM.close('postponeDialog')">×</button></div><p>${esc(item.name)}</p><div class="list">${[['hour','На час'],['tomorrow','До завтра'],['week','На неделю']].map(([period,label])=>`<button class="btn secondary" onclick="AM.postponeAction('${kind}','${id}','${period}')">${label}</button>`).join('')}</div><div class="li-meta" style="margin-top:12px">Покажем следующий вариант. Это действие останется в каталоге, и его можно вернуть раньше.</div>`;
  showDialog('postponeDialog');
}
function postponeAction(kind,id,period,ts=now()){
  const until=period==='hour'?ts+3600000:period==='tomorrow'?nextDayStart(ts):ts+7*DAY;
  state.postponedActions[kind+':'+id]=until;
  lastPostponed={kind,id,until};
  closeDialog('postponeDialog');save();
}
function resumeAction(kind,id){
  delete state.postponedActions[kind+':'+id];
  if(lastPostponed?.kind===kind&&lastPostponed.id===id)lastPostponed=null;
  save();
}
function renderPostponed(best){
  const entries=Object.entries(state.postponedActions).filter(([,until])=>until>now());
  clearTimeout(postponedTimer);
  postponedTimer=entries.length?setTimeout(renderAll,Math.max(0,Math.min(...entries.map(([,until])=>until))-now())):null;
  const feedback=lastPostponed&&postponedUntil(lastPostponed.kind,lastPostponed.id)?`<div class="notice" role="status" style="margin-top:12px">Отложено до ${fmtDate(lastPostponed.until)} ${fmtTime(lastPostponed.until)} <button class="btn ghost" onclick="AM.resumeAction('${lastPostponed.kind}','${lastPostponed.id}')">Отменить</button></div>`:'';
  const allPostponed=!best&&activeExercises().every(ex=>postponedUntil('exercise',ex.id));
  document.getElementById('postponedWrap').innerHTML=feedback+(entries.length?`<details ${allPostponed?'open':''}><summary>Отложенные действия · ${entries.length}</summary><div class="list" style="margin-top:10px">${entries.map(([key,until])=>{
    const [kind,id]=key.split(':'),item=kind==='test'?RDCFG.tests.find(t=>t.id===id):EXMAP[id];
    return item?`<div class="list-item"><div class="li-main"><div class="li-title">${esc(item.name)}</div><div class="li-meta">До ${fmtDate(until)} ${fmtTime(until)}</div></div><button class="btn secondary" onclick="AM.resumeAction('${kind}','${id}')">Вернуть</button></div>`:'';
  }).join('')}</div></details>`:'');
}
