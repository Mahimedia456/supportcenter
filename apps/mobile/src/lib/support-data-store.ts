import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSyncExternalStore} from 'react';
import {getZendeskDbSnapshot,type ZendeskDbSnapshot} from '@/lib/zendesk-db';

type State={
 snapshot:ZendeskDbSnapshot|null;
 loading:boolean;
 refreshing:boolean;
 error:string;
 hydrated:boolean;
};

const KEY='support-command-center:global-90day-snapshot';
let state:State={snapshot:null,loading:false,refreshing:false,error:'',hydrated:false};
const listeners=new Set<()=>void>();
let inflight:Promise<ZendeskDbSnapshot|null>|null=null;

function emit(){for(const l of listeners)l()}
function patch(next:Partial<State>){state={...state,...next};emit()}
function subscribe(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener)}
function getSnapshot(){return state}
async function persist(snapshot:ZendeskDbSnapshot){await AsyncStorage.setItem(KEY,JSON.stringify(snapshot)).catch(()=>undefined)}

export async function hydrateSupportSnapshot(){
 if(state.hydrated)return state.snapshot;
 try{
  const raw=await AsyncStorage.getItem(KEY);
  const parsed=raw?JSON.parse(raw):null;
  patch({snapshot:parsed||state.snapshot,hydrated:true,error:''});
  return parsed;
 }catch{
  patch({hydrated:true});
  return state.snapshot;
 }
}

export async function loadSupportSnapshot(token:string,force=false){
 if(inflight)return inflight;
 inflight=(async()=>{
  await hydrateSupportSnapshot();
  if(!state.snapshot)patch({loading:true,error:''});
  try{
   const snapshot=await getZendeskDbSnapshot(token,{force});
   patch({snapshot,loading:false,error:'',hydrated:true});
   await persist(snapshot);
   return snapshot;
  }catch(error:any){
   patch({loading:false,error:error?.message||'Unable to load support snapshot.'});
   return state.snapshot;
  }finally{inflight=null}
 })();
 return inflight;
}

export async function refreshSupportSnapshot(token:string){
 // Snapshot-only mobile refresh: never calls Zendesk sync.
 // Silent DB snapshot re-read, no blocking spinner.
 try{
  const snapshot=await getZendeskDbSnapshot(token,{force:true});
  patch({snapshot,error:'',hydrated:true,refreshing:false});
  await persist(snapshot);
  return snapshot;
 }catch(error:any){
  patch({error:error?.message||'Unable to refresh saved snapshot.',refreshing:false});
  return state.snapshot;
 }
}

export function seedSupportSnapshot(snapshot:ZendeskDbSnapshot|null){
 if(!snapshot)return;
 patch({snapshot,hydrated:true,error:''});
 void persist(snapshot);
}

export function useSupportDataStore(){return useSyncExternalStore(subscribe,getSnapshot,getSnapshot)}
