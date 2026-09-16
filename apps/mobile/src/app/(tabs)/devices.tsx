
import React,{useMemo,useState} from 'react';
import {Pressable,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {WorkspaceHeader} from '@/components/WorkspaceHeader';
import {SupportPeriodFilter} from '@/components/SupportPeriodFilter';
import {colors} from '@/constants/theme';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {DEFAULT_SUPPORT_PERIOD,filterTicketsBySupportPeriod,type SupportPeriod} from '@/lib/support-period';
import {dimensionRows,fieldForDimension} from '@/lib/support-dimensions';

export default function Devices(){
 const {snapshot,loading,refreshing,error,refresh}=useGlobalSupportSnapshot();
 const [period,setPeriod]=useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
 const tickets=useMemo(()=>filterTicketsBySupportPeriod(snapshot?.tickets||[],period),[snapshot?.tickets,period]);
 const rows=useMemo(()=>dimensionRows(tickets,snapshot?.fields||[],'device'),[tickets,snapshot?.fields]);
 const detected=fieldForDimension(snapshot?.fields||[],'device');

 return <ScrollView style={s.screen} contentContainerStyle={s.content}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>}>
  <WorkspaceHeader/>
  <Text style={s.eyebrow}>DEVICE OPERATIONS</Text>
  <Text style={s.title}>Devices</Text>
  <Text style={s.caption}>Shared 90-day DB snapshot</Text>
  <SupportPeriodFilter value={period} onChange={setPeriod}/>
  <View style={s.detected}>
   <Text style={s.detectedLabel}>DETECTED DEVICE FIELD</Text>
   <Text style={s.detectedValue}>{detected?.title||'Not detected'}</Text>
  </View>
  {loading&&!snapshot?<State text="Initializing support data…"/>:null}
  {error?<State text={error} error/>:null}
  {rows.map(row=><Pressable key={row.label} onPress={()=>router.push({pathname:'/device/[name]',params:{name:row.label}})} style={s.card}>
   <View style={s.icon}><Ionicons name="hardware-chip-outline" size={20} color={colors.primary}/></View>
   <View style={s.copy}><Text style={s.name}>{row.label}</Text><Text style={s.count}>{row.count} tickets</Text></View>
   <Ionicons name="chevron-forward" size={18} color={colors.cyan}/>
  </Pressable>)}
  {!rows.length&&!loading?<State text="No device values found. Pull down once to refresh the shared 90-day snapshot."/>:null}
 </ScrollView>
}
function State({text,error=false}:{text:string;error?:boolean}){return <View style={s.state}><Text style={error?s.errorTitle:s.stateTitle}>{text}</Text></View>}
const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:18,paddingTop:8,paddingBottom:120},
 eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1},title:{color:colors.text,fontSize:28,fontWeight:'900',marginTop:4},caption:{color:colors.muted,fontSize:10,marginTop:4},
 detected:{borderRadius:13,backgroundColor:'#F2F8F5',padding:11,marginBottom:10},detectedLabel:{color:colors.muted,fontSize:8,fontWeight:'900'},detectedValue:{color:colors.primary,fontSize:10,fontWeight:'900',marginTop:4},
 card:{minHeight:72,flexDirection:'row',alignItems:'center',gap:11,borderRadius:16,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:13,marginBottom:9},
 icon:{width:42,height:42,borderRadius:13,backgroundColor:'#E7F5EF',alignItems:'center',justifyContent:'center'},copy:{flex:1},name:{color:colors.text,fontSize:12,fontWeight:'900'},count:{color:colors.muted,fontSize:9,marginTop:3},
 state:{borderRadius:15,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,padding:14,marginBottom:10},stateTitle:{color:colors.text,fontWeight:'900'},errorTitle:{color:'#B42318',fontWeight:'900'},
});
