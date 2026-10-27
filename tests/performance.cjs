const {test}=require('node:test');
const assert=require('node:assert/strict');

module.exports=({app,plain,comfortable,DAY})=>{
  test('decision snapshots store repeated reactions once and restore every original fact',()=>{
    const {dev:d}=app(),saved=plain(d.getState());
    const reactions=Array.from({length:12},(_,i)=>({ts:i,pain:i%3,normal:true,source_type:'symptoms',comment:'Тогда известная реакция после нагрузки'}));
    const snapshot={observations:[reactions[0]],measurements:[],executions:[],activities:[],activityEvidence:[],unknown:{keep:true},
      evidence:Array.from({length:24},(_,i)=>({logId:'log'+i,morning:reactions[0],reports:[],reactions:[...reactions,reactions[0]]}))};
    saved.decisionLog=[{id:'old',action:'plan_selected',details:{},snapshot},{id:'same_facts',action:'plan_ended',details:{},snapshot:plain(snapshot)}];
    const migrated=d.migrateState(saved),compact=migrated.decisionLog[0].snapshot;
    assert.equal(migrated.decisionFacts.length,12,'facts are shared across different decisions');
    assert.deepEqual(plain(d.decisionSnapshot(migrated.decisionLog[0],migrated)),snapshot);
    assert.ok(JSON.stringify(compact).length+JSON.stringify(migrated.decisionFacts).length<JSON.stringify(snapshot).length/3);
    assert.deepEqual(plain(saved.decisionLog[0].snapshot),snapshot,'migration does not edit the source backup');
    assert.deepEqual(plain(d.migrateState(migrated)),plain(migrated));
    assert.deepEqual(plain(app(plain(migrated)).dev.getState().decisionLog),plain(migrated.decisionLog));
    assert.deepEqual(plain(migrated.logs),saved.logs);
  });

  test('new decisions use compact evidence and keep the facts known before later feedback',()=>{
    const clock=new Date(2026,9,27,18).getTime(),{dev:d}=app(null,clock),ex=d.EXMAP.towel_stretch_straight_knee;
    for(let i=0;i<3;i++)d.getState().logs.push({id:'log'+i,exerciseId:ex.id,ts:clock-i*60000,...comfortable,phase:'after',actualDose:{...ex.dose}});
    d.recordDecision('test_snapshot','Причина',{exerciseId:ex.id},clock,'one');
    const original=plain(d.getState().decisionLog[0]),snapshot=original.snapshot;
    assert.equal(snapshot.evidence.length,3);
    assert.equal(snapshot.format,'facts-v1');
    assert.ok(d.getState().decisionFacts.length);
    assert.ok(snapshot.evidence.every(e=>e.reactions.every(i=>typeof i==='number'&&d.getState().decisionFacts[i])));
    const known=d.decisionSnapshot(original);
    d.getState().logs[0].nextDay='worse';
    assert.equal(known.executions[0].nextDay,undefined,'later edits cannot rewrite the saved evidence');
    d.recordSymptoms({pain:4,steadiness:'shaky',fatigue:'high'},'combined',clock+1);
    d.recordDecision('test_snapshot','Причина',{exerciseId:ex.id},clock+1,'one');
    assert.equal(d.getState().decisionLog.length,1);
    assert.deepEqual(plain(d.getState().decisionLog[0]),original);
  });

  test('opening and saving a long history avoid repeated date work and show fresh feedback',()=>{
    const clock=new Date(2026,9,27,18).getTime(),a=app(null,clock),d=a.dev,state=d.getState();
    const ids=['towel_stretch_straight_knee','towel_stretch_bent_knee','bilateral_tiptoe_static','tandem_walk_flat','right_leg_balance_left_front_back','left_side_lunge_right_leg_straight'];
    for(let age=20;age>=1;age--){
      const day=d.startOfDay(clock-age*DAY);
      for(const hour of [2,6,10])for(const id of ids){
        const ex=d.EXMAP[id],dose={...ex.dose};
        state.logs.push({id:age+'_'+hour+'_'+id,exerciseId:id,ts:day+hour*3600000,...comfortable,phase:'after',symptomScope:'combined',actualDose:dose,suggestedDose:{...dose}});
      }
      state.symptomReports.push({id:'morning'+age,ts:day+DAY+3*3600000,trainingDay:day,phase:'morning',context:'combined',pain:0,steadiness:'steady',fatigue:'low',response:'same',historyKnown:true,historyWorse:false});
    }
    const original=plain(state.logs),OriginalDate=a.context.Date;
    let dateWork=0;
    // A deterministic work budget catches the previous millions of repeated scans without a timing assertion.
    a.context.Date=class extends OriginalDate{constructor(...args){super(...args);assert.ok(++dateWork<2000000,'repeated history calculations exceeded the date-work budget');}};
    d.renderAll();
    assert.deepEqual(plain(state.logs),original);
    assert.ok(dateWork>0);
    const count=state.logs.length,ex=d.EXMAP.towel_stretch_straight_knee;
    dateWork=0;
    d.recordExercise(ex.id,ex.dose,comfortable,clock,ex.dose);
    dateWork=0;d.renderAll();
    assert.equal(state.logs.length,count+1);
    assert.equal(d.planCounts().towel_straight,1);
    assert.match(a.get('dailyGrid').innerHTML,/1\/3/);
    d.recordSymptoms({pain:5,steadiness:'steady',fatigue:'low'},'combined',clock+1);
    a.context.Date.now=()=>clock+1;
    dateWork=0;d.renderAll();
    assert.equal(d.safetyFlag(clock+1),true);
    assert.match(a.get('pendingChecksWrap').innerHTML,/приостановлены/);
    assert.doesNotMatch(a.storage.get('ankle_mastery_static_v2'),/historyCache/);
  });
};
