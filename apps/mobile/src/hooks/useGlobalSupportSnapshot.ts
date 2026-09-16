import {Alert} from 'react-native';
import {useCallback,useEffect} from 'react';
import {useAuth} from '@/context/AuthContext';
import {hydrateSupportSnapshot,loadSupportSnapshot,refreshSupportSnapshot,useSupportDataStore} from '@/lib/support-data-store';

let bootstrapPromise:Promise<void>|null=null;
let bootstrapDone=false;

async function bootstrapOnce(token:string){
 if(bootstrapDone)return;
 if(bootstrapPromise)return bootstrapPromise;
 bootstrapPromise=(async()=>{
  await hydrateSupportSnapshot();
  if(token)await loadSupportSnapshot(token,false);
  bootstrapDone=true;
 })().catch(()=>undefined).finally(()=>{bootstrapPromise=null});
 return bootstrapPromise;
}

export function useGlobalSupportSnapshot(){
 const {session,ensureFreshSession}=useAuth();
 const store=useSupportDataStore();

 const getToken=useCallback(async()=>{
  const fresh=await ensureFreshSession();
  return fresh?.accessToken||session?.accessToken||'';
 },[ensureFreshSession,session?.accessToken]);

 useEffect(()=>{
  let active=true;
  void(async()=>{
   const token=await getToken();
   if(active)await bootstrapOnce(token);
  })();
  return()=>{active=false};
 },[getToken]);

 const refresh=useCallback(async()=>{
  Alert.alert(
   'Sync in progress',
   'Your syncing data is under process. You will see updated data once it is done.',
   [{text:'Close'}],
  );
  const token=await getToken();
  if(token)void refreshSupportSnapshot(token);
 },[getToken]);

 return {...store,refresh};
}
