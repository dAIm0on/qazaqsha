/* Free practice V3. Off until a later stage turns it on. Does not score. */
(function(root){
'use strict';
const config={
 version:'free-practice-v3-p1',
 enabled:true,
 enabledBlockIds:['free.harmony.meaning_dat','free.harmony.vowel_dat','free.voice.dat_onset','free.voice.dat_build','free.voice.direction_place','free.poss.my','free.poss.your','free.poss.our','free.poss.polite','free.poss.third','free.poss.stem','free.poss.compare'],
 namespace:'qazaqsha.freePractice.v1',
 maxQuestionPresentationsPerLemma:2,
 minDistinctOtherLemmasBetween:8,
 maxConsecutiveSameSubcaseWhenAlternatives:3
};
function enabled(){return !!config.enabled;}
const api={config,enabled};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.FreePracticeConfig=api;
})(typeof window!=='undefined'?window:globalThis);
