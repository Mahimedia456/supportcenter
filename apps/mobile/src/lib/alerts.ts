import type {ZendeskForm,ZendeskMetricEvent,ZendeskSatisfactionRating,ZendeskTicket,ZendeskTicketField,ZendeskTicketMetric} from '@/lib/api';
import {buildDeviceHealth} from '@/lib/device-health';

export type ManagerAlertKind='sla_breach'|'no_first_reply'|'waiting_customer'|'agent_followup'|'slow_first_reply'|'unsolved_72h'|'unsolved_24h'|'stale'|'reopened'|'priority'|'unassigned'|'bad_csat'|'device_spike';
export type ManagerAlert={id:string;kind:ManagerAlertKind;severity:'critical'|'warning'|'info';title:string;message:string;count:number;ticketIds:number[];entityLabel?:string};

const HOUR=60*60*1000;
const ageHours=(v?:string|null)=>{const ms=new Date(v||0).getTime();return Number.isFinite(ms)?(Date.now()-ms)/HOUR:0};
const statusOf=(t:ZendeskTicket)=>String(t.status||'').toLowerCase();
const active=(t:ZendeskTicket)=>['new','open','pending','hold'].includes(statusOf(t));
const uniq=(ids:Array<number|null|undefined>)=>[...new Set(ids.map(Number).filter(Number.isFinite))];

