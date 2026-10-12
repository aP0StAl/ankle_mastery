const {test}=require('node:test');
const assert=require('node:assert/strict');

module.exports=({app,plain,comfortable,DAY})=>{
  const clock=new Date(2026,9,12,18).getTime(),heron='obstacle_high_knee_heel_to_toe';
  const normal=(d,ts)=>d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',response:'same'},'combined',ts);
  function scenario(ts=clock){
    const result=app(null,ts),d=result.dev;
    for(const t of d.RDCFG.tests)d.getState().postponedActions['test:'+t.id]=ts+3*DAY;
    normal(d,ts-1);return result;
  }
  function legacy(d,ts,id=heron){
    const ex=d.EXMAP[id];d.getState().logs.push({id:'legacy_'+ts,exerciseId:id,ts,...comfortable,symptomScope:'combined',actualDose:plain(ex.dose),suggestedDose:plain(ex.dose),doseFactor:1,doseReason:'capacity'});
  }
  const extras=(d,ts)=>d.recommendations(ts).filter(r=>!r.ex.prescription_credit?.group);

  test('the app supplies a finite automatic proposal without a composition picker or a state mutation',()=>{
    const {dev:d,get}=scenario(),saved=plain(d.getState()),proposal=d.autoAdditionalPlan(clock);
    assert.equal(proposal.status,'ready');assert.ok(Object.keys(proposal.targets).length>0);
    assert.ok(Object.keys(proposal.targets).length<=3);assert.ok(extras(d,clock).length>0);
    assert.deepEqual(plain(d.getState()),saved);
    d.renderHome();d.openAdditionalPlan();
    assert.doesNotMatch(get('additionalPlanModal').innerHTML,/type="checkbox"|Начать выбранное|Выбери состав/);
    assert.doesNotMatch(get('additionalPlanWrap').innerHTML,/Выбрать упражнения/);
  });

  test('one automatic lesson does not select both front-leg board variants or both sideways alternatives',()=>{
    const {dev:d}=scenario(),ids=Object.keys(d.autoAdditionalPlan(clock).targets);
    assert.equal(new Set(ids.map(id=>d.additionalPattern(d.EXMAP[id]))).size,ids.length);
    assert.ok(!(ids.includes('balance_board_both_tiptoe_right_front')&&ids.includes('balance_board_both_tiptoe_left_front')));
    assert.ok(!(ids.includes('tiptoe_sidewalk_ball_reaction')&&ids.includes('tiptoe_sidewalk_cone_reach')));
  });

  test('the first recommended execution freezes the shown automatic goals and later reports do not expand them',()=>{
    const {dev:d}=scenario(),proposal=plain(d.autoAdditionalPlan(clock)),rec=extras(d,clock)[0];
    assert.ok(rec);
    d.recordExercise(rec.ex.id,rec.dose,{...comfortable,symptomScope:'combined'},clock,rec.dose);
    const plan=d.getState().additionalPlan;
    assert.equal(plan.source,'automatic');assert.deepEqual(plain(plan.targets),proposal.targets);
    const frozen=plain(plan.targets),id=plan.id;
    for(let i=1;i<=6;i++)normal(d,clock+i*60000);
    assert.equal(d.getState().additionalPlan.id,id);assert.deepEqual(plain(d.getState().additionalPlan.targets),frozen);
    assert.equal(d.additionalPlanState(rec.ex,clock+6*60000).status,'complete');
  });

  test('automatic recommendations stop after the finite lesson even through repeated normal stretches',()=>{
    const {dev:d}=scenario(),stretch=d.EXMAP.towel_stretch_straight_knee;
    let executions=0;
    for(let i=0;i<12;i++){
      const ts=clock+i*60000,rec=extras(d,ts)[0];if(!rec)break;
      d.recordExercise(rec.ex.id,rec.dose,{...comfortable,symptomScope:'combined'},ts,rec.dose);executions++;
    }
    assert.ok(executions>0&&executions<=3);
    const frozen=plain(d.getState().additionalPlan);
    for(let i=12;i<20;i++){
      const ts=clock+i*60000;d.recordExercise(stretch.id,stretch.dose,{...comfortable,symptomScope:'combined'},ts,stretch.dose);normal(d,ts+1);
      assert.equal(extras(d,ts+1).length,0);
    }
    assert.deepEqual(plain(d.getState().additionalPlan),frozen);
  });

  test('the last prescribed stretch cannot close an unfinished automatically composed lesson',()=>{
    const {dev:d}=scenario(),home=['towel_stretch_straight_knee','towel_stretch_bent_knee','bilateral_tiptoe_static','tandem_walk_flat','right_leg_balance_left_front_back','left_side_lunge_right_leg_straight'];
    for(const hour of [9,13,17])for(const id of home){if(hour===17&&id===home[0])continue;const ex=d.EXMAP[id];d.recordExercise(id,ex.dose,comfortable,new Date(2026,9,12,hour).getTime(),ex.dose);}
    const first=extras(d,clock)[0];assert.ok(first);
    d.recordExercise(first.ex.id,first.dose,{...comfortable,symptomScope:'combined'},clock,first.dose);
    const remaining=extras(d,clock+1).map(r=>r.ex.id).sort();assert.ok(remaining.length>0);
    const stretch=d.EXMAP[home[0]];d.recordExercise(stretch.id,stretch.dose,{...comfortable,symptomScope:'combined'},clock+2,stretch.dose);
    assert.ok(Object.values(d.planCounts(clock+2)).every(n=>n===3));
    assert.deepEqual(extras(d,clock+2).map(r=>r.ex.id).sort(),remaining);
  });

  test('manual work occupies its direction without declaring the whole eligible lesson completed',()=>{
    const {dev:d}=scenario();legacy(d,clock-60000);normal(d,clock);
    const proposal=d.autoAdditionalPlan(clock);
    assert.equal(proposal.status,'ready');assert.ok(Object.keys(proposal.targets).length>0&&Object.keys(proposal.targets).length<=2);
    assert.ok(!proposal.targets[heron]);assert.ok(extras(d,clock).every(r=>r.ex.id!==heron));
  });

  test('saving an earlier proposal cannot restore a direction performed after the form opened',()=>{
    const {dev:d}=scenario(),offered=plain(d.autoAdditionalPlan(clock)),done=Object.keys(offered.targets).at(-1);
    legacy(d,clock,done);normal(d,clock+1);
    const current=d.autoAdditionalPlan(clock+1),id=Object.keys(offered.targets).find(id=>current.targets[id]);assert.ok(id);
    d.recordExercise(id,offered.targets[id],{...comfortable,symptomScope:'combined'},clock+2,offered.targets[id],offered);
    const plan=d.getState().additionalPlan;
    assert.ok(plan);assert.ok(Object.keys(plan.targets).length<=2);assert.equal(plan.targets[done],undefined);
    assert.ok(Object.keys(plan.targets).every(id=>current.targets[id]));
  });

  test('an earlier normal proposal cannot restore three directions after reported fatigue',()=>{
    const {dev:d}=scenario(),offered=plain(d.autoAdditionalPlan(clock)),id=Object.keys(offered.targets)[0];
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',generalFatigue:'medium'},'combined',clock+1);
    d.recordExercise(id,offered.targets[id],{...comfortable,symptomScope:'combined',generalFatigue:'medium'},clock+2,offered.targets[id],offered);
    assert.ok(Object.keys(d.getState().additionalPlan?.targets||{}).length<=1);
    assert.equal(extras(d,clock+3).length,0);
  });

  test('a manual record cannot authorize another lesson on a rest day or a fourth weekly session',()=>{
    for(const ages of [[1],[6,4,2]]){
      const {dev:d}=scenario();for(const age of ages)legacy(d,clock-age*DAY);
      normal(d,clock);assert.equal(d.autoAdditionalPlan(clock).status,'waiting');
      const ex=d.EXMAP[heron],log=d.recordExercise(heron,ex.dose,{...comfortable,symptomScope:'combined'},clock,ex.dose);
      assert.ok(d.getState().logs.includes(log));assert.equal(log.additionalPlanId,undefined);
      assert.equal(d.autoAdditionalPlan(clock+1).status,'waiting');assert.equal(extras(d,clock+1).length,0);
    }
  });

  test('three weekly sessions wait until the rolling window opens and fresh state is still needed',()=>{
    const {dev:d}=scenario();for(const age of [6,4,2])legacy(d,clock-age*DAY);
    normal(d,clock);assert.equal(d.autoAdditionalPlan(clock).status,'waiting');
    assert.equal(extras(d,clock).length,0);
    assert.equal(d.autoAdditionalPlan(clock+DAY).status,'feedback');
    normal(d,clock+DAY);assert.equal(d.autoAdditionalPlan(clock+DAY).status,'ready');
  });

  test('05:00 and a normal morning cannot restart a lesson completed just before the boundary',()=>{
    const before=new Date(2026,9,12,4,59).getTime(),after=before+2*60000,{dev:d}=scenario(before);
    for(let i=0;i<3;i++){const ts=before+i,rec=extras(d,ts)[0];if(!rec)break;d.recordExercise(rec.ex.id,rec.dose,{...comfortable,symptomScope:'combined'},ts,rec.dose);}
    assert.equal(extras(d,before+3).length,0);
    const frozen=plain(d.getState().additionalPlan);
    d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(before),pain:0,steadiness:'steady',fatigue:'low',response:'same',historyKnown:true,historyWorse:false},'combined',after);
    assert.equal(d.autoAdditionalPlan(after).status,'waiting');assert.equal(extras(d,after).length,0);
    const restored=app(plain(d.getState()),after).dev;
    assert.deepEqual(plain(restored.getState().additionalPlan),frozen);assert.equal(extras(restored,after).length,0);
  });

  test('a preexisting larger finite lesson keeps its remaining dose after upgrade and reload',()=>{
    const {dev:d}=scenario(),ids=[heron,'balance_board_both_tiptoe_right_front','tiptoe_sidewalk_ball_reaction','tiptoe_square_corner_lunges'],ex=d.EXMAP[heron];
    d.startAdditionalPlan(ids,clock-2*DAY);
    d.recordExercise(heron,{...ex.dose,target_steps:5},{...comfortable,doseReason:'time'},clock-2*DAY+1,ex.dose);
    const saved=plain(d.getState()),restored=app(saved,clock).dev;
    assert.equal(restored.autoAdditionalPlan(clock).status,'ongoing');assert.equal(restored.additionalPlanState(restored.EXMAP[heron],clock).remaining,15);
    assert.deepEqual(plain(restored.getState().additionalPlan),saved.additionalPlan);
  });

  test('moderate and strong fatigue produce one smaller and less demanding direction',()=>{
    for(const fatigue of ['medium','high']){
      const {dev:d}=scenario();d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',generalFatigue:fatigue},'combined',clock);
      const proposal=d.autoAdditionalPlan(clock),ids=Object.keys(proposal.targets);
      assert.equal(proposal.status,'ready');assert.equal(ids.length,1);
      const ex=d.EXMAP[ids[0]];assert.ok(Math.max(...Object.values(ex.load_channels))<=.3);
      assert.ok(proposal.targets[ex.id].sets<ex.dose.sets||proposal.targets[ex.id].target_steps<ex.dose.target_steps);
    }
  });

  test('fatigue or deterioration after starting ends the remaining lesson without a debt after normal feedback',()=>{
    for(const response of [{fatigue:'medium'},{fatigue:'high'},{painAfter:3}]){
      const {dev:d}=scenario(),rec=extras(d,clock)[0];
      d.recordExercise(rec.ex.id,rec.dose,{...comfortable,symptomScope:'combined',...response},clock,rec.dose);
      const plan=d.getState().additionalPlan;
      assert.equal(plan.endedAt,clock);assert.match(plan.endedReason,/усталости|самочувствия/);
      normal(d,clock+1);assert.equal(extras(d,clock+1).length,0);
      assert.ok(Object.keys(plan.targets).filter(id=>id!==rec.ex.id).every(id=>d.additionalPlanState(d.EXMAP[id],clock+1).status==='stopped'));
      const restored=app(plain(d.getState()),clock+2).dev;assert.equal(extras(restored,clock+2).length,0);
    }
  });

  test('a later general observation ends unfinished additional work after any load',()=>{
    for(const response of [{fatigue:'medium'},{fatigue:'low',generalFatigue:'medium'}]){
      const {dev:d}=scenario(),rec=extras(d,clock)[0];
      d.recordExercise(rec.ex.id,rec.dose,{...comfortable,symptomScope:'combined'},clock,rec.dose);
      assert.equal(d.getState().additionalPlan.endedAt,null);
      d.recordSymptoms({pain:0,steadiness:'steady',...response},'combined',clock+1);
      assert.equal(d.getState().additionalPlan.endedAt,clock+1);
      normal(d,clock+2);assert.equal(extras(d,clock+2).length,0);
    }
  });

  test('the completion screen explains fatigue instead of substituting optional home load',()=>{
    const {dev:d}=scenario(),home=['towel_stretch_straight_knee','towel_stretch_bent_knee','bilateral_tiptoe_static','tandem_walk_flat','right_leg_balance_left_front_back','left_side_lunge_right_leg_straight'];
    for(const hour of [9,13,17])for(const id of home){const ex=d.EXMAP[id];d.recordExercise(id,ex.dose,comfortable,new Date(2026,9,12,hour).getTime(),ex.dose);}
    const rec=extras(d,clock)[0];assert.ok(rec);
    d.recordExercise(rec.ex.id,rec.dose,{...comfortable,fatigue:'medium',symptomScope:'combined'},clock,rec.dose);
    assert.equal(d.actionRecommendations(clock+1).length,0);
    const screen=d.noRecommendationHTML(clock+1);
    assert.match(screen,/Дополнительное занятие закончено/);assert.match(screen,/после отмеченной усталости/);
    assert.match(screen,/Остаток не нужно наверстывать/);assert.match(screen,/Следующее занятие — не раньше/);
  });

  test('fatigue after a test series closes unfinished additional work before later normal feedback',()=>{
    const {dev:d}=scenario(),rec=extras(d,clock)[0];
    d.recordExercise(rec.ex.id,rec.dose,{...comfortable,symptomScope:'combined'},clock,rec.dose);
    const s=d.recordTest('knee_to_wall',{left:10,right:10},clock+60000);
    d.completeAssessment(s,{pain_after:3,perceived_fatigue:'moderate',instability:false,swelling:false},clock+60001);
    assert.equal(d.getState().additionalPlan.endedAt,clock+60001);
    normal(d,clock+4*3600000);assert.equal(extras(d,clock+4*3600000).length,0);
  });

  test('a delayed test-series reaction also closes the unfinished additional lesson',()=>{
    const {dev:d,context,get}=scenario(),s=d.recordTest('knee_to_wall',{left:10,right:10},clock-DAY);
    d.completeAssessment(s,{pain_after:0,perceived_fatigue:'easy',instability:false,swelling:false},clock-DAY);
    d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(clock-DAY),pain:0,steadiness:'steady',fatigue:'low',response:'same',historyKnown:true,historyWorse:false},'combined',clock-1);
    const rec=extras(d,clock)[0];assert.ok(rec);
    d.recordExercise(rec.ex.id,rec.dose,{...comfortable,symptomScope:'combined'},clock,rec.dose);
    context.Date.now=()=>clock+1;get('assessmentSameDay').value='worse';get('assessmentNextDay').value='worse';
    context.window.AM.saveAssessmentCheck(s.id);
    assert.equal(d.getState().additionalPlan.endedAt,clock+1);
    normal(d,clock+4*3600000);assert.equal(extras(d,clock+4*3600000).length,0);
  });

  test('unknown measurements do not become measured weakness and a low measured capacity changes the reason and priority',()=>{
    const high=scenario().dev,low=scenario().dev,id='tiptoe_sidewalk_ball_reaction';
    for(const [d,right] of [[high,25],[low,1]]){
      d.recordTest('knee_to_wall',{left:10,right:10},clock-3*DAY);
      d.recordTest('single_leg_calf_raise_test',{left:25,right},clock-3*DAY);
    }
    const highChoice=high.additionalChoice(high.EXMAP[id],clock),lowChoice=low.additionalChoice(low.EXMAP[id],clock);
    assert.ok(lowChoice.score>highChoice.score);assert.match(lowChoice.reason,/По измерениям/);
    const unknown=scenario().dev;
    assert.ok(Object.values(unknown.autoAdditionalPlan(clock).reasons).every(reason=>!reason.includes('По измерениям')));
  });

  test('measurement preparation, post-test rest and severe symptoms still constrain automatic composition',()=>{
    const {dev:d}=scenario();for(const id of Object.keys(d.getState().exerciseStatuses))d.getState().exerciseStatuses[id]='archived';d.getState().exerciseStatuses[heron]='active';
    delete d.getState().postponedActions['test:tandem_flat_clean_steps'];
    assert.equal(extras(d,clock).length,0);
    for(const t of d.RDCFG.tests)d.getState().postponedActions['test:'+t.id]=clock+DAY;
    const session=d.recordTest('tandem_tiptoe_clean_steps',{value:30,pain_after:0,difficulty:'normal',stop_reason:'planned'},clock);
    d.completeAssessment(session,{pain_after:0,perceived_fatigue:'easy'},clock);
    assert.equal(extras(d,clock+2*3600000).length,0);assert.ok(extras(d,clock+3*3600000).length>0);
    d.recordSymptoms({pain:5,steadiness:'steady',fatigue:'low'},'combined',clock+3*3600000+1);
    assert.equal(d.autoAdditionalPlan(clock+3*3600000+1).status,'recovery');assert.equal(extras(d,clock+3*3600000+1).length,0);
  });

  test('removing every pending exercise ends the old lesson instead of locking future automatic planning',()=>{
    const {dev:d,context}=scenario(),rec=extras(d,clock)[0];d.recordExercise(rec.ex.id,rec.dose,{...comfortable,symptomScope:'combined'},clock,rec.dose);
    const old=d.getState().additionalPlan.id;
    for(const id of Object.keys(d.getState().additionalPlan.targets))context.window.AM.archiveExercise(id);
    assert.equal(d.getState().additionalPlan.endedAt,clock);
    d.getState().exerciseStatuses[heron]='active';normal(d,clock+2*DAY);
    assert.equal(d.autoAdditionalPlan(clock+2*DAY).status,'ready');assert.equal(d.getState().additionalPlan.id,old);
  });
};
