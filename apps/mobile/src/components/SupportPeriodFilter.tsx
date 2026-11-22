import React,{useMemo,useState} from 'react';
import {
 Modal,
 Platform,
 Pressable,
 ScrollView,
 StyleSheet,
 Text,
 View,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {colors} from '@/constants/theme';
import {
 lastThreeMonthLabels,
 type SupportPeriod,
 type SupportPeriodPreset,
} from '@/lib/support-period';

type PickerTarget='from'|'to'|null;

function oldestAllowed(){
 const date=new Date();
 date.setHours(0,0,0,0);
 date.setDate(date.getDate()-89);
 return date;
}

function dateLabel(value:Date){
 return value.toLocaleDateString('en-US',{
  month:'short',
  day:'numeric',
  year:'numeric',
 });
}

export function SupportPeriodFilter({
 value,
 onChange,
}:{
 value:SupportPeriod;
 onChange:(value:SupportPeriod)=>void;
}){
 const months=useMemo(()=>lastThreeMonthLabels(),[]);
 const [open,setOpen]=useState(false);
 const [pickerTarget,setPickerTarget]=useState<PickerTarget>(null);
 const [from,setFrom]=useState(()=>{
  const d=new Date();
  d.setDate(d.getDate()-6);
  d.setHours(0,0,0,0);
  return d;
 });
 const [to,setTo]=useState(()=>new Date());

 const items:Array<{key:Exclude<SupportPeriodPreset,'custom'>;label:string}>=[
  {key:'today',label:'Today'},
  {key:'7',label:'7D'},
  {key:'30',label:'30D'},
  {key:'month0',label:months[0]},
  {key:'month1',label:months[1]},
  {key:'month2',label:months[2]},
  {key:'90',label:'90D'},
 ];

 function openCustom(){
  if(value.preset==='custom'&&value.start&&value.end){
   const nextFrom=new Date(value.start);
   const nextTo=new Date(value.end);
   if(!Number.isNaN(nextFrom.getTime()))setFrom(nextFrom);
   if(!Number.isNaN(nextTo.getTime()))setTo(nextTo);
  }
  setPickerTarget(null);
  setOpen(true);
 }

 function close(){
  setPickerTarget(null);
  setOpen(false);
 }

 function apply(){
  const oldest=oldestAllowed();
  const now=new Date();
  let safeFrom=from<oldest?oldest:from;
  let safeTo=to>now?now:to;

  if(safeFrom>safeTo){
   const swap=safeFrom;
   safeFrom=safeTo;
   safeTo=swap;
  }

  onChange({
   preset:'custom',
   start:safeFrom.toISOString(),
   end:safeTo.toISOString(),
  });
  close();
 }

 function updatePicker(date?:Date){
  if(!date||!pickerTarget)return;

  if(pickerTarget==='from'){
   setFrom(date);
   if(date>to)setTo(date);
  }else{
   setTo(date);
  }

  if(Platform.OS!=='ios')setPickerTarget(null);
 }

 const oldest=oldestAllowed();
 const today=new Date();
 const pickerValue=pickerTarget==='from'?from:to;

 return <>
  <ScrollView
   horizontal
   showsHorizontalScrollIndicator={false}
   style={s.scroll}
   contentContainerStyle={s.row}
  >
   {items.map(item=><Pressable
    key={item.key}
    onPress={()=>onChange({preset:item.key})}
    style={[s.chip,value.preset===item.key&&s.active]}
   >
    <Text style={[s.text,value.preset===item.key&&s.activeText]}>{item.label}</Text>
   </Pressable>)}

   <Pressable
    onPress={openCustom}
    style={[s.icon,value.preset==='custom'&&s.active]}
    accessibilityLabel="Custom date range"
   >
    <Ionicons
     name="calendar-outline"
     size={18}
     color={value.preset==='custom'?'#FFFFFF':colors.primary}
    />
   </Pressable>
  </ScrollView>

  <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
   <View style={s.overlay}>
    <View style={s.modal}>
     <View style={s.modalHead}>
      <View style={s.modalHeadCopy}>
       <Text style={s.modalTitle}>Custom date range</Text>
       <Text style={s.modalText}>Choose From and To within the last 90 days.</Text>
      </View>
      <Pressable onPress={close} style={s.close}>
       <Ionicons name="close" size={20} color={colors.text}/>
      </Pressable>
     </View>

     <Pressable onPress={()=>setPickerTarget('from')} style={[s.dateRow,pickerTarget==='from'&&s.dateRowActive]}>
      <View style={s.dateIcon}><Ionicons name="calendar-clear-outline" size={18} color={colors.primary}/></View>
      <View style={s.dateCopy}>
       <Text style={s.dateLabel}>FROM</Text>
       <Text style={s.dateValue}>{dateLabel(from)}</Text>
      </View>
      <Ionicons name="chevron-down" size={17} color={colors.muted}/>
     </Pressable>

     <Pressable onPress={()=>setPickerTarget('to')} style={[s.dateRow,pickerTarget==='to'&&s.dateRowActive]}>
      <View style={s.dateIcon}><Ionicons name="calendar-number-outline" size={18} color={colors.primary}/></View>
      <View style={s.dateCopy}>
       <Text style={s.dateLabel}>TO</Text>
       <Text style={s.dateValue}>{dateLabel(to)}</Text>
      </View>
      <Ionicons name="chevron-down" size={17} color={colors.muted}/>
     </Pressable>

     {pickerTarget?<View style={s.pickerBox}>
      <DateTimePicker
       value={pickerValue}
       mode="date"
       display={Platform.OS==='ios'?'inline':'default'}
       minimumDate={pickerTarget==='from'?oldest:from}
       maximumDate={today}
       onChange={(_,date)=>{
        if(date)updatePicker(date);
        if(Platform.OS!=='ios')setPickerTarget(null);
       }}
      />
     </View>:null}

     <View style={s.rangeHint}>
      <Ionicons name="information-circle-outline" size={16} color={colors.muted}/>
      <Text style={s.rangeHintText}>Available history: {dateLabel(oldest)} to {dateLabel(today)}</Text>
     </View>

     <View style={s.actions}>
      <Pressable onPress={close} style={s.cancel}><Text style={s.cancelText}>Cancel</Text></Pressable>
      <Pressable onPress={apply} style={s.apply}><Text style={s.applyText}>Apply range</Text></Pressable>
     </View>
    </View>
   </View>
  </Modal>
 </>;
}

const s=StyleSheet.create({
 scroll:{flexGrow:0,marginTop:8,marginBottom:10},
 row:{alignItems:'center',gap:7,paddingRight:4},
 chip:{height:39,minWidth:57,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,paddingHorizontal:13,alignItems:'center',justifyContent:'center'},
 icon:{width:42,height:39,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
 active:{backgroundColor:colors.primary,borderColor:colors.primary},
 text:{color:colors.muted,fontSize:10,fontWeight:'900'},
 activeText:{color:'#FFFFFF'},
 overlay:{flex:1,justifyContent:'center',paddingHorizontal:20,paddingVertical:28,backgroundColor:'rgba(0,0,0,0.34)'},
 modal:{width:'100%',maxWidth:440,alignSelf:'center',borderRadius:22,backgroundColor:colors.surface,padding:16,borderWidth:1,borderColor:colors.border},
 modalHead:{flexDirection:'row',alignItems:'flex-start',gap:10},
 modalHeadCopy:{flex:1},
 modalTitle:{color:colors.text,fontSize:18,fontWeight:'900'},
 modalText:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:4},
 close:{width:34,height:34,borderRadius:11,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},
 dateRow:{minHeight:62,borderRadius:15,borderWidth:1,borderColor:colors.border,backgroundColor:colors.background,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,marginTop:12},
 dateRowActive:{borderColor:colors.primary,backgroundColor:colors.primarySoft},
 dateIcon:{width:34,height:34,borderRadius:10,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
 dateCopy:{flex:1},
 dateLabel:{color:colors.muted,fontSize:8,fontWeight:'900',letterSpacing:.6},
 dateValue:{color:colors.text,fontSize:13,fontWeight:'900',marginTop:3},
 pickerBox:{marginTop:8,borderRadius:14,overflow:'hidden',backgroundColor:colors.background},
 rangeHint:{flexDirection:'row',alignItems:'center',gap:6,marginTop:12},
 rangeHintText:{flex:1,color:colors.muted,fontSize:9,lineHeight:13},
 actions:{flexDirection:'row',justifyContent:'flex-end',gap:8,marginTop:16},
 cancel:{paddingHorizontal:14,paddingVertical:11,borderRadius:12},
 cancelText:{color:colors.muted,fontWeight:'800'},
 apply:{borderRadius:12,backgroundColor:colors.primary,paddingHorizontal:17,paddingVertical:11},
 applyText:{color:'#FFFFFF',fontWeight:'900'},
});
