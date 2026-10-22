# Prepared procedure, NOT executed this checkpoint. Read current state/CI/Drive/Hosting before use.
import datetime,hashlib,json,os,shutil,subprocess,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];DOC=ROOT/'docs/continuous-improvement';E=DOC/'runs/cycle0070-auth-session';STAGE=ROOT/'.tmp/auth-release70';DRIVE=Path('G:/My Drive/ConnectCV_Backups_2026-10-14')
CAND='63ceb8432f2ed42bd8e113ffefd6e62208be6fe1';BASE='caf28d8531b432543a4c4106aa1e766f77a10e77';VERSION='be365408272cb1ad';CAP=384*1024*1024
OLD=json.loads((DOC/'backup-transfer/cycle0070-portfolio-caf28d8.json').read_text());OLDRECEIPT=json.loads((DOC/'runs/cycle0070-cv-export/portfolio-read/cloud-receipt.json').read_text())
BUNDLE='connectcv-2026-10-22-cycle-0070-api-63ceb84.incremental.bundle';ZIP='connectcv-2026-10-22-cycle-0070-frontend-63ceb84.zip';CAT='connectcv-catalog-cycle-0070-api-63ceb84.json';CATLOCAL='backup-transfer/cycle0070-api-63ceb84.json';REF='refs/backup/cycle0070-api-63ceb84'
def now():return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat()
def git(*a):return subprocess.check_output(['git',*map(str,a)],cwd=ROOT,stderr=subprocess.PIPE)
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def meta(p):return {'bytes':p.stat().st_size,'sha256':digest(p)}
def size(p):return sum(x.stat().st_size for x in p.rglob('*') if x.is_file())
def cap():
 n=size(STAGE);assert n<=CAP,(n,CAP);return n
def save(p,d):p.write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8')
def zipcheck(p,sha,members):
 assert digest(p)==sha
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None and set(z.namelist())==set(members)
  for name,m in members.items():
   b=z.read(name);assert len(b)==m['bytes'] and hashlib.sha256(b).hexdigest()==m['sha256'],name

