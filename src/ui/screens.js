'use strict';

function openAdditionalPlan(){
  const plan=autoAdditionalPlan(),entries=plan.status==='ready'?Object.entries(plan.targets).map(([id,dose])=>({ex:EXMAP[id],dose,reason:plan.reasons[id]})):additionalPlanEntries().map(entry=>({...entry,targetDose:state.additionalPlan.targets[entry.ex.id]}));
  document.getElementById('additionalPlanModal').innerHTML=`<div class="modal-head"><h3>Дополнительное занятие</h3><button class="x" onclick="AM.close('additionalPlanDialog')">×</button></div><p>${esc(plan.reason)}</p>${entries.map(entry=>`<div class="notice" style="margin-top:10px"><b>${esc(entry.ex.name)}</b><div>${esc(doseText(entry.ex,entry.dose||entry.targetDose))}</div><div class="li-meta">${esc(entry.reason)}</div></div>`).join('')}<div class="notice" style="margin-top:12px">Состав подбирает приложение. Ритм — до 3 занятий за 7 дней с днём между ними, до 3 разных направлений. Это исходная программа приложения; частота дома врачом не уточнялась.</div>${plan.status==='ongoing'?'<div class="modal-actions"><button class="btn secondary" onclick="AM.closeAdditionalPlan()">Закончить с выполненным объёмом</button></div>':''}`;
  showDialog('additionalPlanDialog');
}
function closeAdditionalPlan(){finishAdditionalPlan();closeDialog('additionalPlanDialog');save();toast('Занятие закончено. Наверстывать остаток не нужно');}
function renderAdditionalPlan(){
  const wrap=document.getElementById('additionalPlanWrap'),plan=autoAdditionalPlan();
  if(plan.status==='unavailable'&&!state.additionalPlan){wrap.innerHTML='';return;}
  const count=Object.keys(plan.targets).length;
  const title=plan.status==='ready'?'Подобрано дополнительное занятие · '+count+' '+countWord(count,'упражнение','упражнения','упражнений'):plan.status==='ongoing'?'Состав и завершение дополнительного занятия':state.additionalPlan?'Состав прошлого занятия':'Ритм дополнительных занятий';
  const next=plan.status==='ready'?newExerciseSuggestion():null;
  wrap.innerHTML=`<details class="notice"><summary>${esc(title)}</summary><div class="li-meta">${esc(plan.reason)}</div><button class="btn ghost" style="margin-top:8px" onclick="AM.openAdditionalPlan()">Состав и основания</button>${next?`<div class="li-meta">Следующая отдельная проба: ${esc(next.name)} · ${esc(doseText(next))}. Если эта нагрузка тебе уже разрешена, добавь её один раз.</div><button class="btn secondary" onclick="AM.activateExercise('${next.id}')">Нагрузка разрешена — добавить пробу</button>`:''}</details>`;
}
function toast(msg){ const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200); }
let dialogScrollY=null;
function restorePageScroll(){
  if(dialogScrollY==null||document.querySelector('dialog[open]'))return;
  const y=dialogScrollY;dialogScrollY=null;
  document.body.classList.remove('modal-open');document.body.style.top='';
  window.scrollTo({top:y,left:0,behavior:'instant'});
}
function showDialog(id){
  if(dialogScrollY==null){
    dialogScrollY=window.scrollY;
    document.body.style.top=`-${dialogScrollY}px`;document.body.classList.add('modal-open');
  }
  document.getElementById(id).showModal();
}
function closeDialog(id){
  const dialog=document.getElementById(id);
  dialog.querySelector(':focus')?.blur();
  dialog.close();restorePageScroll();
}
function noRecommendationHTML(ts=now()){
  const active=activeExercises(),scored=active.filter(ex=>!postponedUntil('exercise',ex.id,ts)).map(ex=>({ex,...scoreExercise(ex,ts)}));
  const waiting=scored.filter(r=>r.score<0&&r.reasons.some(reason=>reason==='отдых после предыдущего выполнения'||reason.startsWith('Перерыв после похожего теста'))).map(r=>({...r,until:Math.max(exerciseRestUntil(r.ex,ts),exerciseAfterTestUntil(r.ex,ts))}));
  const loadPlans=scored.map(r=>dailyLoadPlan(r.ex,ts));
  const pauses=[...new Set(loadPlans.filter(plan=>plan.status==='pause').map(plan=>plan.reason))];
  const current=currentSymptoms(ts),adverse=current&&(responseLevel(current)!=='normal'||current.fatigue==='high'||current.generalFatigue==='high');
  const plan=dailyPlan(ts),counts=planCounts(ts),groups=Object.keys(plan.targets);
  const complete=groups.length&&groups.every(g=>counts[g]>=dailyTarget(EX.find(ex=>ex.prescription_credit?.group===g),ts));
  const rangeComplete=complete&&groups.every(g=>prescriptionCounts(ts)[g]>=APP.program.prescription_groups[g]?.max_per_day);
  const additional=autoAdditionalPlan(ts),sessionEnded=complete&&additional.status==='waiting'&&state.additionalPlan?.endedReason;
  if(!scored.length&&!adverse&&Object.values(state.postponedActions).some(until=>until>ts))return '<div class="empty">Сейчас нет рекомендаций. Есть отложенные действия — их можно вернуть ниже.</div>';
  const reasons=[];
  if(complete&&additional.status==='waiting')reasons.push(additional.reason);
  if(current&&!adverse)reasons.push(`Последняя отметка: ${steadinessNames[current.steadiness].toLowerCase()}, боль ${current.pain}/10. Перерывы и уже выполненная нагрузка продолжают учитываться.`);
  if(adverse)reasons.push(`Последняя отметка: ${steadinessNames[current.steadiness].toLowerCase()}, боль ${current.pain}/10${current.fatigue==='high'?', сильная усталость':''}${current.generalFatigue==='high'?', сильная общая усталость':''}${current.swelling?', отёк':''}. Тесты ждут нормальной реакции.`);
  const functional=impactCheckStatus(ts);
  if(currentStage().order>0&&functional.check&&!functional.ready)reasons.push(functional.invalidated?'После нового подворачивания обнови проверку движений перед ударной работой.':IMPACT_CHECK_FIELDS.filter(([id])=>functional.check.answers?.[id]!==true).map(([,label])=>'Проверка движений: '+label+' — пункт пока не закрыт').join(' · '));
  reasons.push(...pauses);
  if(rangeComplete)reasons.push('Назначенный диапазон 3–4 выполнен. Дальнейшие выполнения можно записать через каталог.');
  if(!waiting.length&&!pauses.length)reasons.push(...[...new Set(scored.filter(r=>r.score<0||r.status==='red').map(r=>r.reasons[0]))].slice(0,2));
  if(waiting.length){
    reasons.push(...waiting.slice(0,2).map(r=>{
      return `${r.ex.name}: ${r.reasons[0]==='отдых после предыдущего выполнения'?'перерыв между выполнениями':'перерыв после похожего теста'} — не раньше ${fmtTime(r.until)}${startOfDay(r.until,0)!==startOfDay(ts,0)?' '+fmtDate(r.until):''}.`;
    }));
    reasons.push('После перерыва предложение зависит от самочувствия и общей нагрузки.');
  }
  if(!reasons.length)reasons.push(active.length?'Сейчас нет подходящих действий. Отдохни и отметь реакцию после нагрузки.':'Добавь доступное упражнение в программу через каталог.');
  const next=waiting.sort((a,b)=>a.until-b.until)[0];
  const summary=pauses[0]||(adverse?reasons.find(r=>r.startsWith('Последняя отметка')):complete&&additional.status==='waiting'&&(!waiting.length||sessionEnded)?additional.reason:waiting.length?'Выдерживаем перерыв между выполнениями.':scored.find(r=>r.score<0||r.status==='red')?.reasons[0]||reasons[0]);
  const title=!active.length?'Нет активных упражнений':adverse||loadPlans.some(plan=>plan.status==='pause'&&!plan.needsFeedback)?'Сейчас восстановление':pauses.length?'Нужна оценка самочувствия':sessionEnded?'Дополнительное занятие закончено':waiting.length?'Перерыв между выполнениями':'Сейчас дополнительных рекомендаций нет';
  return `<span class="best-label">${complete?'План дня выполнен':'Пауза в плане'}</span><div class="rec-name">${title}</div><div class="reason">${esc(summary)}</div>${next?`<div class="next-window"><span>Ближайший повтор — не раньше</span><strong>${fmtTime(next.until)}${startOfDay(next.until,0)!==startOfDay(ts,0)?' '+fmtDate(next.until):''}</strong><div class="li-meta">${esc(next.ex.name)}</div></div>`:''}${adverse||pauses.length?'<div class="rec-actions"><button class="btn secondary" onclick="AM.openSymptoms()">Отметить самочувствие</button></div>':''}<details class="recommend-details"><summary>Подробнее</summary>${reasons.map(r=>`<div class="reason">${esc(r)}</div>`).join('')}</details>`;
}

