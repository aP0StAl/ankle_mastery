'use strict';

function stageFraction(current,baseline,target){
  if(![current,baseline,target].every(Number.isFinite)||target<=baseline)return null;
  return clamp((current-baseline)/(target-baseline));
}
function stageProgressMean(goals){
  const remaining=goals.filter(g=>g.baseline==null||g.target==null||g.target>g.baseline);
  return remaining.length?remaining.reduce((sum,g)=>sum+(stageFraction(g.current,g.baseline,g.target)??0),0)/remaining.length:1;
}
const IMPACT_CHECK_FIELDS=[
  ['gait','Обычная ходьба и лестница без хромоты','Нет защитного сокращения опоры справа, нарастания боли или отёка и ухудшения утром. Используй уже известную обычную прогулку; новый тест на 20 или 30 минут не нужен.'],
  ['mobility','Подвижность позволяет контролируемо сгибать ногу','При неглубоком снижении пятка остаётся на полу, нет болезненного щемления и ухода от нагрузки. Разницу в тесте «колено к стене» оценивай вместе с движением; 11 см сами по себе не запрет, любое положительное число — не подтверждение.'],
  ['dynamic','Движение на одной ноге остаётся самостоятельным','Сравни обе стороны: пять неглубоких контролируемых приседаний и движение свободной ногой вперёд, в сторону и назад по диагонали. Нет спасательного касания, хвата, подкашивания, боли или компенсации тазом. Пять — объём наблюдения, не медицинский норматив.'],
  ['strength','При силовой работе нет нерешённого ограничения','Подъёмы сохраняют высоту и контролируемое опускание, рука не разгружает ногу. При движении стопой против сопротивления нет боли или выраженной слабости. Неоднозначную слабость, нестабильность или болезненный блок нужно оценить со специалистом; это поле не заменяет очный осмотр.'],
  ['willing','Готов именно к маленькой двуногой пробе','Речь о двух подходах по три низких прыжка с полной остановкой. Нет действующего запрета специалиста, нерешённого ограничения или страха, который меняет движение. Готовность к бегу здесь не требуется.']
];
function impactCheckStatus(ts=now()){
  const saved=state.settings.impactCheck,check=saved?.ts<=ts?saved:null;
  const instability=reactionEntries(ts).findLast(r=>r.instability);
  const invalidated=!!instability&&(check?instability.ts>check.ts:!runningEstablished(ts,instability.ts));
  return {check,invalidated,ready:!!check&&!invalidated&&IMPACT_CHECK_FIELDS.every(([id])=>check.answers?.[id]===true)};
}
function recordImpactCheck(answers,source='self',ts=now()){
  if(!['self','clinician'].includes(source)||IMPACT_CHECK_FIELDS.some(([id])=>![true,false,null].includes(answers[id])))throw new Error('Проверь ответы функциональной проверки');
  state.settings.impactCheck={ts,source,answers:{...answers}};
  recordDecision('impact_check_recorded','Сохранены отдельные наблюдения перед первой малой двуногой пробой',{answers,source},ts);
}
function openImpactCheck(){
  const {check,invalidated}=impactCheckStatus();
  document.getElementById('activityModal').innerHTML=`<div class="modal-head"><h3>Проверка движений перед ударной работой</h3><button class="x" onclick="AM.close('activityDialog')">×</button></div><p>Сохраняется один раз. Уже известные ответы остаются; меняй их при изменении. Не пробуй прыжки ради заполнения этой проверки.</p>${invalidated?'<div class="notice">После прежней проверки отмечено подворачивание. Нужна новая оценка этих движений.</div>':''}<div class="field"><label for="impactSource">Источник наблюдений</label><select id="impactSource"><option value="self" ${check?.source!=='clinician'?'selected':''}>Сам наблюдал выполнение</option><option value="clinician" ${check?.source==='clinician'?'selected':''}>Проверено с реабилитологом</option></select></div>${IMPACT_CHECK_FIELDS.map(([id,label,help])=>`<div class="field"><label for="impact_${id}">${esc(label)}</label><p class="li-meta">${esc(help)}</p><select id="impact_${id}">${[['','Не проверено'],['yes','Да, выполняется'],['no','Есть проблема / пока не готов']].map(([value,text])=>`<option value="${value}" ${check?.answers?.[id]===(value==='yes'?true:value==='no'?false:null)?'selected':''}>${text}</option>`).join('')}</select></div>`).join('')}<button class="btn primary" onclick="AM.saveImpactCheck()">Сохранить проверку</button>`;
  showDialog('activityDialog');
}
function saveImpactCheck(){
  const answers=Object.fromEntries(IMPACT_CHECK_FIELDS.map(([id])=>{const value=document.getElementById('impact_'+id).value;return [id,value==='yes'?true:value==='no'?false:null];}));
  try{recordImpactCheck(answers,document.getElementById('impactSource').value);}catch(e){return toast(e.message);}
  closeDialog('activityDialog');save();toast('Функциональная проверка сохранена');
}
function impactDoseConfirmed(id,reps,ts=now()){
  const ex=EXMAP[id];if(!ex)return false;
  const p=exerciseProgress(ex,ts),adverse=lastAdverseExercise(ex,ts);
  return p.confirmed&&p.working.sets>=2&&p.working.reps>=reps&&recoveredAfter(p,adverse,ts)&&goalObservations({exerciseId:id,kind:'calf_volume',maxReps:reps,maxSets:2},ts).some(a=>a.value>=reps*2);
}
function impactTestLockReason(t,ts=now()){
  if(currentStage().order<(RDCFG.stages.find(s=>s.id===t.unlock_stage)?.order??Infinity))return 'Сначала нужно закончить базовый план и вручную перейти к этапу «Подготовка к ударной нагрузке»';
  const functional=impactCheckStatus(ts);
  if(!functional.ready)return functional.invalidated?'После нового подворачивания сначала обнови функциональную проверку перед ударной работой':'Сначала нужна завершённая функциональная проверка без нерешённых ограничений';
  if(!impactDoseConfirmed('bilateral_pogo',10,ts))return 'Сначала подтвердить тренировочные 2×10 упругих двуногих прыжков с нормальной реакцией утром';
  if(t.id==='pogo_bilateral')return '';
  const pogo=RDCFG.tests.find(t=>t.id==='pogo_bilateral'),pogoLog=currentMeasurement(pogo,ts)?.log;
  if(!pogoLog||pogoLog.value<20||!testSupportsProgression({test:pogo,log:pogoLog},ts))return 'Одноногая проба ждёт переносимого теста 20 двуногих прыжков подряд и нормального утра';
  if(t.id==='single_leg_hop_basic')return '';
  const single=RDCFG.tests.find(t=>t.id==='single_leg_hop_basic'),singleLog=currentMeasurement(single,ts)?.log;
  return singleLog&&singleLog.left>=10&&singleLog.right>=10&&testSupportsProgression({test:single,log:singleLog},ts)?'':'Боковая проба ждёт собственных переносимых 10 одноногих прыжков каждой ногой и нормального утра';
}
function stageGoalDefinitions(stage,ts=now()){
  const plan=runningPlan();
  if(stage.order===0)return [
    {id:'static',exerciseId:'bilateral_tiptoe_static',label:'Статика: 10 удержаний по 5 секунд',kind:'reps',target:10,conditions:{weight_distribution:'even'}},
    {id:'toes',exerciseId:'tandem_walk_tiptoe',label:'Обычная линия → носки → три домашних блока',kind:'line_path',target:4},
    {id:'balance',exerciseId:'right_leg_balance_left_front_back',label:'Пять циклов без помощи свободной ноги',kind:'cycles',target:5,conditions:{support:'none'}},
    {id:'calf',exerciseId:'single_leg_calf_raise',label:'Одноногие подъёмы: 2×10 на каждую ногу',kind:'calf_volume',target:20,maxReps:10,maxSets:2}
  ];
  if(stage.order===1)return [
    {id:'landing',exerciseId:'hop_to_stabilization',label:'Два подхода по пять двуногих приземлений с остановкой',kind:'calf_volume',target:10,maxReps:5,maxSets:2},
    {id:'pogo',exerciseId:'bilateral_pogo',label:'Два подхода по десять упругих двуногих прыжков',kind:'calf_volume',target:20,maxReps:10,maxSets:2}
  ];
  if(stage.order===2)return ['run_walk','continuous'].map(mode=>({id:mode,mode,label:runModeName(mode)+' · три переносимые пробы',kind:'run_count',target:plan.confirmations,minutes:mode==='run_walk'?plan.runMinutes:plan.continuousMinutes}));
  if(stage.order===3)return [{id:'usual_running',mode:'continuous',label:'Две полные недели моего обычного лёгкого объёма',kind:'weeks',target:2,weekMinutes:plan.weekMinutes??null,targetMinutes:plan.targetMinutes??null,sessionsPerWeek:plan.sessionsPerWeek??null}];
  return (plan.challenges||[]).map(mode=>({id:mode,mode,label:runModeName(mode)+' · три переносимые пробы',kind:'run_count',target:plan.confirmations,template:true}));
}
const LINE_WALK_STEPS=['Обычная линия освоена','12 шагов на носках подтверждены в разные дни','Два домашних блока на носках перенесены за день','Три домашних блока на носках перенесены за день'];
function goalDoseValue(goal,dose){
  if(goal.conditions&&Object.entries(goal.conditions).some(([k,v])=>(dose[k]||(k==='weight_distribution'?'even':null))!==v))return 0;
  const minimum=goal.minimumDose||(goal.id==='static'?{hold_sec:5}:goal.id==='balance'?{front_hold_sec:5,back_hold_sec:5}:{});
  if(Object.entries(minimum).some(([key,value])=>!Number.isFinite(dose[key])||dose[key]<value))return 0;
  if(goal.kind==='calf_volume')return Math.min(dose.reps||0,goal.maxReps||(goal.id==='calf'?12:5))*Math.min(dose.sets||1,goal.maxSets||(goal.id==='calf'?3:2));
  return dose[goal.kind]||0;
}
function lineWalkObservations(ts=now()){
  const flat=EXMAP.tandem_walk_flat,toes=EXMAP.tandem_walk_tiptoe;
  const ordinary=goalObservations({exerciseId:flat.id,kind:'target_steps'},ts).filter(a=>a.value>=flat.dose.target_steps).map(a=>({value:1,at:a.at}));
  const test=RDCFG.tests.find(t=>t.dose_exercise_id===flat.id);
  for(const log of testHistory(test).filter(l=>l.ts<=ts&&l.value>=testCap(test)&&l.stop_reason==='cap')){
    if(testSupportsProgression({test,log},ts))ordinary.push({value:1,at:morningFor(log,ts).ts});
  }
  const blocks=goalObservations({exerciseId:toes.id,kind:'daily_blocks'},ts).map(a=>({value:1+a.value,at:a.at}));
  return [...ordinary,...blocks].sort((a,b)=>a.at-b.at);
}
function goalObservations(goal,ts=now()){
  if(goal.kind==='line_path')return lineWalkObservations(ts);
  const ex=EXMAP[goal.exerciseId],p=exerciseProgress(ex,ts);
  const good=l=>confirmedSafe(l,ts)&&l.technique==='good'&&l.difficulty!=='hard'&&l.fatigue!=='high';
  if(goal.kind==='daily_blocks'){
    if(!goalObservations({exerciseId:ex.id,kind:'target_steps'},ts).some(a=>a.value>=12))return [];
    const days=new Map();
    for(const day of new Set(p.logs.map(l=>startOfDay(l.ts)))){
      const logs=planExecutions(Math.min(nextDayStart(day)-1,ts)).logs.filter(l=>l.exerciseId===ex.id&&good(l)&&l.actualDose?.target_steps>=12);
      if(logs.length)days.set(day,{value:Math.min(3,logs.length),at:Math.max(...logs.map(l=>morningFor(l,ts)?.ts||l.ts))});
    }
    return [...days.values()].sort((a,b)=>a.at-b.at);
  }
  return p.achievements.flatMap(a=>{
    const previous=p.achievements.some(b=>b.at<a.at&&sameConditions(b.dose,a.dose));
    const logs=p.logs.filter(l=>sameDose(l.actualDose,a.dose)&&good(l));
    const days=[...new Set(logs.map(l=>startOfDay(l.ts)))],required=progressConfirmations(ex,previous);
    if(days.length<required)return [];
    const last=logs.find(l=>startOfDay(l.ts)===days[required-1]);
    return [{value:goalDoseValue(goal,a.dose),at:Math.max(a.at,morningFor(last,ts)?.ts||last.ts)}];
  }).filter(a=>a.value>0);
}
function goalAchievement(goal,ts=now()){
  if(goal.exerciseId)return Math.max(0,...goalObservations(goal,ts).map(a=>a.value));
  if(goal.testId){const t=RDCFG.tests.find(t=>t.id===goal.testId);return Math.max(0,...testHistory(t).filter(l=>l.ts<=ts&&testSupportsProgression({test:t,log:l},ts)).map(l=>t.bilateral?l.right:l.value));}
  if(goal.kind==='run_count')return Math.min(goal.target,successfulRuns(goal.mode,ts).filter(a=>goal.template?runTemplateCompleted(a,goal.mode):goal.mode==='run_walk'?runWalkCompleted(a,{...runningPlan(),runMinutes:goal.minutes}):a.running.longestContinuous>=goal.minutes).length);
  if(goal.kind==='weeks'){
    if(![goal.weekMinutes,goal.targetMinutes,goal.sessionsPerWeek].every(v=>Number.isFinite(v)&&v>0))return 0;
    const runs=successfulRuns('continuous',ts,false),plan={...runningPlan(),...goal};
    return Math.max(0,...[ts,...runs.map(a=>nextDayStart(a.ts))].map(end=>runningWeekEvidence(plan,Math.min(end,ts)).reduce((n,w)=>n+w.fraction,0)));
  }
  const runs=successfulRuns(goal.mode,ts,goal.kind!=='week');
  if(goal.kind==='week'){
    let best=0;
    for(const a of runs){const end=nextDayStart(a.ts),from=trainingDayOffset(end,-7),week=runs.filter(r=>r.ts>=from&&r.ts<end),minutes=week.reduce((n,r)=>n+r.running.runMinutes,0),longest=Math.max(0,...week.map(r=>r.running.longestContinuous));
      best=Math.max(best,Math.min(minutes,goal.target*(longest/(goal.targetMinutes||Infinity)),goal.target*(week.length/(goal.sessionsPerWeek||Infinity))));}
    return best;
  }
  const doses=[...new Set(runs.map(a=>a.running.runMinutes))];
  return Math.max(0,...doses.filter(n=>runs.filter(a=>a.running.runMinutes===n).length>=3).map(n=>n));
}
function goalBaseline(goal,enteredAt,ts=now(),reconstructed=false){
  if(goal.target==null)return {value:null,at:null};
  if(goal.kind==='line_path'){
    const logs=state.logs.filter(l=>l.ts<=ts&&['tandem_walk_flat','tandem_walk_tiptoe'].includes(l.exerciseId)&&l.actualDose).sort((a,b)=>a.ts-b.ts);
    const known=goalObservations(goal,reconstructed?logs[0]?.ts??enteredAt:enteredAt).sort((a,b)=>b.value-a.value)[0];
    if(known)return {value:known.value,at:known.at};
    const first=goalObservations(goal,ts)[0];
    return logs[0]?.exerciseId==='tandem_walk_flat'?{value:0,at:logs[0].ts}:{value:first?.value??null,at:first?.at??null};
  }
  if(goal.exerciseId){
    const observations=goalObservations(goal,ts).sort((a,b)=>a.at-b.at);
    const before=!reconstructed&&observations.filter(a=>a.at<=enteredAt).sort((a,b)=>b.value-a.value)[0],first=before||observations[0];
    return {value:first?.value??null,at:first?.at??null};
  }
  if(goal.testId){const t=RDCFG.tests.find(t=>t.id===goal.testId),logs=testHistory(t).filter(l=>l.ts<=ts&&testSupportsProgression({test:t,log:l},ts)),log=logs.filter(l=>l.ts<=enteredAt).at(-1)||logs[0];return {value:log?(t.bilateral?log.right:log.value):null,at:log?.ts||null};}
  if(['run_count','weeks'].includes(goal.kind))return {value:goalAchievement(goal,enteredAt),at:enteredAt};
  const runs=successfulRuns(goal.mode,ts,goal.kind!=='week');
  if(!runs.length)return {value:null,at:null};
  if(goal.kind==='week')return {value:goalAchievement(goal,ts),at:ts};
  const before=runs.filter(r=>r.ts<=enteredAt),first=before.at(-1)||runs[0];return {value:first.running.runMinutes,at:first.ts};
}
function stageGameProgress(ts=now()){
  const stage=currentStage();state.stageProgress??={};
  if(stage.order>=4&&!Array.isArray(state.settings.runningPlan?.challenges))return {stage,enteredAt:state.stageProgress[stage.id]?.enteredAt||ts,goals:[],score:0,unknown:true};
  let saved=state.stageProgress[stage.id],changed=false;
  const canonical=saved?.goals.some(g=>g.id==='calf'&&g.target===36||stage.order===1&&g.id==='pogo'&&g.testId||stage.order===2&&g.kind==='run'||stage.order===3&&g.kind==='week'||stage.order>=4&&g.kind==='run');
  if(saved&&canonical&&saved.version!==2){
    const old={...saved,goals:saved.goals.map(g=>({...g}))};
    saved={enteredAt:saved.enteredAt,reconstructed:saved.reconstructed,version:2,revisionReason:'Цели этапа согласованы с переходом; исходный уровень восстановлен по подтверждённой работе. Максимальный тест не заменяет рабочие подходы.',revisions:[...(saved.revisions||[]),{changedAt:ts,previous:old}],goals:stageGoalDefinitions(stage,ts).map(g=>{const b=goalBaseline(g,saved.enteredAt,ts,!!saved.reconstructed);return {...g,baseline:b.value,baselineAt:b.at,peak:goalAchievement(g,ts)};})};
    state.stageProgress[stage.id]=saved;changed=true;
  }
  if(!saved){
    const enteredAt=stage.order!==0||Object.keys(state.stageProgress).length?ts:Math.min(ts,state.createdAt||ts);
    const reconstructed=stage.order===0&&!Object.keys(state.stageProgress).length;
    saved={enteredAt,reconstructed,version:2,goals:stageGoalDefinitions(stage,ts).map(g=>{const b=goalBaseline(g,enteredAt,ts,reconstructed);return {...g,baseline:b.value,baselineAt:b.at,peak:0};})};
    state.stageProgress[stage.id]=saved;changed=true;
  }
  const oldLine=saved.goals.find(g=>g.id==='toes'&&g.kind==='daily_blocks');
  if(oldLine){
    saved.revisions=[...(saved.revisions||[]),{changedAt:ts,previous:{...saved,revisions:undefined,goals:saved.goals.map(g=>({...g}))}}];
    const definition=stageGoalDefinitions(stage,ts).find(g=>g.id==='toes'),b=goalBaseline(definition,saved.enteredAt,ts,!!saved.reconstructed);
    Object.assign(oldLine,definition,{baseline:b.value,baselineAt:b.at,peak:goalAchievement(definition,ts)});
    saved.revisionReason='Ходьба учитывается от обычной линии до трёх блоков на носках; освоенный базовый вариант сохранён в пройденном пути.';changed=true;
  }
  const goals=saved.goals.map(g=>{
    if(g.kind==='weeks'&&g.weekMinutes==null){const definition=stageGoalDefinitions(stage,ts).find(x=>x.id===g.id);if(definition?.weekMinutes!=null){Object.assign(g,definition);const b=goalBaseline(g,ts,ts);g.baseline=b.value;g.baselineAt=b.at;changed=true;}}
    if(g.target==null){const defined=stageGoalDefinitions(stage,ts).find(x=>x.id===g.id);if(Number.isFinite(defined?.target)){Object.assign(g,defined);const b=goalBaseline(g,ts,ts);g.baseline=b.value;g.baselineAt=b.at;g.peak=g.baseline||0;changed=true;}}
    if(g.baseline==null){const b=goalBaseline(g,saved.enteredAt,ts,!!saved.reconstructed);if(b.value!=null){g.baseline=b.value;g.baselineAt=b.at;changed=true;}}
    const current=goalAchievement(g,ts),peak=Math.max(g.peak||0,current);
    if(peak!==g.peak){g.peak=peak;changed=true;}
    return {...g,current:Math.max(g.baseline??0,peak),progress:stageFraction(Math.max(g.baseline??0,peak),g.baseline,g.target)};
  });
  if(changed)localStorage.setItem(KEY,JSON.stringify(state));
  return {stage,enteredAt:saved.enteredAt,goals,score:stageProgressMean(goals),revisionReason:saved.revisionReason,unknown:goals.some(g=>g.baseline==null||g.target==null||g.kind==='weeks'&&g.weekMinutes==null)};
}
function stagePreparationProgress(ts=now()){
  const game=stageGameProgress(ts),stage=game.stage;
  const optionalDone=stage.order>=4&&Array.isArray(state.settings.runningPlan?.challenges)&&!state.settings.runningPlan.challenges.length;
  const nextStage=optionalDone?null:RDCFG.stages.find(s=>s.order===stage.order+1),targetId=nextStage?.id||(optionalDone?'normal_volume':stage.id),transition=stageTransition(targetId,ts);
  if(!game.goals.length&&game.unknown)return {...game,nextStage,transition};
  const saved=state.stageProgress[stage.id],initial=stageTransition(targetId,game.enteredAt),workChecks={static:'goal_static',toes:'goal_toes',balance:'goal_balance',calf:'calf_endurance',landing:'impact',pogo:'impact_reactive',run_walk:'run_walk',continuous:'continuous'};
  const represented=new Set(game.goals.flatMap(g=>g.kind==='weeks'?['running_target','running_week_0','running_week_1']:g.template?['run_'+g.mode]:workChecks[g.id]?[workChecks[g.id]]:[]));
  const definitions=transition.checks.filter(c=>!represented.has(c.id)&&!(c.id==='walking'&&transition.checks.some(c=>c.id==='functional_gait')));
  if(transition.target.order>=3&&!definitions.some(c=>c.id==='functional_current'))definitions.push({id:'functional_current',label:'Нет нерешённых ограничений после функциональной проверки',passed:true});
  let changed=false;
  if(!saved.criteria){
    saved.criteria=definitions.map(c=>({id:c.id,label:c.label,kind:'criterion',baseline:(initial.checks.find(i=>i.id===c.id)?.passed??c.id==='functional_current')?1:0,target:1,peak:Number(c.passed)}));
    const functional=state.decisionLog.filter(d=>d.action==='impact_check_recorded'&&d.ts<=ts),before=functional.filter(d=>d.ts<=game.enteredAt).at(-1);
    const invalidated=before&&reactionEntries(game.enteredAt).some(r=>r.ts>before.ts&&r.instability);
    for(const g of saved.criteria.filter(g=>g.id.startsWith('functional_')&&g.id!=='functional_current')){
      const key=g.id.slice('functional_'.length);
      if(before&&!invalidated)g.baseline=Number(before.details.answers[key]===true);
      if(functional.some(d=>d.ts>game.enteredAt&&d.details.answers[key]===true))g.peak=1;
    }
    const recovery=saved.criteria.filter(g=>['recovery','pain','morning'].includes(g.id));
    const moments=[...new Set(reactionEntries(ts).flatMap(r=>[r.ts,r.ts+DAY+1,nextDayStart(r.ts)]))].filter(at=>at>game.enteredAt&&at<=ts).sort((a,b)=>a-b);
    for(const at of moments){
      if(recovery.every(g=>g.peak||g.baseline))break;
      for(const c of stageRecoveryChecks(at)){const g=recovery.find(g=>g.id===c.id);if(g&&c.passed)g.peak=1;}
    }
    changed=true;
  }
  const criteria=saved.criteria.map(g=>{
    const c=definitions.find(c=>c.id===g.id),peak=Math.max(g.peak||0,Number(!!c?.passed),g.baseline);if(peak!==g.peak){g.peak=peak;changed=true;}
    return {...g,current:peak,progress:stageFraction(peak,g.baseline,1)};
  });
  const goals=[...game.goals,...criteria];
  if(changed)localStorage.setItem(KEY,JSON.stringify(state));
  return {...game,goals,score:stageProgressMean(goals),nextStage,transition};
}
function toggleStageConditions(){const details=document.getElementById('readinessDetails');details.open=!details.open;}
function exerciseMastery(ex){
  if(!ex.mastery_tracking?.enabled)return null;
  const goals=stageGameProgress().goals.filter(g=>g.exerciseId===ex.id&&(g.baseline==null||g.target>g.baseline));
  return goals.length?stageProgressMean(goals):null;
}
function trainingMastery(){return stageGameProgress().score;}
function readinessSummary(ts=now()){
  const domainScores={pain:null,ankle_capacity:null,confidence:null,sensorimotor_control:null,impact_running_capacity:null};

  const painEvents=[
    ...state.logs.map(l=>({ts:l.ts,values:[l.painBefore,l.painDuring,l.painAfter]})),
    ...state.testLogs.map(l=>({ts:l.ts,values:[l.pain_after]})),
    ...state.customActivities.map(a=>({ts:a.ts,values:[a.painAfter]})),
    ...state.symptomReports.map(r=>({ts:r.ts,values:[r.pain]})),
    ...state.assessment_sessions.map(s=>({ts:s.reaction_at||s.completed_at||sessionLastAt(s),values:[s.pain_after]}))
  ].filter(r=>r.ts<=ts).flatMap(r=>r.values.filter(Number.isFinite).map(pain=>({ts:r.ts,pain})));
  const recentPain=painEvents.filter(r=>r.ts>=ts-7*DAY);
  if(recentPain.length){
    const avgPain=recentPain.reduce((a,r)=>a+r.pain,0)/recentPain.length;
    domainScores.pain=clamp(1-avgPain/5);
  }
  const lastDayPain=painEvents.filter(r=>r.ts>=ts-DAY);
  const pain24h=lastDayPain.length?Math.max(...lastDayPain.map(r=>r.pain)):null;
  const adverse24h=reactionEntries(ts).some(r=>r.ts>=ts-DAY&&(r.swelling||r.instability||r.worse||r.historyWorse));

  const current=currentSymptoms(ts);
  if(Number.isFinite(current?.pain)&&ts-current.ts<=7*DAY)domainScores.pain=clamp(1-current.pain/5);
  const sr=state.selfReports.filter(r=>r.ts<=ts).slice(-1)[0];
  if(sr&&[sr.trust,sr.fear,sr.ready].every(Number.isFinite)){
    const trust=sr.trust/10, fear=1-sr.fear/10, ready=sr.ready/10;
    domainScores.confidence=clamp((trust+fear+ready)/3);
  }

  const testMap={},measurements={};
  for(const t of RDCFG.tests){
    const current=currentMeasurement(t,ts);if(!current)continue;
    measurements[t.id]=current;
    if(current.log)testMap[t.id]=measurementScore(t,current.log);
  }

  const capIds=['knee_to_wall','single_leg_calf_raise_test'];
  const dynamicIds=['tandem_flat_clean_steps','tandem_tiptoe_clean_steps','multidirectional_control_clean_rounds'];
  // Equal error counts on both legs do not establish adequate absolute control.
  const sensorIds=['hemisphere_hold',...dynamicIds];
  const impactIds=['pogo_bilateral','single_leg_hop_basic','lateral_hop'];
    const coverage={rom:testMap.knee_to_wall!=null,strength:testMap.single_leg_calf_raise_test!=null,dynamic:dynamicIds.some(id=>testMap[id]!=null)};
  domainScores.mobility=testMap.knee_to_wall??null;
  domainScores.calf_endurance=testMap.single_leg_calf_raise_test??null;
  const lowest=ids=>{const values=ids.map(id=>testMap[id]).filter(v=>v!=null);return values.length?Math.min(...values):null;};
  domainScores.ankle_capacity=coverage.rom&&coverage.strength?lowest(capIds):null;
  domainScores.sensorimotor_control=coverage.dynamic?lowest(sensorIds):null;
  domainScores.impact_running_capacity=lowest(impactIds);

  let n=0,d=0;
  for(const [dom,cfg] of Object.entries(RDCFG.domains)){
    const v=domainScores[dom];
    if(v!=null){n+=v*cfg.weight;d+=cfg.weight;}
  }
  const missing=Object.keys(RDCFG.domains).filter(k=>domainScores[k]==null);
  const score=!missing.length&&!safetyFlag(ts)&&!adverse24h&&(pain24h==null||pain24h<=1)&&
    (!current||responseLevel(current)==='normal'&&current.fatigue!=='high'&&current.generalFatigue!=='high')?n/d:null;
  return {score,domainScores,testMap,measurements,missing,coverage,pain24h,adverse24h};
}
function currentStage(){
  return RDCFG.stages.find(x=>x.id===state.selectedStage)||RDCFG.stages[0];
}
function xpAndStreak(){
  const xp=state.xp||0;
  let streak=0; let cursor=startOfDay();
  for(let i=0;i<60;i++){
    const logs=state.logs.filter(l=>startOfDay(l.ts)===cursor);
    const skills=new Set(logs.flatMap(l=>Object.keys(EXMAP[l.exerciseId]?.skill_credit||{})));
    if(skills.size>=2){streak++;cursor=daysAgo(i+1);}else if(i===0){cursor=daysAgo(1);}else break;
  }
  return {xp,streak};
}
function maybeAddDelayedCheck(log){
  const ex=EXMAP[log.exerciseId];
  if(!ex || ex.mastery_tracking?.enabled===false)return;
  state.delayedChecks.push({id:'c'+Math.random().toString(36).slice(2),logId:log.id,exerciseId:log.exerciseId,createdAt:log.ts,sameDay:null,nextMorning:null});
}
function pendingChecks(){
  return state.delayedChecks.filter(c=>c.sameDay==null || c.nextMorning==null).filter(c=>now()-c.createdAt>2*3600000);
}
function addXp(ex,log){
  if(!isSuccessful(log))return;
  if(log.additionalPlanId&&log.additionalPlanId===state.additionalPlan?.id){
    const plan=state.additionalPlan,target=doseVolume(plan.targets[ex.id]),logs=state.logs.filter(l=>l.additionalPlanId===log.additionalPlanId&&l.exerciseId===ex.id&&l.ts<=log.ts).sort((a,b)=>a.ts-b.ts);
    plan.xpLimits??={};
    if(plan.xpLimits[ex.id]==null){
      const skills=Object.keys(ex.skill_credit||{}),earlier=state.logs.filter(l=>l.ts<=log.ts&&startOfDay(l.ts)===startOfDay(log.ts)&&isSuccessful(l)&&!(l.additionalPlanId===plan.id&&l.exerciseId===ex.id));
      const count=new Set(earlier.filter(l=>Object.keys(EXMAP[l.exerciseId]?.skill_credit||{}).some(skill=>skills.includes(skill))).map(l=>l.additionalPlanId?l.additionalPlanId+':'+l.exerciseId:l.id)).size;
      plan.xpLimits[ex.id]=APP.gamification.xp.base_per_useful_dose*(APP.gamification.xp.same_skill_daily_multipliers[Math.min(count,APP.gamification.xp.same_skill_daily_multipliers.length-1)]??.15);
    }
    let used=0,useful=0;
    for(const item of logs){const volume=item.actualDose?doseVolume(item.actualDose):target;if(isSuccessful(item))useful+=Math.max(0,Math.min(volume,target-used));used+=volume;}
    const credited=logs.filter(l=>l.id!==log.id).reduce((sum,l)=>sum+(l.additionalPlanXp||0),0);
    log.additionalPlanXp=Math.max(0,Math.round(plan.xpLimits[ex.id]*clamp(useful/target))-credited);
    state.xp=(state.xp||0)+log.additionalPlanXp;return;
  }
  const skills=Object.keys(ex.skill_credit||{}),today=logsToday().filter(l=>l.id!==log.id&&isSuccessful(l));
  const count=today.filter(l=>Object.keys(EXMAP[l.exerciseId]?.skill_credit||{}).some(s=>skills.includes(s))).length;
  const mult=APP.gamification.xp.same_skill_daily_multipliers[Math.min(count,APP.gamification.xp.same_skill_daily_multipliers.length-1)]??.15;
  const completion=clamp(doseVolume(log.actualDose)/doseVolume(log.suggestedDose||ex.dose));
  state.xp=(state.xp||0)+Math.round(APP.gamification.xp.base_per_useful_dose*mult*completion);
}
function rehabWorkChecks(ts=now()){
  return stageGoalDefinitions(RDCFG.stages[0],ts).map(goal=>{
    const value=goalAchievement(goal,ts),passed=value>=goal.target&&(goal.id!=='calf'||impactDoseConfirmed('single_leg_calf_raise',10,ts));
    const label=goal.id==='toes'?'Три домашних блока по 12 шагов на носках за день':goal.label;
    return {id:goal.id==='calf'?'calf_endurance':'goal_'+goal.id,label,passed,reason:passed?'':'Нужно подтвердить цель личного базового плана: '+label,detail:passed?'Цель личного плана освоена':goal.id==='calf'?'Начальные 2×5 и один предельный тест не заменяют рабочие 2×10 с сохранением высоты и контроля':goal.id==='toes'?`Следующая веха: ${LINE_WALK_STEPS[value]}. Учитываются отдельные домашние блоки и известная нормальная реакция утром`:`Подтверждено ${Math.round(value*10)/10} из ${goal.target}; считаются сопоставимые качественные выполнения с известной нормальной реакцией утром`,progress:clamp(value/goal.target)};
  });
}
function stageRecoveryChecks(ts=now()){
  const rs=readinessSummary(ts),latest=reactionEntries(ts).at(-1),current=currentSymptoms(ts),checks=[];
  const check=(id,label,passed,reason,detail='')=>checks.push({id,label,passed:!!passed,reason:passed?'':reason,detail:detail||(passed?'Условие выполнено':reason),progress:passed?1:0});
  check('recovery','Нормальное текущее самочувствие',!safetyFlag(ts)&&!latest?.worse&&current&&responseLevel(current)==='normal'&&current.fatigue!=='high'&&current.generalFatigue!=='high'&&!rs.adverse24h,'Сначала нужна известная нормальная оценка самочувствия после отмеченной реакции или усталости');
  check('pain','Известная стабильная реакция за последние сутки',rs.pain24h!=null&&rs.pain24h<=1,'Нужна известная стабильная реакция за 24 часа'+(rs.pain24h!=null?': отмечена боль '+rs.pain24h+'/10':''));
  const morning=state.symptomReports.filter(r=>r.phase==='morning'&&r.ts<=ts&&ts-r.ts<=7*DAY&&validMorningDay(r)).at(-1);
  check('morning','Известная нормальная реакция следующим утром',morning?.historyKnown&&!morning.historyWorse&&responseLevel(morning)==='normal','Нужна известная нормальная утренняя реакция после нагрузки');
  return checks;
}
function stageTransition(targetId,ts=now()){
  const target=RDCFG.stages.find(s=>s.id===targetId);if(!target)return {target,checks:[],score:null,reasons:[]};
  const checks=stageRecoveryChecks(ts);
  const check=(id,label,passed,reason,detail='')=>checks.push({id,label,passed:!!passed,reason:passed?'':reason,detail:detail||(passed?'Условие выполнено':reason),progress:passed?1:0});
  const establishedRunning=runningEstablished(ts);
  const functional=impactCheckStatus(ts);
  if(establishedRunning&&(functional.check||functional.invalidated))check('functional_current','Нет нерешённых ограничений после функциональной проверки',functional.ready,functional.invalidated?'После нового подворачивания нужно обновить функциональную проверку':'В функциональной проверке остались неизвестные пункты или нерешённая проблема');
  if(target.order<=2&&!establishedRunning){
    checks.push(...rehabWorkChecks(ts));
    for(const [id,label] of IMPACT_CHECK_FIELDS){
      const value=functional.check?.answers?.[id],passed=!functional.invalidated&&value===true;
      check('functional_'+id,label,passed,functional.invalidated?'После нового подворачивания нужно обновить функциональную проверку':value===false?'В сохранённой проверке отмечена проблема; сначала нужно её разрешить':'Этот пункт функциональной проверки ещё не проверен',passed?`Проверено ${fmtDate(functional.check.ts)} · ${functional.check.source==='clinician'?'с реабилитологом':'по наблюдению выполнения'}`:'');
    }
  }
  if(target.order===2&&!establishedRunning){
    check('impact','Контролируемые двуногие приземления 2×5 освоены',impactDoseConfirmed('hop_to_stabilization',5,ts),'Нужны собственные повторяемые 2×5 низких двуногих приземлений с остановкой и нормальной реакцией утром');
    check('impact_reactive','Упругие двуногие прыжки 2×10 освоены',impactDoseConfirmed('bilateral_pogo',10,ts),'После приземлений: упругие 2×5 → 2×8 → 2×10, с собственными подтверждениями и нормальными утрами');
  }
  checks.push(...runningChecks(target,ts));
  return {target,checks,score:checks.length?checks.filter(c=>c.passed).length/checks.length:0,reasons:checks.filter(c=>!c.passed).map(c=>c.reason)};
}
function suggestStage(id){
  const {target,reasons}=stageTransition(id);if(!target)return;
  if(reasons.length)toast('Пока рано: '+reasons.slice(0,2).join(' · '));
  else if(confirm(`Переключить план вручную на этап "${target.name}"? Просмотри результаты измерений и реакцию на нагрузку. Проверки приложения не устанавливают готовность к бегу и не дают медицинского разрешения.`)){state.selectedStage=id;save();}
}
