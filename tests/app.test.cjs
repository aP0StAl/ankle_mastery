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
test('balance cards name the front leg, both raised heels and the actual equipment',()=>{
  const {dev:d,get}=app();
  for(const [equipment,label] of [['balance_board','Балансборд'],['hemisphere','Полусфера']]){
    for(const [side,front,rear] of [['right','Правая','Левая'],['left','Левая','Правая']]){
      const ex=d.EXMAP[`${equipment}_both_tiptoe_${side}_front`];
      assert.ok(ex);
      assert.match(ex.name,new RegExp(label));
      d.openExercise(ex.id);
      const card=get('exerciseModal').innerHTML;
      assert.match(card,new RegExp(`${front} нога впереди`));
      assert.match(card,new RegExp(`${rear} нога сзади, на полу`));
      assert.match(card,/Обе пятки подняты/);
      assert.match(card,/нескольких подходов поменять ноги местами/);
      assert.doesNotMatch(card,/рабочую ногу|Как в базовом варианте/);
      assert.equal(d.getState().exerciseStatuses[ex.id],equipment==='balance_board'?'active':'available');
      assert.equal(ex.prerequisites,undefined);
      assert.equal(ex.progression.next_variant,undefined);
    }
  }
  // The existing full-foot assessment is a distinct protocol, not this exercise.
  assert.equal(d.RDCFG.tests[0].protocol_id,'balance_board_dome_down_front_full_foot_rear_toe');
  assert.match(d.RDCFG.tests[0].protocol.join(' '),/Вся стопа/);
});
test('corrected balance keeps legacy records and separates progress by equipment and front leg',()=>{
  const {dev:d}=app();
  const old=d.EXMAP.hemisphere_weight_shift_rear_heel_up;
  confirmedDose(d,old,{...old.dose,target_sec:30});
  d.getState().exerciseStatuses[old.id]='active';
  const backup=plain(d.getState()),restored=app(backup).dev;
  assert.deepEqual(plain(restored.getState().logs),backup.logs);
  assert.equal(restored.getState().xp,backup.xp);
  for(const id of ['hemisphere_weight_shift_injured_front','hemisphere_weight_shift_rear_heel_up'])
    assert.equal(restored.getState().exerciseStatuses[id],'archived');
  const right=restored.EXMAP.balance_board_both_tiptoe_right_front;
  assert.equal(restored.exerciseProgress(right).confirmedDays,0);
  assert.equal(restored.exerciseProgress(right).working.target_sec,10);
  confirmedDose(restored,right,{...right.dose,target_sec:20});
  assert.equal(restored.exerciseProgress(right).confirmed,true);
  for(const id of ['balance_board_both_tiptoe_left_front','hemisphere_both_tiptoe_right_front','hemisphere_both_tiptoe_left_front']){
    const progress=restored.exerciseProgress(restored.EXMAP[id]);
    assert.equal(progress.confirmedDays,0);
    assert.equal(progress.working.target_sec,10);
  }
  const saved=plain(restored.getState());
  assert.deepEqual(plain(app(saved).dev.getState()),saved);
});
test('heron starts at 20 steps and records the actual step count',()=>{
  const {dev:d,get}=app(),ex=d.EXMAP.obstacle_high_knee_heel_to_toe;
  d.openExercise(ex.id);assert.match(get('exerciseModal').innerHTML,/Сейчас: 20 шагов/);
  d.openLog(ex.id);assert.match(get('logModal').innerHTML,/Предложено: <b>20 шагов/);
  assert.match(get('logModal').innerHTML,/id="dose_target_steps"[^>]*value="20"/);
  assert.doesNotMatch(get('logModal').innerHTML,/Проходы|dose_passes/);
  const log=d.recordExercise(ex.id,{...ex.dose,target_steps:20},comfortable);
  assert.equal(log.actualDose.type,'steps');assert.equal(log.actualDose.target_steps,20);assert.equal(log.doseFactor,1);
  assert.equal(d.suggestedDose(ex).dose.target_steps,20);
});
test('legacy heron passes stay in history without setting the working step count',()=>{
  const {dev:d}=app(),ex=d.EXMAP.obstacle_high_knee_heel_to_toe,ts=Date.now()-5*86400000;
  for(let i=0;i<3;i++){
    const log={id:'passes'+i,exerciseId:ex.id,ts:ts+i*86400000,...comfortable,
      actualDose:{type:'passes',passes:3},suggestedDose:{type:'passes',passes:3},doseFactor:1,doseReason:'capacity'};
    d.getState().logs.push(log);morning(d,log);
  }
  const saved=plain(d.getState()),restored=app(saved).dev,progress=restored.exerciseProgress(ex);
  assert.deepEqual(plain(restored.getState()),saved);
  assert.equal(progress.working.type,'steps');assert.equal(progress.working.target_steps,20);
  assert.equal(progress.confirmed,false);assert.equal(progress.confirmedDays,0);
  assert.equal(restored.suggestedDose(ex).dose.target_steps,20);
  restored.recordExercise(ex.id,{...ex.dose,target_steps:18},comfortable);
  assert.equal(restored.suggestedDose(ex).dose.target_steps,18);
});
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
    window.dev={openFeedback,feedbackRecommendation,testDoseEvidence,nextVariant,lastRelatedExecution,openTest,editTest,deleteTest,startOfDay,nextDayStart,daysAgo,xpAndStreak,renderAll,closeDialog,showDialog,noRecommendationHTML,defaultState,migrateState,recordTest,completeAssessment,recalculateSession,testLoad,testHistory,symmetry,fatigueAt,allLoadEvents,prescriptionCounts,progressionAdherence,exerciseMastery,trainingMastery,readinessSummary,scoreExercise,scoreExerciseAtTime,recommendations,testRecommendations,actionRecommendations,postponeAction,resumeAction,postponedUntil,pendingAssessmentChecks,safetyFlag,assessmentSymptomModifier,selfReportDue,importData,exportData,saveTest,saveSelfReport,renderHome,renderTests,suggestedDose,exerciseProgress,exerciseResponse,confirmedSafe,dailyLoadPlan,currentSymptoms,recordExercise,recordSymptoms,classifyLog,isSuccessful,dailyTarget,openLog,saveLog,openSymptoms,saveSymptoms,openCheck,saveCheck,openMorning,saveMorning,pendingMorningDays,openExercise,renderStats,EXMAP,RDCFG,APP,getState:()=>state,setState:x=>state=x};
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
  assert.notEqual(d.scoreExercise(d.EXMAP.slider_injured_leg_three_directions,ts).status,'red'); // Estimated overlap affects ranking, not a daily lock.
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
  d.recordTest('single_leg_balance_errors',{left:0,right:0});assert.equal(d.symmetry(d.RDCFG.tests.find(t=>t.id==='single_leg_balance_errors'),{left:0,right:0}),1);
  d.recordTest('multidirectional_control_clean_rounds',{value:0});
  for(const value of [-1,NaN,Infinity,1.5])assert.throws(()=>d.recordTest('tandem_tiptoe_clean_steps',{value}));
  assert.throws(()=>d.recordTest('pogo_bilateral',{value:10}));
  const t=d.RDCFG.tests.find(t=>t.id==='multidirectional_control_clean_rounds');assert.equal(d.testLoad(t,{value:10000}).calf,d.APP.assessment.nominal_load*t.test_load_vector.calf*1.5);
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
test('an unmeasured available test leads the best-now widget ahead of prescribed exercises',()=>{
  const {dev:d,get}=app();
  d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',response:'same'});
  const actions=d.actionRecommendations();
  assert.equal(actions[0].kind,'test');assert.equal(actions[0].latest,undefined);
  assert.equal(actions.filter(r=>r.kind==='test').length,1);
  assert.ok(actions.some(r=>r.kind==='exercise'));
  assert.equal(d.testRecommendations().length,7);
  assert.ok(!actions.some(r=>r.test?.status==='locked'));
  d.getState().selectedStage='ready_for_impact';
  assert.equal(d.testRecommendations().length,10);
  d.renderHome();
  assert.match(get('bestNow').innerHTML,/Пройти тест/);
  assert.ok(get('bestNow').innerHTML.includes(actions[0].test.name));
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
test('missing results outrank training when load permits, and the catalog shows the next check date',()=>{
  const {dev:d,get}=app(),ts=Date.now();
  const s=d.recordTest('hemisphere_hold',{left:30,right:15},ts);
  d.recordTest('knee_to_wall',{left:10,right:8},ts);
  d.completeAssessment(s,{perceived_fatigue:'easy',pain_after:0},ts);
  assert.equal(d.actionRecommendations(ts)[0].kind,'test');
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
  const first=d.testRecommendations(ts)[0].test.id;
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
  d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',response:'same'},'unknown',ts);
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
function completePlans(d,days=[7,6,5,4,3],ts=Date.now()){
  const groups=new Map(Object.values(d.EXMAP).filter(ex=>d.getState().exerciseStatuses[ex.id]==='active'&&ex.prescription_credit?.group).map(ex=>[ex.prescription_credit.group,ex]));
  for(const ago of days){
    const day=new Date(d.startOfDay(ts));day.setDate(day.getDate()-ago);
    for(const [group,ex] of groups)for(let i=0;i<d.APP.program.prescription_groups[group].target_per_day;i++)
      d.getState().logs.push({id:`plan_${+day}_${group}_${i}`,exerciseId:ex.id,ts:+day+(i+1)*60000,...comfortable});
  }
}
test('four complete plans block a trial; five unlock it without replacing quality and recovery checks',()=>{
  const clock=new Date(2026,9,10,12).getTime(),{dev:d,get}=app(null,clock),ex=d.EXMAP.tiptoe_square_corner_lunges;
  confirmedDose(d,ex,ex.dose,'easy',clock-2*DAY);
  assert.equal(d.exerciseProgress(ex).confirmed,true);
  assert.equal(d.suggestedDose(ex).trial,null);
  completePlans(d,[7,6,5,4],clock);
  assert.equal(d.progressionAdherence(clock).completedDays,4);
  assert.equal(d.suggestedDose(ex).trial,null);
  assert.match(d.suggestedDose(ex).reason,/4 из последних 7/);
  d.openExercise(ex.id);assert.doesNotMatch(get('exerciseModal').innerHTML,/Пробный шаг:/);
  completePlans(d,[3],clock);
  assert.equal(d.progressionAdherence(clock).completedDays,5);
  assert.equal(d.suggestedDose(ex).trial.rounds,3);
  d.recordSymptoms({pain:0,steadiness:'shaky',fatigue:'low'},'combined',clock);
  assert.equal(d.suggestedDose(ex).trial,null);
});
test('adherence uses only seven full training days and rolls exactly at 05:00',()=>{
  const clock=new Date(2026,9,10,4,59).getTime(),{dev:d,get}=app(null,clock);
  completePlans(d,[8,4,3,2,1,0,-1],clock);
  assert.equal(d.progressionAdherence(clock).completedDays,4);
  assert.equal(d.progressionAdherence(clock).allowed,false);
  const boundary=new Date(2026,9,10,5).getTime();
  assert.equal(d.progressionAdherence(boundary).completedDays,5);
  assert.equal(d.progressionAdherence(boundary).allowed,true);
  d.renderHome();assert.match(get('dailyActivity').innerHTML,/Регулярность: 4\/7/);
  assert.match(get('dailyActivity').innerHTML,/Сегодняшний день пока не учитывается/);
});
test('a complete day requires all active goals and shared line variants count toward one goal',()=>{
  const clock=new Date(2026,9,10,12).getTime(),{dev:d}=app(null,clock);
  completePlans(d,[7,5,4,2,1],clock);
  const missing=d.getState().logs.find(l=>l.exerciseId==='towel_stretch_straight_knee');
  d.getState().logs=d.getState().logs.filter(l=>l.id!==missing.id);
  assert.equal(d.progressionAdherence(clock).completedDays,4);
  d.recordTest('tandem_flat_clean_steps',{value:100},missing.ts);
  assert.equal(d.progressionAdherence(clock).completedDays,4);
  d.getState().logs.push(missing);
  const lines=d.getState().logs.filter(l=>d.EXMAP[l.exerciseId].prescription_credit?.group==='line_walk');
  for(const [i,l] of lines.entries())l.exerciseId=i%2?'tandem_walk_tiptoe':'tandem_walk_flat';
  assert.equal(d.progressionAdherence(clock).completedDays,5);
  const saved=plain(d.getState());
  assert.equal(app(saved,clock).dev.progressionAdherence(clock).completedDays,5);
  assert.deepEqual(plain(d.getState()),saved);
  for(const id of Object.keys(d.getState().exerciseStatuses))d.getState().exerciseStatuses[id]='archived';
  assert.equal(d.progressionAdherence(clock).allowed,false);
});
test('test-based dose growth and a harder variant require five full plans; reductions remain available',()=>{
  const clock=new Date(2026,9,10,12).getTime(),{dev:d}=app(null,clock),ex=d.EXMAP.tandem_walk_flat;
  const session=d.recordTest('tandem_flat_clean_steps',{value:100,difficulty:'easy',stop_reason:'cap',pain_after:0},clock-DAY);
  d.completeAssessment(session,{pain_after:0,perceived_fatigue:'easy'},clock-DAY);
  completePlans(d,[7,6,5,4],clock);
  assert.equal(d.suggestedDose(ex).dose.target_steps,16);
  assert.equal(d.suggestedDose(ex).doseFromTest,false);
  assert.equal(d.nextVariant(ex),null);
  completePlans(d,[3],clock);
  assert.equal(d.suggestedDose(ex).dose.target_steps,32);
  assert.equal(d.nextVariant(ex).ex.id,'tandem_walk_tiptoe');
  d.getState().logs=[];d.getState().testLogs[0].value=10;
  assert.equal(d.suggestedDose(ex).dose.target_steps,5);
});
test('unmeasured tests lead overdue repeats while feedback, postponement and symptoms keep priority',()=>{
  const clock=new Date(2026,9,10,12).getTime(),{dev:d,get}=app(null,clock);
  const missing='single_leg_balance_errors';
  for(const t of d.RDCFG.tests.filter(t=>t.status!=='locked'&&t.id!==missing)){
    const s=d.recordTest(t.id,t.bilateral?{left:1,right:1}:{value:1},clock-20*DAY);
    d.completeAssessment(s,{pain_after:0,perceived_fatigue:'easy'},clock-20*DAY);
  }
  assert.equal(d.actionRecommendations()[0].kind,'feedback');
  assert.equal(d.actionRecommendations()[1].test.id,missing);
  d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock);
  assert.equal(d.actionRecommendations()[0].test.id,missing);
  d.renderHome();assert.ok(get('bestNow').innerHTML.includes('Одноногий баланс'));
  d.postponeAction('test',missing,'tomorrow');
  assert.equal(d.actionRecommendations()[0].kind,'exercise');
  const repeat=d.actionRecommendations().findIndex(r=>r.kind==='test');assert.ok(repeat>=0&&repeat<6);
  d.renderHome();assert.match(get('recommendations').innerHTML,/pill green">Тест/);
  d.resumeAction('test',missing);
  assert.equal(d.actionRecommendations()[0].test.id,missing);
  d.recordSymptoms({pain:3,steadiness:'steady',fatigue:'low'},'combined',clock+1);
  assert.equal(d.testRecommendations(clock+1).length,0);
  assert.ok(!d.actionRecommendations(clock+1).some(r=>r.kind==='test'));
});
test('moderate effort and fatigue without worsening retain dose over repeated days',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static;
  completePlans(d);
  for(let i=0;i<7;i++){
    const ts=Date.now()-(9-i)*DAY,dose=d.suggestedDose(ex,ts).dose;
    assert.equal(dose.reps,10);
    const l=d.recordExercise(ex.id,dose,{...comfortable,fatigue:'medium',difficulty:'normal'},ts);morning(d,l);
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
test('estimated accumulated load lowers priority without cancelling daily goals',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static,ts=Date.now();
  d.getState().customActivities.push({id:'walk',ts,load:{calf:65,ankle_control:70},painAfter:0});
  assert.equal(d.dailyLoadPlan(ex,ts).status,'normal');assert.ok(d.recommendations(ts).some(r=>r.ex.id===ex.id));assert.equal(d.dailyTarget(ex,ts),3);
  assert.equal(d.dailyLoadPlan(ex,ts+2*DAY).status,'normal');
  const other=app().dev;assessmentScenario(other,ts);
  assert.equal(other.dailyLoadPlan(other.EXMAP.slider_injured_leg_three_directions,ts).status,'normal');
});
test('same-day sessions and invented same-day morning feedback cannot confirm or progress a level',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static,day=dayStart(Date.now()-2*DAY);
  completePlans(d);
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
  completePlans(d);
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
    const {dev:d}=app(),ex=d.EXMAP[id];completePlans(d);confirmedDose(d,ex,ex.dose);
    assert.equal(d.suggestedDose(ex).trial[key],value);
  }
});
test('a failed trial returns to the confirmed variant instead of continuing the harder option',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static;completePlans(d);confirmedDose(d,ex,ex.dose);
  const plan=d.suggestedDose(ex),l=d.recordExercise(ex.id,plan.trial,{...comfortable,doseReason:'trial'},Date.now()-DAY);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'shaky'},l.id,l.ts+3600000);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'unknown',Date.now()-3600000);
  const next=d.suggestedDose(ex);assert.equal(next.working.reps,10);assert.notEqual(next.dose.weight_distribution,'right_bias');
  assert.equal(next.trial,null);
});
test('normal effort confirms a level while unresolved recovery and missing feedback prevent growth',()=>{
  const {dev:d}=app(),ex=d.EXMAP.bilateral_tiptoe_static;
  completePlans(d);
  const logs=confirmedDose(d,ex,{...ex.dose,reps:6},'normal');
  assert.equal(d.exerciseProgress(ex).confirmed,true);assert.equal(d.suggestedDose(ex).trial,null);
  const a=app().dev,e=a.EXMAP.bilateral_tiptoe_static;completePlans(a);
  for(const l of logs)a.recordExercise(e.id,l.actualDose,{...comfortable,difficulty:'easy'},l.ts);
  assert.equal(a.exerciseProgress(e).confirmed,false);assert.equal(a.suggestedDose(e).trial,null);
});
test('one shared morning check stores strong fatigue and covers the complete day without blaming each exercise',()=>{
  const clock=dayStart(Date.now())+10*3600000,{dev:d,get}=app(null,clock),ex=d.EXMAP.bilateral_tiptoe_static;
  const ts=clock-DAY,l=d.recordExercise(ex.id,ex.dose,comfortable,ts);
  d.recordExercise('tandem_walk_flat',d.EXMAP.tandem_walk_flat.dose,comfortable,ts+3600000);
  d.getState().customActivities.push({id:'walk',ts,load:{calf:5}});
  const originals=plain(d.getState().logs),day=d.startOfDay(ts);
  assert.equal(d.pendingMorningDays().length,1);d.renderHome();assert.match(get('bestNow').innerHTML,/Одна общая оценка/);
  assert.equal(d.actionRecommendations()[0].mode,'morning');assert.equal(get('pendingChecksWrap').innerHTML,'');
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


test('rest explanation shows exact windows while a reported adverse episode remains distinct',()=>{
  const today=dayStart(Date.now()),clock=today+(22*60+9)*60000+30000;
  const {dev:d,get}=app(null,clock);
  const ex=d.EXMAP.bilateral_tiptoe_static;
  const l=d.recordExercise(ex.id,ex.dose,comfortable,today+19*3600000);
  d.recordSymptoms({pain:2,steadiness:'shaky',fatigue:'low',response:'worse'},l.id,today+22*3600000);
  // One light non-mobility execution in this episode requires renewed feedback.
  d.recordExercise('tandem_walk_flat',d.EXMAP.tandem_walk_flat.dose,{...comfortable,doseReason:'daily_load'},today+(22*60+1)*60000);
  for(const [id,minutes] of [['towel_stretch_straight_knee',5],['towel_stretch_bent_knee',9]]){
    d.recordExercise(id,d.EXMAP[id].dose,comfortable,today+(22*60+minutes)*60000);
  }
  d.getState().postponedActions['test:knee_to_wall']=today+DAY;
  assert.equal(d.actionRecommendations(clock)[0].kind,'feedback');d.renderHome();
  assert.match(get('bestNow').innerHTML,/Оценить самочувствие после нагрузки/);
  const card=d.noRecommendationHTML(clock);
  assert.match(card,/Сейчас восстановление/);assert.match(card,/шаткая, боль 2/);
  assert.match(card,/оцени самочувствие/);assert.match(card,/23:35/);assert.match(card,/23:39/);
  assert.equal(d.dailyTarget(ex),3);assert.match(get('dailyGrid').innerHTML,/1\/3/);
  d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',response:'better'},'unknown',clock);
  assert.ok(d.actionRecommendations(clock).length>0);
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
test('estimated load decays continuously without a permission reset at 05:00',()=>{
  const evening=new Date(2026,9,6,23).getTime(),d=app().dev,ex={load_channels:{ankle_control:.5}};
  d.getState().customActivities.push({id:'late-walk',ts:evening,load:{ankle_control:75},painAfter:0});
  for(const ts of [new Date(2026,9,7,0).getTime(),new Date(2026,9,7,4,59).getTime()])assert.equal(d.dailyLoadPlan(ex,ts).status,'normal');
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

test('a complete matching test updates the ordinary dose without a separate probe or compounding',()=>{
  const ts=Date.now(),{dev:d,get}=app(null,ts),ex=d.EXMAP.tandem_walk_flat;
  completePlans(d);
  const session=d.recordTest('tandem_flat_clean_steps',{value:100,difficulty:'easy',stop_reason:'cap',pain_after:0},ts-DAY);
  d.completeAssessment(session,{pain_after:0,perceived_fatigue:'moderate'},ts-DAY);
  const plan=d.suggestedDose(ex);
  assert.equal(plan.dose.target_steps,32);assert.equal(plan.working.target_steps,16);
  assert.equal(plan.evidence.capacity,100);assert.equal(plan.doseFromTest,true);
  assert.equal(d.suggestedDose(d.EXMAP.tandem_walk_tiptoe).dose.target_steps,12);
  d.openExercise(ex.id);assert.match(get('exerciseModal').innerHTML,/Тест этого варианта: 100/);
  assert.match(get('exerciseModal').innerHTML,/Сейчас: 32 шага/);
  assert.doesNotMatch(get('exerciseModal').innerHTML,/Записать проб|Рабочий уровень: 16/);
  d.openLog(ex.id);assert.match(get('logModal').innerHTML,/value="32"/);
  const l=d.recordExercise(ex.id,plan.dose,{...comfortable,doseReason:'test'},ts,plan.dose);
  const after=d.suggestedDose(ex);
  assert.equal(after.working.target_steps,16);assert.equal(after.dose.target_steps,32);
  assert.equal(after.confirmed,false);
  // A user-entered comfortable volume must not double the estimate again.
  l.doseReason='capacity';assert.equal(d.suggestedDose(ex).dose.target_steps,32);l.doseReason='test';
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'shaky',response:'worse'},l.id,ts+1000);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady',response:'better'},'unknown',ts+2000);
  assert.equal(d.suggestedDose(ex,ts+2000).dose.target_steps,16);
});

test('an incomplete or adverse matching test cannot increase the routine dose',()=>{
  const ts=Date.now(),{dev:d,get}=app(null,ts),ex=d.EXMAP.tandem_walk_flat;
  completePlans(d);
  const session=d.recordTest('tandem_flat_clean_steps',{value:100,difficulty:'unknown',stop_reason:'unknown'},ts-DAY);
  d.completeAssessment(session,{pain_after:0,perceived_fatigue:'moderate'},ts-DAY);
  assert.equal(d.suggestedDose(ex).dose.target_steps,16);
  d.openExercise(ex.id);assert.match(get('exerciseModal').innerHTML,/Уточнить запись теста/);
  assert.doesNotMatch(get('exerciseModal').innerHTML,/32|Записать проб/);
  const log=d.getState().testLogs[0];
  for(const values of [{difficulty:'hard',stop_reason:'cap',pain_after:0},{difficulty:'easy',stop_reason:'quality',pain_after:0},{difficulty:'easy',stop_reason:'cap',pain_after:3}]){
    Object.assign(log,values);assert.equal(d.suggestedDose(ex).dose.target_steps,16);
  }
});

test('a lower matching test reduces the next dose; stale, future and different protocols do not calibrate',()=>{
  const ts=Date.now(),{dev:d}=app(null,ts),ex=d.EXMAP.tandem_walk_flat;
  d.recordTest('tandem_flat_clean_steps',{value:10},ts-3600000);
  assert.equal(d.suggestedDose(ex).dose.target_steps,5);
  const l=d.getState().testLogs[0];l.protocol_id='legacy_tandem_flat_clean_steps';
  assert.equal(d.suggestedDose(ex).dose.target_steps,16);
  l.protocol_id=d.RDCFG.tests.find(t=>t.id===l.testId).protocol_id;l.value=100;l.ts=ts-31*DAY;
  assert.equal(d.suggestedDose(ex).evidence,null);
  l.ts=ts+DAY;assert.equal(d.suggestedDose(ex).evidence,null);
});

test('the same movement and step count have the same estimated load in a test and an exercise',()=>{
  const {dev:d}=app(),ex=d.EXMAP.tandem_walk_tiptoe,t=d.RDCFG.tests.find(t=>t.dose_exercise_id===ex.id);
  const log=d.recordExercise(ex.id,{...ex.dose,target_steps:100},comfortable);
  const load=d.allLoadEvents().find(e=>e.source_id===log.id).channels;
  for(const k of Object.keys(load))assert.ok(Math.abs(d.testLoad(t,{value:100})[k]-load[k])<1e-9);
  const flat=d.RDCFG.tests.find(t=>t.id==='tandem_flat_clean_steps');
  assert.ok(d.testLoad(flat,{value:100}).calf<d.testLoad(t,{value:100}).calf);
  assert.equal(d.testLoad(flat,{value:0}).calf,0);
  const rom=d.RDCFG.tests.find(t=>t.id==='knee_to_wall');
  assert.deepEqual(plain(d.testLoad(rom,{left:5,right:5})),plain(d.testLoad(rom,{left:15,right:15})));
});

test('clean flat walking unlocks a suggested harder test after rest without transferring results',()=>{
  const ts=Date.now(),{dev:d}=app(null,ts),ex=d.EXMAP.tandem_walk_flat;
  completePlans(d);
  const session=d.recordTest('tandem_flat_clean_steps',{value:100,difficulty:'normal',stop_reason:'cap',pain_after:0},ts);
  d.completeAssessment(session,{pain_after:0,perceived_fatigue:'easy'},ts);
  const next=d.nextVariant(ex,ts);
  assert.equal(next.ex.id,'tandem_walk_tiptoe');assert.equal(next.test.id,'tandem_tiptoe_clean_steps');
  assert.equal(next.after,ts+180*60000);
  assert.equal(d.testHistory(next.test).length,0);
  assert.equal(d.suggestedDose(next.ex).dose.target_steps,12);
  assert.equal(d.scoreExercise(next.ex,ts).score,-1);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'shaky',response:'worse'},'combined',ts+1000);
  assert.equal(d.nextVariant(ex,ts+1000),null);
});

test('three spaced home rounds remain possible with comfortable execution and stable goals',()=>{
  const clock=new Date(2026,9,7,21).getTime(),{dev:d}=app(null,clock);
  const ids=['towel_stretch_straight_knee','towel_stretch_bent_knee','bilateral_tiptoe_static','tandem_walk_flat','right_leg_balance_left_front_back','left_side_lunge_right_leg_straight'];
  for(const hour of [9,13,17])for(const [i,id] of ids.entries()){
    const ts=new Date(2026,9,7,hour,i*3).getTime(),ex=d.EXMAP[id];
    assert.equal(d.dailyTarget(ex,ts),3);assert.notEqual(d.scoreExercise(ex,ts).status,'red');
    assert.ok(d.scoreExercise(ex,ts).score>=0,id);
    d.recordExercise(id,d.suggestedDose(ex,ts).dose,comfortable,ts);
  }
  assert.ok(Object.values(d.prescriptionCounts(clock)).every(n=>n===3));
});

test('hard execution reduces volume while moderate effort alone preserves it and daily frequency',()=>{
  const ts=Date.now(),{dev:d}=app(null,ts),ex=d.EXMAP.bilateral_tiptoe_static;
  d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'hard'},ts-3*3600000);
  const plan=d.suggestedDose(ex);
  assert.ok(plan.dose.reps<10);assert.equal(plan.working.reps,10);assert.equal(d.dailyTarget(ex),3);
  assert.equal(d.suggestedDose(d.EXMAP.tandem_walk_flat).dose.target_steps,16);
});

