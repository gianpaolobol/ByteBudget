// Shared pointer surface for both native range controls. Keyboard/AT retains the
// real input; touch reserves vertical movement for the document's scroll view.
export function bindRangeGesture(input,onGesture=()=>{}){
 const surface=input.parentElement;let gesture=null;
 const update=e=>{
  const {rect,min,max,step,offset}=gesture;
  const width=Math.max(1,rect.width-26),ratio=Math.min(1,Math.max(0,(e.clientX-rect.left-13-offset)/width));
  const value=Math.min(max,Math.max(min,min+Math.round(ratio*(max-min)/step)*step));
  if(Number(input.value)!==value){input.value=String(value);input.oninput?.({target:input});gesture.changed=true}
 };
 surface.onpointerdown=e=>{
  if(input.disabled||e.isPrimary===false||e.button!==0||gesture)return;
  if(e.pointerType==='mouse')input.focus({preventScroll:true});
  const rect=surface.getBoundingClientRect();
  const min=Number(input.min||input.getAttribute('min')),max=Number(input.max||input.getAttribute('max')),step=Number(input.step||input.getAttribute('step'))||1;
  const thumb=rect.left+13+(Number(input.value)-min)/(max-min)*Math.max(1,rect.width-26);
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,active:false,vertical:false,changed:false,rect,min,max,step,offset:Math.abs(e.clientX-thumb)<=38?e.clientX-thumb:0};
  onGesture(true);
  surface.setPointerCapture?.(e.pointerId);
 };
 surface.onpointermove=e=>{
  if(!gesture||gesture.id!==e.pointerId||gesture.vertical)return;
  if(!gesture.active){const x=Math.abs(e.clientX-gesture.x),y=Math.abs(e.clientY-gesture.y);if(Math.max(x,y)<6)return;if(y>x){gesture.vertical=true;return}gesture.active=true}
  e.preventDefault();update(e);
 };
 const finish=(e,cancel=false)=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  if(!gesture.vertical&&!cancel)update(e);
  const changed=gesture.changed,id=gesture.id;gesture=null;
  try{surface.releasePointerCapture?.(id)}catch{}
  if(changed)input.onchange?.({target:input});
  onGesture(false);
 };
 surface.onpointerup=e=>finish(e);
 surface.onpointercancel=e=>finish(e,true);
 surface.onlostpointercapture=e=>finish(e,true);
}
