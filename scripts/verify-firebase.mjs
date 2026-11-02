import {specialActivity} from '../src/catalogs.js';
// Uses only synthetic, temporary accounts and records. Never logs passwords or tokens.
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {menuFromExercise,recordSnapshot,changeEntry} from '../src/exercises.js';
import {isDeepStrictEqual} from 'node:util';
const env=Object.fromEntries((await readFile('.env.local','utf8')).split('\n').filter(x=>x.trim()&&!x.startsWith('#')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i).trim(),line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const apiKey=env.VITE_FIREBASE_API_KEY,projectId=env.VITE_FIREBASE_PROJECT_ID;
if(!apiKey||!projectId)throw new Error('Firebase設定がありません');
const authBase='https://identitytoolkit.googleapis.com/v1/accounts:';
const root=`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
const runId=randomUUID(),accounts=[],paths=[],checks=[];
async function auth(action,body){const r=await fetch(`${authBase}${action}?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(`Authentication: ${data.error?.message||r.status}`);return data}
async function createAccount(){const email=`sync-check-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');const account=await auth('signUp',{email,password,returnSecureToken:true});account.testEmail=email;account.testPassword=password;accounts.push(account);return account}
async function request(path,token,method='GET',body){return fetch(`${root}/${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})}
function check(name,ok){checks.push({name,passed:ok});if(!ok)throw new Error(`${name}: 失敗`)}
async function verifyRealtime(owner,path){
 const {initializeApp,deleteApp}=await import('firebase/app');
 const {getAuth,signInWithEmailAndPassword}=await import('firebase/auth');
 const {getFirestore,doc,onSnapshot,updateDoc,getDocFromServer,terminate}=await import('firebase/firestore');
 const config={apiKey,projectId,appId:env.VITE_FIREBASE_APP_ID,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN};
 const apps=[initializeApp(config,`writer-${runId}`),initializeApp(config,`reader-${runId}`)];
 const databases=[];let stop,timer;
 try{
  await Promise.all(apps.map(app=>signInWithEmailAndPassword(getAuth(app),owner.testEmail,owner.testPassword)));
  databases.push(...apps.map(app=>getFirestore(app)));
  const reflected=new Promise((resolve,reject)=>{
   timer=setTimeout(()=>reject(new Error('SDKリアルタイム同期が30秒以内に完了しませんでした')),30000);
   stop=onSnapshot(doc(databases[1],path),{includeMetadataChanges:true},snapshot=>{
    if(!snapshot.metadata.fromCache&&snapshot.data()?.syncProbe===runId)resolve();
   },reject);
  });
  // Install listener before writing; both clients use separate authenticated SDK instances.
  await updateDoc(doc(databases[0],path),{syncProbe:runId});
  await reflected;
  check('別SDKクライアントへのリアルタイム反映',true);
  const confirmed=await getDocFromServer(doc(databases[1],path));
  check('SDKでサーバーから再取得',confirmed.data()?.syncProbe===runId);
 }finally{clearTimeout(timer);stop?.();await Promise.all(databases.map(db=>terminate(db)));await Promise.all(apps.map(app=>deleteApp(app)))}
}
function normalize(value){if(Array.isArray(value))return value.map(normalize);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k,v])=>!(k==='values'&&Array.isArray(v)&&!v.length)).map(([k,v])=>[k,normalize(v)]));return value}
let failure;
try{
 const owner=await createAccount();
 const profile=`users/${owner.localId}/profiles/sync-check-${runId}`;
 const menu=menuFromExercise('squat'),replacement=menuFromExercise('wall-push',menu.id);
 function encode(v){if(v===null)return {nullValue:null};if(Array.isArray(v))return {arrayValue:{values:v.map(encode)}};if(typeof v==='object')return {mapValue:{fields:fields(v)}};if(typeof v==='boolean')return {booleanValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};return {stringValue:v}}
 function fields(v){return Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}
 const sampleProfile={id:`sync-check-${runId}`,name:'同期確認用（自動削除）',weeklyTarget:3,menus:[menu],foodGoal:'テスト食事目標',optionalGoal:''};
 const workout={...recordSnapshot(replacement,'partial'),profileId:sampleProfile.id,date:'2000-01-01'};
 const otherProfile=`users/${owner.localId}/profiles/other-${runId}`;
 const samples=[
  [profile,fields(sampleProfile)],
  [`${profile}/dailyLogs/2000-01-01`,fields({date:'2000-01-01',food:'partial',specialActivity:'旧カスタム活動',specialActivities:[specialActivity('theme-park','2時間以上',20000),specialActivity('other','15分未満','')],activityType:'normal',menuOverrides:{[menu.id]:replacement},menuChanges:[changeEntry([menu],[replacement],'external','2000-01-01')],presentedMenus:[menu]})],
  [`${profile}/exerciseLogs/check`,fields(workout)],
  [`${profile}/weeklyReviews/check`,fields({profileId:sampleProfile.id,status:'approved',weekStart:'1999-12-27',weeklyPlan:{effectiveFrom:'2000-01-10',values:{weeklyTarget:2,menus:[menu],foodGoal:'テスト目標',optionalGoal:''}}})],
  [otherProfile,fields({...sampleProfile,id:`other-${runId}`,name:'分離確認'})],
  [`${otherProfile}/exerciseLogs/check`,fields({...workout,profileId:`other-${runId}`,status:'complete'})]
 ];
 for(const [path,fields] of samples){const r=await request(path,owner.idToken,'PATCH',{fields});if(!r.ok){const detail=await r.json();throw new Error(`Firestore ${r.status}: ${detail.error?.message||'書込失敗'}`)}check(`保存 ${path.split('/').at(-2)}`,r.ok);paths.push(path);const read=await request(path,owner.idToken);const data=await read.json();check(`サーバー再取得 ${path.split('/').at(-2)}`,read.ok&&isDeepStrictEqual(normalize(data.fields),normalize(fields)));}
 const [firstRows,secondRows]=await Promise.all([request(`${profile}/exerciseLogs`,owner.idToken),request(`${otherProfile}/exerciseLogs`,owner.idToken)]);
 const [firstData,secondData]=await Promise.all([firstRows.json(),secondRows.json()]);
 check('同一アカウントのプロフィール別運動記録の分離',firstData.documents?.length===1&&secondData.documents?.length===1&&firstData.documents[0].fields.status.stringValue==='partial'&&secondData.documents[0].fields.status.stringValue==='complete');
 const emptyReview=await request(`${otherProfile}/weeklyReviews`,owner.idToken);const emptyData=await emptyReview.json();check('週レビューのプロフィール分離',emptyReview.ok&&!emptyData.documents?.length);
 await verifyRealtime(owner,`${profile}/exerciseLogs/check`);
 const unauth=await request(profile);check('未認証アクセス拒否',unauth.status===403||unauth.status===401);
 const other=await createAccount();const foreignRead=await request(profile,other.idToken);check('別アカウントの読取拒否',foreignRead.status===403);
 const foreignWrite=await request(profile,other.idToken,'PATCH',{fields:{name:{stringValue:'must-be-denied'}}});check('別アカウントの更新拒否',foreignWrite.status===403);
}catch(err){failure=err.message}finally{
 const cleanup=[];
 for(const path of paths.reverse()){const r=await request(path,accounts[0].idToken,'DELETE');cleanup.push({kind:'document',success:r.ok})}
 for(const account of accounts){try{await auth('delete',{idToken:account.idToken});cleanup.push({kind:'temporary-account',success:true})}catch{cleanup.push({kind:'temporary-account',success:false})}}
 const report={checkedAt:new Date().toISOString(),projectId,checks,cleanup,...(failure?{failure}:{})};
 await writeFile('firebase-verification.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 if(failure||cleanup.some(x=>!x.success))process.exitCode=1;
}
