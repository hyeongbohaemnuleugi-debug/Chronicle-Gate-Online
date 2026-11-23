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
exclude_dirs={'node_modules','.git','.chronicle-data','.chronicle-v14','.chronicle-v15','.ui-qa','.uiqa','__pycache__','tests-v14'}
exclude_names={'IMPLEMENTATION_CONTRACT.md','IMPLEMENTATION_V15.md','V14_PATCH_MANIFEST.json','FILES_CHANGED_V14.txt','V15_PATCH_MANIFEST.json','FILES_CHANGED_V15.txt','README_V14_KO.md','VALIDATION_V14.md','ASSET_AND_DESIGN_NOTES_V14.md','qa-v14.mjs','.env'}
changed=[]
for file in sorted(root.rglob('*')):
 if not file.is_file():continue
 relative=file.relative_to(root)
 if any(part in exclude_dirs for part in relative.parts) or file.name in exclude_names:continue
 data=file.read_bytes();key=relative.as_posix()
 if key not in base or base[key]!=data:changed.append((key,data))
# The unchanged icon makes the independent local-play folder complete.
if not any(key=='public/favicon.svg' for key,_ in changed):changed.append(('public/favicon.svg',(root/'public/favicon.svg').read_bytes()))
changed.sort()
manifest={'version':'15.0.0','baselineFilename':original.name,'baselineSha256':sha(original.read_bytes()),'createdAt':datetime.now(timezone.utc).isoformat(),'entryPoints':{'online':'npm start (after overlay on original repository)','offline':'PLAY_OFFLINE.html','offlineHttp':'node scripts/offline-server.mjs'},'note':'Paths are relative to the repository root. This is a patch, not the full legacy server project. Local bundled play is included. Runtime saves and environment secrets are excluded.','files':[{'path':key,'status':'replace' if key in base else 'add','bytes':len(data),'sha256':sha(data),'baselineSha256':sha(base[key]) if key in base else None} for key,data in changed]}
manifest_data=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
listing=('Chronicle Gate v15 changed files\nBaseline: '+original.name+'\n\n'+'\n'.join(('REPLACE ' if key in base else 'ADD     ')+key for key,_ in changed)+'\n\nApply at repository root; read README_V15_KO.md.\n').encode()
(root/'V15_PATCH_MANIFEST.json').write_bytes(manifest_data);(root/'FILES_CHANGED_V15.txt').write_bytes(listing)
output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for key,data in changed:archive.writestr(key,data)
 archive.writestr('V15_PATCH_MANIFEST.json',manifest_data);archive.writestr('FILES_CHANGED_V15.txt',listing)
with zipfile.ZipFile(output) as archive:
 assert archive.testzip() is None
 for record in manifest['files']:assert sha(archive.read(record['path']))==record['sha256']
print(json.dumps({'zip':str(output),'bytes':output.stat().st_size,'fileCount':len(changed)+2,'replaced':sum(key in base for key,_ in changed),'new':sum(key not in base for key,_ in changed),'sha256':sha(output.read_bytes())},ensure_ascii=False,indent=2))
