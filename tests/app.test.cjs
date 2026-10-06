// No build step or third-party dependencies: node --test tests/app.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const KEY='ankle_mastery_static_v2';
const plain=x=>JSON.parse(JSON.stringify(x));
const comfortable={painDuring:0,painAfter:0,fatigue:'low',technique:'good',steadiness:'steady',instability:false,swelling:false,difficulty:'normal'};
function app(saved,clock=null){
  const storage=new Map(saved?[[KEY,JSON.stringify(saved)]]:[]),elements=new Map();
  const get=id=>{
    if(!elements.has(id)){
      const config=html.match(new RegExp('id="'+id+'">(.*?)</script>'));
      const classes=new Set(),handlers={};
      elements.set(id,{textContent:config?config[1]:'',value:'',innerHTML:'',style:{setProperty(){}},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){if(on??!classes.has(k))classes.add(k);else classes.delete(k);}},appendChild(){},insertAdjacentHTML(_,s){this.innerHTML+=s;},open:false,showModal(){this.open=true;},close(){this.open=false;handlers.close?.();},addEventListener(k,fn){handlers[k]=fn;},querySelector(){return this.focused||null;},click(){}});
    }
    return elements.get(id);
  };
  const dialogs=[...html.matchAll(/<dialog id="(.*?)"/g)].map(m=>get(m[1]));
  const context={document:{body:get('body'),getElementById:get,querySelector:q=>q==='dialog[open]'?dialogs.find(d=>d.open)||null:null,querySelectorAll:q=>q==='dialog'?dialogs:[],createElement:()=>({click(){}})},window:{scrollY:0,scrollTo({top}){this.scrollY=top;this.restoredScrollY=top;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},Date:clock==null?Date:class extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}},Math,JSON,Number,Object,Array,Set,Infinity,Blob,URL,setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,confirm:()=>false};
  const code=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('\nrenderAll();\nsetInterval(renderHome,15*60*1000);',`
    window.dev={startOfDay,nextDayStart,daysAgo,xpAndStreak,renderAll,closeDialog,showDialog,noRecommendationHTML,defaultState,migrateState,recordTest,completeAssessment,recalculateSession,testLoad,testHistory,symmetry,fatigueAt,allLoadEvents,prescriptionCounts,exerciseMastery,trainingMastery,readinessSummary,scoreExercise,scoreExerciseAtTime,recommendations,testRecommendations,actionRecommendations,postponeAction,resumeAction,postponedUntil,pendingAssessmentChecks,safetyFlag,assessmentSymptomModifier,selfReportDue,importData,exportData,saveTest,saveSelfReport,renderHome,renderTests,suggestedDose,exerciseProgress,exerciseResponse,confirmedSafe,dailyLoadPlan,currentSymptoms,recordExercise,recordSymptoms,classifyLog,isSuccessful,dailyTarget,openLog,saveLog,openSymptoms,saveSymptoms,openCheck,saveCheck,openMorning,saveMorning,pendingMorningDays,openExercise,renderStats,EXMAP,RDCFG,APP,getState:()=>state,setState:x=>state=x};
  `);
  vm.runInNewContext(code,context);
  return {dev:context.window.dev,storage,get,context};
}
function assessmentScenario(d,ts=Date.now()){
  d.recordTest('hemisphere_hold',{left:30,right:15},ts);
  d.recordTest('tandem_tiptoe_clean_steps',{value:100},ts);
  const s=d.recordTest('multidirectional_control_clean_rounds',{value:3},ts);
  d.completeAssessment(s,{perceived_fatigue:'moderate',pain_after:0,instability:false,swelling:false},ts);
  return s;
}
test('requested assessment increases fatigue and lowers overlap without training credit',()=>{
  const {dev:d}=app(),ts=Date.now();
  const before={fatigue:plain(d.fatigueAt(ts)),counts:plain(d.prescriptionCounts()),mastery:plain(Object.fromEntries(Object.entries(d.EXMAP).map(([k,x])=>[k,d.exerciseMastery(x)]))),tm:d.trainingMastery(),heavy:d.scoreExercise(d.EXMAP.single_leg_calf_raise)};
  d.getState().exerciseStatuses.single_leg_calf_raise='active';
  const initial=d.scoreExercise(d.EXMAP.single_leg_calf_raise,ts);
  const s=assessmentScenario(d,ts),after=d.fatigueAt(ts),heavy=d.scoreExercise(d.EXMAP.single_leg_calf_raise,ts);
  for(const k of ['calf','ankle_control','dynamic_balance','lateral'])assert.ok(after[k]>before.fatigue[k],k);
  assert.equal(after.impact,0);
  assert.ok(heavy.score<initial.score*.65);
  assert.notEqual(d.recommendations()[0].ex.id,'tiptoe_square_corner_lunges');
  assert.equal(d.scoreExercise(d.EXMAP.towel_stretch_straight_knee,ts).status,'green');
  assert.equal(d.scoreExercise(d.EXMAP.slider_injured_leg_three_directions,ts).status,'red'); // Shared control load has filled the daily budget.
  assert.deepEqual(plain(d.prescriptionCounts()),before.counts);
  assert.deepEqual(plain(Object.fromEntries(Object.entries(d.EXMAP).map(([k,x])=>[k,d.exerciseMastery(x)]))),before.mastery);
  assert.equal(d.trainingMastery(),before.tm);
  assert.equal(d.getState().logs.length,0);assert.equal(d.getState().xp,0);
  assert.equal(d.getState().assessment_sessions.length,1);assert.equal(s.test_log_ids.length,3);
  assert.equal(d.getState().load_events.length,3);assert.equal(d.testHistory(d.RDCFG.tests[0]).length,1);
  assert.ok(d.readinessSummary().domainScores.sensorimotor_control>0);
  assert.ok(d.fatigueAt(ts+8*3600000).calf<after.calf);
  assert.ok(d.getState().testLogs.every(l=>d.getState().load_events.some(e=>e.id===l.generated_load_event_id&&e.source_id===l.id&&e.source_type==='test')));
});
test('migration preserves all v2 history, unknown fields and protocol isolation',()=>{
  const old={version:2,logs:[{id:'l1',ts:Date.now(),exerciseId:'tandem_walk_tiptoe',painAfter:0}],testLogs:[{id:'old',testId:'hemisphere_hold',left:30,right:15,ts:Date.now()-1000}],selfReports:[{ts:123,trust:8,fear:2,ready:5}],customActivities:[{id:'a1',ts:Date.now(),load:{calf:10}}],delayedChecks:[{id:'c1'}],exerciseStatuses:{single_leg_calf_raise:'active'},xp:42,selectedStage:'rehab',unknown:{preserve:true}};
  const {dev:d,storage}=app(old),m=d.getState();
  assert.equal(m.version,3);
  for(const key of ['logs','selfReports','customActivities','delayedChecks','unknown'])assert.deepEqual(plain(m[key]),old[key]);
  assert.equal(m.xp,42);assert.equal(m.exerciseStatuses.single_leg_calf_raise,'active');
  assert.equal(m.testLogs[0].protocol_id,'legacy_hemisphere_hold');
  assert.equal(d.testHistory(d.RDCFG.tests[0]).length,0);assert.equal(d.allLoadEvents().length,2);
  assert.equal(m.last_self_report_at,123);assert.equal(JSON.parse(storage.get(KEY)).version,3);
  assert.deepEqual(plain(d.migrateState(m)),plain(m));
  d.recordTest('hemisphere_hold',{left:30,right:24});assert.equal(d.testHistory(d.RDCFG.tests[0])[0].right,24);
  assert.equal(d.testHistory(d.RDCFG.tests[0],'legacy_hemisphere_hold')[0].right,15);
});
test('volume caps, explicit zero, invalid inputs, and zero-error symmetry',()=>{
  const {dev:d}=app();
  d.recordTest('tandem_tiptoe_clean_steps',{value:200});assert.equal(d.getState().testLogs[0].value,100);
  d.recordTest('hemisphere_hold',{left:50,right:40});assert.equal(d.getState().testLogs[1].right,30);
  d.recordTest('single_leg_balance_errors',{left:0,right:0});assert.equal(d.symmetry(d.RDCFG.tests[5],{left:0,right:0}),1);
  d.recordTest('multidirectional_control_clean_rounds',{value:0});
  for(const value of [-1,NaN,Infinity,1.5])assert.throws(()=>d.recordTest('tandem_tiptoe_clean_steps',{value}));
  assert.throws(()=>d.recordTest('pogo_bilateral',{value:10}));
  const t=d.RDCFG.tests[2];assert.equal(d.testLoad(t,{value:10000}).calf,d.APP.assessment.nominal_load*t.test_load_vector.calf*1.5);
});
test('one session per series, multiplier applied once, and one next-morning check',()=>{
  const {dev:d}=app(),ts=Date.now()-86400000;
  const s=assessmentScenario(d,ts),base=s.aggregate_load.calf;
  d.completeAssessment(s,{perceived_fatigue:'strong'},ts);assert.equal(s.aggregate_load.calf,base*1.25);
  d.recalculateSession(s);assert.equal(s.aggregate_load.calf,base*1.25);
  const same=d.recordTest('hemisphere_hold',{left:30,right:15},ts+30*60000);assert.equal(same.id,s.id);
  assert.equal(d.pendingAssessmentChecks().length,1);
  const next=d.recordTest('hemisphere_hold',{left:30,right:15},ts+91*60000);assert.notEqual(next.id,s.id);
});
test('pain, swelling, instability and delayed worsening restrict load and safety progression',()=>{
  const {dev:d}=app(),ts=Date.now(),s=assessmentScenario(d,ts),ex=d.EXMAP.tiptoe_square_corner_lunges;
  d.completeAssessment(s,{pain_after:4},ts);assert.ok(d.assessmentSymptomModifier(ex)<1);assert.equal(d.safetyFlag(),false);
  d.completeAssessment(s,{pain_after:0,next_day_response:'worse'},ts);assert.ok(d.assessmentSymptomModifier(ex)<1);
  d.completeAssessment(s,{pain_after:5,next_day_response:null},ts);assert.equal(d.safetyFlag(),true);assert.equal(d.scoreExercise(ex).status,'red');assert.equal(d.scoreExerciseAtTime(ex,ts+86400000).status,'red');
  d.completeAssessment(s,{pain_after:0,swelling:true},ts);assert.equal(d.safetyFlag(),true);
  d.completeAssessment(s,{swelling:false,instability:true},ts);assert.equal(d.safetyFlag(),true);
  const normal=d.recordTest('hemisphere_hold',{left:30,right:15},ts+61*60000);
  d.completeAssessment(normal,{pain_after:0,instability:false,swelling:false,next_day_response:'same',same_day_response:'same'},ts+86400000);
  assert.equal(d.safetyFlag(ts+86400000),false);assert.equal(d.assessmentSymptomModifier(ex,ts+86400000),1);
});
test('self report interval and export/import round trip keep assessment loads',()=>{
  const a=app(),d=a.dev;assessmentScenario(d);
  const data=JSON.stringify(d.getState());
  const b=app(JSON.parse(data));assert.deepEqual(plain(b.dev.getState()),plain(d.getState()));
  a.context.FileReader=class{readAsText(file){this.result=file;this.onload();}};
  d.importData(data);assert.equal(d.getState().assessment_sessions.length,1);
  const prior=JSON.stringify(d.getState());d.importData('{invalid');assert.equal(JSON.stringify(d.getState()),prior);
  d.importData(JSON.stringify({logs:[],testLogs:'invalid'}));assert.equal(JSON.stringify(d.getState()),prior);
  let exported;const blobUrl=a.context.URL.createObjectURL;
  a.context.URL.createObjectURL=blob=>{exported=blob;return 'blob:test';};
  d.exportData();a.context.URL.createObjectURL=blobUrl;assert.ok(exported instanceof Blob);
  for(const [k,v] of Object.entries({trust:8,fear:2,ready:5}))a.get('sr_'+k).value=String(v);
  d.saveSelfReport();assert.equal(d.selfReportDue(),false);
  d.getState().last_self_report_at=Date.now()-8*86400000;assert.equal(d.selfReportDue(),true);
});
test('UI includes units and protocols, no native prompt or Chinese characters',()=>{
  assert.ok(!/\bprompt\s*\(/.test(html));assert.ok(!/[\u3400-\u9fff]/.test(html));
  const {dev:d}=app();
  for(const t of d.RDCFG.tests){assert.ok(t.unit);assert.ok(t.protocol.length);assert.ok(t.test_load_vector);}
});
test('home recommends an available baseline test alongside exercises, across all available tests',()=>{
  const {dev:d,get}=app();
  const actions=d.actionRecommendations();
  assert.equal(actions[0].kind,'test');
  assert.equal(actions.filter(r=>r.kind==='test').length,1);
  assert.ok(actions.some(r=>r.kind==='exercise'));
  assert.equal(d.testRecommendations().length,6);
  assert.ok(!actions.some(r=>r.test?.status==='locked'));
  d.getState().selectedStage='ready_for_impact';
  assert.equal(d.testRecommendations().length,9);
  d.renderHome();
  assert.match(get('bestNow').innerHTML,/Пройти тест/);
});
test('repeat is due after seven days, regardless of low results; invalid and old protocols do not postpone a baseline',()=>{
  const {dev:d}=app(),ts=Date.now();
  const t=d.RDCFG.tests[0];
  const s=d.recordTest(t.id,{left:30,right:1},ts);
  d.completeAssessment(s,{perceived_fatigue:'easy',pain_after:0},ts);
  assert.ok(!d.testRecommendations(ts+6*86400000).some(r=>r.test.id===t.id));
  assert.ok(d.testRecommendations(ts+7*86400000).some(r=>r.test.id===t.id));
  assert.equal(d.testRecommendations(ts+7*86400000).find(r=>r.test.id===t.id).latest.right,1);
  d.getState().testLogs[0].protocol_id='legacy_'+t.id;
  assert.equal(d.testRecommendations(ts+7*86400000).find(r=>r.test.id===t.id).latest,undefined);
  d.getState().testLogs[0].protocol_id=t.protocol_id;
  d.getState().testLogs[0].right=-1;
  assert.equal(d.testRecommendations(ts+7*86400000).find(r=>r.test.id===t.id).latest,undefined);
});
test('fatigue and reported symptoms defer tests while keeping suitable exercises',()=>{
  const {dev:d}=app(),ts=Date.now();
  d.getState().customActivities.push({id:'a1',ts,load:{calf:100,ankle_control:100,dynamic_balance:100,lateral:100,impact:100},painAfter:0});
  assert.equal(d.testRecommendations(ts).length,0);
  assert.ok(d.testRecommendations(ts+7*86400000).length>0);
  d.setState(d.defaultState());
  const s=d.recordTest('hemisphere_hold',{left:30,right:15},ts);
  assert.equal(d.testRecommendations(ts).length,0);
  d.recordTest('tandem_tiptoe_clean_steps',{value:100},ts);
  d.completeAssessment(s,{perceived_fatigue:'moderate',pain_after:0,instability:false,swelling:false},ts);
  assert.ok(!d.testRecommendations(ts).some(r=>r.test.id==='multidirectional_control_clean_rounds'));
  assert.ok(d.actionRecommendations(ts).some(r=>r.kind==='exercise'&&r.ex.id==='towel_stretch_straight_knee'));
  for(const response of [{pain_after:3},{pain_after:0,next_day_response:'worse'},{pain_after:0,next_day_response:null,swelling:true}]){
    d.completeAssessment(s,response,ts);
    assert.equal(d.testRecommendations(ts+7*86400000).length,0);
  }
});
test('missing domains and older measurements determine test priority rather than low scores',()=>{
  const {dev:d}=app(),ts=Date.now();
  for(const t of d.RDCFG.tests.filter(t=>t.domain==='sensorimotor_control')){
    const s=d.recordTest(t.id,t.bilateral?{left:30,right:0}:{value:0},ts-8*86400000);
    d.completeAssessment(s,{perceived_fatigue:'easy',pain_after:0},ts-8*86400000);
  }
  assert.equal(d.testRecommendations(ts)[0].test.domain,'ankle_capacity');
  d.setState(d.defaultState());
  for(const t of d.RDCFG.tests.filter(t=>t.status!=='locked')){
    const s=d.recordTest(t.id,t.bilateral?{left:30,right:0}:{value:0},ts-8*86400000);
    d.completeAssessment(s,{perceived_fatigue:'easy',pain_after:0},ts-8*86400000);
  }
  const oldest=d.getState().testLogs.find(l=>l.testId==='tandem_tiptoe_clean_steps');
  oldest.ts=ts-21*86400000;
  assert.equal(d.testRecommendations(ts)[0].test.id,'tandem_tiptoe_clean_steps');
});
test('missing results do not always outrank training, and the catalog shows the next check date',()=>{
  const {dev:d,get}=app(),ts=Date.now();
  const s=d.recordTest('hemisphere_hold',{left:30,right:15},ts);
  d.recordTest('knee_to_wall',{left:10,right:8},ts);
  d.completeAssessment(s,{perceived_fatigue:'easy',pain_after:0},ts);
  assert.equal(d.actionRecommendations(ts)[0].kind,'exercise');
  assert.ok(d.testRecommendations(ts).some(r=>!r.latest));
  d.renderTests();
  assert.match(get('testList').innerHTML,/Следующая проверка — примерно/);
});
test('postponing replaces the recommendation without changing history, load, mastery or XP',()=>{
  const {dev:d,get}=app(),ts=Date.now();
  const before=plain(d.getState()),id='towel_stretch_straight_knee';
  d.postponeAction('exercise',id,'hour',ts);
  assert.ok(!d.recommendations(ts).some(r=>r.ex.id===id));
  assert.ok(d.recommendations(ts).length>0);
  assert.equal(d.postponedUntil('exercise',id,ts),ts+3600000);
  assert.ok(d.recommendations(ts+3600000).some(r=>r.ex.id===id));
  const after=plain(d.getState());
  delete before.postponedActions;delete after.postponedActions;
  assert.deepEqual(after,before);
  const first=d.actionRecommendations(ts)[0].test.id;
  d.postponeAction('test',first,'week',ts);
  assert.ok(!d.testRecommendations(ts).some(r=>r.test.id===first));
  assert.notEqual(d.actionRecommendations(ts)[0].test?.id,first);
  assert.ok(d.testRecommendations(ts+7*86400000).some(r=>r.test.id===first));
  assert.match(get('postponedWrap').innerHTML,/Отменить/);
  d.resumeAction('test',first);
  assert.ok(d.testRecommendations(ts).some(r=>r.test.id===first));
});
test('until tomorrow uses the next local training day and postponements survive reload and import',()=>{
  const {dev:d,storage,context}=app(),ts=new Date(2026,9,6,23,45).getTime(),id='hemisphere_hold';
  d.postponeAction('test',id,'tomorrow',ts);
  const tomorrow=new Date(2026,9,7,5,0).getTime();
  assert.equal(d.postponedUntil('test',id,ts),tomorrow);
  const saved=JSON.parse(storage.get(KEY)),restored=app(saved).dev;
  assert.equal(restored.postponedUntil('test',id,ts),tomorrow);
  assert.ok(restored.testRecommendations(tomorrow).some(r=>r.test.id===id));
  const old=plain(d.defaultState());delete old.postponedActions;
  assert.deepEqual(plain(app(old).dev.getState().postponedActions),{});
  d.resumeAction('test',id);
  assert.equal(d.postponedUntil('test',id,ts),null);
  context.FileReader=class{readAsText(file){this.result=file;this.onload();}};
  d.importData(JSON.stringify(saved));
  assert.equal(d.postponedUntil('test',id,ts),tomorrow);
});
test('all postponed actions leave an explanation and can be restored from the home screen',()=>{
  const {dev:d,get}=app(),ts=Date.now();
  for(const ex of Object.values(d.EXMAP).filter(ex=>d.getState().exerciseStatuses[ex.id]==='active'))d.getState().postponedActions['exercise:'+ex.id]=ts+7*86400000;
  for(const t of d.RDCFG.tests)d.getState().postponedActions['test:'+t.id]=ts+7*86400000;
  assert.equal(d.actionRecommendations(ts).length,0);
  d.renderHome();
  assert.match(get('bestNow').innerHTML,/отложенные/);
  assert.match(get('postponedWrap').innerHTML,/<details open>/);
  assert.match(get('postponedWrap').innerHTML,/Вернуть/);
  d.resumeAction('exercise','towel_stretch_straight_knee');
  assert.equal(d.actionRecommendations(ts)[0].ex.id,'towel_stretch_straight_knee');
});


const DAY=86400000;
function dayStart(ts){const d=new Date(ts);d.setHours(0,0,0,0);return +d;}
function morningAt(ts){const d=new Date(ts);d.setDate(d.getDate()+1);d.setHours(8,0,0,0);return +d;}
function morning(d,l,response={}){
  return d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(l.ts),response:'same',historyKnown:true,historyWorse:false,pain:0,fatigue:'low',steadiness:'steady',swelling:false,...response},'combined',morningAt(d.startOfDay(l.ts)));
}
function confirmedDose(d,ex,dose,effort='easy',end=Date.now()-2*DAY){
  const logs=[];
  for(let i=0;i<3;i++){
    const l=d.recordExercise(ex.id,dose,{...comfortable,difficulty:effort},end-(2-i)*DAY);morning(d,l);logs.push(l);
  }
  return logs;
}
test('moderate effort and fatigue without worsening retain dose over repeated days',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static;
  for(let i=0;i<7;i++){
    const ts=Date.now()-(9-i)*DAY,dose=d.suggestedDose(ex,ts).dose;
    assert.equal(dose.reps,10);
    const l=d.recordExercise(ex.id,dose,{...comfortable,fatigue:'medium',difficulty:'hard'},ts);morning(d,l);
  }
  assert.equal(d.suggestedDose(ex).dose.reps,10);assert.equal(d.suggestedDose(ex).trial,null);
});
test('one pain-free execution gives neither running readiness nor half mastery',()=>{
  const {dev:d,get}=app(),ex=d.EXMAP.bilateral_tiptoe_static;
  d.recordExercise(ex.id,ex.dose,comfortable);
  assert.equal(d.readinessSummary().score,null);assert.equal(d.exerciseMastery(ex),0);
  d.renderHome();assert.match(get('readinessHint').textContent,/Недостаточно данных/);
  assert.equal(get('readinessValue').textContent,'—');
});
test('three confirmed days establish a working level; shortened time or daily load preserve it',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static;
  confirmedDose(d,ex,ex.dose);
  assert.equal(d.exerciseProgress(ex).confirmed,true);
  for(const doseReason of ['time','daily_load']){
    const l=d.recordExercise(ex.id,{...ex.dose,reps:4},{...comfortable,doseReason},Date.now()-DAY);morning(d,l);
    assert.equal(d.suggestedDose(ex).working.reps,10);assert.equal(d.suggestedDose(ex).dose.reps,10);
  }
});
test('late adverse reaction and current recovery remain independent immutable observations',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static,ts=Date.now()-DAY;
  const l=d.recordExercise(ex.id,ex.dose,comfortable,ts),before=plain(l),load=plain(d.allLoadEvents()),xp=d.getState().xp;
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'shaky',swelling:false},l.id,ts+3600000);
  assert.deepEqual(plain(l),before);assert.equal(d.classifyLog(l),'moderate_reaction');
  const reduced=d.suggestedDose(ex).dose.reps;assert.ok(reduced<10);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady',swelling:false},l.id,ts+7200000);
  assert.equal(d.currentSymptoms().steadiness,'steady');assert.equal(d.exerciseResponse(l).steadiness,'shaky');
  assert.equal(d.suggestedDose(ex).dose.reps,reduced);assert.equal(d.suggestedDose(ex).working.reps,10);
  assert.deepEqual(plain(d.allLoadEvents()),load);assert.equal(d.getState().xp,xp);
});
test('equivalent pain is classified consistently and is not automatically labelled worse',()=>{
  const first=app().dev,second=app().dev,ex=first.EXMAP.bilateral_tiptoe_static,ts=Date.now()-DAY;
  const a=first.recordExercise(ex.id,ex.dose,{...comfortable,painAfter:2},ts);
  const b=second.recordExercise(ex.id,ex.dose,comfortable,ts);
  const r=second.recordSymptoms({pain:2,fatigue:'low',steadiness:'steady',swelling:false,response:'same'},b.id,ts+3600000);
  assert.equal(r.worse,false);assert.equal(first.classifyLog(a),second.classifyLog(b));
  assert.equal(first.suggestedDose(ex).dose.reps,second.suggestedDose(second.EXMAP[ex.id]).dose.reps);
  const stable=app().dev,l=stable.recordExercise(ex.id,ex.dose,{...comfortable,painBefore:2,painDuring:2,painAfter:2},ts);
  assert.equal(stable.classifyLog(l),'normal');assert.equal(stable.suggestedDose(stable.EXMAP[ex.id]).dose.reps,10);
});
test('unknown cumulative reaction leaves individual evidence intact and allows one light load before rest',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static,ts=Date.now()-3*3600000;
  const l=d.recordExercise(ex.id,ex.dose,comfortable,ts),before=plain(l),mastery=d.exerciseMastery(ex);
  d.recordSymptoms({pain:0,fatigue:'medium',steadiness:'shaky',swelling:false},'combined',ts+3600000);
  assert.deepEqual(plain(l),before);assert.equal(d.exerciseMastery(ex),mastery);
  const dose=d.suggestedDose(ex).dose;assert.ok(dose.reps<10);
  d.recordExercise(ex.id,dose,{...comfortable,doseReason:'daily_load'},Date.now()-60000);
  assert.equal(d.dailyLoadPlan(d.EXMAP.slider_injured_leg_three_directions).status,'pause');
  assert.equal(d.testRecommendations().length,0);
  assert.ok(d.recommendations().every(r=>Math.max(...Object.values(r.ex.load_channels))<.25));
});
test('daily budget includes activities, tests and exercises and resets by training day',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static,ts=Date.now();
  d.getState().customActivities.push({id:'walk',ts,load:{calf:65,ankle_control:70},painAfter:0});
  assert.equal(d.dailyLoadPlan(ex,ts).status,'pause');assert.ok(!d.recommendations(ts).some(r=>r.ex.id===ex.id));
  assert.equal(d.dailyLoadPlan(ex,ts+2*DAY).status,'normal');
  const other=app().dev;assessmentScenario(other,ts);
  assert.equal(other.dailyLoadPlan(other.EXMAP.slider_injured_leg_three_directions,ts).status,'pause');
});
test('same-day sessions and invented same-day morning feedback cannot confirm or progress a level',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static,day=dayStart(Date.now()-2*DAY);
  for(let i=0;i<3;i++){
    const l=d.recordExercise(ex.id,{...ex.dose,reps:6},{...comfortable,difficulty:'easy'},day+(9+i*2)*3600000);
    d.recordSymptoms({phase:'morning',trainingDay:day,response:'same',historyKnown:true,pain:0,fatigue:'low',steadiness:'steady'},'combined',day+20*3600000);
    morning(d,l);
  }
  assert.equal(d.exerciseProgress(ex).confirmed,false);assert.equal(d.exerciseProgress(ex).confirmedDays,1);
  assert.equal(d.suggestedDose(ex).trial,null);
});
test('numeric progression is an explicit trial with the actual delta and keeps the confirmed working level',()=>{
  const {dev:d,get}=app(),ex=d.EXMAP.tiptoe_square_corner_lunges;
  confirmedDose(d,ex,ex.dose);
  const plan=d.suggestedDose(ex);assert.equal(plan.dose.rounds,2);assert.equal(plan.trial.rounds,3);
  d.openExercise(ex.id);assert.match(get('exerciseModal').innerHTML,/\+50%/);
  d.openLog(ex.id);assert.match(get('logModal').innerHTML,/value="2"/);
  d.openLog(ex.id,true);assert.match(get('logModal').innerHTML,/value="3"/);
  const l=d.recordExercise(ex.id,plan.trial,{...comfortable,doseReason:'trial'},Date.now()-DAY);morning(d,l);
  const next=d.suggestedDose(ex);assert.equal(next.working.rounds,2);assert.equal(next.dose.rounds,3);assert.equal(next.trial,null);
});
test('duration, support, range and weight distribution use exercise-specific trial steps',()=>{
  for(const [id,key,value] of [
    ['hemisphere_weight_shift_injured_front','target_sec',15],
    ['right_leg_balance_left_front_back','support','light'],
    ['left_side_lunge_right_leg_straight','range','increased'],
    ['bilateral_tiptoe_static','weight_distribution','right_bias']
  ]){
    const {dev:d}=app(),ex=d.EXMAP[id];confirmedDose(d,ex,ex.dose);
    assert.equal(d.suggestedDose(ex).trial[key],value);
  }
});
test('a failed trial returns to the confirmed variant instead of continuing the harder option',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static;confirmedDose(d,ex,ex.dose);
  const plan=d.suggestedDose(ex),l=d.recordExercise(ex.id,plan.trial,{...comfortable,doseReason:'trial'},Date.now()-DAY);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'shaky'},l.id,l.ts+3600000);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'unknown',Date.now()-3600000);
  const next=d.suggestedDose(ex);assert.equal(next.working.reps,10);assert.notEqual(next.dose.weight_distribution,'right_bias');
  assert.equal(next.trial,null);
});
test('normal effort confirms a level while unresolved recovery and missing feedback prevent growth',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static;
  const logs=confirmedDose(d,ex,{...ex.dose,reps:6},'normal');
  assert.equal(d.exerciseProgress(ex).confirmed,true);assert.equal(d.suggestedDose(ex).trial,null);
  const a=app().dev,e=a.EXMAP.bilateral_tiptoe_static;
  for(const l of logs)a.recordExercise(e.id,l.actualDose,{...comfortable,difficulty:'easy'},l.ts);
  assert.equal(a.exerciseProgress(e).confirmed,false);assert.equal(a.suggestedDose(e).trial,null);
});
test('one shared morning check stores strong fatigue and covers the complete day without blaming each exercise',()=>{
  const clock=dayStart(Date.now())+10*3600000,{dev:d,get}=app(null,clock),ex=d.EXMAP.bilateral_tiptoe_static;
  const ts=clock-DAY,l=d.recordExercise(ex.id,ex.dose,comfortable,ts);
  d.recordExercise('tandem_walk_flat',d.EXMAP.tandem_walk_flat.dose,comfortable,ts+3600000);
  d.getState().customActivities.push({id:'walk',ts,load:{calf:5}});
  const originals=plain(d.getState().logs),day=d.startOfDay(ts);
  assert.equal(d.pendingMorningDays().length,1);d.renderHome();assert.match(get('pendingChecksWrap').innerHTML,/Одна оценка/);
  d.openMorning(day);
  for(const [id,v] of Object.entries({morningResponse:'same',dayResponse:'same',morningSteadiness:'steady',morningPain:'0',morningFatigue:'high'}))get(id).value=v;
  d.saveMorning(day);
  assert.equal(d.currentSymptoms().fatigue,'high');assert.deepEqual(plain(d.getState().logs),originals);
  assert.equal(d.pendingMorningDays().length,0);assert.equal(d.confirmedSafe(l),false);assert.equal(d.testRecommendations().length,0);
});
test('morning controls reject same-day checks and do not fabricate missing historical mornings',()=>{
  const clock=dayStart(Date.now())+10*3600000,{dev:d,get}=app(null,clock),ex=d.EXMAP.bilateral_tiptoe_static;
  const l=d.recordExercise(ex.id,ex.dose,comfortable,clock-3*DAY);
  for(const [id,v] of Object.entries({morningResponse:'same',dayResponse:'same',morningSteadiness:'steady',morningPain:'0',morningFatigue:'low'}))get(id).value=v;
  d.saveMorning(d.startOfDay(clock));assert.equal(d.getState().symptomReports.length,0);
  d.saveMorning(d.startOfDay(l.ts));assert.equal(d.confirmedSafe(l),false);
});
test('morning improvement preserves an earlier adverse episode and avoids an immediate return to full dose',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static,l=d.recordExercise(ex.id,ex.dose,comfortable,Date.now()-2*DAY);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'shaky'},l.id,l.ts+3600000);
  morning(d,l,{response:'better',historyWorse:true});
  assert.equal(d.currentSymptoms().steadiness,'steady');assert.equal(d.exerciseResponse(l).steadiness,'shaky');
  assert.ok(d.suggestedDose(ex).dose.reps<10);assert.equal(d.confirmedSafe(l),false);
});
test('completing an adapted recommendation earns full adherence XP while physical load remains proportional',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static;
  const l=d.recordExercise(ex.id,{...ex.dose,reps:6},comfortable,Date.now(),{...ex.dose,reps:6});
  assert.equal(d.getState().xp,10);assert.equal(l.doseFactor,.6);
  assert.equal(d.allLoadEvents()[0].channels.calf,ex.load_channels.calf*45*.6);
  const a=app().dev;a.recordExercise(ex.id,ex.dose,{...comfortable,technique:'poor'});assert.equal(a.getState().xp,0);
});
test('readiness needs every fresh domain, preserves unknowns and includes current adverse symptoms',()=>{
  const {dev:d}=app(),ts=Date.now()-DAY;
  for(const t of d.RDCFG.tests.filter(t=>t.status!=='locked'))d.recordTest(t.id,t.bilateral?{left:20,right:20}:{value:20},ts);
  d.getState().selfReports.push({ts,trust:10,fear:0,ready:10});
  assert.equal(d.readinessSummary().score,null);assert.ok(d.readinessSummary().missing.includes('impact_running_capacity'));
  d.getState().selectedStage='ready_for_impact';
  for(const t of d.RDCFG.tests.filter(t=>t.status==='locked'))d.recordTest(t.id,t.bilateral?{left:20,right:20}:{value:20},ts);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'unknown');
  assert.ok(Number.isFinite(d.readinessSummary().score));
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'shaky'},'unknown');assert.equal(d.readinessSummary().score,null);
  assert.equal(d.readinessSummary(Date.now()+31*DAY).score,null);
});
test('dose and append-only reaction history round-trip without modifying legacy logs',()=>{
  const a=app(),d=a.dev,ex=d.EXMAP.bilateral_tiptoe_static;d.openLog(ex.id);
  for(const [key,v] of Object.entries({reps:6,hold_sec:5,sets:1}))a.get('dose_'+key).value=String(v);
  for(const [id,v] of Object.entries({painBefore:'0',painDuring:'0',painAfter:'0',fatigueSel:'medium',techSel:'good',difficultySel:'normal',logSteadiness:'steady',doseReason:'capacity',doseOption:'even',comment:''}))a.get(id).value=v;
  d.saveLog(ex.id);const l=d.getState().logs[0],before=plain(l);
  for(const [id,v] of Object.entries({symptomContext:l.id,symptomPain:'0',symptomFatigue:'low',symptomSteadiness:'shaky',symptomResponse:'worse',symptomMinutes:'20',symptomComment:'Позже'}))a.get(id).value=v;
  d.saveSymptoms();assert.deepEqual(plain(l),before);
  assert.deepEqual(plain(app(JSON.parse(a.storage.get(KEY))).dev.getState()),plain(d.getState()));
  a.context.FileReader=class{readAsText(file){this.result=file;this.onload();}};
  d.importData(JSON.stringify(d.getState()));assert.equal(d.getState().symptomReports.length,1);
  const legacy={id:'old',exerciseId:ex.id,ts:Date.now()-DAY,painAfter:0,instability:true};
  const old=app({logs:[legacy]}).dev;assert.deepEqual(plain(old.getState().logs[0]),legacy);assert.equal(old.safetyFlag(),true);
  assert.equal(old.allLoadEvents()[0].channels.calf,ex.load_channels.calf*45);
});
test('sets, seconds and directional repetitions still scale physical load',()=>{
  const {dev:d}=app();
  for(const [id,changes,factor] of [
    ['hemisphere_weight_shift_injured_front',{target_sec:5,sets:2},1/3],
    ['slider_injured_leg_three_directions',{reps_per_direction:3,sets:1},.3],
    ['single_leg_calf_raise',{reps:6,sets:1},.3]
  ]){const ex=d.EXMAP[id],l=d.recordExercise(id,{...ex.dose,...changes},comfortable);assert.equal(l.doseFactor,factor);}
});
test('pause does not disappear with time or future observations; invalid volume and variant are rejected',()=>{
  const {dev:d}=app(),ex=d.EXMAP.single_leg_calf_raise,ts=Date.now();d.getState().exerciseStatuses[ex.id]='active';
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'giving_way'},'unknown',ts);
  assert.equal(d.scoreExercise(ex,ts+7*DAY).status,'red');
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'unknown',ts+DAY);
  assert.equal(d.safetyFlag(ts),true);assert.equal(d.safetyFlag(ts+DAY),false);
  for(const reps of [0,1.5,NaN])assert.throws(()=>d.recordExercise(ex.id,{...ex.dose,reps},comfortable));
  const e=d.EXMAP.bilateral_tiptoe_static;assert.throws(()=>d.recordExercise(e.id,{...e.dose,weight_distribution:'bad'},comfortable));
});


