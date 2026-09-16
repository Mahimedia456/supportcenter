
import React,{useMemo,useState} from 'react';
import {Pressable,RefreshControl,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {SupportPeriodFilter} from '@/components/SupportPeriodFilter';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {DEFAULT_SUPPORT_PERIOD,filterTicketsBySupportPeriod,type SupportPeriod} from '@/lib/support-period';
import {dimensionValue,isTruthyDimension,type SupportDimension} from '@/lib/support-dimensions';
import type {ZendeskTicket} from '@/lib/api';

export default function TicketResults(){
 const params=useLocalSearchParams<{role?:string;value?:string;formId?:string;title?:string;preset?:string}>();
 const {snapshot,loading,refreshing,error,refresh}=useGlobalSupportSnapshot();
 const [period,setPeriod]=useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
 const [query,setQuery]=useState('');
 const [status,setStatus]=useState('all');

 const rows=useMemo(()=>{
  if(!snapshot) return [];
  let tickets=filterTicketsBySupportPeriod(snapshot.tickets,period);

  if(params.formId){
   const id=Number(params.formId);
   tickets=tickets.filter(t=>Number(t.ticket_form_id)===id);
  }

  if(params.role&&params.value){
   const role=params.role as SupportDimension;
   const wanted=String(params.value).trim().toLowerCase();
   tickets=tickets.filter(t=>
    dimensionValue(t,snapshot.fields,role)
     .split(',').map((item:string)=>item.trim().toLowerCase()).includes(wanted)
   );
  }

  if(params.preset==='open') tickets=tickets.filter(t=>String(t.status||'').toLowerCase()==='open');
  if(params.preset==='faulty') tickets=tickets.filter(t=>isTruthyDimension(dimensionValue(t,snapshot.fields,'faultCategory')));
  if(params.preset==='rma') tickets=tickets.filter(t=>isTruthyDimension(dimensionValue(t,snapshot.fields,'rma')));
  if(params.preset==='unassigned') tickets=tickets.filter(t=>!t.assignee_id);
  if(status!=='all') tickets=tickets.filter(t=>String(t.status||'').toLowerCase()===status);

  const needle=query.trim().toLowerCase();
  if(needle){
   tickets=tickets.filter(t=>[
    t.id,t.subject||'',t.description||'',...(t.tags||[])
   ].join(' ').toLowerCase().includes(needle));
  }

  return [...tickets].sort((a,b)=>
   new Date(b.updated_at||b.created_at||0).getTime()-
   new Date(a.updated_at||a.created_at||0).getTime()
  );
 },[params.formId,params.preset,params.role,params.value,period,query,snapshot,status]);

 return <SafeAreaView style={s.safe} edges={['top','left','right']}>
  <ScrollView style={s.screen} contentContainerStyle={s.content}
   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>}>
   <View style={s.header}>
    <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="chevron-back" size={23} color={colors.text}/></Pressable>
    <View style={s.headerCopy}>
     <Text style={s.eyebrow}>TICKET RESULTS</Text>
     <Text style={s.title} numberOfLines={2}>{params.title||'Tickets'}</Text>
     <Text style={s.caption}>{rows.length} matching tickets</Text>
    </View>
   </View>

   <SupportPeriodFilter value={period} onChange={setPeriod}/>

   <View style={s.search}>
    <Ionicons name="search-outline" size={18} color={colors.muted}/>
    <TextInput value={query} onChangeText={setQuery} placeholder="Search tickets"
     placeholderTextColor={colors.muted} style={s.searchInput}/>
   </View>

   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statusRow}>
    {['all','new','open','pending','hold','solved'].map(item=><Pressable key={item}
     onPress={()=>setStatus(item)} style={[s.statusChip,status===item&&s.statusActive]}>
     <Text style={[s.statusText,status===item&&s.statusTextActive]}>
      {item==='all'?'All':item.charAt(0).toUpperCase()+item.slice(1)}
     </Text>
    </Pressable>)}
   </ScrollView>

   {loading&&!snapshot?<State text="Initializing support data…"/>:null}
   {error?<State text={error} error/>:null}

   {snapshot?rows.map(ticket=><TicketRow key={ticket.id} ticket={ticket} snapshot={snapshot}/>):null}
  </ScrollView>
 </SafeAreaView>
}

function TicketRow({ticket,snapshot}:{ticket:ZendeskTicket;snapshot:any}){
 const agent=snapshot.agents.find((x:any)=>Number(x.id)===Number(ticket.assignee_id));
 const group=snapshot.groups.find((x:any)=>Number(x.id)===Number(ticket.group_id));
 const form=snapshot.forms.find((x:any)=>Number(x.id)===Number(ticket.ticket_form_id));

 return <Pressable onPress={()=>router.push({pathname:'/ticket/[id]',params:{id:String(ticket.id)}})} style={s.ticket}>
  <View style={s.ticketTop}><Text style={s.ticketId}>#{ticket.id}</Text><Text style={s.ticketStatus}>{String(ticket.status||'')}</Text></View>
  <Text style={s.subject} numberOfLines={2}>{ticket.subject||'Untitled ticket'}</Text>
  <View style={s.metaGrid}>
   <Meta label="Assignee" value={agent?.name||agent?.email||'Unassigned'}/>
   <Meta label="Group" value={group?.name||'No group'}/>
   <Meta label="Form" value={form?.display_name||form?.name||'Default'}/>
  </View>
 </Pressable>
}

function Meta({label,value}:{label:string;value:string}){return <View style={s.meta}><Text style={s.metaLabel}>{label}</Text><Text style={s.metaValue} numberOfLines={1}>{value}</Text></View>}
function State({text,error=false}:{text:string;error?:boolean}){return <View style={s.state}><Text style={error?s.errorTitle:s.stateTitle}>{text}</Text></View>}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},screen:{flex:1},content:{paddingHorizontal:18,paddingTop:5,paddingBottom:100},
 header:{flexDirection:'row',alignItems:'flex-start',gap:11,marginBottom:2},back:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},headerCopy:{flex:1},
 eyebrow:{color:colors.primary,fontSize:8,fontWeight:'900',letterSpacing:1},title:{color:colors.text,fontSize:22,fontWeight:'900',marginTop:2},caption:{color:colors.muted,fontSize:9,marginTop:2},
 search:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,borderRadius:15,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,paddingHorizontal:12},searchInput:{flex:1,color:colors.text,fontSize:11},
 statusRow:{gap:7,paddingVertical:11},statusChip:{borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,paddingHorizontal:11,paddingVertical:7},statusActive:{backgroundColor:colors.primary,borderColor:colors.primary},statusText:{color:colors.muted,fontSize:9,fontWeight:'800'},statusTextActive:{color:'#fff'},
 state:{borderRadius:15,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:14,marginBottom:10},stateTitle:{color:colors.text,fontWeight:'900'},errorTitle:{color:'#B42318',fontWeight:'900'},
 ticket:{borderRadius:17,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:13,marginBottom:9},ticketTop:{flexDirection:'row',justifyContent:'space-between'},ticketId:{color:colors.primary,fontWeight:'900',fontSize:10},ticketStatus:{color:colors.muted,fontWeight:'800',fontSize:9,textTransform:'capitalize'},subject:{color:colors.text,fontSize:13,fontWeight:'900',marginTop:7},
 metaGrid:{flexDirection:'row',gap:7,marginTop:10},meta:{flex:1,borderRadius:10,backgroundColor:colors.background,padding:8},metaLabel:{color:colors.muted,fontSize:7,fontWeight:'800'},metaValue:{color:colors.text,fontSize:9,fontWeight:'900',marginTop:3},
});