test('morning history reduces the day volume without falsely blaming every exercise',()=>{
  const ts=new Date(2026,9,7,10).getTime(),{dev:d}=app(null,ts),ex=d.EXMAP.bilateral_tiptoe_static;
  const l=d.recordExercise(ex.id,ex.dose,comfortable,ts-DAY);
  d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(l.ts),pain:0,steadiness:'steady',fatigue:'low',response:'same',historyKnown:true,historyWorse:true},'combined',ts-3600000);
  assert.equal(d.classifyLog(l),'normal');assert.equal(d.dailyLoadPlan(ex).status,'light');
  const dose=d.suggestedDose(ex).dose;assert.ok(dose.reps<10);
  d.recordExercise(ex.id,dose,{...comfortable,doseReason:'daily_load'},ts);
  assert.equal(d.suggestedDose(ex).dose.reps,dose.reps);assert.equal(d.dailyTarget(ex),3);
});

test('general fatigue affects today without becoming a local adverse reaction',()=>{
  const ts=Date.now(),{dev:d}=app(null,ts),ex=d.EXMAP.bilateral_tiptoe_static;
  const l=d.recordExercise(ex.id,ex.dose,comfortable,ts-3*3600000);
  d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',generalFatigue:'high',response:'same'},'combined',ts);
  assert.equal(d.dailyLoadPlan(ex).status,'light');assert.equal(d.classifyLog(l),'normal');
  assert.equal(d.testRecommendations().length,0);assert.equal(d.safetyFlag(),false);
});

