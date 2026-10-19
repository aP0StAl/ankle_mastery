const {test}=require('node:test');
const assert=require('node:assert/strict');
module.exports=({app,plain,comfortable,DAY,morning,confirmedDose,seedRehab,seedImpact})=>{
  const clock=+new Date('2026-10-19T18:00:00+07:00');
  const setup=()=>{const a=app(null,clock);a.dev.getState().createdAt=clock-30*DAY;a.dev.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);return a;};
  const answers={gait:true,mobility:true,dynamic:true,strength:true,willing:true};
  test('PROGRESS functional confirmation contributes alongside exercises without duplicate goals',()=>{
    const {dev:d}=setup();seedRehab(d,clock);delete d.getState().settings.impactCheck;d.getState().decisionLog=d.getState().decisionLog.filter(d=>d.action!=='impact_check_recorded');
    const before=d.stagePreparationProgress();assert.equal(before.goals.length,12);assert.equal(before.goals.filter(g=>g.kind==='criterion').length,8);assert.ok(before.score<1);
    assert.equal(before.goals.filter(g=>g.id==='functional_dynamic').length,1);
    d.recordImpactCheck(answers,'self',clock);const after=d.stagePreparationProgress();assert.equal(after.score,1);assert.ok(after.score>before.score);assert.equal(after.transition.score,1);
  });
  test('PROGRESS earned checks survive reload and pain while the current checklist blocks transition',()=>{
    const {dev:d}=setup();seedRehab(d,clock);const before=d.stagePreparationProgress();assert.equal(before.score,1);
    d.recordSymptoms({pain:4,fatigue:'high',steadiness:'steady'},'combined',clock);
    const after=d.stagePreparationProgress();assert.equal(after.score,before.score);assert.ok(after.transition.score<1);
    const restored=app(plain(d.getState()),clock).dev;assert.equal(restored.stagePreparationProgress().score,before.score);
    restored.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'combined',clock+1);assert.equal(restored.stagePreparationProgress(clock+1).score,before.score);
  });
  test('PROGRESS the same history earns the same checks even when first viewed after worsening',()=>{
    const {dev:d}=setup();seedRehab(d,clock);d.getState().stageProgress.rehab.enteredAt=clock-30*DAY;
    const raw=plain(d.getState()),early=app(raw,clock).dev,late=app(raw,clock).dev;
    early.stagePreparationProgress();
    for(const dev of [early,late]){
      dev.recordSymptoms({pain:4,fatigue:'high',steadiness:'giving_way'},'combined',clock);
      dev.recordImpactCheck({gait:false,mobility:false,dynamic:false,strength:false,willing:false},'self',clock+1);
    }
    const a=early.stagePreparationProgress(clock+1),b=late.stagePreparationProgress(clock+1);
    assert.equal(b.score,a.score);assert.equal(b.score,1);assert.ok(b.transition.score<1);
  });
  test('PROGRESS a passed 24-hour window between symptom entries is preserved without an intermediate view',()=>{
    const {dev:d}=setup();d.getState().stageProgress.rehab.enteredAt=clock-3*DAY;
    for(const [hours,pain] of [[48,4],[25,0],[22,4]])d.recordSymptoms({pain,fatigue:'low',steadiness:'steady'},'combined',clock-hours*3600000);
    const raw=plain(d.getState()),early=app(raw,clock).dev,late=app(raw,clock).dev;
    early.stagePreparationProgress(clock-23*3600000);
    const a=early.stagePreparationProgress(),b=late.stagePreparationProgress();assert.equal(a.score,b.score);assert.equal(b.goals.find(g=>g.id==='pain').current,1);assert.equal(b.transition.checks.find(c=>c.id==='pain').passed,false);
  });
  test('PROGRESS mastered ordinary line is the first earned quarter of the walking path',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.tandem_walk_flat;confirmedDose(d,ex,ex.dose,'easy',clock-8*DAY);
    const goal=d.stageGameProgress().goals.find(g=>g.id==='toes');assert.equal(goal.baseline,0);assert.equal(goal.current,1);assert.equal(goal.progress,.25);assert.ok(d.stagePreparationProgress().score>0);
    d.recordSymptoms({pain:3,fatigue:'high',steadiness:'shaky'},'combined',clock);assert.equal(d.stageGameProgress().goals.find(g=>g.id==='toes').progress,.25);
  });
  test('PROGRESS ordinary line already mastered before entry gives no new quarter',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.tandem_walk_flat;confirmedDose(d,ex,ex.dose,'easy',clock-10*DAY);
    d.getState().stageProgress.rehab={enteredAt:clock-7*DAY,reconstructed:false,version:2,goals:d.stageGoalDefinitions(d.RDCFG.stages[0]).map(g=>({...g,baseline:null,peak:0}))};
    const goal=d.stageGameProgress().goals.find(g=>g.id==='toes');assert.equal(goal.baseline,1);assert.equal(goal.current,1);assert.equal(goal.progress,0);
    const toes=d.EXMAP.tandem_walk_tiptoe;confirmedDose(d,toes,toes.dose,'easy',clock-3*DAY);assert.equal(d.stageGameProgress().goals.find(g=>g.id==='toes').progress,1/3);
  });
  test('PROGRESS a later shorter test does not hide historical mastery when first reconstructing progress',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.tandem_walk_flat;
    d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy'},clock-20*DAY,ex.dose);
    for(const [age,value,stop_reason] of [[40,100,'cap'],[2,40,'planned']]){
      const session=d.recordTest('tandem_flat_clean_steps',{value,difficulty:'easy',stop_reason,pain_after:0},clock-age*DAY);d.completeAssessment(session,{pain_after:0,perceived_fatigue:'easy'},clock-age*DAY);morning(d,d.getState().testLogs.at(-1));
    }
    assert.equal(d.lineWalkObservations().some(a=>a.value===1),true);
    assert.equal(d.stageGameProgress().goals.find(g=>g.id==='toes').current,1);
  });
  test('PROGRESS walking continues through its own toe practice and separated daily blocks',()=>{
    const {dev:d}=setup(),flat=d.EXMAP.tandem_walk_flat,toes=d.EXMAP.tandem_walk_tiptoe;
    confirmedDose(d,flat,flat.dose,'easy',clock-12*DAY);d.stageGameProgress();confirmedDose(d,toes,toes.dose,'easy',clock-5*DAY);
    assert.equal(d.stageGameProgress().goals.find(g=>g.id==='toes').progress,.5);
    for(const hour of [0,3]){const l=d.recordExercise(toes.id,toes.dose,{...comfortable,difficulty:'easy'},clock-2*DAY+hour*3600000,toes.dose);morning(d,l);}
    assert.equal(d.stageGameProgress().goals.find(g=>g.id==='toes').progress,.75);
    const l=d.recordExercise(toes.id,toes.dose,{...comfortable,difficulty:'easy'},clock-2*DAY+6*3600000,toes.dose);morning(d,l);
    assert.equal(d.stageGameProgress().goals.find(g=>g.id==='toes').progress,1);assert.equal(d.rehabWorkChecks().find(c=>c.id==='goal_toes').passed,true);
  });
  test('PROGRESS a shorter maintenance day before entry does not lower the already mastered starting point',()=>{
    const {dev:d}=setup(),flat=d.EXMAP.tandem_walk_flat,toes=d.EXMAP.tandem_walk_tiptoe;
    confirmedDose(d,flat,flat.dose,'easy',clock-20*DAY);confirmedDose(d,toes,toes.dose,'easy',clock-16*DAY);
    for(const hour of [0,3,6]){const l=d.recordExercise(toes.id,toes.dose,{...comfortable,difficulty:'easy'},clock-12*DAY+hour*3600000,toes.dose);morning(d,l);}
    const l=d.recordExercise(toes.id,toes.dose,{...comfortable,difficulty:'easy'},clock-10*DAY,toes.dose);morning(d,l);
    d.getState().stageProgress.rehab={enteredAt:clock-7*DAY,reconstructed:false,version:2,goals:d.stageGoalDefinitions(d.RDCFG.stages[0]).map(g=>({...g,baseline:null,peak:0}))};
    const goal=d.stageGameProgress().goals.find(g=>g.id==='toes');assert.equal(goal.baseline,4);assert.equal(goal.current,4);assert.equal(goal.progress,null);
  });
  test('PROGRESS old daily toe blocks are translated from history and the old units are archived',()=>{
    const {dev:d}=setup(),flat=d.EXMAP.tandem_walk_flat,toes=d.EXMAP.tandem_walk_tiptoe;
    confirmedDose(d,flat,flat.dose,'easy',clock-12*DAY);confirmedDose(d,toes,toes.dose,'easy',clock-5*DAY);
    d.getState().stageProgress.rehab={enteredAt:clock-30*DAY,reconstructed:true,version:2,goals:[{id:'toes',exerciseId:toes.id,kind:'daily_blocks',baseline:1,target:3,peak:1}]};
    const result=d.stageGameProgress().goals[0];assert.equal(result.kind,'line_path');assert.equal(result.baseline,0);assert.equal(result.current,2);assert.equal(result.progress,.5);
    const state=d.getState(),count=state.stageProgress.rehab.revisions.length;assert.equal(state.stageProgress.rehab.revisions.at(-1).previous.goals[0].kind,'daily_blocks');
    const restored=app(plain(state),clock).dev;assert.equal(restored.stageGameProgress().goals[0].progress,.5);assert.equal(restored.getState().stageProgress.rehab.revisions.length,count);
  });
  test('PROGRESS a confirmed shorter toe dose does not confirm twelve steps in one new day',()=>{
    const {dev:d}=setup(),toes=d.EXMAP.tandem_walk_tiptoe;confirmedDose(d,toes,{...toes.dose,target_steps:10},'easy',clock-5*DAY);
    for(const hour of [0,3,6]){const l=d.recordExercise(toes.id,toes.dose,{...comfortable,difficulty:'easy'},clock-2*DAY+hour*3600000,toes.dose);morning(d,l);}
    assert.equal(d.lineWalkObservations().some(a=>a.value>=2),false);assert.equal(d.rehabWorkChecks().find(c=>c.id==='goal_toes').passed,false);
  });
  test('PROGRESS criterion set stays fixed when established running changes the current checks',()=>{
    const {dev:d}=setup(),state=d.getState();state.selectedStage='ready_for_run_walk';state.settings.runningPlan={runPermitted:true};
    const before=d.stagePreparationProgress().goals.filter(g=>g.kind==='criterion').map(g=>g.id);assert.ok(before.includes('functional_current'));
    for(const age of [8,6,4]){const a=d.recordRun({mode:'run_walk',runMinutes:4,walkMinutes:8,intervals:4,longestContinuous:1,rpe:3,surface:'level',quality:'good'},clock-age*DAY);morning(d,a);}
    d.recordImpactCheck(answers,'self',clock-1);
    assert.deepEqual(plain(d.stagePreparationProgress().goals.filter(g=>g.kind==='criterion').map(g=>g.id)),plain(before));
  });
  test('PROGRESS a shared walking observation and the two running weeks are not counted twice',()=>{
    const {dev:d}=setup();seedRehab(d,clock);d.getState().selectedStage='ready_for_impact';const impact=d.stagePreparationProgress();
    assert.equal(impact.goals.filter(g=>g.id==='walking').length,0);assert.equal(impact.goals.filter(g=>g.id==='functional_gait').length,1);
    d.getState().selectedStage='easy_continuous_run';const running=d.stagePreparationProgress();
    assert.equal(running.goals.filter(g=>['running_target','running_week_0','running_week_1'].includes(g.id)).length,0);assert.equal(running.goals.filter(g=>g.id==='usual_running').length,1);
  });
  test('PROGRESS home checklist exposes every condition without changing answers or additional work',()=>{
    const {dev:d,get,context}=setup();d.startAdditionalPlan(['slider_injured_leg_three_directions'],clock);
    d.renderHome();const plan=plain(d.getState().additionalPlan),answersBefore=plain(d.getState().settings),count=d.stagePreparationProgress().transition.checks.length;
    assert.equal((get('readinessChecks').innerHTML.match(/class="check-mark /g)||[]).length,count);assert.equal(count,12);
    assert.match(get('readinessChecks').innerHTML,/Статика|статика/);assert.match(get('readinessChecks').innerHTML,/функциональной проверки/);
    context.window.AM.toggleStageConditions();assert.equal(get('readinessDetails').open,true);d.renderHome();assert.equal(get('readinessDetails').open,true);
    assert.deepEqual(plain(d.getState().settings),answersBefore);assert.deepEqual(plain(d.getState().additionalPlan),plan);
  });
};
