'use strict';
const fs=require('node:fs');
const P=require('./morph-teaching-practice');
const file=process.argv[2];
if(!file){console.error('Нужен файл журнала: node analyze_morph_pilot.cjs qazaqsha-morph-pilot.json');process.exit(2);}
const doc=JSON.parse(fs.readFileSync(file,'utf8'));
const summary=doc.summary||P.pilotSummary({events:doc.events||[],teaching:{events:doc.teaching||[],contentVersion:doc.contentVersion}});
console.log(JSON.stringify(summary,null,2));
if(!summary.n||summary.n<8)console.log('мало данных');
console.log('Это описание сохранённых ответов, не доказательство метода.');
