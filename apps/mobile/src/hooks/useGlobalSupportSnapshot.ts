import {AppState} from 'react-native';
import {useCallback,useEffect} from 'react';
import {useAuth} from '@/context/AuthContext';
import {
 loadSupportSnapshot,
 refreshSupportSnapshot,
 selectSupportSnapshotScope,
 useSupportDataStore,
} from '@/lib/support-data-store';

export function useGlobalSupportSnapshot(){
 const {session,ensureFreshSession}=useAuth();
 const store=useSupportDataStore();
 const scope=session?`${session.user.id}:${session.workspace.slug}`:'';

 const getToken=useCallback(async()=>{
  const fresh=await ensureFreshSession();
  return fresh?.accessToken||session?.accessToken||'';
 },[ensureFreshSession,session?.accessToken]);

 useEffect(()=>{
  let active=true;
  selectSupportSnapshotScope(scope);
  async function load(){
   if(!scope)return;
   const token=await getToken();
   if(active&&token)await loadSupportSnapshot(token,scope);
  }
  void load();
  const listener=AppState.addEventListener('change',state=>{
   if(state==='active')void load();
  });
  return()=>{active=false;listener.remove()};
 },[scope,getToken]);

 const refresh=useCallback(async()=>{
  const token=await getToken();
  if(!token||!scope)return;
  try{await refreshSupportSnapshot(token,scope)}catch{
   // Error is retained in the shared store for each screen to show.
  }
 },[getToken,scope]);

 return {...store,refresh};
}
