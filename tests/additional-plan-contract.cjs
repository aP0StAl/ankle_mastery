const {test}=require('node:test');
const assert=require('node:assert/strict');

module.exports=({app,plain,comfortable,DAY})=>{
  const clock=new Date(2026,9,10,12).getTime(),heron='obstacle_high_knee_heel_to_toe';
  const normal=(d,ts)=>d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',response:'same'},'combined',ts);
  const scenario=(ts=clock)=>{
    const result=app(null,ts),d=result.dev;
    for(const t of d.RDCFG.tests)d.getState().postponedActions['test:'+t.id]=ts+3*DAY;
    normal(d,ts-1);
    return result;
  };

  test('normal observations and an unrelated exercise do not persist or enlarge an automatic proposal',()=>{
    const {dev:d}=scenario(),stretch=d.EXMAP.towel_stretch_straight_knee;
    const before=plain(d.autoAdditionalPlan(clock).targets);
    assert.ok(Object.keys(before).length>0);assert.ok(d.getState().additionalPlan==null);
    d.recordExercise(stretch.id,stretch.dose,{...comfortable,symptomScope:'combined'},clock+1,stretch.dose);
    normal(d,clock+2);
    assert.deepEqual(plain(d.autoAdditionalPlan(clock+2).targets),before);
    assert.ok(d.getState().additionalPlan==null);
  });

  test('an explicit additional plan fixes a finite dose and excludes executions before it started',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP[heron];
    const earlier=d.recordExercise(ex.id,ex.dose,comfortable,clock-60000,ex.dose);
    normal(d,clock-1);
    d.startAdditionalPlan([heron],clock);
    const plan=d.getState().additionalPlan,state=d.additionalPlanState(ex,clock);
    assert.equal(plan.startedAt,clock);assert.equal(plan.closedAt,null);
    assert.deepEqual(plain(plan.targets[heron]),plain(ex.dose));
    assert.equal(state.status,'remaining');assert.equal(state.target,20);
    assert.equal(state.used,0);assert.equal(state.remaining,20);
    assert.notEqual(earlier.additionalPlanId,plan.id);
    assert.ok(d.scoreExercise(ex,clock).score>=0);
  });

  test('comfortable time-limited parts consume one fixed dose instead of producing new full doses',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP[heron],stretch=d.EXMAP.towel_stretch_straight_knee;
    d.startAdditionalPlan([heron],clock);
    const target=plain(d.getState().additionalPlan.targets[heron]);
    for(const [i,steps] of [5,5,10].entries()){
      const ts=clock+(i+1)*60000;
      const log=d.recordExercise(heron,{...ex.dose,target_steps:steps},{...comfortable,doseReason:'time'},ts,ex.dose);
      assert.equal(log.additionalPlanId,d.getState().additionalPlan.id);
      d.recordExercise(stretch.id,stretch.dose,{...comfortable,symptomScope:'combined'},ts+1,stretch.dose);
      const state=d.additionalPlanState(ex,ts+1),used=[5,10,20][i];
      assert.equal(state.target,20);assert.equal(state.used,used);assert.equal(state.remaining,20-used);
      assert.deepEqual(plain(d.getState().additionalPlan.targets[heron]),target);
      if(used<20){
        assert.equal(state.status,'remaining');assert.equal(state.dose.target_steps,20-used);
        assert.equal(d.scoreExercise(ex,ts+1).dose.target_steps,20-used);
      }else{
        assert.equal(state.status,'complete');assert.equal(d.scoreExercise(ex,ts+1).score,-1);
      }
    }
  });

  test('a completed additional dose stays complete throughout repeated normal stretch and feedback cycles',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP[heron],stretch=d.EXMAP.towel_stretch_straight_knee;
    d.startAdditionalPlan([heron],clock);
    const first=d.getState().additionalPlan.id;
    d.recordExercise(heron,ex.dose,comfortable,clock+1,ex.dose);
    for(let i=1;i<=6;i++){
      const ts=clock+i*60000;
      d.recordExercise(stretch.id,stretch.dose,{...comfortable,symptomScope:'combined'},ts,stretch.dose);
      normal(d,ts+1);
      const state=d.additionalPlanState(ex,ts+1);
      assert.equal(state.status,'complete');assert.equal(state.used,20);assert.equal(state.remaining,0);
      assert.equal(d.scoreExercise(ex,ts+1).score,-1);
    }
    d.startAdditionalPlan([heron],clock+7*60000);
    assert.notEqual(d.getState().additionalPlan.id,first);
    const next=d.additionalPlanState(ex,clock+7*60000);
    assert.equal(next.status,'remaining');assert.equal(next.target,20);assert.equal(next.used,0);
  });

  test('an uncomfortable partial dose is not an instruction to make up the remaining volume',()=>{
    for(const response of [{difficulty:'hard'},{technique:'poor'},{fatigue:'high'},{painDuring:5},{doseReason:'capacity'}]){
      const {dev:d}=scenario(),ex=d.EXMAP[heron];
      d.startAdditionalPlan([heron],clock);
      d.recordExercise(heron,{...ex.dose,target_steps:5},{...comfortable,doseReason:'time',...response},clock+1,ex.dose);
      normal(d,clock+2);
      const state=d.additionalPlanState(ex,clock+2);
      assert.equal(state.status,'stopped');assert.equal(state.used,5);assert.equal(state.remaining,15);
      assert.equal(d.scoreExercise(ex,clock+2).score,-1);
    }
  });

  test('a full bad dose is physically spent even after symptoms improve',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP[heron],stretch=d.EXMAP.towel_stretch_straight_knee;
    d.startAdditionalPlan([heron],clock);
    const log=d.recordExercise(heron,ex.dose,{...comfortable,painDuring:5,technique:'poor'},clock+1,ex.dose);
    d.recordExercise(stretch.id,stretch.dose,{...comfortable,symptomScope:'combined'},clock+2,stretch.dose);
    const state=d.additionalPlanState(ex,clock+2);
    assert.equal(state.status,'complete');assert.equal(state.used,20);assert.equal(state.remaining,0);
    assert.equal(d.scoreExercise(ex,clock+2).score,-1);
    assert.equal(d.exerciseResponse(log,clock+2).pain,5);
  });

  test('the 05:00 day boundary, normal morning and backup reload do not refill a partial additional plan',()=>{
    const before=new Date(2026,9,11,4,59).getTime(),after=before+2*60000,{dev:d}=scenario(before),ex=d.EXMAP[heron];
    d.startAdditionalPlan([heron],before-60000);
    d.recordExercise(heron,{...ex.dose,target_steps:5},{...comfortable,doseReason:'time'},before,ex.dose);
    assert.notEqual(d.startOfDay(before),d.startOfDay(after));
    normal(d,after);
    const saved=plain(d.getState()),restored=app(saved,after+DAY).dev;
    assert.deepEqual(plain(restored.getState()),saved);
    for(const [dev,ts] of [[d,after],[d,after+DAY],[restored,after+DAY]]){
      const state=dev.additionalPlanState(dev.EXMAP[heron],ts);
      assert.equal(state.status,'remaining');assert.equal(state.target,20);assert.equal(state.used,5);assert.equal(state.remaining,15);
      assert.equal(state.dose.target_steps,15);
    }
  });

  test('equal load channels do not transfer dose budgets between front legs or equipment',()=>{
    const {dev:d}=scenario(),right=d.EXMAP.balance_board_both_tiptoe_right_front,left=d.EXMAP.balance_board_both_tiptoe_left_front,other=d.EXMAP.hemisphere_both_tiptoe_right_front;
    d.getState().exerciseStatuses[other.id]='active';
    assert.deepEqual(plain(right.load_channels),plain(left.load_channels));
    d.startAdditionalPlan([right.id,left.id],clock);
    d.recordExercise(right.id,right.dose,comfortable,clock+1,right.dose);
    normal(d,clock+2);
    assert.equal(d.additionalPlanState(right,clock+2).status,'complete');
    const remaining=d.additionalPlanState(left,clock+2);
    assert.equal(remaining.status,'remaining');assert.equal(remaining.target,30);assert.equal(remaining.used,0);assert.equal(remaining.remaining,30);
    assert.equal(d.additionalPlanState(other,clock+2).status,'unplanned');
    assert.equal(d.scoreExercise(other,clock+2).score,-1);
  });

  test('a remaining duration dose has whole units and cannot exceed the unspent volume',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.balance_board_both_tiptoe_right_front;
    d.startAdditionalPlan([ex.id],clock);
    d.recordExercise(ex.id,{...ex.dose,target_sec:4,sets:2},{...comfortable,doseReason:'time'},clock+1,ex.dose);
    normal(d,clock+2);
    const state=d.additionalPlanState(ex,clock+2);
    assert.equal(state.target,30);assert.equal(state.used,8);assert.equal(state.remaining,22);
    assert.equal(state.status,'remaining');assert.equal(state.dose.type,'duration_sets');
    assert.ok(Number.isInteger(state.dose.target_sec)&&state.dose.target_sec>0);
    assert.ok(Number.isInteger(state.dose.sets)&&state.dose.sets>0);
    assert.ok(state.dose.target_sec*state.dose.sets<=22);
  });

  test('unknown or incompatible actual volume makes the remaining plan uncertain even after normal feedback and reload',()=>{
    for(const actualDose of [undefined,{type:'passes',passes:3}]){
      const {dev:d}=scenario(),ex=d.EXMAP[heron];
      d.startAdditionalPlan([heron],clock);
      d.getState().logs.push({id:'unknown',exerciseId:heron,ts:clock+1,additionalPlanId:d.getState().additionalPlan.id,...comfortable,...(actualDose?{actualDose}:{})});
      normal(d,clock+2);
      const saved=plain(d.getState()),restored=app(saved,clock+3).dev;
      for(const dev of [d,restored]){
        assert.equal(dev.additionalPlanState(dev.EXMAP[heron],clock+3).status,'uncertain');
        assert.equal(dev.scoreExercise(dev.EXMAP[heron],clock+3).score,-1);
        assert.throws(()=>dev.startAdditionalPlan([heron],clock+4));
      }
    }
  });

  test('only an explicit finish permits replacing an unfinished plan and only an explicit start creates its successor',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP[heron],other=d.EXMAP.slider_injured_leg_three_directions;
    d.startAdditionalPlan([heron],clock);
    const first=d.getState().additionalPlan.id;
    d.recordExercise(heron,{...ex.dose,target_steps:5},{...comfortable,doseReason:'time'},clock+1,ex.dose);
    normal(d,clock+2);
    assert.throws(()=>d.startAdditionalPlan([other.id],clock+3));
    assert.equal(d.getState().additionalPlan.id,first);
    d.finishAdditionalPlan(clock+4);
    d.startAdditionalPlan([other.id],clock+5);
    assert.notEqual(d.getState().additionalPlan.id,first);
    assert.equal(d.getState().additionalPlan.startedAt,clock+5);
    assert.equal(d.additionalPlanState(other,clock+5).used,0);
    assert.equal(d.additionalPlanState(ex,clock+5).status,'unplanned');
  });

  test('invalid, prescribed and inactive choices cannot become an additional plan',()=>{
    for(const ids of [[],['missing'],['towel_stretch_straight_knee'],['hops_and_direction_changes'],['hemisphere_both_tiptoe_right_front']]){
      const {dev:d}=scenario();
      assert.throws(()=>d.startAdditionalPlan(ids,clock));
      assert.ok(d.getState().additionalPlan==null);
    }
  });

  test('saving the proposed remainder does not calibrate the next plan down to that remainder',()=>{
    const {dev:d,get}=scenario(),ex=d.EXMAP[heron];
    d.startAdditionalPlan([heron],clock-120000);
    d.recordExercise(heron,{...ex.dose,target_steps:5},{...comfortable,doseReason:'time'},clock-60000,ex.dose);
    d.openLog(heron);
    assert.match(get('logModal').innerHTML,/value="planned_remainder" selected/);
    for(const [id,value] of Object.entries({dose_target_steps:'19',difficultySel:'normal',techSel:'good',logSteadiness:'steady',fatigueSel:'low'}))get(id).value=value;
    d.saveLog(heron);
    const log=d.getState().logs.at(-1);
    assert.equal(log.doseReason,'planned_remainder');assert.equal(log.additionalPlanPart,true);
    assert.equal(d.additionalPlanState(ex,clock).status,'complete');
    assert.equal(d.exerciseProgress(ex,clock).working.target_steps,20);
    d.startAdditionalPlan([heron],clock+1);
    assert.equal(d.additionalPlanState(ex,clock+1).target,20);
  });

  test('completing the whole reduced dose ends the item without making up the original target',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP[heron];
    d.startAdditionalPlan([heron],clock);
    d.recordSymptoms({pain:3,steadiness:'steady',fatigue:'low',response:'worse'},'combined',clock+1);
    const rec=d.scoreExercise(ex,clock+2);
    assert.ok(rec.score>=0);assert.equal(rec.dose.target_steps,19);
    d.recordExercise(heron,rec.dose,{...comfortable,doseReason:'daily_load',symptomScope:'combined'},clock+2,rec.dose);
    assert.equal(d.currentSymptoms(clock+2).pain,0);
    const entry=d.additionalPlanState(ex,clock+2);
    assert.equal(entry.used,19);assert.equal(entry.remaining,1);assert.equal(entry.status,'stopped');
    assert.equal(d.scoreExercise(ex,clock+2).score,-1);
    assert.equal(d.getState().additionalPlan.endedAt,clock+2);
  });

  test('splitting or exceeding one planned dose earns no more XP than completing it once',()=>{
    for(const parts of [[20],[5,5,10],[25]]){
      const {dev:d}=scenario(),ex=d.EXMAP[heron];
      d.startAdditionalPlan([heron],clock);
      for(const [i,steps] of parts.entries())d.recordExercise(heron,{...ex.dose,target_steps:steps},{...comfortable,doseReason:'time'},clock+i+1,ex.dose);
      assert.equal(d.getState().xp,10,JSON.stringify(parts));
      assert.equal(d.additionalPlanState(ex,clock+parts.length).status,'complete');
    }
  });

  test('explicit new additional plans retain diminishing XP for repeated same-skill work',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP[heron];
    for(const [i,total] of [10,17,21,23].entries()){
      d.startAdditionalPlan([heron],clock+i*2);
      d.recordExercise(heron,ex.dose,comfortable,clock+i*2+1,ex.dose);
      assert.equal(d.getState().xp,total);
    }
  });

  test('the automatic proposal keeps the shown dose when the first record crosses 05:00',()=>{
    const before=new Date(2026,9,11,4,59).getTime(),after=before+2*60000,{dev:d,get,context}=scenario(before),ex=d.EXMAP[heron];
    for(const id of Object.keys(d.getState().exerciseStatuses))d.getState().exerciseStatuses[id]='archived';
    d.getState().exerciseStatuses[heron]='active';
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',fatigue:'medium'},'combined',before);
    d.openLog(heron);assert.match(get('logModal').innerHTML,/19 шагов/);
    assert.equal(d.suggestedDose(ex,after).dose.target_steps,20);
    context.Date.now=()=>after;
    for(const [id,value] of Object.entries({dose_target_steps:'19',difficultySel:'normal',techSel:'good',logSteadiness:'steady',fatigueSel:'low'}))get(id).value=value;
    d.saveLog(heron);
    assert.equal(d.getState().additionalPlan.startedAt,after);
    assert.equal(d.getState().additionalPlan.targets[heron].target_steps,19);
    assert.equal(d.additionalPlanState(ex,after).status,'complete');
  });

  test('a later manual execution is independent of a completed or stopped additional plan',()=>{
    for(const first of [{steps:20,response:comfortable},{steps:5,response:{...comfortable,difficulty:'hard',doseReason:'time'}}]){
      const {dev:d}=scenario(),ex=d.EXMAP[heron];
      d.startAdditionalPlan([heron],clock);
      d.recordExercise(heron,{...ex.dose,target_steps:first.steps},first.response,clock+1,ex.dose);
      const old=d.getState().additionalPlan.id;
      assert.equal(d.getState().additionalPlan.endedAt,clock+1);
      const log=d.recordExercise(heron,{...ex.dose,target_steps:25},comfortable,clock+DAY,ex.dose);
      assert.notEqual(log.additionalPlanId,old);assert.equal(log.additionalPlanPart,undefined);
      assert.equal(d.exerciseProgress(ex,clock+DAY).logs.length,2);
      assert.equal(d.exerciseProgress(ex,clock+DAY).working.target_steps,25);
      assert.equal(d.getState().additionalPlan.endedAt,clock+1);
    }
  });


  test('correcting the history of an ended plan cannot silently restart its remaining work',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP[heron];
    d.startAdditionalPlan([heron],clock);
    d.recordExercise(heron,ex.dose,comfortable,clock+1,ex.dose);
    const saved=plain(d.getState());saved.logs[0].actualDose.target_steps=5;saved.logs[0].doseReason='time';
    const restored=app(saved,clock+2).dev;
    assert.equal(restored.additionalPlanState(restored.EXMAP[heron],clock+2).used,5);
    assert.equal(restored.additionalPlanState(restored.EXMAP[heron],clock+2).status,'stopped');
    assert.equal(restored.scoreExercise(restored.EXMAP[heron],clock+2).score,-1);
  });

};
