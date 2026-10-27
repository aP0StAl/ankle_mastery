const {test}=require('node:test');
const assert=require('node:assert/strict');
module.exports=({app,plain,comfortable,DAY,morning,confirmedDose,completePlans})=>{
  const clock=new Date(2026,9,18,18).getTime();
  function scenario(){const a=app(null,clock),d=a.dev;for(const t of d.RDCFG.tests)d.getState().postponedActions['test:'+t.id]=clock+DAY;d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);return a;}
  function lineReady(d){const ex=d.EXMAP.tandem_walk_flat;completePlans(d,undefined,clock);confirmedDose(d,ex,ex.dose,'easy',clock-DAY);return ex;}
  function lineChoices(d,ts=clock){return Array.from(d.recommendations(ts)).filter(r=>r.ex.prescription_credit?.group==='line_walk');}
  test('a mastered prescribed line selects the toe-walking practice and its own dose instead of two promotions',()=>{
    const {dev:d,get}=scenario(),flat=lineReady(d),toe=d.EXMAP.tandem_walk_tiptoe;
    assert.equal(d.suggestedDose(flat).trial,null);
    const choices=lineChoices(d);assert.deepEqual(choices.map(r=>r.ex.id),[toe.id]);assert.equal(choices[0].dose.target_steps,12);
    assert.equal(d.recommendedDose(toe).selectedTrial,true);assert.equal(d.exerciseProgress(toe).confirmed,false);
    d.openExercise(flat.id);const html=get('exerciseModal').innerHTML;
    assert.match(html,/Выбрано приложением/);assert.match(html,/Ходьба по линии на носках/);assert.match(html,/12 шагов/);
    assert.doesNotMatch(html,/Пробный шаг: 17|Проверить следующий вариант|Попробовать этот шаг/);
    assert.match(html,/AM\.openLog\('tandem_walk_tiptoe'\)/);
    d.openLog(toe.id);assert.match(get('logModal').innerHTML,/Пробный шаг/);assert.match(get('logModal').innerHTML,/value="12"/);assert.match(get('logModal').innerHTML,/value="trial" selected/);
  });
  test('a reduced four-step line and three good mornings do not prematurely select toe walking',()=>{
    const {dev:d}=scenario(),flat=d.EXMAP.tandem_walk_flat;completePlans(d,undefined,clock);
    confirmedDose(d,flat,{...flat.dose,target_steps:4},'easy',clock-DAY);
    assert.equal(d.nextVariant(flat),null);assert.deepEqual(lineChoices(d).map(r=>r.ex.id),[flat.id]);
    assert.equal(d.recommendedDose(flat).dose.target_steps,5);
  });
  test('restored balance with light contact selects no assistance despite an old poor execution and a pending normal morning',()=>{
    const {dev:d,get}=scenario(),ex=d.EXMAP.right_leg_balance_left_front_back,light={...ex.dose,support:'light'};completePlans(d,undefined,clock);
    const old=d.recordExercise(ex.id,{...ex.dose,support:'usual'},{...comfortable,technique:'poor'},clock-8*DAY,ex.dose);morning(d,old);
    confirmedDose(d,ex,light,'easy',clock-DAY);
    d.recordExercise(ex.id,light,{...comfortable,difficulty:'easy'},clock-3600000,light);
    const plan=d.recommendedDose(ex);assert.equal(plan.working.support,'light');assert.equal(plan.trial.support,'none');assert.equal(plan.dose.support,'none');assert.equal(plan.dose.cycles,3);
    d.openExercise(ex.id);assert.match(get('exerciseModal').innerHTML,/Пробный шаг: 3 цикла · Без помощи/);
    d.openLog(ex.id);assert.match(get('logModal').innerHTML,/name="doseOption" value="none" checked/);assert.match(get('logModal').innerHTML,/value="trial" selected/);
  });
  test('one new assistance trial repeats its selected conditions without financing another increase',()=>{
    const {dev:d,get}=scenario(),ex=d.EXMAP.right_leg_balance_left_front_back,light={...ex.dose,support:'light'};completePlans(d,undefined,clock);confirmedDose(d,ex,light,'easy',clock-2*DAY);
    const trial=d.recommendedDose(ex).dose,l=d.recordExercise(ex.id,trial,{...comfortable,difficulty:'easy',doseReason:'trial'},clock-DAY,trial);morning(d,l);
    const plan=d.recommendedDose(ex);assert.equal(plan.working.support,'light');assert.equal(plan.dose.support,'none');assert.equal(plan.trial,null);
    const restored=app(plain(d.getState()),clock).dev;restored.openLog(ex.id);assert.match(restored.exerciseProgressHTML(restored.EXMAP[ex.id],restored.recommendedDose(restored.EXMAP[ex.id]),null),/Рабочий объём[\s\S]*Лёгкое касание/);
    d.openLog(ex.id);assert.match(get('logModal').innerHTML,/name="doseOption" value="none" checked/);
  });
  test('a new bad balance reaction still blocks advancement after a normal overall assessment',()=>{
    const {dev:d}=scenario(),ex=d.EXMAP.right_leg_balance_left_front_back,light={...ex.dose,support:'light'};completePlans(d,undefined,clock);confirmedDose(d,ex,light,'easy',clock-DAY);
    const bad=d.recordExercise(ex.id,light,{...comfortable,difficulty:'hard'},clock-3600000,light);
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);
    assert.equal(d.recommendedDose(ex).trial,null);assert.equal(d.exerciseProgress(ex).working.support,'light');assert.equal(d.getState().logs.at(-1).id,bad.id);
  });
  test('returning from a failed unsupported balance probe prefills the recommended light contact instead of remembering the failure',()=>{
    const {dev:d,get}=scenario(),ex=d.EXMAP.right_leg_balance_left_front_back,light={...ex.dose,support:'light'};completePlans(d,undefined,clock);confirmedDose(d,ex,light,'easy',clock-DAY);
    d.recordExercise(ex.id,{...light,support:'none'},{...comfortable,difficulty:'hard',doseReason:'trial'},clock-4*3600000,light);d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);
    assert.equal(d.recommendedDose(ex).dose.support,'light');d.openLog(ex.id);
    assert.match(get('logModal').innerHTML,/name="doseOption" value="light" checked/);assert.doesNotMatch(get('logModal').innerHTML,/name="doseOption" value="none" checked/);
  });
  test('five mastered balance cycles without assistance finish the defined progression instead of inventing a sixth cycle',()=>{
    const {dev:d,get}=scenario(),ex=d.EXMAP.right_leg_balance_left_front_back;completePlans(d,undefined,clock);confirmedDose(d,ex,{...ex.dose,support:'none'},'easy',clock-DAY);
    const plan=d.recommendedDose(ex);assert.equal(plan.dose.cycles,5);assert.equal(plan.trial,null);
    d.openExercise(ex.id);assert.match(get('exerciseModal').innerHTML,/Выбрано приложением/);assert.doesNotMatch(get('exerciseModal').innerHTML,/Что осталось до следующего шага|Пробный шаг: 6/);
  });
  test('an unsuccessful toe-walking probe returns to ordinary walking until new confirmations after that reaction',()=>{
    const {dev:d}=scenario(),flat=lineReady(d),toe=d.EXMAP.tandem_walk_tiptoe;
    const bad=d.recordExercise(toe.id,toe.dose,{...comfortable,difficulty:'hard',doseReason:'trial'},clock-4*3600000,toe.dose);
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);
    assert.equal(d.nextVariant(flat),null);assert.deepEqual(lineChoices(d).map(r=>r.ex.id),[flat.id]);assert.equal(d.recommendedDose(flat).dose.target_steps,16);assert.equal(d.recommendedDose(flat).trial,null);
    const counts=plain(d.planCounts(clock));assert.equal(counts.line_walk,1);
    const later=app(plain(d.getState()),clock+4*DAY).dev;completePlans(later,undefined,clock+4*DAY);
    for(const age of [3,2,1]){const l=later.recordExercise(flat.id,flat.dose,{...comfortable,difficulty:'easy'},clock+(4-age)*DAY,flat.dose);morning(later,l);}
    later.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock+4*DAY-1);
    assert.equal(later.nextVariant(later.EXMAP[flat.id],clock+4*DAY).ex.id,toe.id);
    assert.equal(d.getState().logs.find(l=>l.id===bad.id).difficulty,'hard');
  });
  test('independently established toe walking remains the selected movement without renewing old ordinary-line evidence',()=>{
    const {dev:d}=scenario(),flat=d.EXMAP.tandem_walk_flat,toe=d.EXMAP.tandem_walk_tiptoe;
    confirmedDose(d,flat,flat.dose,'easy',clock-45*DAY);confirmedDose(d,toe,toe.dose,'normal',clock-DAY);
    assert.deepEqual(lineChoices(d).map(r=>r.ex.id),[toe.id]);assert.equal(d.recommendedDose(toe).dose.target_steps,12);assert.equal(d.recommendedDose(toe).selectedTrial,true);
  });
  test('a fresh difficult ordinary walk prevents a switch to historically established toes after normal overall feedback',()=>{
    const {dev:d}=scenario(),flat=lineReady(d),toe=d.EXMAP.tandem_walk_tiptoe;confirmedDose(d,toe,toe.dose,'easy',clock-DAY);
    d.recordExercise(flat.id,flat.dose,{...comfortable,difficulty:'hard'},clock-4*3600000,flat.dose);d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);
    assert.equal(d.nextVariant(flat),null);assert.deepEqual(lineChoices(d).map(r=>r.ex.id),[flat.id]);assert.ok(d.recommendedDose(flat).dose.target_steps<16);assert.equal(d.exerciseProgress(toe).confirmed,true);
  });
  test('an old capped flat-walking test cannot reopen progression after a newer difficult walk and a normal assessment',()=>{
    const {dev:d}=scenario(),flat=lineReady(d);
    const session=d.recordTest('tandem_flat_clean_steps',{value:100,difficulty:'easy',stop_reason:'cap',pain_after:0},clock-3*DAY);d.completeAssessment(session,{pain_after:0,perceived_fatigue:'easy'},clock-3*DAY);morning(d,d.getState().testLogs.at(-1));
    d.recordExercise(flat.id,flat.dose,{...comfortable,difficulty:'hard'},clock-4*3600000,flat.dose);d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);
    assert.equal(d.nextVariant(flat),null);assert.deepEqual(lineChoices(d).map(r=>r.ex.id),[flat.id]);
    assert.match(d.exerciseProgressHTML(flat,d.recommendedDose(flat),null),/После реакции нужны новые подтверждения/);
  });
  test('a superseded low test cannot permanently block three newer confirmed ordinary-line days',()=>{
    const {dev:d}=scenario(),flat=d.EXMAP.tandem_walk_flat;completePlans(d,undefined,clock);
    const session=d.recordTest('tandem_flat_clean_steps',{value:4,difficulty:'normal',stop_reason:'planned',pain_after:0},clock-5*DAY);d.completeAssessment(session,{pain_after:0,perceived_fatigue:'easy'},clock-5*DAY);morning(d,d.getState().testLogs.at(-1));
    confirmedDose(d,flat,flat.dose,'easy',clock-DAY);
    assert.equal(d.nextVariant(flat).ex.id,'tandem_walk_tiptoe');assert.deepEqual(lineChoices(d).map(r=>r.ex.id),['tandem_walk_tiptoe']);
  });
  test('the selected toe-walking probe survives reload and a day boundary without needing another adherence gate',()=>{
    const {dev:d}=scenario(),flat=lineReady(d),toe=d.EXMAP.tandem_walk_tiptoe;
    const offered=d.recommendedDose(toe);assert.equal(offered.transitionFrom,flat.id);
    d.recordExercise(toe.id,offered.dose,{...comfortable,difficulty:'easy',doseReason:'trial',transitionFrom:offered.transitionFrom},clock-4*3600000,offered.dose);
    const restored=app(plain(d.getState()),clock+DAY).dev;
    assert.equal(restored.progressionAdherence(clock+DAY).allowed,false);
    const plan=restored.recommendedDose(restored.EXMAP[toe.id],clock+DAY);assert.equal(plan.dose.target_steps,12);assert.equal(plan.trial,null);assert.equal(plan.selectedTrial,true);
    assert.deepEqual(lineChoices(restored,clock+DAY).map(r=>r.ex.id),[toe.id]);assert.equal(restored.planCounts(clock+DAY).line_walk,0);
  });
  test('a transition consumes the same finite home group and cannot reopen it at its daily maximum',()=>{
    const {dev:d}=scenario(),flat=lineReady(d),toe=d.EXMAP.tandem_walk_tiptoe,targets=plain(d.dailyPlan(clock).targets);
    for(const [i,id] of [flat.id,toe.id,toe.id,toe.id].entries())d.recordExercise(id,d.EXMAP[id].dose,comfortable,clock-(12-i*3)*3600000,d.EXMAP[id].dose);
    assert.equal(d.planCounts(clock).line_walk,4);assert.deepEqual(plain(d.dailyPlan(clock).targets),targets);assert.equal(lineChoices(d).length,0);
    const restored=app(plain(d.getState()),clock).dev;assert.equal(lineChoices(restored).length,0);assert.equal(restored.planCounts(clock).line_walk,4);
  });
  test('two toe-walking executions leave the third shared home repetition to the original ordinary-line dose',()=>{
    const {dev:d,get}=scenario(),flat=lineReady(d),toe=d.EXMAP.tandem_walk_tiptoe;
    for(const hours of [9,5])d.recordExercise(toe.id,toe.dose,{...comfortable,difficulty:'easy',doseReason:'trial'},clock-hours*3600000,toe.dose);
    const choices=lineChoices(d);assert.deepEqual(choices.map(r=>r.ex.id),[flat.id]);assert.equal(choices[0].dose.target_steps,16);assert.equal(d.recommendedDose(flat).trial,null);
    assert.equal(d.planCounts(clock).line_walk,2);assert.equal(d.dailyPlan(clock).targets.line_walk,3);
    d.openExercise(toe.id);assert.match(get('exerciseModal').innerHTML,/AM\.openLog\('tandem_walk_flat'\)">Записать обычную ходьбу/);
    d.recordExercise(flat.id,flat.dose,comfortable,clock,flat.dose);assert.equal(d.planCounts(clock).line_walk,3);
  });
  test('an old actual ordinary-line form still records its actual movement and volume after a newly available transition',()=>{
    const {dev:d,get}=scenario(),flat=d.EXMAP.tandem_walk_flat;d.openLog(flat.id);lineReady(d);
    for(const [key,value] of Object.entries({dose_target_steps:16,painBefore:0,painDuring:0,painAfter:0,doseReason:'capacity',difficultySel:'easy',techSel:'good',logSteadiness:'steady',fatigueSel:'low',comment:''}))get(key).value=String(value);
    d.saveLog(flat.id);const actual=d.getState().logs.at(-1);assert.equal(actual.exerciseId,flat.id);assert.equal(actual.actualDose.target_steps,16);assert.equal(d.planCounts(clock).line_walk,1);
  });
};
