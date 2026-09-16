
import React,{useMemo,useState} from 'react';
import {Pressable,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {router,type Href} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {WorkspaceHeader} from '@/components/WorkspaceHeader';
import {SupportPeriodFilter} from '@/components/SupportPeriodFilter';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {DEFAULT_SUPPORT_PERIOD,filterTicketsBySupportPeriod,type SupportPeriod} from '@/lib/support-period';
import {dimensionRows,fieldForDimension,type SupportDimension} from '@/lib/support-dimensions';

type Tab='forms'|'supportType'|'device'|'region'|'category'|'faultCategory'|'rma';
const TABS:Array<{key:Tab;label:string;icon:keyof typeof Ionicons.glyphMap}>=[
 {key:'forms',label:'Forms',icon:'document-text-outline'},
 {key:'supportType',label:'Support',icon:'help-buoy-outline'},
 {key:'device',label:'Devices',icon:'hardware-chip-outline'},
 {key:'region',label:'Regions',icon:'globe-outline'},
 {key:'category',label:'Category',icon:'grid-outline'},
 {key:'faultCategory',label:'Fault',icon:'warning-outline'},
 {key:'rma',label:'RMA',icon:'repeat-outline'},
];

export default function Insights(){
 const {snapshot,loading,refreshing,error,refresh}=useGlobalSupportSnapshot();
 const [period,setPeriod]=useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
 const [tab,setTab]=useState<Tab>('forms');

 const tickets=useMemo(()=>filterTicketsBySupportPeriod(snapshot?.tickets||[],period),[snapshot?.tickets,period]);
 const forms=snapshot?.forms||[];
 const fields=snapshot?.fields||[];

 const rows=useMemo(()=>{
  if(tab==='forms'){
   const counts=new Map<number,number>();
   for(const ticket of tickets){
    if(ticket.ticket_form_id){
     const id=Number(ticket.ticket_form_id);
     counts.set(id,(counts.get(id)||0)+1);
    }
   }
   return forms.map((form:any)=>({
    id:Number(form.id),
    label:form.display_name||form.name||`Form ${form.id}`,
    count:counts.get(Number(form.id))||0,
   })).filter((row)=>row.count>0).sort((a,b)=>b.count-a.count);
  }
  return dimensionRows(tickets,fields,tab as SupportDimension).map((row,index)=>({id:index,...row}));
 },[fields,forms,tab,tickets]);

 const max=Math.max(1,...rows.map((r)=>r.count));

 function openRow(row:any){
  if(tab==='forms'){
   router.push({pathname:'/ticket-results',params:{formId:String(row.id),title:row.label}} as unknown as Href);
  }else{
   router.push({pathname:'/ticket-results',params:{role:tab,value:row.label,title:row.label}} as unknown as Href);
  }
 }

 return <ScrollView style={s.screen} contentContainerStyle={s.content}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>}>
  <WorkspaceHeader/>
  <Text style={s.eyebrow}>SUPPORT INTELLIGENCE</Text>
  <Text style={s.title}>Insights</Text>
  <Text style={s.caption}>Shared 90-day DB snapshot</Text>

  <SupportPeriodFilter value={period} onChange={setPeriod}/>

  <View style={s.summary}>
   <Mini label="Tickets" value={tickets.length}/>
   <Mini label="Forms" value={forms.length}/>
   <Mini label="Fields" value={fields.length}/>
  </View>

  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
   {TABS.map(item=><Pressable key={item.key} onPress={()=>setTab(item.key)}
    style={[s.tab,tab===item.key&&s.tabActive]}>
    <Ionicons name={item.icon} size={15} color={tab===item.key?'#fff':colors.muted}/>
    <Text style={[s.tabText,tab===item.key&&s.tabTextActive]}>{item.label}</Text>
   </Pressable>)}
  </ScrollView>

  {tab!=='forms'?<View style={s.detected}>
   <Text style={s.detectedLabel}>DETECTED FIELD</Text>
   <Text style={s.detectedValue}>{fieldForDimension(fields,tab as SupportDimension)?.title||'Not detected'}</Text>
  </View>:null}

  {loading&&!snapshot?<State text="Initializing support data…"/>:null}
  {error?<State text={error} error/>:null}

  <View style={s.panel}>
   <View style={s.panelHead}>
    <Text style={s.panelTitle}>{TABS.find(x=>x.key===tab)?.label}</Text>
    <Text style={s.panelCount}>{rows.length}</Text>
   </View>
   {rows.map(row=><Pressable key={`${row.id}-${row.label}`} onPress={()=>openRow(row)} style={s.row}>
    <View style={s.rowCopy}>
     <View style={s.rowTop}>
      <Text style={s.rowTitle} numberOfLines={2}>{row.label}</Text>
      <Text style={s.rowCount}>{row.count}</Text>
     </View>
     <View style={s.track}><View style={[s.fill,{width:`${Math.max(3,(row.count/max)*100)}%`}]} /></View>
    </View>
    <Ionicons name="chevron-forward" size={17} color={colors.cyan}/>
   </Pressable>)}
   {!rows.length&&!loading?<View style={s.empty}><Text style={s.emptyTitle}>No values found</Text><Text style={s.emptyText}>Pull down once to refresh the shared 90-day snapshot.</Text></View>:null}
  </View>
 </ScrollView>
}

