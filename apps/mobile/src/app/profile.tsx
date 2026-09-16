import React,{useMemo,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router,type Href} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WorkspaceHeader} from '@/components/WorkspaceHeader';
import {AppCard} from '@/components/AppCard';
import {colors} from '@/constants/theme';
import {useAuth} from '@/context/AuthContext';
import {syncZendeskDb} from '@/lib/zendesk-db';
import {seedSupportSnapshot} from '@/lib/support-data-store';

export default function ProfileScreen(){
 const {session,signOut,ensureFreshSession}=useAuth();
 const [slaAlerts,setSlaAlerts]=useState(true);
 const [priorityAlerts,setPriorityAlerts]=useState(true);
 const [feedbackAlerts,setFeedbackAlerts]=useState(true);
 const [spikeAlerts,setSpikeAlerts]=useState(true);
 const [syncing,setSyncing]=useState(false);

 const workspace=useMemo(()=>{const raw:any=session?.workspace;return {name:raw?.name||raw?.displayName||(raw?.slug==='atomos'?'Atomos':raw?.slug==='angelbird'?'AngelBird':'Support Workspace'),slug:raw?.slug||'workspace'}},[session?.workspace]);
 const user:any=session?.user||{};

 function openHealth(){router.push('/system-health' as unknown as Href)}

 function startSync(){
  if(syncing){
   Alert.alert('Sync in progress','Your syncing data is under process. You will see updated data once it is done.',[{text:'Close'}]);
   return;
  }

  setSyncing(true);

  Alert.alert(
   'Sync in progress',
   'Your syncing data is under process. You will see updated data once it is done.',
   [{text:'Close'}],
  );

  void(async()=>{
   try{
    const fresh=await ensureFreshSession();
    const token=fresh?.accessToken||session?.accessToken||'';
    if(!token)throw new Error('Manager session unavailable');
    const snapshot=await syncZendeskDb(token);
    seedSupportSnapshot(snapshot);
   }catch(error:any){
    Alert.alert('Sync could not complete',error?.message||'The saved snapshot is still available. Please try again later.',[{text:'Close'}]);
   }finally{
    setSyncing(false);
   }
  })();
 }

 return <SafeAreaView style={s.safe} edges={['top','left','right']}>
  <ScrollView style={s.screen} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
   <View style={s.topNav}><Pressable onPress={()=>router.back()} hitSlop={10} style={({pressed})=>[s.back,pressed&&s.backPressed]}><Ionicons name="chevron-back" size={23} color={colors.text}/></Pressable><Text style={s.topTitle}>Account</Text><View style={s.topSpacer}/></View>
   <WorkspaceHeader safeTop={false}/>

   <AppCard style={s.profileCard}><View style={s.avatar}><Text style={s.avatarText}>{String(user?.displayName||user?.name||user?.email||'M').slice(0,1).toUpperCase()}</Text></View><View style={s.identity}><Text style={s.name}>{user?.displayName||user?.name||'Manager'}</Text><Text style={s.email} numberOfLines={1}>{user?.email||'Manager account'}</Text><View style={s.managerBadge}><Ionicons name="shield-checkmark-outline" size={13} color={colors.cyan}/><Text style={s.managerBadgeText}>MANAGER · READ ONLY</Text></View></View></AppCard>

   <SectionLabel title="Workspace"/>
   <AppCard style={s.infoCard}><InfoRow label="Workspace" value={workspace.name}/><InfoRow label="Workspace ID" value={workspace.slug}/><InfoRow label="Data source" value="Saved Zendesk snapshot"/><InfoRow label="Mode" value="Read only" last/></AppCard>

   <SectionLabel title="Data Sync" caption="Manual sync runs in the background while the app stays usable"/>
   <Pressable onPress={startSync} style={({pressed})=>[s.syncCard,pressed&&{opacity:.84}]}>
    <View style={s.syncIcon}><Ionicons name={syncing?'sync':'cloud-download-outline'} size={22} color={colors.primary}/></View>
    <View style={s.syncText}><Text style={s.syncTitle}>{syncing?'Sync in progress':'Sync Support Data'}</Text><Text style={s.syncCaption}>{syncing?'You can close this screen and continue using the app.':'Refresh the saved Zendesk snapshot on demand.'}</Text></View>
    <Ionicons name="chevron-forward" size={20} color={colors.cyan}/>
   </Pressable>

   <SectionLabel title="Notifications" caption="Manager alert preferences on this device"/>
   <AppCard style={s.infoCard}>
    <ToggleRow label="SLA / stale activity" caption="Operational risk and no-recent-activity signals" value={slaAlerts} onValueChange={setSlaAlerts}/>
    <ToggleRow label="High priority" caption="High and urgent ticket visibility" value={priorityAlerts} onValueChange={setPriorityAlerts}/>
    <ToggleRow label="Bad feedback" caption="Negative CSAT signals" value={feedbackAlerts} onValueChange={setFeedbackAlerts}/>
    <ToggleRow label="Volume spikes" caption="Product, region and form concentration" value={spikeAlerts} onValueChange={setSpikeAlerts} last/>
   </AppCard>

   <SectionLabel title="System"/>
   <Pressable onPress={openHealth}><AppCard style={s.systemCard}><View style={s.systemIcon}><Ionicons name="pulse-outline" size={22} color={colors.primary}/></View><View style={s.systemText}><Text style={s.systemTitle}>System Health</Text><Text style={s.systemCaption}>Backend, database, session and Zendesk</Text></View><Ionicons name="chevron-forward" size={20} color={colors.cyan}/></AppCard></Pressable>

   <Pressable onPress={signOut} style={({pressed})=>[s.logoutButton,pressed&&{opacity:.8}]}><Ionicons name="log-out-outline" size={19} color={colors.danger}/><Text style={s.logoutText}>Log out</Text></Pressable>
   <Text style={s.footer}>Support Command Center</Text>
  </ScrollView>
 </SafeAreaView>
}

