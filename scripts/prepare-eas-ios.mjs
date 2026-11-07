import {readFile,writeFile,mkdir} from 'node:fs/promises';
// EAS searches shared schemes only directly under ios/*.xcodeproj.
// Preserve Capacitor's canonical nested project and derive a root adapter.
let project=await readFile('ios/App/App.xcodeproj/project.pbxproj','utf8');
for(const [from,to] of [['path = App;','path = App/App;'],['INFOPLIST_FILE = App/Info.plist;','INFOPLIST_FILE = App/App/Info.plist;'],['relativePath = "CapApp-SPM";','relativePath = "App/CapApp-SPM";'],['path = ../debug.xcconfig;','path = debug.xcconfig;']])project=project.replaceAll(from,to);
const root='ios/App.xcodeproj';
await mkdir(`${root}/xcshareddata/xcschemes`,{recursive:true});
await writeFile(`${root}/project.pbxproj`,project);
await writeFile(`${root}/xcshareddata/xcschemes/App.xcscheme`,await readFile('ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme'));
