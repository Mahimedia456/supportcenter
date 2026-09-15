import React from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import type { ZendeskForm,ZendeskGroup,ZendeskTicket,ZendeskUser } from '@/lib/api';
import { ticketMetaLabels } from '@/lib/zendesk-metadata';
import { relativeTime,statusLabel } from '@/types/zendesk-ui';

function priorityTone(priority?:string|null){const v=String(priority||'').toLowerCase();if(v==='urgent')return{bg:'#FDECEC',fg:colors.danger};if(v==='high')return{bg:'#FFF5DF',fg:colors.warning};return{bg:colors.cyanSoft,fg:colors.cyan}}
export function TicketCard({ticket,onPress,agents=[],groups=[],forms=[]}:{ticket:ZendeskTicket;onPress:()=>void;agents?:ZendeskUser[];groups?:ZendeskGroup[];forms?:ZendeskForm[]}){
 const tone=priorityTone(ticket.priority); const meta=ticketMetaLabels(ticket,{agents,groups,forms});
 return <Pressable onPress={onPress}><AppCard style={s.card}>
  <View style={s.top}><View style={s.idwrap}><Text style={s.id}>#{ticket.id}</Text><Text style={s.updated}>{relativeTime(ticket.updated_at)}</Text></View><View style={s.badges}><View style={[s.badge,{backgroundColor:tone.bg}]}><Text style={[s.badgeText,{color:tone.fg}]}>{(ticket.priority||'normal').toUpperCase()}</Text></View><View style={[s.badge,s.status]}><Text style={[s.badgeText,{color:colors.primary}]}>{statusLabel(ticket.status)}</Text></View></View></View>
  <Text style={s.subject} numberOfLines={2}>{ticket.subject||'No subject'}</Text>
  <View style={s.grid}><Meta label="Assignee" value={meta.assignee}/><Meta label="Group" value={meta.group}/></View>
  <View style={s.form}><Text style={s.metaLabel}>FORM</Text><Text style={s.metaValue} numberOfLines={1}>{meta.form}</Text></View>
  <View style={s.bottom}><Text style={s.open}>View details ›</Text></View>
 </AppCard></Pressable>;
}
function Meta({label,value}:{label:string;value:string}){return <View style={s.meta}><Text style={s.metaLabel}>{label}</Text><Text style={s.metaValue} numberOfLines={2}>{value}</Text></View>}
const s=StyleSheet.create({card:{marginBottom:10,padding:16},top:{flexDirection:'row',justifyContent:'space-between',gap:10},idwrap:{flexDirection:'row',alignItems:'center',gap:8},id:{color:colors.text,fontWeight:'900',fontSize:13},updated:{color:colors.muted,fontSize:10},badges:{flexDirection:'row',gap:6},badge:{borderRadius:999,paddingHorizontal:8,paddingVertical:5},badgeText:{fontSize:9,fontWeight:'900'},status:{backgroundColor:colors.primarySoft},subject:{marginTop:12,color:colors.text,fontWeight:'900',fontSize:17,lineHeight:23},grid:{marginTop:13,flexDirection:'row',gap:8},meta:{flex:1,minHeight:58,backgroundColor:colors.background,borderRadius:12,padding:10},form:{marginTop:8,backgroundColor:colors.background,borderRadius:12,padding:10},metaLabel:{color:colors.muted,fontSize:9,textTransform:'uppercase',letterSpacing:.5,fontWeight:'800'},metaValue:{color:colors.text,fontSize:11,lineHeight:15,fontWeight:'800',marginTop:4},bottom:{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:colors.border,alignItems:'flex-end'},open:{color:colors.cyan,fontSize:11,fontWeight:'900'}});