function SectionLabel({title,caption}:{title:string;caption?:string}){return <View style={s.sectionHeader}><Text style={s.sectionTitle}>{title}</Text>{caption?<Text style={s.sectionCaption}>{caption}</Text>:null}</View>}
function InfoRow({label,value,last=false}:{label:string;value:string;last?:boolean}){return <View style={[s.infoRow,last&&s.lastRow]}><Text style={s.infoLabel}>{label}</Text><Text style={s.infoValue} numberOfLines={2}>{value}</Text></View>}
function ToggleRow({label,caption,value,onValueChange,last=false}:{label:string;caption:string;value:boolean;onValueChange:(v:boolean)=>void;last?:boolean}){return <View style={[s.toggleRow,last&&s.lastRow]}><View style={s.toggleText}><Text style={s.toggleLabel}>{label}</Text><Text style={s.toggleCaption}>{caption}</Text></View><Switch value={value} onValueChange={onValueChange} trackColor={{false:'#DDE5E2',true:colors.primarySoft}} thumbColor={value?colors.primary:'#FFFFFF'}/></View>}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:18,paddingTop:8,paddingBottom:110},topNav:{minHeight:50,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},back:{width:42,height:42,borderRadius:14,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},backPressed:{backgroundColor:colors.primarySoft},topTitle:{color:colors.text,fontSize:18,fontWeight:'900'},topSpacer:{width:42},profileCard:{marginTop:3,flexDirection:'row',alignItems:'center',padding:18},avatar:{width:64,height:64,borderRadius:20,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},avatarText:{color:colors.primary,fontSize:24,fontWeight:'900'},identity:{marginLeft:15,flex:1},name:{color:colors.text,fontSize:20,fontWeight:'900'},email:{color:colors.muted,fontSize:11,marginTop:5},managerBadge:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5,backgroundColor:colors.cyanSoft,borderRadius:999,paddingHorizontal:9,paddingVertical:6,marginTop:10},managerBadgeText:{color:colors.cyan,fontSize:8,fontWeight:'900'},sectionHeader:{marginTop:24,marginBottom:10},sectionTitle:{color:colors.text,fontSize:18,fontWeight:'900'},sectionCaption:{color:colors.muted,fontSize:10,lineHeight:14,marginTop:4},infoCard:{paddingHorizontal:16,paddingVertical:3},infoRow:{minHeight:52,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},lastRow:{borderBottomWidth:0},infoLabel:{color:colors.muted,fontSize:11,fontWeight:'700'},infoValue:{color:colors.text,fontSize:11,fontWeight:'900',textAlign:'right',flex:1},syncCard:{minHeight:76,borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',padding:14},syncIcon:{width:44,height:44,borderRadius:14,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},syncText:{flex:1,marginLeft:12},syncTitle:{color:colors.text,fontSize:13,fontWeight:'900'},syncCaption:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:4},toggleRow:{minHeight:76,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:'row',alignItems:'center',gap:12},toggleText:{flex:1,paddingRight:8},toggleLabel:{color:colors.text,fontSize:12,fontWeight:'900'},toggleCaption:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:4},systemCard:{flexDirection:'row',alignItems:'center',padding:16},systemIcon:{width:44,height:44,borderRadius:14,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},systemText:{flex:1,marginLeft:12},systemTitle:{color:colors.text,fontSize:13,fontWeight:'900'},systemCaption:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:4},logoutButton:{marginTop:24,minHeight:54,borderRadius:16,borderWidth:1,borderColor:'#F1CFCF',backgroundColor:'#FFF7F7',flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},logoutText:{color:colors.danger,fontSize:13,fontWeight:'900'},footer:{color:colors.muted,fontSize:9,textAlign:'center',marginTop:20}
});
