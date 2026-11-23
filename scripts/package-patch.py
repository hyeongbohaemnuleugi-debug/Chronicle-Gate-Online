#!/usr/bin/env python3
"""Create a root-relative changed-files archive against the user's supplied ZIP.
Usage: python scripts/package-patch.py ORIGINAL.zip OUTPUT.zip
"""
import sys,json,hashlib,zipfile
from pathlib import Path
from datetime import datetime,timezone
root=Path(__file__).resolve().parents[1]
original=Path(sys.argv[1]).resolve();output=Path(sys.argv[2]).resolve()
sha=lambda data:hashlib.sha256(data).hexdigest()
base={}
with zipfile.ZipFile(original) as source:
 for info in source.infolist():
  if info.is_dir():continue
  parts=Path(info.filename).parts
  relative='/'.join(parts[1:]) if parts and parts[0]=='Chronicle-Gate-Online-main' else info.filename
  base[relative]=source.read(info)
exclude_dirs={'node_modules','.git','.chronicle-data','.chronicle-v14','.chronicle-v15','.chronicle-v16','.chronicle-v17','.ui-qa','.uiqa','__pycache__','tests-v14','tests-v15','tests-v16'}
exclude_names={'IMPLEMENTATION_CONTRACT.md','IMPLEMENTATION_V15.md','IMPLEMENTATION_V16.md','IMPLEMENTATION_V17.md','V14_PATCH_MANIFEST.json','FILES_CHANGED_V14.txt','V15_PATCH_MANIFEST.json','FILES_CHANGED_V15.txt','V16_PATCH_MANIFEST.json','FILES_CHANGED_V16.txt','V17_PATCH_MANIFEST.json','FILES_CHANGED_V17.txt','README_V14_KO.md','VALIDATION_V14.md','ASSET_AND_DESIGN_NOTES_V14.md','README_V15_KO.md','CLASS_GUIDE_V15.md','VALIDATION_V15.md','ASSET_AND_DESIGN_NOTES_V15.md','qa-v14.mjs','qa-v15.mjs','qa-v16.mjs','cleanup-v16.mjs','README_V16_KO.md','VALIDATION_V16.md','CLASS_GUIDE_V16.md','ASSET_AND_DESIGN_NOTES_V16.md','SERVER_AND_STORAGE_V16.md','RESOURCE_REPORT_V16.json','SCENARIO_REACHABILITY.json','.env'}
changed=[]
for file in sorted(root.rglob('*')):
 if not file.is_file():continue
 relative=file.relative_to(root)
 if any(part in exclude_dirs for part in relative.parts) or file.name in exclude_names:continue
 if file.name.startswith('.env') and file.name!='.env.example':continue
 if relative.parts[:3]==('public','game','audio') and file.suffix.lower()=='.wav':continue
 data=file.read_bytes();key=relative.as_posix()
 if key not in base or base[key]!=data:changed.append((key,data))
# The unchanged icon makes the independent local-play folder complete.
if not any(key=='public/favicon.svg' for key,_ in changed):changed.append(('public/favicon.svg',(root/'public/favicon.svg').read_bytes()))
changed.sort()
manifest={'version':'17.0.0','baselineFilename':original.name,'baselineSha256':sha(original.read_bytes()),'createdAt':datetime.now(timezone.utc).isoformat(),'entryPoints':{'online':'npm start (after overlay on original repository)','legacy':'npm run start:legacy (explicit opt-in)','offline':'PLAY_OFFLINE.html','offlineHttp':'node scripts/offline-server.mjs'},'cleanup':'npm run clean:media removes only unchanged old WAVs with verified MP3 replacements; cloud data is never deleted.','note':'Paths are relative to the repository root. This is a cumulative patch, not the full legacy project. Local bundled play is included. Runtime saves and environment secrets are excluded.','files':[{'path':key,'status':'replace' if key in base else 'add','bytes':len(data),'sha256':sha(data),'baselineSha256':sha(base[key]) if key in base else None} for key,data in changed]}
manifest_data=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
listing=('Chronicle Gate v17 changed files\nBaseline: '+original.name+'\n\n'+'\n'.join(('REPLACE ' if key in base else 'ADD     ')+key for key,_ in changed)+'\n\nApply at repository root; read README_V17_KO.md.\n').encode()
(root/'V17_PATCH_MANIFEST.json').write_bytes(manifest_data);(root/'FILES_CHANGED_V17.txt').write_bytes(listing)
output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for key,data in changed:
  archive.writestr(key,data)
  archive.getinfo(key).external_attr=(0o100755 if key.endswith('.sh') else 0o100644)<<16
 archive.writestr('V17_PATCH_MANIFEST.json',manifest_data);archive.writestr('FILES_CHANGED_V17.txt',listing)
with zipfile.ZipFile(output) as archive:
 assert archive.testzip() is None
 for record in manifest['files']:assert sha(archive.read(record['path']))==record['sha256']
print(json.dumps({'zip':str(output),'bytes':output.stat().st_size,'fileCount':len(changed)+2,'replaced':sum(key in base for key,_ in changed),'new':sum(key not in base for key,_ in changed),'sha256':sha(output.read_bytes())},ensure_ascii=False,indent=2))
