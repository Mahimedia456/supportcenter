import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {
 ActivityIndicator,
 FlatList,
 Pressable,
 StyleSheet,
 Text,
 View,
} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppCard} from '@/components/AppCard';
import {colors} from '@/constants/theme';
import {useAuth} from '@/context/AuthContext';
import {useGlobalSupportSnapshot} from '@/hooks/useGlobalSupportSnapshot';
import {
 getZendeskTicketConversationSnapshot,
 type ZendeskConversationSnapshot,
} from '@/lib/zendesk-db';
import {zendeskCommentText} from '@/lib/zendesk-comment-text';
import {readableDate,statusLabel} from '@/types/zendesk-ui';
import {
 metadataMaps,
 ticketCustomFieldRows,
 ticketMetaLabels,
} from '@/lib/zendesk-metadata';
import type {ZendeskComment} from '@/lib/api';

function DetailRow({
 label,
 value,
}:{
 label:string;
 value:string|number|null|undefined;
}){
 return (
  <View style={s.detailRow}>
   <Text style={s.detailLabel}>{label}</Text>
   <Text style={s.detailValue}>
    {value===null||value===undefined||value===''?'—':String(value)}
   </Text>
  </View>
 );
}

export default function TicketDetailScreen(){
 const params=useLocalSearchParams<{id:string}>();
 const rawId=Array.isArray(params.id)?params.id[0]:params.id;
 const ticketId=Number(rawId);

 const {session,ensureFreshSession}=useAuth();
 const {snapshot}=useGlobalSupportSnapshot();

 const [conversation,setConversation]=useState<ZendeskConversationSnapshot|null>(null);
 const [conversationLoading,setConversationLoading]=useState(true);
 const [conversationError,setConversationError]=useState('');

 const ticket=useMemo(
  ()=>snapshot?.tickets?.find(
   (item:any)=>Number(item.id)===ticketId,
  )||null,
  [snapshot?.tickets,ticketId],
 );

 const agents=snapshot?.agents||[];
 const groups=snapshot?.groups||[];
 const forms=snapshot?.forms||[];
 const fields=snapshot?.fields||[];

 const meta=useMemo(
  ()=>ticket
   ?ticketMetaLabels(ticket,{agents,groups,forms})
   :null,
  [ticket,agents,groups,forms],
 );

 const maps=useMemo(
  ()=>metadataMaps({agents,groups,forms}),
  [agents,groups,forms],
 );

 const customRows=useMemo(
  ()=>ticket
   ?ticketCustomFieldRows(ticket,fields)
   :[],
  [ticket,fields],
 );

 const loadConversation=useCallback(async(force=false)=>{
  if(!Number.isFinite(ticketId)||ticketId<=0){
   setConversationLoading(false);
   return;
  }

  setConversationError('');

  if(!conversation){
   setConversationLoading(true);
  }

  try{
   const fresh=await ensureFreshSession();
   const token=fresh?.accessToken||session?.accessToken||'';

   if(!token){
    setConversationError('Manager session is unavailable.');
    return;
   }

   const result=await getZendeskTicketConversationSnapshot(
    token,
    ticketId,
    {force},
   );

   setConversation(result);
  }
  catch(error:any){
   setConversationError(
    error?.message||
    'Unable to load saved conversation snapshot.',
   );
  }
  finally{
   setConversationLoading(false);
  }
 },[
  conversation,
  ensureFreshSession,
  session?.accessToken,
  ticketId,
 ]);

 useEffect(()=>{
  void loadConversation(false);
 },[ticketId]);

 const comments=conversation?.comments||[];

 const header=(
  <>
   <View style={s.header}>
    <Pressable
     onPress={()=>router.back()}
     style={({pressed})=>[
      s.back,
      pressed&&{opacity:.75},
     ]}
    >
     <Ionicons
      name="chevron-back"
      size={23}
      color={colors.text}
     />
    </Pressable>

    <View style={s.headerText}>
     <Text style={s.eyebrow}>
      TICKET DETAILS
     </Text>

     <Text style={s.headerTitle}>
      #{Number.isFinite(ticketId)?ticketId:'—'}
     </Text>

     <Text style={s.headerCaption}>
      Saved Zendesk snapshot
     </Text>
    </View>
   </View>

   {!ticket?(
    <AppCard>
     <Text style={s.errorTitle}>
      Ticket not found in saved snapshot
     </Text>

     <Text style={s.error}>
      Run the next snapshot sync if this ticket was created recently.
     </Text>
    </AppCard>
   ):(
    <>
     <AppCard style={s.heroCard}>
      <View style={s.heroTop}>
       <Text style={s.status}>
        {statusLabel(ticket.status)}
       </Text>

       <Text style={s.priority}>
        {String(ticket.priority||'normal').toUpperCase()}
       </Text>
      </View>

      <Text style={s.subject}>
       {ticket.subject||'No subject'}
      </Text>

      {ticket.description?(
       <Text
        style={s.description}
        numberOfLines={6}
       >
        {ticket.description}
       </Text>
      ):null}
     </AppCard>

     <Text style={s.sectionTitle}>
      Ticket details
     </Text>

     <AppCard>
      <DetailRow
       label="Status"
       value={statusLabel(ticket.status)}
      />
      <DetailRow
       label="Priority"
       value={ticket.priority||'normal'}
      />
      <DetailRow
       label="Type"
       value={ticket.type}
      />
      <DetailRow
       label="Requester ID"
       value={ticket.requester_id}
      />
      <DetailRow
       label="Assignee"
       value={meta?.assignee}
      />
      <DetailRow
       label="Group"
       value={meta?.group}
      />
      <DetailRow
       label="Form"
       value={meta?.form}
      />
      <DetailRow
       label="Created"
       value={readableDate(ticket.created_at)}
      />
      <DetailRow
       label="Updated"
       value={readableDate(ticket.updated_at)}
      />
     </AppCard>

     {customRows.length?(
      <>
       <Text style={s.sectionTitle}>
        Custom fields
       </Text>

       <AppCard>
        {customRows.map(row=>(
         <DetailRow
          key={row.id}
          label={row.title}
          value={row.value}
         />
        ))}
       </AppCard>
      </>
     ):null}

     {ticket.tags?.length?(
      <>
       <Text style={s.sectionTitle}>
        Tags
       </Text>

       <View style={s.tags}>
        {ticket.tags.slice(0,24).map(
         (tag:string)=>(
          <View key={tag} style={s.tag}>
           <Text style={s.tagText}>
            {tag}
           </Text>
          </View>
         ),
        )}
       </View>
      </>
     ):null}

     <View style={s.conversationTitleRow}>
      <View>
       <Text style={s.sectionTitleCompact}>
        Conversation
       </Text>

       <Text style={s.conversationCaption}>
        Cached from Zendesk snapshot
       </Text>
      </View>

      <View style={s.commentCount}>
       <Text style={s.commentCountText}>
        {comments.length}
       </Text>
      </View>
     </View>

     {conversationLoading?(
      <View style={s.loadingBox}>
       <ActivityIndicator
        color={colors.primary}
        size="small"
       />
       <Text style={s.loadingText}>
        Loading saved conversation...
       </Text>
      </View>
     ):null}

     {conversationError?(
      <View style={s.errorBox}>
       <Text style={s.errorBoxTitle}>
        Conversation snapshot unavailable
       </Text>

       <Text style={s.errorBoxText}>
        {conversationError}
       </Text>

       <Pressable
        onPress={()=>void loadConversation(true)}
        style={s.retry}
       >
        <Text style={s.retryText}>
         Retry snapshot
        </Text>
       </Pressable>
      </View>
     ):null}

     {!conversationLoading&&
      !conversationError&&
      conversation?.snapshotStatus==='missing'?(
      <View style={s.pendingBox}>
       <Ionicons
        name="time-outline"
        size={20}
        color={colors.warning}
       />

       <View style={s.pendingCopy}>
        <Text style={s.pendingTitle}>
         Conversation snapshot is syncing
        </Text>

        <Text style={s.pendingText}>
         Ticket data is available, but this ticket's conversation has not been cached yet. Run Sync Support Data from Profile or wait for the hourly snapshot sync.
        </Text>
       </View>
      </View>
     ):null}
    </>
   )}
  </>
 );

 function authorLabel(comment:ZendeskComment){
  const authorId=Number(comment.author_id||0);

  if(authorId&&maps.agents.has(authorId)){
   return maps.agents.get(authorId)||`Agent #${authorId}`;
  }

  if(
   authorId&&
   Number(ticket?.requester_id||0)===authorId
  ){
   return 'Requester / Customer';
  }

  return authorId
   ?`Zendesk user #${authorId}`
   :'Zendesk user';
 }

 return (
  <SafeAreaView
   style={s.safe}
   edges={['top','left','right']}
  >
   <FlatList
    style={s.screen}
    contentContainerStyle={s.content}
    data={comments}
    keyExtractor={(item,index)=>String(item.id||index)}
    initialNumToRender={8}
    maxToRenderPerBatch={8}
    windowSize={5}
    removeClippedSubviews
    ListHeaderComponent={header}
    ListEmptyComponent={
     ticket&&
     !conversationLoading&&
     !conversationError&&
     conversation?.snapshotStatus==='ready'
      ?(
       <View style={s.emptyConversation}>
        <Ionicons
         name="chatbubbles-outline"
         size={31}
         color={colors.primary}
        />
        <Text style={s.emptyConversationTitle}>
         No comments in this ticket
        </Text>
       </View>
      )
      :null
    }
    renderItem={({item:comment})=>(
     <AppCard style={s.comment}>
      <View style={s.commentHeader}>
       <Text
        style={s.author}
        numberOfLines={1}
       >
        {authorLabel(comment)}
       </Text>

       <Text
        style={[
         s.visibility,
         comment.public===false&&
          s.internalVisibility,
        ]}
       >
        {comment.public===false
         ?'INTERNAL NOTE'
         :'PUBLIC'}
       </Text>
      </View>

      <Text style={s.commentDate}>
       {readableDate(comment.created_at)}
      </Text>

      <Text selectable style={s.commentBody}>
       {zendeskCommentText(
        comment.plain_body||
        comment.body||
        comment.html_body,
       )}
      </Text>
     </AppCard>
    )}
    ListFooterComponent={
     ticket?(
      <View style={s.readOnlyBox}>
       <Text style={s.readOnlyTitle}>
        View only
       </Text>

       <Text style={s.readOnlyText}>
        Replies, internal notes, assignments and status changes remain in Zendesk. This screen reads ticket metadata and conversation from saved snapshots only.
       </Text>

       {conversation?.syncedAt?(
        <Text style={s.syncedText}>
         Conversation synced {readableDate(conversation.syncedAt)}
        </Text>
       ):null}
      </View>
     ):null
    }
   />
  </SafeAreaView>
 );
}

