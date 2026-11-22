import type {ZendeskTicket,ZendeskTicketField} from '@/lib/api';

export type SupportDimension=
 | 'device'|'supportType'|'region'
 | 'category'|'faultCategory'|'rma';

const MATCHERS:Record<SupportDimension,string[]>={
 device:['device model','device name','which device','your device','atomos device','atomos product','product model','product 1','product name','which product','your product','device','product','monitor','recorder','model','hardware'],
 supportType:['support type','type of support','support request','request type','case type'],
 region:['region','customer region','support region','country region','territory','market','geo','geography'],
 category:['ticket category','issue category','case category','support category','category'],
 faultCategory:['fault category','fault type','failure category','failure type','fault','failure'],
 rma:['rma type','rma category','return merchandise','return authorization','return type','rma'],
};

const fieldCache=new WeakMap<object,Map<SupportDimension,ZendeskTicketField[]>>();

function norm(v:unknown):string{
 return String(v??'').trim().toLowerCase().replace(/[_\-\/:()?]+/g,' ').replace(/\s+/g,' ');
}

function scoreField(field:ZendeskTicketField,dimension:SupportDimension){
 const f:any=field;
 const title=norm(`${f.title||''} ${f.raw_title||''} ${f.description||''}`);
 if(!title)return 0;
 if(dimension==='faultCategory'&&!title.includes('fault')&&!title.includes('failure'))return 0;
 if(dimension==='category'&&(title.includes('fault')||title.includes('rma')))return 0;
 if(dimension==='device'&&title.includes('category'))return 0;
 let best=0;
 MATCHERS[dimension].forEach((term,index)=>{
  const weight=MATCHERS[dimension].length-index;
  if(title===term)best=Math.max(best,1000+weight);
  else if(title.startsWith(term))best=Math.max(best,700+weight);
  else if(title.includes(term))best=Math.max(best,400+weight);
 });
 return best;
}

export function fieldsForDimension(fields:ZendeskTicketField[],dimension:SupportDimension):ZendeskTicketField[]{
 let cache=fieldCache.get(fields as unknown as object);
 if(!cache){cache=new Map();fieldCache.set(fields as unknown as object,cache)}
 const existing=cache.get(dimension);if(existing)return existing;
 const resolved=fields
  .filter(field=>(field as any).active!==false)
  .map(field=>({field,score:scoreField(field,dimension)}))
  .filter(row=>row.score>0)
  .sort((a,b)=>b.score-a.score||Number((a.field as any).position??9999)-Number((b.field as any).position??9999))
  .map(row=>row.field);
 cache.set(dimension,resolved);
 return resolved;
}

export function fieldForDimension(fields:ZendeskTicketField[],dimension:SupportDimension):ZendeskTicketField|undefined{
 return fieldsForDimension(fields,dimension)[0];
}

function labelForRaw(field:any,raw:unknown):string{
 if(raw===null||raw===undefined||raw==='')return'';
 if(Array.isArray(raw))return raw.map((item:unknown)=>labelForRaw(field,item)).filter(Boolean).join(', ');
 const text=String(raw);
 const options:any[]=field?.custom_field_options||field?.system_field_options||[];
 const found=options.find((item:any)=>String(item.value)===text||String(item.id)===text);
 return String(found?.name||found?.raw_name||text).replace(/_/g,' ').trim();
}

function valueFromCandidates(ticket:ZendeskTicket,candidates:ZendeskTicketField[]):string{
 const customFields:any[]=(ticket as any).custom_fields||[];
 for(const field of candidates){
  const item=customFields.find((row:any)=>Number(row.id)===Number((field as any).id));
  const value=labelForRaw(field,item?.value);
  if(value)return value;
 }
 return'';
}

export function dimensionValue(ticket:ZendeskTicket,fields:ZendeskTicketField[],dimension:SupportDimension):string{
 return valueFromCandidates(ticket,fieldsForDimension(fields,dimension));
}

export type DimensionRow={label:string;count:number};

export function dimensionRows(tickets:ZendeskTicket[],fields:ZendeskTicketField[],dimension:SupportDimension):DimensionRow[]{
 const candidates=fieldsForDimension(fields,dimension);
 const counts=new Map<string,number>();
 for(const ticket of tickets){
  const value=valueFromCandidates(ticket,candidates);
  for(const part of value.split(',').map(x=>x.trim()).filter(Boolean))counts.set(part,(counts.get(part)||0)+1);
 }
 return[...counts.entries()].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
}

export function isTruthyDimension(value:string):boolean{
 const v=norm(value);
 return Boolean(v)&&!['no','none','false','not applicable','n a','na','no rma','no fault','no fault category'].includes(v);
}
