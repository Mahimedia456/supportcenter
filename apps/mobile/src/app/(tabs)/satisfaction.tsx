import React,{useMemo,useState} from 'react';
import {Pressable,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {WorkspaceHeader} from '@/components/WorkspaceHeader';
import {SupportPeriodFilter} from '@/components/SupportPeriodFilter';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {DEFAULT_SUPPORT_PERIOD,supportPeriodRange,type SupportPeriod} from '@/lib/support-period';

type ScoreFilter='all'|'good'|'bad';
const text=(v:unknown,f='')=>v==null?f:String(v);

function ratingInPeriod(rating:any,period:SupportPeriod){
 const range=supportPeriodRange(period);
 const raw=rating?.created_at||rating?.updated_at;
 if(!raw)return period.preset==='90';
 const time=new Date(raw).getTime();
 return Number.isFinite(time)&&time>=range.start.getTime()&&time<=range.end.getTime();
}

export default function SatisfactionTab(){
 const {snapshot,loading,refreshing,error,refresh}=useGlobalSupportSnapshot();
 const [period,setPeriod]=useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
 const [filter,setFilter]=useState<ScoreFilter>('all');

 const allTickets=snapshot?.tickets||[];
 const ticketMap=useMemo(()=>new Map(allTickets.map((t:any)=>[Number(t.id),t])),[allTickets]);

 const ratings=useMemo(
  ()=>(snapshot?.satisfaction||[]).filter((r:any)=>ratingInPeriod(r,period)),
  [snapshot?.satisfaction,period],
 );

 const good=useMemo(()=>ratings.filter((r:any)=>text(r.score).toLowerCase()==='good'),[ratings]);
 const bad=useMemo(()=>ratings.filter((r:any)=>text(r.score).toLowerCase()==='bad'),[ratings]);
 const comments=useMemo(()=>ratings.filter((r:any)=>text(r.comment).trim().length>0),[ratings]);
 const visible=useMemo(()=>ratings.filter((r:any)=>filter==='all'||text(r.score).toLowerCase()===filter),[ratings,filter]);

 return <ScrollView style={s.screen} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>}>
  <WorkspaceHeader/>
  <Text style={s.eyebrow}>CUSTOMER EXPERIENCE</Text>
  <Text style={s.title}>Satisfaction</Text>
  <Text style={s.caption}>Ratings and comments from the saved Zendesk snapshot</Text>

  <SupportPeriodFilter value={period} onChange={setPeriod}/>

  <View style={s.kpis}>
   <Kpi label="Total ratings" value={ratings.length} icon="chatbox-ellipses-outline"/>
   <Kpi label="Good" value={good.length} icon="happy-outline"/>
   <Kpi label="Bad" value={bad.length} icon="sad-outline" danger/>
  </View>

  <View style={s.commentSummary}>
   <View style={s.commentIcon}><Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.primary}/></View>
   <View style={s.commentCopy}><Text style={s.commentTitle}>Customer comments</Text><Text style={s.commentText}>{comments.length} of {ratings.length} ratings include a written comment.</Text></View>
   <Text style={s.commentCount}>{comments.length}</Text>
  </View>

  <View style={s.filters}>
   {(['all','good','bad'] as ScoreFilter[]).map(item=><Pressable key={item} onPress={()=>setFilter(item)} style={[s.chip,filter===item&&s.chipActive]}><Text style={[s.chipText,filter===item&&s.chipTextActive]}>{item.charAt(0).toUpperCase()+item.slice(1)}</Text></Pressable>)}
  </View>

  {error?<View style={s.notice}><Text style={s.noticeTitle}>Using saved satisfaction data</Text><Text style={s.noticeText}>The last successful snapshot remains available while the next sync completes.</Text></View>:null}
  {loading&&!snapshot?<View style={s.loading}><Text style={s.loadingText}>Loading saved satisfaction snapshot…</Text></View>:null}

  <View style={s.section}><Text style={s.sectionTitle}>Ratings</Text><Text style={s.count}>{visible.length}</Text></View>

  {visible.map((rating:any)=>{
   const ticketId=Number(rating.ticket_id);
   const ticket:any=ticketMap.get(ticketId);
   const score=text(rating.score,'unknown').toLowerCase();
   const comment=text(rating.comment).trim();
   return <Pressable key={String(rating.id||`${ticketId}-${score}-${rating.created_at||''}`)} onPress={()=>ticketId?router.push({pathname:'/ticket/[id]',params:{id:String(ticketId)}}):undefined} style={s.card}>
    <View style={s.top}><View style={[s.score,score==='bad'?s.bad:s.good]}><Ionicons name={score==='bad'?'sad-outline':'happy-outline'} size={15} color={score==='bad'?colors.danger:colors.primary}/><Text style={[s.scoreText,{color:score==='bad'?colors.danger:colors.primary}]}>{score}</Text></View><Text style={s.ticketId}>#{ticketId||'—'}</Text></View>
    <Text style={s.subject} numberOfLines={2}>{text(ticket?.subject,'Ticket subject unavailable')}</Text>
    {comment?<View style={s.commentBox}><Ionicons name="chatbubble-outline" size={14} color={colors.muted}/><Text style={s.comment}>{comment}</Text></View>:<Text style={s.noComment}>No written comment</Text>}
    <Text style={s.open}>Open ticket ›</Text>
   </Pressable>
  })}

  {!loading&&visible.length===0?<View style={s.empty}><Ionicons name="happy-outline" size={40} color={colors.primary}/><Text style={s.emptyTitle}>No satisfaction ratings in this period</Text><Text style={s.emptyText}>After the next staged sync, ratings are filtered by rating date instead of ticket creation date.</Text></View>:null}
 </ScrollView>
}

