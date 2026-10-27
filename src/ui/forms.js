'use strict';

const equipmentLabels={slider_or_towel_on_smooth_floor:'Слайдер или полотенце и гладкий пол',hemisphere_or_balance_dome:'Полусфера',balance_board:'Балансборд',hemisphere:'Полусфера',safe_low_obstacles:'Невысокие безопасные препятствия',soft_ball_or_wall:'Мягкий мяч и партнёр / стена', '4_cones_or_markers':'Четыре фишки или ориентира',cones_or_household_markers:'Фишки или домашние ориентиры',sand:'Песок',resistance_band:'Эластичная лента'};
const extraTechnique={
  single_leg_calf_raise:{steps:['Встань на одну ногу рядом с устойчивой опорой; при необходимости придерживайся для равновесия.','Поднимись на носок опорной ноги, затем плавно опусти пятку на пол.'],url:'https://dynamichealth.nhs.uk/help-and-advice/foot-or-ankle-pain/',source:'NHS · Foot or ankle pain'},
  band_eversion:{steps:['Сидя, надень эластичную ленту вокруг обеих стоп.','Сохраняя пятку неподвижной, отведи переднюю часть рабочей стопы наружу, растягивая ленту. Колено и бедро остаются неподвижными.'],url:'https://www.worcsacute.nhs.uk/leaflets/ankle-sprain/',source:'NHS · Ankle Sprain'}
};
function exerciseRulesHTML(ex){
  if(!ex.dose)return '';
  const group=ex.prescription_credit?.group,frequency=group?APP.program.prescription_groups[group]:null,retired=ex.id==='bilateral_tiptoe_static'&&now()>=staticMaintenanceFrom();
  return `<details class="exercise-rules"><summary>Правила и расписание</summary>
    <div class="kv"><b>Откуда взялся объём</b><span>${ex.frequency_basis==='clinician_prescribed'?'Домашнее назначение реабилитолога. Текущий объём учитывает выполнения и реакцию.':'Начальный объём приложения; домашняя частота не назначалась очно. Текущий объём уточняется по переносимости.'}</span></div>
    ${ex.dose.sides===2?'<p>Подходы и повторения указаны для каждой ноги отдельно. Между силовыми подходами — две минуты отдыха.</p>':''}
    <div class="kv"><b>Как часто</b><span>${retired?'Обязательная ежедневная статика завершена. Один разминочный блок 10×5 секунд входит в выбранное силовое занятие; отдельно повторять трижды за день не нужно.':frequency?`${frequency.target_per_day}–${frequency.max_per_day} раза в день в группе назначения. ${frequency.target_per_day} зачтённых выполнения закрывают дневной минимум.`:'Дополнительное занятие подбирает приложение: до 3 занятий за 7 дней с днём между ними и конечным объёмом на занятие. Это ритм программы приложения, не измерение восстановления.'}</span></div>
    ${group&&!retired?`<div class="kv"><b>Зачёт сегодня</b><span>${planCounts()[group]||0}/${dailyTarget(ex)} · ${EX.filter(x=>x.prescription_credit?.group===group).length>1?'Варианты делят одну дневную цель; переход не создаёт вторую.':'Учитываются объём, техника, перерывы и самочувствие.'}</span></div>`:'<p>Выполненный объём занятия не назначается заново после нормальной оценки, перезагрузки или смены дня. После выраженной реакции остаток не нужно наверстывать.</p>'}
    <div class="kv"><b>${group?'Перерыв между выполнениями':'Остаток дополнительного занятия'}</b><span>${group?`Не меньше ${ex.min_rest_minutes||0} мин. Похожая нагрузка и самочувствие могут увеличить ожидание.`:'Отдельный таймер между частями не задан. Приложение учитывает самочувствие и похожую нагрузку; новое занятие следует ритму программы.'}</span></div>
    ${ex.progression?.notes?`<p>${esc(ex.progression.notes)}</p>`:''}${ex.activation_rule&&!['single_leg_calf_raise','weighted_calf_raise'].includes(ex.id)?`<p>${esc(ex.activation_rule)}</p>`:''}
    <p>Приложение учитывает боль, отёк, устойчивость, качество и реакцию следующим утром. Неблагоприятная реакция ограничивает новые предложения; выполненная работа остаётся в истории.</p>
    <p>Боль от 5/10, отёк или подламывание ставят предложения на паузу. Боль 3–4/10, ухудшение, шаткость или потеря техники ограничивают нагрузку. Слабая общая реакция до 1/10 без других признаков сохраняет дозу и откладывает повышение. Это пороги приложения, не медицинские нормативы.</p>
    ${ex.source==='home_equipment_variant'?'<p>Другое оборудование учитывается отдельно: освоение балансборда не подтверждает освоение полусферы.</p>':''}
  </details>`;
}
function exerciseEvidenceHTML(ex,suggested){
  const evidence=suggested.evidence;if(!evidence)return '';
  return `<details class="exercise-rules"><summary>Связанный тест · ${evidence.capacity} ${esc(evidence.test.unit_short)} · ${fmtDate(evidence.log.ts)}</summary>
    <p>${evidence.capacity===testCap(evidence.test)?'Достигнута граница теста; максимум неизвестен. ':''}Трудность: ${esc({easy:'легко',normal:'посильно',hard:'тяжело',unknown:'не отмечена'}[evidence.log.difficulty||'unknown'])}.</p>
    ${evidence.log.difficulty==null||evidence.log.difficulty==='unknown'||evidence.log.stop_reason==null||evidence.log.stop_reason==='unknown'?'<p>Для перехода уточни трудность и причину остановки в уже выполненном тесте. Повторять тест для исправления записи не нужно.</p>':''}
    <p>${suggested.doseFromTest?'Результат ниже рабочего объёма: выбрана небольшая проба этой карточки, без универсального процента от максимума. Дальше проверяем переносимость.':'Высокий результат не увеличивает дневную дозу автоматически. Повышение — отдельный пробный шаг после проверки качества и восстановления.'}</p>
    <button class="btn ghost" onclick="AM.close('exerciseDialog');AM.openTest('${evidence.test.id}','${evidence.log.id}')">Уточнить запись теста</button></details>`;
}
function exerciseProgressHTML(ex,suggested,variant){
  if(!ex.dose)return '<h4>Следующий этап</h4><p>Объём и ступени этого упражнения пока не заданы.</p>';
  if(suggested.returning){const r=suggested.returning;return `<div class="progress-summary"><div class="source">Возврат прежнего объёма</div><div class="exercise-dose">${esc(doseText(ex,r.dose))}${sameDose(r.dose,r.goal)?'':' → '+esc(doseText(ex,r.goal))}</div><b>${r.days}/2 полных переносимых дней</b></div>${suggested.status!=='normal'?'<p>'+esc(suggested.reason)+'</p>':''}${suggested.trial?`<p><b>Выбран следующий шаг: ${esc(doseText(ex,suggested.trial))}</b></p>`:''}<p>Для шага нужны два разных дня по три зачтённых выполнения этой дозы с обычными перерывами и известной нормальной реакцией следующим утром. Приемлемая техника и посильное усилие подходят. Недельные 70% нужны для нового роста, возврат их не требует.</p><p>Одно изменение за день. На время возврата новые варианты и усложнения ждут; выполненная работа сохраняется.</p>${exerciseEvidenceHTML(ex,suggested)}`;}
  if(ex.progression?.type==='none')return '<h4>Сохраняем назначенный объём</h4><p>Для этого упражнения повышение объёма не предусмотрено. Ориентир — регулярное комфортное выполнение по назначению.</p>'+exerciseEvidenceHTML(ex,suggested);
  const progress=exerciseProgress(ex),working=progress.working,key=doseKey(ex),option=doseOptions[ex.id];
  const next=EXMAP[ex.progression?.next_exercise_id];
  const nextProgress=next&&exerciseProgress(next),nextComplete=nextProgress?.confirmed&&homeRamp(next,nextProgress,now(),unprescribedFrequency(next)?null:working).complete;
  const canGrow=!!suggested.trial||!!variant||next&&!nextComplete||!homeRamp(ex,progress).complete||ex.progression?.type==='weighted_strength'||option&&!['weight_distribution','weight_kg'].includes(option.key)&&working[option.key]!==option.values.at(-1)[0]||key&&working[key]<doseCeiling(ex,working);
  const required=progressConfirmations(ex,progress.confirmed),recent=progress.run.filter(l=>now()-l.ts<=30*DAY).slice(-required),submaximal=strengthExercise(ex)||ex.progression?.type==='pogo_ladder',easy=recent.filter(l=>submaximal?confirmedSafe(l)&&l.difficulty!=='hard'&&l.technique==='good'&&l.fatigue!=='high':confirmedEasy(l)).length;
  const adherence=progressionAdherence(),evidence=suggested.evidence;
  const testPassed=next&&evidence&&evidence.capacity>=testCap(evidence.test)&&testSupportsProgression(evidence)&&evidence.log.stop_reason==='cap';
  const current=currentSymptoms(),recovered=!safetyFlag()&&dailyLoadPlan(ex).status==='normal'&&(!current||responseLevel(current)==='normal'&&current.fatigue!=='high'&&!(current.generalFatigue==='high'&&startOfDay(current.ts)===startOfDay()));
  const checks=[
    {passed:!!testPassed||progress.confirmed&&easy===required,text:testPassed?'Качество базового варианта подтверждено связанным тестом':`${submaximal?'Переносимые занятия без предельного усилия':'Лёгкие выполнения'} с хорошей техникой и известной нормальной реакцией утром: ${easy}/${required} за последние 30 дней. Объём одинаковый, дни разные.`},
    {passed:adherence.allowed,text:adherence.reason},
    {passed:recovered,text:recovered?'Текущее самочувствие допускает повышение.':'Повышение ждёт нормального самочувствия и восстановления. '+dailyLoadPlan(ex).reason}
  ];
  const adverse=lastAdverseExercise(ex,now()),nextAdverse=next&&lastAdverseExercise(next,now());
  if(!recoveredAfter(progress,adverse,now()))checks.push({passed:false,text:'После реакции нужны новые подтверждения переносимости в разные дни. Прежний рабочий уровень сохранён; сегодня выполняем предложенный облегчённый вариант.'});
  if(nextAdverse&&!recoveredAfter(exerciseProgress(next),nextAdverse,now())&&!recoveredAfter(progress,nextAdverse,now()))checks.push({passed:false,text:'После неудачной пробы следующего варианта сначала заново подтверждаем обычную ходьбу. Нормальная общая оценка сама по себе не возвращает разрешение на переход.'});
  if(next&&maxPerDayReached(next))checks.push({passed:false,text:'На сегодня достигнут предел следующего варианта. Оставшуюся общую цель выполняем обычной ходьбой с прежним объёмом и перерывами.'});
  if(evidence&&evidence.log.ts>(recent.at(-1)?.ts||0)&&!testSupportsProgression(evidence))checks.push({passed:false,text:'Нужно уточнить трудность, причину остановки и нормальную реакцию следующим утром после связанного теста.'});
  if(suggested.doseFromTest&&!variant)checks.push({passed:false,text:'Связанный тест ниже рабочего объёма. Перед повышением объёма нужно подтвердить переносимость предложенной меньшей дозы.'});
  const session=evidence&&state.assessment_sessions.find(s=>s.test_log_ids.includes(evidence.log.id));
  if(next&&session&&(session.pain_after>=3||session.swelling||session.instability||session.same_day_response==='worse'||session.next_day_response==='worse'))checks.push({passed:false,text:'В сессии связанного теста отмечена неблагоприятная реакция. Условие перехода к следующему варианту пока не выполнено.'});
  if(next&&!['active','available'].includes(state.exerciseStatuses[next.id]))checks.push({passed:false,text:'Следующий вариант пока не доступен в программе; автоматического открытия нет.'});
  return `<div class="progress-summary"><div class="source">Рабочий объём</div><div class="exercise-dose">${esc(doseText(ex,working))}</div>
    <b>${progress.confirmedDays}/3 подтверждений в разные дни</b><div class="confirmation-days" aria-hidden="true">${[1,2,3].map(n=>`<i class="${n<=progress.confirmedDays?'done':''}"></i>`).join('')}</div>
    <div class="li-meta">${progress.confirmed?'Этот объём уже был подтверждён. Для нового повышения проверяем недавние выполнения и восстановление.':'Для подтверждения учитываем качество и известную реакцию следующим утром. Выполнения в один день не заменяют разные дни.'}</div></div>
    <h4 style="margin-top:22px">${suggested.trial||variant?'Можно попробовать следующий шаг':canGrow?'Что осталось до следующего шага':'Текущая задача освоена'}</h4>
    ${suggested.trial&&!variant?`<div class="notice"><b>Пробный шаг: ${esc(doseText(ex,suggested.trial))}</b><p>${doseVolume(suggested.trial)>doseVolume(working)?'Изменение объёма: +'+Math.round((doseVolume(suggested.trial)/doseVolume(working)-1)*100)+'%.':doseVolume(suggested.trial)<doseVolume(working)?'Изменение объёма: '+Math.round((doseVolume(suggested.trial)/doseVolume(working)-1)*100)+'%; меняются условия задачи.':'Меняются условия задачи; численный объём прежний.'} Приложение выбрало эту пробу для следующего планового выполнения. Рабочий уровень изменится после подтверждения переносимости.</p></div>`:''}
    ${variant?`<div class="notice" style="margin-top:12px"><b>Выбрано приложением: ${esc(variant.ex.name)} · ${esc(doseText(variant.ex,recommendedDose(variant.ex).dose))}</b><p>${ex.progression?.type==='unlock_next'?'По указанию реабилитолога после освоения обычной линии переходим на носки. ':'Текущий вариант освоен. '}Новый вариант проверяем по его собственной дозе и истории. Дневная цель остаётся общей; дополнительное выполнение не добавляется.</p>${variant.after>now()?`<div>Ближайшее выполнение — не раньше ${fmtTime(variant.after)}.</div>`:''}</div>`:''}
    ${canGrow?`<ul class="progress-checks">${checks.map(c=>`<li><span class="check-mark ${c.passed?'passed':''}" aria-label="${c.passed?'Выполнено':'Осталось'}">${c.passed?'✓':'○'}</span><span>${esc(c.text)}</span></li>`).join('')}</ul>${!suggested.trial&&!variant?`<p>${esc(suggested.reason)}</p>`:''}`:`<details><summary>Качество и восстановление</summary><ul class="progress-checks">${checks.map(c=>`<li><span class="check-mark ${c.passed?'passed':''}">${c.passed?'✓':'○'}</span><span>${esc(c.text)}</span></li>`).join('')}</ul></details><p>${ex.id==='bilateral_tiptoe_static'?'Исходное назначение восстановлено. Дальше развиваем одноногие динамические подъёмы и силу; после переносимого полного дня и трёх силовых занятий частая статика станет одним разминочным блоком перед силой.':'Сохраняем короткую освоенную практику. Следующую развиваемую задачу выбирает программа; бесконечного роста повторов здесь нет.'}</p>`}
    ${exerciseEvidenceHTML(ex,suggested)}<p class="source">Подтверждения, регулярность от 70% и ступени объёма — правила приложения, не оценка заживления и не разрешение на бег.</p>`;
}
function exerciseHistoryHTML(ex){
  const logs=state.logs.filter(l=>l.exerciseId===ex.id&&l.ts<=now()).sort((a,b)=>a.ts-b.ts);
  if(!logs.length)return '<div class="empty"><div style="font-size:28px;color:var(--blue);margin-bottom:12px" aria-hidden="true">↗</div><h4>Здесь будет твоя история</h4><p>После первого выполнения появятся объём, календарь занятий и реакция на нагрузку.</p></div>';
  const days=Array.from({length:14},(_,i)=>{const d=new Date(startOfDay());d.setDate(d.getDate()-13+i);return +d;});
  const current=logs.filter(l=>l.actualDose&&l.actualDose.type===ex.dose?.type&&Number.isFinite(doseVolume(l.actualDose))),volumes=days.map(day=>current.filter(l=>startOfDay(l.ts)===day).reduce((sum,l)=>sum+doseVolume(l.actualDose),0));
  const unit={duration:'сек',duration_sets:'сек',hold_reps:'сек',steps:'шагов',cycles:ex.dose?.front_hold_sec?'сек':'циклов',directional_rounds:'направлений',reps_sets:'повторений',directional_reps:'повторений',passes:'проходов'}[ex.dose?.type]||'ед.';
  const max=Math.max(1,...volumes),trainingDays=new Set(logs.map(l=>startOfDay(l.ts))).size;
  const calendar=days.map(day=>{const entries=logs.filter(l=>startOfDay(l.ts)===day);return {day,count:entries.length,status:!entries.length?'':entries.some(l=>responseLevel(exerciseResponse(l))!=='normal')?'reaction':entries.every(l=>confirmedSafe(l))?'trained':'pending'};});
  const calendarLabels={'':'нет записей',reaction:'есть реакция',trained:'утро подтверждено',pending:'утро не подтверждено'};
  const entry=l=>{const response=exerciseResponse(l),level=responseLevel(response),safe=confirmedSafe(l),label=level!=='normal'?'Есть реакция':safe?'Утро подтверждено':'Утро не подтверждено';return `<div class="exercise-entry"><div class="exercise-entry-head"><b>${fmtDate(l.ts)} · ${fmtTime(l.ts)}</b><span style="color:${level!=='normal'?'var(--yellow)':safe?'var(--green)':'var(--muted)'}">${label}</span></div><p style="margin:7px 0 4px">${l.actualDose?esc(doseText(ex,l.actualDose)):'Объём не записан'}${l.additionalPlanPart?' · часть занятия':''}</p><div class="li-meta">Техника: ${esc({good:'хорошая',ok:'приемлемая',poor:'терял контроль'}[l.technique]||'не отмечена')} · ${esc({easy:'легко',normal:'посильно',hard:'тяжело'}[l.difficulty]||'трудность не отмечена')}<br>Боль после: ${l.painAfter==null?'не отмечена':esc(l.painAfter)+'/10'} · утром: ${esc(responseNames[response.morning]||'не отмечено')}${l.comment?'<br>'+esc(l.comment):''}</div><button class="btn ghost" onclick="AM.close('exerciseDialog');AM.openSymptoms('${l.id}')">Уточнить реакцию</button></div>`;};
  return `<div class="exercise-history-metrics"><div><b>${logs.length}</b><span>выполнений<br>за всё время</span></div><div><b>${trainingDays}</b><span>дней<br>с практикой</span></div><div><b>${logs.filter(l=>confirmedSafe(l)).length}</b><span>выполнений<br>с подтверждённым утром</span></div></div>
    <h4>Объём за 14 дней</h4><div class="li-meta">${unit}, суммарно за день · нажми на столбик</div>
    <div class="exercise-history-chart" role="group" aria-label="Объём за 14 дней">${days.map((d,i)=>`<button type="button" class="exercise-history-day" aria-pressed="false" aria-label="${fmtDate(d)}: ${volumes[i]} ${unit}" title="${fmtDate(d)}: ${volumes[i]} ${unit}" onclick="AM.exerciseHistoryDay(this)"><span class="exercise-history-bar ${volumes[i]?'':'empty-day'}" style="height:${volumes[i]?Math.max(3,volumes[i]/max*100):2}%"></span></button>`).join('')}</div>
    <div class="exercise-chart-caption"><span>${fmtDate(days[0])}</span><span id="exerciseChartSelection" aria-live="polite">Макс. ${Math.max(...volumes)} ${unit}</span><span>Сегодня</span></div>
    <p class="source">Объём не измеряет качество или восстановление. Помощь, амплитуда и распределение веса указаны в записях.${logs.some(l=>!current.includes(l))?' Старые или неизвестные единицы сохранены ниже и не смешиваются на графике.':''}</p>
    <h4 style="margin-top:24px">Практика и реакция</h4><div class="exercise-calendar" role="img" aria-label="${esc('Практика за 14 дней: '+calendar.map(d=>fmtDate(d.day)+' — '+d.count+', '+calendarLabels[d.status]).join('; '))}">${calendar.map((d,i)=>`<span class="${d.status} ${i===13?'today':''}" title="${fmtDate(d.day)}: ${d.count} выполнений · ${calendarLabels[d.status]}"></span>`).join('')}</div><div class="exercise-history-legend"><span><i style="background:#398c75"></i>Утро подтверждено</span><span><i style="background:#527d9b"></i>Утро не подтверждено</span><span><i style="background:#ceaa60"></i>Есть реакция</span></div>
    <h4 style="margin-top:26px">Последние выполнения</h4>${logs.slice(-6).reverse().map(entry).join('')}${logs.length>6?`<details><summary>Ранние записи · ${logs.length-6}</summary>${logs.slice(0,-6).reverse().map(entry).join('')}</details>`:''}<p class="source">Поздняя реакция может относиться к нескольким нагрузкам за день; она не устанавливает причину симптомов.</p>`;
}
function exerciseHistoryDay(button){
  document.querySelectorAll('.exercise-history-day').forEach(day=>day.setAttribute('aria-pressed',String(day===button)));
  document.getElementById('exerciseChartSelection').textContent=button.getAttribute('aria-label');
}
function exerciseTab(name,focus=false){
  for(const id of ['technique','progress','history']){
    const tab=document.getElementById('exercise-tab-'+id),active=id===name;
    tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    document.getElementById('exercise-panel-'+id).hidden=!active;
    if(active&&focus)tab.focus();
  }
  document.getElementById('exerciseDialog').scrollTop=0;
}
function exerciseTabKey(event){
  const tabs=['technique','progress','history'],index=tabs.indexOf(event.target.dataset.exerciseTab);
  const next=event.key==='ArrowRight'?(index+1)%3:event.key==='ArrowLeft'?(index+2)%3:event.key==='Home'?0:event.key==='End'?2:null;
  if(next!=null){event.preventDefault();exerciseTab(tabs[next],true);}
}
function openExercise(id){
  const ex=EXMAP[id];if(!ex)return;
  const st=state.exerciseStatuses[id],rec=scoreExercise(ex),until=postponedUntil('exercise',id),suggested=recommendedDose(ex),variant=nextVariant(ex),visual=exerciseVisuals[id]||{color:'#78dbb4',label:ex.name};
  const action=homeVariantChoice(ex).ex,actionPlan=action.id===id?suggested:recommendedDose(action),change=exerciseChangeNotice(action,actionPlan.dose,now(),actionPlan.transitionFrom);
  document.getElementById('exerciseDialog').classList.toggle('load-change',!!change);
  if(suggested.trial){recordDecision('trial_offered',suggested.reason,{exerciseId:id,working:suggested.working,trial:suggested.trial},now(),'offer:'+id+':'+JSON.stringify(suggested.trial)+':'+exerciseProgress(ex).run.map(l=>l.id).join(','));localStorage.setItem(KEY,JSON.stringify(state));}
  if(variant&&action.id===variant.ex.id){recordDecision('variant_offered',suggested.reason,{exerciseId:id,relatedExerciseIds:[action.id],working:suggested.working,targets:{[action.id]:recommendedDose(action).dose}},now(),'variant:'+id+':'+action.id+':'+exerciseProgress(ex).run.map(l=>l.id).join(','));localStorage.setItem(KEY,JSON.stringify(state));}
  const instructions=ex.instructions?.length?ex.instructions:extraTechnique[id]?.steps||[];
  const statusActions=st==='available'?`<button class="btn primary" onclick="AM.activateExercise('${id}')">Добавить в программу</button>`:st==='active'?`<button class="btn ghost" onclick="AM.archiveExercise('${id}')">Убрать из активных</button>`:'';
  document.getElementById('exerciseModal').innerHTML=`
    <div class="exercise-detail-head"><div class="exercise-picture" style="--exercise-color:${visual.color}">${exerciseArt(ex)}</div><div><div class="source">${esc(sourceLabels[ex.source]||ex.source)}</div><h3 id="exerciseTitle">${esc(ex.name)}</h3></div><button class="x" aria-label="Закрыть упражнение" onclick="AM.close('exerciseDialog')">×</button></div>
    <div class="exercise-overview">${changeNoticeHTML(change)}${ex.dose?`<div class="exercise-dose">Сейчас: ${esc(doseText(ex,suggested.dose))}</div><div class="li-meta">${esc(suggested.returning&&suggested.status==='normal'?'Возврат к прежней дозе: '+doseText(ex,suggested.returning.goal):suggested.reason||'Начальный объём; дальше учитываем выполнения и реакцию')}</div>`:'<div class="notice">Следующий этап · протокол и объём пока не заданы</div>'}
      ${until?`<div class="exercise-state">Отложено до ${fmtDate(until)} ${fmtTime(until)} <button class="btn ghost" onclick="AM.resumeAction('exercise','${id}');AM.openExercise('${id}')">Вернуть в рекомендации</button></div>`:st==='active'?`<div class="exercise-state"><b>${rec.score<0||rec.status==='red'?'Почему сейчас не предлагается':'Почему предлагается'}:</b> ${esc(rec.score<0||rec.status==='red'?exercisePauseReason(ex,rec):suggested.returning?rec.reasons[0]:rec.reasons.join(' · '))}</div>`:`<div class="exercise-state">${esc(statusLabels[st])}${ex.activation_rule?' · '+esc(ex.activation_rule):''}</div>`}</div>
    <div class="exercise-tabs" role="tablist" aria-label="Об упражнении" onkeydown="AM.exerciseTabKey(event)">${[['technique','Техника'],['progress','Прогресс'],['history','История']].map(([tab,label])=>`<button type="button" role="tab" id="exercise-tab-${tab}" data-exercise-tab="${tab}" aria-controls="exercise-panel-${tab}" aria-selected="${tab==='technique'}" tabindex="${tab==='technique'?0:-1}" onclick="AM.exerciseTab('${tab}')">${label}</button>`).join('')}</div>
    <section class="exercise-panel" id="exercise-panel-technique" role="tabpanel" aria-labelledby="exercise-tab-technique"><h4>Как выполнять</h4>${instructions.length?`<ol class="technique-steps">${instructions.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'<p>Подробная техника пока не добавлена. Этот вариант требует отдельного согласования; автоматической активации нет.</p>'}
      ${extraTechnique[id]?`<p class="source">Общее описание техники: <a href="${extraTechnique[id].url}" target="_blank" rel="noopener" style="color:var(--blue)">${extraTechnique[id].source}</a>. Справочное описание; упражнение добавляется в программу вручную.</p>`:''}
      <div class="tags">${(ex.primary_skills||[]).map(s=>`<span class="tag">${esc(skillLabels[s]||s)}</span>`).join('')}</div>
      ${ex.dose?`<div class="exercise-facts"><div class="exercise-fact">${ex.prescription_credit?.group?'Минимальный перерыв':'Остаток занятия'}<b>${ex.prescription_credit?.group?ex.min_rest_minutes+' мин':'По самочувствию'}</b></div><div class="exercise-fact">Ритм работы<b>${ex.prescription_credit?.group?'Домашнее назначение':'Дополнительное занятие'}</b></div></div>`:''}
      ${ex.equipment?.length?`<p><b>Что понадобится</b><br>${ex.equipment.map(e=>esc(equipmentLabels[e]||e)).join(' · ')}</p>`:ex.id.startsWith('towel_')?'<p><b>Что понадобится</b><br>Полотенце</p>':''}
      ${ex.solo_alternative?`<p><b>Без партнёра</b><br>${esc(ex.solo_alternative)}</p>`:''}${exerciseRulesHTML(ex)}
      ${st==='active'?`<details class="exercise-rules"><summary>Управление упражнением</summary><p>История сохранится после удаления из активных.</p>${statusActions}</details>`:''}</section>
    <section class="exercise-panel" id="exercise-panel-progress" role="tabpanel" aria-labelledby="exercise-tab-progress" hidden>${exerciseProgressHTML(ex,suggested,variant)}</section>
    <section class="exercise-panel" id="exercise-panel-history" role="tabpanel" aria-labelledby="exercise-tab-history" hidden>${exerciseHistoryHTML(ex)}</section>
    <div class="exercise-footer">${st==='active'&&ex.dose?`<button class="btn primary" onclick="AM.close('exerciseDialog');AM.openLog('${action.id}')">${action.id!==id?(action.id==='tandem_walk_tiptoe'?'Записать выбранную пробу на носках':'Записать обычную ходьбу'):suggested.selectedTrial?'Записать пробный шаг':'Записать выполнение'}</button>${unprescribedFrequency(ex)?'<button class="btn secondary" onclick="AM.close(\'exerciseDialog\');AM.openAdditionalPlan()">План занятия</button>':''}`:st==='available'?statusActions:''}</div>`;
  showDialog('exerciseDialog');
  document.getElementById('exerciseDialog').scrollTop=0;
}
let suggestedForLog=null;
const steadinessNames={steady:'Устойчива',shaky:'Менее уверенная / шаткая',giving_way:'Подламывается / подворачивается'};
function steadinessField(id,value='steady'){
  return `<div class="field"><label for="${id}">Устойчивость лодыжки</label><select id="${id}">${Object.entries(steadinessNames).map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${v}</option>`).join('')}</select></div>`;
}
function logChoiceField(id,label,options,value){
  if(options.length>=5)return `<div class="field"><label for="${id}">${esc(label)}</label><select id="${id}" ${id==='doseOption'?'onchange="AM.doseChanged()"':''}>${options.map(([v,n])=>`<option value="${v}" ${v===value?'selected':''}>${esc(n)}</option>`).join('')}</select></div>`;
  return `<fieldset class="field log-choice"><legend>${esc(label)}</legend><div class="log-options" ${id==='doseOption'?'onchange="AM.doseChanged()"':''}>${options.map(([v,n])=>`<label><input type="radio" id="${id}_${v}" name="${id}" value="${v}" ${v===value?'checked':''}><span>${esc(n)}</span></label>`).join('')}</div></fieldset>`;
}
function logChoiceValue(id){
  return document.querySelector(`input[name="${id}"]:checked`)?.value||document.getElementById(id)?.value||'';
}
function rememberLogWellbeing(open){
  if(state.settings.logWellbeingOpen===open)return;
  state.settings.logWellbeingOpen=open;
  localStorage.setItem(KEY,JSON.stringify(state));
}
function openLog(id,useTrial=false){
  const ex=EXMAP[id];if(!ex)return;
  const plan=recommendedDose(ex),dose=useTrial===true&&plan.trial?plan.trial:plan.dose,trial=useTrial===true&&!!plan.trial||!!plan.selectedTrial;
  const change=exerciseChangeNotice(ex,dose,now(),plan.transitionFrom);
  document.getElementById('logDialog').classList.toggle('load-change',!!change);
  const previous=exerciseProgress(ex).logs.slice(-1)[0]?.doseReason;
  suggestedForLog={id,dose,kind:trial?'trial':plan.status==='light'?'daily_load':plan.doseFromTest?'test':!sameDose(dose,plan.working)&&['trial','calibration','test'].includes(previous)?previous:sameDose(dose,plan.working)?'capacity':'recovery'};
  if(plan.returning&&plan.status!=='light')suggestedForLog.kind='return';
  suggestedForLog.transitionFrom=plan.transitionFrom;
  if(plan.reentry)suggestedForLog.kind='trial';
  const entry=unprescribedFrequency(ex)&&additionalPlanState(ex);
  if((entry?.automaticPreview?.trialIds||state.additionalPlan?.trialIds||[]).includes(id))suggestedForLog.kind='trial';
  suggestedForLog.additionalPreview=entry?.automaticPreview||null;
  if(useTrial!==true&&plan.status==='normal'&&entry?.used>0&&sameDose(dose,entry.dose))suggestedForLog.kind='planned_remainder';
  const option=doseOptions[id],last=state.logs.filter(l=>l.exerciseId===id&&l.ts<=now()).sort((a,b)=>a.ts-b.ts).slice(-1)[0];
  const rememberedOption=option&&last?.actualDose?.[option.key],proposedOption=trial||last?.actualDose?.type===dose.type?dose[option?.key]:rememberedOption;
  const optionValue=option&&(option.values.some(([v])=>v===proposedOption)?proposedOption:option.values.some(([v])=>v===dose[option.key])?dose[option.key]:option.values[0][0]);
  document.getElementById('logModal').innerHTML=`
    <div class="modal-head"><div><div class="source">${plan.returning?'Возврат прежнего объёма':trial?'Пробный шаг':'Запись выполнения'}</div><h3>${esc(ex.name)}</h3></div><button class="x" onclick="AM.close('logDialog')">×</button></div>
    ${changeNoticeHTML(change)}
    <div class="notice">Предложено: <b>${esc(doseText(ex,dose))}</b><br>${esc(plan.reason)}</div>
    <div class="section-title"><h4>Сколько сделал?</h4></div>
    ${(doseFields[ex.dose?.type]||[]).map(([key,label],i)=>`${i===1?'<details><summary>Уточнить удержание / подходы</summary>':''}<div class="field"><label for="dose_${key}">${label}</label><input id="dose_${key}" type="number" inputmode="numeric" min="1" max="10000" step="1" value="${dose[key]||1}" oninput="AM.doseChanged()"></div>${i>0&&i===doseFields[ex.dose.type].length-1?'</details>':''}`).join('')}
    ${option?.key==='weight_kg'?`<div class="field"><label for="weightKg">Фактический груз, кг</label><input id="weightKg" type="number" min="0.1" step="0.1" value="${esc(dose.weight_kg||last?.actualDose?.weight_kg||1)}"></div>`:option?logChoiceField('doseOption',option.label,option.values,optionValue):''}
    ${logChoiceField('difficultySel','Как дался объём?',[['normal','Посильно'],['easy','Легко, есть запас'],['hard','Тяжело, без запаса']],last?.difficulty)}
    ${logChoiceField('techSel','Качество движений',[['good','Хорошее'],['ok','Приемлемое'],['poor','Терял контроль']],last?.technique)}
      <div class="field" id="volumeReason" style="display:none"><label for="doseReason">Почему выбран такой объём?</label><select id="doseReason">${[['capacity','Подходит моим возможностям'],['daily_load','Меньше из-за общей нагрузки сегодня'],['time','Не хватило времени'],['recovery','Облегчение после реакции'],['return','Возвращаю прежний объём'],['trial','Пробую следующий шаг'],['test','Объём по результату теста'],...(suggestedForLog.kind==='planned_remainder'?[['planned_remainder','Остаток выбранного занятия']]:[]),...(suggestedForLog.kind==='calibration'?[['calibration','Объём по результату теста']]:[])].map(([v,n])=>`<option value="${v}" ${v===suggestedForLog.kind?'selected':''}>${n}</option>`).join('')}</select></div>
    <details id="logWellbeing" ${state.settings.logWellbeingOpen!==false?'open':''} ontoggle="AM.rememberLogWellbeing(this.open)"><summary>Самочувствие после выполнения</summary>
      <div class="field"><label for="painBefore">Боль до упражнения, 0–10</label><input id="painBefore" type="number" min="0" max="10" value="${currentSymptoms()?.pain||0}"></div>
      <div class="field"><label for="painDuring">Боль во время, 0–10</label><input id="painDuring" type="number" min="0" max="10" value="${currentSymptoms()?.pain||0}"></div>
      <div class="field"><label for="painAfter">Боль сейчас после всех нагрузок, 0–10</label><input id="painAfter" type="number" min="0" max="10" value="${currentSymptoms()?.pain||0}"></div>
      ${logChoiceField('logSteadiness','Устойчивость лодыжки',Object.entries(steadinessNames),last?.steadiness||(typeof last?.instability==='boolean'?(last.instability?'giving_way':'steady'):currentSymptoms()?.steadiness||'steady'))}
      ${logChoiceField('fatigueSel','Местная усталость голеностопа / икр сейчас',['low','medium','high'].map(k=>[k,fatigueNames[k]]),last?.fatigue||currentSymptoms()?.fatigue||'low')}
      <label class="notice"><input type="checkbox" id="outerPain"> Боль у наружной лодыжки</label>
      <label class="notice" style="display:block;margin-top:10px"><input type="checkbox" id="swelling" ${currentSymptoms()?.swelling?'checked':''}> Новый/усилившийся отёк</label>

      <div class="field"><label for="comment">Комментарий</label><textarea id="comment" placeholder="необязательно"></textarea></div>
    </details>
    <div class="modal-actions"><button class="btn primary" onclick="AM.saveLog('${id}')">Сохранить</button></div>`;
  showDialog('logDialog');
  doseChanged();
}
function doseChanged(){
  if(!suggestedForLog)return;
  const ex=EXMAP[suggestedForLog.id],changed=(doseFields[ex.dose.type]||[]).some(([k])=>Number(document.getElementById('dose_'+k).value)!==suggestedForLog.dose[k]);
  const option=doseOptions[ex.id],variant=option&&logChoiceValue('doseOption')!==(suggestedForLog.dose[option.key]||option.values[0][0]);
  document.getElementById('volumeReason').style.display=changed||variant?'block':'none';
}
function saveLog(id){
  const ex=EXMAP[id],dose={...ex.dose};
  for(const [key] of doseFields[ex.dose?.type]||[])dose[key]=Number(document.getElementById('dose_'+key).value);
  const option=doseOptions[id];if(option)dose[option.key]=option.key==='weight_kg'?String(Number(document.getElementById('weightKg').value)):logChoiceValue('doseOption');
  const steadiness=logChoiceValue('logSteadiness');
  const pains=['painBefore','painDuring','painAfter'].map(k=>Number(document.getElementById(k).value));
  if(pains.some(v=>!Number.isFinite(v)||v<0||v>10))return toast('Укажи боль от 0 до 10');
  if(!logChoiceValue('difficultySel')||!logChoiceValue('techSel'))return toast('Отметь трудность и качество выполнения');
  let log;
  try{log=recordExercise(id,dose,{
    painBefore:pains[0],painDuring:pains[1],painAfter:pains[2],doseReason:document.getElementById('doseReason').value||suggestedForLog?.kind||'capacity',
    fatigue:logChoiceValue('fatigueSel'),technique:logChoiceValue('techSel'),
    symptomScope:'combined',transitionFrom:suggestedForLog?.id===id?suggestedForLog.transitionFrom:null,
    phase:'after',difficulty:logChoiceValue('difficultySel'),steadiness,instability:steadiness==='giving_way',
    localOuterAnklePain:document.getElementById('outerPain').checked,
    swelling:document.getElementById('swelling').checked,comment:document.getElementById('comment').value.trim()
  },now(),suggestedForLog?.id===id?suggestedForLog.dose:suggestedDose(ex).dose,suggestedForLog?.additionalPreview);}catch(e){return toast(e.message);}
  closeDialog('logDialog');save();
  toast(responseLevel(exerciseResponse(log))!=='normal'?'Записано. Следующая нагрузка адаптирована.':'Фактический объём записан ✓');
}

function generalFatigueField(id){
  return `<div class="field"><label for="${id}">Общая усталость / недосып</label><select id="${id}"><option value="unknown">Не отмечаю</option><option value="low">Небольшая</option><option value="medium">Умеренная</option><option value="high">Сильная</option></select></div>`;
}
function openSymptoms(logId=null){
  const l=state.logs.find(x=>x.id===logId),r=l?exerciseResponse(l):currentSymptoms()||{};
  const recent=state.logs.filter(x=>now()-x.ts<DAY||x.id===logId).sort((a,b)=>b.ts-a.ts);
  document.getElementById('symptomsModal').innerHTML=`<div class="modal-head"><h3>${l?'Реакция после упражнения':'Как лодыжка сейчас?'}</h3><button class="x" onclick="AM.close('symptomsDialog')">×</button></div>
    <div class="field"><label for="symptomContext">После чего заметил?</label><select id="symptomContext"><option value="unknown">Не знаю причину</option><option value="combined">После нескольких нагрузок</option>${recent.map(x=>`<option value="${x.id}" ${x.id===logId?'selected':''}>${esc(EXMAP[x.exerciseId]?.name||'Упражнение')} · ${fmtTime(x.ts)}</option>`).join('')}</select></div>
    <div class="field"><label for="symptomResponse">По сравнению с состоянием до нагрузки</label><select id="symptomResponse"><option value="unknown">Не знаю / просто отмечаю состояние</option><option value="same">Так же</option><option value="better">Лучше</option><option value="worse">Хуже</option></select></div>
    ${steadinessField('symptomSteadiness',r.steadiness||'steady')}
    <div class="field"><label for="symptomPain">Боль сейчас, 0–10</label><input id="symptomPain" type="number" min="0" max="10" value="${r.pain||0}"></div>
    <div class="field"><label for="symptomFatigue">Местная усталость голеностопа / икр</label><select id="symptomFatigue">${['low','medium','high'].map(k=>`<option value="${k}" ${k===(r.fatigue||'low')?'selected':''}>${fatigueNames[k]}</option>`).join('')}</select></div>
    <label class="notice"><input id="symptomSwelling" type="checkbox" ${r.swelling?'checked':''}> Новый/усилившийся отёк</label>
    ${generalFatigueField('symptomGeneralFatigue')}
    <div class="field"><label for="symptomMinutes">Сколько минут назад заметил?</label><input id="symptomMinutes" type="number" min="0" max="1440" value="0"></div>
    <div class="field"><label for="symptomComment">Комментарий</label><textarea id="symptomComment"></textarea></div>
    <div class="notice">Если причина неизвестна, учтём самочувствие для следующих нагрузок без изменения переносимости отдельного упражнения.</div>
    <div class="modal-actions"><button class="btn primary" onclick="AM.saveSymptoms()">Сохранить реакцию</button></div>`;
  showDialog('symptomsDialog');
}
function recordSymptoms(response,context='unknown',ts=now()){
  if(!Number.isFinite(response.pain)||response.pain<0||response.pain>10)throw new Error('Укажи боль от 0 до 10');
  const l=state.logs.find(x=>x.id===context),r={id:makeId('r'),ts,...response,phase:response.phase||'current',context:l?'exercise':context,logId:l?.id||null};
  r.worse=response.response==='worse'||response.worse===true;
  state.symptomReports.push(r);settleAdditionalPlan(ts);
  if(r.worse||r.historyWorse||responseLevel(r)!=='normal'){
    const trials=state.logs.filter(l=>l.doseReason==='trial'&&l.ts<=ts&&(r.logId===l.id||r.phase==='morning'&&morningMatches(r,l.ts)));
    if(trials.length)recordDecision('trial_not_confirmed','После пробы отмечено ухудшение. Повышение не подтверждено; прежний посильный уровень сохранён. Причина реакции на несколько нагрузок неизвестна',{observationId:r.id,trialIds:trials.map(l=>l.id)},ts);
  }
  return r;
}
function saveSymptoms(){
  const minutes=Number(document.getElementById('symptomMinutes').value);
  if(!Number.isFinite(minutes)||minutes<0||minutes>1440)return toast('Проверь время появления');
  try{recordSymptoms({pain:Number(document.getElementById('symptomPain').value),fatigue:document.getElementById('symptomFatigue').value,generalFatigue:document.getElementById('symptomGeneralFatigue').value||'unknown',
    steadiness:document.getElementById('symptomSteadiness').value,swelling:document.getElementById('symptomSwelling').checked,
    response:document.getElementById('symptomResponse').value,painBefore:currentSymptoms()?.pain||0,phase:'current',onset_at:now()-minutes*60000,comment:document.getElementById('symptomComment').value.trim()},document.getElementById('symptomContext').value);}catch(e){return toast(e.message);}
  closeDialog('symptomsDialog');save();toast('Самочувствие учтено в следующих рекомендациях');
}

function openActivity(){
  const presets=APP.custom_activity_logging.presets;
  document.getElementById('activityModal').innerHTML=`
    <div class="modal-head"><h3>Добавить активность</h3><button class="x" onclick="AM.close('activityDialog')">×</button></div>
    <button class="btn secondary" onclick="AM.openRun()">Записать пробежку</button>
    <div class="field"><label>Что делал?</label><select id="activityPreset">
      ${Object.entries(presets).map(([id,p])=>`<option value="${id}">${esc(p.name)}</option>`).join('')}
      <option value="manual">Другая активность</option>
    </select></div>
    <div class="field"><label>Название для другой активности</label><input id="activityName" placeholder="например, игры на пляже"></div>
    <div class="field"><label>Длительность, минут</label><input id="activityMinutes" type="number" value="15" min="1" max="240"></div>
    <div class="field"><label>Интенсивность</label><select id="activityIntensity"><option value="0.7">Лёгкая</option><option value="1" selected>Средняя</option><option value="1.25">Высокая</option></select></div>
    <div class="field"><label>Боль после, 0–10</label><input id="activityPain" type="number" min="0" max="10" value="${currentSymptoms()?.pain||0}"></div><div class="field"><label>После активности</label><select id="activityResponse"><option value="same">Как обычно</option><option value="better">Лучше</option><option value="worse">Хуже</option></select></div>
    <div class="modal-actions"><button class="btn primary" onclick="AM.saveActivity()">Сохранить</button></div>`;
  showDialog('activityDialog');
}
function saveActivity(){
  const id=document.getElementById('activityPreset').value,p=APP.custom_activity_logging.presets[id];
  const mins=Math.max(1,+document.getElementById('activityMinutes').value||15),intensity=+document.getElementById('activityIntensity').value||1;
  let load,name;
  if(p){load={};for(const [k,v] of Object.entries(p.load))load[k]=Math.min(100,v*intensity*Math.min(1.5,mins/15));name=p.name;}
  else{
    name=document.getElementById('activityName').value.trim()||'Другая активность';
    load={calf:35*intensity,ankle_control:25*intensity,dynamic_balance:20*intensity,lateral:15*intensity,impact:0};
  }
  state.customActivities.push({id:'a'+Math.random().toString(36).slice(2),ts:now(),presetId:id,name,minutes:mins,load,response:document.getElementById('activityResponse').value||'unknown',painAfter:+document.getElementById('activityPain').value||0});
  const current=currentSymptoms()||{};
  recordSymptoms({pain:Number(document.getElementById('activityPain').value),response:document.getElementById('activityResponse').value||'unknown',steadiness:current.steadiness||'steady',fatigue:current.fatigue||'low',generalFatigue:current.generalFatigue||'unknown',swelling:!!current.swelling},'combined');
  closeDialog('activityDialog');save();toast('Активность учтена в текущей нагрузке');
}
let activeTest=null;
function openTest(id,logId=null){
  const t=RDCFG.tests.find(x=>x.id===id),editing=state.testLogs.find(l=>l.id===logId);
  if(!t||!editing&&!testAvailable(t))return;
  activeTest={id,logId:editing?.id||null};
  const cap=testCap(t),integer=t.metric!=='seconds'&&t.metric!=='cm',latest=testHistory(t).slice(-1)[0];
  const input=(key,label,value)=>`<div class="field"><label for="${key}">${label} — ${esc(t.unit)}</label><input id="${key}" value="${value??''}" type="number" inputmode="${integer?'numeric':'decimal'}" min="0" ${cap?'max="'+cap+'"':''} step="${integer?'1':'0.1'}" required></div>`;
  const walking=['tandem_flat_clean_steps','tandem_tiptoe_clean_steps'].includes(id);
  document.getElementById('testModal').innerHTML=`
    <div class="modal-head"><h3>${editing?'Исправить результат: ':''}${esc(t.name)}</h3><button class="x" onclick="AM.close('testDialog')">×</button></div>
    ${walking?`<div class="field"><label>Какой вариант выполнен?</label><select onchange="AM.openTest(this.value,${editing?"'"+editing.id+"'":'null'})">${RDCFG.tests.filter(x=>['tandem_flat_clean_steps','tandem_tiptoe_clean_steps'].includes(x.id)).map(x=>`<option value="${x.id}" ${x.id===id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>`:''}
    <div class="notice">${esc(t.what_measures)}${cap?`<br>Верхняя граница: ${cap} ${t.unit_short}; это не обязательно твой максимум.`:''}</div>
    ${latest&&!editing?`<div class="notice">Уже записано: ${esc(resultText(t,latest))} · ${fmtDate(latest.ts)} ${fmtTime(latest.ts)}. Повторная запись означает новое фактическое выполнение.<button class="btn ghost" onclick="AM.openTest('${id}','${latest.id}')">Исправить эту запись</button></div>`:''}
    ${protocolHTML(t)}
    <details><summary>Условия измерения</summary><div class="field"><label for="testConditions">По описанию теста — standard. При другой опоре или оборудовании укажи свои условия; unknown — если неизвестны.</label><input id="testConditions" value="${esc(editing?.conditions||latest?.conditions||'standard')}"></div></details>
    ${t.bilateral?`<div class="split">${input('testLeft','Левая (здоровая)',editing?.left)}${input('testRight','Правая (повреждённая)',editing?.right)}</div>`:input('testValue',t.metric==='clean_steps'?'Чистые шаги':t.metric==='clean_rounds'?'Чистые раунды':'Результат',editing?.value)}
    <div class="field"><label for="testDifficulty">Как дался именно этот тест?</label><select id="testDifficulty">${[['unknown','Не знаю / не помню'],['easy','Легко, оставался запас'],['normal','Посильно'],['hard','Тяжело, без запаса']].map(([v,n])=>`<option value="${v}" ${v===(editing?.difficulty||'unknown')?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label for="testStop">Почему завершил?</label><select id="testStop">${[['unknown','Не знаю / не помню'],...(cap?[['cap','Достиг границы теста, техника сохранялась']]:[]),['quality','Начало ухудшаться качество'],['symptoms','Боль или другие симптомы'],['planned','Завершил раньше, оставался запас']].map(([v,n])=>`<option value="${v}" ${v===(editing?.stop_reason||'unknown')?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label for="testPain">Боль сразу после теста, 0–10 (пусто, если не помнишь)</label><input id="testPain" type="number" min="0" max="10" value="${editing?.pain_after??''}"></div>
    <label class="notice"><input type="checkbox" id="testProtocolConfirmed"> Проверил описание: выполнен именно этот вариант</label>
    <div class="notice" style="margin-top:12px">${t.dose_exercise_id?'Результат, трудность и причина остановки уточняют объём соответствующего упражнения и готовность к следующему варианту. Затем объём адаптируется по обычным выполнениям и самочувствию.':'Этот тест оценивает отдельную способность; прямого пересчёта в объём других упражнений нет.'} Фактическая нагрузка учитывается один раз; дневные выполнения и XP за тест не начисляются.</div>
    <div class="modal-actions"><button class="btn primary" onclick="AM.saveTest('${id}')">${editing?'Сохранить исправление':'Сохранить тест'}</button></div>`;
  const protocol=document.querySelector('#testModal details');if(protocol)protocol.open=true;
  showDialog('testDialog');
}
function editTest(logId,id,values){
  const log=state.testLogs.find(l=>l.id===logId),t=RDCFG.tests.find(t=>t.id===id);
  if(!log||!t||!validMeasurement(t,values))throw new Error('Проверь результат теста');
  const walking=['tandem_flat_clean_steps','tandem_tiptoe_clean_steps'];
  if(id!==log.testId&&!(walking.includes(id)&&walking.includes(log.testId)))throw new Error('Эти протоколы нельзя подменить');
  if(id!==log.testId&&!testAvailable(t))throw new Error('Тест пока недоступен');
  const session=state.assessment_sessions.find(s=>s.test_log_ids.includes(logId));
  (state.testCorrections||=[]).push({at:now(),original:JSON.parse(JSON.stringify(log)),reason:'Исправление пользователем'});
  const cap=testCap(t),capped={...values};
  if(cap)for(const k of t.bilateral?['left','right']:['value'])capped[k]=Math.min(cap,capped[k]);
  Object.assign(log,capped,{testId:id,protocol_id:t.protocol_id});
  const event=state.load_events.find(e=>e.source_id===logId);
  if(event){event.base_channels=testLoad(t,log);event.channels={...event.base_channels};}
  if(session)recalculateSession(session);
  return session;
}
function deleteTest(logId){
  const log=state.testLogs.find(l=>l.id===logId);if(!log||!confirm('Удалить ошибочную запись теста и её нагрузку?'))return;
  (state.testCorrections||=[]).push({at:now(),original:JSON.parse(JSON.stringify(log)),reason:'Удалена ошибочная запись'});
  state.testLogs=state.testLogs.filter(l=>l.id!==logId);
  state.load_events=state.load_events.filter(e=>e.source_id!==logId);
  for(const session of state.assessment_sessions){session.test_log_ids=session.test_log_ids.filter(id=>id!==logId);if(session.test_log_ids.length)recalculateSession(session);}
  state.assessment_sessions=state.assessment_sessions.filter(s=>s.test_log_ids.length);
  save();toast('Запись удалена; расчёты обновлены');
}
function saveTest(id){
  const t=RDCFG.tests.find(x=>x.id===id);if(!t||activeTest?.id!==id)return;
  if(!document.getElementById('testProtocolConfirmed').checked)return toast('Подтверди выполненный вариант по описанию');
  const values={},keys=t.bilateral?[['left','testLeft'],['right','testRight']]:[['value','testValue']];
  for(const [k,inputId] of keys){
    const input=document.getElementById(inputId);
    if(input.value.trim()==='')return toast('Заполни результат с указанными единицами');
    values[k]=Number(input.value);
  }
  const pain=document.getElementById('testPain').value.trim();
  if(pain!==''&&(!Number.isFinite(Number(pain))||Number(pain)<0||Number(pain)>10))return toast('Укажи боль от 0 до 10');
  Object.assign(values,{conditions:document.getElementById('testConditions').value.trim()||'standard',difficulty:document.getElementById('testDifficulty').value,stop_reason:document.getElementById('testStop').value,pain_after:pain===''?null:Number(pain),protocol_confirmed:true});
  if(values.stop_reason==='cap'&&(!testCap(t)||(t.bilateral?Math.min(values.left,values.right):values.value)<testCap(t)))return toast('Граница теста не достигнута; уточни причину остановки');
  let session;const editing=activeTest.logId;
  try{session=editing?editTest(editing,id,values):recordTest(id,values);}catch(e){return toast(e.message);}
  activeTest=null;closeDialog('testDialog');save();
  if(!editing){
    document.querySelector('.tab[data-screen="home"]')?.click();
    document.getElementById('bestNow').scrollIntoView?.({block:'start'});
  }
  toast(editing?'Результат исправлен без нового выполнения':'Тест сохранён. Следующее действие — на главной');
}
function openCheck(id){
  const c=state.delayedChecks.find(x=>x.id===id);if(c)openSymptoms(c.logId);
}
function pendingMorningDays(ts=now()){
  const activities=[...state.logs,...state.customActivities,...state.testLogs].filter(l=>l.ts<=ts&&startOfDay(l.ts)<startOfDay(ts));
  const unchecked=activities.filter(l=>!state.symptomReports.some(r=>r.ts<=ts&&morningMatches(r,l.ts)));
  return [...new Set(unchecked.map(l=>startOfDay(l.ts)))].sort((a,b)=>b-a);
}
function openMorning(day){
  if(day>=startOfDay())return;
  const recent=day===daysAgo(1);
  const knownWorse=state.symptomReports.some(r=>startOfDay(r.ts)===day&&r.phase!=='morning'&&r.worse)||state.logs.some(l=>startOfDay(l.ts)===day&&l.sameDay==='worse')||state.assessment_sessions.some(s=>startOfDay(sessionLastAt(s))===day&&s.same_day_response==='worse');
  document.getElementById('checkModal').innerHTML=`<div class="modal-head"><h3>${recent?'Как лодыжка после вчерашней нагрузки?':'Самочувствие после '+fmtDate(day)}</h3><button class="x" onclick="AM.close('checkDialog')">×</button></div>
    <div class="notice">Одна проверка для упражнений, тестов и других активностей за день.${recent?'':' Прошлая утренняя реакция уже неизвестна: эта запись уточнит только текущее состояние.'}</div>
    <div class="field"><label for="morningResponse">Сегодня по сравнению с состоянием до нагрузки</label><select id="morningResponse"><option value="">Выбери</option><option value="same">Так же</option><option value="better">Лучше</option><option value="worse">Хуже</option></select></div>
    <div class="field"><label for="dayResponse">Было ли ухудшение позже в тот день?</label><select id="dayResponse"><option value="unknown">Не знаю</option><option value="same">Ухудшения не было</option><option value="worse" ${knownWorse?'selected':''}>Да, было</option></select>${knownWorse?'<div class="li-meta">Ухудшение уже отмечено в истории за этот день.</div>':''}</div>
    ${steadinessField('morningSteadiness',currentSymptoms()?.steadiness||'steady')}
    <div class="field"><label for="morningPain">Боль сейчас, 0–10</label><input id="morningPain" type="number" min="0" max="10" value="${currentSymptoms()?.pain||0}"></div>
    <div class="field"><label for="morningFatigue">Остаточная усталость голеностопа / икр</label><select id="morningFatigue"><option value="low">Лёгкая</option><option value="medium">Умеренная</option><option value="high">Сильная, не восстановился</option></select></div>
    ${generalFatigueField('morningGeneralFatigue')}
    <label class="notice"><input id="morningSwelling" type="checkbox" ${currentSymptoms()?.swelling?'checked':''}> Новый/усилившийся отёк</label>
    <div class="modal-actions"><button class="btn primary" onclick="AM.saveMorning(${day})">Сохранить общую проверку</button></div>`;
  showDialog('checkDialog');
}
function saveMorning(day){
  const response=document.getElementById('morningResponse').value,history=document.getElementById('dayResponse').value;
  if(!response)return toast('Отметь утреннее состояние');
  if(day>=startOfDay())return toast('Утреннюю проверку можно заполнить следующим днём');
  try{recordSymptoms({phase:'morning',trainingDay:day,response,historyWorse:history==='worse',historyKnown:history!=='unknown',
    pain:Number(document.getElementById('morningPain').value),steadiness:document.getElementById('morningSteadiness').value,
    fatigue:document.getElementById('morningFatigue').value,generalFatigue:document.getElementById('morningGeneralFatigue').value||'unknown',swelling:document.getElementById('morningSwelling').checked},'combined');}catch(e){return toast(e.message);}
  closeDialog('checkDialog');save();toast('Общая реакция сохранена');
}
function saveCheck(id){
  const c=state.delayedChecks.find(x=>x.id===id);if(c)openMorning(startOfDay(c.createdAt));
}
function activateExercise(id){state.exerciseStatuses[id]='active';closeDialog('exerciseDialog');save();toast('Упражнение добавлено в программу');}
function archiveExercise(id){state.exerciseStatuses[id]='archived';settleAdditionalPlan(now());closeDialog('exerciseDialog');save();toast('Упражнение убрано из активных');}
function saveSelfReport(){
  const values=Object.fromEntries(['trust','fear','ready'].map(k=>[k,+document.getElementById('sr_'+k).value]));
  state.last_self_report_at=now();
  state.selfReports.push({ts:state.last_self_report_at,...values});
  closeDialog('selfReportDialog');save();toast('Самооценка сохранена');
}

function setupTabs(){
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));
    document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
    document.getElementById('screen-'+b.dataset.screen).classList.add('active');
    if(b.dataset.screen==='tests'){renderTests();}
  }));
}