test('repeating an adverse report cannot open another light session in the same episode',()=>{
  const {dev:d}=app(),ts=Date.now()-3*3600000,ex=d.EXMAP.bilateral_tiptoe_static;
  d.recordSymptoms({pain:0,steadiness:'shaky',fatigue:'medium'},'combined',ts);
  const plan=d.suggestedDose(ex,ts);assert.equal(plan.status,'light');
  d.recordExercise(ex.id,plan.dose,{...comfortable,doseReason:'daily_load'},ts+60000);
  d.recordSymptoms({pain:0,steadiness:'shaky',fatigue:'medium'},'combined',ts+3600000);
  assert.equal(d.dailyLoadPlan(ex,ts+3600000).status,'pause');

});
test('normal current feedback resolves test restrictions without erasing the recorded reaction',()=>{
  const {dev:d}=app(),ts=Date.now()-2*DAY,ex=d.EXMAP.bilateral_tiptoe_static;
  const s=assessmentScenario(d,ts);d.completeAssessment(s,{pain_after:3,same_day_response:'worse',swelling:false,instability:false},ts);
  const before=plain(s);assert.ok(d.assessmentSymptomModifier(ex,ts)<1);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady',response:'better'},'combined',ts+DAY);
  assert.equal(d.assessmentSymptomModifier(ex,ts+DAY),1);assert.deepEqual(plain(s),before);
});
test('equal weak sides do not receive full capacity or sensorimotor credit',()=>{
  const {dev:d}=app(),ts=Date.now();
  d.recordTest('single_leg_calf_raise_test',{left:1,right:1},ts);
  d.recordTest('hemisphere_hold',{left:1,right:1},ts);
  const scores=d.readinessSummary(ts).domainScores;
  assert.ok(scores.ankle_capacity<.1);assert.ok(scores.sensorimotor_control<.1);
});
test('an old symptom observation does not count as a current pain measurement',()=>{
  const {dev:d}=app(),ts=Date.now();
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'combined',ts-8*DAY);
  assert.equal(d.readinessSummary(ts).domainScores.pain,null);
});

