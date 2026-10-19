const {test}=require('node:test');
const assert=require('node:assert/strict');
module.exports=({app,plain,comfortable,DAY,morning,confirmedDose,completePlans,seedRehab,seedImpact})=>{
  const clock=new Date('2026-10-19T18:00:00+07:00').getTime();
  const setup=()=>{const a=app(null,clock);a.dev.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);return a;};
  test('STAGE three tolerated introductory 2x5 lessons do not complete calf preparation',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_calf_raise;
    confirmedDose(d,ex,ex.dose,'normal',clock-2*DAY);
    assert.equal(d.exerciseProgress(ex).confirmed,true);
    assert.equal(d.rehabWorkChecks().find(c=>c.id==='calf_endurance').passed,false);
    assert.equal(d.stageGoalDefinitions(d.RDCFG.stages[0]).find(g=>g.id==='calf').target,20);
  });
  test('STAGE a maximum of ten does not establish ten training repetitions as a baseline',()=>{
    const {dev:d}=setup();const s=d.recordTest('single_leg_calf_raise_test',{left:10,right:10,difficulty:'hard',stop_reason:'quality',pain_after:0},clock-2*DAY);
    d.completeAssessment(s,{pain_after:0,perceived_fatigue:'moderate'},clock-2*DAY);morning(d,d.getState().testLogs.at(-1));
    const calf=d.stageGameProgress().goals.find(g=>g.id==='calf');
    assert.equal(calf.baseline,null);assert.equal(calf.current,0);assert.equal(calf.progress,null);
    assert.equal(d.stageTransition('ready_for_impact').checks.find(c=>c.id==='calf_endurance').passed,false);
  });
  test('STAGE the confirmed starting five wins over an earlier isolated seven',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static;
    d.recordExercise(ex.id,{...ex.dose,reps:7},comfortable,clock-9*DAY);
    confirmedDose(d,ex,{...ex.dose,reps:5},'easy',clock-5*DAY);
    assert.equal(d.stageGameProgress().goals.find(g=>g.id==='static').baseline,5);
    confirmedDose(d,ex,{...ex.dose,reps:6},'easy',clock-2*DAY);
    const goal=d.stageGameProgress().goals.find(g=>g.id==='static');assert.equal(goal.current,6);assert.equal(goal.progress,.2);
  });
  test('STAGE an incorrect old target is revised once and the old snapshot is retained',()=>{
    const {dev:d}=setup(),state=d.getState(),ex=d.EXMAP.bilateral_tiptoe_static;
    confirmedDose(d,ex,{...ex.dose,reps:5},'easy',clock-2*DAY);
    state.stageProgress.rehab={version:1,reconstructed:true,enteredAt:clock-20*DAY,goals:[{id:'static',exerciseId:ex.id,kind:'reps',baseline:7,target:10,peak:5},{id:'calf',exerciseId:'single_leg_calf_raise',kind:'calf_volume',baseline:10,target:36,peak:0}]};
    const game=d.stageGameProgress(),saved=plain(state);
    assert.equal(game.goals.find(g=>g.id==='static').baseline,5);assert.equal(game.goals.find(g=>g.id==='calf').baseline,null);
    assert.equal(state.stageProgress.rehab.revisions[0].previous.goals[1].target,36);
    assert.equal(state.stageProgress.rehab.revisions[0].previous.goals[0].baseline,7);
    const restored=app(saved,clock).dev;restored.stageGameProgress();assert.equal(restored.getState().stageProgress.rehab.revisions.length,1);
  });
  test('STAGE complete work needs a separate functional check and does not prefill success',()=>{
    const {dev:d,get,context}=setup();seedRehab(d,clock);delete d.getState().settings.impactCheck;
    assert.equal(d.rehabWorkChecks().every(c=>c.passed),true);
    assert.equal(d.stageTransition('ready_for_impact').checks.filter(c=>c.id.startsWith('functional_')&&!c.passed).length,5);
    context.window.AM.openImpactCheck();const form=get('activityModal').innerHTML;
    assert.match(form,/Не проверено/);assert.doesNotMatch(form,/<option value="yes" selected/);
    for(const key of ['gait','mobility','dynamic','strength','willing'])get('impact_'+key).value=key==='dynamic'?'':'yes';get('impactSource').value='self';
    context.window.AM.saveImpactCheck();assert.equal(d.impactCheckStatus().ready,false);assert.equal(d.getState().settings.impactCheck.answers.dynamic,null);
    assert.equal(d.stageTransition('ready_for_impact').checks.find(c=>c.id==='functional_dynamic').passed,false);
    assert.equal(d.feedbackRecommendation().mode,'impact');
    const restored=app(plain(d.getState()),clock).dev;assert.equal(restored.feedbackRecommendation().mode,'impact');
  });
  test('STAGE shortened holds cannot complete static or front-back control goals',()=>{
    const {dev:d}=setup();
    const staticEx=d.EXMAP.bilateral_tiptoe_static,balance=d.EXMAP.right_leg_balance_left_front_back;
    confirmedDose(d,staticEx,{...staticEx.dose,reps:10,hold_sec:1},'easy',clock-2*DAY);
    // Imported history may contain shortened holds; the current cycle form fixes them at five seconds.
    for(const log of confirmedDose(d,balance,{...balance.dose,cycles:5,support:'none'},'easy',clock-2*DAY))Object.assign(log.actualDose,{front_hold_sec:1,back_hold_sec:1});
    const checks=d.rehabWorkChecks();assert.equal(checks.find(c=>c.id==='goal_static').passed,false);assert.equal(checks.find(c=>c.id==='goal_balance').passed,false);
  });
  test('STAGE three rushed toe passages are one home block, not a complete day',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.tandem_walk_tiptoe,dose={...ex.dose,target_steps:12};
    confirmedDose(d,ex,dose,'easy',clock-5*DAY);
    const day=clock-2*DAY;
    for(let i=0;i<3;i++){const l=d.recordExercise(ex.id,dose,{...comfortable,difficulty:'easy'},day+i*60000,dose);morning(d,l);}
    const goal=d.stageGoalDefinitions(d.RDCFG.stages[0]).find(g=>g.id==='toes');
    assert.equal(d.planCounts(d.nextDayStart(day)-1).line_walk,1);assert.equal(d.goalAchievement(goal),2);
    assert.equal(d.rehabWorkChecks().find(c=>c.id==='goal_toes').passed,false);
    for(const hour of [3,6]){const l=d.recordExercise(ex.id,dose,{...comfortable,difficulty:'easy'},day+hour*3600000,dose);morning(d,l);}
    assert.equal(d.goalAchievement(goal),4);assert.equal(d.rehabWorkChecks().find(c=>c.id==='goal_toes').passed,true);
  });
  test('STAGE a saved unresolved limitation survives normal symptom entries and reload',()=>{
    const {dev:d}=setup();seedRehab(d,clock);
    d.recordImpactCheck({gait:true,mobility:false,dynamic:true,strength:true,willing:true},'self',clock-100);
    d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'combined',clock-1);
    const restored=app(plain(d.getState()),clock).dev;
    assert.equal(restored.stageTransition('ready_for_impact').checks.find(c=>c.id==='functional_mobility').passed,false);
    assert.equal(restored.getState().settings.impactCheck.answers.gait,true);
  });
  test('STAGE a normal morning does not recreate a saved functional questionnaire',()=>{
    const {dev:d}=setup();seedRehab(d,clock);const before=plain(d.getState().settings.impactCheck);
    d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'combined',clock);
    assert.deepEqual(plain(d.getState().settings.impactCheck),before);assert.equal(d.impactCheckStatus().ready,true);
    d.recordSymptoms({pain:0,fatigue:'low',steadiness:'giving_way'},'combined',clock+1);
    assert.equal(d.impactCheckStatus(clock+1).invalidated,true);
    assert.equal(d.stageTransition('ready_for_impact',clock+1).checks.find(c=>c.id==='functional_dynamic').passed,false);
  });
  test('STAGE readiness for a small double-leg attempt opens no maximum jump tests',()=>{
    const {dev:d,context}=setup();seedRehab(d,clock);
    assert.equal(d.stageTransition('ready_for_impact').score,1);context.confirm=()=>true;context.window.AM.suggestStage('ready_for_impact');
    assert.equal(d.getState().selectedStage,'ready_for_impact');
    assert.equal(d.EXMAP.hop_to_stabilization.dose.reps,3);assert.equal(d.EXMAP.hop_to_stabilization.dose.sets,2);
    for(const id of ['pogo_bilateral','single_leg_hop_basic','lateral_hop'])assert.equal(d.testAvailable(d.RDCFG.tests.find(t=>t.id===id)),false);
    assert.equal(d.getState().exerciseStatuses.bilateral_pogo,'available');
  });
  test('STAGE stopped landings select 2x5 reactive practice before any twenty-continuous test',()=>{
    const {dev:d}=setup();seedRehab(d,clock);d.getState().selectedStage='ready_for_impact';completePlans(d,undefined,clock);
    confirmedDose(d,d.EXMAP.hop_to_stabilization,{...d.EXMAP.hop_to_stabilization.dose,reps:5},'easy',clock-2*DAY);d.syncProgram();
    assert.equal(d.getState().exerciseStatuses.bilateral_pogo,'active');
    assert.equal(d.EXMAP.bilateral_pogo.dose.sets,2);assert.equal(d.EXMAP.bilateral_pogo.dose.reps,5);
    assert.equal(d.testAvailable(d.RDCFG.tests.find(t=>t.id==='pogo_bilateral')),false);
    assert.equal(d.additionalChoice(d.EXMAP.hop_to_stabilization).score,0);
  });
  test('STAGE reactive progression preserves its own ladder and normal effort can qualify',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_pogo;seedRehab(d,clock);d.getState().selectedStage='ready_for_impact';completePlans(d,undefined,clock);
    confirmedDose(d,d.EXMAP.hop_to_stabilization,{...d.EXMAP.hop_to_stabilization.dose,reps:5},'easy',clock-12*DAY);d.syncProgram();
    confirmedDose(d,ex,ex.dose,'normal',clock-2*DAY);
    assert.equal(d.suggestedDose(ex,clock,false).trial.reps,8);
    const dose={...ex.dose,reps:8};for(const age of [2,1]){const l=d.recordExercise(ex.id,dose,comfortable,clock-age*DAY);morning(d,l);}
    assert.equal(d.suggestedDose(ex,clock,false).trial.reps,10);
  });
  test('STAGE jump tests open in order and each new direction requires its own morning',()=>{
    const {dev:d}=setup();seedRehab(d,clock);seedImpact(d,clock);d.getState().selectedStage='ready_for_impact';
    const tests=Object.fromEntries(d.RDCFG.tests.map(t=>[t.id,t]));
    assert.equal(d.testAvailable(tests.pogo_bilateral),true);assert.equal(d.testAvailable(tests.single_leg_hop_basic),false);
    const s=d.recordTest('pogo_bilateral',{value:20,difficulty:'normal',stop_reason:'planned',pain_after:0},clock-DAY);d.completeAssessment(s,{pain_after:0,perceived_fatigue:'easy'},clock-DAY);
    assert.equal(d.testAvailable(tests.single_leg_hop_basic),false);morning(d,d.getState().testLogs.at(-1));assert.equal(d.testAvailable(tests.single_leg_hop_basic),true);
    assert.equal(d.testAvailable(tests.lateral_hop),false);
    const single=d.recordTest('single_leg_hop_basic',{left:10,right:10,difficulty:'normal',stop_reason:'planned',pain_after:0},clock-1800000);d.completeAssessment(single,{pain_after:0,perceived_fatigue:'easy'},clock-1800000);
    assert.equal(d.testAvailable(tests.lateral_hop),false);morning(d,d.getState().testLogs.at(-1));assert.equal(d.testAvailable(tests.lateral_hop,clock+DAY),true);
  });
  test('STAGE new giving-way cannot reopen maximum impact tests after a later normal assessment',()=>{
    const {dev:d}=setup();seedRehab(d,clock);seedImpact(d,clock);d.getState().selectedStage='ready_for_impact';
    const t=d.RDCFG.tests.find(t=>t.id==='pogo_bilateral');assert.equal(d.testAvailable(t),true);
    d.recordSymptoms({pain:0,fatigue:'low',steadiness:'giving_way'},'combined',clock);
    d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'combined',clock+DAY);
    assert.equal(d.impactCheckStatus(clock+DAY).invalidated,true);assert.equal(d.testAvailable(t,clock+DAY),false);
    assert.equal(d.testSchedule(t,d.testPlans(clock+DAY),clock+DAY).status,'locked');
    assert.throws(()=>d.recordTest(t.id,{value:20,difficulty:'normal',stop_reason:'planned',pain_after:0},clock+DAY));
  });
  test('STAGE linear run-walk requires both trained impact tasks, not the optional lateral tests',()=>{
    const {dev:d}=setup();seedRehab(d,clock);seedImpact(d,clock);d.getState().selectedStage='ready_for_impact';d.getState().settings.runningPlan={runPermitted:true};
    d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'combined',clock);
    assert.equal(d.getState().testLogs.filter(l=>['pogo_bilateral','single_leg_hop_basic','lateral_hop'].includes(l.testId)).length,0);
    assert.equal(d.stageTransition('ready_for_run_walk').score,1);
    const bad=d.recordExercise('bilateral_pogo',{...d.EXMAP.bilateral_pogo.dose,reps:10},{...comfortable,technique:'poor'},clock+1);morning(d,bad,{response:'worse',historyWorse:true});
    assert.equal(d.stageTransition('ready_for_run_walk',clock+DAY).checks.find(c=>c.id==='impact_reactive').passed,false);
  });
  test('STAGE short half-minute intervals do not count as mastered one-minute intervals',()=>{
    const {dev:d}=setup();d.getState().selectedStage='ready_for_run_walk';
    for(const age of [6,4,2]){const a=d.recordRun({mode:'run_walk',runMinutes:4,walkMinutes:8,intervals:8,longestContinuous:.5,rpe:3,surface:'level',quality:'good'},clock-age*DAY);morning(d,a);}
    const goal=d.stageGoalDefinitions(d.RDCFG.stages.find(s=>s.order===2)).find(g=>g.id==='run_walk');
    assert.equal(d.goalAchievement(goal),0);assert.equal(d.runningChecks(d.RDCFG.stages.find(s=>s.order===3)).find(c=>c.id==='run_walk').passed,false);
    assert.equal(d.runWalkCompleted({running:{mode:'run_walk',runMinutes:4,walkMinutes:8,intervals:4,longestContinuous:1}}),true);
    assert.equal(d.runWalkCompleted({running:{mode:'run_walk',runMinutes:6,walkMinutes:6,intervals:3,longestContinuous:2}}),true);
  });
  for(const legacy of [false,true])test('STAGE old successful running and walking cannot bypass new giving-way'+(legacy?' without a legacy functional questionnaire':''),()=>{
    const {dev:d}=setup();seedRehab(d,clock);seedImpact(d,clock);const state=d.getState();state.selectedStage='ready_for_run_walk';state.settings.runningPlan={runPermitted:true};
    for(const age of [6,4,2]){const a=d.recordRun({mode:'run_walk',runMinutes:4,walkMinutes:8,intervals:4,longestContinuous:1,rpe:3,surface:'level',quality:'good'},clock-age*DAY);morning(d,a);}
    const walk={id:'old_walk',presetId:'general_walk',ts:clock-20*DAY,minutes:30,painAfter:0,steadiness:'steady',fatigue:'low',response:'same'};state.customActivities.push(walk);morning(d,walk);
    if(legacy)delete state.settings.impactCheck;
    assert.equal(d.stageTransition('ready_for_run_walk').score,1);
    d.recordSymptoms({pain:0,fatigue:'low',steadiness:'giving_way'},'combined',clock);
    const later=clock+2*DAY;d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'combined',later);morning(d,{ts:clock+DAY});
    assert.equal(d.impactCheckStatus(later).invalidated,true);assert.equal(d.stageTransition('ready_for_run_walk',later).checks.find(c=>c.id==='functional_current').passed,false);
    assert.equal(d.stageTransition('ready_for_run_walk',later).checks.find(c=>c.id==='walking').passed,false);assert.equal(d.runRecommendation(later),null);
    assert.equal(d.feedbackRecommendation(later).mode,'impact');
  });
  test('STAGE completed personal goals stay earned after an adverse reaction',()=>{
    const {dev:d}=setup();seedRehab(d,clock);const game=d.stageGameProgress();assert.equal(game.score,1);
    d.recordSymptoms({pain:4,fatigue:'low',steadiness:'steady'},'combined',clock);
    assert.equal(d.stageGameProgress().score,1);assert.equal(d.stageTransition('ready_for_impact').checks.find(c=>c.id==='pain').passed,false);
  });
  test('STAGE legacy running recovered after an old instability does not restart rehabilitation',()=>{
    const {dev:d}=setup(),state=d.getState();state.selectedStage='ready_for_run_walk';state.settings.runningPlan={runPermitted:true};
    d.recordSymptoms({pain:0,fatigue:'low',steadiness:'giving_way'},'combined',clock-30*DAY);
    const walk={id:'known_walk',presetId:'general_walk',ts:clock-10*DAY,minutes:30,painAfter:0,response:'same',steadiness:'steady',fatigue:'low'};state.customActivities.push(walk);morning(d,walk);
    for(const age of [8,6,4]){const a=d.recordRun({mode:'run_walk',runMinutes:4,walkMinutes:8,intervals:4,longestContinuous:1,rpe:3,surface:'level',quality:'good'},clock-age*DAY);morning(d,a);}
    morning(d,{ts:clock-2*DAY});d.recordSymptoms({pain:0,fatigue:'low',steadiness:'steady'},'combined',clock-1);
    assert.equal(d.impactCheckStatus().invalidated,false);assert.equal(d.stageTransition('ready_for_run_walk').score,1);assert.equal(d.runRecommendation().mode,'continuous');
  });
  test('STAGE old locked jump history can be corrected without inventing another execution',()=>{
    const {dev:d}=setup(),t=d.RDCFG.tests.find(t=>t.id==='pogo_bilateral'),state=d.getState();
    state.testLogs.push({id:'old_jump',testId:t.id,protocol_id:t.protocol_id,ts:clock-10*DAY,value:20,difficulty:'unknown'});
    assert.equal(d.testAvailable(t),false);const count=state.testLogs.length;
    d.editTest('old_jump',t.id,{value:18,difficulty:'normal',stop_reason:'quality',pain_after:0});
    assert.equal(state.testLogs.length,count);assert.equal(state.testLogs[0].value,18);assert.equal(d.testAvailable(t),false);
    assert.equal(state.testCorrections[0].original.value,20);
  });
  test('STAGE one complete running week earns at most half of the two-week task',()=>{
    const {dev:d}=setup(),state=d.getState();state.selectedStage='easy_continuous_run';state.settings.runningPlan={runPermitted:true,targetMinutes:4,sessionsPerWeek:3,weekMinutes:12};
    d.stageGameProgress();
    for(const age of [6,4,2]){const a=d.recordRun({mode:'continuous',runMinutes:4,longestContinuous:4,intervals:1,rpe:3,surface:'level',quality:'good'},clock-age*DAY);morning(d,a);}
    const game=d.stageGameProgress();assert.equal(game.goals[0].target,2);assert.equal(game.goals[0].current,1);assert.equal(game.score,.5);
    assert.equal(d.stageTransition('normal_volume').checks.find(c=>c.id==='running_week_1').passed,false);
  });
  test('STAGE empty optional goals mean completed only after an explicit personal choice',()=>{
    const {dev:d}=setup(),state=d.getState();state.selectedStage='normal_volume';
    assert.equal(d.stageGameProgress().unknown,true);assert.equal(d.stageGameProgress().score,0);
    state.settings.runningPlan={challenges:[]};assert.equal(d.stageGameProgress().score,1);assert.equal(d.stageGameProgress().unknown,false);
  });
};
