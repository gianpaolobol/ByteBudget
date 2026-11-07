import {demoCity} from './demo.js';
const DEMO_CITIES=['Bologna','London','Tokyo'];
// Only the server-labelled development preview may seed fictional data automatically.
export function initialDemoDataset(isPreview,rememberedCity){
 if(!isPreview)return null;
 return demoCity(DEMO_CITIES.includes(rememberedCity)?rememberedCity:'Bologna');
}

// Some hosts serve index.html as a static asset before the Worker can mark it.
export async function discoverDemoPreview({marker,native,fetch:fetcher=(...args)=>globalThis.fetch(...args)}){
 if(marker)return true;
 if(native)return false;
 try{const response=await fetcher('/api/status',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)return false;return (await response.json()).configured===false}catch{return false}
}
