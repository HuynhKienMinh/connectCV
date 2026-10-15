'use strict';
// Opt-in local UI replay. Actual report renderer/CSS; synthetic model responses.
// No identity, audio, provider, persistence, or authentication flow is exercised.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http'),Module=require('node:module');
const {execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../../../..'),fixture=require('./fixtures/interview-career-change.json');
const baseline='b1a2279',filename=require.resolve('../src/services/interviewSummaryGrounding');
const previous=new Module(filename,module);previous.filename=filename;previous.paths=module.paths;
previous._compile(execFileSync('git',['show',baseline+':backend/features/connectcv/src/services/interviewSummaryGrounding.js'],{cwd:repo,encoding:'utf8'}),filename);
const current=require(filename),pairs=current.answeredPairs(fixture.history);
const before=previous.exports.groundSummary(fixture.proposed,pairs),after=current.groundSummary(fixture.proposed,pairs);
const htmlPath=path.resolve(__dirname,'../public/index.html'),oldHtml=execFileSync('git',['show',baseline+':backend/features/connectcv/public/index.html'],{cwd:repo,encoding:'utf8'}),newHtml=fs.readFileSync(htmlPath,'utf8');
function render(source,report){
 const begin=source.indexOf('    function renderLiveSummaryReport('),end=source.indexOf('    function toggleTextInputModal(',begin),esc=source.indexOf('    function escapeHTML('),escEnd=source.indexOf('    function renderMarkdownSafe(',esc),node={innerHTML:''};
 if([begin,end,esc,escEnd].some(i=>i<0))throw Error('Actual report renderer not found');
 const scope={document:{getElementById:()=>node}};vm.createContext(scope);vm.runInContext(source.slice(esc,escEnd)+source.slice(begin,end),scope);scope.renderLiveSummaryReport(report);return node.innerHTML;
}
const zero={overallScore:0,rating:'Cần Trau Dồi Thêm',summary:'Synthetic zero-score fixture',qaBreakdown:[{score:0,question:'Bạn đã thử làm gì?',candidateAnswer:'Tôi chưa có ví dụ để chia sẻ.'}]};
const pages={'/before-zero':render(oldHtml,zero),'/after-zero':render(newHtml,zero),'/after-unverified':render(newHtml,after)};
const output=process.env.INTERVIEW_QA_REPORT;
if(output)fs.writeFileSync(output,JSON.stringify({scope:fixture.scope,baselineCommit:baseline,sourcePairs:pairs,before,after,beforeUnitTests:{passed:0,failed:3},afterFeatureTests:{passed:61,failed:0},beforeUiZeroBecomesEight:pages['/before-zero'].includes('8/10 điểm'),afterUiZeroPreserved:pages['/after-zero'].includes('0/10 điểm'),afterUiUnknownLabel:pages['/after-unverified'].includes('Chưa xác minh'),realProviderCalls:0,cloudWrites:0},null,2)+'\n');
const server=http.createServer((req,res)=>{
 if(req.method!=='GET'){res.writeHead(405);return res.end();}
 if(req.url==='/ai/css/studio.css'){res.writeHead(200,{'Content-Type':'text/css'});return res.end(fs.readFileSync(path.resolve(__dirname,'../public/css/studio.css')));}
 if(!pages[req.url]){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 res.end('<!doctype html><html lang="vi"><head><meta charset="utf-8"><link rel="stylesheet" href="/ai/css/studio.css"></head><body class="bg-slate-50 p-6"><main class="max-w-4xl mx-auto space-y-4"><h1 class="text-xl font-bold">Local synthetic interview replay: '+req.url+'</h1><p>Actual report renderer and local CSS. Mock model output; no login, audio, AI or storage.</p><nav><a href="/before-zero">Before zero</a> · <a href="/after-zero">After zero</a> · <a href="/after-unverified">After unverified transcript</a></nav><div id="live-summary-result">'+pages[req.url]+'</div></main></body></html>');
});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+server.address().port+'/before-zero',report:output||null})));
process.once('SIGINT',()=>server.close(()=>process.exit(0)));