const s=StyleSheet.create({
 safe:{
  flex:1,
  backgroundColor:colors.background,
 },
 screen:{
  flex:1,
  backgroundColor:colors.background,
 },
 content:{
  paddingHorizontal:18,
  paddingTop:8,
  paddingBottom:80,
 },
 header:{
  minHeight:58,
  flexDirection:'row',
  alignItems:'flex-start',
  gap:11,
  marginBottom:12,
 },
 back:{
  width:42,
  height:42,
  borderRadius:14,
  borderWidth:1,
  borderColor:colors.border,
  backgroundColor:colors.surface,
  alignItems:'center',
  justifyContent:'center',
 },
 headerText:{
  flex:1,
 },
 eyebrow:{
  fontSize:8,
  color:colors.primary,
  letterSpacing:1,
  fontWeight:'900',
 },
 headerTitle:{
  marginTop:2,
  fontSize:24,
  color:colors.text,
  fontWeight:'900',
 },
 headerCaption:{
  color:colors.muted,
  fontSize:9,
  marginTop:2,
 },
 errorTitle:{
  color:colors.danger,
  fontWeight:'900',
  marginBottom:6,
 },
 error:{
  color:colors.text,
  fontSize:11,
  lineHeight:16,
 },
 heroCard:{
  marginBottom:8,
 },
 heroTop:{
  flexDirection:'row',
  justifyContent:'space-between',
 },
 status:{
  fontSize:9,
  fontWeight:'900',
  color:colors.primary,
  backgroundColor:colors.primarySoft,
  borderRadius:999,
  paddingHorizontal:9,
  paddingVertical:6,
 },
 priority:{
  fontSize:9,
  fontWeight:'900',
  color:colors.cyan,
 },
 subject:{
  marginTop:14,
  fontSize:20,
  lineHeight:27,
  color:colors.text,
  fontWeight:'900',
 },
 description:{
  color:colors.muted,
  fontSize:12,
  lineHeight:18,
  marginTop:10,
 },
 sectionTitle:{
  fontSize:17,
  fontWeight:'900',
  color:colors.text,
  marginTop:20,
  marginBottom:9,
 },
 sectionTitleCompact:{
  fontSize:17,
  fontWeight:'900',
  color:colors.text,
 },
 detailRow:{
  minHeight:42,
  paddingVertical:9,
  borderBottomWidth:1,
  borderBottomColor:colors.border,
  flexDirection:'row',
  justifyContent:'space-between',
  gap:14,
 },
 detailLabel:{
  color:colors.muted,
  fontSize:11,
  flex:1,
 },
 detailValue:{
  color:colors.text,
  fontSize:11,
  fontWeight:'700',
  textAlign:'right',
  flex:1.3,
 },
 tags:{
  flexDirection:'row',
  flexWrap:'wrap',
  gap:7,
 },
 tag:{
  backgroundColor:colors.surface,
  borderColor:colors.border,
  borderWidth:1,
  borderRadius:999,
  paddingHorizontal:10,
  paddingVertical:7,
 },
 tagText:{
  color:colors.muted,
  fontSize:10,
  fontWeight:'700',
 },
 conversationTitleRow:{
  flexDirection:'row',
  alignItems:'center',
  justifyContent:'space-between',
  marginTop:22,
  marginBottom:10,
 },
 conversationCaption:{
  color:colors.muted,
  fontSize:9,
  marginTop:3,
 },
 commentCount:{
  minWidth:32,
  height:32,
  borderRadius:16,
  backgroundColor:colors.primarySoft,
  alignItems:'center',
  justifyContent:'center',
 },
 commentCountText:{
  color:colors.primary,
  fontSize:11,
  fontWeight:'900',
 },
 loadingBox:{
  minHeight:68,
  flexDirection:'row',
  alignItems:'center',
  gap:10,
  borderRadius:16,
  backgroundColor:colors.surface,
  borderWidth:1,
  borderColor:colors.border,
  paddingHorizontal:14,
  marginBottom:10,
 },
 loadingText:{
  color:colors.muted,
  fontSize:10,
  fontWeight:'700',
 },
 errorBox:{
  borderRadius:16,
  borderWidth:1,
  borderColor:'#F5C6C6',
  backgroundColor:'#FFF3F3',
  padding:14,
  marginBottom:10,
 },
 errorBoxTitle:{
  color:colors.danger,
  fontSize:11,
  fontWeight:'900',
 },
 errorBoxText:{
  color:colors.muted,
  fontSize:10,
  lineHeight:15,
  marginTop:4,
 },
 retry:{
  alignSelf:'flex-start',
  marginTop:10,
  borderRadius:999,
  backgroundColor:colors.primary,
  paddingHorizontal:12,
  paddingVertical:8,
 },
 retryText:{
  color:'#fff',
  fontSize:9,
  fontWeight:'900',
 },
 pendingBox:{
  flexDirection:'row',
  alignItems:'flex-start',
  gap:10,
  borderRadius:16,
  borderWidth:1,
  borderColor:'#F3D7A5',
  backgroundColor:'#FFF9EC',
  padding:14,
  marginBottom:10,
 },
 pendingCopy:{
  flex:1,
 },
 pendingTitle:{
  color:colors.warning,
  fontSize:11,
  fontWeight:'900',
 },
 pendingText:{
  color:colors.muted,
  fontSize:10,
  lineHeight:15,
  marginTop:4,
 },
 comment:{
  marginBottom:10,
 },
 commentHeader:{
  flexDirection:'row',
  alignItems:'center',
  justifyContent:'space-between',
  gap:8,
 },
 author:{
  flex:1,
  color:colors.text,
  fontSize:11,
  fontWeight:'900',
 },
 visibility:{
  color:colors.primary,
  backgroundColor:colors.primarySoft,
  borderRadius:999,
  paddingHorizontal:8,
  paddingVertical:5,
  fontSize:7,
  fontWeight:'900',
 },
 internalVisibility:{
  color:colors.warning,
  backgroundColor:'#FFF4DD',
 },
 commentDate:{
  color:colors.muted,
  fontSize:8,
  marginTop:5,
 },
 commentBody:{
  color:colors.text,
  fontSize:11,
  lineHeight:17,
  marginTop:11,
 },
 emptyConversation:{
  alignItems:'center',
  paddingVertical:34,
 },
 emptyConversationTitle:{
  color:colors.muted,
  fontSize:11,
  fontWeight:'800',
  marginTop:9,
 },
 readOnlyBox:{
  marginTop:8,
  backgroundColor:colors.primarySoft,
  borderRadius:16,
  padding:16,
 },
 readOnlyTitle:{
  color:colors.primary,
  fontWeight:'900',
 },
 readOnlyText:{
  color:colors.muted,
  fontSize:11,
  lineHeight:17,
  marginTop:4,
 },
 syncedText:{
  color:colors.primary,
  fontSize:8,
  fontWeight:'800',
  marginTop:9,
 },
});
