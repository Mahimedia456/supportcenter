import React,{useMemo,useState} from 'react';
import {FlatList,Pressable,RefreshControl,StyleSheet,Text,View} from 'react-native';
import {router,type Href} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {SupportPeriodFilter} from '@/components/SupportPeriodFilter';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {DEFAULT_SUPPORT_PERIOD,filterTicketsBySupportPeriod,type SupportPeriod} from '@/lib/support-period';
import {buildManagerAlerts,type ManagerAlert} from '@/lib/alerts';

type Filter='all'|'critical'|'warning'|'info';
const FILTERS:Array<{key:Filter;label:string}>=[{key:'all',label:'All'},{key:'critical',label:'Critical'},{key:'warning',label:'Warning'},{key:'info',label:'Info'}];

export default function AlertsScreen(){
 const {snapshot,loading,refreshing,error,refresh}=useGlobalSupportSnapshot();
 const [period,setPeriod]=useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
 const [filter,setFilter]=useState<Filter>('all');

 const tickets=useMemo(()=>filterTicketsBySupportPeriod(snapshot?.tickets||[],period),[snapshot?.tickets,period]);
 const ids=useMemo(()=>new Set(tickets.map((t:any)=>Number(t.id))),[tickets]);
 const ratings=useMemo(()=>(snapshot?.satisfaction||[]).filter((r:any)=>ids.has(Number(r.ticket_id))),[snapshot?.satisfaction,ids]);
 const metrics=useMemo(()=>(snapshot?.metrics||[]).filter((m:any)=>ids.has(Number(m.ticket_id))),[snapshot?.metrics,ids]);
 const events=useMemo(()=>(snapshot?.metricEvents||[]).filter((e:any)=>ids.has(Number(e.ticket_id))),[snapshot?.metricEvents,ids]);

 const alerts=useMemo(
  ()=>buildManagerAlerts(tickets,ratings,snapshot?.fields||[],snapshot?.forms||[],metrics,events,{includeDeviceSpikes:false}),
  [tickets,ratings,snapshot?.fields,snapshot?.forms,metrics,events],
 );
 const filtered=useMemo(()=>filter==='all'?alerts:alerts.filter(a=>a.severity===filter),[alerts,filter]);
 const counts=useMemo(()=>({
  critical:alerts.filter(a=>a.severity==='critical').length,
  warning:alerts.filter(a=>a.severity==='warning').length,
  info:alerts.filter(a=>a.severity==='info').length,
 }),[alerts]);

 const header=<>
  <View style={s.topNav}>
   <Pressable onPress={()=>router.back()} style={({pressed})=>[s.back,pressed&&{opacity:.75}]}><Ionicons name="chevron-back" size={23} color={colors.text}/></Pressable>
   <Text style={s.topTitle}>Alerts</Text>
   <View style={s.topSpacer}/>
  </View>

  <View style={s.hero}>
   <View style={s.heroCopy}>
    <Text style={s.eyebrow}>MANAGER ALERTS</Text>
    <Text style={s.title}>Operational signals</Text>
    <Text style={s.caption}>Reply delays, customer waits, stale activity, priority, assignment, SLA and CSAT.</Text>
   </View>
   <View style={s.live}><View style={s.liveDot}/><Text style={s.liveText}>SNAPSHOT</Text></View>
  </View>

  <SupportPeriodFilter value={period} onChange={setPeriod}/>

  <View style={s.summaryRow}>
   <Summary label="Critical" value={counts.critical} tone="critical"/>
   <Summary label="Warning" value={counts.warning} tone="warning"/>
   <Summary label="Info" value={counts.info} tone="info"/>
  </View>

  <View style={s.filters}>
   {FILTERS.map(item=><Pressable key={item.key} onPress={()=>setFilter(item.key)} style={[s.filter,filter===item.key&&s.filterActive]}><Text style={[s.filterText,filter===item.key&&s.filterTextActive]}>{item.label}</Text></Pressable>)}
  </View>

  {error?<View style={s.notice}><Text style={s.noticeTitle}>Using saved alert data</Text><Text style={s.noticeText}>The last successful snapshot remains visible while background sync completes.</Text></View>:null}

  <View style={s.section}><Text style={s.sectionTitle}>Active signals</Text><Text style={s.badge}>{filtered.length}</Text></View>
 </>;

 return <SafeAreaView style={s.safe} edges={['top','left','right']}>
  <FlatList
   style={s.screen}
   contentContainerStyle={s.content}
   data={filtered}
   keyExtractor={item=>item.id}
   initialNumToRender={8}
   maxToRenderPerBatch={8}
   windowSize={5}
   ListHeaderComponent={header}
   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>}
   renderItem={({item})=><AlertCard alert={item} onPress={()=>router.push({pathname:'/alert/[id]',params:{id:item.id}} as unknown as Href)}/>}
   ListEmptyComponent={!loading?<View style={s.empty}><Ionicons name="checkmark-circle-outline" size={42} color={colors.primary}/><Text style={s.emptyTitle}>No alerts in this period</Text><Text style={s.emptyText}>Saved snapshot has no matching operational alerts.</Text></View>:null}
  />
 </SafeAreaView>
}