test('test editing corrects the variant and its load without duplicating execution or XP',()=>{
  const ts=Date.now(),{dev:d}=app(null,ts);
  const session=d.recordTest('tandem_tiptoe_clean_steps',{value:100},ts-3600000);
  d.completeAssessment(session,{pain_after:0,perceived_fatigue:'easy'},ts-3600000);
  const log=d.getState().testLogs[0],before=plain(log),oldLoad=d.fatigueAt(ts).calf;
  d.editTest(log.id,'tandem_flat_clean_steps',{value:100,difficulty:'unknown',stop_reason:'unknown',pain_after:null});
  assert.equal(d.getState().testLogs.length,1);assert.equal(log.ts,before.ts);
  assert.equal(d.getState().load_events.length,1);assert.equal(d.getState().xp,0);
  assert.ok(d.fatigueAt(ts).calf<oldLoad);assert.deepEqual(plain(d.getState().testCorrections[0].original),before);
  assert.equal(d.testHistory(d.RDCFG.tests.find(t=>t.id==='tandem_tiptoe_clean_steps')).length,0);
  assert.deepEqual(plain(app(plain(d.getState()),ts).dev.getState()),plain(d.getState()));
});

test('test form requires protocol confirmation and a second save cannot duplicate a result',()=>{
  const {dev:d,get}=app(),id='tandem_flat_clean_steps';
  d.openTest(id);get('testValue').value='100';get('testDifficulty').value='easy';get('testStop').value='cap';get('testPain').value='0';
  d.saveTest(id);assert.equal(d.getState().testLogs.length,0);
  get('testProtocolConfirmed').checked=true;d.saveTest(id);d.saveTest(id);
  assert.equal(d.getState().testLogs.length,1);
  d.openTest(id);assert.match(get('testModal').innerHTML,/Уже записано/);assert.match(get('testModal').innerHTML,/Исправить эту запись/);
});

