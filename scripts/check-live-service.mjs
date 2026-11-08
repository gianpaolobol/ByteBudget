// Release guard: never upload another seeded or disconnected beta as live.
const value=process.env.BYTEBUDGET_API_BASE;
let base;try{base=new URL(value)}catch{throw new Error('Set repository variable BYTEBUDGET_API_BASE to the public HTTPS API origin')}
if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw new Error('BYTEBUDGET_API_BASE must be an HTTPS origin');
for(const origin of ['capacitor://localhost','https://localhost']){
 const response=await fetch(new URL('/api/status',base),{headers:{Origin:origin},redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok||response.headers.get('Access-Control-Allow-Origin')!==origin)throw new Error('Live API is not accessible to native apps');
 const status=await response.json();if(status.configured!==true||status.mode!=='nearby'||status.demoPreview===true)throw new Error('Live restaurant provider must be configured in nearby mode without demo preview');
}
console.log('Live API configuration and native CORS verified; on-device GPS/provider coverage still requires device testing.');