test('different unconfirmed volumes do not add up to a confirmed working level',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static,end=Date.now()-2*DAY;
  for(const [i,reps] of [6,8,10].entries()){
    const l=d.recordExercise(ex.id,{...ex.dose,reps},comfortable,end-(2-i)*DAY);morning(d,l);
  }
  assert.equal(d.exerciseProgress(ex).confirmed,false);assert.equal(d.exerciseProgress(ex).confirmedDays,1);
  assert.ok(d.exerciseMastery(ex)<=1/3);
});


test('a single postponed test does not hide load limits and the exact rest windows',()=>{
  const today=dayStart(Date.now()),clock=today+(22*60+9)*60000+30000;
  const {dev:d,get}=app(null,clock);assessmentScenario(d,today+16*3600000);
  const staticEx=d.EXMAP.bilateral_tiptoe_static;
  const l=d.recordExercise(staticEx.id,staticEx.dose,comfortable,today+19*3600000);
  d.recordSymptoms({pain:2,steadiness:'shaky',fatigue:'low',response:'worse'},l.id,today+22*3600000);
  for(const [id,minutes] of [['towel_stretch_straight_knee',5],['towel_stretch_bent_knee',9]]){
    const ex=d.EXMAP[id];d.recordExercise(id,ex.dose,comfortable,today+(22*60+minutes)*60000);
  }
  d.getState().postponedActions['test:knee_to_wall']=today+DAY;
  assert.equal(d.actionRecommendations(clock).length,0);d.renderHome();
  const card=get('bestNow').innerHTML;
  assert.match(card,/Сейчас восстановление/);assert.match(card,/шаткая, боль 2/);assert.match(card,/На сегодня достаточно похожей нагрузки/);
  assert.match(card,/перерыв 90 мин/);assert.match(card,/23:35/);assert.match(card,/23:39/);
  assert.doesNotMatch(card,/Есть отложенные действия/);assert.ok(get('bestNow').classList.contains('rest'));
  assert.ok(d.recommendations(today+(23*60+35)*60000).some(r=>r.ex.id==='towel_stretch_straight_knee'));
  assert.ok(!d.recommendations(clock).some(r=>r.ex.id===staticEx.id));
  const load=plain(d.fatigueAt(clock));
  d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',response:'better'},'unknown',clock);
  assert.equal(d.actionRecommendations(clock).length,0);assert.deepEqual(plain(d.fatigueAt(clock)),load);
  d.renderHome();assert.match(get('bestNow').innerHTML,/Последняя отметка: устойчива, боль 0/);
  assert.match(get('bestNow').innerHTML,/23:35/);assert.doesNotMatch(get('bestNow').innerHTML,/Тесты ждут нормальной реакции/);
  assert.ok(d.recommendations(today+(23*60+35)*60000).some(r=>r.ex.id==='towel_stretch_straight_knee'));
});
test('dialogs keep the page locked through nested dialogs and restore scroll after all close',()=>{
  const {dev:d,get,context}=app();context.window.scrollY=640;
  d.showDialog('exerciseDialog');assert.ok(get('body').classList.contains('modal-open'));assert.equal(get('body').style.top,'-640px');
  context.window.scrollY=0;d.showDialog('logDialog');d.closeDialog('exerciseDialog');
  assert.ok(get('body').classList.contains('modal-open'));assert.equal(context.window.restoredScrollY,undefined);
  let blurred=false;get('logDialog').focused={blur(){blurred=true;}};
  d.closeDialog('logDialog');assert.ok(blurred);assert.ok(!get('body').classList.contains('modal-open'));
  assert.equal(get('body').style.top,'');assert.equal(context.window.restoredScrollY,640);
  context.window.scrollY=315;d.showDialog('symptomsDialog');get('symptomsDialog').close();
  assert.ok(!get('body').classList.contains('modal-open'));assert.equal(context.window.restoredScrollY,315);
});

