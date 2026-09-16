import React,{useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {router} from 'expo-router';
import {WorkspaceHeader} from '@/components/WorkspaceHeader';
import {OverviewDateFilter} from '@/components/overview/OverviewDateFilter';
import {AppCard} from '@/components/AppCard';
import {MetricCard} from '@/components/overview/MetricCard';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {overviewMetrics,ticketsForPeriod,ticketsForDateRange,type OverviewPeriod} from '@/lib/overview';

const HOUR=60*60*1000;
function ageHours(v?:string|null){const ms=new Date(v||0).getTime();return Number.isFinite(ms)?(Date.now()-ms)/HOUR:0}
function active(t:any){return ['new','open','pending','hold'].includes(String(t?.status||'').toLowerCase())}

export default function Overview(){
 const {snapshot,error}=useGlobalSupportSnapshot();
 const tickets=snapshot?.tickets||[];
 const metricsRows=snapshot?.metrics||[];
 const metricEvents=snapshot?.metricEvents||[];

 const [period,setPeriod]=useState<OverviewPeriod>('7d');
 const [customFrom,setCustomFrom]=useState(()=>{const d=new Date();d.setDate(1);d.setHours(0,0,0,0);return d});
 const [customTo,setCustomTo]=useState(new Date());

 const periodTickets=useMemo(()=>period==='custom'?ticketsForDateRange(tickets,customFrom,customTo):ticketsForPeriod(tickets,period),[period,tickets,customFrom,customTo]);
 const metrics=useMemo(()=>overviewMetrics(periodTickets),[periodTickets]);
 const ids=useMemo(()=>new Set(periodTickets.map((t:any)=>Number(t.id))),[periodTickets]);
 const metricByTicket=useMemo(()=>new Map(metricsRows.map((m:any)=>[Number(m.ticket_id),m])),[metricsRows]);

 const sla=useMemo(()=>{
  const breached=new Set(metricEvents.filter((e:any)=>e?.type==='breach'&&ids.has(Number(e.ticket_id))).map((e:any)=>Number(e.ticket_id))).size;
  const noReply=periodTickets.filter((t:any)=>{const m:any=metricByTicket.get(Number(t.id));return active(t)&&m&&Number(m.replies||0)===0&&ageHours(t.created_at)>=4}).length;
  const slowReply=metricsRows.filter((m:any)=>ids.has(Number(m.ticket_id))&&Number(m.reply_time_in_minutes?.calendar||0)>240).length;
  const over72=periodTickets.filter((t:any)=>active(t)&&ageHours(t.created_at)>=72).length;
  return {breached,noReply,slowReply,over72};
 },[periodTickets,metricByTicket,metricsRows,metricEvents,ids]);

 function openManagerView(view:string){router.push({pathname:'/(tabs)/tickets',params:{managerView:view,mode:'manager'}})}
 function openRegion(name:string){router.push({pathname:'/region/[name]',params:{name}})}
 const maxRegion=Math.max(1,...metrics.regionRows.map((r:any)=>r.count));

 return <ScrollView style={s.screen} contentContainerStyle={s.content}>
  <WorkspaceHeader/>
  <View style={s.hero}><View><Text style={s.eyebrow}>MANAGER OVERVIEW</Text><Text style={s.title}>Support at a glance</Text><Text style={s.caption}>{snapshot?.syncedAt?'Saved Zendesk snapshot':'Workspace snapshot'}</Text></View><View style={s.live}><View style={s.liveDot}/><Text style={s.liveText}>SNAPSHOT</Text></View></View>

  <OverviewDateFilter period={period} from={customFrom} to={customTo} onPreset={setPeriod} onCustom={(from,to)=>{setCustomFrom(from);setCustomTo(to);setPeriod('custom')}}/>

  {error?<AppCard style={s.errorCard}><Text style={s.errorTitle}>Using saved support data</Text><Text style={s.errorText}>The app remains usable while the next background sync completes.</Text></AppCard>:null}

  <View style={s.gridRow}><MetricCard label="Total Tickets" value={metrics.total} caption="Created in selected period" tone="green" onPress={()=>openManagerView('recent')}/><MetricCard label="Open" value={metrics.open} caption="New + open" tone="cyan" onPress={()=>openManagerView('open')}/></View>
  <View style={s.gridRow}><MetricCard label="High Priority" value={metrics.highPriority} caption="High + urgent" tone="lime" onPress={()=>openManagerView('priority')}/><MetricCard label="Unassigned" value={metrics.unassigned} caption="Needs ownership" tone="neutral" onPress={()=>openManagerView('unassigned')}/></View>

  <View style={s.sectionHeader}><Text style={s.sectionTitle}>SLA Health</Text><Text style={s.sectionCaption}>Actual breach events where available plus reply-time risk signals</Text></View>
  <View style={s.slaGrid}>
   <Risk label="Breached" value={sla.breached} critical/>
   <Risk label="No reply > 4h" value={sla.noReply} critical={sla.noReply>0}/>
   <Risk label="First reply > 4h" value={sla.slowReply}/>
   <Risk label="Unsolved > 72h" value={sla.over72}/>
  </View>

  <View style={s.sectionHeader}><Text style={s.sectionTitle}>Regions</Text><Text style={s.sectionCaption}>Quick load distribution from ticket metadata/tags</Text></View>
  <AppCard>{metrics.regionRows.map((row:any,index:number)=><Pressable key={row.name} onPress={()=>openRegion(row.name)} style={[s.regionRow,index===metrics.regionRows.length-1&&s.lastRow]}><View style={s.regionInfo}><View style={s.regionNameRow}><Text style={s.regionName}>{row.name}</Text><Text style={s.regionCount}>{row.count}</Text></View><View style={s.barTrack}><View style={[s.barFill,{width:`${Math.max(6,(row.count/maxRegion)*100)}%`}]} /></View></View><Text style={s.chevron}>›</Text></Pressable>)}{!metrics.regionRows.length?<Text style={s.emptyText}>No regional data available yet.</Text>:null}</AppCard>

  <View style={s.sectionHeader}><Text style={s.sectionTitle}>Needs attention</Text><Text style={s.sectionCaption}>Fast operational checks</Text></View>
  <View style={s.attentionGrid}><Pressable onPress={()=>openManagerView('priority')} style={s.attentionCard}><Text style={s.attentionValue}>{metrics.highPriority}</Text><Text style={s.attentionLabel}>High / Urgent</Text></Pressable><Pressable onPress={()=>openManagerView('unassigned')} style={s.attentionCard}><Text style={s.attentionValue}>{metrics.unassigned}</Text><Text style={s.attentionLabel}>Unassigned</Text></Pressable><Pressable onPress={()=>openManagerView('pending')} style={s.attentionCard}><Text style={s.attentionValue}>{metrics.pending}</Text><Text style={s.attentionLabel}>Pending</Text></Pressable></View>

  <View style={s.note}><Text style={s.noteTitle}>Snapshot-only manager view</Text><Text style={s.noteText}>Main screens do not call Zendesk directly. Background sync updates the saved snapshot; manual sync is available from Account.</Text></View>
 </ScrollView>
}

function Risk({label,value,critical=false}:{label:string;value:number;critical?:boolean}){return <View style={[s.risk,critical&&s.riskCritical]}><Text style={[s.riskValue,critical&&s.riskValueCritical]}>{value}</Text><Text style={s.riskLabel}>{label}</Text></View>}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.background},content:{padding:18,paddingBottom:120},hero:{marginTop:8,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1.2},title:{color:colors.text,fontSize:29,fontWeight:'900',marginTop:4},caption:{color:colors.muted,fontSize:12,marginTop:4},live:{backgroundColor:colors.primarySoft,borderRadius:999,paddingHorizontal:10,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:6},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.lime},liveText:{color:colors.primary,fontSize:9,fontWeight:'900'},gridRow:{flexDirection:'row',gap:10,marginTop:10},sectionHeader:{marginTop:22,marginBottom:10},sectionTitle:{color:colors.text,fontSize:18,fontWeight:'900'},sectionCaption:{color:colors.muted,fontSize:11,marginTop:3},slaGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},risk:{width:'48%',minHeight:78,borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,padding:13},riskCritical:{backgroundColor:'#FFF4F4',borderColor:'#F1CFCF'},riskValue:{color:colors.primary,fontSize:22,fontWeight:'900'},riskValueCritical:{color:colors.danger},riskLabel:{color:colors.muted,fontSize:9,fontWeight:'800',marginTop:5},regionRow:{minHeight:68,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:colors.border},lastRow:{borderBottomWidth:0},regionInfo:{flex:1,paddingRight:12},regionNameRow:{flexDirection:'row',justifyContent:'space-between'},regionName:{color:colors.text,fontWeight:'900',fontSize:13},regionCount:{color:colors.primary,fontWeight:'900',fontSize:12},barTrack:{marginTop:10,height:7,borderRadius:999,backgroundColor:'#EAF1EE',overflow:'hidden'},barFill:{height:'100%',borderRadius:999,backgroundColor:colors.cyan},chevron:{fontSize:24,color:colors.muted},attentionGrid:{flexDirection:'row',gap:8},attentionCard:{flex:1,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:14},attentionValue:{color:colors.primary,fontWeight:'900',fontSize:22},attentionLabel:{color:colors.muted,fontSize:10,fontWeight:'800',marginTop:5},note:{marginTop:18,padding:16,borderRadius:16,backgroundColor:colors.primarySoft},noteTitle:{color:colors.primary,fontWeight:'900',fontSize:12},noteText:{color:colors.muted,fontSize:11,lineHeight:17,marginTop:4},errorCard:{marginTop:16},errorTitle:{color:colors.warning,fontWeight:'900'},errorText:{color:colors.text,fontSize:12,marginTop:5},emptyText:{color:colors.muted,paddingVertical:12}
});