function Summary({label,value,tone}:{label:string;value:number;tone:'critical'|'warning'|'info'}){const bg=tone==='critical'?'#FDECEC':tone==='warning'?'#FFF5DF':colors.cyanSoft;const fg=tone==='critical'?colors.danger:tone==='warning'?colors.warning:colors.cyan;return <View style={[s.summary,{backgroundColor:bg}]}><Text style={[s.summaryValue,{color:fg}]}>{value}</Text><Text style={s.summaryLabel}>{label}</Text></View>}
function AlertCard({alert,onPress}:{alert:ManagerAlert;onPress:()=>void}){const accent=alert.severity==='critical'?colors.danger:alert.severity==='warning'?colors.warning:colors.cyan;return <Pressable onPress={onPress} style={s.card}><View style={[s.indicator,{backgroundColor:accent}]}/><View style={s.cardBody}><View style={s.cardTop}><Text style={s.cardTitle}>{alert.title}</Text><Text style={[s.severity,{color:accent}]}>{alert.severity.toUpperCase()}</Text></View><Text style={s.message}>{alert.message}</Text><View style={s.footer}><Text style={s.ticketCount}>{alert.count} ticket{alert.count===1?'':'s'}</Text><Text style={s.open}>View tickets ›</Text></View></View></Pressable>}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:18,paddingBottom:80},topNav:{minHeight:50,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},back:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},topTitle:{color:colors.text,fontSize:18,fontWeight:'900'},topSpacer:{width:42},hero:{flexDirection:'row',justifyContent:'space-between',gap:10},heroCopy:{flex:1},eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1},title:{color:colors.text,fontSize:28,fontWeight:'900',marginTop:4},caption:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:4},live:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,backgroundColor:colors.primarySoft,borderRadius:999,paddingHorizontal:10,paddingVertical:7},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.lime},liveText:{color:colors.primary,fontSize:8,fontWeight:'900'},summaryRow:{flexDirection:'row',gap:8,marginTop:2},summary:{flex:1,minHeight:78,borderRadius:16,borderWidth:1,borderColor:colors.border,padding:12},summaryValue:{fontSize:22,fontWeight:'900'},summaryLabel:{color:colors.muted,fontSize:8,fontWeight:'800',marginTop:5},filters:{flexDirection:'row',gap:8,marginVertical:12},filter:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:999,paddingHorizontal:13,paddingVertical:9},filterActive:{backgroundColor:colors.primary,borderColor:colors.primary},filterText:{color:colors.muted,fontSize:9,fontWeight:'800'},filterTextActive:{color:'#fff'},notice:{borderRadius:15,borderWidth:1,borderColor:'#F3D7A5',backgroundColor:'#FFF9EC',padding:12,marginBottom:10},noticeTitle:{color:colors.warning,fontSize:10,fontWeight:'900'},noticeText:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:3},section:{marginTop:2,marginBottom:10,flexDirection:'row',justifyContent:'space-between'},sectionTitle:{color:colors.text,fontSize:17,fontWeight:'900'},badge:{color:colors.primary,backgroundColor:colors.primarySoft,borderRadius:999,paddingHorizontal:9,paddingVertical:5,fontSize:9,fontWeight:'900'},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,flexDirection:'row',overflow:'hidden',marginBottom:10},indicator:{width:5},cardBody:{flex:1,padding:15},cardTop:{flexDirection:'row',justifyContent:'space-between',gap:10},cardTitle:{flex:1,color:colors.text,fontSize:14,fontWeight:'900'},severity:{fontSize:8,fontWeight:'900'},message:{color:colors.muted,fontSize:11,lineHeight:17,marginTop:6},footer:{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:colors.border,flexDirection:'row',justifyContent:'space-between'},ticketCount:{color:colors.muted,fontSize:9,fontWeight:'700'},open:{color:colors.cyan,fontSize:10,fontWeight:'900'},empty:{alignItems:'center',paddingVertical:50},emptyTitle:{color:colors.text,fontWeight:'900',marginTop:12},emptyText:{color:colors.muted,fontSize:10,marginTop:5,textAlign:'center'}
});
