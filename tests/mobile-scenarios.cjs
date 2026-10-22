// Isolated synthetic browser checks. Run with NODE_PATH pointing at Playwright.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=process.env.ANKLE_QA_OUTPUT||'/tmp/ankle-mobile-qa';
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hook=source.replace('\nrenderAll();\nsetInterval(renderHome,15*60*1000);',`\nwindow.qa={homeReturnState,homeReturns,planCounts,stagePreparationProgress,recordImpactCheck,impactCheckStatus,rehabWorkChecks,testAvailable,stageTransition,finishAdditionalPlan,feedbackRecommendation,selectedProgramUpgrade,exerciseChangeNotice,progressionAdherence,stageGameProgress,defaultState,recordExercise,recordTest,recordSymptoms,completeAssessment,autoAdditionalPlan,renderAll,startAdditionalPlan,recommendedDose,exerciseProgress,EXMAP,RDCFG,startOfDay,DAY,getState:()=>state};\nrenderAll();\nsetInterval(renderHome,15*60*1000);`);
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const cases=['before','rest','completed','measured','recovery','progress','line','balance','game','notice_static','notice_toes','stage_check','impact_ladder','return_before','return_rest','return_completed','return_measured','return_feedback','return_minor','return_fatigue',...(process.env.ANKLE_QA_BACKUP?['backup']:[]),...(process.env.ANKLE_RETURN_BACKUP?['return_backup']:[])].filter(name=>!process.env.ANKLE_QA_CASES||process.env.ANKLE_QA_CASES.split(',').includes(name));
    for(const name of cases){
      const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,timezoneId:'Asia/Ho_Chi_Minh',locale:'ru-RU'});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(clockString=>{const RealDate=Date,clock=new RealDate(clockString).getTime();window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};},name.startsWith('return_')?'2026-10-23T18:00:00+07:00':name==='backup'&&process.env.ANKLE_QA_BACKUP.includes('2026-10-18')?'2026-10-18T18:00:00+07:00':'2026-10-17T18:00:00+07:00');
      await page.route('http://ankle.test/**',async route=>{
        const pathname=new URL(route.request().url()).pathname;
        if(pathname==='/')return route.fulfill({body:hook,contentType:'text/html'});
        const file=path.join(root,pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
        return route.fulfill({body:fs.readFileSync(file),contentType:'image/webp'});
      });
      if(name==='backup'){const backup=JSON.parse(fs.readFileSync(process.env.ANKLE_QA_BACKUP,'utf8'));await page.addInitScript(data=>{if(!localStorage.getItem('ankle_mastery_static_v2'))localStorage.setItem('ankle_mastery_static_v2',JSON.stringify(data));},backup);}
      if(name==='return_backup'){const backup=JSON.parse(fs.readFileSync(process.env.ANKLE_RETURN_BACKUP,'utf8'));await page.addInitScript(data=>localStorage.setItem('ankle_mastery_static_v2',JSON.stringify(data)),backup);}
      await page.goto('http://ankle.test/');
      await page.evaluate(name=>{
        const d=window.qa,state=d.getState(),ts=Date.now(),comfortable={painDuring:0,painAfter:0,fatigue:'low',technique:'good',steadiness:'steady',difficulty:'normal',symptomScope:'combined'};
        if(name==='backup'||name==='return_backup'){d.renderAll();return;}
        if(name.startsWith('return_')){
          const ids=['towel_stretch_straight_knee','towel_stretch_bent_knee','tandem_walk_flat','left_side_lunge_right_leg_straight','bilateral_tiptoe_static','right_leg_balance_left_front_back'];
          const key=ex=>({duration:'target_sec',steps:'target_steps',cycles:'cycles',hold_reps:'reps'})[ex.dose.type];
          const morning=(at,response='same',pain=0)=>d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(at),response,historyKnown:true,historyWorse:false,pain,fatigue:'low',steadiness:'steady'},'combined',d.startOfDay(at)+d.DAY+3*3600000);
          for(const id of Object.keys(state.exerciseStatuses))state.exerciseStatuses[id]=ids.includes(id)?'active':'archived';
          for(const t of d.RDCFG.tests)state.postponedActions['test:'+t.id]=ts+d.DAY;
          for(const age of [20,19,18,3,2]){
            let last;
            for(const hour of age<10?[5,8,11]:[5])for(const id of ids){
              const ex=d.EXMAP[id],value=ex.dose.type==='duration'?(age<10?50:60):ex.dose.type==='steps'?(age<10?14:16):(age<10?3:5),dose={...ex.dose,[key(ex)]:value,...(ex.dose.type==='cycles'?{support:'light'}:{})};
              last=d.recordExercise(id,dose,{...comfortable,phase:'after',doseReason:age<10?'recovery':'capacity'},d.startOfDay(ts-age*d.DAY)+hour*3600000,dose);
            }
            morning(last.ts);
          }
          d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',d.startOfDay(ts)+4*3600000);
          if(name==='return_rest'){const ex=d.EXMAP.bilateral_tiptoe_static,p=d.recommendedDose(ex);d.recordExercise(ex.id,p.dose,{...comfortable,phase:'after',doseReason:'return'},ts-3600000,p.dose);}
          if(name==='return_completed')for(const hour of [5,8,11])for(const id of ids){const ex=d.EXMAP[id],at=d.startOfDay(ts)+hour*3600000,p=d.recommendedDose(ex,at);d.recordExercise(id,p.dose,{...comfortable,phase:'after',doseReason:'return'},at,p.dose);}
          if(name==='return_measured'){const s=d.recordTest('knee_to_wall',{left:16,right:11,conditions:'standard'},ts);d.completeAssessment(s,{pain_after:0,perceived_fatigue:'easy',instability:false,swelling:false},ts);}
          if(name==='return_feedback'){const ex=d.EXMAP.bilateral_tiptoe_static,dose={...ex.dose,reps:3};d.recordExercise(ex.id,dose,{...comfortable,phase:'after',doseReason:'recovery'},ts-d.DAY,dose);}
          if(name==='return_minor')d.recordSymptoms({pain:1,response:'worse',steadiness:'steady',fatigue:'low'},'combined',ts-1);
          if(name==='return_fatigue'){
            d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(ts-d.DAY),response:'worse',historyKnown:true,historyWorse:false,pain:1,fatigue:'low',steadiness:'steady'},'combined',ts-2);
            const s=d.recordTest('knee_to_wall',{left:16,right:11,conditions:'standard'},ts);d.completeAssessment(s,{pain_after:0,perceived_fatigue:'strong',instability:false,swelling:false},ts);
          }
          d.renderAll();return;
        }
        if(name==='stage_check'||name==='impact_ladder'){
          const morning=l=>{const at=new Date(d.startOfDay(l.ts));at.setDate(at.getDate()+1);at.setHours(8,0,0,0);d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(l.ts),response:'same',historyKnown:true,historyWorse:false,pain:0,fatigue:'low',steadiness:'steady'},'combined',+at);};
          for(const age of [18,16,14]){
            let last;
            for(const id of ['bilateral_tiptoe_static','tandem_walk_tiptoe','right_leg_balance_left_front_back','single_leg_calf_raise']){
              const ex=d.EXMAP[id],dose={...ex.dose,...(id==='bilateral_tiptoe_static'?{reps:10}:id==='right_leg_balance_left_front_back'?{support:'none'}:id==='single_leg_calf_raise'?{sets:2,reps:10}:{})};
              for(let i=0;i<(id==='tandem_walk_tiptoe'?3:1);i++)last=d.recordExercise(id,dose,{...comfortable,difficulty:'easy'},ts-age*d.DAY+i*3*3600000,dose);
            }
            d.finishAdditionalPlan(ts-age*d.DAY+1);morning(last);
          }
          if(name==='impact_ladder'){
            d.recordImpactCheck({gait:true,mobility:true,dynamic:true,strength:true,willing:true},'self',ts-13*d.DAY);state.selectedStage='ready_for_impact';
            const ex=d.EXMAP.hop_to_stabilization;
            for(const age of [8,6,4]){const l=d.recordExercise(ex.id,{...ex.dose,reps:5},comfortable,ts-age*d.DAY);d.finishAdditionalPlan(ts-age*d.DAY+1);morning(l);}
            for(const id of Object.keys(state.exerciseStatuses))state.exerciseStatuses[id]='archived';state.exerciseStatuses.hop_to_stabilization='active';state.exerciseStatuses.bilateral_pogo='available';state.dailyPlans={};
          }
          for(const t of d.RDCFG.tests)state.postponedActions['test:'+t.id]=ts+d.DAY;
          morning({ts:ts-2*d.DAY});d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',ts-1);d.renderAll();return;
        }
        if(name==='notice_static'||name==='notice_toes'){
          state.logs=[];state.symptomReports=[];state.dailyPlans={};state.decisionLog=[];
          for(const id of Object.keys(state.exerciseStatuses))state.exerciseStatuses[id]='archived';
          const base=d.EXMAP[name==='notice_static'?'bilateral_tiptoe_static':'tandem_walk_flat'],dose={...base.dose,...(name==='notice_static'?{reps:5}:{})};
          state.exerciseStatuses[base.id]='active';if(name==='notice_toes')state.exerciseStatuses.tandem_walk_tiptoe='active';
          const normalMorning=l=>{const m=new Date(d.startOfDay(l.ts));m.setDate(m.getDate()+1);m.setHours(8,0,0,0);d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(l.ts),response:'same',historyKnown:true,historyWorse:false,pain:0,fatigue:'low',steadiness:'steady'},'combined',+m);};
          if(name==='notice_toes'){const l=d.recordExercise('tandem_walk_tiptoe',d.EXMAP.tandem_walk_tiptoe.dose,comfortable,ts-20*d.DAY,d.EXMAP.tandem_walk_tiptoe.dose);normalMorning(l);}
          for(const age of [12,11,10])normalMorning(d.recordExercise(base.id,dose,{...comfortable,difficulty:'easy'},ts-age*d.DAY,dose));
          for(const age of [7,6,5,4,3,2,1]){let l;for(let i=0;i<3;i++){l={id:'notice_week_'+age+'_'+i,exerciseId:base.id,ts:d.startOfDay(ts-age*d.DAY)+(4+4*i)*3600000,...comfortable};state.logs.push(l);}normalMorning(l);}
          for(const t of d.RDCFG.tests)state.postponedActions['test:'+t.id]=ts+d.DAY;
          d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low'},'combined',ts-1);d.renderAll();return;
        }
        for(const t of d.RDCFG.tests)state.postponedActions['test:'+t.id]=ts+d.DAY;
        d.recordSymptoms({pain:0,steadiness:'steady',fatigue:'low',response:'same'},'combined',ts-1);
        const home=['towel_stretch_straight_knee','towel_stretch_bent_knee','bilateral_tiptoe_static','tandem_walk_flat','right_leg_balance_left_front_back','left_side_lunge_right_leg_straight'];
        if(name==='rest'||name==='completed')for(const hour of name==='rest'?[18]:[6,10,14,18])for(const id of home){const at=new Date(ts);at.setHours(hour,0,0,0);d.recordExercise(id,d.EXMAP[id].dose,comfortable,+at,d.EXMAP[id].dose);}
        if(name==='rest'||name==='completed'){
          const plan=d.autoAdditionalPlan(ts);for(const id of Object.keys(plan.targets))d.recordExercise(id,plan.targets[id],comfortable,ts,plan.targets[id]);
        }
        if(name==='measured'){const s=d.recordTest('knee_to_wall',{left:10,right:9,conditions:'standard'},ts);d.completeAssessment(s,{pain_after:0,perceived_fatigue:'easy',instability:false,swelling:false},ts);}
        if(name==='recovery'){const yesterday=ts-d.DAY;d.recordExercise('tandem_walk_flat',d.EXMAP.tandem_walk_flat.dose,comfortable,yesterday);state.symptomReports=[];}
        if(name==='progress'){
          const ex=d.EXMAP.bilateral_tiptoe_static,dose={...ex.dose,reps:5};
          for(const age of [4,3,2]){
            const at=ts-age*d.DAY;
            d.recordExercise(ex.id,dose,{...comfortable,difficulty:'easy',technique:'ok'},at,dose);
            const good=d.recordExercise(ex.id,dose,{...comfortable,difficulty:'easy'},at+6*3600000,dose),morning=new Date(d.startOfDay(good.ts));morning.setDate(morning.getDate()+1);morning.setHours(8,0,0,0);
            d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(good.ts),response:'same',historyKnown:true,historyWorse:false,pain:0,fatigue:'low',steadiness:'steady'},'combined',+morning);
          }
          d.recordExercise(ex.id,dose,{...comfortable,difficulty:'easy'},ts-3600000,dose);
        }
        if(name==='line'||name==='balance'){
          for(const age of [7,6,5,4,3])for(const id of home)for(let i=0;i<3;i++)state.logs.push({id:'prescribed_'+age+'_'+id+'_'+i,exerciseId:id,ts:d.startOfDay(ts-age*d.DAY)+(4+i*4)*3600000,...comfortable});
          const ex=d.EXMAP[name==='line'?'tandem_walk_flat':'right_leg_balance_left_front_back'],dose={...ex.dose,...(name==='balance'?{support:'light'}:{})};
          if(name==='balance'){const bad=d.recordExercise(ex.id,{...ex.dose,support:'usual'},{...comfortable,technique:'poor'},ts-8*d.DAY,ex.dose),m=new Date(d.startOfDay(bad.ts));m.setDate(m.getDate()+1);m.setHours(8,0,0,0);d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(bad.ts),response:'same',historyKnown:true,historyWorse:false,pain:0,fatigue:'low',steadiness:'steady'},'combined',+m);}
          for(const age of [4,3,2]){
            const l=d.recordExercise(ex.id,dose,{...comfortable,difficulty:'easy'},ts-age*d.DAY,dose),m=new Date(d.startOfDay(l.ts));m.setDate(m.getDate()+1);m.setHours(8,0,0,0);
            d.recordSymptoms({phase:'morning',trainingDay:d.startOfDay(l.ts),response:'same',historyKnown:true,historyWorse:false,pain:0,fatigue:'low',steadiness:'steady'},'combined',+m);
          }
          d.recordExercise(ex.id,dose,{...comfortable,difficulty:'easy'},ts-4*3600000,dose);
        }
        if(name==='game')state.stageProgress.rehab={enteredAt:ts-d.DAY,criteria:d.stageTransition('ready_for_impact').checks.filter(c=>!['goal_static','goal_toes','goal_balance','calf_endurance'].includes(c.id)).map(c=>({id:c.id,label:c.label,kind:'criterion',baseline:1,target:1,peak:1})),goals:[{id:'static',label:'Статика',exerciseId:'bilateral_tiptoe_static',kind:'reps',baseline:5,target:10,peak:10},{id:'toes',label:'Линия',exerciseId:'tandem_walk_flat',kind:'steps',baseline:10,target:20,peak:20},{id:'balance',label:'Баланс',exerciseId:'right_leg_balance_left_front_back',kind:'cycles',baseline:5,target:10,peak:7},{id:'calf',label:'Сила',exerciseId:'single_leg_calf_raise',kind:'reps',baseline:3,target:5,peak:3}]};
        d.renderAll();
      },name);
      await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' horizontal overflow');
      assert.deepEqual(errors,[],name+' runtime errors');
      const best=await page.locator('#bestNow').innerText();
      if(name.startsWith('return_')){
        const actual=await page.evaluate(()=>({returns:qa.homeReturns().map(r=>({id:r.ex.id,dose:r.dose,goal:r.goal,days:r.days})),step:qa.selectedProgramUpgrade(),counts:qa.planCounts(),extra:qa.autoAdditionalPlan(),feedback:qa.feedbackRecommendation()}));
        assert.equal(actual.returns.length,6);assert.equal(actual.returns.find(r=>r.id==='bilateral_tiptoe_static').goal.reps,5);
        if(name==='return_before')assert.equal(actual.step.kind,'return');
        if(name==='return_rest')assert.equal(actual.step.performed,true);
        if(name==='return_completed'){assert.ok(Object.values(actual.counts).every(n=>n>=3));assert.match(await page.locator('#bestNow').innerText(),/достаточно|выполнен|утр/i);}
        if(name==='return_feedback'||name==='return_backup')assert.equal(actual.feedback.mode,'morning');
        if(name==='return_minor'){assert.equal(actual.step,null);assert.equal(actual.returns.find(r=>r.id==='bilateral_tiptoe_static').dose.reps,3);}
        if(name==='return_fatigue'){assert.equal(actual.step,null);assert.equal(await page.evaluate(()=>qa.recommendedDose(qa.EXMAP.bilateral_tiptoe_static).dose.reps),2);assert.equal(actual.returns.find(r=>r.id==='bilateral_tiptoe_static').dose.reps,3);}
        if(name==='return_backup'){assert.equal(actual.extra.status,'waiting');assert.equal(actual.returns.find(r=>r.id==='towel_stretch_straight_knee').dose.target_sec,50);}
        await page.evaluate(()=>AM.openExercise('towel_stretch_straight_knee'));await page.getByRole('tab',{name:'Прогресс',exact:true}).click();
        assert.match(await page.locator('#exercise-panel-progress').innerText(),/Возврат прежнего объёма/);assert.match(await page.locator('#exercise-panel-progress').innerText(),/60/);
        await page.screenshot({path:path.join(output,name+'-progress.png')});await page.evaluate(()=>AM.close('exerciseDialog'));
        await page.evaluate(()=>AM.openLog('bilateral_tiptoe_static'));assert.match(await page.locator('#logModal').innerText(),/Возврат прежнего объёма/);
        await page.screenshot({path:path.join(output,name+'-form.png')});assert.deepEqual(errors,[],name+' return flow errors');
        await context.close();process.stdout.write(name+': return goals, next action and forms checked at 390×844\n');continue;
      }
      if(['before','rest','completed','measured','recovery','backup'].includes(name)){
        await page.locator('#readinessRing').click();assert.equal(await page.locator('#readinessDetails').getAttribute('open')!==null,true);
        assert.equal(await page.locator('#readinessChecks li').count(),12);const count=(await page.locator('#readinessValue').innerText()).split('/')[0];assert.equal(await page.locator('#readinessChecks .passed').count(),Number(count));
        await page.evaluate(()=>qa.renderAll());assert.equal(await page.locator('#readinessDetails').getAttribute('open')!==null,true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' expanded checklist overflow');
        await page.locator('#readinessDetails').screenshot({path:path.join(output,name+'-conditions.png')});await page.locator('#readinessRing').click();
      }

      if(name==='stage_check'){
        assert.ok(parseInt(await page.locator('#masteryValue').innerText())<100);assert.equal(await page.locator('#readinessValue').innerText(),'7/12');assert.match(best,/Проверить движения/);
        await page.locator('#masteryHint summary').click();assert.match(await page.locator('#masteryHint').innerText(),/2×10 на каждую ногу/);await page.screenshot({path:path.join(output,'stage-goals.png'),fullPage:true});
        await page.evaluate(()=>AM.openImpactCheck());assert.equal(await page.locator('#impact_gait').inputValue(),'');await page.screenshot({path:path.join(output,'stage-check-unknown.png')});
        for(const id of ['gait','mobility','strength','willing'])await page.locator('#impact_'+id).selectOption('yes');
        await page.getByRole('button',{name:'Сохранить проверку',exact:true}).click();await page.reload();assert.match(await page.locator('#bestNow').innerText(),/Закончить проверку/);
        await page.evaluate(()=>AM.openImpactCheck());assert.equal(await page.locator('#impact_gait').inputValue(),'yes');assert.equal(await page.locator('#impact_dynamic').inputValue(),'');await page.locator('#impact_dynamic').selectOption('yes');
        await page.getByRole('button',{name:'Сохранить проверку',exact:true}).click();assert.equal(await page.locator('#readinessValue').innerText(),'12/12');
        await page.screenshot({path:path.join(output,'stage-check-ready.png'),fullPage:true});assert.deepEqual(errors,[]);await context.close();process.stdout.write('stage_check: unknown, partial/reload, stable prefills and completed check verified\n');continue;
      }
      if(name==='impact_ladder'){
        const status=await page.evaluate(()=>({active:qa.getState().exerciseStatuses.bilateral_pogo,locked:qa.RDCFG.tests.filter(t=>t.unlock_stage).map(t=>qa.testAvailable(t))}));assert.equal(status.active,'active');assert.deepEqual(status.locked,[false,false,false]);assert.match(best,/Низкие упругие прыжки двумя ногами/);
        await page.evaluate(()=>AM.openExercise('bilateral_pogo'));await page.getByRole('tab',{name:'Прогресс',exact:true}).click();await page.screenshot({path:path.join(output,'pogo-progress.png')});await page.evaluate(()=>AM.close('exerciseDialog'));
        await page.evaluate(()=>AM.openLog('bilateral_pogo'));assert.equal(await page.locator('#dose_reps').inputValue(),'5');assert.equal(await page.locator('#dose_sets').inputValue(),'2');assert.match(await page.locator('#logDialog').getAttribute('class'),/load-change/);await page.screenshot({path:path.join(output,'pogo-new-form.png')});assert.deepEqual(errors,[]);await context.close();process.stdout.write('impact_ladder: automatic 2x5 pogo practice and locked maximum tests verified\n');continue;
      }
      if(name==='game')assert.equal(await page.locator('#masteryValue').innerText(),'60%');
      if(name==='backup'){const actual=await page.evaluate(()=>({score:qa.stagePreparationProgress().score,goals:qa.stageGameProgress().goals,toes:qa.recommendedDose(qa.EXMAP.tandem_walk_tiptoe).working.target_steps,calf:qa.EXMAP.single_leg_calf_raise.dose,flatTrial:qa.recommendedDose(qa.EXMAP.tandem_walk_flat).trial,staticTrial:qa.recommendedDose(qa.EXMAP.bilateral_tiptoe_static).trial,regularity:qa.progressionAdherence().score}));assert.ok(actual.score>0);assert.equal(actual.goals.find(g=>g.id==='toes').progress,.25);assert.equal(actual.toes,12);assert.equal(actual.calf.reps,5);assert.equal(actual.calf.sets,2);assert.equal(actual.flatTrial,null);assert.equal(actual.goals.find(g=>g.id==='static').baseline,5);assert.equal(actual.goals.find(g=>g.id==='calf').baseline,null);assert.equal(actual.goals.find(g=>g.id==='calf').target,20);if(process.env.ANKLE_QA_BACKUP.includes('2026-10-18')){assert.equal(actual.staticTrial.reps,6);assert.equal(actual.regularity,18/21);}await page.locator('#masteryHint summary').click();await page.screenshot({path:path.join(output,'backup-stage-goals.png'),fullPage:true});await context.close();process.stdout.write('backup: checked isolated copy, confirmed baselines and preserved 6x5 trial at 390×844\n');continue;}
      if(name==='notice_static'||name==='notice_toes'){
        assert.match(await page.locator('#bestNow').getAttribute('class'),/load-change/);
        assert.match(best,/Изменение · 1\/5/);
        const base=name==='notice_static'?'bilateral_tiptoe_static':'tandem_walk_flat',id=name==='notice_static'?base:'tandem_walk_tiptoe';
        if(name==='notice_static')assert.match(best,/5 × 5 сек → 6 × 5 сек/);else assert.match(best,/пятка-к-носку → Ходьба по линии на носках/);
        await page.screenshot({path:path.join(output,name+'-recommendation.png')});
        await page.evaluate(id=>AM.openExercise(id),base);assert.match(await page.locator('#exerciseDialog').getAttribute('class'),/load-change/);assert.match(await page.locator('#exerciseModal').innerText(),/Изменение · 1\/5/);
        await page.locator('#exerciseModal img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));await page.screenshot({path:path.join(output,name+'-card.png')});
        await page.evaluate(()=>AM.close('exerciseDialog'));await page.evaluate(id=>AM.openLog(id),id);assert.match(await page.locator('#logDialog').getAttribute('class'),/load-change/);assert.match(await page.locator('#logModal').innerText(),/Изменение · 1\/5/);
        assert.equal(await page.locator(name==='notice_static'?'#dose_reps':'#dose_target_steps').inputValue(),name==='notice_static'?'6':'12');
        await page.screenshot({path:path.join(output,name+'-form.png')});
        for(const [field,value] of [['difficultySel','easy'],['techSel','good'],['logSteadiness','steady'],['fatigueSel','low']])await page.locator('label:has(input[name="'+field+'"][value="'+value+'"])').click();
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.reload();await page.evaluate(()=>{const day=Date.now(),next=day+qa.DAY;qa.recordSymptoms({phase:'morning',trainingDay:qa.startOfDay(day),response:'same',historyKnown:true,historyWorse:false,pain:0,fatigue:'low',steadiness:'steady'},'combined',next-10*3600000);Date.now=()=>next;qa.renderAll();});await page.evaluate(id=>AM.openLog(id),id);assert.match(await page.locator('#logModal').innerText(),/Изменение · 2\/5/);
        assert.deepEqual(errors,[],name+' saved notice errors');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await context.close();process.stdout.write(name+': turquoise, actual fields and reminder after reload checked\n');continue;
      }
      if(name==='rest')assert.match(best,/Перерыв/);
      if(name==='completed')assert.match(best,/достаточно|выполнен|закончено/i);
      if(name==='recovery')assert.match(best,/восстановление после вчерашней/);
      if(name==='progress'){
        await page.evaluate(()=>AM.openExercise('bilateral_tiptoe_static'));await page.getByRole('tab',{name:'Прогресс',exact:true}).click();
        assert.match(await page.locator('#exercise-panel-progress').innerText(),/реакцией утром: 3\/3/);
        await page.screenshot({path:path.join(output,'progress.png'),fullPage:true});await page.evaluate(()=>AM.close('exerciseDialog'));
      }
      if(name==='line'||name==='balance'){
        const id=name==='line'?'tandem_walk_flat':'right_leg_balance_left_front_back';
        await page.evaluate(id=>AM.openExercise(id),id);await page.getByRole('tab',{name:'Прогресс',exact:true}).click();
        const panel=await page.locator('#exercise-panel-progress').innerText();
        if(name==='line'){assert.match(panel,/Выбрано приложением: Ходьба по линии на носках · 12 шагов/);assert.doesNotMatch(panel,/Пробный шаг: 17|Проверить следующий вариант/);}
        else assert.match(panel,/Пробный шаг: 3 цикла · Без помощи/);
        await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
        await page.getByRole('button',{name:name==='line'?'Записать выбранную пробу на носках':'Записать пробный шаг',exact:true}).click();
        if(name==='line')assert.equal(await page.locator('#dose_target_steps').inputValue(),'12');
        else assert.equal(await page.locator('input[name="doseOption"][value="none"]').isChecked(),true);
        for(const [field,value] of [['difficultySel','easy'],['techSel','good'],['logSteadiness','steady'],['fatigueSel','low']])await page.locator('label:has(input[name="'+field+'"][value="'+value+'"])').click();
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        const actual=await page.evaluate(()=>qa.getState().logs.at(-1));assert.equal(actual.doseReason,'trial');
        if(name==='line'){assert.equal(actual.exerciseId,'tandem_walk_tiptoe');assert.equal(actual.actualDose.target_steps,12);assert.equal(actual.transitionFrom,'tandem_walk_flat');}
        else {assert.equal(actual.exerciseId,id);assert.equal(actual.actualDose.support,'none');assert.equal(actual.actualDose.cycles,3);}
        await page.reload();
        const proposed=await page.evaluate(id=>qa.recommendedDose(qa.EXMAP[id]),actual.exerciseId);assert.equal(proposed.trial,null);
        if(name==='line')assert.equal(proposed.dose.target_steps,12);else {assert.equal(proposed.working.support,'light');assert.equal(proposed.dose.support,'light');assert.equal(await page.evaluate(id=>qa.exerciseProgress(qa.EXMAP[id]).candidate.support,actual.exerciseId),'none');}
        assert.deepEqual(errors,[],name+' selected trial and reload errors');
      }
      // The browser, real input controls, saved choices and open/close flow also work.
      await page.evaluate(()=>AM.openExercise('bilateral_calf_raise'));
      assert.equal(await page.locator('#exerciseDialog').getAttribute('open')!==null,true);
      await page.evaluate(()=>AM.close('exerciseDialog'));
      await page.evaluate(()=>AM.openRun('run_walk'));
      assert.equal(await page.locator('#run_runMinutes').inputValue(),'4');
      await page.getByRole('button',{name:'Сохранить пробежку',exact:true}).click();
      assert.equal(await page.evaluate(()=>qa.getState().customActivities.at(-1).running.runMinutes),4);
      await page.evaluate(()=>AM.openRunningPlan());
      assert.equal(await page.locator('#targetMinutes').inputValue(),'');
      await page.locator('#targetMinutes').fill('12');await page.locator('#sessionsPerWeek').fill('3');await page.locator('#weekMinutes').fill('30');await page.locator('#runPermitted').check();
      await page.getByRole('button',{name:'Сохранить',exact:true}).click();
      assert.equal(await page.evaluate(()=>qa.getState().settings.runningPlan.weekMinutes),30);
      await page.reload();assert.equal(await page.evaluate(()=>qa.getState().customActivities.at(-1).running.runMinutes),4);
      assert.equal(await page.evaluate(()=>qa.getState().settings.runningPlan.targetMinutes),12);
      if(name==='progress'){
        await page.evaluate(()=>AM.openExercise('bilateral_tiptoe_static'));await page.getByRole('tab',{name:'Прогресс',exact:true}).click();
        assert.match(await page.locator('#exercise-panel-progress').innerText(),/реакцией утром: 3\/3/);
      }
      assert.deepEqual(errors,[],name+' form and reload errors');
      await context.close();
      process.stdout.write(name+': checked at 390×844\n');
    }
    process.stdout.write('Browser: '+browser.version()+'; screenshots: '+output+'\n');
  }finally{await browser.close();}
})().catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