function Kpi({label,value,icon,danger=false}:{label:string;value:number;icon:keyof typeof Ionicons.glyphMap;danger?:boolean}){return <View style={s.kpi}><Ionicons name={icon} size={18} color={danger?colors.danger:colors.primary}/><Text style={[s.kpiValue,danger&&{color:colors.danger}]}>{value}</Text><Text style={s.kpiLabel}>{label}</Text></View>}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:18,paddingTop:8,paddingBottom:120},eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1},title:{color:colors.text,fontSize:29,fontWeight:'900',marginTop:4},caption:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:4},kpis:{flexDirection:'row',gap:8,marginTop:3},kpi:{flex:1,minHeight:92,borderRadius:17,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,padding:12},kpiValue:{color:colors.text,fontSize:22,fontWeight:'900',marginTop:9},kpiLabel:{color:colors.muted,fontSize:8,fontWeight:'800',marginTop:4},commentSummary:{minHeight:72,flexDirection:'row',alignItems:'center',gap:10,borderRadius:17,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,padding:13,marginTop:10},commentIcon:{width:40,height:40,borderRadius:13,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},commentCopy:{flex:1},commentTitle:{color:colors.text,fontSize:11,fontWeight:'900'},commentText:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:3},commentCount:{color:colors.primary,fontSize:21,fontWeight:'900'},filters:{flexDirection:'row',gap:8,marginTop:12,marginBottom:10},chip:{borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,paddingHorizontal:14,paddingVertical:8},chipActive:{backgroundColor:colors.primary,borderColor:colors.primary},chipText:{color:colors.muted,fontSize:9,fontWeight:'900'},chipTextActive:{color:'#fff'},notice:{borderRadius:15,borderWidth:1,borderColor:'#F3D7A5',backgroundColor:'#FFF9EC',padding:12,marginBottom:10},noticeTitle:{color:colors.warning,fontSize:10,fontWeight:'900'},noticeText:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:3},loading:{alignItems:'center',paddingVertical:45},loadingText:{color:colors.muted,fontSize:10},section:{marginTop:5,marginBottom:9,flexDirection:'row',justifyContent:'space-between'},sectionTitle:{color:colors.text,fontSize:17,fontWeight:'900'},count:{color:colors.primary,backgroundColor:colors.primarySoft,borderRadius:999,paddingHorizontal:9,paddingVertical:5,fontSize:9,fontWeight:'900'},card:{borderRadius:18,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,padding:14,marginBottom:10},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},score:{flexDirection:'row',alignItems:'center',gap:5,borderRadius:999,paddingHorizontal:9,paddingVertical:5},good:{backgroundColor:'#EAF7F1'},bad:{backgroundColor:'#FDECEC'},scoreText:{fontSize:8,fontWeight:'900',textTransform:'capitalize'},ticketId:{color:colors.primary,fontSize:9,fontWeight:'900'},subject:{color:colors.text,fontSize:12,lineHeight:17,fontWeight:'900',marginTop:10},commentBox:{flexDirection:'row',alignItems:'flex-start',gap:7,borderRadius:12,backgroundColor:colors.background,padding:10,marginTop:10},comment:{flex:1,color:colors.text,fontSize:10,lineHeight:15},noComment:{color:colors.muted,fontSize:9,marginTop:10,fontStyle:'italic'},open:{color:colors.cyan,fontSize:9,fontWeight:'900',marginTop:10,textAlign:'right'},empty:{alignItems:'center',paddingVertical:45},emptyTitle:{color:colors.text,fontWeight:'900',marginTop:10},emptyText:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:5,textAlign:'center'}
});
