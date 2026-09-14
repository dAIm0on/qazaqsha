/* FSRS is supplied unchanged by ts-fsrs. Mastery is separate observed evidence. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const cfg=node?require('./config.js'):root.TRAINER_CONFIG,F=node?require('./fsrs-vendor.js'):root.FSRS;
 const engine=F.fsrs({request_retention:cfg.fsrs.desired_retention,enable_fuzz:cfg.fsrs.enable_fuzz,enable_short_term:cfg.fsrs.enable_short_term});
 const DAY=86400000,count=n=>Number.isFinite(n)?Math.max(0,Math.floor(n)):0,stamp=n=>Number.isFinite(n)&&n>0?n:null;
 function aliases(r){return {...r,status:r.mastery_level,attempts:r.seen,correct:r.correct_count,streak:Math.min(cfg.schedule.cleanAnswersToConsolidate,r.correct_streak),dueAt:r.next_review||0,lastAttemptAt:r.last_seen||0,lapses:r.wrong_count,response_time_ms:r.response_time};}
 function level(r){
   if(!r.review_count)return r.seen?'LEARNING':'NEW';
   if(r.needsReview||r.correct_streak<cfg.schedule.cleanAnswersToConsolidate)return 'LEARNING';
   if(r.recall_review_successes>=cfg.schedule.spacedRecallsForMastered)return 'MASTERED';
   if(r.recall_review_successes>=cfg.schedule.spacedRecallsForRemembered)return 'REMEMBERED';
   return 'FAMILIAR';
 }
 function validCard(v){return !!v&&typeof v==='object'&&['due','stability','difficulty','elapsed_days','scheduled_days','reps','lapses','state'].every(k=>Number.isFinite(v[k])&&v[k]>=0)&&v.state<=3&&v.difficulty<=10&&v.stability<=36500&&(v.last_review==null||Number.isFinite(v.last_review));}
 function migrate(p={},now=Date.now()){
   p=p||{};const seen=count(p.seen??p.attempts),correct=Math.min(seen,count(p.correct_count??p.correct));
   const r={...p,seen,review_count:count(p.review_count??(correct+count(p.wrong_count??Math.max(0,seen-correct)))),correct_count:correct,wrong_count:count(p.wrong_count??Math.max(0,seen-correct)),correct_streak:count(p.correct_streak??p.streak),
     created_at:stamp(p.created_at)||now,last_seen:stamp(p.last_seen??p.lastAttemptAt),last_correct:stamp(p.last_correct),last_wrong:stamp(p.last_wrong),last_answer:stamp(p.last_answer),
     hint_used:!!p.hint_used,hint_count:count(p.hint_count),response_time:Number.isFinite(p.response_time_ms??p.response_time)?Math.max(0,p.response_time_ms??p.response_time):null,
     response_time_total:count(p.response_time_total),timed_answers:count(p.timed_answers),next_review:stamp(p.next_review??p.dueAt)||(seen?now:null),needsReview:!!p.needsReview,
     recall_review_successes:count(p.recall_review_successes),review_successes:count(p.review_successes),last_successful_review:stamp(p.last_successful_review),last_shown:stamp(p.last_shown),
     fsrs:validCard(p.fsrs)?{...p.fsrs}:null,history_partial:!!p.history_partial||!!seen&&!p.fsrs,policy_version:cfg.version};
   r.mastery_level=level(r);return aliases(r);
 }
 function due(p,now=Date.now()){return !!p&&Number(p.next_review??p.dueAt)>0&&Number(p.next_review??p.dueAt)<=now;}
 function answer(previous,event){
   const now=event.at,p=migrate(previous,now),clean=event.correct&&!event.hinted;
   const card=p.fsrs?{...p.fsrs,due:new Date(p.fsrs.due),last_review:p.fsrs.last_review?new Date(p.fsrs.last_review):undefined}:F.createEmptyCard(new Date(now));
   const spaced=clean&&event.recall&&due(p,now)&&p.last_correct&&now-p.last_correct>=cfg.schedule.minSpacedMs;
   const rating=Number.isFinite(event.rating)?event.rating:(clean?F.Rating.Good:F.Rating.Again);
   const scheduled=engine.next(card,new Date(now),rating);
   const fsrs={...scheduled.card,due:scheduled.card.due.getTime(),last_review:scheduled.card.last_review?.getTime()||null};
   const r={...p,seen:p.last_shown&&p.last_shown>(p.last_answer||0)?p.seen:p.seen+1,review_count:p.review_count+1,last_answer:now,
     correct_count:p.correct_count+(event.correct?1:0),wrong_count:p.wrong_count+(!event.correct?1:0),correct_streak:clean?p.correct_streak+1:0,last_seen:now,
     last_correct:event.correct?now:p.last_correct,last_wrong:!event.correct?now:p.last_wrong,hint_used:!!event.hinted,hint_count:p.hint_count+(event.hinted?1:0),
     response_time:Number.isFinite(event.responseTime)?Math.max(0,event.responseTime):null,fsrs,next_review:fsrs.due,
     fsrs_difficulty:fsrs.difficulty,fsrs_stability:fsrs.stability,fsrs_retrievability:engine.get_retrievability(scheduled.card,new Date(now),false),
     fsrs_log:{...scheduled.log,due:scheduled.log.due.getTime(),review:scheduled.log.review.getTime()},
     recall_review_successes:clean?p.recall_review_successes+(spaced?1:0):0,review_successes:clean?p.review_successes+(spaced?1:0):0,
     last_successful_review:spaced?now:p.last_successful_review,needsReview:!clean||p.needsReview&&p.correct_streak+1<cfg.schedule.cleanAnswersToConsolidate,policy_version:cfg.version};
   if(r.response_time!==null){r.response_time_total+=r.response_time;r.timed_answers++;}
   r.mastery_level=level(r);return aliases(r);
 }
 function shown(previous,at=Date.now()){const p=migrate(previous,at),r={...p,seen:p.seen+1,last_seen:at,last_shown:at};r.mastery_level=level(r);return aliases(r);}
 function retrievability(record,at=Date.now()){if(!record?.fsrs)return null;return engine.get_retrievability({...record.fsrs,due:new Date(record.fsrs.due),last_review:record.fsrs.last_review?new Date(record.fsrs.last_review):undefined},new Date(at),false);}
 const api={migrate,answer,shown,due,level,DAY,validCard,retrievability,parameters:engine.parameters,model:F.FSRSVersion};
 if(node)module.exports=api;else root.ReviewScheduler=api;
})(typeof window!=='undefined'?window:globalThis);
