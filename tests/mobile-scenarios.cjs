// Isolated synthetic browser checks. Run with NODE_PATH pointing at Playwright.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=process.env.ANKLE_QA_OUTPUT||'/tmp/ankle-mobile-qa';
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hook=source.replace('\nrenderAll();\nsetInterval(renderHome,15*60*1000);',`\nwindow.qa={stageGameProgress,defaultState,recordExercise,recordTest,recordSymptoms,completeAssessment,autoAdditionalPlan,renderAll,startAdditionalPlan,recommendedDose,exerciseProgress,EXMAP,RDCFG,startOfDay,DAY,getState:()=>state};\nrenderAll();\nsetInterval(renderHome,15*60*1000);`);
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const cases=['before','rest','completed','measured','recovery','progress','line','balance','game',...(process.env.ANKLE_QA_BACKUP?['backup']:[])];
    for(const name of cases){
      const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,timezoneId:'Asia/Ho_Chi_Minh',locale:'ru-RU'});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{const RealDate=Date,clock=new RealDate('2026-10-17T18:00:00+07:00').getTime();window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};});
      await page.route('http://ankle.test/**',async route=>{
        const pathname=new URL(route.request().url()).pathname;
        if(pathname==='/')return route.fulfill({body:hook,contentType:'text/html'});
        const file=path.join(root,pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
        return route.fulfill({body:fs.readFileSync(file),contentType:'image/webp'});
      });
      if(name==='backup'){const backup=JSON.parse(fs.readFileSync(process.env.ANKLE_QA_BACKUP,'utf8'));await page.addInitScript(data=>{if(!localStorage.getItem('ankle_mastery_static_v2'))localStorage.setItem('ankle_mastery_static_v2',JSON.stringify(data));},backup);}
      await page.goto('http://ankle.test/');
      await page.evaluate(name=>{
        const d=window.qa,state=d.getState(),ts=Date.now(),comfortable={painDuring:0,painAfter:0,fatigue:'low',technique:'good',steadiness:'steady',difficulty:'normal',symptomScope:'combined'};
        if(name==='backup'){d.renderAll();return;}
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
        if(name==='game')state.stageProgress.rehab={enteredAt:ts-d.DAY,goals:[{id:'a',label:'Статика',exerciseId:'bilateral_tiptoe_static',kind:'reps',baseline:5,target:10,peak:10},{id:'b',label:'Линия',exerciseId:'tandem_walk_flat',kind:'steps',baseline:10,target:20,peak:20},{id:'c',label:'Баланс',exerciseId:'right_leg_balance_left_front_back',kind:'cycles',baseline:5,target:10,peak:7},{id:'d',label:'Сила',exerciseId:'single_leg_calf_raise',kind:'reps',baseline:3,target:5,peak:3}]};
        d.renderAll();
      },name);
      await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' horizontal overflow');
      assert.deepEqual(errors,[],name+' runtime errors');
      const best=await page.locator('#bestNow').innerText();
      if(name==='game')assert.equal(await page.locator('#masteryValue').innerText(),'60%');
      if(name==='backup'){const actual=await page.evaluate(()=>({toes:qa.recommendedDose(qa.EXMAP.tandem_walk_tiptoe).working.target_steps,calf:qa.EXMAP.single_leg_calf_raise.dose,flatTrial:qa.recommendedDose(qa.EXMAP.tandem_walk_flat).trial}));assert.equal(actual.toes,12);assert.equal(actual.calf.reps,5);assert.equal(actual.calf.sets,2);assert.equal(actual.flatTrial,null);await context.close();process.stdout.write('backup: checked isolated copy at 390×844\n');continue;}
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
