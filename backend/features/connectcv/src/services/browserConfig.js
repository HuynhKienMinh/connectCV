'use strict';
const fs=require('fs');
function browserPath(env,chromium,exists=fs.existsSync){
 const candidates=[env.CHROMIUM_PATH,chromium.executablePath(),'/usr/bin/chromium-browser','/usr/bin/chromium'].filter(Boolean);
 return candidates.find(candidate=>exists(candidate));
}
function launchOptions({args=[],env,executablePath},production){
 if(production&&args.some(arg=>/^(--no-sandbox|--disable-setuid-sandbox|--disable-seccomp-filter-sandbox|--single-process)(=|$)/.test(arg)))throw Error('Unsafe production browser flags');
 return {headless:true,args,env,executablePath,chromiumSandbox:production,timeout:30000};
}
module.exports={browserPath,launchOptions};
