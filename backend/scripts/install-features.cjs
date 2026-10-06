'use strict';
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),feature=path.join(root,'features/connectcv');
if(!process.env.npm_execpath)throw Error('Run installation through npm');
execFileSync(process.execPath,[process.env.npm_execpath,'ci','--omit=dev','--prefix',feature],{stdio:'inherit'});
if(process.env.RENDER==='true'&&process.env.INSTALL_CHROMIUM_ON_RENDER==='true'){
 const cli=path.join(feature,'node_modules/playwright-core/cli.js');
 if(!fs.existsSync(cli))throw Error('Pinned Playwright CLI is missing');
 execFileSync(process.execPath,[cli,'install','chromium'],{stdio:'inherit',timeout:300000,env:{...process.env,PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH||path.join(root,'.render-browsers')}});
}
