import fs from 'node:fs';
import katex from 'katex';
const b=JSON.parse(fs.readFileSync('src/lib/ustc843-formulas.json','utf8'));let n=0;const bad=[];for(const c of b.cards){for(const m of c.content.matchAll(/\$\$\n([\s\S]*?)\n\$\$/g)){n++;try{katex.renderToString(m[1],{throwOnError:true})}catch(e){bad.push({row:c.sourceRow,formula:m[1],error:e.message})}}}console.log(JSON.stringify({cards:b.cards.length,formulas:n,errors:bad},null,2));

if(bad.length) process.exitCode=1;
