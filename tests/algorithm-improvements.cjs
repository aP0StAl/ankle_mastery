const {test}=require('node:test');
const assert=require('node:assert/strict');
module.exports=({app,plain,comfortable,DAY,morning,confirmedDose,completePlans})=>{
  const clock=new Date(2026,9,17,18).getTime();
  function scenario(){const a=app(null,clock),d=a.dev;for(const t of d.RDCFG.tests)d.getState().postponedActions['test:'+t.id]=clock+DAY;normal(d,clock-1);return a;}
  function normal(d,ts){return d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',response:'same'},'combined',ts);}
  function measured(d,id,values,ts=clock-DAY){const t=d.RDCFG.tests.find(t=>t.id===id);d.getState().testLogs.push({id:id+ts,testId:id,protocol_id:t.protocol_id,ts,...values});return d.getState().testLogs.at(-1);}
  function run(d,mode,ts,more={}){return d.recordRun({mode,runMinutes:4,walkMinutes:mode==='run_walk'?8:0,intervals:mode==='run_walk'?4:1,longestContinuous:mode==='run_walk'?1:4,...(['speed','uphill','downhill','direction'].includes(mode)?d.runTemplate(mode):{}),rpe:3,painAfter:0,response:'same',...more},ts);}
  test('ALGO-01 unknown measurements select stage tasks rather than three weekly category quotas',()=>{
    const {dev:d}=scenario(),plan=d.autoAdditionalPlan(clock);
    assert.deepEqual(Object.keys(plan.targets).sort(),['obstacle_high_knee_heel_to_toe','slider_injured_leg_three_directions']);
    assert.ok(Object.values(plan.reasons).every(r=>!r.includes('недель')));
    assert.equal(Object.keys(d.planCounts(clock)).length,6);assert.ok(Object.values(d.planCounts(clock)).every(v=>v===0));
    const measurement=measured(d,'hemisphere_hold',{left:30,right:5});morning(d,measurement);
    const low=d.autoAdditionalPlan(clock);assert.equal(Object.keys(low.targets).filter(id=>id.startsWith('balance_board')).length,1,JSON.stringify({low,choice:d.additionalChoice(d.EXMAP.balance_board_both_tiptoe_right_front,clock)}));
  });
  test('ALGO-01 allowed dynamic calf work occupies one goal and does not add a second balance',()=>{
    const {dev:d}=scenario();completePlans(d,undefined,clock);d.getState().exerciseStatuses.bilateral_calf_raise='active';
    const ids=Object.keys(d.autoAdditionalPlan(clock).targets);assert.ok(ids.includes('bilateral_calf_raise'));assert.equal(ids.length,3);assert.ok(!ids.some(id=>id.startsWith('balance_board')));
  });
  test('ALGO-02 moderate local fatigue keeps selected light work and reduces a related remainder once',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.bilateral_calf_raise,slide=d.EXMAP.slider_injured_leg_three_directions;
    d.getState().exerciseStatuses[ex.id]='active';d.startAdditionalPlan([ex.id,slide.id],clock,{[ex.id]:{...ex.dose,reps:10,sets:2},[slide.id]:slide.dose});
    d.recordExercise(ex.id,{...ex.dose,reps:10,sets:1},{...comfortable,fatigue:'medium',doseReason:'time',symptomScope:'combined'},clock+1,ex.dose);
    let entry=d.additionalPlanState(ex,clock+1);assert.equal(entry.dose.reps,9);assert.equal(entry.remaining,9);assert.equal(d.getState().additionalPlan.targets[ex.id].reps,10);
    const limits=plain(d.getState().additionalPlan.limits);normal(d,clock+2);d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'medium'},'combined',clock+3);
    assert.deepEqual(plain(d.getState().additionalPlan.limits),limits);assert.equal(d.additionalPlanState(slide,clock+3).status,'remaining');
    const restored=app(plain(d.getState()),clock+4).dev;assert.equal(restored.additionalPlanState(restored.EXMAP[ex.id],clock+4).remaining,9);
    restored.recordExercise(ex.id,{...ex.dose,reps:9,sets:1},{...comfortable,doseReason:'planned_remainder',symptomScope:'combined'},clock+5,ex.dose);
    assert.equal(restored.additionalPlanState(restored.EXMAP[ex.id],clock+5).status,'complete');
  });
  test('ALGO-02 cause selects repetitions or sets without treating lack of time as weakness',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.bilateral_calf_raise,anchor={...ex.dose,reps:10,sets:2};
    assert.deepEqual(plain(d.reduceDose(ex,anchor,'repetitions')),{...anchor,reps:9});assert.deepEqual(plain(d.reduceDose(ex,anchor,'sets')),{...anchor,sets:1});
    const before=d.suggestedDose(ex).dose;d.recordExercise(ex.id,{...ex.dose,reps:2},{...comfortable,doseReason:'time'},clock,ex.dose);assert.deepEqual(plain(d.suggestedDose(ex).dose),plain(before));
  });
  test('ALGO-03 exercises without mastery levels have an explicit next repetition and stretch remains fixed',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.band_eversion;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);confirmedDose(d,ex,ex.dose,'easy',clock-8*DAY);
    d.finishAdditionalPlan(clock-1);
    assert.equal(d.suggestedDose(ex).trial.reps,11);
    const stretch=d.EXMAP.towel_stretch_straight_knee;confirmedDose(d,stretch,stretch.dose,'easy',clock-8*DAY);assert.equal(d.suggestedDose(stretch).trial,null);assert.equal(d.suggestedDose(stretch).dose.target_sec,60);
  });
  test('ALGO-03 three spaced easy days survive a week boundary and do not finance successive unconfirmed increases',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.band_eversion;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);
    for(const age of [12,8,4]){const l=d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy'},clock-age*DAY,ex.dose);morning(d,l);}
    const trial=d.suggestedDose(ex,clock).trial;assert.equal(trial.reps,11);
    const l=d.recordExercise(ex.id,trial,{...comfortable,difficulty:'easy',doseReason:'trial'},clock-DAY,trial);morning(d,l);
    assert.equal(d.suggestedDose(ex,clock).trial,null);assert.equal(d.suggestedDose(ex,clock).working.reps,10);
  });
  test('ALGO-03 resistance changes require separate confirmation and start with a smaller probe',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.band_eversion;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);confirmedDose(d,ex,{...ex.dose,reps:15},'easy',clock-8*DAY);
    d.finishAdditionalPlan(clock-1);
    const trial=d.suggestedDose(ex).trial;assert.equal(trial.resistance,'next');assert.equal(trial.reps,10);
    d.recordExercise(ex.id,trial,{...comfortable,doseReason:'trial',difficulty:'hard'},clock,trial);
    assert.equal(d.suggestedDose(ex).working.resistance,'current');assert.equal(d.suggestedDose(ex).working.reps,15);
  });
  test('ALGO-04 at most one new load is tried and an active lesson never receives a new exercise',()=>{
    const {dev:d}=scenario();completePlans(d,undefined,clock);for(const id of ['bilateral_calf_raise','band_eversion','single_leg_multidirectional_reach'])d.getState().exerciseStatuses[id]='active';
    const plan=d.autoAdditionalPlan(clock),ids=Object.keys(plan.targets);assert.equal(ids.filter(id=>['bilateral_calf_raise','band_eversion','single_leg_multidirectional_reach'].includes(id)).length,1);
    const id=ids[0];d.recordExercise(id,plan.targets[id],{...comfortable,symptomScope:'combined'},clock,plan.targets[id]);const frozen=plain(d.getState().additionalPlan.targets);
    d.getState().exerciseStatuses.assisted_single_leg_calf_raise='active';normal(d,clock+1);assert.deepEqual(plain(d.getState().additionalPlan.targets),frozen);
  });
  test('ALGO-04 landing practice is stage gated and has a training dose separate from tests',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.hop_to_stabilization;d.getState().exerciseStatuses[ex.id]='active';assert.equal(d.scoreExercise(ex).score,-1);assert.equal(ex.dose.reps,3);assert.equal(ex.dose.sets,2);assert.ok(!d.RDCFG.tests.some(t=>t.id===ex.id));
    d.openExercise(ex.id);
  });
  test('ALGO-05 latest 12 repetitions cannot hide behind historical 20 and 21, or symmetric low capacity',()=>{
    const {dev:d}=scenario();for(const [age,right] of [[21,20],[14,21],[1,12]])measured(d,'single_leg_calf_raise_test',{left:21,right},clock-age*DAY);
    measured(d,'knee_to_wall',{left:10,right:10});let rs=d.readinessSummary(clock);assert.equal(rs.domainScores.calf_endurance,12/21);assert.equal(rs.domainScores.mobility,1);
    measured(d,'single_leg_calf_raise_test',{left:10,right:10},clock);rs=d.readinessSummary(clock);assert.equal(rs.domainScores.calf_endurance,.5);
  });
  test('ALGO-05 changed or unknown test conditions remain visible and do not restore an older high result',()=>{
    const {dev:d,get}=scenario();measured(d,'hemisphere_hold',{left:30,right:30},clock-2*DAY);const low=measured(d,'hemisphere_hold',{left:30,right:5,conditions:'unknown'},clock-DAY);
    const t=d.RDCFG.tests.find(t=>t.id==='hemisphere_hold');assert.equal(d.currentMeasurement(t,clock).latest.id,low.id);assert.equal(d.currentMeasurement(t,clock).log,null);d.renderTests();assert.match(get('readinessDomains').innerHTML,/неизвестны/);
    d.editTest(low.id,t.id,{left:30,right:5,conditions:'standard'});assert.equal(d.readinessSummary(clock).testMap.hemisphere_hold,1/6);
  });
  test('ALGO-06 actual interval running is distinct from continuous running and missing mornings stay unknown',()=>{
    const {dev:d}=scenario();for(const age of [6,4,2]){const a=run(d,'run_walk',clock-age*DAY);morning(d,a);}
    assert.equal(d.successfulRuns('run_walk',clock).length,3);assert.equal(d.runningChecks(d.RDCFG.stages.find(s=>s.order===3),clock).find(c=>c.id==='continuous').passed,false);
    const a=run(d,'continuous',clock-2*DAY);normal(d,clock);assert.equal(d.successfulRuns('continuous',clock).length,1); // same training day shares its genuinely recorded morning
    const missing=run(d,'continuous',clock-DAY);normal(d,clock);assert.equal(d.successfulRuns('continuous',clock).length,0);
  });
  test('ALGO-06 continuous stage needs three spaced real trials and a good hop test cannot close it',()=>{
    const {dev:d}=scenario(),target=d.RDCFG.stages.find(s=>s.order===3);
    for(const age of [6,4,2]){const a=run(d,'continuous',clock-age*DAY);morning(d,a);}
    assert.equal(d.runningChecks(target,clock).find(c=>c.id==='continuous').passed,true);
    const e=app(null,clock).dev;e.getState().selectedStage='ready_for_impact';measured(e,'pogo_bilateral',{value:20});assert.equal(e.runningChecks(target,clock).find(c=>c.id==='continuous').passed,false);
  });
  test('ALGO-06 two complete weeks use disjoint windows and all three personal volume requirements',()=>{
    const {dev:d}=scenario();d.getState().settings.runningPlan={runPermitted:true,targetMinutes:4,sessionsPerWeek:3,weekMinutes:12};const target=d.RDCFG.stages.find(s=>s.order===4);
    for(const age of [6,4,2]){const a=run(d,'continuous',clock-age*DAY);morning(d,a);}
    let checks=d.runningChecks(target,clock);assert.equal(checks.find(c=>c.id==='running_week_0').passed,true);assert.equal(checks.find(c=>c.id==='running_week_1').passed,false);
    for(const age of [13,11,9]){const a=run(d,'continuous',clock-age*DAY);morning(d,a);}
    checks=d.runningChecks(target,clock);assert.ok(checks.filter(c=>c.id.startsWith('running_week')).every(c=>c.passed));
    d.getState().settings.runningPlan.weekMinutes=14;assert.ok(d.runningChecks(target,clock).filter(c=>c.id.startsWith('running_week')).every(c=>!c.passed));
  });
  test('ALGO-06 speed and both hill directions have their own exposure and adverse reactions remain in history',()=>{
    const {dev:d}=scenario();d.getState().settings.runningPlan={challenges:['speed','uphill','downhill']};const target=d.RDCFG.stages.find(s=>s.order===5);
    for(const age of [6,4,2]){const a=run(d,'speed',clock-age*DAY);morning(d,a);}
    let checks=d.runningChecks(target,clock);assert.equal(checks.find(c=>c.id==='run_speed').passed,true);assert.equal(checks.find(c=>c.id==='run_uphill').passed,false);assert.equal(checks.find(c=>c.id==='run_downhill').passed,false);
    const a=run(d,'uphill',clock-DAY);d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(a.ts),pain:0,steadiness:'steady',fatigue:'low',response:'worse',historyKnown:true,historyWorse:true},'combined',clock);normal(d,clock+1);assert.equal(d.successfulRuns('uphill',clock+1).length,0);
  });
  test('ALGO-07 matching 100 test steps and 16 training steps total 116 without home completion by the test',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.tandem_walk_tiptoe;d.recordTest('tandem_tiptoe_clean_steps',{value:100},clock);assert.equal(d.prescriptionCounts(clock).line_walk,0);
    d.recordExercise(ex.id,{...ex.dose,target_steps:16},comfortable,clock+1,ex.dose);
    const rows=d.exposureSummary(clock+1).filter(r=>r.movement===ex.id);assert.equal(rows.length,1);assert.equal(rows[0].quantity,116);
    assert.equal(d.prescriptionCounts(clock+1).line_walk,1);
  });
  test('ALGO-07 different resistance and equipment exposures never merge mastery or doses',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.band_eversion;
    for(const [i,resistance] of ['current','next'].entries())d.recordExercise(ex.id,{...ex.dose,resistance},comfortable,clock+i,ex.dose);
    assert.equal(d.exposureSummary(clock+1).filter(r=>r.movement===ex.id).length,2);
    d.recordExercise('balance_board_both_tiptoe_right_front',d.EXMAP.balance_board_both_tiptoe_right_front.dose,comfortable,clock);
    assert.equal(d.exerciseProgress(d.EXMAP.hemisphere_both_tiptoe_right_front).confirmed,false);
  });
  test('ALGO-08 current results and conditions are separate and the home indicator counts confirmed levels',()=>{
    const {dev:d,get}=scenario();measured(d,'knee_to_wall',{left:10,right:10});measured(d,'single_leg_calf_raise_test',{left:20,right:5});d.renderHome();d.renderTests();
    assert.match(get('masteryValue').textContent,/^\d+%$/);assert.match(get('masteryHint').innerHTML,/Старт|исход|цели|этап/i);assert.match(get('readinessDomains').innerHTML,/подъём|подвижность/i);assert.doesNotMatch(get('readinessDomains').innerHTML,/Сила и подвижность/);
    assert.ok(d.stageTransition('ready_for_impact').checks.some(c=>c.id==='calf_endurance'&&!c.passed));
  });
  test('ALGO-09 decisions snapshot the then-known evidence, deduplicate reductions, and survive reload/export shape',()=>{
    const {dev:d}=scenario(),plan=d.autoAdditionalPlan(clock),id=Object.keys(plan.targets)[0];d.recordExercise(id,plan.targets[id],{...comfortable,symptomScope:'combined'},clock,plan.targets[id]);
    const original=plain(d.getState().decisionLog[0]);normal(d,clock+1);assert.deepEqual(plain(d.getState().decisionLog[0]),original);
    const restored=app(plain(d.getState()),clock+2).dev;assert.deepEqual(plain(restored.getState().decisionLog),plain(d.getState().decisionLog));assert.ok(original.version);assert.ok(original.details.targets);assert.ok(original.snapshot.observations.length);
  });
  test('ALGO-02 the next lesson remembers a bad morning after combined work without blaming the last exercise',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.obstacle_high_knee_heel_to_toe,at=clock-3*DAY;
    d.recordExercise(ex.id,ex.dose,{...comfortable,symptomScope:'combined'},at,ex.dose);
    d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(at),pain:0,steadiness:'steady',fatigue:'low',response:'worse',historyKnown:true,historyWorse:true},'combined',at+DAY);normal(d,clock);
    const plan=d.autoAdditionalPlan(clock);assert.equal(plan.status,'ready');assert.equal(Object.keys(plan.targets).length,1);assert.match(Object.values(plan.reasons)[0],/Причина реакции.*неизвестна/);
  });
  test('ALGO-03 assistance is reduced only after the repetition boundary and three matching confirmations',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.assisted_single_leg_calf_raise;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);confirmedDose(d,ex,ex.dose,'easy',clock-8*DAY);
    d.finishAdditionalPlan(clock-1);
    const trial=d.suggestedDose(ex).trial;assert.equal(trial.reps,5);assert.equal(trial.support,'usual');
  });
  test('ALGO-03 a next-session trial is selected automatically and one easy attempt cannot cause another increase',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.band_eversion;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);
    for(const age of [12,8,4]){const l=d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy'},clock-age*DAY,ex.dose);morning(d,l);}
    normal(d,clock);const plan=d.autoAdditionalPlan(clock);assert.equal(plan.targets[ex.id].reps,11);assert.ok(plan.trialIds.includes(ex.id));
    const rec=d.recommendations(clock).find(r=>r.ex.id===ex.id);assert.equal(rec.dose.reps,11);
    d.recordExercise(ex.id,rec.dose,{...comfortable,difficulty:'easy',symptomScope:'combined'},clock,rec.dose);assert.equal(d.getState().logs.at(-1).doseReason,'trial');assert.equal(d.suggestedDose(ex).trial,null);
  });
  test('ALGO-04 a changed resistance cannot consume or complete the original resistance target',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.band_eversion;d.getState().exerciseStatuses[ex.id]='active';d.startAdditionalPlan([ex.id],clock);
    d.recordExercise(ex.id,{...ex.dose,sets:1},{...comfortable,doseReason:'time'},clock+1,ex.dose);
    d.recordExercise(ex.id,{...ex.dose,sets:1,resistance:'next'},{...comfortable,doseReason:'time'},clock+2,ex.dose);
    const entry=d.additionalPlanState(ex,clock+2);assert.equal(entry.status,'stopped');assert.equal(entry.used,10);assert.match(entry.reason,/Условия/);
  });
  test('ALGO-06 the most recent failed or pending speed trial prevents old successes from closing that stage',()=>{
    const {dev:d}=scenario();for(const age of [8,6,4]){const a=run(d,'speed',clock-age*DAY);morning(d,a);}
    assert.equal(d.successfulRuns('speed').length,3);run(d,'speed',clock-2*DAY,{response:'worse'});normal(d,clock);assert.equal(d.successfulRuns('speed').length,0);
  });
  test('ALGO-09 offers keep the actual confirmations and linked mornings even after unrelated home entries',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.band_eversion;d.getState().exerciseStatuses[ex.id]='active';confirmedDose(d,ex,ex.dose,'easy',clock-8*DAY);completePlans(d,undefined,clock);
    d.finishAdditionalPlan(clock-1);
    d.openExercise(ex.id);const decision=d.getState().decisionLog.find(e=>e.action==='trial_offered');assert.ok(decision);assert.ok(decision.snapshot.executions.length>=3);assert.ok(decision.snapshot.executions.every(l=>l.exerciseId===ex.id));assert.ok(decision.snapshot.evidence.filter(e=>e.morning).length>=3);
    const count=d.getState().decisionLog.length;d.openExercise(ex.id);assert.equal(d.getState().decisionLog.length,count);
  });
  test('ALGO-02 worsening after a walk stops unfinished work even with no pain',()=>{
    const {dev:d,get,context}=scenario(),plan=d.autoAdditionalPlan(clock),id=Object.keys(plan.targets)[0];d.recordExercise(id,plan.targets[id],{...comfortable,symptomScope:'combined'},clock,plan.targets[id]);
    context.Date.now=()=>clock+1;for(const [key,value] of Object.entries({activityPreset:'general_walk',activityMinutes:'20',activityIntensity:'1',activityPain:'0',activityResponse:'worse'}))get(key).value=value;
    context.window.AM.saveActivity();assert.equal(d.getState().additionalPlan.endedAt,clock+1);assert.equal(d.currentSymptoms(clock+1).worse,true);
  });

  test('ALGO-03 historical unknown resistance cannot confirm the newly tracked resistance',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.band_eversion;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);
    for(const age of [12,8,4]){const l={id:'legacy-band'+age,ts:clock-age*DAY,exerciseId:ex.id,...comfortable,difficulty:'easy',actualDose:{type:'reps_sets',reps:15,sets:2},doseReason:'capacity'};d.getState().logs.push(l);morning(d,l);}
    assert.equal(d.exerciseProgress(ex).confirmed,false);assert.equal(d.suggestedDose(ex).trial,null);
  });
  test('ALGO-06 unknown immediate response never confirms an activity',()=>{
    const {dev:d}=scenario(),a=run(d,'continuous',clock-2*DAY,{response:'unknown'});morning(d,a);assert.equal(d.successfulRuns('continuous').length,0);
  });
  test('ALGO-06 the real stage gate, roadmap and manual transition use the same separate running conditions',()=>{
    const {dev:d,get,context}=scenario(),state=d.getState();state.selectedStage='easy_continuous_run';state.settings.runningPlan={runPermitted:true,targetMinutes:4,sessionsPerWeek:3,weekMinutes:12,challenges:['uphill']};
    for(const age of [13,11,9,6,4,2]){const a=run(d,'continuous',clock-age*DAY);morning(d,a);}
    for(const [id,values] of [['knee_to_wall',{left:10,right:10}],['single_leg_calf_raise_test',{left:20,right:20}],['tandem_flat_clean_steps',{value:100}],['pogo_bilateral',{value:20}]])measured(d,id,{...values,pain_after:0,difficulty:'easy',stop_reason:'planned'},clock-2*DAY);
    state.selfReports.push({ts:clock,trust:10,fear:0,ready:10});normal(d,clock);
    assert.equal(d.stageTransition('normal_volume').reasons.length,0);assert.ok(d.stageTransition('speed_hills_direction').reasons.length);d.renderHome();d.renderTests();assert.equal(get('readinessValue').textContent,'6/6');assert.match(get('roadmap').innerHTML,/AM.suggestStage\('normal_volume'\)/);assert.equal(state.selectedStage,'easy_continuous_run');
    context.confirm=()=>true;context.window.AM.suggestStage('normal_volume');assert.equal(state.selectedStage,'normal_volume');assert.ok(d.stageTransition('speed_hills_direction').reasons.length);
    state.settings.runningPlan.challenges=[];d.renderHome();assert.equal(get('readinessValue').textContent,'✓');assert.match(get('readinessHint').textContent,/моего бегового плана выполнены/);
    state.selectedStage='speed_hills_direction';delete state.settings.runningPlan;d.renderHome();assert.notEqual(get('readinessValue').textContent,'✓');
  });

  test('ALGO-03 a long break starts a smaller probe and does not jump back after one comfortable attempt',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.band_eversion;d.getState().exerciseStatuses[ex.id]='active';confirmedDose(d,ex,{...ex.dose,reps:20},'easy',clock-50*DAY);
    const proposed=d.suggestedDose(ex);assert.equal(proposed.reentry,true);assert.equal(proposed.dose.reps,10);assert.equal(proposed.working.reps,20);
    const l=d.recordExercise(ex.id,proposed.dose,{...comfortable,doseReason:'trial'},clock-DAY,proposed.dose);morning(d,l);assert.equal(d.suggestedDose(ex).dose.reps,10);assert.equal(d.suggestedDose(ex).working.reps,20);
  });
  test('ALGO-02 a pre-boundary form cannot restore its old proposal after an intervening test',()=>{
    const before=new Date(2026,9,17,4,59).getTime(),after=before+2*60000,{dev:d}=app(null,before),ex=d.EXMAP.obstacle_high_knee_heel_to_toe;
    for(const t of d.RDCFG.tests)d.getState().postponedActions['test:'+t.id]=before+DAY;normal(d,before);const offered=plain(d.autoAdditionalPlan(before));assert.equal(offered.status,'ready');
    const session=d.recordTest('knee_to_wall',{left:10,right:10},before+1);d.completeAssessment(session,{pain_after:0,perceived_fatigue:'easy'},before+1);
    d.recordExercise(ex.id,offered.targets[ex.id],{...comfortable,symptomScope:'combined'},after,offered.targets[ex.id],offered);assert.equal(d.getState().additionalPlan,null);
  });
  test('ALGO-01 a lesson finished on a later day schedules the next lesson from the actual final work',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.obstacle_high_knee_heel_to_toe;d.startAdditionalPlan([ex.id],clock);
    d.recordExercise(ex.id,{...ex.dose,target_steps:5},{...comfortable,doseReason:'time'},clock,ex.dose);
    d.recordExercise(ex.id,{...ex.dose,target_steps:15},{...comfortable,doseReason:'planned_remainder'},clock+2*DAY,ex.dose);normal(d,clock+3*DAY);
    assert.equal(d.autoAdditionalPlan(clock+3*DAY).status,'waiting');
  });
  test('ALGO-09 the actual export and import preserve decision evidence and reduced limits',async()=>{
    const source=scenario(),d=source.dev,ex=d.EXMAP.bilateral_calf_raise;d.getState().exerciseStatuses[ex.id]='active';d.startAdditionalPlan([ex.id],clock,{[ex.id]:{...ex.dose,reps:10,sets:2}});
    d.recordExercise(ex.id,{...ex.dose,reps:10,sets:1},{...comfortable,fatigue:'medium',doseReason:'time',symptomScope:'combined'},clock+1,ex.dose);
    let blob;source.context.URL={createObjectURL:value=>{blob=value;return 'blob:synthetic';},revokeObjectURL(){}};d.exportData();const json=await blob.text();
    const restored=app(null,clock+2);restored.context.FileReader=class{readAsText(file){this.result=file;this.onload();}};restored.dev.importData(json);
    assert.deepEqual(plain(restored.dev.getState().decisionLog),plain(d.getState().decisionLog));assert.deepEqual(plain(restored.dev.getState().additionalPlan.limits),plain(d.getState().additionalPlan.limits));
  });

  test('ALGO-03 confirmation days survive normal repetitions awaiting morning and reload',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.bilateral_tiptoe_static;completePlans(d,undefined,clock);
    const earlier=confirmedDose(d,ex,ex.dose,'easy',clock-DAY);
    for(const minutes of [90,60,30])d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy'},clock-minutes*60000,ex.dose);
    assert.deepEqual(plain(d.exerciseProgress(ex).run.map(l=>l.id)),earlier.map(l=>l.id));
    assert.match(d.exerciseProgressHTML(ex,d.suggestedDose(ex),d.nextVariant(ex)),/реакцией утром: 3\/3/);
    const restored=app(plain(d.getState()),clock).dev;
    assert.match(restored.exerciseProgressHTML(restored.EXMAP[ex.id],restored.suggestedDose(restored.EXMAP[ex.id]),null),/реакцией утром: 3\/3/);
  });
  test('ALGO-03 confirmation uses a later easy good repetition once per training day, including after midnight',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.bilateral_tiptoe_static,good=[];
    for(const age of [4,3,2]){
      const at=clock-age*DAY;
      d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy',technique:'ok'},at,ex.dose);
      const l=d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy'},at+6*3600000,ex.dose);good.push(l);morning(d,l);
      d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'normal',technique:'ok'},at+8*3600000,ex.dose);
    }
    const progress=d.exerciseProgress(ex);
    assert.deepEqual(plain(progress.run.map(l=>l.id)),good.map(l=>l.id));
    assert.equal(new Set(progress.run.map(l=>d.startOfDay(l.ts))).size,3);
    assert.match(d.exerciseProgressHTML(ex,d.suggestedDose(ex),null),/реакцией утром: 3\/3/);
  });
  test('ALGO-03 confirmation of a new dose or condition cannot borrow earlier days while awaiting morning',()=>{
    for(const change of [{reps:6},{weight_distribution:'right_bias'}]){
      const {dev:d}=scenario(),ex=d.EXMAP.bilateral_tiptoe_static;completePlans(d,undefined,clock);confirmedDose(d,ex,{...ex.dose,reps:5},'easy',clock-DAY);
      const trial={...ex.dose,...change};d.recordExercise(ex.id,trial,{...comfortable,difficulty:'easy',doseReason:'trial'},clock,trial);
      assert.deepEqual(plain(d.exerciseProgress(ex).working),plain({...ex.dose,reps:5}));
      assert.equal(d.exerciseProgress(ex).candidateDays,0);assert.equal(d.suggestedDose(ex).trial,null);assert.equal(d.nextVariant(ex),null);
    }
  });
  test('ALGO-03 confirmation is interrupted by known adverse work without morning even after later normal feedback',()=>{
    for(const reaction of [{difficulty:'hard'},{fatigue:'high'},{technique:'poor'},{painAfter:3},{swelling:true},{steadiness:'shaky'},{response:'worse'}]){
      const {dev:d}=scenario(),ex=d.EXMAP.bilateral_tiptoe_static;completePlans(d,undefined,clock);confirmedDose(d,ex,ex.dose,'easy',clock-2*DAY);
      const bad=d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy',...reaction},clock-DAY,ex.dose);
      if(reaction.response)d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',response:reaction.response},bad.id,bad.ts+1);
      assert.equal(d.exerciseProgress(ex).candidateDays,0,JSON.stringify(reaction));
      d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy'},bad.ts+3600000,ex.dose);
      morning(d,bad);normal(d,clock-2);
      d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy'},clock-1,ex.dose);
      assert.ok(d.exerciseProgress(ex).candidateDays<=1,JSON.stringify(reaction));
      assert.equal(d.suggestedDose(ex).trial,null,JSON.stringify(reaction));
      assert.equal(d.nextVariant(ex),null,JSON.stringify(reaction));
      assert.equal(d.exerciseProgress(ex).confirmed,true);
    }
  });
  test('ALGO-03 confirmation remains until a pending morning reports worsening, preserving the working level',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.bilateral_tiptoe_static;confirmedDose(d,ex,ex.dose,'easy',clock-2*DAY);
    const latest=d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy'},clock-DAY,ex.dose);
    assert.equal(d.exerciseProgress(ex).candidateDays,3);
    morning(d,latest,{response:'worse',historyWorse:true});normal(d,clock-1);
    const progress=d.exerciseProgress(ex);assert.equal(progress.candidateDays,0);assert.equal(progress.confirmed,true);assert.deepEqual(plain(progress.working),plain(ex.dose));
    assert.match(d.exerciseProgressHTML(ex,d.suggestedDose(ex),null),/реакцией утром: 0\/3/);
  });
  test('ALGO-03 confirmation does not mistake unknown morning history for worsening or a new confirmation',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.bilateral_tiptoe_static;
    const earlier=confirmedDose(d,ex,ex.dose,'easy',clock-2*DAY),pending=d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy'},clock-DAY,ex.dose);
    morning(d,pending,{historyKnown:false});
    assert.equal(d.confirmedSafe(pending),false);assert.deepEqual(plain(d.exerciseProgress(ex).run.map(l=>l.id)),earlier.map(l=>l.id));
    const later=app(plain(d.getState()),clock+31*DAY).dev;
    assert.match(later.exerciseProgressHTML(later.EXMAP[ex.id],later.suggestedDose(later.EXMAP[ex.id]),null),/реакцией утром: 0\/3/);
    assert.equal(later.suggestedDose(later.EXMAP[ex.id]).trial,null);
  });
  test('ALGO-03 confirmation cannot forget an intervening adverse observation when morning is normal',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.bilateral_tiptoe_static;confirmedDose(d,ex,ex.dose,'easy',clock-2*DAY);
    const l=d.recordExercise(ex.id,ex.dose,{...comfortable,difficulty:'easy'},clock-DAY,ex.dose);
    d.recordSymptoms({pain:0,steadiness:'shaky',fatigue:'low'},'combined',l.ts+3600000);morning(d,l);normal(d,clock-1);
    assert.equal(d.exerciseProgress(ex).candidateDays,0);assert.equal(d.exerciseProgress(ex).confirmed,true);assert.equal(d.suggestedDose(ex).trial,null);
  });

};
