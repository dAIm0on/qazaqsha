(function(root){
 'use strict';
 const config={
   version:'tz2-bir-myn-2026-09-10',algorithm:'FSRS-6 / ts-fsrs 5.4.2',provisional:false,
   fsrs:{desired_retention:0.90,enable_fuzz:false,enable_short_term:true},
   schedule:{cleanAnswersToConsolidate:2,spacedRecallsForRemembered:1,spacedRecallsForMastered:2,minSpacedMs:86400000,responseTimeAffectsSchedule:false},
   session:{size:8,maxAttempts:12,recentWindowMs:600000,microSize:4,minIntervening:3,preferredIntervening:4,newLimit:8,examSize:8,examMs:4000,examHardMs:3000,examEasyMs:1500,slowMs:8000},
   context:{wordLimit:1},
   analytics:{retentionGapMs:86400000},
   remediation:{threshold:2,historyWindow:12,cleanToResolve:3,exerciseCount:4},
   confusion:{minCount:2,maxPairs:300},
   storage:{schema:5,maxImportBytes:20000000,maxEvents:Infinity,maxAssociationLength:1200},
   labels:{NEW:'Новое',LEARNING:'Изучается',FAMILIAR:'Знакомо',REMEMBERED:'Помню после паузы',MASTERED:'Устойчиво вспоминаю'}
 };
 if(typeof module!=='undefined'&&module.exports)module.exports=config;else root.TRAINER_CONFIG=config;
})(typeof window!=='undefined'?window:globalThis);
