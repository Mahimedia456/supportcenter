import type { ZendeskForm,ZendeskGroup,ZendeskTicket,ZendeskTicketField,ZendeskUser } from '@/lib/api';

export function metadataMaps(metadata:{agents:ZendeskUser[];groups:ZendeskGroup[];forms:ZendeskForm[]}){
  return {
    agents:new Map(metadata.agents.map(x=>[x.id,x.name||x.email||`Agent #${x.id}`])),
    groups:new Map(metadata.groups.map(x=>[x.id,x.name||`Group #${x.id}`])),
    forms:new Map(metadata.forms.map(x=>[x.id,x.display_name||x.name||`Form #${x.id}`])),
  };
}

export function ticketMetaLabels(ticket:ZendeskTicket,metadata:{agents:ZendeskUser[];groups:ZendeskGroup[];forms:ZendeskForm[]}){
  const maps=metadataMaps(metadata);
  return {
    assignee:ticket.assignee_id?maps.agents.get(ticket.assignee_id)||`Agent #${ticket.assignee_id}`:'Unassigned',
    group:ticket.group_id?maps.groups.get(ticket.group_id)||`Group #${ticket.group_id}`:'No group',
    form:ticket.ticket_form_id?maps.forms.get(ticket.ticket_form_id)||`Form #${ticket.ticket_form_id}`:'No form',
  };
}

export function readableFieldValue(ticket:ZendeskTicket,field:ZendeskTicketField){
  const raw=ticket.custom_fields?.find(x=>x.id===field.id)?.value;
  if(raw===null||raw===undefined||raw==='') return '';
  const one=(value:string)=>field.custom_field_options?.find(o=>o.value===value)?.name||field.custom_field_options?.find(o=>o.value===value)?.raw_name||value.replace(/_/g,' ');
  return Array.isArray(raw)?raw.map(v=>one(String(v))).join(', '):one(String(raw));
}

export function ticketCustomFieldRows(ticket:ZendeskTicket,fields:ZendeskTicketField[]){
  return fields.filter(f=>f.active!==false).map(f=>({id:f.id,title:f.title||f.raw_title||`Field #${f.id}`,value:readableFieldValue(ticket,f)})).filter(x=>Boolean(x.value));
}
