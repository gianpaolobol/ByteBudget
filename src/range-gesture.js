// Keep the native input for keyboard and assistive technology.
export function bindRangeGesture(input,onGesture=()=>{}){
 const surface=input.parentElement;
 const vertical=input.getAttribute('aria-orientation')==='vertical';
 const axis=e=>vertical?-e.clientY:e.clientX;
 const crossAxis=e=>vertical?e.clientX:e.clientY;
 let gesture=null;
 const update=e=>{
  const {start,length,min,max,step,offset}=gesture;
  const ratio=Math.min(1,Math.max(0,(axis(e)-start-offset)/length));
  const value=Math.min(max,Math.max(min,min+Math.round(ratio*(max-min)/step)*step));
  if(Number(input.value)!==value){input.value=String(value);input.oninput?.({target:input});gesture.changed=true}
 };
 surface.onpointerdown=e=>{
  if(input.disabled||e.isPrimary===false||e.button!==0||gesture)return;
  if(e.pointerType==='mouse')input.focus({preventScroll:true});
  const rect=surface.getBoundingClientRect();
  const min=Number(input.min||input.getAttribute('min')),max=Number(input.max||input.getAttribute('max')),step=Number(input.step||input.getAttribute('step'))||1;
  const start=(vertical?-(rect.top+rect.height):rect.left)+13;
  const length=Math.max(1,(vertical?rect.height:rect.width)-26);
  const position=axis(e);
  const thumb=start+(Number(input.value)-min)/(max-min)*length;
  gesture={id:e.pointerId,position,cross:crossAxis(e),active:false,ignored:false,changed:false,start,length,min,max,step,offset:Math.abs(position-thumb)<=38?position-thumb:0};
  onGesture(true);
  surface.setPointerCapture?.(e.pointerId);
 };
 surface.onpointermove=e=>{
  if(!gesture||gesture.id!==e.pointerId||gesture.ignored)return;
  if(!gesture.active){
   const along=Math.abs(axis(e)-gesture.position),across=Math.abs(crossAxis(e)-gesture.cross);
   if(Math.max(along,across)<6)return;
   if(across>along){gesture.ignored=true;return}
   gesture.active=true;
  }
  e.preventDefault();update(e);
 };
 const finish=(e,cancel=false)=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  if(!gesture.ignored&&!cancel)update(e);
  const changed=gesture.changed,id=gesture.id;gesture=null;
  try{surface.releasePointerCapture?.(id)}catch{}
  if(changed)input.onchange?.({target:input});
  onGesture(false);
 };
 surface.onpointerup=e=>finish(e);
 surface.onpointercancel=e=>finish(e,true);
 surface.onlostpointercapture=e=>finish(e,true);
}
