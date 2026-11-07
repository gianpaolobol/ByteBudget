import {PRICE_TIERS,validBands,validPrice} from './domain.js';
// Four equal UI segments, each calibrated to that city's meal-price boundaries.
export function spendingSelection(position,bands,venues=[],meal='dinner',currency='EUR',now=Date.now()){
 if(!Number.isInteger(position)||position<0||position>1000)throw new RangeError('Invalid spending position');
 const tier=PRICE_TIERS[Math.min(3,Math.floor(position/250))];
 if(position===1000)return {position,tier,maxPrice:null,unlimited:true};
 if(!validBands(bands))return {position,tier,maxPrice:undefined,unlimited:false};
 const digits=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits;
 const quantum=10**(-digits);const observed=venues.map(v=>validPrice(v,meal,currency,now)?.max).filter(Number.isFinite);
 const luxuryTop=Math.max(bands.highMax*5,...observed);
 const starts=[Math.max(quantum,bands.lowMax/4),bands.lowMax,bands.midMax,bands.highMax];
 const ends=[bands.lowMax,bands.midMax,bands.highMax,luxuryTop];
 const index=PRICE_TIERS.indexOf(tier),offset=position-index*250,progress=offset/(index===3?249:250);
 const raw=starts[index]+(ends[index]-starts[index])*progress;
 const upper=index===3?ends[index]:ends[index]-quantum;
 const value=offset===0?starts[index]:Math.min(upper,Math.max(starts[index],Math.round(raw)));
 return {position,tier,maxPrice:Number(value.toFixed(digits)),unlimited:false};
}

export function spendingPriceText(selection,locale,currency){
 if(selection.unlimited)return '∞';
 if(!Number.isFinite(selection.maxPrice))return '';
 return new Intl.NumberFormat(locale,{style:'currency',currency,minimumFractionDigits:0}).format(selection.maxPrice);
}
