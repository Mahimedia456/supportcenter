
import type { ZendeskTicket, ZendeskTicketField } from '@/lib/api';

export type SupportDimension =
  | 'device' | 'supportType' | 'region'
  | 'category' | 'faultCategory' | 'rma';

const MATCHERS: Record<SupportDimension,string[]> = {
  device:['device','device model','device name','which device','your device','product','product 1','product name','which product','your product','atomos product','atomos device','monitor','recorder','model','hardware'],
  supportType:['support type','support request','request type','case type'],
  region:['region','country region','market','territory'],
  category:['category','ticket category','issue category'],
  faultCategory:['fault','fault category','failure','issue type','problem category'],
  rma:['rma','rma type','return merchandise','return type'],
};

function norm(v:unknown):string {
  return String(v??'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
}

export function fieldForDimension(
  fields:ZendeskTicketField[],
  dimension:SupportDimension,
): ZendeskTicketField|undefined {
  return fields.find((field:ZendeskTicketField)=>{
    const f:any=field;
    const title=norm(f.title||f.raw_title||f.description||'');
    return MATCHERS[dimension].some((term:string)=>title===term||title.includes(term));
  });
}

function labelForRaw(field:any, raw:unknown):string {
  if(raw===null||raw===undefined||raw==='') return '';
  if(Array.isArray(raw)) {
    return raw.map((item:unknown):string=>labelForRaw(field,item)).filter(Boolean).join(', ');
  }
  const text=String(raw);
  const options:any[]=field?.custom_field_options||field?.system_field_options||[];
  const found=options.find((item:any)=>String(item.value)===text||String(item.id)===text);
  return String(found?.name||found?.raw_name||text).trim();
}

export function dimensionValue(
  ticket:ZendeskTicket,
  fields:ZendeskTicketField[],
  dimension:SupportDimension,
):string {
  const field:any=fieldForDimension(fields,dimension);
  if(!field) return '';
  const customFields:any[]=(ticket as any).custom_fields||[];
  const item=customFields.find((row:any)=>Number(row.id)===Number(field.id));
  return labelForRaw(field,item?.value);
}

export type DimensionRow={label:string;count:number};

export function dimensionRows(
  tickets:ZendeskTicket[],
  fields:ZendeskTicketField[],
  dimension:SupportDimension,
):DimensionRow[] {
  const counts=new Map<string,number>();
  for(const ticket of tickets){
    const value=dimensionValue(ticket,fields,dimension);
    for(const part of value.split(',').map((x:string)=>x.trim()).filter(Boolean)){
      counts.set(part,(counts.get(part)||0)+1);
    }
  }
  return [...counts.entries()]
    .map(([label,count]):DimensionRow=>({label,count}))
    .sort((a,b)=>b.count-a.count);
}

export function isTruthyDimension(value:string):boolean {
  const v=norm(value);
  return Boolean(v)&&!['no','none','false','not applicable','n a','na','no rma','no fault'].includes(v);
}