test('deleting an accidental test removes only its event and keeps the other measurements',()=>{
  const {dev:d,context}=app();
  const session=d.recordTest('hemisphere_hold',{left:30,right:15});
  d.recordTest('tandem_flat_clean_steps',{value:100});
  const deleted=d.getState().testLogs[1].id;context.confirm=()=>true;
  d.deleteTest(deleted);
  assert.equal(d.getState().testLogs.length,1);assert.equal(d.getState().load_events.length,1);
  assert.equal(session.test_log_ids.length,1);assert.equal(d.getState().testCorrections.length,1);
});

test('a legacy adverse exercise still reduces its dose without inventing historical volume',()=>{
  const ts=Date.now(),exId='bilateral_tiptoe_static',legacy={id:'legacy',exerciseId:exId,ts:ts-DAY,painDuring:0,painAfter:0,fatigue:'low',technique:'ok'};
  const {dev:d}=app({logs:[legacy]},ts);
  d.recordSymptoms({pain:2,fatigue:'low',steadiness:'shaky',response:'worse'},legacy.id,ts-DAY+3600000);
  d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady',response:'better'},'unknown',ts-DAY+7200000);
  assert.ok(d.suggestedDose(d.EXMAP[exId]).dose.reps<10);
  assert.deepEqual(plain(d.getState().logs[0]),legacy);
});

