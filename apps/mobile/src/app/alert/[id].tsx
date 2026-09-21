import React,{useMemo} from 'react';
import {FlatList,Pressable,StyleSheet,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppCard} from '@/components/AppCard';
import {TicketCard} from '@/components/tickets/TicketCard';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {buildManagerAlerts,ticketsForAlert} from '@/lib/alerts';

export default function AlertDetail(){
 const params=useLocalSearchParams<{id:string}>();
 const alertId=Array.isArray(params.id)?params.id[0]:params.id||'';
 const {snapshot}=useGlobalSupportSnapshot();

 const tickets=snapshot?.tickets||[];
 const ratings=snapshot?.satisfaction||[];
 const fields=snapshot?.fields||[];
 const forms=snapshot?.forms||[];
 const metrics=snapshot?.metrics||[];
 const events=snapshot?.metricEvents||[];
 const agents=snapshot?.agents||[];
 const groups=snapshot?.groups||[];

 const alert=useMemo(
  ()=>buildManagerAlerts(tickets,ratings,fields,forms,metrics,events,{includeDeviceSpikes:false}).find(item=>item.id===alertId),
  [alertId,tickets,ratings,fields,forms,metrics,events],
 );

 const related=useMemo(()=>alert?ticketsForAlert(alert,tickets):[],[alert,tickets]);

 const header=<>
  <View style={s.header}>
   <Pressable onPress={()=>router.back()} style={({pressed})=>[s.back,pressed&&{opacity:.75}]}>
    <Ionicons name="chevron-back" size={23} color={colors.text}/>
   </Pressable>
   <View style={s.headerCopy}>
    <Text style={s.eyebrow}>ALERT DETAILS</Text>
    <Text style={s.headerTitle} numberOfLines={2}>{alert?.title||'Manager alert'}</Text>
   </View>
  </View>

  {alert?<AppCard style={s.hero}>
   <View style={s.heroTop}>
    <Text style={[s.severity,{color:alert.severity==='critical'?colors.danger:alert.severity==='warning'?colors.warning:colors.cyan}]}>{alert.severity.toUpperCase()}</Text>
    <Text style={s.count}>{related.length} ticket{related.length===1?'':'s'}</Text>
   </View>
   <Text style={s.message}>{alert.message}</Text>
  </AppCard>:<AppCard style={s.notice}><Text style={s.noticeTitle}>Alert unavailable</Text><Text style={s.noticeText}>This alert is not present in the saved snapshot.</Text></AppCard>}

  <View style={s.relatedRow}>
   <Text style={s.relatedTitle}>Related tickets</Text>
   <Text style={s.relatedCount}>{related.length}</Text>
  </View>
 </>;

 return <SafeAreaView style={s.safe} edges={['top','left','right']}>
  <FlatList
   style={s.screen}
   contentContainerStyle={s.content}
   data={related}
   keyExtractor={item=>String(item.id)}
   initialNumToRender={8}
   maxToRenderPerBatch={8}
   windowSize={5}
   removeClippedSubviews
   ListHeaderComponent={header}
   ListEmptyComponent={alert?<View style={s.empty}><Ionicons name="file-tray-outline" size={36} color={colors.primary}/><Text style={s.emptyTitle}>No related tickets in snapshot</Text></View>:null}
   renderItem={({item})=><TicketCard ticket={item} agents={agents} groups={groups} forms={forms} onPress={()=>router.push({pathname:'/ticket/[id]',params:{id:String(item.id)}})}/>}
  />
 </SafeAreaView>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:18,paddingTop:8,paddingBottom:80},header:{minHeight:54,flexDirection:'row',alignItems:'flex-start',gap:11,marginBottom:12},back:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},headerCopy:{flex:1,paddingTop:1},eyebrow:{color:colors.primary,fontSize:8,fontWeight:'900',letterSpacing:1},headerTitle:{color:colors.text,fontSize:22,lineHeight:27,fontWeight:'900',marginTop:2},hero:{backgroundColor:colors.surface,marginBottom:4},heroTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},severity:{fontSize:9,fontWeight:'900'},count:{color:colors.primary,backgroundColor:colors.primarySoft,borderRadius:999,paddingHorizontal:9,paddingVertical:5,fontSize:9,fontWeight:'900'},message:{color:colors.text,fontSize:13,lineHeight:19,fontWeight:'700',marginTop:10},notice:{marginBottom:8},noticeTitle:{color:colors.danger,fontWeight:'900'},noticeText:{color:colors.muted,fontSize:10,marginTop:4},relatedRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:18,marginBottom:10},relatedTitle:{color:colors.text,fontSize:17,fontWeight:'900'},relatedCount:{color:colors.primary,fontSize:16,fontWeight:'900'},empty:{alignItems:'center',paddingVertical:45},emptyTitle:{color:colors.muted,fontWeight:'800',marginTop:10}
});
