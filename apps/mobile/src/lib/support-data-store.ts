import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSyncExternalStore} from 'react';
import {
 clearZendeskDbSnapshotCache,
 getZendeskDbSnapshot,
 type ZendeskDbSnapshot,
} from '@/lib/zendesk-db';

type State={
 snapshot:ZendeskDbSnapshot|null;
 loading:boolean;
 refreshing:boolean;
 error:string;
 hydrated:boolean;
};

const KEY_PREFIX='support-command-center:90day:v2:';
const LEGACY_KEY='support-command-center:global-90day-snapshot';
const AUTO_REFRESH_MS=60*1000;
let scope='';
let lastNetworkAt=0;
let state:State={snapshot:null,loading:false,refreshing:false,error:'',hydrated:false};
const listeners=new Set<()=>void>();
let inflight:Promise<ZendeskDbSnapshot|null>|null=null;

function emit(){for(const l of listeners)l()}
function patch(next:Partial<State>){state={...state,...next};emit()}
function subscribe(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener)}
function getSnapshot(){return state}
function keyFor(value:string){return `${KEY_PREFIX}${encodeURIComponent(value)}`}
function expectedWorkspace(value:string){return value.split(':').at(-1)||''}

export function selectSupportSnapshotScope(nextScope:string){
 if(nextScope===scope)return;
 scope=nextScope;
 inflight=null;
 lastNetworkAt=0;
 clearZendeskDbSnapshotCache();
 patch({snapshot:null,loading:false,refreshing:false,error:'',hydrated:false});
}

async function persist(snapshot:ZendeskDbSnapshot,currentScope:string){
 if(currentScope!==scope)return;
 await AsyncStorage.setItem(keyFor(currentScope),JSON.stringify(snapshot)).catch(()=>undefined);
}

export async function hydrateSupportSnapshot(currentScope:string){
 selectSupportSnapshotScope(currentScope);
 if(!currentScope)return null;
 if(state.hydrated)return state.snapshot;
 try{
  const raw=await AsyncStorage.getItem(keyFor(currentScope));
  const parsed=raw?JSON.parse(raw) as ZendeskDbSnapshot:null;
  if(currentScope!==scope)return null;
  if(parsed&&parsed.workspace!==expectedWorkspace(currentScope)){
   await AsyncStorage.removeItem(keyFor(currentScope));
   patch({hydrated:true});
   return null;
  }
  patch({snapshot:parsed||null,hydrated:true,error:''});
  return parsed;
 }catch{
  if(currentScope===scope)patch({hydrated:true});
  return null;
 }
}

export async function loadSupportSnapshot(token:string,currentScope:string,force=false){
 if(!currentScope||!token)return null;
 selectSupportSnapshotScope(currentScope);
 if(inflight)return inflight;
 inflight=(async()=>{
  await hydrateSupportSnapshot(currentScope);
  if(!force&&state.snapshot&&Date.now()-lastNetworkAt<AUTO_REFRESH_MS)return state.snapshot;
  const hadSnapshot=Boolean(state.snapshot);
  patch({loading:!hadSnapshot,refreshing:hadSnapshot,error:''});
  try{
   // Use a real network read, never a successful-looking stale in-memory value.
   const snapshot=await getZendeskDbSnapshot(token,{force:true,expectedWorkspace:expectedWorkspace(currentScope)});
   if(currentScope!==scope)return null;
   patch({snapshot,loading:false,refreshing:false,error:'',hydrated:true});
   lastNetworkAt=Date.now();
   await persist(snapshot,currentScope);
   return snapshot;
  }catch(error:any){
   if(currentScope===scope)patch({loading:false,refreshing:false,error:error?.message||'Unable to load support snapshot.'});
   return currentScope===scope?state.snapshot:null;
  }
 })().finally(()=>{if(currentScope===scope)inflight=null});
 return inflight;
}

export async function refreshSupportSnapshot(token:string,currentScope:string){
 if(!currentScope||!token)throw new Error('Manager session unavailable');
 selectSupportSnapshotScope(currentScope);
 if(inflight){await inflight;if(state.error)throw new Error(state.error);return state.snapshot;}
 patch({refreshing:true,error:''});
 try{
  const snapshot=await getZendeskDbSnapshot(token,{force:true,expectedWorkspace:expectedWorkspace(currentScope)});
  if(currentScope!==scope)return null;
  patch({snapshot,error:'',hydrated:true,refreshing:false,loading:false});
  lastNetworkAt=Date.now();
  await persist(snapshot,currentScope);
  return snapshot;
 }catch(error:any){
  if(currentScope===scope)patch({error:error?.message||'Unable to refresh server snapshot.',refreshing:false});
  throw error;
 }
}

export async function clearSupportSnapshot(){
 const currentScope=scope;
 clearZendeskDbSnapshotCache();
 selectSupportSnapshotScope('');
 const keys=[LEGACY_KEY];
 if(currentScope)keys.push(keyFor(currentScope));
 await AsyncStorage.multiRemove(keys).catch(()=>undefined);
}

export function useSupportDataStore(){return useSyncExternalStore(subscribe,getSnapshot,getSnapshot)}
