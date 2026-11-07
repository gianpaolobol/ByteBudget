import {demoCity} from './demo.js';
const DEMO_CITIES=['Bologna','London','Tokyo'];
// Only the server-labelled development preview may seed fictional data automatically.
export function initialDemoDataset(isPreview,rememberedCity){
 if(!isPreview)return null;
 return demoCity(DEMO_CITIES.includes(rememberedCity)?rememberedCity:'Bologna');
}