if sys.argv[1]=='backup':
 assert not STAGE.exists() and DRIVE.is_dir();assert shutil.disk_usage(ROOT).free>CAP*1.2
 ci=json.loads((E/'ci.json').read_text());assert len(ci)==2 and all(r['conclusion']=='success' for r in ci)
 assert git('diff','--name-only',CAND,'HEAD','--','frontend').strip()==b''
 assert git('diff','--name-only',BASE,CAND,'--','backend').strip()==b''
 assert digest(DRIVE/OLDRECEIPT['catalog']['file'])==OLDRECEIPT['catalog']['sha256']
 STAGE.mkdir();(STAGE/'frontend').mkdir();shutil.move(str(ROOT/'frontend/dist'),str(STAGE/'frontend/dist'));(ROOT/'frontend/dist').mkdir()
 if (STAGE/'frontend/dist/.gitkeep').is_file():shutil.copyfile(STAGE/'frontend/dist/.gitkeep',ROOT/'frontend/dist/.gitkeep')
 (STAGE/'firebase.json').write_bytes(git('show',CAND+':firebase.json'))
 rollback={'version':VERSION,'buildCommit':BASE,'command':'firebase hosting:clone connect-cv@'+VERSION+' connect-cv:live --project connect-cv --non-interactive','fallbackZip':OLD['frontendFile'],'fallbackSha256':OLD['frontendSha256']};save(STAGE/'firebase-rollback.json',rollback)
 members={}
 with zipfile.ZipFile(STAGE/ZIP,'w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted((STAGE/'frontend/dist').rglob('*'))+[STAGE/'firebase.json',STAGE/'firebase-rollback.json']:
   if p.is_file():name=p.relative_to(STAGE).as_posix();z.write(p,name);members[name]=meta(p)
 git('update-ref',REF,CAND);git('bundle','create',STAGE/BUNDLE,REF,'^'+BASE)
 manifest={'candidate':CAND,'base':BASE,'bundle':{'file':BUNDLE,**meta(STAGE/BUNDLE),'ref':REF,'commit':CAND},'frontend':{'file':ZIP,**meta(STAGE/ZIP),'members':members},'rollback':rollback,'createdAt':now(),'capBytes':CAP};save(E/'release-manifest.json',manifest)
 state=json.loads((DOC/'state.json').read_text(encoding='utf-8-sig'));state['backupTransfer'].update(status='TRANSFER_IN_PROGRESS_CANDIDATE_NOT_VERIFIED',deployBlockedUntilCloudVerified=True,pendingCandidateCommit=CAND,pendingCatalog=CATLOCAL,pendingRetainedBytes=cap(),localCopiesRetained=True,localCopiesDeleted=False,pendingRestoreVerified=False,pendingRestoreCloneDeleted=False);save(DOC/'state.json',state)
 for name in [BUNDLE,ZIP]:
  assert not (DRIVE/name).exists();shutil.copyfile(STAGE/name,DRIVE/name);assert meta(STAGE/name)==meta(DRIVE/name)
 bare=STAGE/'restore.git';git('init','--bare',bare)
 chain={OLD['baseBundle']:OLD['baseSha256'],**OLD['orderedDeltasSha256'],BUNDLE:manifest['bundle']['sha256']}
 for i,(name,sha) in enumerate(chain.items()):
  p=DRIVE/name;assert digest(p)==sha,name
  subprocess.run(['git','-C',str(bare),'bundle','verify',str(p)],capture_output=True,check=True)
  git('-C',bare,'fetch','--no-tags',p,'+refs/*:refs/*');peak=cap();progress=json.loads((DOC/'state.json').read_text(encoding='utf-8-sig'));progress['backupTransfer']['pendingRetainedBytes']=peak;save(DOC/'state.json',progress);print(json.dumps({'restored':i+1,'total':len(chain),'stageBytes':peak}),flush=True)
 git('-C',bare,'fsck','--full','--strict')
 critical=list(dict.fromkeys(OLD['criticalFiles']+['frontend/tests/apiSessionUi.check.mjs']));coverage={}
 for commit in [CAND,BASE,OLD['protectedCommit']]:
  assert git('-C',bare,'rev-parse',commit+'^{tree}')==git('rev-parse',commit+'^{tree}')
  n=0
  for name in critical:
   if subprocess.run(['git','cat-file','-e',commit+':'+name],cwd=ROOT,capture_output=True).returncode==0:assert git('-C',bare,'show',commit+':'+name)==git('show',commit+':'+name);n+=1
  coverage[commit]=n
 zipcheck(DRIVE/ZIP,manifest['frontend']['sha256'],members);zipcheck(DRIVE/OLD['frontendFile'],OLD['frontendSha256'],OLD['frontendMembers'])
 catalog={**OLD,'candidateCommit':CAND,'requiresCommit':BASE,'parentCatalog':'cycle0070-portfolio-caf28d8.json','status':'VERIFIED_CLOUD_PENDING_LOCAL_CLEANUP','orderedDeltasSha256':{**OLD['orderedDeltasSha256'],BUNDLE:manifest['bundle']['sha256']},'newBundles':[manifest['bundle']],'frontendFile':ZIP,'frontendSha256':manifest['frontend']['sha256'],'frontendBytes':manifest['frontend']['bytes'],'frontendMembers':members,'frontendBuildCommit':CAND,'rollbackFrontendFile':OLD['frontendFile'],'rollbackFrontendSha256':OLD['frontendSha256'],'rollbackFrontendBytes':OLD['frontendBytes'],'rollbackFrontendMembers':OLD['frontendMembers'],'rollbackFrontendBuildCommit':BASE,'rollbackFrontendCloudId':OLDRECEIPT['cloudFiles']['frontend']['id'],'rollback':{**rollback,'backendCommit':OLD['protectedCommit'],'backendCommand':'No backend deployment; retain d6a3fd2'},'catalogCloudFile':CAT,'criticalFiles':critical,'criticalSourceCoverage':coverage,'cloudBundleCount':len(chain),'restoreBytes':size(bare),'buildBytes':size(STAGE)-size(bare),'stagePeakBytes':cap(),'createdAt':manifest['createdAt'],'restoreVerifiedAt':now(),'restoreLocalDeleted':False,'localBuildDeleted':False,'localCopiesDeleted':False,'localCopiesRetained':True,'cloudUiListed':False,'cloudReadbackVerified':True,'restoreInstructions':'Verify privateDrive base plus26 ordered deltas SHA; fetch DIRECTLY into one freshbare; bundle verify/fsck/tree hashes/critical bytes, newZIP and rollbackZIP70 CRC/allmembers. Cap384MiB, no duplicatebase. Rollback Hostingbe365 or exactcaf ZIP. Remove only ownstage after cloudack. Code backup is not database backup.'}
 for key in ['catalogCloudId','catalogCloudUrl','frontendCloudId','frontendCloudUrl','cloudVerifiedAt','cloudAcknowledgedAt','cloudUploadVerified']:catalog.pop(key,None)
 save(DOC/CATLOCAL,catalog);assert not (DRIVE/CAT).exists();shutil.copyfile(DOC/CATLOCAL,DRIVE/CAT);assert meta(DOC/CATLOCAL)==meta(DRIVE/CAT)
 proof={'candidate':CAND,'catalog':{'path':CATLOCAL,'file':CAT,**meta(DRIVE/CAT)},'bundleCount':len(chain),'freshBareFsck':True,'treeHashesMatch':True,'criticalSourceCoverage':coverage,'allZipMembersVerified':True,'databaseIncluded':False,'stagePeakBytes':cap(),'localCleanupPending':True,'verifiedAt':now()};save(E/'restore-proof.json',proof);print(json.dumps(proof),flush=True)
