import React,{useMemo,useState} from 'react';
import {
 ActivityIndicator,
 FlatList,
 Pressable,
 RefreshControl,
 ScrollView,
 StyleSheet,
 Text,
 TextInput,
 View,
} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {SupportPeriodFilter} from '@/components/SupportPeriodFilter';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {
 DEFAULT_SUPPORT_PERIOD,
 filterTicketsBySupportPeriod,
 type SupportPeriod,
 type SupportPeriodPreset,
} from '@/lib/support-period';
import {
 dimensionValue,
 isTruthyDimension,
 type SupportDimension,
} from '@/lib/support-dimensions';
import {buildManagerAlerts} from '@/lib/alerts';
import {rmaTicketInfo} from '@/lib/rma-analytics';
import {deriveRegion} from '@/lib/overview';
import type {ZendeskTicket} from '@/lib/api';

const HOUR=60*60*1000;

function ageHours(value?:string|null){
 const ms=new Date(value||0).getTime();
 return Number.isFinite(ms)?(Date.now()-ms)/HOUR:0;
}

function active(ticket:ZendeskTicket){
 return ['new','open','pending','hold'].includes(String(ticket.status||'').toLowerCase());
}

function safeText(value:unknown,fallback=''){
 if(value===null||value===undefined)return fallback;
 if(['string','number','boolean'].includes(typeof value))return String(value);
 return fallback;
}

function shortDate(value?:string|null){
 if(!value)return '—';
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return '—';
 return date.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}

function statusTone(status:string){
 switch(status.toLowerCase()){
  case 'new':return{bg:'#EAF3FF',fg:'#1D63B8'};
  case 'open':return{bg:'#EAF7F1',fg:colors.primary};
  case 'pending':return{bg:'#FFF5DF',fg:colors.warning};
  case 'hold':return{bg:'#F1EDFF',fg:'#7256B5'};
  default:return{bg:'#EEF1F3',fg:colors.muted};
 }
}

function initialPeriod(params:any):SupportPeriod{
 const raw=String(params.period||'').trim() as SupportPeriodPreset;
 if(['today','7','30','90','month0','month1','month2'].includes(raw))return{preset:raw};
 if(raw==='custom'&&params.start&&params.end){
  return{preset:'custom',start:String(params.start),end:String(params.end)};
 }
 return DEFAULT_SUPPORT_PERIOD;
}

