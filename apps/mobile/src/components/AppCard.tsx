import React from 'react';import { View,StyleSheet,ViewStyle } from 'react-native';import { colors,radius } from '@/constants/theme';
export function AppCard({children,style}:{children:React.ReactNode;style?:ViewStyle}){return <View style={[s.card,style]}>{children}</View>}
const s=StyleSheet.create({card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:16}});
