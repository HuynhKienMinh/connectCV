const fs=require('fs'),path=require('path');
const output=path.resolve(__dirname,'../backend/features/connectcv/public/css/studio.css');
function check(){
 const css=fs.readFileSync(output,'utf8');
 for(const selector of ['.max-h-\\[460px\\]','.h-\\[840px\\]','.bg-emerald-600','.bg-gradient-to-r','.from-purple-600','.sm\\:grid-cols-3','.lg\\:grid-cols-12','.lg\\:col-span-6'])if(!css.includes(selector))throw Error('Missing local Studio layout/style rule: '+selector);
 if(!/max-height:\s*460px/.test(css)||!/height:\s*840px/.test(css))throw Error('Studio dimensions changed');
 console.log('Studio layout/style CSS verified (local-compatible Tailwind 3).');
}
if(process.argv.includes('--check')){check();}else{
 if(!process.env.STUDIO_TAILWIND_COMPILER)throw Error('Set STUDIO_TAILWIND_COMPILER to an external Tailwind 3.4.17 compiler. No legacy compiler is shipped in the app.');
 const postcss=require('postcss'),tailwind=require(process.env.STUDIO_TAILWIND_COMPILER);
 const html=fs.readFileSync(path.resolve(__dirname,'../backend/features/connectcv/public/index.html'),'utf8');
 const config={content:[{raw:html,extension:'html'}],safelist:[{pattern:/^(bg|text|border|from|via|to)-(slate|gray|blue|indigo|purple|emerald|teal|cyan|red|rose|amber|orange|green)-(50|100|200|300|400|500|600|700|800|900|950)$/,variants:['hover','focus']}],theme:{extend:{}},plugins:[]};
 postcss([tailwind(config)]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;',{from:path.resolve(__dirname,'src/studio.css')}).then(result=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,result.css);check();}).catch(error=>{console.error(error.message);process.exitCode=1;});
}