export function buildManagerAlerts(
 tickets:ZendeskTicket[],
 ratings:ZendeskSatisfactionRating[],
 fields:ZendeskTicketField[],
 forms:ZendeskForm[],
 metrics:ZendeskTicketMetric[]=[],
 metricEvents:ZendeskMetricEvent[]=[],
):ManagerAlert[]{
 const alerts:ManagerAlert[]=[];
 const byMetric=new Map(metrics.map(m=>[m.ticket_id,m]));
 const ticketMap=new Map(tickets.map(t=>[t.id,t]));

 const breachIds=uniq(metricEvents.filter(e=>e.type==='breach'&&ticketMap.has(Number(e.ticket_id))).map(e=>Number(e.ticket_id)));
 if(breachIds.length)alerts.push({id:'sla-breach',kind:'sla_breach',severity:'critical',title:'SLA breached',message:`${breachIds.length} ticket${breachIds.length===1?'':'s'} have an actual Zendesk SLA breach event.`,count:breachIds.length,ticketIds:breachIds});

 const noReply=tickets.filter(t=>{if(!active(t))return false;const m=byMetric.get(t.id);return Boolean(m)&&Number(m?.replies||0)===0&&ageHours(t.created_at)>=4});
 if(noReply.length)alerts.push({id:'no-first-reply-4h',kind:'no_first_reply',severity:'critical',title:'No first reply > 4 hours',message:`${noReply.length} active ticket${noReply.length===1?'':'s'} have no recorded agent reply after 4 hours.`,count:noReply.length,ticketIds:noReply.map(t=>t.id)});

 const waiting=tickets.filter(t=>statusOf(t)==='pending'&&ageHours(t.updated_at||t.created_at)>=4);
 if(waiting.length)alerts.push({id:'waiting-customer-4h',kind:'waiting_customer',severity:'warning',title:'Waiting on customer > 4 hours',message:`${waiting.length} pending ticket${waiting.length===1?'':'s'} have had no ticket activity for 4+ hours while waiting on the requester.`,count:waiting.length,ticketIds:waiting.map(t=>t.id)});

 const follow=tickets.filter(t=>['new','open','hold'].includes(statusOf(t))&&ageHours(t.updated_at||t.created_at)>=4);
 if(follow.length)alerts.push({id:'agent-followup-4h',kind:'agent_followup',severity:'warning',title:'Agent follow-up > 4 hours',message:`${follow.length} active ticket${follow.length===1?'':'s'} have had no activity for 4+ hours and may need agent follow-up.`,count:follow.length,ticketIds:follow.map(t=>t.id)});

 const slow=uniq(metrics.filter(m=>Number(m.reply_time_in_minutes?.calendar||0)>240).map(m=>m.ticket_id).filter(id=>ticketMap.has(Number(id))));
 if(slow.length)alerts.push({id:'slow-first-reply',kind:'slow_first_reply',severity:'warning',title:'First reply exceeded 4 hours',message:`${slow.length} ticket${slow.length===1?'':'s'} had a recorded first reply above 240 minutes.`,count:slow.length,ticketIds:slow});

 const u72=tickets.filter(t=>active(t)&&ageHours(t.created_at)>=72);
 if(u72.length)alerts.push({id:'unsolved-72h',kind:'unsolved_72h',severity:'critical',title:'Unsolved > 72 hours',message:`${u72.length} active ticket${u72.length===1?'':'s'} have remained unsolved for 72+ hours.`,count:u72.length,ticketIds:u72.map(t=>t.id)});

 const u24=tickets.filter(t=>{const a=ageHours(t.created_at);return active(t)&&a>=24&&a<72});
 if(u24.length)alerts.push({id:'unsolved-24h',kind:'unsolved_24h',severity:'warning',title:'Unsolved > 24 hours',message:`${u24.length} active ticket${u24.length===1?'':'s'} have remained unsolved for 24+ hours.`,count:u24.length,ticketIds:u24.map(t=>t.id)});

 const stale=tickets.filter(t=>active(t)&&ageHours(t.updated_at||t.created_at)>=24);
 if(stale.length)alerts.push({id:'stale-24h',kind:'stale',severity:'warning',title:'No activity > 24 hours',message:`${stale.length} active ticket${stale.length===1?'':'s'} have had no ticket activity for 24+ hours.`,count:stale.length,ticketIds:stale.map(t=>t.id)});

 const reopened=uniq(metrics.filter(m=>Number(m.reopens||0)>0).map(m=>m.ticket_id).filter(id=>ticketMap.has(Number(id))));
 if(reopened.length)alerts.push({id:'reopened',kind:'reopened',severity:'warning',title:'Reopened tickets',message:`${reopened.length} ticket${reopened.length===1?'':'s'} were reopened at least once.`,count:reopened.length,ticketIds:reopened});

 const priority=tickets.filter(t=>active(t)&&['high','urgent'].includes(String(t.priority||'').toLowerCase()));
 if(priority.length)alerts.push({id:'priority',kind:'priority',severity:'warning',title:'High priority queue',message:`${priority.length} active high/urgent ticket${priority.length===1?'':'s'} need manager visibility.`,count:priority.length,ticketIds:priority.map(t=>t.id)});

 const unassigned=tickets.filter(t=>active(t)&&!t.assignee_id);
 if(unassigned.length)alerts.push({id:'unassigned',kind:'unassigned',severity:'warning',title:'Active unassigned tickets',message:`${unassigned.length} active ticket${unassigned.length===1?'':'s'} do not have an assignee.`,count:unassigned.length,ticketIds:unassigned.map(t=>t.id)});

 const bad=ratings.filter(r=>ticketMap.has(Number(r.ticket_id))&&String(r.score||'').toLowerCase()==='bad');
 if(bad.length)alerts.push({id:'bad-csat',kind:'bad_csat',severity:'critical',title:'Bad customer feedback',message:`${bad.length} bad satisfaction rating${bad.length===1?'':'s'} are attached to tickets in the selected period.`,count:bad.length,ticketIds:uniq(bad.map(r=>Number(r.ticket_id)))});

 const devices=buildDeviceHealth(tickets,fields,forms).filter(r=>r.last7Days>=3&&(r.trendPct||0)>=50).slice(0,5);
 for(const row of devices){
   const ids=tickets.filter(t=>[t.subject||'',t.description||'',...(t.tags||[])].join(' ').toLowerCase().includes(row.device.toLowerCase())).map(t=>t.id);
   alerts.push({id:`device-spike:${encodeURIComponent(row.device)}`,kind:'device_spike',severity:'info',title:'Product support spike',message:`${row.device} has ${row.last7Days} cases in the last 7 days (${row.trendPct}% vs previous 7 days).`,count:row.last7Days,ticketIds:ids,entityLabel:row.device});
 }
 const order={critical:0,warning:1,info:2};
 return alerts.sort((a,b)=>order[a.severity]-order[b.severity]);
}
export function ticketsForAlert(alert:ManagerAlert,tickets:ZendeskTicket[]){const ids=new Set(alert.ticketIds);return tickets.filter(t=>ids.has(t.id))}
