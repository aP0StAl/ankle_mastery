'use strict';

state = loadState();

document.getElementById('quickActivityBtn').onclick=openActivity;
document.getElementById('exportBtn').onclick=exportData;
document.getElementById('importBtn').onclick=()=>document.getElementById('importFile').click();
document.getElementById('importFile').onchange=e=>e.target.files[0]&&importData(e.target.files[0]);
document.getElementById('resetBtn').onclick=resetData;
setupTabs();
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',restorePageScroll));

window.AM={
  openImpactCheck,saveImpactCheck,toggleStageConditions,
  openRunningPlan,saveRunningPlan,openRun,saveRun,
  openAdditionalPlan,closeAdditionalPlan,
  openFeedback,openSymptoms,saveSymptoms,openMorning,saveMorning,doseChanged,rememberLogWellbeing,
  openPostpone,postponeAction,resumeAction,
  exerciseHistoryDay,exerciseTab,exerciseTabKey,openExercise,openLog,saveLog,openActivity,saveActivity,openTest,saveTest,deleteTest,openCheck,saveCheck,
  activateExercise,archiveExercise,suggestStage,openAssessment,saveAssessment,chooseFatigue,openAssessmentCheck,saveAssessmentCheck,openSelfReport,saveSelfReport,close:closeDialog,
  setExerciseFilter:(x)=>{exerciseFilter=x;renderExercises()}
};

stageGameProgress();
renderAll();
setInterval(renderHome,15*60*1000);
