// No build step or third-party dependencies: node --test tests/app.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const KEY='ankle_mastery_static_v2';
const plain=x=>JSON.parse(JSON.stringify(x));
function app(saved){
  const storage=new Map(saved?[[KEY,JSON.stringify(saved)]]:[]),elements=new Map();
  const get=id=>{
    if(!elements.has(id)){
      const config=html.match(new RegExp('id="'+id+'">(.*?)</script>'));
      elements.set(id,{textContent:config?config[1]:'',value:'',innerHTML:'',style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},appendChild(){},insertAdjacentHTML(_,s){this.innerHTML+=s;},showModal(){},close(){},click(){}});
    }
    return elements.get(id);
  };
  const context={document:{getElementById:get,querySelectorAll:()=>[],createElement:()=>({click(){}})},window:{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},Date,Math,JSON,Number,Object,Array,Set,Infinity,Blob,URL,setTimeout:()=>0,setInterval:()=>0,confirm:()=>false};
  const code=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('\nrenderAll();\nsetInterval(renderHome,15*60*1000);',`
    window.dev={defaultState,migrateState,recordTest,completeAssessment,recalculateSession,testLoad,testHistory,symmetry,fatigueAt,allLoadEvents,prescriptionCounts,exerciseMastery,trainingMastery,readinessSummary,scoreExercise,scoreExerciseAtTime,recommendations,testRecommendations,actionRecommendations,pendingAssessmentChecks,safetyFlag,assessmentSymptomModifier,selfReportDue,importData,exportData,saveTest,saveSelfReport,renderHome,renderTests,EXMAP,RDCFG,APP,getState:()=>state,setState:x=>state=x};
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
  assert.equal(d.scoreExercise(d.EXMAP.slider_injured_leg_three_directions,ts).status,'green');
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
  assert.equal(d.safetyFlag(),false);assert.equal(d.assessmentSymptomModifier(ex),1);
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