let dayBoundaryTimer=null;
function renderHome(){
  return withHistoryCache(()=>{
  rememberProgramUpgrade();
  const dayKey=String(startOfDay());
  if(!state.dailyPlans[dayKey]){ensureDailyPlan();localStorage.setItem(KEY,JSON.stringify(state));}
  document.getElementById('todayLabel').textContent=new Date(startOfDay()).toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
  clearTimeout(dayBoundaryTimer);dayBoundaryTimer=setTimeout(renderAll,nextDayStart(now())-now());
  const game=stagePreparationProgress();
  setRing('masteryRing','masteryValue',game.score);
  document.getElementById('masteryHint').innerHTML=`От начала этапа до подтверждённой подготовки${game.unknown?' · часть исходных данных уточняется':''}<details><summary>Цели этапа и расчёт процента</summary>${game.goals.map(g=>{
    const fraction=g.progress==null?(g.baseline!=null&&g.target!=null&&g.baseline>=g.target?'было освоено на входе':'исходный уровень уточняется'):pct(g.progress)+'% нового пути';
    if(g.kind==='criterion')return `<div class="li-meta">${esc(g.label)}: ${g.current?'подтверждено':'ещё не подтверждено'} · ${fraction}</div>`;
    if(g.kind==='line_path')return `<div class="li-meta"><b>${esc(g.label)} · ${fraction}</b><div>Начало: ${g.baseline==null?'уточняется':g.baseline===0?'практика обычной линии':esc(LINE_WALK_STEPS[g.baseline-1])}</div>${LINE_WALK_STEPS.map((label,i)=>`<div>${g.current>=i+1?'✓':'○'} ${esc(label)}</div>`).join('')}</div>`;
    return `<div class="li-meta">${esc(g.label)}: начало ${g.baseline??'уточняется'} → освоено ${Math.round(g.current*10)/10} → цель ${g.target??'уточняется'} · ${fraction}</div>`;
  }).join('')}<p>Среднее долей нового пути: упражнения и остальные подтверждения для перехода, без повторного учёта одной задачи. Уже известное на входе не добавляет новый прогресс. Это сохранённый путь подготовки; актуальные условия показаны ниже и могут временно закрыть переход.</p>${game.revisionReason?`<p>${esc(game.revisionReason)} Прежний набор сохранён в истории резервной копии.</p>`:''}</details>`;
  const stage=currentStage(); document.getElementById('stageName').textContent=stage.name;
  const {nextStage,transition}=game;
  const endpoint=!nextStage&&transition.checks.every(c=>c.passed);
  setRing('readinessRing','readinessValue',transition.score);
  document.getElementById('readinessValue').textContent=transition.checks.filter(c=>c.passed).length+'/'+transition.checks.length;
  if(endpoint)document.getElementById('readinessValue').textContent='✓';
  document.getElementById('readinessHint').textContent=endpoint?'Условия моего бегового плана выполнены':`${transition.checks.filter(c=>c.passed).length}/${transition.checks.length} условий выполнено · ${nextStage?'далее: '+transition.target.name:'проверка текущего этапа'}`;
  document.getElementById('readinessChecks').innerHTML=`<p class="li-meta">Условия сейчас. Здесь видно, что выполнено и что мешает перейти; сохранённый процент подготовки может быть выше.</p><ul class="progress-checks">${transition.checks.map(c=>`<li><span class="check-mark ${c.passed?'passed':''}" aria-label="${c.passed?'Выполнено':'Осталось'}">${c.passed?'✓':'○'}</span><span><b>${esc(c.label)}</b><div>${esc(c.detail||c.reason)}</div></span></li>`).join('')}</ul>${transition.checks.some(c=>c.id.startsWith('functional_'))?'<button class="btn secondary" onclick="AM.openImpactCheck()">Проверка движений</button>':''}`;
  const line=document.getElementById('stageLine'); line.innerHTML='';
  RDCFG.stages.forEach(s=>{const d=document.createElement('i');d.className='stage-dot '+(s.order<stage.order?'done':s.order===stage.order?'current':'');line.appendChild(d)});

  const recs=actionRecommendations();
  const best=recs[0];
  const bestEl=document.getElementById('bestNow');
  bestEl.classList.toggle('rest',!best);
  const bestChange=best?.kind==='exercise'?exerciseChangeNotice(best.ex,best.dose,now(),best.transitionFrom):null;
  bestEl.classList.toggle('load-change',!!bestChange);
  if(best){
    const when=best.status==='green'?'Можно сейчас':best.status==='yellow'?'С учётом самочувствия':'Пауза';
    bestEl.innerHTML=`
      <span class="best-label">⭐ Лучшее сейчас · ${when} · ${best.kind==='feedback'?'Самочувствие':best.kind==='run'?'Бег':best.kind==='test'?'Тест':homeReturnState(best.ex)?'Возврат объёма':'Упражнение'}</span>
      <div class="rec-name">${esc(['feedback','run'].includes(best.kind)?best.name:best.kind==='test'?best.test.name:best.ex.name)}</div>
      <div class="dose">${esc(['feedback','run'].includes(best.kind)?best.detail:best.kind==='test'?testDoseText(best.test):doseText(best.ex,best.dose))}</div>
      ${changeNoticeHTML(bestChange)}
      ${best.extraRound?'<div class="li-meta">✓ Цель группы выполнена · дополнительное выполнение по назначению 3–4 раза в день</div>':''}
      ${best.kind==='test'?`<div class="li-meta">${esc(best.test.what_measures)}</div>`:''}
      <div class="rec-actions ${best.kind==='exercise'?'exercise-actions':''}">${actionButtonHTML(best)}</div>
      <div class="reason"><b>Почему:</b> ${esc(best.reasons[0])}</div>
      ${['feedback','run'].includes(best.kind)?'':`<details class="recommend-details"><summary>Подробнее о рекомендации</summary>${best.reasons.slice(1).map(r=>`<div class="reason">${esc(r)}</div>`).join('')}${best.kind==='test'?best.latest?'<div class="li-meta">Последний результат: '+esc(resultText(best.test,best.latest))+'</div>':'':`<div class="tags">${(best.ex.primary_skills||[]).slice(0,3).map(s=>`<span class="tag">${esc(skillLabels[s]||fatigueLabels[s]||s)}</span>`).join('')}</div>`}</details>`}`;
  }else bestEl.innerHTML=noRecommendationHTML();
  renderPostponed(best);
  renderAdditionalPlan();

  document.getElementById('otherOptions').hidden=recs.length<2;
  const list=document.getElementById('recommendations'); list.innerHTML='';
  const more=document.getElementById('moreRecommendations'),moreList=document.getElementById('moreRecommendationsList');moreList.innerHTML='';
  more.hidden=recs.length<=3;
  recs.slice(1,6).forEach((r,i)=>{
    const target=i<2?list:moreList;
    if(r.kind==='run'){target.insertAdjacentHTML('beforeend',`<div class="list-item"><div class="li-main"><b>${esc(r.name)}</b><div class="li-meta">${esc(r.detail)}</div>${actionButtonHTML(r)}</div></div>`);return;}
    if(r.kind==='test'){
      target.insertAdjacentHTML('beforeend',`<button type="button" class="list-item" style="color:inherit;text-align:left" onclick="AM.openTest('${r.test.id}')"><span class="status-dot status-green"></span><span class="li-main"><span class="li-title">${esc(r.test.name)}</span><span class="li-meta" style="display:block">${esc(testDoseText(r.test))} · ${esc(r.reasons[0])}</span></span><span class="pill green">Тест</span></button>`);
      return;
    }
    const change=exerciseChangeNotice(r.ex,r.dose,now(),r.transitionFrom);
    const next=r.status==='green'?null:nextGoodWindow(r.ex); const delay=next&&next-now()>20*60000?`лучше ${fmtTime(next)}`:(r.status==='green'?'можно сейчас':'проверь самочувствие');
    target.insertAdjacentHTML('beforeend',`
      <div class="list-item ${change?'load-change':''}" onclick="AM.openExercise('${r.ex.id}')">
        <span class="status-dot status-${r.status}"></span><div class="li-main"><div class="li-title">${esc(r.ex.name)}</div><div class="li-meta">${r.extraRound?'✓ Цель группы выполнена · дополнительное выполнение<br>':''}${esc(doseText(r.ex,r.dose))} · ${esc(r.reasons[0]||'')}</div>${changeNoticeHTML(change)}</div>
        <span class="pill ${r.status}">${esc(delay)}</span>
      </div>`);
  });

  const excluded=activeExercises().filter(ex=>!postponedUntil('exercise',ex.id)).map(ex=>({ex,...scoreExercise(ex)})).filter(r=>r.score<0||r.status==='red');
  document.getElementById('excludedExercises').hidden=!excluded.length;
  document.getElementById('excludedExercisesSummary').textContent=`Почему не сейчас? · ${excluded.length}`;
  document.getElementById('excludedExerciseList').innerHTML=excluded.map(r=>`<button type="button" class="list-item" style="color:inherit;text-align:left" onclick="AM.openExercise('${r.ex.id}')"><span class="li-main"><span class="li-title">${esc(r.ex.name)}</span><span class="li-meta" style="display:block">${esc(exercisePauseReason(r.ex,r))}</span></span><span aria-hidden="true">›</span></button>`).join('');

  const counts=planCounts(), grid=document.getElementById('dailyGrid');grid.innerHTML='';
  let closed=0,total=0;
  for(const g of Object.keys(dailyPlan().targets)){
    const ex=EX.find(x=>x.prescription_credit?.group===g);
    const target=dailyTarget(ex),plan=dailyLoadPlan(ex);if(target)total++;
    const n=counts[g]||0,done=target>0&&n>=target;if(done)closed++;
    grid.insertAdjacentHTML('beforeend',`<div class="daily-cell ${done?'done':''} ${done&&n>target?'extra':''}"><div class="circle">${n+'/'+target}</div>${plan.status==='pause'?'<small>Пауза</small>':plan.status==='light'?'<small>Меньший объём</small>':''}<label>${esc(groupShort[g]||g)}</label></div>`);
  }
  document.getElementById('dailyCount').textContent=`${closed}/${total} ориентиров`;
  const adherence=progressionAdherence();
  const testsToday=state.testLogs.filter(l=>l.ts>=startOfDay());
  document.getElementById('dailyActivity').innerHTML=`<div class="notice" style="margin-top:12px">Сегодня: ${logsToday().length} выполнений упражнений · ${testsToday.length} тестов · ${customToday().length} других активностей.${testsToday.map(l=>`<div class="li-meta">✓ ${esc(RDCFG.tests.find(t=>t.id===l.testId)?.name||'Тест')} · ${fmtTime(l.ts)}</div>`).join('')}<p><b>Регулярность: ${adherencePercent(adherence.score)}${adherence.minimumCount==null?'':' · минимум '+adherence.minimumCount+'/21'}.</b>${adherence.score==null?'':adherence.allowed?'<br>Порог 70% для нового повышения выполнен.':'<br>Для нового повышения нужно не меньше 70% у каждой домашней группы.'}</p><details><summary>Как считается план</summary><p>Домашнее назначение — 3–4 раза в день: три зачтённых выполнения закрывают дневной минимум. Для регулярности складываем все зачтённые выполнения каждой обязательной группы за последние семь полных тренировочных дней и делим на 21. Берём самую маленькую долю. Варианты одной группы считаются вместе; четвёртое выполнение тоже учитывается.</p><p>Нужно минимум 15/21 у каждой группы. Например, четыре дня по три и три дня по два дают 18/21 = 85,7%. Сегодняшний день пока не учитывается. Тесты и дополнительные занятия не закрывают домашнее назначение; качество и утреннюю реакцию проверяем отдельно.</p>${adherence.groups.map(g=>`<div class="li-meta">${esc(g.label)}: ${g.count}/21</div>`).join('')}</details></div>`;

  const f=fatigueAt(), fc=document.getElementById('fatigueCard');fc.innerHTML='';
  for(const [k,v] of Object.entries(f)){
    fc.insertAdjacentHTML('beforeend',`<div class="fatigue-row"><span>${esc(fatigueLabels[k]||k)}</span><div class="bar"><i style="width:${Math.round(v)}%"></i></div><b>${Math.round(v)}</b></div>`);
  }
  fc.insertAdjacentHTML('beforeend',`<details><summary>Сегодня в своих единицах</summary>${exposureSummary().map(row=>`<div class="li-meta">${esc(EXMAP[row.movement]?.name||row.movement)} · ${row.side==='right'?'справа':row.side==='left'?'слева':'обе стороны'}: ${row.quantity} ${esc(row.unit)}</div>`).join('')||'Нагрузок пока нет'}<div class="li-meta">Суммируются только одинаковые движения и условия. Тест не закрывает домашнее назначение.</div></details>`);
  document.getElementById('updatedAt').textContent=`обновлено ${fmtTime(now())}`;

  const wrap=document.getElementById('pendingChecksWrap');wrap.innerHTML='';
  const days=pendingMorningDays().filter(day=>nextDayStart(day)!==startOfDay());
  if(days.length)wrap.insertAdjacentHTML('beforeend',`<details style="margin-top:12px"><summary>Предыдущие дни без проверки · ${days.length}</summary><div class="li-meta">Прошлую утреннюю реакцию не восстанавливаем предположениями.</div>${days.map(day=>`<button class="btn ghost" onclick="AM.openMorning(${day})">${fmtDate(day)}</button>`).join('')}</details>`);
  if(safetyFlag())wrap.insertAdjacentHTML('beforeend','<div class="notice bad" style="margin-top:12px">Боль, новый отёк или нестабильность: предложения перехода между этапами приостановлены до последующей нормальной реакции. Это продуктовая мера предосторожности, не диагноз.</div>');
  });
}
function setRing(id,valId,v,empty='0%'){
  const el=document.getElementById(id), ve=document.getElementById(valId);
  if(v==null){el.style.setProperty('--v',0);ve.textContent=empty;}else{el.style.setProperty('--v',pct(v));ve.textContent=pct(v)+'%';}
}