test('a daily maximum is explained even when an unrelated test is postponed',()=>{
  const clock=Date.now(),{dev:d}=app(null,clock),ex=d.EXMAP.towel_stretch_straight_knee;
  for(const id of Object.keys(d.getState().exerciseStatuses))d.getState().exerciseStatuses[id]='archived';
  d.getState().exerciseStatuses[ex.id]='active';
  for(let i=0;i<ex.prescription_credit.max_per_day;i++)d.getState().logs.push({id:'max'+i,exerciseId:ex.id,ts:d.startOfDay(clock)+i*60000,painAfter:0});
  d.getState().postponedActions['test:knee_to_wall']=clock+DAY;
  const card=d.noRecommendationHTML(clock);assert.match(card,/достигнут максимум на сегодня/);assert.doesNotMatch(card,/Есть отложенные действия/);
});


test('training day changes exactly at local 05:00, including next-day and month boundaries',()=>{
  const at=(day,hour,minute=0)=>new Date(2026,9,day,hour,minute).getTime();
  const d=app().dev;
  for(const ts of [at(6,23,59),at(7,0),at(7,4,59)]){
    assert.equal(d.startOfDay(ts),at(6,5));assert.equal(d.nextDayStart(ts),at(7,5));
  }
  assert.equal(d.startOfDay(at(7,5)),at(7,5));assert.equal(d.nextDayStart(at(7,5)),at(8,5));
  assert.equal(d.startOfDay(new Date(2026,10,1,2).getTime()),new Date(2026,9,31,5).getTime());
});
test('late-night exercise counts, streak and chart share one day and keep original timestamps',()=>{
  const clock=new Date(2026,9,7,0,30).getTime(),{dev:d,get}=app(null,clock);
  const evening=clock-3600000,ex=d.EXMAP.towel_stretch_straight_knee;
  d.recordExercise(ex.id,ex.dose,comfortable,evening);
  d.recordExercise('tandem_walk_flat',d.EXMAP.tandem_walk_flat.dose,comfortable,clock);
  const before=plain(d.getState());
  assert.equal(d.prescriptionCounts().towel_straight,1);assert.equal(d.prescriptionCounts().line_walk,1);
  assert.equal(d.xpAndStreak().streak,1);d.renderAll();
  assert.match(get('todayLabel').textContent,/6 октября/);
  assert.match(get('dailyActivity').innerHTML,/2 выполнений упражнений/);
  const chart=get('activityChart').innerHTML;
  assert.equal([...chart.matchAll(/height:3%/g)].length,13);
  assert.equal(d.prescriptionCounts(new Date(2026,9,7,5).getTime()).towel_straight,0);
  assert.deepEqual(plain(d.getState()),before);
});
test('daily load stays limited across midnight and resets at 05:00 while fatigue remains',()=>{
  const evening=new Date(2026,9,6,23).getTime(),d=app().dev,ex={load_channels:{ankle_control:.5}};
  d.getState().customActivities.push({id:'late-walk',ts:evening,load:{ankle_control:75},painAfter:0});
  for(const ts of [new Date(2026,9,7,0).getTime(),new Date(2026,9,7,4,59).getTime()])assert.equal(d.dailyLoadPlan(ex,ts).status,'pause');
  const boundary=new Date(2026,9,7,5).getTime();
  assert.equal(d.dailyLoadPlan(ex,boundary).status,'normal');assert.ok(d.fatigueAt(boundary).ankle_control>0);
});
test('tomorrow after midnight means the upcoming 05:00 and existing postponements are preserved',()=>{
  const clock=new Date(2026,9,7,1).getTime(),{dev:d}=app(null,clock);
  d.postponeAction('test','hemisphere_hold','tomorrow',clock);
  assert.equal(d.postponedUntil('test','hemisphere_hold',clock),new Date(2026,9,7,5).getTime());
  const saved=plain(d.getState());assert.deepEqual(plain(app(saved,clock).dev.getState()),saved);
});
test('test sessions stay together across midnight and split across 05:00',()=>{
  for(const [hour,expectedSame] of [[0,true],[5,false]]){
    const d=app().dev,boundary=new Date(2026,9,7,hour).getTime();
    const first=d.recordTest('hemisphere_hold',{left:30,right:15},boundary-10*60000);
    const second=d.recordTest('tandem_tiptoe_clean_steps',{value:100},boundary+10*60000);
    assert.equal(first.id===second.id,expectedSame);
  }
});
test('one morning check after 05:00 covers exercises before and after midnight',()=>{
  const boundary=new Date(2026,9,7,5).getTime(),{dev:d}=app(null,boundary),ex=d.EXMAP.bilateral_tiptoe_static;
  const first=d.recordExercise(ex.id,ex.dose,comfortable,boundary-6*3600000);
  const second=d.recordExercise(ex.id,ex.dose,comfortable,boundary-4*3600000);
  assert.equal(d.pendingMorningDays(boundary-1).length,0);assert.equal(d.pendingMorningDays(boundary).length,1);
  d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(first.ts),response:'same',historyKnown:true,historyWorse:false,pain:0,fatigue:'low',steadiness:'steady'},'combined',boundary);
  assert.equal(d.pendingMorningDays().length,0);assert.equal(d.confirmedSafe(first),true);assert.equal(d.confirmedSafe(second),true);
  assert.equal(d.exerciseProgress(ex).confirmedDays,1);
});
test('legacy midnight morning keys retain confirmation and are not rewritten on reload',()=>{
  const clock=new Date(2026,9,7,10).getTime(),{dev:d}=app(null,clock),ex=d.EXMAP.bilateral_tiptoe_static;
  const l=d.recordExercise(ex.id,ex.dose,comfortable,clock-DAY);
  d.recordSymptoms({phase:'morning',trainingDay:dayStart(l.ts),response:'same',historyKnown:true,historyWorse:false,pain:0,fatigue:'low',steadiness:'steady'},'combined',clock);
  const saved=plain(d.getState()),restored=app(saved,clock).dev;
  assert.deepEqual(plain(restored.getState()),saved);assert.equal(restored.confirmedSafe(restored.getState().logs[0]),true);
  assert.equal(restored.pendingMorningDays().length,0);
});
