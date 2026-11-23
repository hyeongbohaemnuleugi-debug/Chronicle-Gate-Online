#!/usr/bin/env python3
"""Create a root-relative changed-files archive against the user's supplied ZIP.
Usage: python scripts/package-patch.py ORIGINAL.zip|BASELINE_DIRECTORY OUTPUT.zip
Use the previous release directory for a strictly changed-files update, or the
original uploaded ZIP for a cumulative patch. No runtime save or secret is packed.
"""
import sys,json,hashlib,zipfile,os
from pathlib import Path
from datetime import datetime,timezone
root=Path(__file__).resolve().parents[1]
original=Path(sys.argv[1]).resolve();output=Path(sys.argv[2]).resolve()
sha=lambda data:hashlib.sha256(data).hexdigest()
base={}
exclude_dirs={'node_modules','.git','.chronicle-data','.chronicle-v14','.chronicle-v15','.chronicle-v16','.chronicle-v17','.chronicle-v18','.ui-qa','.uiqa','__pycache__','tests-v14','tests-v15','tests-v16','tests-v17'}
exclude_names={'IMPLEMENTATION_CONTRACT.md','IMPLEMENTATION_V15.md','IMPLEMENTATION_V16.md','IMPLEMENTATION_V17.md','V14_PATCH_MANIFEST.json','FILES_CHANGED_V14.txt','V15_PATCH_MANIFEST.json','FILES_CHANGED_V15.txt','V16_PATCH_MANIFEST.json','FILES_CHANGED_V16.txt','V17_PATCH_MANIFEST.json','FILES_CHANGED_V17.txt','README_V14_KO.md','VALIDATION_V14.md','ASSET_AND_DESIGN_NOTES_V14.md','README_V15_KO.md','CLASS_GUIDE_V15.md','VALIDATION_V15.md','ASSET_AND_DESIGN_NOTES_V15.md','qa-v14.mjs','qa-v15.mjs','qa-v16.mjs','cleanup-v16.mjs','README_V16_KO.md','VALIDATION_V16.md','CLASS_GUIDE_V16.md','ASSET_AND_DESIGN_NOTES_V16.md','SERVER_AND_STORAGE_V16.md','RESOURCE_REPORT_V16.json','SCENARIO_REACHABILITY.json','.env'}
exclude_names.update({'IMPLEMENTATION_V18.md','V18_PATCH_MANIFEST.json','FILES_CHANGED_V18.txt','README_V17_KO.md','VALIDATION_V17.md','STORY_GUIDE_V17.md','CLASS_GUIDE_V17.md','ASSET_AND_DESIGN_NOTES_V17.md','SERVER_AND_STORAGE_V17.md','RESOURCE_REPORT_V17.json','NARRATIVE_REACHABILITY_V17.json','qa-v17.mjs','report-v17.mjs'})
if original.is_dir():
 for directory,folders,names in os.walk(original,followlinks=False):
  folders[:]=[name for name in folders if name not in exclude_dirs and not (Path(directory)/name).is_symlink()]
  for name in names:
   file=Path(directory)/name
   if file.is_symlink() or (name.startswith('.env') and name!='.env.example'):continue
   base[file.relative_to(original).as_posix()]=file.read_bytes()
 baseline_sha=sha(''.join(key+'\0'+sha(data)+'\n' for key,data in sorted(base.items())).encode())
 baseline_kind='previous-release-directory'
 base_version=json.loads((original/'package.json').read_text()).get('version','unknown')
else:
 with zipfile.ZipFile(original) as source:
  for info in source.infolist():
   if info.is_dir():continue
   parts=Path(info.filename).parts
   relative='/'.join(parts[1:]) if parts and parts[0]=='Chronicle-Gate-Online-main' else info.filename
   base[relative]=source.read(info)
 baseline_sha=sha(original.read_bytes());baseline_kind='original-uploaded-archive';base_version=None
changed=[]
for file in sorted(root.rglob('*')):
 if not file.is_file():continue
 relative=file.relative_to(root)
 if any(part in exclude_dirs for part in relative.parts) or file.name in exclude_names:continue
 if file.name.startswith('.env') and file.name!='.env.example':continue
 if relative.parts[:3]==('public','game','audio') and file.suffix.lower()=='.wav':continue
 data=file.read_bytes();key=relative.as_posix()
 if key not in base or base[key]!=data:changed.append((key,data))
changed.sort()
manifest={'version':'18.0.0','baselineKind':baseline_kind,'baselineVersion':base_version,'baselineFilename':original.name,'baselineSha256':baseline_sha,'baselineHashMethod':'sha256 of sorted relative paths and file hashes, excluding dependencies, runtime state and secrets' if original.is_dir() else 'sha256 of uploaded archive bytes','createdAt':datetime.now(timezone.utc).isoformat(),'entryPoints':{'online':'npm start (after overlay on the stated baseline)','legacy':'npm run start:legacy (explicit opt-in)','offline':'PLAY_OFFLINE.html after overlay','offlineHttp':'node scripts/offline-server.mjs after overlay'},'cleanup':'npm run clean:media removes only unchanged old WAVs with verified MP3 replacements; cloud data is never deleted.','note':'Only added or changed files relative to the stated baseline are included. Apply paths at repository root. This is not a standalone full repository. Runtime saves and environment secrets are excluded.','files':[{'path':key,'status':'replace' if key in base else 'add','bytes':len(data),'sha256':sha(data),'baselineSha256':sha(base[key]) if key in base else None} for key,data in changed]}
manifest_data=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
listing=('Chronicle Gate v18 changed files\nBaseline: '+original.name+'\nBaseline kind: '+baseline_kind+'\n\n'+'\n'.join(('REPLACE ' if key in base else 'ADD     ')+key for key,_ in changed)+'\n\nApply at repository root; read README_V18_KO.md.\n').encode()
(root/'V18_PATCH_MANIFEST.json').write_bytes(manifest_data);(root/'FILES_CHANGED_V18.txt').write_bytes(listing)
output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for key,data in changed:
  archive.writestr(key,data)
  archive.getinfo(key).external_attr=(0o100755 if key.endswith('.sh') else 0o100644)<<16
 archive.writestr('V18_PATCH_MANIFEST.json',manifest_data);archive.writestr('FILES_CHANGED_V18.txt',listing)
with zipfile.ZipFile(output) as archive:
 assert archive.testzip() is None
 for record in manifest['files']:assert sha(archive.read(record['path']))==record['sha256']
print(json.dumps({'zip':str(output),'bytes':output.stat().st_size,'fileCount':len(changed)+2,'replaced':sum(key in base for key,_ in changed),'new':sum(key not in base for key,_ in changed),'sha256':sha(output.read_bytes())},ensure_ascii=False,indent=2))