const exerciseVisuals={
  towel_stretch_straight_knee:{label:'Прямая нога',color:'#78dbb4'},
  towel_stretch_bent_knee:{label:'Согнутая нога',color:'#78dbb4'},
  bilateral_tiptoe_static:{label:'На носках',color:'#8abfff'},
  tandem_walk_flat:{label:'Ходьба по линии',color:'#78dbb4'},
  tandem_walk_tiptoe:{label:'По линии на носках',color:'#8abfff'},
  right_leg_balance_left_front_back:{label:'Нога вперёд и назад',color:'#b9a4f4'},
  left_side_lunge_right_leg_straight:{label:'Боковой выпад',color:'#78dbb4'},
  slider_injured_leg_three_directions:{label:'Слайдер',color:'#8abfff'},
  hemisphere_weight_shift_injured_front:{label:'Перенос веса',color:'#b9a4f4'},
  hemisphere_weight_shift_rear_heel_up:{label:'Поднятая пятка',color:'#b9a4f4'},
  balance_board_both_tiptoe_right_front:{label:'Балансборд · правая',color:'#8abfff'},
  balance_board_both_tiptoe_left_front:{label:'Балансборд · левая',color:'#8abfff'},
  hemisphere_both_tiptoe_right_front:{label:'Полусфера · правая',color:'#78dbb4'},
  hemisphere_both_tiptoe_left_front:{label:'Полусфера · левая',color:'#78dbb4'},
  obstacle_high_knee_heel_to_toe:{label:'Перешагивания',color:'#b9a4f4'},
  tiptoe_sidewalk_ball_reaction:{label:'Шаги с мячом',color:'#8abfff'},
  tiptoe_square_corner_lunges:{label:'К углам квадрата',color:'#78dbb4'},
  tiptoe_sidewalk_cone_reach:{label:'Шаги к фишкам',color:'#b9a4f4'},
  sand_tiptoe_walk_or_stand:{label:'Носки на песке',color:'#e3c18e'},
  single_leg_calf_raise:{label:'Подъём на одной',color:'#78dbb4'},
  band_eversion:{label:'Стопа с резинкой',color:'#b9a4f4'},
  hops_and_direction_changes:{label:'Прыжки и повороты',color:'#8abfff'},
  single_leg_multidirectional_reach:{label:'Баланс по направлениям',color:'#b9a4f4'}
};
function exerciseArt(ex){
  if(ex.new_protocol)return '<span aria-hidden="true" style="font-size:42px">'+(ex.id==='hop_to_stabilization'?'↟':'↗')+'</span>';
  return `<img class="exercise-art" src="assets/exercises/${ex.id}.webp" width="640" height="640" alt="" aria-hidden="true" loading="lazy" decoding="async">`;
}

