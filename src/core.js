'use strict';

const EX = EXCFG.exercises;
const EXMAP = Object.fromEntries(EX.map(x => [x.id,x]));
const KEY = 'ankle_mastery_static_v2';
const DAY = 86400000;
const TEST_REPEAT_DAYS = 7;
const RULES_VERSION='load-return-2026-10-23';
// Preparation intervals are scheduling defaults, not measured physiological recovery.
const TEST_PREPARATION={
  hemisphere_hold:{preparation_channels:['ankle_control'],preparation_minutes:60,effort:'brief'},
  tandem_flat_clean_steps:{preparation_channels:['ankle_control','dynamic_balance'],preparation_minutes:90,effort:'capacity'},
  tandem_tiptoe_clean_steps:{preparation_channels:['calf','dynamic_balance'],preparation_minutes:180,effort:'capacity'},
  multidirectional_control_clean_rounds:{preparation_channels:['dynamic_balance','lateral'],preparation_minutes:360,effort:'capacity'},
  knee_to_wall:{preparation_channels:[],preparation_minutes:0,effort:'brief'},
  single_leg_calf_raise_test:{preparation_channels:['calf'],preparation_minutes:720,effort:'capacity'},
  single_leg_balance_errors:{preparation_channels:['ankle_control'],preparation_minutes:60,effort:'brief'},
  pogo_bilateral:{preparation_channels:['impact'],preparation_minutes:1440,effort:'impact'},
  single_leg_hop_basic:{preparation_channels:['impact'],preparation_minutes:1440,effort:'impact'},
  lateral_hop:{preparation_channels:['impact','lateral'],preparation_minutes:1440,effort:'impact'}
};
for(const t of RDCFG.tests)Object.assign(t,TEST_PREPARATION[t.id],{preparation_minutes:0});
const statusLabels={active:'Активен',available:'Можно добавить',available_manual:'Можно добавить',locked:'Пока недоступен',archived:'Скрыт'};
const fatigueNames={low:'лёгкая усталость',medium:'умеренная усталость',high:'сильная усталость',easy:'легко',moderate:'умеренно устал',strong:'сильно устал'};
const responseNames={better:'лучше',same:'так же',worse:'хуже'};

const skillLabels = {
  mobility:'Подвижность', calf_strength_endurance:'Икры', static_balance:'Статический баланс',
  calf_strength:'Сила икр',
  dynamic_balance:'Динамический баланс', lateral_stability:'Боковая устойчивость',
  ankle_control:'Контроль голеностопа', gait_control:'Походка', reactive_control:'Реактивный контроль',
  multidirectional_control:'Разные направления', peroneal_strength:'Малоберцовые мышцы',
  unstable_surface_control:'Нестабильная поверхность', single_leg_control:'Одноногий контроль',
  impact_control:'Ударная нагрузка', return_to_run:'Возврат к бегу'
};
const fatigueLabels = {calf:'Икры', ankle_control:'Контроль', dynamic_balance:'Баланс', lateral:'Боковая нагрузка', impact:'Ударная'};
const sourceLabels = {
  clinician_home:'Назначено домой', clinician_session:'Делалось с реабилитологом',
  home_equipment_variant:'Домашний вариант: другое оборудование',
  optional_context:'Дополнительная активность', assistant_suggested_disabled:'Дополнение, не назначенное очно'
};
const groupShort = {
  towel_straight:'Прямая', towel_bent:'Согнутая', tiptoe_static:'Носки',
  line_walk:'Линия', front_back_balance:'Баланс', side_lunge:'Выпад'
};

