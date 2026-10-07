#!/usr/bin/env node
'use strict';
/** Static author/product leak scan for Section 2 canonical_core bodies. Exit 0 = clean. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const LEAK=/Статус документа|канонический CORE|должен открываться|открывается справочник|prerequisite|нельзя сокращать|Источник курса прямо требует|^УРОК 2–/m;
let bad=0;
for(const id of ['2-1','2-2','2-3']){
  const raw=JSON.parse(fs.readFileSync(path.join(root,'lessons',id,'lesson.json'),'utf8'));
  for(const c of raw.canonical_core||[]){
    const hit=String(c.body||'').match(LEAK);
    if(hit){console.error('LEAK',id,c.id,JSON.stringify(hit[0]));bad++;}
    const title=String(c.title||'').trim();
    const first=String(c.body||'').split(/\n/)[0].trim();
    if(title&&first===title){console.error('TITLE_DUP',id,c.id);bad++;}
  }
}
if(bad){console.error('AUTHOR_SCAN_SECTION2_FAIL',bad);process.exit(1);}
console.log('AUTHOR_SCAN_SECTION2_OK');
