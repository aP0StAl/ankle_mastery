'use strict';

const RUN_DEFAULTS={runMinutes:4,walkMinutes:8,intervals:4,continuousMinutes:4,confirmations:3,maxAgeDays:30,walkBaselineMinutes:20};
function runningPlan(){return {...RUN_DEFAULTS,...state.settings.runningPlan};}
function successfulActivity(a,ts=now()){
  const morning=morningFor(a,ts);
  return a.painAfter<=1&&['same','better'].includes(a.response)&&!a.swelling&&!a.instability&&
    !!morning&&morning.historyKnown&&!morning.historyWorse&&responseLevel(morning)==='normal'&&morning.fatigue!=='high'&&!['medium','high'].includes(morning.generalFatigue)&&
    !reactionEntries(ts).some(r=>r.ts>=a.ts&&r.ts<=morning.ts&&(r.worse||r.historyWorse||r.pain>=3||r.swelling||r.instability));
}
function runTemplate(mode){
  const templates={
    speed:{runMinutes:40/60,walkMinutes:3,intervals:4,longestContinuous:10/60,surface:'level',detail:'4 × 10 сек плавного ускорения · между минутой ходьбы'},
    uphill:{runMinutes:1,walkMinutes:1.5,intervals:2,longestContinuous:.5,surface:'uphill',gradePercent:3,detail:'2 × 30 сек на подъёме 3–5% · восстановление ходьбой, спуск шагом'},
    downhill:{runMinutes:40/60,walkMinutes:1.5,intervals:2,longestContinuous:20/60,surface:'downhill',gradePercent:2,detail:'2 × 20 сек на спуске 2–3% · между 90 сек ходьбы'},
    direction:{runMinutes:40/60,walkMinutes:3,intervals:4,longestContinuous:10/60,surface:'level',detail:'4 × 10 сек по широким плавным дугам · между минутой ходьбы'}
  };
  return templates[mode]||null;
}
function runConditionsMatch(a){
  const r=a.running,template=runTemplate(r.mode);
  if(r.quality!=='good')return false;
  if(!template)return r.surface==='level';
  if(r.surface!==template.surface)return false;
  if(r.mode==='uphill')return r.gradePercent>=3&&r.gradePercent<=5;
  if(r.mode==='downhill')return r.gradePercent>=2&&r.gradePercent<=3;
  return true;
}
function runTemplateCompleted(a,mode){
  const t=runTemplate(mode),r=a.running;
  return !t||r.runMinutes+1e-6>=t.runMinutes&&r.intervals>=t.intervals&&r.longestContinuous+1e-6>=t.longestContinuous;
}
function runWalkCompleted(a,plan=runningPlan()){
  const r=a.running;
  return r?.mode==='run_walk'&&r.runMinutes>=plan.runMinutes&&r.runMinutes/r.intervals>=1&&r.longestContinuous>=1&&r.longestContinuous*r.intervals+1e-6>=r.runMinutes&&r.walkMinutes/r.runMinutes<=2;
}
function successfulRuns(mode,ts=now(),spacedTrials=true){
  const attempts=state.customActivities.filter(a=>a.ts<=ts&&a.running?.mode===mode).sort((a,b)=>a.ts-b.ts),passed=a=>runConditionsMatch(a)&&successfulActivity(a,ts);
  if(attempts.length&&!passed(attempts.at(-1)))return [];
  let matches=[];
  for(const a of attempts){if(passed(a))matches.push(a);else if(a.response==='worse'||a.painAfter>1||a.swelling||a.instability||!runConditionsMatch(a)||morningFor(a,ts))matches=[];}
  const spaced=[];for(const a of matches)if(!spaced.length||startOfDay(a.ts)>=trainingDayOffset(startOfDay(spaced.at(-1).ts),spacedTrials?2:1))spaced.push(a);
  return spaced;
}
function runningEstablished(ts=now(),after=-Infinity){
  return currentStage().order>=2&&(successfulRuns('run_walk',ts).filter(a=>a.ts>after&&runWalkCompleted(a)).length>=3||successfulRuns('continuous',ts).filter(a=>a.ts>after&&a.running.longestContinuous>=runningPlan().continuousMinutes).length>=3);
}
function runningWeekEvidence(plan,ts=now()){
  const configured=[plan.targetMinutes,plan.sessionsPerWeek,plan.weekMinutes].every(v=>Number.isFinite(v)&&v>0),successful=successfulRuns('continuous',ts,false),end=startOfDay(ts);
  return [0,1].map(week=>{
    const to=trainingDayOffset(end,-7*week),from=trainingDayOffset(to,-7),runs=successful.filter(a=>a.ts>=from&&a.ts<to),minutes=runs.reduce((n,a)=>n+a.running.runMinutes,0),longest=Math.max(0,...runs.map(a=>a.running.longestContinuous));
    const fraction=configured?Math.min(1,runs.length/plan.sessionsPerWeek,minutes/plan.weekMinutes,longest/plan.targetMinutes):0;
    return {from,to,runs:runs.length,minutes,longest,fraction,passed:fraction>=1};
  });
}
function runningChecks(target,ts=now()){
  const plan=runningPlan(),checks=[];
  const check=(id,label,passed,detail)=>checks.push({id,label,passed:!!passed,reason:passed?'':detail,detail,progress:passed?1:0});
  if(target.order===2){
    check('run_permission','Пробный бег разрешён',plan.runPermitted,'Разрешение бега сохраняется один раз в параметрах бегового плана');
    const walking=state.customActivities.filter(a=>a.presetId==='general_walk'&&a.ts<=ts&&a.minutes>=plan.walkBaselineMinutes&&successfulActivity(a,ts));
    const gait=impactCheckStatus(ts);
    check('walking','Обычная ходьба переносится без хромоты и ухудшения',!gait.invalidated&&(gait.check?.answers.gait===true||gait.check?.answers.gait!==false&&walking.length),'Используем известную переносимую прогулку или сохранённую функциональную проверку; после подворачивания или отмеченной проблемы нужна её новая оценка');
  }
  if(target.order===3){
    const intervals=successfulRuns('run_walk',ts).filter(a=>runWalkCompleted(a,plan));
    check('run_walk','Стартовый бег с ходьбой повторяется переносимо',intervals.length>=plan.confirmations,`${intervals.length}/${plan.confirmations} проб: от ${plan.runMinutes} мин бега, отрезки в среднем не короче минуты, ходьбы не больше двух минут на минуту бега; утро обычное`);
    const runs=successfulRuns('continuous',ts).filter(a=>a.running.longestContinuous>=plan.continuousMinutes);
    check('continuous','Непрерывный лёгкий бег проверен',runs.length>=plan.confirmations,`${runs.length}/${plan.confirmations} проб по ${plan.continuousMinutes} мин непрерывно с днём между ними и нормальным утром`);
  }
  if(target.order>=4){
    const configured=[plan.targetMinutes,plan.sessionsPerWeek,plan.weekMinutes].every(v=>Number.isFinite(v)&&v>0);
    check('running_target','Сохранён привычный беговой объём',configured,'Один раз укажи длительность пробежки, число за неделю и недельные минуты');
    runningWeekEvidence(plan,ts).forEach((week,i)=>check('running_week_'+i,`Привычный объём: ${i===0?'последние':'предыдущие'} 7 дней`,week.passed,`${week.runs} пробежек · ${week.minutes} мин · самая длинная ${week.longest} мин; нужны ${plan.sessionsPerWeek||'—'} / ${plan.weekMinutes||'—'} / ${plan.targetMinutes||'—'}`));
  }
  if(target.order===5){
    const modes=plan.challenges||[];
    check('running_challenges','Выбрана нужная сложная нагрузка',modes.length,Array.isArray(state.settings.runningPlan?.challenges)&&!modes.length?'Этот этап не нужен моему плану: после подтверждения обычного объёма цель выполнена':'Скорость, подъёмы и смены направления необязательны; один раз укажи, нужны ли они в параметрах бега');
    for(const mode of modes){const runs=successfulRuns(mode,ts).filter(a=>runTemplateCompleted(a,mode));check('run_'+mode,'Проверено: '+runModeName(mode),runs.length>=plan.confirmations,`${runs.length}/${plan.confirmations} отдельных проб по формату: ${runTemplate(mode)?.detail||''}, с нормальным утром`);}
  }
  return checks;
}
function runModeName(mode){return {run_walk:'Бег с ходьбой',continuous:'Непрерывный спокойный бег',speed:'Более быстрый бег',uphill:'Подъёмы',downhill:'Спуски',direction:'Смена направления'}[mode]||mode;}
function runRecommendation(ts=now()){
  const stage=currentStage(),plan=runningPlan();if(stage.order<2)return null;
  if(!plan.runPermitted)return {kind:'run',mode:'settings',name:'Уточнить беговой план один раз',detail:'Разрешение и нужный объём бега',status:'green',score:1,reasons:['Без сохранённого разрешения пробный бег не назначаем']};
  const gate=stageTransition('ready_for_run_walk',ts);if(gate.reasons.length)return null;
  const current=currentSymptoms(ts);if(safetyFlag(ts)||!current||responseLevel(current)!=='normal'||additionalLightState(current))return null;
  const runs=state.customActivities.filter(a=>a.running&&a.ts<=ts).sort((a,b)=>a.ts-b.ts),last=runs.at(-1),day=startOfDay(ts);
  const durationStable=plan.targetMinutes&&successfulRuns('continuous',ts).filter(a=>a.running.longestContinuous>=plan.targetMinutes).length>=3;
  const restDays=stage.order>=3&&durationStable?1:2;
  if(last&&(day<trainingDayOffset(startOfDay(last.ts),restDays)||ts-last.ts<DAY))return null;
  if(runs.filter(a=>a.ts>=trainingDayOffset(day,-6)).length>=(durationStable?plan.sessionsPerWeek||3:Math.min(3,plan.sessionsPerWeek||3)))return null;
  let mode='run_walk',minutes=plan.runMinutes;
  if(stage.order>=3||successfulRuns('run_walk',ts).filter(a=>runWalkCompleted(a,plan)).length>=plan.confirmations){mode='continuous';minutes=plan.continuousMinutes;}
  if(stage.order>=3){
    const known=successfulRuns('continuous',ts),previous=known.at(-1);
    if(previous&&ts-previous.ts<=14*DAY){minutes=previous.running.longestContinuous;const same=known.filter(a=>a.running.longestContinuous===minutes);if(same.length>=3&&plan.targetMinutes>minutes)minutes++;}
    if(plan.targetMinutes)minutes=Math.min(minutes,plan.targetMinutes);
  }
  if(stage.order>=4&&(plan.challenges||[]).length){mode=plan.challenges.find(mode=>successfulRuns(mode,ts).length<plan.confirmations)||'continuous';minutes=mode==='continuous'?plan.targetMinutes||minutes:runTemplate(mode).runMinutes;}
  const detail=runTemplate(mode)?.detail||(mode==='run_walk'?`${plan.intervals} × 1 мин бега / 2 мин ходьбы`:`${minutes} мин · ${runModeName(mode)}`);
  return {kind:'run',mode,minutes,template:runTemplate(mode),name:'Следующая пробежка: '+runModeName(mode),detail,status:'green',score:.95,reasons:['Небольшая проба приложения. Меняем одну характеристику; реакцию следующим утром берём из общей проверки']};
}
function recordRun(values,ts=now()){
  const {mode,runMinutes,walkMinutes=0,intervals=1,longestContinuous,rpe,surface='level',quality='good',painAfter=0,response='same',swelling=false,instability=false,gradePercent=null}=values;
  if(!['run_walk','continuous','speed','uphill','downhill','direction'].includes(mode)||![runMinutes,longestContinuous,rpe,walkMinutes,intervals,painAfter].every(Number.isFinite)||runMinutes<=0||runMinutes>240||longestContinuous<=0||longestContinuous>runMinutes||rpe<1||rpe>10||walkMinutes<0||intervals<1||!Number.isInteger(intervals)||painAfter<0||painAfter>10)throw new Error('Проверь минуты бега, отрезки и усилие');
  if(!['level','uneven','uphill','downhill'].includes(surface)||gradePercent!=null&&(!Number.isFinite(gradePercent)||gradePercent<0||gradePercent>100))throw new Error('Проверь поверхность и фактический уклон');
  if(mode==='continuous'&&(intervals!==1||longestContinuous!==runMinutes||walkMinutes!==0))throw new Error('Непрерывный бег записывается одним отрезком без ходьбы');
  const a={id:makeId('a'),ts,presetId:'run',name:runModeName(mode),minutes:runMinutes+walkMinutes,painAfter,response,swelling,instability,running:{mode,runMinutes,walkMinutes,intervals,longestContinuous,rpe,surface,quality,gradePercent},load:{calf:runMinutes*2,ankle_control:runMinutes,dynamic_balance:runMinutes,impact:runMinutes*2,lateral:mode==='direction'?runMinutes:0}};
  const generalFatigue=currentSymptoms(ts)?.generalFatigue||'unknown';
  state.customActivities.push(a);recordSymptoms({pain:painAfter,steadiness:instability?'giving_way':'steady',fatigue:values.fatigue||'low',generalFatigue,response,swelling},'combined',ts);
  recordDecision('run_recorded','Фактическая пробежка записана; подтверждение зависит от общей утренней реакции',{activityId:a.id,actual:a.running,painAfter,response},ts);return a;
}
function openRunningPlan(){
  const p=runningPlan();
  document.getElementById('activityModal').innerHTML=`<div class="modal-head"><h3>Мой беговой план</h3><button class="x" onclick="AM.close('activityDialog')">×</button></div><p class="notice">Сохраняется один раз, меняется при изменении плана. Первые пробы: 4×1 мин бега / 2 мин ходьбы, затем 4 мин непрерывно. Это настройки приложения. Привычный объём не угадываем.</p><label><input id="runPermitted" type="checkbox" ${p.runPermitted?'checked':''}> Пробный бег мне уже разрешён</label>${[['targetMinutes','Обычная пробежка, минут'],['sessionsPerWeek','Пробежек в неделю'],['weekMinutes','Минут бега за неделю']].map(([id,label])=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" type="number" min="1" max="${id==='sessionsPerWeek'?7:1680}" value="${p[id]||''}"></div>`).join('')}<div class="field"><label>Что нужно после спокойного объёма?</label>${['speed','uphill','downhill','direction'].map(mode=>`<label><input type="checkbox" id="challenge_${mode}" ${(p.challenges||[]).includes(mode)?'checked':''}> ${runModeName(mode)}</label>`).join('')}</div><button class="btn primary" onclick="AM.saveRunningPlan()">Сохранить</button>`;showDialog('activityDialog');
}
function saveRunningPlan(){
  const p={...runningPlan(),runPermitted:document.getElementById('runPermitted').checked,challenges:['speed','uphill','downhill','direction'].filter(mode=>document.getElementById('challenge_'+mode).checked)};
  for(const key of ['targetMinutes','sessionsPerWeek','weekMinutes']){const raw=document.getElementById(key).value;p[key]=raw===''?null:Number(raw);if(raw!==''&&(!Number.isFinite(p[key])||p[key]<=0))return toast('Укажи положительное число');}
  if(p.sessionsPerWeek>7||p.sessionsPerWeek!=null&&!Number.isInteger(p.sessionsPerWeek)||p.targetMinutes>240||p.weekMinutes>p.targetMinutes*p.sessionsPerWeek)return toast('Проверь объём: число пробежек — от 1 до 7; недельные минуты не больше суммы пробежек');
  state.settings.runningPlan=p;closeDialog('activityDialog');save();
}
function openRun(mode=null){
  const previous=state.customActivities.filter(a=>a.running).at(-1)?.running,rec=runRecommendation(),p=runningPlan(),chosen=mode||(rec?.mode!=='settings'?rec?.mode:null)||previous?.mode||'run_walk';
  const remembered=previous?.mode===chosen?previous:null,minutes=rec?.mode===chosen?rec.minutes:remembered?.runMinutes||p.runMinutes;
  const r={mode:chosen,runMinutes:minutes,walkMinutes:remembered?.walkMinutes??(chosen==='run_walk'?8:0),intervals:remembered?.intervals||(chosen==='run_walk'?4:1),longestContinuous:chosen==='run_walk'?remembered?.longestContinuous||1:minutes,rpe:remembered?.rpe||3,surface:remembered?.surface||'level',quality:remembered?.quality||'good'};
  if(runTemplate(chosen))Object.assign(r,runTemplate(chosen),remembered||{},rec?.mode===chosen?rec.template:{});
  recordDecision('run_offered',rec?.mode===chosen?rec.reasons[0]:'Выбран вид пробежки для записи. Доза прежнего вида бега не переносится',{activityMode:chosen,proposed:r,plan:p},now(),'run-offer:'+startOfDay()+':'+JSON.stringify(r));localStorage.setItem(KEY,JSON.stringify(state));
  document.getElementById('activityModal').innerHTML=`<div class="modal-head"><h3>Записать пробежку</h3><button class="x" onclick="AM.close('activityDialog')">×</button></div><div class="field"><label>Вид бега</label><select id="runMode" onchange="AM.openRun(this.value)">${['run_walk','continuous','speed','uphill','downhill','direction'].map(m=>`<option value="${m}" ${m===chosen?'selected':''}>${runModeName(m)}</option>`).join('')}</select></div>${runTemplate(chosen)?`<div class="notice">${esc(runTemplate(chosen).detail)}. Укажи фактически сделанное.</div>`:''}${[['runMinutes','Всего бежал, минут'],['walkMinutes','Ходьба между отрезками, минут'],['intervals','Беговых отрезков'],['longestContinuous','Самый длинный отрезок бега, минут'],['rpe','Усилие, 1–10']].map(([key,label])=>`<div class="field"><label for="run_${key}">${label}</label><input id="run_${key}" type="number" step="${key==='intervals'||key==='rpe'?1:'any'}" value="${r[key]}"></div>`).join('')}<div class="field"><label>Поверхность</label><select id="runSurface">${[['level','Ровная предсказуемая'],['uphill','Подъём'],['downhill','Спуск'],['uneven','Неровная']].map(([v,n])=>`<option value="${v}" ${v===r.surface?'selected':''}>${n}</option>`).join('')}</select></div>${['uphill','downhill'].includes(chosen)?`<div class="field"><label for="runGrade">Фактический уклон, %</label><input id="runGrade" type="number" min="0" max="100" step="0.5" value="${r.gradePercent??''}"></div>`:''}<div class="field"><label>Движения</label><select id="runQuality"><option value="good">Хорошее качество</option><option value="poor" ${r.quality==='poor'?'selected':''}>Терял контроль / менялась походка</option></select></div><div class="field"><label>Боль после, 0–10</label><input id="runPain" type="number" value="${currentSymptoms()?.pain||0}"></div><div class="field"><label>После пробежки</label><select id="runResponse"><option value="same">Как обычно</option><option value="better">Лучше</option><option value="worse">Хуже</option></select></div><label><input id="runSwelling" type="checkbox"> Новый отёк</label> <label><input id="runInstability" type="checkbox"> Подворачивание</label><p class="notice">Записывай фактически сделанное. Утром будет одна общая проверка для всей нагрузки.</p><button class="btn primary" onclick="AM.saveRun()">Сохранить пробежку</button>`;showDialog('activityDialog');
}
function saveRun(){
  const values=Object.fromEntries(['runMinutes','walkMinutes','intervals','longestContinuous','rpe'].map(k=>[k,Number(document.getElementById('run_'+k).value)]));
  Object.assign(values,{mode:document.getElementById('runMode').value,surface:document.getElementById('runSurface').value,gradePercent:['uphill','downhill'].includes(document.getElementById('runMode').value)?Number(document.getElementById('runGrade').value):null,quality:document.getElementById('runQuality').value,painAfter:Number(document.getElementById('runPain').value),response:document.getElementById('runResponse').value,swelling:document.getElementById('runSwelling').checked,instability:document.getElementById('runInstability').checked});
  try{recordRun(values);}catch(e){return toast(e.message);}closeDialog('activityDialog');save();toast('Пробежка записана; утром — общая проверка');
}
