import React from 'react'; import { SafeAreaView, ScrollView, StyleSheet, ViewStyle, RefreshControl } from 'react-native'; import { colors } from '@/constants/theme';
export function Screen({children,scroll=true,style,refreshing=false,onRefresh}:{children:React.ReactNode;scroll?:boolean;style?:ViewStyle;refreshing?:boolean;onRefresh?:()=>void}){
 if(!scroll) return <SafeAreaView style={[s.safe,style]}>{children}</SafeAreaView>;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={[s.content,style]} refreshControl={onRefresh?<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>:undefined}>{children}</ScrollView></SafeAreaView>;
} const s=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{padding:16,paddingBottom:32}});