export default function TicketResults(){
 const params=useLocalSearchParams<{
  role?:string;
  value?:string;
  formId?:string;
  title?:string;
  preset?:string;
  alertId?:string;
  rmaDevice?:string;
  rmaCategory?:string;
  rmaWorkflow?:string;
  rmaDisposition?:string;
  period?:string;
  start?:string;
  end?:string;
 }>();

 const {snapshot,loading,refreshing,error,refresh}=useGlobalSupportSnapshot();
 const [period,setPeriod]=useState<SupportPeriod>(()=>initialPeriod(params));
 const [query,setQuery]=useState('');
 const [status,setStatus]=useState('all');

 const rows=useMemo(()=>{
  if(!snapshot)return[];

  let tickets=filterTicketsBySupportPeriod(snapshot.tickets,period);

  if(params.formId){
   const id=Number(params.formId);
   tickets=tickets.filter(ticket=>Number(ticket.ticket_form_id)===id);
  }

  if(params.role&&params.value){
   const wanted=String(params.value).trim().toLowerCase();
   if(params.role==='region'){
    tickets=tickets.filter(ticket=>deriveRegion(ticket).trim().toLowerCase()===wanted);
   }else{
    const role=params.role as SupportDimension;
    tickets=tickets.filter(ticket=>
     dimensionValue(ticket,snapshot.fields,role)
      .split(',')
      .map(item=>item.trim().toLowerCase())
      .includes(wanted),
    );
   }
  }

  if(params.alertId){
   const baseIds=new Set(tickets.map(ticket=>Number(ticket.id)));
   const ratings=(snapshot.satisfaction||[]).filter((item:any)=>baseIds.has(Number(item.ticket_id)));
   const metrics=(snapshot.metrics||[]).filter((item:any)=>baseIds.has(Number(item.ticket_id)));
   const events=(snapshot.metricEvents||[]).filter((item:any)=>baseIds.has(Number(item.ticket_id)));
   const alert=buildManagerAlerts(
    tickets,
    ratings,
    snapshot.fields||[],
    snapshot.forms||[],
    metrics,
    events,
    {includeDeviceSpikes:false},
   ).find(item=>item.id===params.alertId);
   const ids=new Set(alert?.ticketIds||[]);
   tickets=tickets.filter(ticket=>ids.has(Number(ticket.id)));
  }

  const preset=String(params.preset||'');
  if(preset==='open')tickets=tickets.filter(ticket=>['new','open'].includes(String(ticket.status||'').toLowerCase()));
  if(preset==='priority')tickets=tickets.filter(ticket=>['high','urgent'].includes(String(ticket.priority||'').toLowerCase()));
  if(preset==='unassigned')tickets=tickets.filter(ticket=>!ticket.assignee_id);
  if(preset==='pending')tickets=tickets.filter(ticket=>String(ticket.status||'').toLowerCase()==='pending');
  if(preset==='faulty')tickets=tickets.filter(ticket=>isTruthyDimension(dimensionValue(ticket,snapshot.fields,'faultCategory')));
  if(preset==='rma')tickets=tickets.filter(ticket=>rmaTicketInfo(ticket,snapshot.fields,snapshot.forms).isRma);
  if(preset==='breached'){
   const ids=new Set((snapshot.metricEvents||[]).filter((event:any)=>event?.type==='breach').map((event:any)=>Number(event.ticket_id)));
   tickets=tickets.filter(ticket=>ids.has(Number(ticket.id)));
  }
  if(preset==='no-reply'){
   const byMetric=new Map((snapshot.metrics||[]).map((item:any)=>[Number(item.ticket_id),item]));
   tickets=tickets.filter(ticket=>{
    const metric:any=byMetric.get(Number(ticket.id));
    return active(ticket)&&metric&&Number(metric.replies||0)===0&&ageHours(ticket.created_at)>=4;
   });
  }
  if(preset==='slow-reply'){
   const ids=new Set((snapshot.metrics||[]).filter((item:any)=>Number(item.reply_time_in_minutes?.calendar||0)>240).map((item:any)=>Number(item.ticket_id)));
   tickets=tickets.filter(ticket=>ids.has(Number(ticket.id)));
  }
  if(preset==='over72')tickets=tickets.filter(ticket=>active(ticket)&&ageHours(ticket.created_at)>=72);

  if(params.rmaDevice||params.rmaCategory||params.rmaWorkflow||params.rmaDisposition){
   tickets=tickets.filter(ticket=>{
    const info=rmaTicketInfo(ticket,snapshot.fields,snapshot.forms);
    if(!info.isRma)return false;
    if(params.rmaDevice&&info.device!==params.rmaDevice)return false;
    if(params.rmaCategory&&info.category!==params.rmaCategory)return false;
    if(params.rmaWorkflow&&params.rmaWorkflow!=='all'&&info.shipment!==params.rmaWorkflow)return false;
    if(params.rmaDisposition&&info.disposition!==params.rmaDisposition)return false;
    return true;
   });
  }

  if(status!=='all')tickets=tickets.filter(ticket=>String(ticket.status||'').toLowerCase()===status);

  const needle=query.trim().toLowerCase();
  if(needle){
   tickets=tickets.filter(ticket=>[
    ticket.id,
    ticket.subject||'',
    ticket.description||'',
    ticket.status||'',
    ticket.priority||'',
    ...(ticket.tags||[]),
   ].join(' ').toLowerCase().includes(needle));
  }

  return[...tickets].sort((a,b)=>
   new Date(b.updated_at||b.created_at||0).getTime()-
   new Date(a.updated_at||a.created_at||0).getTime(),
  );
 },[
  params.alertId,
  params.formId,
  params.preset,
  params.rmaCategory,
  params.rmaDevice,
  params.rmaDisposition,
  params.rmaWorkflow,
  params.role,
  params.value,
  period,
  query,
  snapshot,
  status,
 ]);

 const agentMap=useMemo(()=>new Map((snapshot?.agents||[]).map((item:any)=>[Number(item.id),item])),[snapshot?.agents]);
 const groupMap=useMemo(()=>new Map((snapshot?.groups||[]).map((item:any)=>[Number(item.id),item])),[snapshot?.groups]);
 const formMap=useMemo(()=>new Map((snapshot?.forms||[]).map((item:any)=>[Number(item.id),item])),[snapshot?.forms]);

 const header=<>
  <View style={s.topNav}>
   <Pressable onPress={()=>router.back()} style={({pressed})=>[s.back,pressed&&s.pressed]}>
    <Ionicons name="chevron-back" size={23} color={colors.text}/>
   </Pressable>
   <View style={s.topCopy}>
    <Text style={s.eyebrow}>FILTERED TICKET OPERATIONS</Text>
    <Text style={s.title} numberOfLines={2}>{params.title||'Tickets'}</Text>
    <Text style={s.caption}>{rows.length} matching tickets</Text>
   </View>
   <View style={s.total}>
    <Text style={s.totalValue}>{rows.length}</Text>
    <Text style={s.totalLabel}>TOTAL</Text>
   </View>
  </View>

  <SupportPeriodFilter value={period} onChange={setPeriod}/>

  <View style={s.search}>
   <Ionicons name="search-outline" size={18} color={colors.muted}/>
   <TextInput
    value={query}
    onChangeText={setQuery}
    placeholder="Search ID, subject, status, priority"
    placeholderTextColor={colors.muted}
    style={s.searchInput}
   />
   {query?<Pressable onPress={()=>setQuery('')} hitSlop={8}>
    <Ionicons name="close-circle" size={18} color={colors.muted}/>
   </Pressable>:null}
  </View>

  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statusRow}>
   {['all','new','open','pending','hold','solved'].map(item=><Pressable
    key={item}
    onPress={()=>setStatus(item)}
    style={[s.statusChip,status===item&&s.statusActive]}
   >
    <Text style={[s.statusText,status===item&&s.statusTextActive]}>
     {item==='all'?'All':item.charAt(0).toUpperCase()+item.slice(1)}
    </Text>
   </Pressable>)}
  </ScrollView>

  {error?<View style={s.error}>
   <Text style={s.errorTitle}>Using saved support data</Text>
   <Text style={s.errorText}>The last saved snapshot remains available while background sync completes.</Text>
  </View>:null}
 </>;

 return <SafeAreaView style={s.safe} edges={['top','left','right']}>
  <FlatList
   style={s.screen}
   contentContainerStyle={s.content}
   data={rows}
   keyExtractor={item=>String(item.id)}
   initialNumToRender={12}
   maxToRenderPerBatch={12}
   windowSize={7}
   removeClippedSubviews
   keyboardShouldPersistTaps="handled"
   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>}
   ListHeaderComponent={header}
   ListEmptyComponent={loading&&!snapshot?<View style={s.loading}>
    <ActivityIndicator color={colors.primary}/>
    <Text style={s.loadingText}>Loading saved support snapshot...</Text>
   </View>:<View style={s.empty}>
    <Ionicons name="file-tray-outline" size={38} color={colors.primary}/>
    <Text style={s.emptyTitle}>No tickets found</Text>
    <Text style={s.emptyText}>Change the period or filters.</Text>
   </View>}
   renderItem={({item:ticket})=>{
    const agent:any=agentMap.get(Number(ticket.assignee_id));
    const group:any=groupMap.get(Number(ticket.group_id));
    const form:any=formMap.get(Number(ticket.ticket_form_id));
    const currentStatus=safeText(ticket.status,'unknown');
    const priority=safeText(ticket.priority,'normal');
    const tone=statusTone(currentStatus);
    const important=['high','urgent'].includes(priority.toLowerCase());

    return <Pressable
     onPress={()=>router.push({pathname:'/ticket/[id]',params:{id:String(ticket.id)}})}
     style={({pressed})=>[s.card,pressed&&s.pressed]}
    >
     <View style={s.top}>
      <View style={s.topLeft}>
       <Text style={s.id}>#{ticket.id}</Text>
       <View style={[s.pill,{backgroundColor:tone.bg}]}>
        <Text style={[s.pillText,{color:tone.fg}]}>{currentStatus}</Text>
       </View>
       <View style={s.priority}>
        <Ionicons name={important?'flag':'flag-outline'} size={10} color={important?colors.warning:colors.muted}/>
        <Text style={s.priorityText}>{priority}</Text>
       </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.cyan}/>
     </View>

     <Text style={s.subject} numberOfLines={2}>{safeText(ticket.subject,'Untitled ticket')}</Text>

     <View style={s.meta}>
      <Meta icon="person-outline" label="Assignee" value={safeText(agent?.name||agent?.email,'Unassigned')}/>
      <Meta icon="people-outline" label="Group" value={safeText(group?.name,'No group')}/>
      <Meta icon="document-text-outline" label="Form" value={safeText(form?.display_name||form?.name,'Default form')}/>
     </View>

     <View style={s.footer}>
      <View style={s.timeRow}>
       <Ionicons name="time-outline" size={13} color={colors.muted}/>
       <Text style={s.timeText}>Updated {shortDate(ticket.updated_at||ticket.created_at)}</Text>
      </View>
      <Text style={s.open}>Open ticket</Text>
     </View>
    </Pressable>;
   }}
  />
 </SafeAreaView>;
}

