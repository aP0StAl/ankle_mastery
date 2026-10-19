const {test}=require('node:test');
const assert=require('node:assert/strict');
module.exports=({app,plain,comfortable,DAY,morning,confirmedDose,completePlans})=>{
  const clock=new Date('2026-10-18T18:00:00+07:00').getTime();
  const setup=()=>{const a=app(null,clock);for(const t of a.dev.RDCFG.tests)a.dev.getState().postponedActions['test:'+t.id]=clock+DAY;a.dev.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);return a;};
  const lift=(d,ex,dose,ts,effort='normal')=>{const l=d.recordExercise(ex.id,dose,{...comfortable,difficulty:effort},ts,dose);d.finishAdditionalPlan(ts+1);morning(d,l);return l;};
  test('NUMERIC game uses incremental fractions: 100,100,40,0 is exactly 60 percent',()=>{
    const {dev:d}=setup();const goals=[{baseline:5,target:10,current:10},{baseline:10,target:20,current:20},{baseline:5,target:10,current:7},{baseline:3,target:5,current:3}];
    assert.equal(d.stageFraction(7,5,10),.4);assert.equal(d.stageProgressMean(goals),.6);
    assert.equal(d.stageFraction(4,5,10),0);assert.equal(d.stageFraction(20,5,10),1);
    assert.equal(d.stageProgressMean([{baseline:10,target:10,current:10}]),1);
    assert.equal(d.stageProgressMean([{baseline:null,target:10,current:5}]),0);
  });
  test('NUMERIC saved start and goal survive new equipment, adverse feedback and reload',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static,state=d.getState();
    state.stageProgress.rehab={enteredAt:clock-10*DAY,version:1,goals:[{id:'static',exerciseId:ex.id,label:'Статика',kind:'reps',baseline:5,target:10,peak:0}]};
    confirmedDose(d,ex,{...ex.dose,reps:7},'easy',clock-2*DAY);
    assert.equal(d.stageGameProgress().score,.4);
    state.exerciseStatuses.hemisphere_both_tiptoe_left_front='active';assert.equal(d.stageGameProgress().goals.length,1);
    const bad=d.recordExercise(ex.id,{...ex.dose,reps:4},{...comfortable,difficulty:'hard'},clock-3600000);morning(d,bad,{response:'worse',historyWorse:true});
    assert.equal(d.stageGameProgress().score,.4);
    const restored=app(plain(state),clock).dev;assert.equal(restored.stageGameProgress().score,.4);assert.equal(restored.stageGameProgress().goals[0].baseline,5);assert.equal(restored.stageGameProgress().goals[0].target,10);
  });
  test('NUMERIC one unconfirmed larger execution cannot earn a confirmed improvement',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static;
    d.getState().stageProgress.rehab={enteredAt:clock-DAY,version:1,goals:[{id:'static',exerciseId:ex.id,kind:'reps',baseline:5,target:10,peak:0}]};
    d.recordExercise(ex.id,{...ex.dose,reps:7},comfortable,clock-3600000);
    assert.equal(d.stageGameProgress().score,0);
  });
  test('NUMERIC one observation does not invent an established baseline or a gain from zero',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static;
    d.recordExercise(ex.id,{...ex.dose,reps:5},comfortable,clock-3600000);
    const goal=d.stageGameProgress().goals.find(g=>g.id==='static');assert.equal(goal.baseline,null);assert.equal(goal.progress,null);
  });
  test('NUMERIC mixed six-repeat trials and ordinary five-repeat blocks confirm the candidate separately',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static;completePlans(d,undefined,clock);confirmedDose(d,ex,{...ex.dose,reps:5},'easy',clock-6*DAY);
    for(const age of [4,3,2]){const ts=clock-age*DAY,l=d.recordExercise(ex.id,{...ex.dose,reps:6},{...comfortable,difficulty:'easy',doseReason:'trial'},ts);d.recordExercise(ex.id,{...ex.dose,reps:5},{...comfortable,difficulty:'easy'},ts+3*3600000);morning(d,l);}
    const p=d.exerciseProgress(ex);assert.equal(p.working.reps,6);assert.equal(p.confirmed,true);assert.equal(p.run.length,3);
    const next=d.recommendedDose(ex);assert.equal(next.dose.reps,6);assert.equal(next.trial,null);assert.equal(d.homeRamp(ex,p).limit,2);
  });
  test('NUMERIC three full new home blocks and their morning precede a further dose increase',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static;completePlans(d,undefined,clock);confirmedDose(d,ex,{...ex.dose,reps:5},'easy',clock-6*DAY);
    for(const age of [4,3,2]){const l=d.recordExercise(ex.id,{...ex.dose,reps:6},{...comfortable,difficulty:'easy',doseReason:'trial'},clock-age*DAY);morning(d,l);}
    let last;for(const h of [0,3])last=d.recordExercise(ex.id,{...ex.dose,reps:6},{...comfortable,difficulty:'easy'},clock+h*3600000);morning(d,last);
    assert.equal(d.homeRamp(ex,d.exerciseProgress(ex,clock+DAY),clock+DAY).limit,3);
    for(const h of [0,3,6])last=d.recordExercise(ex.id,{...ex.dose,reps:6},{...comfortable,difficulty:'easy'},clock+DAY+h*3600000);
    assert.equal(d.suggestedDose(ex,clock+DAY+7*3600000).trial,null);morning(d,last);completePlans(d,undefined,clock+2*DAY);
    const plan=d.suggestedDose(ex,clock+2*DAY);assert.equal(plan.trial.reps,7);
  });
  test('NUMERIC one home trial per day leaves subsequent blocks at the old dose',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static;completePlans(d,undefined,clock);confirmedDose(d,ex,{...ex.dose,reps:5},'easy',clock-2*DAY);
    const chosen=d.recommendedDose(ex);assert.equal(chosen.dose.reps,6);
    d.recordExercise(ex.id,chosen.dose,{...comfortable,difficulty:'easy',doseReason:'trial'},clock-1,chosen.dose);
    assert.equal(d.recommendedDose(ex).dose.reps,5);assert.equal(d.recommendedDose(ex).trial,null);
  });
  test('NUMERIC application selects one useful upgrade instead of simultaneous choices',()=>{
    const {dev:d}=setup(),staticEx=d.EXMAP.bilateral_tiptoe_static,board=d.EXMAP.balance_board_both_tiptoe_right_front;completePlans(d,undefined,clock);
    confirmedDose(d,staticEx,{...staticEx.dose,reps:5},'easy',clock-2*DAY);confirmedDose(d,board,board.dose,'easy',clock-2*DAY);
    assert.equal(d.selectedProgramUpgrade().id,staticEx.id);assert.equal(d.suggestedDose(staticEx).trial.reps,6);assert.equal(d.suggestedDose(board).trial,null);
  });
  test('NUMERIC light support selects a shorter unsupported probe, not twenty assisted cycles',()=>{
    const {dev:d,get}=setup(),ex=d.EXMAP.right_leg_balance_left_front_back;completePlans(d,undefined,clock);confirmedDose(d,ex,{...ex.dose,support:'light'},'easy',clock-2*DAY);
    const plan=d.recommendedDose(ex);assert.equal(plan.dose.support,'none');assert.equal(plan.dose.cycles,3);
    d.openLog(ex.id);assert.match(get('logModal').innerHTML,/value="3"/);assert.match(get('logModal').innerHTML,/name="doseOption" value="none" checked/);
  });
  test('NUMERIC unsupported balance leads to the three-direction task in the same finite home group',()=>{
    const {dev:d}=setup(),base=d.EXMAP.right_leg_balance_left_front_back,next=d.EXMAP.single_leg_multidirectional_reach;completePlans(d,undefined,clock);confirmedDose(d,base,{...base.dose,support:'none'},'easy',clock-2*DAY);d.syncProgram();
    assert.equal(d.getState().exerciseStatuses[next.id],'active');assert.equal(d.nextVariant(base).ex.id,next.id);assert.equal(next.dose.sets,1);assert.equal(next.dose.reps_per_direction,3);assert.equal(next.prescription_credit.group,base.prescription_credit.group);
  });
  test('NUMERIC normal strength effort advances after the introduced frequency has been established',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_calf_raise;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);
    for(const age of [14,12,7,5,3])lift(d,ex,ex.dose,clock-age*DAY);
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);
    assert.equal(d.strengthCadence().freeze,false);assert.equal(d.suggestedDose(ex).trial.reps,6);assert.equal(d.suggestedDose(ex).trial.sets,2);
  });
  test('NUMERIC two introductory lessons do not open a third in their first seven days',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_calf_raise;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);
    for(const age of [3,1])lift(d,ex,ex.dose,clock-age*DAY);
    assert.equal(d.strengthCadence().limit,2);assert.equal(d.strengthCadence().freeze,true);assert.equal(d.suggestedDose(ex).trial,null);assert.equal(d.autoAdditionalPlan().status,'waiting');
  });
  test('NUMERIC the three-session transition week does not also increase repetitions',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_calf_raise;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);
    for(const age of [10,8,3,1])lift(d,ex,ex.dose,clock-age*DAY);
    assert.equal(d.strengthCadence().limit,3);assert.equal(d.strengthCadence().freeze,true);assert.equal(d.suggestedDose(ex).trial,null);
  });
  test('NUMERIC 2x12 becomes 3x8 without a 50 percent jump in session repetitions',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_calf_raise;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);const dose={...ex.dose,reps:12,sets:2};
    for(const age of [14,12,7,5,3])lift(d,ex,dose,clock-age*DAY);
    const plan=d.suggestedDose(ex);assert.equal(plan.trial.sets,3);assert.equal(plan.trial.reps,8);assert.equal(d.doseVolume(plan.trial),d.doseVolume(dose));assert.match(d.exerciseRulesHTML(ex),/кажд/);
  });
  test('NUMERIC legacy bilateral weighted work cannot confirm the new unilateral protocol',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.weighted_calf_raise;
    for(const age of [4,3,2]){const l={id:'legacy_weight_'+age,exerciseId:ex.id,ts:clock-age*DAY,...comfortable,actualDose:{type:'reps_sets',sets:3,reps:12,weight_kg:'1'}};d.getState().logs.push(l);morning(d,l);}
    assert.equal(d.exerciseProgress(ex).logs.length,0);assert.equal(d.exerciseProgress(ex).confirmed,false);assert.equal(d.getState().logs.filter(l=>l.exerciseId===ex.id).length,3);
    assert.match(ex.name,/Одноног/);assert.equal(ex.dose.sides,2);
  });
  test('NUMERIC entered arbitrary real weight survives the form and has no three-kilogram ceiling',()=>{
    const {dev:d,get}=setup(),ex=d.EXMAP.weighted_calf_raise;
    d.recordExercise(ex.id,{...ex.dose,weight_kg:'4.5'},comfortable,clock-3600000);
    d.openLog(ex.id);assert.match(get('logModal').innerHTML,/id="weightKg"[^>]*value="4.5"/);
  });
  test('NUMERIC the achieved original static assignment is not a gate for starting known unilateral ability',()=>{
    const {dev:d}=setup(),s=d.recordTest('single_leg_calf_raise_test',{left:10,right:10,difficulty:'hard',stop_reason:'quality',pain_after:0},clock-2*DAY);d.completeAssessment(s,{pain_after:0,perceived_fatigue:'moderate'},clock-2*DAY);morning(d,d.getState().testLogs.at(-1));d.syncProgram();
    const ex=d.EXMAP.single_leg_calf_raise;assert.equal(d.getState().exerciseStatuses[ex.id],'active');assert.equal(d.suggestedDose(ex).dose.reps,5);assert.equal(d.suggestedDose(ex).dose.sets,2);assert.equal(d.exerciseProgress(d.EXMAP.bilateral_tiptoe_static).confirmed,false);
  });
  test('NUMERIC thirty-one days preserve a comparable measured result with its date',()=>{
    const {dev:d}=setup(),t=d.RDCFG.tests.find(t=>t.id==='knee_to_wall');d.recordTest(t.id,{left:16,right:11},clock-40*DAY);
    const measured=d.currentMeasurement(t);assert.equal(measured.log.right,11);assert.equal(measured.ageDays,40);
  });
  test('NUMERIC generic percent cannot compensate for a missing functional observation',()=>{
    const {dev:d}=setup();d.getState().stageProgress.rehab={enteredAt:clock,goals:[{id:'game_only',baseline:0,target:1,peak:1,kind:'test',testId:'pogo_bilateral'}]};assert.equal(d.stageGameProgress().score,1);
    const gate=d.stageTransition('ready_for_run_walk');assert.ok(gate.reasons.length>0);assert.equal(gate.checks.find(c=>c.id==='impact').passed,false);
  });
  test('NUMERIC hill runs confirm their own surface, grade and small format',()=>{
    const {dev:d}=setup();d.getState().settings.runningPlan={runPermitted:true,challenges:['uphill']};const template=d.runTemplate('uphill');
    for(const age of [6,4,2]){const a=d.recordRun({mode:'uphill',...template,rpe:3,painAfter:0,response:'same',quality:'good'},clock-age*DAY);morning(d,a);}
    const runs=d.successfulRuns('uphill');assert.equal(runs.length,3);assert.equal(runs[0].running.surface,'uphill');assert.equal(d.runningChecks(d.RDCFG.stages.find(s=>s.order===5)).find(c=>c.id==='run_uphill').passed,true);
    assert.equal(d.successfulRuns('downhill').length,0);
  });
  test('NUMERIC flat runs labelled uphill do not confirm a real hill exposure',()=>{
    const {dev:d}=setup();const a=d.recordRun({mode:'uphill',...d.runTemplate('uphill'),surface:'level',rpe:3},clock-2*DAY);morning(d,a);assert.equal(d.successfulRuns('uphill').length,0);
  });
  test('NUMERIC first special-running doses use seconds and their own number of bouts',()=>{
    const {dev:d,get}=setup();for(const mode of ['speed','uphill','downhill','direction']){const t=d.runTemplate(mode);assert.ok(t.runMinutes<2);d.openRun(mode);assert.match(get('activityModal').innerHTML,new RegExp(mode==='speed'||mode==='direction'?'10 сек':mode==='uphill'?'30 сек':'20 сек'));}
  });
  test('NUMERIC a full toe-walking day finishes the ramp without moving its starting date',()=>{
    const {dev:d}=setup(),flat=d.EXMAP.tandem_walk_flat,toe=d.EXMAP.tandem_walk_tiptoe;completePlans(d,undefined,clock);confirmedDose(d,flat,flat.dose,'easy',clock-10*DAY);
    for(const [age,n] of [[8,1],[7,1],[6,1],[5,2],[4,3]]){let last;for(let i=0;i<n;i++)last=d.recordExercise(toe.id,toe.dose,{...comfortable,difficulty:'easy',doseReason:'trial',transitionFrom:flat.id},clock-age*DAY+i*3*3600000,toe.dose);morning(d,last);}
    const p=d.exerciseProgress(toe);assert.equal(d.homeRamp(toe,p,clock,d.exerciseProgress(flat).working).complete,true);
    const balance=d.EXMAP.right_leg_balance_left_front_back;confirmedDose(d,balance,{...balance.dose,support:'light'},'easy',clock-2*DAY);completePlans(d,undefined,clock);
    assert.equal(d.selectedProgramUpgrade().id,balance.id);assert.equal(d.recommendedDose(balance).dose.cycles,3);
  });
  test('NUMERIC an added home block waits while the program introduces strength',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static;completePlans(d,undefined,clock);confirmedDose(d,ex,{...ex.dose,reps:5},'easy',clock-8*DAY);
    for(const age of [5,4,3]){const l=d.recordExercise(ex.id,{...ex.dose,reps:6},{...comfortable,difficulty:'easy',doseReason:'trial'},clock-age*DAY);morning(d,l);}
    d.getState().exerciseStatuses.single_leg_calf_raise='active';d.recordExercise('single_leg_calf_raise',d.EXMAP.single_leg_calf_raise.dose,{...comfortable,doseReason:'trial'},clock-3600000,d.EXMAP.single_leg_calf_raise.dose);assert.equal(d.selectedProgramUpgrade().id,'single_leg_calf_raise');
    d.recordExercise(ex.id,{...ex.dose,reps:6},comfortable,clock-1);assert.equal(d.recommendedDose(ex).dose.reps,5);assert.equal(d.homeRamp(ex,d.exerciseProgress(ex)).adopted,1);
  });
  test('NUMERIC missed introductory weeks can be completed later and old weighted work cannot establish them',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_calf_raise;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);
    d.getState().logs.push({id:'old_bilateral',exerciseId:'weighted_calf_raise',ts:clock-100*DAY,...comfortable,actualDose:{type:'reps_sets',reps:12,sets:3,weight_kg:'1'}});
    for(const age of [28,18,16,14,11,9,7,4,2])lift(d,ex,ex.dose,clock-age*DAY);
    assert.equal(d.strengthCadence().freeze,false);assert.equal(d.strengthCadence().initial.sides,2);assert.equal(d.suggestedDose(ex).trial.reps,6);
  });
  test('NUMERIC legacy inline next-day feedback cannot crash the new strength cadence',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_calf_raise;
    for(const age of [5,3])d.getState().logs.push({id:'inline_'+age,exerciseId:ex.id,ts:clock-age*DAY,...comfortable,actualDose:ex.dose,nextDay:'same'});
    assert.doesNotThrow(()=>d.strengthCadence());assert.equal(d.strengthCadence().freeze,true);
  });
  test('NUMERIC an older 2x12 execution cannot undo the established 3x8 stage',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_calf_raise;d.getState().exerciseStatuses[ex.id]='active';completePlans(d,undefined,clock);
    for(const age of [20,18,13,11,9])lift(d,ex,{...ex.dose,reps:12,sets:2},clock-age*DAY);
    for(const age of [6,4])lift(d,ex,{...ex.dose,reps:8,sets:3},clock-age*DAY);
    lift(d,ex,{...ex.dose,reps:12,sets:2},clock-2*DAY);assert.equal(d.exerciseProgress(ex).working.sets,3);assert.equal(d.exerciseProgress(ex).working.reps,8);
  });
  test('NUMERIC a recovered smaller dose never falls back to the rejected larger dose',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static;confirmedDose(d,ex,{...ex.dose,reps:6},'easy',clock-9*DAY);
    const bad=d.recordExercise(ex.id,{...ex.dose,reps:6},{...comfortable,difficulty:'hard'},clock-6*DAY);morning(d,bad);
    confirmedDose(d,ex,{...ex.dose,reps:5},'normal',clock-2*DAY);
    for(const h of [0,3])d.recordExercise(ex.id,{...ex.dose,reps:5},comfortable,clock+h*3600000);
    assert.equal(d.suggestedDose(ex,clock+6*3600000).dose.reps,5);assert.equal(d.exerciseProgress(ex).transition,null);
  });
  test('NUMERIC exposure counts each leg and keeps legacy bilateral weights separate',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_calf_raise,w=d.EXMAP.weighted_calf_raise;
    d.recordExercise(ex.id,ex.dose,comfortable,clock-1,ex.dose);
    assert.deepEqual(plain(d.exposureEvents().filter(r=>r.movement===ex.id).map(r=>[r.side,r.quantity])),[['left',10],['right',10]]);
    d.getState().logs.push({id:'legacy',exerciseId:w.id,ts:clock-2,...comfortable,actualDose:{type:'reps_sets',reps:12,sets:3,weight_kg:'1'}});d.recordExercise(w.id,w.dose,comfortable,clock-1,w.dose);
    assert.equal(d.exposureSummary().filter(r=>r.movement===w.id).length,3);
  });
  test('NUMERIC entry into another stage starts from the ability already earned before entry',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.hop_to_stabilization;confirmedDose(d,ex,{...ex.dose,reps:3},'normal',clock-9*DAY);confirmedDose(d,ex,{...ex.dose,reps:5},'normal',clock-2*DAY);
    d.getState().selectedStage='ready_for_impact';let g=d.stageGameProgress();assert.equal(g.goals.find(g=>g.id==='landing').baseline,10);assert.ok(g.score<1);
    const saved=plain(d.getState());delete saved.stageProgress;const imported=app(saved,clock).dev.stageGameProgress();assert.equal(imported.goals.find(g=>g.id==='landing').baseline,10);assert.equal(imported.score,0);
  });
  test('NUMERIC unknown unsupported and jump ability remain unknown until actually observed',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.right_leg_balance_left_front_back;confirmedDose(d,ex,{...ex.dose,support:'light'},'easy',clock-2*DAY);
    assert.equal(d.stageGameProgress().goals.find(g=>g.id==='balance').baseline,null);d.getState().selectedStage='ready_for_impact';assert.equal(d.stageGameProgress().goals.find(g=>g.id==='pogo').baseline,null);
    assert.throws(()=>d.recordTest('pogo_bilateral',{value:20,difficulty:'normal',stop_reason:'planned',pain_after:0},clock-2*DAY));
    const goal=d.stageGameProgress().goals.find(g=>g.id==='pogo');assert.equal(goal.baseline,null);assert.equal(goal.progress,null);assert.equal(d.stageGameProgress().score,0);
  });
  test('NUMERIC a personal running goal cannot create earned progress without another run',()=>{
    const {dev:d}=setup(),st=d.getState();st.selectedStage='easy_continuous_run';
    for(const age of [6,4,2]){const r=d.recordRun({mode:'continuous',runMinutes:4,walkMinutes:0,intervals:1,longestContinuous:4,rpe:3,painAfter:0,response:'same',quality:'good'},clock-age*DAY);morning(d,r);}
    d.stageGameProgress();st.settings.runningPlan={runPermitted:true,targetMinutes:4,sessionsPerWeek:3,weekMinutes:12};assert.equal(d.stageGameProgress().score,0);
  });
  test('NUMERIC a legacy additional reach cannot retroactively fulfil a home prescription',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_multidirectional_reach;
    d.getState().logs.push({id:'old_extra',exerciseId:ex.id,ts:clock-1,...comfortable,additionalPlanId:'old_plan',actualDose:{...ex.dose,sets:1}});
    assert.equal(d.planCounts().front_back_balance,0);
  });
  test('NUMERIC partial static restoration does not retire the daily assignment',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static,calf=d.EXMAP.single_leg_calf_raise;d.getState().exerciseStatuses[calf.id]='active';confirmedDose(d,ex,{...ex.dose,reps:9},'easy',clock-9*DAY);
    for(const age of [6,4,2])lift(d,calf,calf.dose,clock-age*DAY);
    for(const age of [5,4,3]){const l=d.recordExercise(ex.id,{...ex.dose,reps:10},{...comfortable,difficulty:'easy',doseReason:'trial'},clock-age*DAY);morning(d,l);}
    assert.equal(d.dailyPlan().targets.tiptoe_static,3);
    let last;for(const h of [0,3,6])last=d.recordExercise(ex.id,{...ex.dose,reps:10},comfortable,clock-2*DAY+h*3600000);morning(d,last);
    const future=app(plain(d.getState()),clock+DAY).dev;assert.equal(future.dailyPlan(clock+DAY).targets.tiptoe_static,undefined);assert.equal(future.dailyPlan(clock+DAY).targets.towel_straight,3);
    assert.match(future.additionalChoice(future.EXMAP.single_leg_calf_raise,clock+DAY).reason,/один разминочный блок/);
  });
  test('NUMERIC tests retain same-day preparation context without manufacturing a recovery clock',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.bilateral_tiptoe_static,l=d.recordExercise(ex.id,ex.dose,comfortable,clock-3600000,ex.dose),t=d.RDCFG.tests.find(t=>t.id==='single_leg_calf_raise_test');
    assert.ok(d.testPreparationUntil(t,clock)<=clock);d.recordTest(t.id,{left:10,right:10},clock);
    assert.ok(d.getState().testLogs.at(-1).preparation_context.exerciseIds.includes(l.id));
  });

  test('NUMERIC old right-only calf work cannot confirm the new two-sided session',()=>{
    const {dev:d}=setup(),ex=d.EXMAP.single_leg_calf_raise;d.getState().exerciseStatuses[ex.id]='active';
    for(const age of [8,6,4]){const old={id:'right_only_'+age,exerciseId:ex.id,ts:clock-age*DAY,...comfortable,actualDose:{type:'reps_sets',reps:10,sets:2}};d.getState().logs.push(old);morning(d,old);}
    assert.equal(d.exerciseProgress(ex).confirmed,false);assert.equal(d.strengthCadence().initial,null);
    for(const age of [3,2,1])lift(d,ex,ex.dose,clock-age*DAY);assert.equal(d.exerciseProgress(ex).confirmed,true);assert.equal(d.exerciseProgress(ex).working.sides,2);
  });

  test('NUMERIC adopting two toe blocks is saved as one frequency change and survives an unknown morning',()=>{
    const {dev:d}=setup(),flat=d.EXMAP.tandem_walk_flat,toe=d.EXMAP.tandem_walk_tiptoe;completePlans(d,undefined,clock);confirmedDose(d,flat,flat.dose,'easy',clock-10*DAY);
    for(const age of [6,5,4]){const l=d.recordExercise(toe.id,toe.dose,{...comfortable,difficulty:'easy',doseReason:'trial',transitionFrom:flat.id},clock-age*DAY,toe.dose);morning(d,l);}
    const step=d.selectedProgramUpgrade();assert.equal(step.id,toe.id);assert.equal(step.kind,'frequency');assert.equal(step.blocks,2);
    const l=d.recordExercise(toe.id,toe.dose,{...comfortable,transitionFrom:flat.id},clock,toe.dose);assert.equal(l.frequencyBlocks,2);
    const restored=app(plain(d.getState()),clock+DAY).dev,p=restored.exerciseProgress(restored.EXMAP[toe.id]);assert.equal(restored.homeRamp(restored.EXMAP[toe.id],p,clock+DAY,flat.dose).adopted,2);
  });

};
