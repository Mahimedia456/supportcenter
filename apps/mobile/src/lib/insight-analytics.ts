import type { ZendeskForm,ZendeskTicket,ZendeskTicketField } from '@/lib/api';
import { dimensionsForTicket } from '@/lib/zendesk-dimensions';
export type BreakdownRow={key:string;label:string;count:number;open:number;high:number;unassigned:number};
const lower=(v:unknown)=>String(v||'').trim().toLowerCase();
export function buildBreakdown(tickets:ZendeskTicket[],fields:ZendeskTicketField[],forms:ZendeskForm[],dimension:'form'|'region'|'device'|'issue'){
 const map=new Map<string,BreakdownRow>();
 if(dimension==='form'){for(const f of forms.filter(x=>x.active!==false)){const label=f.display_name||f.name||`Form #${f.id}`;map.set(label.toLowerCase(),{key:label.toLowerCase(),label,count:0,open:0,high:0,unassigned:0})}}
 for(const ticket of tickets){const d=dimensionsForTicket(ticket,fields,forms);const label=d[dimension]||'Unknown';const key=label.toLowerCase();const row=map.get(key)||{key,label,count:0,open:0,high:0,unassigned:0};row.count++;row.open+=['new','open'].includes(lower(ticket.status))?1:0;row.high+=['high','urgent'].includes(lower(ticket.priority))?1:0;row.unassigned+=ticket.assignee_id?0:1;map.set(key,row)}
 return [...map.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
}
export function ticketsForDimension(tickets:ZendeskTicket[],fields:ZendeskTicketField[],forms:ZendeskForm[],dimension:'form'|'region'|'device'|'issue',label:string){return tickets.filter(t=>dimensionsForTicket(t,fields,forms)[dimension].toLowerCase()===label.toLowerCase())}