let exerciseFilter='active';
function renderExercises(){
  const filters=[['active','В программе'],['available','Можно добавить'],['locked','На будущее'],['all','Все']];
  const f=document.getElementById('exerciseFilters');f.innerHTML=filters.map(([id,n])=>`<button class="filter ${exerciseFilter===id?'active':''}" aria-pressed="${exerciseFilter===id}" onclick="AM.setExerciseFilter('${id}')">${n}</button>`).join('');
  let items=EX.filter(x=>exerciseFilter==='all'||state.exerciseStatuses[x.id]===exerciseFilter);
  items.sort((a,b)=>(a.order_in_tier||999)-(b.order_in_tier||999));
  const list=document.getElementById('exerciseList');list.innerHTML='';
  if(!items.length)list.innerHTML='<div class="empty">Ничего нет.</div>';
  items.forEach(ex=>{
    const st=state.exerciseStatuses[ex.id],tr=scoreExercise(ex),until=postponedUntil('exercise',ex.id),visual=exerciseVisuals[ex.id]||{color:'#78dbb4',label:ex.name};
    const label=until?'Отложено':st==='active'?(tr.score<0||tr.status==='red'?'Пауза':tr.status==='green'?'Можно сейчас':'С учётом самочувствия'):statusLabels[st];
    const reason=until?`Отложено до ${fmtDate(until)} ${fmtTime(until)}`:st==='active'&&(tr.score<0||tr.status==='red')?'Сейчас пока не предлагается: '+exercisePauseReason(ex,tr):label;
    list.insertAdjacentHTML('beforeend',`
      <button type="button" class="exercise-tile" data-lifecycle="${st}" style="--exercise-color:${visual.color}" aria-label="${esc(ex.name+' · '+reason)}" title="${esc(ex.name+' · '+reason)}" onclick="AM.openExercise('${ex.id}')">
        <span class="exercise-picture">${exerciseArt(ex)}${st==='locked'||st==='archived'?`<span class="tile-mark" aria-hidden="true">${st==='locked'?'⌑':'↶'}</span>`:''}</span>
        <span class="tile-name">${esc(visual.label)}</span><span class="tile-status ${st==='active'?until||tr.status!=='green'||tr.score<0?'yellow':'green':''}"><i aria-hidden="true"></i>${esc(label)}</span>
      </button>`);
  });
  document.getElementById('activeExerciseCount').textContent=`${activeExercises().length} активно`;
}
function masteryLabel(v){return v==null?'Поддерживающая практика':pct(v)<100?'Прогресс от начала этапа':'Цель этапа освоена';}

