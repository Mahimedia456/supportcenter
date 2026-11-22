import React,{useEffect,useMemo,useState} from 'react';
import {
 Pressable,
 RefreshControl,
 ScrollView,
 StyleSheet,
 Text,
 View,
} from 'react-native';
import {router,type Href} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {WorkspaceHeader} from '@/components/WorkspaceHeader';
import {SupportPeriodFilter} from '@/components/SupportPeriodFilter';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {
 DEFAULT_SUPPORT_PERIOD,
 filterTicketsBySupportPeriod,
 type SupportPeriod,
} from '@/lib/support-period';
import {rmaTicketInfo} from '@/lib/rma-analytics';

type WorkflowFilter='all'|'pending_ship'|'shipped'|'returned';
const WORKFLOWS:Array<{key:WorkflowFilter;label:string}>=[
 {key:'all',label:'All RMA'},
 {key:'pending_ship',label:'Pending ship'},
 {key:'shipped',label:'Shipped'},
 {key:'returned',label:'Returned'},
];

export default function RmaScreen(){
 const {snapshot,loading,refreshing,error,refresh}=useGlobalSupportSnapshot();
 const [period,setPeriod]=useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
 const [workflow,setWorkflow]=useState<WorkflowFilter>('all');
 const fields=snapshot?.fields||[];
 const forms=snapshot?.forms||[];

 const periodTickets=useMemo(
  ()=>filterTicketsBySupportPeriod(snapshot?.tickets||[],period),
  [snapshot?.tickets,period],
 );

 const [pairs,setPairs]=useState<Array<{ticket:any;info:ReturnType<typeof rmaTicketInfo>}>>([]);
 const [preparing,setPreparing]=useState(true);

 useEffect(()=>{
  let cancelled=false;
  let index=0;
  const next:Array<{ticket:any;info:ReturnType<typeof rmaTicketInfo>}>=[];
  setPairs([]);
  setPreparing(Boolean(periodTickets.length));

  const run=()=>{
   const end=Math.min(index+100,periodTickets.length);
   for(;index<end;index++){
    const ticket=periodTickets[index];
    const info=rmaTicketInfo(ticket,fields,forms);
    if(info.isRma)next.push({ticket,info});
   }
   if(cancelled)return;
   if(index<periodTickets.length){setTimeout(run,0);return;}
   setPairs(next);
   setPreparing(false);
  };

  const timer=setTimeout(run,0);
  return()=>{cancelled=true;clearTimeout(timer)};
 },[periodTickets,fields,forms]);

 const filteredPairs=useMemo(
  ()=>workflow==='all'?pairs:pairs.filter(row=>row.info.shipment===workflow),
  [pairs,workflow],
 );

 const totals=useMemo(()=>{
  let pendingShip=0,shipped=0,returned=0,repair=0,replacement=0,unknownDisposition=0;
  for(const {info} of pairs){
   if(info.shipment==='pending_ship')pendingShip+=1;
   if(info.shipment==='shipped')shipped+=1;
   if(info.shipment==='returned')returned+=1;
   if(info.disposition==='repair')repair+=1;
   if(info.disposition==='replacement')replacement+=1;
   if(info.disposition==='unknown')unknownDisposition+=1;
  }
  return{pendingShip,shipped,returned,repair,replacement,unknownDisposition};
 },[pairs]);

 const categories=useMemo(()=>{
  const map=new Map<string,number>();
  for(const {info} of filteredPairs)map.set(info.category,(map.get(info.category)||0)+1);
  return[...map.entries()].map(([category,count])=>({category,count})).sort((a,b)=>b.count-a.count||a.category.localeCompare(b.category));
 },[filteredPairs]);

 const deviceCount=useMemo(()=>new Set(filteredPairs.map(row=>row.info.device)).size,[filteredPairs]);

 function routePeriod(){
  return{period:period.preset,start:period.start,end:period.end};
 }

 function openResults(params:Record<string,string|undefined>){
  router.push({pathname:'/ticket-results',params:{preset:'rma',...routePeriod(),...params}} as unknown as Href);
 }

 return <ScrollView
  style={s.screen}
  contentContainerStyle={s.content}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>}
 >
  <WorkspaceHeader/>

  <Text style={s.eyebrow}>RETURN & REPAIR OPERATIONS</Text>
  <Text style={s.title}>RMA</Text>
  <Text style={s.caption}>Repair, replacement and shipment state from the shared support snapshot</Text>

  <SupportPeriodFilter value={period} onChange={setPeriod}/>

  <View style={s.metricsGrid}>
   <Metric label="RMA tickets" value={pairs.length} icon="repeat-outline" onPress={()=>openResults({title:'All RMA tickets'})}/>
   <Metric label="Pending ship" value={totals.pendingShip} icon="time-outline" onPress={()=>openResults({rmaWorkflow:'pending_ship',title:'RMA pending ship'})}/>
   <Metric label="Shipped" value={totals.shipped} icon="paper-plane-outline" onPress={()=>openResults({rmaWorkflow:'shipped',title:'RMA shipped'})}/>
   <Metric label="Returned" value={totals.returned} icon="checkmark-done-outline" onPress={()=>openResults({rmaWorkflow:'returned',title:'RMA returned'})}/>
  </View>

  <View style={s.outcomeCard}>
   <View style={s.outcomeHead}>
    <View><Text style={s.sectionEyebrow}>OUTCOME</Text><Text style={s.sectionTitle}>Repair vs replaced</Text></View>
    <Ionicons name="git-compare-outline" size={22} color={colors.primary}/>
   </View>
   <View style={s.outcomeGrid}>
    <Outcome label="Repair" value={totals.repair} onPress={()=>openResults({rmaDisposition:'repair',title:'RMA repair tickets'})}/>
    <Outcome label="Replaced" value={totals.replacement} onPress={()=>openResults({rmaDisposition:'replacement',title:'RMA replaced tickets'})}/>
    <Outcome label="Unclassified" value={totals.unknownDisposition} muted onPress={()=>openResults({rmaDisposition:'unknown',title:'Unclassified RMA'})}/>
   </View>
  </View>

  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.workflowRow}>
   {WORKFLOWS.map(item=><Pressable key={item.key} onPress={()=>setWorkflow(item.key)} style={[s.workflowChip,workflow===item.key&&s.workflowChipActive]}>
    <Text style={[s.workflowText,workflow===item.key&&s.workflowTextActive]}>{item.label}</Text>
   </Pressable>)}
  </ScrollView>

  {error?<View style={s.notice}><Text style={s.noticeTitle}>Using saved RMA data</Text><Text style={s.noticeText}>Refresh is temporarily unavailable. The last saved snapshot remains visible.</Text></View>:null}
  {loading&&!snapshot?<View style={s.notice}><Text style={s.noticeTitle}>Initializing RMA data...</Text></View>:null}
  {preparing&&snapshot?<View style={s.notice}><Text style={s.noticeTitle}>Preparing RMA view...</Text><Text style={s.noticeText}>Opening the tab first, then calculating RMA breakdowns from the saved snapshot.</Text></View>:null}

  <Text style={s.sectionEyebrow}>RMA NAVIGATION</Text>
  <Pressable
   onPress={()=>router.push({pathname:'/rma-devices',params:{...routePeriod(),workflow}} as unknown as Href)}
   style={({pressed})=>[s.navCard,pressed&&s.pressed]}
  >
   <View style={s.navIcon}><Ionicons name="hardware-chip-outline" size={22} color={colors.primary}/></View>
   <View style={s.navCopy}>
    <Text style={s.navTitle}>Devices</Text>
    <Text style={s.navCaption}>Open device-level RMA breakdown and drill into filtered tickets</Text>
   </View>
   <View style={s.navCount}><Text style={s.navCountValue}>{deviceCount}</Text><Text style={s.navCountLabel}>DEVICES</Text></View>
   <Ionicons name="chevron-forward" size={19} color={colors.cyan}/>
  </Pressable>

  <View style={s.sectionHeader}>
   <View><Text style={s.sectionEyebrow}>RMA CATEGORY</Text><Text style={s.sectionTitle}>Categories</Text></View>
   <Text style={s.sectionCount}>{categories.length}</Text>
  </View>

  <View style={s.categoryPanel}>
   {categories.map(item=><Pressable
    key={item.category}
    onPress={()=>openResults({rmaCategory:item.category,rmaWorkflow:workflow==='all'?undefined:workflow,title:item.category})}
    style={({pressed})=>[s.categoryRow,pressed&&s.pressed]}
   >
    <View style={s.categoryCopy}>
     <Text style={s.categoryTitle} numberOfLines={2}>{item.category}</Text>
     <Text style={s.categoryCaption}>RMA category</Text>
    </View>
    <Text style={s.categoryCount}>{item.count}</Text>
    <Ionicons name="chevron-forward" size={18} color={colors.cyan}/>
   </Pressable>)}
   {!categories.length&&!loading?<View style={s.empty}>
    <Text style={s.emptyTitle}>No RMA categories found</Text>
    <Text style={s.emptyText}>Change the period or workflow filter.</Text>
   </View>:null}
  </View>
 </ScrollView>;
}