test('zero capacity defers only that movement until a corrected test or successful execution',()=>{
  const ts=Date.now(),{dev:d}=app(null,ts),ex=d.EXMAP.tandem_walk_tiptoe;
  d.recordTest('tandem_tiptoe_clean_steps',{value:0},ts-4*3600000);
  assert.equal(d.dailyLoadPlan(ex).status,'pause');assert.equal(d.dailyTarget(ex),3);
  assert.equal(d.dailyLoadPlan(d.EXMAP.tandem_walk_flat).status,'normal');
  d.recordExercise(ex.id,{...ex.dose,target_steps:3},comfortable,ts);
  assert.equal(d.dailyLoadPlan(ex).status,'normal');
});

test('fresh exercise feedback satisfies the current recommendation without a repeated questionnaire',()=>{
  const clock=new Date(2026,9,7,12).getTime(),{dev:d,get}=app(null,clock);
  assert.equal(d.actionRecommendations()[0].kind,'feedback');
  d.recordExercise('tandem_walk_flat',d.EXMAP.tandem_walk_flat.dose,comfortable,clock-60000);
  assert.ok(d.actionRecommendations().every(r=>r.kind!=='feedback'));
  d.renderHome();assert.doesNotMatch(get('bestNow').innerHTML,/Оценить самочувствие/);
  d.getState().logs[0].painAfter=1;d.openSymptoms();assert.match(get('symptomsModal').innerHTML,/id="symptomPain"[^>]*value="1"/);
  d.closeDialog('symptomsDialog');
  d.recordTest('tandem_flat_clean_steps',{value:100,difficulty:'normal',stop_reason:'cap',pain_after:0},clock);
  const feedback=d.actionRecommendations()[0];assert.equal(feedback.mode,'assessment');
  d.openFeedback(feedback.mode,feedback.id);assert.equal(get('assessmentDialog').open,true);
  d.completeAssessment(d.getState().assessment_sessions[0],{pain_after:0,perceived_fatigue:'moderate'},clock);
  assert.ok(d.actionRecommendations().every(r=>r.kind!=='feedback'));
});