function Meta({icon,label,value}:{icon:keyof typeof Ionicons.glyphMap;label:string;value:string}){
 return <View style={s.metaRow}>
  <Ionicons name={icon} size={14} color={colors.muted}/>
  <Text style={s.metaLabel}>{label}</Text>
  <Text style={s.metaValue} numberOfLines={1}>{value}</Text>
 </View>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},
 screen:{flex:1,backgroundColor:colors.background},
 content:{paddingHorizontal:18,paddingTop:8,paddingBottom:100},
 topNav:{flexDirection:'row',alignItems:'flex-start',gap:11,marginBottom:2},
 back:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
 topCopy:{flex:1,paddingTop:1},
 eyebrow:{color:colors.primary,fontSize:8,fontWeight:'900',letterSpacing:1},
 title:{color:colors.text,fontSize:23,lineHeight:28,fontWeight:'900',marginTop:2},
 caption:{color:colors.muted,fontSize:9,marginTop:2},
 total:{minWidth:58,minHeight:54,borderRadius:16,backgroundColor:colors.primarySoft,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center',paddingHorizontal:8},
 totalValue:{color:colors.primary,fontSize:18,fontWeight:'900'},
 totalLabel:{color:colors.muted,fontSize:7,fontWeight:'900'},
 search:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,borderRadius:15,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,paddingHorizontal:12},
 searchInput:{flex:1,color:colors.text,fontSize:11},
 statusRow:{gap:7,paddingVertical:11},
 statusChip:{borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,paddingHorizontal:11,paddingVertical:7},
 statusActive:{backgroundColor:colors.primary,borderColor:colors.primary},
 statusText:{color:colors.muted,fontSize:9,fontWeight:'800'},
 statusTextActive:{color:'#fff'},
 error:{borderRadius:15,borderWidth:1,borderColor:'#F3D7A5',backgroundColor:'#FFF9EC',padding:12,marginBottom:10},
 errorTitle:{color:colors.warning,fontSize:10,fontWeight:'900'},
 errorText:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:3},
 loading:{alignItems:'center',paddingVertical:45,gap:10},
 loadingText:{color:colors.muted,fontSize:10},
 empty:{alignItems:'center',paddingVertical:45},
 emptyTitle:{color:colors.text,fontWeight:'900',marginTop:10},
 emptyText:{color:colors.muted,fontSize:10,marginTop:4},
 card:{borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:14,marginBottom:10},
 pressed:{opacity:.76},
 top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 topLeft:{flex:1,flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'},
 id:{color:colors.primary,fontSize:10,fontWeight:'900'},
 pill:{borderRadius:999,paddingHorizontal:8,paddingVertical:4},
 pillText:{fontSize:8,fontWeight:'900',textTransform:'capitalize'},
 priority:{flexDirection:'row',alignItems:'center',gap:3},
 priorityText:{color:colors.muted,fontSize:8,fontWeight:'800',textTransform:'capitalize'},
 subject:{color:colors.text,fontSize:14,lineHeight:19,fontWeight:'900',marginTop:10},
 meta:{marginTop:11,gap:6},
 metaRow:{minHeight:22,flexDirection:'row',alignItems:'center',gap:6},
 metaLabel:{width:58,color:colors.muted,fontSize:8,fontWeight:'800'},
 metaValue:{flex:1,color:colors.text,fontSize:9,fontWeight:'800'},
 footer:{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:colors.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 timeRow:{flex:1,flexDirection:'row',alignItems:'center',gap:5},
 timeText:{color:colors.muted,fontSize:8,fontWeight:'700'},
 open:{color:colors.cyan,fontSize:9,fontWeight:'900'},
});