function Metric({label,value,icon,onPress}:{label:string;value:number;icon:keyof typeof Ionicons.glyphMap;onPress:()=>void}){
 return <Pressable onPress={onPress} style={({pressed})=>[s.metric,pressed&&s.pressed]}>
  <View style={s.metricIcon}><Ionicons name={icon} size={17} color={colors.primary}/></View>
  <Text style={s.metricValue}>{value}</Text>
  <Text style={s.metricLabel}>{label}</Text>
 </Pressable>;
}

function Outcome({label,value,muted=false,onPress}:{label:string;value:number;muted?:boolean;onPress:()=>void}){
 return <Pressable onPress={onPress} style={({pressed})=>[s.outcome,pressed&&s.pressed]}>
  <Text style={[s.outcomeValue,muted&&s.mutedValue]}>{value}</Text>
  <Text style={s.outcomeLabel}>{label}</Text>
 </Pressable>;
}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:18,paddingTop:8,paddingBottom:120},
 eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1},title:{color:colors.text,fontSize:29,fontWeight:'900',marginTop:4},caption:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:4},
 metricsGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:4},metric:{width:'48%',minHeight:94,borderRadius:17,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:12},metricIcon:{width:31,height:31,borderRadius:10,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},metricValue:{color:colors.text,fontSize:21,fontWeight:'900',marginTop:9},metricLabel:{color:colors.muted,fontSize:9,fontWeight:'800',marginTop:3},
 outcomeCard:{borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:14,marginTop:10},outcomeHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},outcomeGrid:{flexDirection:'row',gap:7,marginTop:12},outcome:{flex:1,borderRadius:13,backgroundColor:colors.background,padding:10},outcomeValue:{color:colors.primary,fontSize:18,fontWeight:'900'},mutedValue:{color:colors.muted},outcomeLabel:{color:colors.muted,fontSize:8,fontWeight:'800',marginTop:3},
 workflowRow:{gap:7,paddingVertical:13},workflowChip:{borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,paddingHorizontal:12,paddingVertical:8},workflowChipActive:{backgroundColor:colors.primary,borderColor:colors.primary},workflowText:{color:colors.muted,fontSize:9,fontWeight:'900'},workflowTextActive:{color:'#fff'},
 notice:{borderRadius:15,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:13,marginBottom:10},noticeTitle:{color:colors.text,fontSize:11,fontWeight:'900'},noticeText:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:4},
 sectionHeader:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginTop:20,marginBottom:9},sectionEyebrow:{color:colors.primary,fontSize:8,fontWeight:'900',letterSpacing:.7},sectionTitle:{color:colors.text,fontSize:17,fontWeight:'900',marginTop:2},sectionCount:{color:colors.primary,fontSize:13,fontWeight:'900'},
 navCard:{minHeight:86,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:13,marginTop:8,flexDirection:'row',alignItems:'center',gap:10},navIcon:{width:44,height:44,borderRadius:14,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},navCopy:{flex:1},navTitle:{color:colors.text,fontSize:14,fontWeight:'900'},navCaption:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:3},navCount:{alignItems:'center',minWidth:48},navCountValue:{color:colors.primary,fontSize:17,fontWeight:'900'},navCountLabel:{color:colors.muted,fontSize:6,fontWeight:'900'},
 categoryPanel:{borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,paddingHorizontal:13},categoryRow:{minHeight:65,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:colors.border,paddingVertical:10},categoryCopy:{flex:1},categoryTitle:{color:colors.text,fontSize:11,fontWeight:'900'},categoryCaption:{color:colors.muted,fontSize:8,marginTop:3},categoryCount:{color:colors.primary,fontSize:13,fontWeight:'900'},
 pressed:{opacity:.76},empty:{paddingVertical:28,alignItems:'center'},emptyTitle:{color:colors.text,fontWeight:'900'},emptyText:{color:colors.muted,fontSize:9,marginTop:4},
});