function protocolHTML(t){
  return `<details><summary>Как выполнить</summary><ol>${t.protocol.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="notice">Остановись при боли или потере контроля. Пороги и нагрузка — продуктовые эвристики, не медицинские нормативы.</div></details>`;
}
function resultText(t,l){
  if(!l)return 'Нет данных';
  if(t.bilateral)return `Л: ${l.left} ${t.unit_short} · П: ${l.right} ${t.unit_short} · Симметрия: ${pct(symmetry(t,l))}%`;
  return t.max_test_steps&&l.value>=t.max_test_steps?`${t.max_test_steps}+ — верхняя граница текущего теста`:`${l.value} ${t.unit_short}`;
}
function historyHTML(t,logs){
  if(!logs.length)return '<div class="muted">Измерений этого протокола пока нет.</div>';
  const conditions=[...new Set(logs.map(l=>l.conditions||'standard'))];
  if(conditions.length>1)return conditions.map(condition=>`<details><summary>Условия: ${esc(condition==='standard'?'По описанию теста':condition)} · отдельно</summary>${historyHTML(t,logs.filter(l=>(l.conditions||'standard')===condition))}</details>`).join('');
  const editable=logs[0].protocol_id===t.protocol_id;
  const baseline=logs[0],latest=logs[logs.length-1],first=t.bilateral?baseline.right:baseline.value,last=t.bilateral?latest.right:latest.value;
  const delta=+(last-first).toFixed(2),relative=first?` / ${delta>0?'+':''}${Math.round(delta/first*100)}%`:'';
  const points=logs.slice(-12),max=Math.max(1,...points.map(l=>t.bilateral?l.right:l.value));
  const coord=(l,i,sym=false)=>`${points.length===1?150:10+i*280/(points.length-1)},${85-(sym?clamp(symmetry(t,l)):(t.bilateral?l.right:l.value)/max)*70}`;
  return `<div class="notice" style="margin-top:10px">Первое измерение${t.bilateral?' справа':''}: ${first} ${t.unit_short} · Сейчас: ${last} ${t.unit_short}<br>Изменение: ${delta>0?'+':''}${delta} ${t.unit_short}${relative}${t.bilateral?`<br>Симметрия: ${pct(symmetry(t,baseline))}% → ${pct(symmetry(t,latest))}%`:''}<br>Динамика измерения, а не процент выздоровления. ${t.id==='knee_to_wall'&&Math.abs(delta)<2?'Небольшая разница может быть погрешностью.':'Точная погрешность этого домашнего задания неизвестна.'}</div>
    <svg class="test-chart" viewBox="0 0 300 100" role="img" aria-label="Динамика ${t.bilateral?'правой стороны и симметрии':'результата'}"><path d="M10 85 H290" stroke="#294359"/><polyline points="${points.map((l,i)=>coord(l,i)).join(' ')}" fill="none" stroke="#66b9ff" stroke-width="2"/>${points.map((l,i)=>`<circle cx="${coord(l,i).split(',')[0]}" cy="${coord(l,i).split(',')[1]}" r="3" fill="#66b9ff"/>`).join('')}${t.bilateral?`<polyline points="${points.map((l,i)=>coord(l,i,true)).join(' ')}" fill="none" stroke="#55e6a5" stroke-width="2"/>${points.map((l,i)=>`<circle cx="${coord(l,i,true).split(',')[0]}" cy="${coord(l,i,true).split(',')[1]}" r="3" fill="#55e6a5"/>`).join('')}`:''}</svg>
    <div class="muted" style="font-size:11px">Синий: ${t.bilateral?'правая сторона':'результат'} (0–${max} ${t.unit_short})${t.bilateral?' · Зелёный: симметрия (0–100%)':''} · ${fmtDate(points[0].ts)} — ${fmtDate(latest.ts)}</div>
    <table class="history-table"><thead><tr><th>Дата</th>${t.bilateral?`<th>Л, ${esc(t.unit_short)}</th><th>П, ${esc(t.unit_short)}</th><th>Симметрия</th>`:`<th>${esc(t.unit)}</th>`}</tr></thead><tbody>${[...logs].reverse().map(l=>`<tr${editable?' class="history-result"':''}><td>${fmtDate(l.ts)} ${new Date(l.ts).getFullYear()}${editable?`<br><span class="muted">${fmtTime(l.ts)}</span>`:''}</td>${t.bilateral?`<td>${l.left}</td><td>${l.right}</td><td>${pct(symmetry(t,l))}%</td>`:`<td>${l.value}</td>`}</tr>${editable?`<tr class="history-actions"><td colspan="${t.bilateral?4:2}"><button class="btn ghost" aria-label="Исправить измерение за ${fmtDate(l.ts)} ${fmtTime(l.ts)}" onclick="AM.openTest('${t.id}','${l.id}')">Исправить</button> <button class="btn ghost" aria-label="Удалить измерение за ${fmtDate(l.ts)} ${fmtTime(l.ts)}" onclick="AM.deleteTest('${l.id}')">Удалить</button></td></tr>`:''}`).join('')}</tbody></table>`;
}
function testSchedule(t,plans,ts=now()){
  const latest=currentMeasurement(t,ts)?.latest||testHistory(t).filter(l=>l.ts<=ts).at(-1);
  if(!testAvailable(t,ts))return {status:'locked',title:'Следующая ступень ударной работы',detail:impactTestLockReason(t,ts),latest};
  const until=postponedUntil('test',t.id,ts);
  if(until)return {status:'postponed',title:`Отложено до ${fmtDate(until)} ${fmtTime(until)}`,detail:'Ты отложил это измерение. Его можно вернуть в план раньше.',after:until,latest};
  const plan=plans.find(r=>r.test.id===t.id);
  if(plan){
    const titles={ready:latest?'Можно сейчас · повтор':'Можно сейчас · первое измерение',waiting:`Не раньше ${fmtDate(plan.after)} ${fmtTime(plan.after)}`,feedback:'После оценки самочувствия',recovery:'После восстановления',tomorrow:`Следующий блок · ${fmtDate(plan.after)}`};
    return {status:plan.status,title:titles[plan.status],detail:plan.reasons[0],after:plan.after,latest};
  }
  return {status:'recent',title:`Повтор · ${fmtDate(latest.ts+TEST_REPEAT_DAYS*DAY)}`,detail:'Повтор предлагаем через 7 дней после измерения, с учётом нагрузки и самочувствия. Частые повторы не нужны для роста процента.',after:latest.ts+TEST_REPEAT_DAYS*DAY,latest};
}
function testCardHTML(t,schedule){
  const {status,title,detail,latest}=schedule,ready=status==='ready',locked=status==='locked';
  const protocols=[...new Set(state.testLogs.filter(l=>l.testId===t.id&&l.protocol_id!==t.protocol_id).map(l=>l.protocol_id))];
  const history=latest||protocols.length?`<details><summary>Результаты и история</summary>${historyHTML(t,testHistory(t))}${protocols.map((p,i)=>`<details><summary>${p.startsWith('legacy_')?'Прежний протокол — не уточнён':'Другой протокол '+(i+1)} · отдельно</summary>${historyHTML(t.id==='single_leg_hop_basic'&&p.startsWith('legacy_')?{...t,unit:'прежних единиц (не уточнены)',unit_short:'ед. (не уточнены)'}:t,testHistory(t,p))}</details>`).join('')}</details>`:'';
  const shortReason={ready:latest?'Пора обновить результат':'Исходного измерения пока нет',waiting:'Перерыв после похожей нагрузки',feedback:detail.replace('Нужна оценка самочувствия после незавершённой серии тестов','Сначала оцени реакцию после серии тестов'),recovery:'Нужна нормальная повторная оценка восстановления',tomorrow:'Сегодня измерение уже было; после утренней проверки',recent:'Измерено '+fmtDate(latest?.ts)+' · повтор через 7 дней',postponed:'Ты отложил это измерение',locked:'Откроется на этапе «Подготовка к ударной нагрузке»'}[status];
  return `<article id="test-${t.id}" class="test-card"><details class="test-row">
    <summary><span class="test-row-name">${esc(t.name)}</span><span class="test-row-status ${ready?'ready':locked?'later':''}">${esc(title)}</span><span class="test-row-reason">${esc(shortReason)}</span></summary>
    <div class="test-row-body"><div class="li-meta">${esc(t.what_measures)} · ${esc(testDoseText(t))}</div><div class="test-schedule">${esc(detail)}</div>
    ${latest?`<div class="test-result"><b>${esc(resultText(t,latest))}</b><div class="li-meta">Измерено ${fmtDate(latest.ts)} ${fmtTime(latest.ts)}</div></div>`:''}
    ${ready?`<div class="test-actions"><button class="btn primary" onclick="AM.openTest('${t.id}')">${latest?'Повторить тест':'Пройти тест'}</button><button class="btn ghost" onclick="AM.openPostpone('test','${t.id}')">Отложить</button></div>`:status==='postponed'?`<div class="test-actions"><button class="btn secondary" onclick="AM.resumeAction('test','${t.id}')">Вернуть в план</button></div>`:''}
    <div class="li-title">Как выполнить</div><ol>${t.protocol.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="li-meta">Остановись при боли или потере контроля.</div>${history}
    ${!locked&&!ready?`<details><summary>Уже выполнил этот тест?</summary><div class="li-meta">Запиши фактическое выполнение. Срок выше относится к новому измерению.</div><button class="btn ghost" style="margin-top:8px" onclick="AM.openTest('${t.id}')">Записать выполненный тест</button></details>`:''}
    </div></details></article>`;
}
let testPlanTimer=null;
function renderTests(){
  const ts=now(),rs=readinessSummary(ts),plans=testPlans(ts),cur=currentStage();
  const entries=RDCFG.tests.map(t=>({test:t,...testSchedule(t,plans,ts)}));
  const order={ready:0,waiting:1,feedback:2,recovery:3,tomorrow:4,recent:5,postponed:6,locked:7};
  entries.sort((a,b)=>order[a.status]-order[b.status]||(a.after||ts)-(b.after||ts)||plans.findIndex(r=>r.test.id===a.test.id)-plans.findIndex(r=>r.test.id===b.test.id));
  const feedback=feedbackRecommendation(ts);
  const measured=Object.values(rs.measurements).filter(m=>m.log).length;
  document.getElementById('measurementCoverage').textContent=measured+' измерений с актуальными условиями';
  document.getElementById('readinessDomains').innerHTML=RDCFG.tests.map(t=>{
    const m=rs.measurements[t.id],l=m?.latest;
    return `<div class="direction-row ${m?.log?'measured':''}"><span class="direction-mark">${m?.log?'✓':'○'}</span><div><b>${esc(t.name)}</b><div class="li-meta">${t.domain==='impact_running_capacity'?'Ударная нагрузка · ':''}${esc(t.what_measures)}${!testAvailable(t,ts)?' · '+esc(impactTestLockReason(t,ts)):''} · ${l?esc(resultText(t,l))+' · '+fmtDate(l.ts)+' · '+esc(l.conditions||'По описанию теста'):'Нет актуального измерения'}${m?.status==='incomparable'?' · Условия изменились или неизвестны; старый хороший результат не подтверждает нынешний уровень':''}</div></div></div>`;
  }).join('')+`<div class="direction-row"><div><b>Уверенность</b><div class="li-meta">${rs.domainScores.confidence==null?'Нужна самооценка':'Самооценка сохранена'}</div><button class="btn ghost" onclick="AM.openSelfReport()">Самооценка</button></div></div>`;
  renderAssessment();
  const groups=[['ready','Можно сейчас'],['waiting','После перерыва'],['feedback','После оценки самочувствия'],['recovery','После восстановления'],['tomorrow','Следующий блок'],['recent','Измерено · следующий повтор'],['postponed','Отложено тобой'],['locked','На следующем этапе']];
  document.getElementById('testList').innerHTML=groups.map(([status,title])=>{
    const items=entries.filter(e=>e.status===status);
    return items.length?`<div class="test-group"><h3>${title}</h3>${status==='feedback'&&feedback?`<div class="test-actions">${actionButtonHTML(feedback)}</div>`:status==='recovery'?'<div class="test-actions"><button class="btn secondary" onclick="AM.openSymptoms()">Проверить восстановление</button></div>':''}</div>${items.map(e=>testCardHTML(e.test,e)).join('')}`:'';
  }).join('');
  clearTimeout(testPlanTimer);
  const boundary=entries.filter(e=>e.status!=='locked'&&e.after>ts).map(e=>e.after).sort((a,b)=>a-b)[0];
  if(boundary)testPlanTimer=setTimeout(renderTests,boundary-ts);
  const road=document.getElementById('roadmap');road.innerHTML='';
  RDCFG.stages.forEach(s=>{
    const cls=s.order===cur.order?'current':s.order>cur.order?'locked':'';
    const opens=RDCFG.tests.filter(t=>s.order===0?t.status!=='locked':t.unlock_stage===s.id),nextStage=RDCFG.stages.find(x=>x.order===s.order+1);
    const requirements=nextStage?stageTransition(nextStage.id,ts).checks:[];
    road.insertAdjacentHTML('beforeend',`<div class="card stage-card ${cls}"><div class="stage-icon">${s.order<cur.order?'✓':s.order===cur.order?'●':'🔒'}</div><b>Этап ${s.order+1} — ${esc(s.name)}</b><div class="li-meta">${esc(s.description||'')}</div><details><summary>${opens.length?'Самотесты этапа · '+opens.length:'Новых самотестов не добавляется'}</summary>${opens.map(t=>`<div class="li-meta">${esc(t.name)}${t.status==='locked'?' · '+esc(impactTestLockReason(t,ts)):''}</div>`).join('')||'Измерения предыдущих этапов остаются доступны.'}</details>${nextStage?`<details><summary>Для перехода к этапу «${esc(nextStage.name)}»</summary><ul>${requirements.map(c=>`<li>${s.order===cur.order?(c.passed?'✓ ':'○ '):''}${esc(c.label)}${s.order===cur.order?`<div class="li-meta">${esc(c.detail)}</div>`:''}</li>`).join('')}</ul>${s.order===cur.order&&requirements.every(c=>c.passed)?`<button class="btn primary" onclick="AM.suggestStage('${nextStage.id}')">Перейти к следующему этапу</button>`:''}${s.order===cur.order?'<button class="btn secondary" onclick="AM.openImpactCheck()">Проверка движений перед ударной работой</button>':''}${s.order>=2?'<button class="btn ghost" onclick="AM.openRunningPlan()">Мой беговой план</button>':''}</details>`:'<div class="li-meta" style="margin-top:10px">Последний этап плана.</div>'}</div>`);
  });
}