function Mini({label,value}:{label:string;value:number}){return <View style={s.mini}><Text style={s.miniValue}>{value}</Text><Text style={s.miniLabel}>{label}</Text></View>}
function State({text,error=false}:{text:string;error?:boolean}){return <View style={s.state}><Text style={error?s.errorTitle:s.stateTitle}>{text}</Text></View>}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:18,paddingTop:8,paddingBottom:120},
 eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1},title:{color:colors.text,fontSize:28,fontWeight:'900',marginTop:4},caption:{color:colors.muted,fontSize:10,marginTop:4},
 summary:{flexDirection:'row',gap:7,marginTop:3},mini:{flex:1,minHeight:68,borderRadius:15,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:11},miniValue:{color:colors.text,fontSize:19,fontWeight:'900'},miniLabel:{color:colors.muted,fontSize:8,marginTop:4,fontWeight:'800'},
 tabs:{gap:7,paddingVertical:14},tab:{minHeight:40,flexDirection:'row',alignItems:'center',gap:6,borderRadius:13,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,paddingHorizontal:11},tabActive:{backgroundColor:colors.primary,borderColor:colors.primary},tabText:{color:colors.muted,fontSize:9,fontWeight:'900'},tabTextActive:{color:'#fff'},
 detected:{borderRadius:13,backgroundColor:'#F2F8F5',padding:11,marginBottom:10},detectedLabel:{color:colors.muted,fontSize:8,fontWeight:'900'},detectedValue:{color:colors.primary,fontSize:10,fontWeight:'900',marginTop:4},
 state:{borderRadius:15,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:14,marginBottom:10},stateTitle:{color:colors.text,fontWeight:'900'},errorTitle:{color:'#B42318',fontWeight:'900'},
 panel:{borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,paddingHorizontal:13},panelHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:13,borderBottomWidth:1,borderBottomColor:colors.border},panelTitle:{color:colors.text,fontSize:15,fontWeight:'900'},panelCount:{color:colors.primary,fontWeight:'900'},
 row:{minHeight:68,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:colors.border,paddingVertical:10},rowCopy:{flex:1},rowTop:{flexDirection:'row',justifyContent:'space-between',gap:10},rowTitle:{flex:1,color:colors.text,fontSize:11,fontWeight:'900'},rowCount:{color:colors.primary,fontWeight:'900'},track:{height:5,borderRadius:999,backgroundColor:'#E8F0ED',marginTop:8,overflow:'hidden'},fill:{height:'100%',backgroundColor:colors.primary},
 empty:{paddingVertical:30,alignItems:'center'},emptyTitle:{color:colors.text,fontWeight:'900'},emptyText:{color:colors.muted,fontSize:9,marginTop:4,textAlign:'center'},
});
