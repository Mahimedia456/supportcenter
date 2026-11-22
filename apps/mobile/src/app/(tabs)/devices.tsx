import React,{useEffect,useMemo,useState} from 'react';
import {FlatList,Pressable,RefreshControl,StyleSheet,Text,View} from 'react-native';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {WorkspaceHeader} from '@/components/WorkspaceHeader';
import {SupportPeriodFilter} from '@/components/SupportPeriodFilter';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {DEFAULT_SUPPORT_PERIOD,filterTicketsBySupportPeriod,type SupportPeriod} from '@/lib/support-period';
import {dimensionValue,fieldsForDimension,type DimensionRow} from '@/lib/support-dimensions';

export default function Devices(){
 const {snapshot,loading,refreshing,error,refresh}=useGlobalSupportSnapshot();
 const [period,setPeriod]=useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
 const [rows,setRows]=useState<DimensionRow[]>([]);
 const [preparing,setPreparing]=useState(false);
 const tickets=useMemo(()=>filterTicketsBySupportPeriod(snapshot?.tickets||[],period),[snapshot?.tickets,period]);
 const fields=snapshot?.fields||[];
 const detected=useMemo(()=>fieldsForDimension(fields,'device'),[fields]);

 useEffect(()=>{
  let cancelled=false;
  const counts=new Map<string,number>();
  let index=0;
  setPreparing(Boolean(tickets.length));
  setRows([]);
  const run=()=>{
   const end=Math.min(index+160,tickets.length);
   for(;index<end;index++){
    const value=dimensionValue(tickets[index],fields,'device');
    for(const part of value.split(',').map(x=>x.trim()).filter(Boolean))counts.set(part,(counts.get(part)||0)+1);
   }
   if(cancelled)return;
   if(index<tickets.length){setTimeout(run,0);return;}
   setRows([...counts.entries()].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)));
   setPreparing(false);
  };
  const timer=setTimeout(run,0);
  return()=>{cancelled=true;clearTimeout(timer)};
 },[tickets,fields]);

 const header=<>
  <WorkspaceHeader/>
  <Text style={s.eyebrow}>DEVICE OPERATIONS</Text>
  <Text style={s.title}>Devices</Text>
  <Text style={s.caption}>Devices detected from every matching Zendesk product/device field in the shared 90-day snapshot.</Text>
  <SupportPeriodFilter value={period} onChange={setPeriod}/>
  <View style={s.detected}>
   <Text style={s.detectedLabel}>DETECTED DEVICE FIELDS</Text>
   <Text style={s.detectedValue}>{detected.length?detected.slice(0,4).map((x:any)=>x.title||x.raw_title||`Field ${x.id}`).join(' • '):'Not detected'}</Text>
  </View>
  {loading&&!snapshot?<State text="Initializing support data…"/>:null}
  {preparing&&snapshot?<State text="Preparing device list…"/>:null}
  {error?<State text="Using the last saved snapshot. Pull to retry the snapshot read." error/>:null}
 </>;

 return <FlatList
  style={s.screen}
  contentContainerStyle={s.content}
  data={rows}
  keyExtractor={item=>item.label}
  initialNumToRender={12}
  maxToRenderPerBatch={12}
  windowSize={7}
  removeClippedSubviews
  ListHeaderComponent={header}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>}
  renderItem={({item})=><Pressable onPress={()=>router.push({pathname:'/device/[name]',params:{name:item.label}})} style={s.card}>
   <View style={s.icon}><Ionicons name="hardware-chip-outline" size={20} color={colors.primary}/></View>
   <View style={s.copy}><Text style={s.name}>{item.label}</Text><Text style={s.count}>{item.count} tickets</Text></View>
   <Ionicons name="chevron-forward" size={18} color={colors.cyan}/>
  </Pressable>}
  ListEmptyComponent={!loading&&!preparing?<State text={detected.length?'No device values found for this period.':'No device/product field was detected in the saved Zendesk fields.'}/>:null}
 />;
}
function State({text,error=false}:{text:string;error?:boolean}){return <View style={s.state}><Text style={error?s.errorTitle:s.stateTitle}>{text}</Text></View>}
const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:18,paddingTop:8,paddingBottom:120},
 eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1},title:{color:colors.text,fontSize:28,fontWeight:'900',marginTop:4},caption:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:4},
 detected:{borderRadius:13,backgroundColor:'#F2F8F5',padding:11,marginBottom:10},detectedLabel:{color:colors.muted,fontSize:8,fontWeight:'900'},detectedValue:{color:colors.primary,fontSize:10,fontWeight:'900',marginTop:4,lineHeight:14},
 card:{minHeight:72,flexDirection:'row',alignItems:'center',gap:11,borderRadius:16,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:13,marginBottom:9},
 icon:{width:42,height:42,borderRadius:13,backgroundColor:'#E7F5EF',alignItems:'center',justifyContent:'center'},copy:{flex:1},name:{color:colors.text,fontSize:12,fontWeight:'900'},count:{color:colors.muted,fontSize:9,marginTop:3},
 state:{borderRadius:15,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:14,marginBottom:10},stateTitle:{color:colors.text,fontWeight:'900'},errorTitle:{color:'#B42318',fontWeight:'900'},
});
