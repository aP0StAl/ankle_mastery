const {test}=require('node:test');
const assert=require('node:assert/strict');

module.exports=({app,plain,comfortable,DAY,morning,confirmedDose})=>{
  const clock=+new Date(2026,9,23,18),home=['bilateral_tiptoe_static','right_leg_balance_left_front_back','tandem_walk_flat','left_side_lunge_right_leg_straight','towel_stretch_straight_knee','towel_stretch_bent_knee'];
  const key=ex=>({hold_reps:'reps',cycles:'cycles',steps:'target_steps',duration:'target_sec'})[ex.dose.type];
  function setup(ids=home){
    const a=app(null,clock),d=a.dev,s=d.getState();
    for(const id of Object.keys(s.exerciseStatuses))s.exerciseStatuses[id]=ids.includes(id)?'active':'archived';
    for(const t of d.RDCFG.tests)s.postponedActions['test:'+t.id]=clock+40*DAY;
    for(const id of ids.filter(id=>home.includes(id))){const ex=d.EXMAP[id],dose={...ex.dose,[key(ex)]:ex.dose.type==='duration'?60:ex.dose.type==='steps'?16:5,...(ex.dose.type==='cycles'?{support:'light'}:{})};confirmedDose(d,ex,dose,'easy',clock-20*DAY);}
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-4*3600000);
    return a;
  }
  function block(d,id,dose,ts,more={}){return d.recordExercise(id,dose,{...comfortable,technique:'ok',phase:'after',symptomScope:'combined',doseReason:'recovery',...more},ts,dose);}
  function full(d,id,value,day,more={}){
    const ex=d.EXMAP[id],dose={...d.exerciseProgress(ex,day).working,[key(ex)]:value};let last;
    for(const h of [0,3,6])last=block(d,id,dose,day+h*3600000,more);
    morning(d,last);return last;
  }
  test('RETURN weak shared mornings preserve all six doses and anchors through fourteen repetitions',()=>{
    const {dev:d}=setup(),anchors=Object.fromEntries(home.map(id=>[id,plain(d.exerciseProgress(d.EXMAP[id]).working)]));
    for(let day=14;day>=1;day--){
      let last;
      for(const id of home){const ex=d.EXMAP[id],v=ex.dose.type==='duration'?50:ex.dose.type==='steps'?14:3;last=block(d,id,{...anchors[id],[key(ex)]:v},clock-day*DAY);}
      morning(d,last,{pain:1,response:'worse'});
      d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-day*DAY+DAY-1);
    }
    for(const id of home){const ex=d.EXMAP[id],p=d.recommendedDose(ex);assert.equal(p.dose[key(ex)],ex.dose.type==='duration'?50:ex.dose.type==='steps'?14:3);assert.deepEqual(plain(p.working),anchors[id]);}
    assert.equal(d.repeatedMorningReaction(),true);assert.equal(d.selectedProgramUpgrade(),null);
    assert.match(d.recommendedDose(d.EXMAP.bilateral_tiptoe_static).reason,/пересматриваем нагрузку/);
  });
  test('RETURN two full acceptable days select restoration despite low weekly regularity',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static;
    full(d,ex.id,3,clock-3*DAY);full(d,ex.id,3,clock-2*DAY);
    assert.equal(d.progressionAdherence().allowed,false);assert.equal(d.homeReturnState(ex).days,2);
    assert.equal(d.selectedProgramUpgrade().kind,'return');assert.equal(d.recommendedDose(ex).dose.reps,4);assert.equal(d.recommendedDose(ex).working.reps,5);
  });
  test('RETURN partial days, missing morning and tightly spaced entries do not establish full daily tolerance',()=>{
    for(const mode of ['partial','missing','close']){
      const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static,dose={...ex.dose,reps:3};
      for(const day of [3,2]){let l;for(let i=0;i<(mode==='partial'?2:3);i++)l=block(d,ex.id,dose,clock-day*DAY+i*(mode==='close'?1000:3*3600000));if(mode!=='missing')morning(d,l);}
      assert.equal(d.homeReturnState(ex).days,0,mode);assert.equal(d.recommendedDose(ex).dose.reps,3,mode);
    }
  });
  test('RETURN a changed hold or support does not count as the same restoration dose',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static;
    full(d,ex.id,3,clock-4*DAY);
    for(const day of [3,2]){let l;for(let i=0;i<3;i++)l=block(d,ex.id,{...ex.dose,reps:3,hold_sec:1},clock-day*DAY+i*3*3600000);morning(d,l);}
    assert.equal(d.homeReturnState(ex).days,1);assert.equal(d.recommendedDose(ex).trial,null);
  });
  test('RETURN stretches reach their prescribed sixty seconds and have a finite endpoint',()=>{
    const {dev:d}=setup(['towel_stretch_straight_knee']),ex=d.EXMAP.towel_stretch_straight_knee;
    full(d,ex.id,50,clock-6*DAY);full(d,ex.id,50,clock-5*DAY);
    assert.equal(d.recommendedDose(ex,clock-4*DAY).dose.target_sec,55);
    for(const day of [4,3])full(d,ex.id,55,clock-day*DAY,{doseReason:'return'});
    assert.equal(d.recommendedDose(ex,clock-2*DAY).dose.target_sec,60);
    for(const day of [2,1])full(d,ex.id,60,clock-day*DAY,{doseReason:'return'});
    assert.equal(d.homeReturnState(ex),null);assert.equal(d.recommendedDose(ex).dose.target_sec,60);assert.equal(d.recommendedDose(ex).trial,null);
  });
  test('RETURN one genuine daily change leaves the other return ready for tomorrow; continuing a dose is not a new change',()=>{
    const ids=['bilateral_tiptoe_static','right_leg_balance_left_front_back'],{dev:d}=setup(ids);
    for(const id of ids)for(const day of [3,2])full(d,id,3,clock-day*DAY);
    const ex=d.EXMAP.bilateral_tiptoe_static,p=d.recommendedDose(ex),log=block(d,ex.id,p.dose,clock-3600000,{doseReason:'return'});
    assert.equal(log.returnStep,true);assert.equal(d.recommendedDose(d.EXMAP[ids[1]]).dose.cycles,3);
    morning(d,log);
    const saved=plain(d.getState()),tomorrow=app(saved,clock+DAY).dev;
    const continuation=block(tomorrow,ex.id,{...ex.dose,reps:4},clock+DAY-3600000,{doseReason:'return'});
    assert.equal(continuation.programChange,false);assert.equal(tomorrow.selectedProgramUpgrade().id,ids[1]);
  });
  test('RETURN a clear shared reaction rolls back the last return step without cutting the other groups',()=>{
    const ids=['bilateral_tiptoe_static','right_leg_balance_left_front_back'],{dev:d}=setup(ids);
    for(const id of ids)for(const day of [3,2])full(d,id,3,clock-day*DAY);
    const ex=d.EXMAP[ids[0]],p=d.recommendedDose(ex);block(d,ex.id,p.dose,clock-2*3600000,{doseReason:'return'});
    d.recordSymptoms({pain:3,steadiness:'steady',fatigue:'low',response:'worse'},'combined',clock-3600000);
    assert.equal(d.currentSymptoms().pain,3);
    assert.equal(d.recommendedDose(ex).dose.reps,3);assert.equal(d.recommendedDose(d.EXMAP[ids[1]]).dose.cycles,3);
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);
    assert.equal(d.recommendedDose(ex).dose.reps,3);assert.equal(d.selectedProgramUpgrade().performed,true);
    assert.equal(d.homeReturnState(ex).days,0);
  });
  test('RETURN normal feedback and reload never reopen an ended additional plan',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static','slider_injured_leg_three_directions']);
    full(d,'bilateral_tiptoe_static',3,clock-2*DAY);
    const ex=d.EXMAP.slider_injured_leg_three_directions,p=d.startAdditionalPlan([ex.id],clock-3600000);
    d.recordExercise(ex.id,p.targets[ex.id],comfortable,clock-3500000,p.targets[ex.id]);
    const frozen=plain(d.getState().additionalPlan);assert.ok(frozen.endedAt);
    d.recordSymptoms({pain:1,steadiness:'steady',fatigue:'low',response:'worse'},'combined',clock-1000);
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);
    assert.deepEqual(plain(d.getState().additionalPlan),frozen);
    assert.deepEqual(plain(app(plain(d.getState()),clock).dev.getState().additionalPlan),frozen);
  });
  test('RETURN a weak reaction after the selected increase keeps that dose and cannot unlock a second change',()=>{
    const ids=['bilateral_tiptoe_static','right_leg_balance_left_front_back'],{dev:d}=setup(ids);
    for(const id of ids)for(const day of [3,2])full(d,id,3,clock-day*DAY);
    const ex=d.EXMAP[ids[0]],p=d.recommendedDose(ex);block(d,ex.id,p.dose,clock-2*3600000,{doseReason:'return'});
    d.recordSymptoms({pain:1,response:'worse',steadiness:'steady',fatigue:'low'},'combined',clock-3600000);
    assert.equal(d.currentSymptoms().pain,1);assert.equal(d.dailyLoadPlan(ex).status,'hold');assert.equal(d.recommendedDose(ex).dose.reps,4);
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-1);
    assert.equal(d.recommendedDose(ex).dose.reps,4);assert.equal(d.recommendedDose(d.EXMAP[ids[1]]).dose.cycles,3);assert.equal(d.selectedProgramUpgrade().performed,true);
  });
  test('RETURN a bad morning rolls back a full raised day and does not reuse old proof days',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static;
    full(d,ex.id,3,clock-5*DAY);full(d,ex.id,3,clock-4*DAY);
    const l=full(d,ex.id,4,clock-3*DAY,{doseReason:'return'});
    morning(d,l,{pain:3,response:'worse'});
    assert.equal(d.recommendedDose(ex).dose.reps,3);assert.equal(d.homeReturnState(ex).days,0);
    full(d,ex.id,3,clock-2*DAY);assert.equal(d.homeReturnState(ex).days,1);
    full(d,ex.id,3,clock-DAY);assert.equal(d.recommendedDose(ex).dose.reps,4);
  });
  test('RETURN an old form after an intervening reaction records actual volume without reopening the rejected step',()=>{
    const {dev:d,get}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static;
    full(d,ex.id,3,clock-3*DAY);full(d,ex.id,3,clock-2*DAY);d.openLog(ex.id);
    d.recordSymptoms({pain:1,response:'worse',steadiness:'steady',fatigue:'low'},'combined',clock-1);
    for(const [field,value] of Object.entries({dose_reps:4,dose_hold_sec:5,dose_sets:1,doseOption:'even',painBefore:1,painDuring:1,painAfter:1,doseReason:'return',difficultySel:'normal',techSel:'ok',logSteadiness:'steady',fatigueSel:'low',comment:''}))get(field).value=String(value);
    d.saveLog(ex.id);const actual=d.getState().logs.at(-1);
    assert.equal(actual.actualDose.reps,4);assert.equal(actual.returnBlocked,true);assert.equal(d.recommendedDose(ex).dose.reps,3);
    assert.equal(d.homeReturnState(ex).days,0);
  });
  test('RETURN incomplete home recovery blocks toe walking and every new upgrade even on a day with no ready return',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static','tandem_walk_flat','tandem_walk_tiptoe']),ex=d.EXMAP.bilateral_tiptoe_static;
    full(d,ex.id,3,clock-2*DAY);
    assert.equal(d.selectedProgramUpgrade(),null);
    assert.equal(d.nextVariant(d.EXMAP.tandem_walk_flat),null);
    assert.equal(d.recommendations().some(r=>r.ex.id==='tandem_walk_tiptoe'),false);
  });
  test('RETURN two normal mornings release repeated-reaction hold; one current report does not',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static;
    for(const day of [5,4]){const l=full(d,ex.id,3,clock-day*DAY);morning(d,l,{pain:1,response:'worse'});}
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',clock-3*DAY);
    assert.equal(d.repeatedMorningReaction(),true);
    full(d,ex.id,3,clock-3*DAY);assert.equal(d.repeatedMorningReaction(),true);
    full(d,ex.id,3,clock-2*DAY);assert.equal(d.repeatedMorningReaction(),false);assert.equal(d.recommendedDose(ex).dose.reps,4);
  });
  test('RETURN real swelling still pauses work despite an earlier mild morning',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static,l=full(d,ex.id,3,clock-DAY);morning(d,l,{pain:1,response:'worse'});
    d.recordSymptoms({pain:1,steadiness:'steady',swelling:true,fatigue:'low'},'combined',clock-1);
    assert.equal(d.dailyLoadPlan(ex).status,'pause');assert.equal(d.recommendations().length,0);
  });
  test('RETURN a short entry because of time cannot become a new reduced recovery dose',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static;
    full(d,ex.id,3,clock-3*DAY);full(d,ex.id,3,clock-2*DAY);
    const l=block(d,ex.id,{...ex.dose,reps:2},clock-3*3600000,{doseReason:'time'});
    assert.equal(l.doseReason,'time');assert.equal(l.programChange,false);
    assert.equal(d.homeReturnState(ex).dose.reps,3);assert.equal(d.homeReturnState(ex).days,2);
  });
  test('RETURN yesterday missing morning blocks a new step even with two older full days',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static;
    full(d,ex.id,3,clock-4*DAY);full(d,ex.id,3,clock-3*DAY);
    block(d,ex.id,{...ex.dose,reps:3},clock-DAY);
    assert.equal(d.homeReturnState(ex).days,2);assert.equal(d.selectedProgramUpgrade(),null);assert.equal(d.recommendedDose(ex).dose.reps,3);
  });
  test('RETURN fresh strong test fatigue takes precedence over an earlier mild morning',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static,l=full(d,ex.id,3,clock-DAY);morning(d,l,{pain:1,response:'worse'});
    const session=d.recordTest('knee_to_wall',{left:16,right:11,conditions:'standard'},clock);
    d.completeAssessment(session,{pain_after:0,perceived_fatigue:'strong',instability:false,swelling:false},clock);
    assert.equal(d.currentSymptoms().fatigue,'high');assert.equal(d.dailyLoadPlan(ex).status,'light');
    assert.equal(d.selectedProgramUpgrade(),null);assert.equal(d.recommendedDose(ex).dose.reps,2);
  });
  test('RETURN temporary general fatigue does not become a permanent smaller step or leave old proof ready',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static;
    full(d,ex.id,3,clock-3*DAY);full(d,ex.id,3,clock-2*DAY);
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',generalFatigue:'high'},'combined',clock-3600000);
    assert.equal(d.recommendedDose(ex).dose.reps,2);
    const l=block(d,ex.id,{...ex.dose,reps:2},clock-1800000,{doseReason:'daily_load'});
    assert.equal(l.doseReason,'daily_load');assert.equal(d.homeReturnState(ex).dose.reps,3);
    d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',generalFatigue:'low'},'combined',clock-1);
    assert.equal(d.recommendedDose(ex).dose.reps,3);assert.equal(d.homeReturnState(ex).days,0);
  });
  test('RETURN a new lower matching measurement constrains the current dose before restoration',()=>{
    const {dev:d}=setup(['tandem_walk_flat']),ex=d.EXMAP.tandem_walk_flat;
    full(d,ex.id,14,clock-3*DAY);full(d,ex.id,14,clock-2*DAY);
    const s=d.recordTest('tandem_flat_clean_steps',{value:4,conditions:'standard',difficulty:'normal',stop_reason:'quality',pain_after:0,protocol_confirmed:true},clock-1);
    d.completeAssessment(s,{pain_after:0,perceived_fatigue:'easy',instability:false,swelling:false},clock-1);
    const p=d.recommendedDose(ex);assert.equal(p.dose.target_steps,3);assert.equal(p.working.target_steps,16);assert.equal(p.doseFromTest,true);assert.equal(p.trial,null);
  });
  test('RETURN a later genuinely new dose does not resurrect old recovery or bypass its daily ramp',()=>{
    const {dev:d}=setup(['bilateral_tiptoe_static']),ex=d.EXMAP.bilateral_tiptoe_static;
    for(const day of [10,9])full(d,ex.id,3,clock-day*DAY);
    for(const day of [8,7])full(d,ex.id,4,clock-day*DAY,{doseReason:'return'});
    for(const day of [6,5])full(d,ex.id,5,clock-day*DAY,{doseReason:'return'});
    assert.equal(d.homeReturnState(ex),null);
    confirmedDose(d,ex,{...ex.dose,reps:6},'easy',clock-2*DAY);
    assert.equal(d.exerciseProgress(ex).working.reps,6);assert.equal(d.homeReturnState(ex),null);
    assert.equal(d.recommendedDose(ex).returning,undefined);assert.equal(d.homeRamp(ex,d.exerciseProgress(ex)).complete,false);
  });
};
