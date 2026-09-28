/* Free practice V3. Off until a later stage turns it on. Does not score. */
(function(root){
'use strict';
const config={
 version:'free-practice-v3-p1',
 enabled:true,
 enabledBlockIds:['free.harmony.meaning_dat','free.harmony.meaning_loc','free.harmony.vowel_dat','free.harmony.vowel_loc','free.harmony.limits','free.voice.dat_onset','free.voice.loc_onset','free.voice.dat_build','free.voice.loc_build','free.voice.direction_place','free.plural.meaning','free.plural.vowel','free.plural.group_vowel','free.plural.group_yw','free.plural.group_r','free.plural.group_l','free.plural.group_nasal','free.plural.group_z','free.plural.group_voiceless','free.plural.compare','free.nasal.gen','free.nasal.acc','free.nasal.abl','free.nasal.ins_with','free.nasal.ins_tool','free.nasal.groups','free.nasal.contrast','free.poss.my','free.poss.your','free.poss.our','free.poss.polite','free.poss.third','free.poss.stem','free.poss.compare','free.person.i_we','free.person.you','free.person.you_many','free.person.question','free.person.compare','free.chains.plural_poss','free.chains.poss_dat','free.chains.third_acc','free.chains.third_loc','free.chains.third_abl','free.chains.full','free.verbs.stem','free.verbs.negative','free.verbs.past','free.verbs.participle','free.verbs.condition','free.verbs.connected','free.verbs.short_person','free.verbs.combined','free.mixed.select','free.mixed.contrast','free.mixed.return'],
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
