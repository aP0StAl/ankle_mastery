const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(([,src])=>({src,code:fs.readFileSync(path.join(root,src),'utf8')}));
module.exports={html,scripts};
