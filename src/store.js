import {initializeApp} from 'firebase/app';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from 'firebase/auth';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,onSnapshot,doc,setDoc} from 'firebase/firestore';
import {syncStatus} from './sync-status.js';
const e=import.meta.env;
export const configured=Boolean(e.VITE_FIREBASE_API_KEY&&e.VITE_FIREBASE_AUTH_DOMAIN&&e.VITE_FIREBASE_PROJECT_ID&&e.VITE_FIREBASE_APP_ID);
const empty=()=>({profiles:[],dailyLogs:[],exerciseLogs:[],weeklyReviews:[]});
let db,auth,uid,profileStop,recordStops=[],generation=0;
let state=empty(),changed=()=>{},pendingWrites=0,lastError=null;
const snapshots=new Map();
const key=()=>`health-v1:${uid||'local'}`;
export let connection='端末内に保存';
export const getState=()=>state;
export const loggedIn=()=>Boolean(uid);
export const accountScope=()=>uid||'local';
function localLoad(){try{const saved=JSON.parse(localStorage.getItem(key()));state=saved?Object.fromEntries(Object.keys(empty()).map(k=>[k,Array.isArray(saved[k])?saved[k]:[]])):empty()}catch{state=empty()}}
function notify(){connection=configured?syncStatus({signedIn:!!uid,error:lastError,pendingWrites,snapshots:[...snapshots.values()]}):lastError?`端末保存エラー (${lastError})`:'端末内に保存';changed()}
function persist(){try{localStorage.setItem(key(),JSON.stringify(state))}catch(err){lastError=err.name;return false}return true}
function track(name,snap){snapshots.set(name,{ready:true,cached:snap.metadata.fromCache,pending:snap.metadata.hasPendingWrites})}
function error(err,scope){if(scope!==generation)return;lastError=err.code||'保存失敗';notify()}
export async function start(callback){
 changed=callback;
 if(!configured){localLoad();notify();return}
 const app=initializeApp({apiKey:e.VITE_FIREBASE_API_KEY,authDomain:e.VITE_FIREBASE_AUTH_DOMAIN,projectId:e.VITE_FIREBASE_PROJECT_ID,appId:e.VITE_FIREBASE_APP_ID});
 db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});auth=getAuth(app);
 onAuthStateChanged(auth,user=>{
  profileStop?.();recordStops.forEach(f=>f());recordStops=[];
  const scope=++generation;uid=user?.uid;pendingWrites=0;lastError=null;snapshots.clear();localLoad();
  if(user){snapshots.set('profiles',{ready:false});profileStop=onSnapshot(collection(db,'users',uid,'profiles'),{includeMetadataChanges:true},snap=>{
   if(scope!==generation)return;
   state.profiles=snap.docs.map(d=>({...d.data(),id:d.id}));track('profiles',snap);persist();notify();
  },err=>error(err,scope))}
  notify();
 });
}
export function watchProfile(id){
 recordStops.forEach(f=>f());recordStops=[];
 snapshots.delete('dailyLogs');snapshots.delete('exerciseLogs');snapshots.delete('weeklyReviews');
 if(!uid||!id)return;
 const scope=generation;
 for(const type of ['dailyLogs','exerciseLogs','weeklyReviews']){
  snapshots.set(type,{ready:false});
  recordStops.push(onSnapshot(collection(db,'users',uid,'profiles',id,type),{includeMetadataChanges:true},snap=>{
   if(scope!==generation)return;
   state[type]=state[type].filter(x=>x.profileId!==id).concat(snap.docs.map(d=>({...d.data(),id:d.id,profileId:id})));
   track(type,snap);persist();notify();
  },err=>error(err,scope)));
 }
}
export function save(type,id,data){
 if(!Object.keys(empty()).includes(type))throw new Error('未対応のデータです');
 const row={...data,id},i=state[type].findIndex(x=>x.id===id);
 if(i<0)state[type].push(row);else state[type][i]=row;
 if(!persist()){notify();return}
 if(uid){
  const scope=generation;
  const path=type==='profiles'?['users',uid,'profiles',id]:['users',uid,'profiles',data.profileId,type,id];
  pendingWrites++;
  setDoc(doc(db,...path),row).catch(err=>error(err,scope)).finally(()=>{if(scope===generation){pendingWrites--;notify()}});
 }
 notify();
}
export async function login(email,password,register){await(register?createUserWithEmailAndPassword:signInWithEmailAndPassword)(auth,email,password)}
export const logout=()=>signOut(auth);