function loadSummaryHTML(channels){
  return Object.entries(APP.fatigue_channels).map(([k,cfg])=>{
    const v=channels[k]||0,level=v>=cfg.red_from?'высокая':v>=cfg.yellow_from?'средняя':'лёгкая';
    return `<div class="fatigue-row"><span>${esc(fatigueLabels[k])}</span><div class="bar"><i style="width:${Math.min(100,v)}%"></i></div><b>${Math.round(v)}</b></div><div class="muted" style="font-size:11px">${esc(fatigueLabels[k])} — ${level}</div>`;
  }).join('');
}
function renderAssessment(){
  const s=state.assessment_sessions.slice(-1)[0],wrap=document.getElementById('assessmentWrap');
  if(!s){wrap.innerHTML='';return;}
  const tests=s.test_log_ids.map(id=>state.testLogs.find(l=>l.id===id)).filter(Boolean);
  wrap.innerHTML=`<details class="card" style="margin:12px 0"><summary>${s.completed_at?'Последняя самопроверка':'Записано в серии'} · ${fmtDate(s.started_at)} · ${tests.length} тестов</summary><div style="margin:10px 0">${tests.map(l=>`<div class="li-meta">✓ ${esc(RDCFG.tests.find(t=>t.id===l.testId)?.name||'Тест')}</div>`).join('')}</div>${s.perceived_fatigue?`<div class="li-meta">${fatigueNames[s.perceived_fatigue]} · Боль: ${s.pain_after}/10${s.instability?' · нестабильность':''}${s.swelling?' · отёк':''}${s.same_day_response?' · Позже: '+responseNames[s.same_day_response]:''}${s.next_day_response?' · Следующим утром: '+responseNames[s.next_day_response]:''}</div>`:''}<button class="btn secondary" style="margin-top:12px" onclick="AM.openAssessment('${s.id}')">${s.perceived_fatigue?'Обновить реакцию':'Оценить реакцию серии'}</button><details><summary>Расчёт нагрузки серии</summary>${loadSummaryHTML(s.aggregate_load)}</details></details>`;
}
function openAssessment(id){
  const s=state.assessment_sessions.find(s=>s.id===id);if(!s)return;
  document.getElementById('assessmentModal').innerHTML=`<div class="modal-head"><h3>Как чувствуются ноги после самопроверки?</h3><button class="x" onclick="AM.close('assessmentDialog')">×</button></div>
    <div class="seg" id="assessmentFatigue">${[['easy','Легко'],['moderate','Умеренно устал'],['strong','Сильно устал']].map(([v,label])=>`<button type="button" data-value="${v}" aria-pressed="${s.perceived_fatigue===v}" class="${s.perceived_fatigue===v?'selected':''}" onclick="AM.chooseFatigue(this)">${label}</button>`).join('')}</div>
    <div class="field"><label for="assessmentPain">Боль в правой лодыжке, 0–10</label><div class="range-row"><input id="assessmentPain" type="range" min="0" max="10" value="${s.pain_after??0}" oninput="document.getElementById('assessmentPainValue').textContent=this.value"><output id="assessmentPainValue" class="range-val">${s.pain_after??0}</output></div></div>
    <label class="notice" style="display:block"><input id="assessmentInstability" type="checkbox" ${s.instability?'checked':''}> Нестабильность / подворачивание</label>
    <label class="notice" style="display:block;margin-top:8px"><input id="assessmentSwelling" type="checkbox" ${s.swelling?'checked':''}> Новый или усилившийся отёк</label>
    <div class="notice" style="margin-top:12px">Одна оценка для всей серии тестов. Усталость уточняет нагрузку; боль, отёк и нестабильность ограничивают следующие нагрузки по продуктовым эвристикам.</div>
    <div class="modal-actions"><button class="btn primary" onclick="AM.saveAssessment('${s.id}')">Завершить самопроверку</button></div>`;
  showDialog('assessmentDialog');
}
function chooseFatigue(button){
  document.querySelectorAll('#assessmentFatigue button').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',b===button);});
}
function completeAssessment(s,response,ts=now()){
  Object.assign(s,response,{completed_at:s.completed_at||ts,reaction_at:ts});recalculateSession(s);settleAdditionalPlan(ts);
}
function saveAssessment(id){
  const s=state.assessment_sessions.find(s=>s.id===id),button=document.querySelector('#assessmentFatigue .selected');
  if(!s||!button)return toast('Отметь усталость после самопроверки');
  completeAssessment(s,{perceived_fatigue:button.dataset.value,pain_after:+document.getElementById('assessmentPain').value,instability:document.getElementById('assessmentInstability').checked,swelling:document.getElementById('assessmentSwelling').checked});
  closeDialog('assessmentDialog');save();toast('Самопроверка завершена. Нагрузка учтена');
}
function pendingAssessmentChecks(){
  return state.assessment_sessions.filter(s=>!s.next_day_response&&startOfDay(sessionLastAt(s))<startOfDay());
}
function openAssessmentCheck(id){
  const s=state.assessment_sessions.find(s=>s.id===id);if(!s||startOfDay(sessionLastAt(s))>=startOfDay())return;
  const yesterday=startOfDay(sessionLastAt(s))===daysAgo(1);
  document.getElementById('checkModal').innerHTML=`<div class="modal-head"><h3>Как чувствует себя правая лодыжка после ${yesterday?'вчерашней самопроверки':'самопроверки '+fmtDate(s.started_at)}?</h3><button class="x" onclick="AM.close('checkDialog')">×</button></div>
    <div class="field"><label for="assessmentSameDay">Позже в день самопроверки</label><select id="assessmentSameDay"><option value="">Выбери реакцию</option>${[['better','Лучше'],['same','Так же'],['worse','Хуже']].map(([v,n])=>`<option value="${v}" ${s.same_day_response===v?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label for="assessmentNextDay">На следующее утро</label><select id="assessmentNextDay"><option value="">Выбери реакцию</option><option value="better">Лучше</option><option value="same">Так же</option><option value="worse">Хуже</option></select></div>
    <div class="notice">Одна утренняя проверка для всей серии. Если появилась новая боль, нестабильность или отёк, обнови реакцию сессии.</div><div class="modal-actions"><button class="btn primary" onclick="AM.saveAssessmentCheck('${s.id}')">Сохранить</button></div>`;
  showDialog('checkDialog');
}
function saveAssessmentCheck(id){
  const s=state.assessment_sessions.find(s=>s.id===id),same=document.getElementById('assessmentSameDay').value,next=document.getElementById('assessmentNextDay').value;
  if(!s||!same||!next)return toast('Отметь обе реакции');
  Object.assign(s,{same_day_response:same,next_day_response:next,reaction_at:now()});
  settleAdditionalPlan(now());
  closeDialog('checkDialog');save();toast(next==='worse'||same==='worse'?'Реакция учтена: похожая нагрузка снижена':'Реакция сохранена');
}
function selfReportDue(){
  return !state.last_self_report_at||now()-state.last_self_report_at>=RDCFG.self_report.frequency_days*DAY;
}
function openSelfReport(){
  const latest=state.selfReports.slice(-1)[0]||{},keys=['trust','fear','ready'];
  document.getElementById('selfReportModal').innerHTML=`<div class="modal-head"><h3>Самооценка</h3><button class="x" onclick="AM.close('selfReportDialog')">×</button></div>${RDCFG.self_report.questions.map((q,i)=>`<div class="field"><label for="sr_${keys[i]}">${esc(q.text)}</label><div class="range-row"><input id="sr_${keys[i]}" type="range" min="0" max="10" step="1" value="${latest[keys[i]]??5}" oninput="document.getElementById('srValue_${keys[i]}').textContent=this.value"><output class="range-val" id="srValue_${keys[i]}">${latest[keys[i]]??5}</output></div><div class="li-meta">0 — ${q.endpoints[0]} · 10 — ${q.endpoints[1]}</div></div>`).join('')}<div class="modal-actions"><button class="btn primary" onclick="AM.saveSelfReport()">Сохранить</button></div>`;
  showDialog('selfReportDialog');
}

function renderStats(){
  document.getElementById('decisionHistory').innerHTML=decisionHistoryHTML();
  const chart=document.getElementById('activityChart');chart.innerHTML='';
  const vals=[];
  const events=allLoadEvents();
  for(let i=13;i>=0;i--){const d=daysAgo(i),n=events.filter(e=>startOfDay(e.timestamp)===d).reduce((sum,e)=>sum+Object.values(e.channels).reduce((a,b)=>a+b,0),0);vals.push(n);}
  const max=Math.max(1,...vals);vals.forEach((n,i)=>chart.insertAdjacentHTML('beforeend',`<div class="chart-col" title="${fmtDate(daysAgo(13-i))}: ${Math.round(n)} условных единиц нагрузки" style="height:${Math.max(3,(n/max)*100)}%"></div>`));

  const exp=weeklySkillExposure(), sk=document.getElementById('skillStats');sk.innerHTML='';
  for(const [s,cfg] of Object.entries(APP.skills)){
    const v=clamp((exp[s]||0)/6);
    sk.insertAdjacentHTML('beforeend',`<div class="fatigue-row"><span>${esc(skillLabels[s]||s)}</span><div class="bar"><i style="width:${pct(v)}%"></i></div><b>${pct(v)}</b></div>`);
  }

  const hist=document.getElementById('historyList');hist.innerHTML='';
  const all=[
    ...state.logs.map(l=>({ts:l.ts,title:EXMAP[l.exerciseId]?.name||'Упражнение',meta:`${l.actualDose?doseText(EXMAP[l.exerciseId]||{},l.actualDose)+' · ':''}боль ${l.painAfter??0}/10 · ${fatigueNames[l.fatigue||'low']||'усталость не указана'}${l.steadiness?' · '+steadinessNames[l.steadiness]:''}`,logId:l.id})),
    ...state.symptomReports.map(r=>({ts:r.ts,title:r.phase==='morning'?'Утренняя проверка за '+fmtDate(r.trainingDay):'Самочувствие лодыжки',meta:`${steadinessNames[r.steadiness]} · боль ${r.pain}/10 · ${fatigueNames[r.fatigue]||'усталость не указана'}${r.response&&r.response!=='unknown'?' · '+responseNames[r.response]:''}${r.onset_at?' · заметил '+fmtTime(r.onset_at):''} · ${r.logId?'после: '+(EXMAP[state.logs.find(l=>l.id===r.logId)?.exerciseId]?.name||'упражнения'):r.context==='combined'?'после нескольких нагрузок':'причина неизвестна'}`})),
    ...state.customActivities.map(a=>({ts:a.ts,title:a.name,meta:a.running?`${a.running.runMinutes} мин бега · ${a.running.intervals} отрезков · самый длинный ${a.running.longestContinuous} мин · усилие ${a.running.rpe}/10 · ${responseNames[a.response]||'реакция неизвестна'}`:`${a.minutes} мин · ${responseNames[a.response]||'реакция неизвестна'}`})),
    ...state.testLogs.map(l=>{const t=RDCFG.tests.find(t=>t.id===l.testId);return {ts:l.ts,title:'Тест: '+(t?.name||'Самопроверка'),meta:t?resultText(t,l)+(l.protocol_id===t.protocol_id?'':' · прежний / другой протокол'):'измерение'};}),
    ...state.assessment_sessions.map(s=>({ts:s.completed_at||sessionLastAt(s),title:'Самопроверка — '+fmtDate(s.started_at),meta:`${s.test_log_ids.length} тестов · ${s.perceived_fatigue?fatigueNames[s.perceived_fatigue]:'реакция не отмечена'}${s.pain_after!=null?' · боль '+s.pain_after+'/10':''}`,sessionId:s.id}))
  ].sort((a,b)=>b.ts-a.ts).slice(0,20);
  if(!all.length)hist.innerHTML='<div class="empty">История пока пустая.</div>';
  all.forEach(x=>hist.insertAdjacentHTML('beforeend',`<div class="list-item"><div class="li-main"><div class="li-title">${esc(x.title)}</div><div class="li-meta">${fmtDate(x.ts)} ${fmtTime(x.ts)} · ${esc(x.meta)}</div>${x.sessionId?`<button class="btn ghost" style="margin-top:8px" onclick="AM.openAssessment('${x.sessionId}')">Обновить реакцию</button>`:''}${x.logId?`<button class="btn ghost" style="margin-top:8px" onclick="AM.openSymptoms('${x.logId}')">Обновить реакцию</button>`:''}</div></div>`));
}
function decisionHistoryHTML(){
  if(!state.decisionLog.length)return '<p class="muted">Причины прежних решений неизвестны. Новые важные изменения будут сохраняться здесь.</p>';
  return state.decisionLog.slice(-30).reverse().map(event=>{const d={...event,snapshot:decisionSnapshot(event)};return `<details><summary>${fmtDate(d.ts)} ${fmtTime(d.ts)} · ${esc(d.reason)}</summary>${Object.entries(d.details.targets||d.details.original||{}).map(([id,dose])=>`<div class="li-meta">Исходный план: ${esc(EXMAP[id]?.name||id)} · ${esc(doseText(EXMAP[id]||{},dose))}</div>`).join('')}${d.snapshot.executions.map(l=>`<div class="li-meta">Выполнение ${fmtDate(l.ts)}: ${esc(EXMAP[l.exerciseId]?.name||l.exerciseId)} · ${esc(doseText(EXMAP[l.exerciseId]||{},l.actualDose||{}))} · ${esc({easy:'легко',normal:'посильно',hard:'тяжело'}[l.difficulty]||'усилие неизвестно')}</div>`).join('')}${d.snapshot.observations.map(r=>`<div class="li-meta">Оценка ${fmtDate(r.ts)} ${fmtTime(r.ts)}: боль ${r.pain}/10 · ${esc(responseNames[r.response]||'сравнение не указано')}${r.historyWorse?' · было ухудшение':''}</div>`).join('')}<div class="source">Версия правил: ${esc(d.version)}. Сохранены сведения, известные в момент решения.</div></details>`;}).join('');
}

function renderAll(){
  withHistoryCache(()=>syncProgram());
  return withHistoryCache(()=>{
    renderHome();renderExercises();renderTests();renderStats();
  });
}