test('one recommended morning check covers yesterday without duplicating the pending card',()=>{
  const clock=new Date(2026,9,7,10).getTime(),{dev:d,get}=app(null,clock);
  const l=d.recordExercise('tandem_walk_flat',d.EXMAP.tandem_walk_flat.dose,comfortable,clock-DAY);
  const session=d.recordTest('tandem_flat_clean_steps',{value:100},clock-DAY);
  d.completeAssessment(session,{pain_after:0,perceived_fatigue:'moderate'},clock-DAY);
  const feedback=d.actionRecommendations()[0];assert.equal(feedback.kind,'feedback');assert.equal(feedback.mode,'morning');
  d.openFeedback(feedback.mode,feedback.id);assert.equal(get('checkDialog').open,true);
  d.renderAll();assert.match(get('bestNow').innerHTML,/вчерашней нагрузки/);assert.equal(get('pendingChecksWrap').innerHTML,'');
  assert.match(get('assessmentWrap').innerHTML,/Оценить восстановление/);
  morning(d,l,'same',clock);
  assert.ok(d.actionRecommendations().every(r=>r.kind!=='feedback'));
  d.recordSymptoms({pain:2,steadiness:'shaky',fatigue:'low',response:'worse'},l.id,clock-DAY+3600000);
  d.openMorning(feedback.id);assert.match(get('checkModal').innerHTML,/value="worse" selected/);
});