function defaultState(){
  const statuses = {};
  EX.forEach(x => statuses[x.id] = x.status || (x.enabled ? 'active':'available'));
  return {
    version:3, createdAt:Date.now(), logs:[], customActivities:[], testLogs:[], selfReports:[],
    assessment_sessions:[], load_events:[], last_self_report_at:null,
    delayedChecks:[], symptomReports:[], decisionLog:[], decisionFacts:[], stageProgress:{}, dailyPlans:{}, additionalPlan:null, exerciseStatuses:statuses, postponedActions:{}, xp:0, selectedStage:'rehab', settings:{}
  };
}
let state;
function migrateState(x){
  const base=defaultState();
  const out={...base,...x,stageProgress:{...(x.stageProgress||{})},version:3,exerciseStatuses:{...base.exerciseStatuses,...(x.exerciseStatuses||{})}};
  for(const id of ['hemisphere_weight_shift_injured_front','hemisphere_weight_shift_rear_heel_up'])out.exerciseStatuses[id]='archived';
  for(const k of ['logs','customActivities','testLogs','selfReports','delayedChecks','symptomReports','assessment_sessions','load_events','decisionLog','decisionFacts']){
    if(!Array.isArray(out[k]))throw new Error('Некорректная история');
  }
  out.decisionFacts=[...out.decisionFacts];
  const factIndexes=new Map(out.decisionFacts.map((fact,i)=>[JSON.stringify(fact),i]));
  out.decisionLog=out.decisionLog.map(d=>({...d,snapshot:compactDecisionSnapshot(d.snapshot,out.decisionFacts,factIndexes)}));
  if(!out.dailyPlans||typeof out.dailyPlans!=='object'||Array.isArray(out.dailyPlans))throw new Error('Некорректные дневные планы');
  out.testLogs=out.testLogs.map(l=>({...l,protocol_id:l.protocol_id||'legacy_'+l.testId}));
  // Bring linked test loads onto the same per-unit scale as the matching exercise.
  for(const event of out.load_events){
    const log=out.testLogs.find(l=>l.id===event.source_id),t=RDCFG.tests.find(t=>t.id===log?.testId);
    if(t&&log.protocol_id===t.protocol_id&&validMeasurement(t,log)&&(t.dose_exercise_id||t.metric==='cm')){
      event.base_channels=testLoad(t,log);
      const session=out.assessment_sessions.find(s=>s.test_log_ids.includes(log.id));
      const multiplier=APP.assessment.fatigue_multipliers[session?.perceived_fatigue]||1;
      event.channels=Object.fromEntries(Object.entries(event.base_channels).map(([k,v])=>[k,v*multiplier]));
    }
  }
  for(const session of out.assessment_sessions){
    const events=out.load_events.filter(e=>session.test_log_ids.includes(e.source_id));
    session.aggregate_load=Object.fromEntries(Object.keys(APP.fatigue_channels).map(k=>[k,events.reduce((n,e)=>n+(e.channels[k]||0),0)]));
  }
  out.last_self_report_at=out.last_self_report_at||out.selfReports.slice(-1)[0]?.ts||null;
  return out;
}
function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return defaultState();
    const x = JSON.parse(raw);
    const migrated=migrateState(x);
    localStorage.setItem(KEY,JSON.stringify(migrated));
    return migrated;
  }catch(e){ return defaultState(); }
}
function save(){ localStorage.setItem(KEY,JSON.stringify(state)); renderAll(); }
function mapDecisionFacts(snapshot,fact){
  const result={...snapshot};
  for(const key of ['observations','measurements','executions','activities'])if(Array.isArray(snapshot[key]))result[key]=snapshot[key].map(fact);
  for(const key of ['evidence','activityEvidence'])if(Array.isArray(snapshot[key]))result[key]=snapshot[key].map(entry=>{
    const item={...entry};
    if(entry.morning!=null)item.morning=fact(entry.morning);
    for(const field of ['reports','reactions'])if(Array.isArray(entry[field]))item[field]=entry[field].map(fact);
    return item;
  });
  return result;
}
function compactDecisionSnapshot(snapshot,pool,indexes=new Map(pool.map((fact,i)=>[JSON.stringify(fact),i]))){
  if(!snapshot||snapshot.format==='facts-v1')return snapshot;
  // Facts are immutable copies shared across decisions; references preserve order and duplicates.
  return {...mapDecisionFacts(snapshot,value=>{
    const key=JSON.stringify(value);
    if(!indexes.has(key)){indexes.set(key,pool.length);pool.push(JSON.parse(key));}
    return indexes.get(key);
  }),format:'facts-v1'};
}
function decisionSnapshot(decision,source=state){
  if(decision.snapshot?.format!=='facts-v1')return decision.snapshot;
  const {format,...snapshot}=decision.snapshot;
  return mapDecisionFacts(snapshot,i=>source.decisionFacts[i]);
}
function recordDecision(action,reason,details={},ts=now(),key=null){
  if(key&&state.decisionLog.some(d=>d.key===key))return;
  const observations=reportedSymptoms(ts).sort((a,b)=>a.ts-b.ts).slice(-3);
  const measurements=RDCFG.tests.map(t=>currentMeasurement(t,ts)).filter(Boolean);
  const ids=details.exerciseId?[details.exerciseId,...(details.relatedExerciseIds||[])]:Object.keys(details.targets||details.original||{});
  const executions=state.logs.filter(l=>l.ts<=ts&&ts-l.ts<=30*DAY&&ids.includes(l.exerciseId));
  const reactions=reactionEntries(ts);
  const evidence=executions.map(l=>{const morning=morningFor(l,ts);return {logId:l.id,morning:morning||null,reports:observationsFor(l,ts),reactions:reactions.filter(r=>r.ts>=l.ts&&r.ts<=(morning?.ts||l.ts))};});
  const activities=details.activityMode?state.customActivities.filter(a=>a.ts<=ts&&ts-a.ts<=30*DAY&&a.running):state.customActivities.filter(a=>a.ts<=ts).slice(-3);
  const activityEvidence=activities.map(a=>({activityId:a.id,morning:morningFor(a,ts)||null}));
  const snapshot=compactDecisionSnapshot({observations,measurements,executions,evidence,activities,activityEvidence},state.decisionFacts);
  const event={id:makeId('d'),version:RULES_VERSION,ts,action,reason,key,details,snapshot};
  state.decisionLog.push(JSON.parse(JSON.stringify(event)));
}
function endAdditionalPlan(plan,ts,reason){
  plan.endedAt=ts;plan.endedReason=reason;
  recordDecision('plan_ended',reason,{planId:plan.id,targets:plan.targets,limits:plan.limits},ts,'end:'+plan.id);
}
// Reuse history calculations within one synchronous action; release them afterwards.
let historyCache=null;
function withHistoryCache(render){
  if(historyCache)return render();
  historyCache={ts:Date.now(),values:new Map()};
  try{return render();}finally{historyCache=null;}
}
function historyValue(key,calculate){
  if(!historyCache)return calculate();
  if(!historyCache.values.has(key))historyCache.values.set(key,calculate());
  return historyCache.values.get(key);
}
function now(){ return historyCache?.ts??Date.now(); }
function startOfDay(ts=now(),hour=5){
  const d=new Date(ts);if(d.getHours()<hour)d.setDate(d.getDate()-1);
  d.setHours(hour,0,0,0);return d.getTime();
}
function nextDayStart(ts,hour=5){const d=new Date(startOfDay(ts,hour));d.setDate(d.getDate()+1);return d.getTime();}
function daysAgo(n){const d=new Date(startOfDay());d.setDate(d.getDate()-n);return d.getTime();}
function fmtTime(ts){ return new Date(ts).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); }
function fmtDate(ts){ return new Date(ts).toLocaleDateString('ru-RU',{day:'2-digit',month:'short'}); }
function clamp(v,a=0,b=1){ return Math.max(a,Math.min(b,v)); }
function pct(v){ return Math.round(clamp(v)*100); }
function esc(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function countWord(n,one,few,many){
  const mod=n%100;return mod>=11&&mod<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;
}
function doseNumbers(ex,d=ex.dose||{}){
  switch(d.type){
    case 'duration': return `${d.target_sec||60} сек`;
    case 'hold_reps': return `${d.reps||1} × ${d.hold_sec||5} сек`;
    case 'steps': return `${d.target_steps||12} ${countWord(d.target_steps||12,'шаг','шага','шагов')}`;
    case 'cycles': return `${d.cycles||5} ${countWord(d.cycles||5,'цикл','цикла','циклов')}`;
    case 'duration_sets': return `${d.sets||1} × ${d.target_sec||30} сек`;
    case 'directional_rounds': return `${d.rounds||2} ${countWord(d.rounds||2,'круг','круга','кругов')} × ${d.directions||4} направления`;
    case 'reps_sets': return `${d.sets||2} × ${d.reps||10} повт.${d.sides===2?' на каждую ногу':''}`;
    case 'directional_reps': return `${d.sets||2} × ${d.reps_per_direction||3} в каждом направлении`;
    case 'passes': return `${d.passes||3} ${countWord(d.passes||3,'проход','прохода','проходов')}`;
    default: return 'по технике';
  }
}
const doseOptions={
  band_eversion:{key:'resistance',label:'Резинка',values:[['current','Привычное сопротивление'],['next','Следующее сопротивление']]},
  assisted_single_leg_calf_raise:{key:'support',label:'Помощь руками',values:[['usual','Привычная помощь'],['light','Лёгкая помощь'],['none','Только равновесие']]},
  weighted_calf_raise:{key:'weight_kg',label:'Дополнительный вес',values:[['1','1 кг'],['2','2 кг'],['3','3 кг']]},
  bilateral_tiptoe_static:{key:'weight_distribution',label:'Распределение веса',values:[['even','Вес поровну'],['right_bias','Больше веса на правой']]},
  right_leg_balance_left_front_back:{key:'support',label:'Помощь свободной ногой',values:[['usual','Привычная опора'],['light','Лёгкое касание'],['none','Без помощи']]},
  left_side_lunge_right_leg_straight:{key:'range',label:'Амплитуда',values:[['usual','Привычная амплитуда'],['increased','Чуть больше, с контролем']]}
};
function doseText(ex,d=ex.dose||{}){
  const option=doseOptions[ex.id],value=option&&d[option.key];
  return doseNumbers(ex,d)+(value?' · '+(option.key==='weight_kg'?value+' кг':option.values.find(x=>x[0]===value)?.[1]||value): '');
}
const doseFields={
  duration:[['target_sec','Секунды']], hold_reps:[['reps','Повторения'],['hold_sec','Удержание, секунд'],['sets','Подходы']],
  steps:[['target_steps','Шаги']], cycles:[['cycles','Циклы']],
  duration_sets:[['target_sec','Секунды в подходе'],['sets','Подходы']],
  directional_rounds:[['rounds','Круги']], reps_sets:[['reps','Повторения в подходе'],['sets','Подходы']],
  directional_reps:[['reps_per_direction','Повторения в каждом направлении'],['sets','Подходы']], passes:[['passes','Проходы']]
};
function doseVolume(d){
  const sets=d.sets||1;
  switch(d.type){
    case 'duration': case 'duration_sets': return d.target_sec*sets;
    case 'hold_reps': return d.reps*d.hold_sec*sets;
    case 'steps': return d.target_steps*sets;
    case 'cycles': return d.cycles*((d.front_hold_sec||0)+(d.back_hold_sec||0)||1)*sets;
    case 'directional_rounds': return d.rounds*(d.directions||4);
    case 'reps_sets': return d.reps*sets*(d.sides||1);
    case 'directional_reps': return d.reps_per_direction*(d.directions?.length||3)*sets;
    case 'passes': return d.passes;
    default: return 1;
  }
}
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ankle-mastery-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function importData(file){
  const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x||!Array.isArray(x.logs))throw new Error();const migrated=migrateState(x);localStorage.setItem(KEY,JSON.stringify(migrated));state=migrated;renderAll();toast('Данные импортированы');}catch(e){toast('Не удалось прочитать резервную копию')}};r.readAsText(file);
}
function resetData(){if(confirm('Удалить всю историю Ankle Mastery на этом устройстве?')){localStorage.removeItem(KEY);state=defaultState();save();toast('История удалена');}}
