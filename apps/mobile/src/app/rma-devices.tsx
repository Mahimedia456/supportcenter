import React,{useEffect,useMemo,useState} from 'react';
import {FlatList,Pressable,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {router,type Href,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {SupportPeriodFilter} from '@/components/SupportPeriodFilter';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {DEFAULT_SUPPORT_PERIOD,filterTicketsBySupportPeriod,type SupportPeriod,type SupportPeriodPreset} from '@/lib/support-period';
import {rmaTicketInfo,type RmaDeviceRow} from '@/lib/rma-analytics';

type WorkflowFilter='all'|'pending_ship'|'shipped'|'returned';
const WORKFLOWS:Array<{key:WorkflowFilter;label:string}>=[
 {key:'all',label:'All RMA'},{key:'pending_ship',label:'Pending ship'},{key:'shipped',label:'Shipped'},{key:'returned',label:'Returned'},
];
function initialPeriod(params:any):SupportPeriod{
 const raw=String(params.period||'') as SupportPeriodPreset;
 if(['today','7','30','90','month0','month1','month2'].includes(raw))return{preset:raw};
 if(raw==='custom'&&params.start&&params.end)return{preset:'custom',start:String(params.start),end:String(params.end)};
 return DEFAULT_SUPPORT_PERIOD;
}

export default function RmaDevices(){
 const params=useLocalSearchParams<{period?:string;start?:string;end?:string;workflow?:string}>();
 const {snapshot,loading,refreshing,error,refresh}=useGlobalSupportSnapshot();
 const [period,setPeriod]=useState<SupportPeriod>(()=>initialPeriod(params));
 const [workflow,setWorkflow]=useState<WorkflowFilter>(()=>WORKFLOWS.some(x=>x.key===params.workflow)?params.workflow as WorkflowFilter:'all');
 const [devices,setDevices]=useState<RmaDeviceRow[]>([]);
 const [preparing,setPreparing]=useState(false);
 const fields=snapshot?.fields||[];
 const forms=snapshot?.forms||[];
 const periodTickets=useMemo(()=>filterTicketsBySupportPeriod(snapshot?.tickets||[],period),[snapshot?.tickets,period]);

 useEffect(()=>{
  let cancelled=false,index=0;
  const map=new Map<string,RmaDeviceRow>();
  setPreparing(Boolean(periodTickets.length));
  setDevices([]);
  const run=()=>{
   const end=Math.min(index+100,periodTickets.length);
   for(;index<end;index++){
    const info=rmaTicketInfo(periodTickets[index],fields,forms);
    if(!info.isRma)continue;
    if(workflow!=='all'&&info.shipment!==workflow)continue;
    const row=map.get(info.device)||{device:info.device,total:0,pendingShip:0,shipped:0,returned:0,repair:0,replacement:0,unknownDisposition:0};
    row.total+=1;
    if(info.shipment==='pending_ship')row.pendingShip+=1;
    if(info.shipment==='shipped')row.shipped+=1;
    if(info.shipment==='returned')row.returned+=1;
    if(info.disposition==='repair')row.repair+=1;
    if(info.disposition==='replacement')row.replacement+=1;
    if(info.disposition==='unknown')row.unknownDisposition+=1;
    map.set(info.device,row);
   }
   if(cancelled)return;
   if(index<periodTickets.length){setTimeout(run,0);return;}
   setDevices([...map.values()].sort((a,b)=>b.total-a.total||a.device.localeCompare(b.device)));
   setPreparing(false);
  };
  const timer=setTimeout(run,0);
  return()=>{cancelled=true;clearTimeout(timer)};
 },[periodTickets,fields,forms,workflow]);

 function routePeriod(){return{period:period.preset,start:period.start,end:period.end};}
 const header=<>
  <View style={s.header}><Pressable onPress={()=>router.back()} style={({pressed})=>[s.back,pressed&&s.pressed]}><Ionicons name="chevron-back" size={23} color={colors.text}/></Pressable><View style={s.headerCopy}><Text style={s.eyebrow}>RMA DEVICE OPERATIONS</Text><Text style={s.title}>Devices</Text><Text style={s.caption}>{preparing?'Preparing device breakdown…':`${devices.length} devices with matching RMA activity`}</Text></View></View>
  <SupportPeriodFilter value={period} onChange={setPeriod}/>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.workflowRow}>{WORKFLOWS.map(item=><Pressable key={item.key} onPress={()=>setWorkflow(item.key)} style={[s.workflowChip,workflow===item.key&&s.workflowChipActive]}><Text style={[s.workflowText,workflow===item.key&&s.workflowTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
  {error?<View style={s.notice}><Text style={s.noticeTitle}>Using saved RMA device data</Text><Text style={s.noticeText}>The last saved snapshot remains visible.</Text></View>:null}
 </>;
 return <SafeAreaView style={s.safe} edges={['top','left','right']}><FlatList style={s.screen} contentContainerStyle={s.content} data={devices} keyExtractor={item=>item.device} initialNumToRender={10} maxToRenderPerBatch={10} windowSize={6} removeClippedSubviews ListHeaderComponent={header} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>} renderItem={({item})=><Pressable onPress={()=>router.push({pathname:'/ticket-results',params:{preset:'rma',rmaDevice:item.device,rmaWorkflow:workflow==='all'?undefined:workflow,title:`${item.device} RMA`,...routePeriod()}} as unknown as Href)} style={({pressed})=>[s.card,pressed&&s.pressed]}><View style={s.cardHead}><View style={s.icon}><Ionicons name="hardware-chip-outline" size={20} color={colors.primary}/></View><View style={s.copy}><Text style={s.device} numberOfLines={2}>{item.device}</Text><Text style={s.total}>{item.total} RMA tickets</Text></View><Ionicons name="chevron-forward" size={19} color={colors.cyan}/></View><View style={s.stats}><Stat label="Pending" value={item.pendingShip}/><Stat label="Shipped" value={item.shipped}/><Stat label="Returned" value={item.returned}/><Stat label="Repair" value={item.repair}/><Stat label="Replaced" value={item.replacement}/></View></Pressable>} ListEmptyComponent={!loading&&!preparing?<View style={s.empty}><Ionicons name="hardware-chip-outline" size={38} color={colors.primary}/><Text style={s.emptyTitle}>No RMA devices found</Text><Text style={s.emptyText}>Change the period or shipment filter.</Text></View>:null}/></SafeAreaView>;
}
function Stat({label,value}:{label:string;value:number}){return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:18,paddingTop:8,paddingBottom:90},header:{flexDirection:'row',alignItems:'flex-start',gap:11,marginBottom:2},back:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},headerCopy:{flex:1},eyebrow:{color:colors.primary,fontSize:8,fontWeight:'900',letterSpacing:1},title:{color:colors.text,fontSize:24,fontWeight:'900',marginTop:2},caption:{color:colors.muted,fontSize:9,marginTop:3},workflowRow:{gap:7,paddingVertical:12},workflowChip:{borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,paddingHorizontal:12,paddingVertical:8},workflowChipActive:{backgroundColor:colors.primary,borderColor:colors.primary},workflowText:{color:colors.muted,fontSize:9,fontWeight:'900'},workflowTextActive:{color:'#fff'},notice:{borderRadius:15,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,padding:12,marginBottom:10},noticeTitle:{color:colors.text,fontSize:10,fontWeight:'900'},noticeText:{color:colors.muted,fontSize:9,marginTop:3},card:{borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:13,marginBottom:9},cardHead:{flexDirection:'row',alignItems:'center',gap:10},icon:{width:42,height:42,borderRadius:13,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},copy:{flex:1},device:{color:colors.text,fontSize:13,fontWeight:'900'},total:{color:colors.muted,fontSize:9,fontWeight:'700',marginTop:3},stats:{flexDirection:'row',gap:5,marginTop:12},stat:{flex:1,borderRadius:10,backgroundColor:colors.background,paddingVertical:8,paddingHorizontal:3},statValue:{color:colors.text,fontSize:13,fontWeight:'900',textAlign:'center'},statLabel:{color:colors.muted,fontSize:6,fontWeight:'800',textAlign:'center',marginTop:2},pressed:{opacity:.76},empty:{alignItems:'center',paddingVertical:45},emptyTitle:{color:colors.text,fontWeight:'900',marginTop:10},emptyText:{color:colors.muted,fontSize:9,marginTop:4}});
