import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icons: Record<string,{active:IconName;inactive:IconName}> = {
  index:{active:'grid',inactive:'grid-outline'},
  tickets:{active:'ticket',inactive:'ticket-outline'},
  insights:{active:'analytics',inactive:'analytics-outline'},
  devices:{active:'hardware-chip',inactive:'hardware-chip-outline'},
  alerts:{active:'notifications',inactive:'notifications-outline'},
};

export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,10);
  return <Tabs screenOptions={({route})=>{
    const icon=icons[route.name]||icons.index;
    return {
      headerShown:false,tabBarHideOnKeyboard:true,
      tabBarActiveTintColor:colors.primary,tabBarInactiveTintColor:'#8A9B97',
      tabBarIcon:({focused,color})=><Ionicons name={focused?icon.active:icon.inactive} color={color} size={focused?22:21}/>,
      tabBarStyle:{height:62+bottom,paddingTop:8,paddingBottom:bottom,borderTopWidth:1,borderTopColor:colors.border,backgroundColor:'#fff',elevation:12,shadowColor:'#0B3B31',shadowOpacity:.08,shadowRadius:14,shadowOffset:{width:0,height:-4}},
      tabBarLabelStyle:{fontSize:10,lineHeight:13,fontWeight:'800',marginTop:2},
    };
  }}>
    <Tabs.Screen name="index" options={{title:'Overview'}}/>
    <Tabs.Screen name="tickets" options={{title:'Tickets'}}/>
    <Tabs.Screen name="insights" options={{title:'Insights'}}/>
    <Tabs.Screen name="devices" options={{title:'Devices'}}/>
    <Tabs.Screen name="alerts" options={{title:'Alerts'}}/>
  </Tabs>;
}
