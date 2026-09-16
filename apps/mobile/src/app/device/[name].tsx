
import React,{useMemo,useState} from 'react';
import {Pressable,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {SupportPeriodFilter} from '@/components/SupportPeriodFilter';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {DEFAULT_SUPPORT_PERIOD,filterTicketsBySupportPeriod,type SupportPeriod} from '@/lib/support-period';
import {dimensionValue,isTruthyDimension} from '@/lib/support-dimensions';

export default function DeviceDetail(){
 const {name=''}=useLocalSearchParams<{name:string}>();
 const device=decodeURIComponent(String(name));
 const {snapshot,loading,refreshing,refresh}=useGlobalSupportSnapshot();
 const [period,setPeriod]=useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);

 const tickets=useMemo(()=>{
  if(!snapshot) return [];
  const wanted=device.trim().toLowerCase();
  return filterTicketsBySupportPeriod(snapshot.tickets,period).filter(ticket=>
   dimensionValue(ticket,snapshot.fields,'device')
    .split(',').map((item:string)=>item.trim().toLowerCase()).includes(wanted)
  );
 },[device,period,snapshot]);

 const open=tickets.filter(t=>String(t.status||'').toLowerCase()==='open').length;
 const faulty=tickets.filter(t=>isTruthyDimension(dimensionValue(t,snapshot?.fields||[],'faultCategory'))).length;
 const rma=tickets.filter(t=>isTruthyDimension(dimensionValue(t,snapshot?.fields||[],'rma'))).length;
 const unassigned=tickets.filter(t=>!t.assignee_id).length;

 function go(title:string,preset?:string){
  router.push({pathname:'/ticket-results',params:{role:'device',value:device,title,...(preset?{preset}:{})}});
 }

 return <SafeAreaView style={s.safe} edges={['top','left','right']}>
  <ScrollView style={s.screen} contentContainerStyle={s.content}
   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>}>
   <View style={s.header}>
    <Pressable onPress={()=>router.back()} style={s.back}>
     <Ionicons name="chevron-back" size={23} color={colors.text}/>
    </Pressable>
    <View style={s.headCopy}>
     <Text style={s.eyebrow}>DEVICE</Text>
     <Text style={s.title} numberOfLines={2}>{device}</Text>
     <Text style={s.caption}>Device ticket activity</Text>
    </View>
   </View>

   <SupportPeriodFilter value={period} onChange={setPeriod}/>

   {loading&&!snapshot?<View style={s.state}><Text style={s.stateTitle}>Initializing support data…</Text></View>:<>
    <View style={s.grid}>
     <Metric label="Open" value={open} icon="folder-open-outline" onPress={()=>go(`${device} · Open`,'open')}/>
     <Metric label="Faulty" value={faulty} icon="warning-outline" onPress={()=>go(`${device} · Faulty`,'faulty')}/>
     <Metric label="RMA" value={rma} icon="repeat-outline" onPress={()=>go(`${device} · RMA`,'rma')}/>
     <Metric label="Unassigned" value={unassigned} icon="person-remove-outline" onPress={()=>go(`${device} · Unassigned`,'unassigned')}/>
    </View>
    <Pressable onPress={()=>go(`${device} · All tickets`)} style={s.all}>
     <Text style={s.allText}>View all {tickets.length} tickets</Text>
     <Ionicons name="arrow-forward" size={18} color="#fff"/>
    </Pressable>
   </>}
  </ScrollView>
 </SafeAreaView>
}

function Metric({label,value,icon,onPress}:{label:string;value:number;icon:keyof typeof Ionicons.glyphMap;onPress:()=>void}){
 return <Pressable onPress={onPress} style={s.metric}>
  <View style={s.metricIcon}><Ionicons name={icon} size={19} color={colors.primary}/></View>
  <Text style={s.metricValue}>{value}</Text>
  <Text style={s.metricLabel}>{label}</Text>
 </Pressable>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},screen:{flex:1},content:{paddingHorizontal:18,paddingTop:4,paddingBottom:100},
 header:{flexDirection:'row',alignItems:'flex-start',gap:11},back:{width:42,height:42,borderRadius:14,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},headCopy:{flex:1},
 eyebrow:{color:colors.primary,fontSize:8,fontWeight:'900',letterSpacing:1},title:{color:colors.text,fontSize:23,fontWeight:'900',marginTop:2},caption:{color:colors.muted,fontSize:9,marginTop:3},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:8},metric:{width:'48%',minHeight:125,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:14},
 metricIcon:{width:36,height:36,borderRadius:12,backgroundColor:'#E7F5EF',alignItems:'center',justifyContent:'center'},metricValue:{color:colors.text,fontSize:25,fontWeight:'900',marginTop:12},metricLabel:{color:colors.muted,fontSize:9,fontWeight:'900',marginTop:3},
 all:{minHeight:52,borderRadius:16,backgroundColor:colors.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:13},allText:{color:'#fff',fontWeight:'900',fontSize:11},
 state:{borderRadius:15,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:14},stateTitle:{color:colors.text,fontWeight:'900'},
});
