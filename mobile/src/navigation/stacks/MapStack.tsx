import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MapStackParamList } from '../types';
import MapMainScreen from '../../screens/Map/MapMainScreen';
import EventDetailScreen from '../../screens/Events/EventDetailScreen';
import CreateEventScreen from '../../screens/Events/CreateEventScreen';
import MyEventsScreen from '../../screens/Events/MyEventsScreen';
import TerritoryScreen from '../../screens/Map/TerritoryScreen';

const Stack = createNativeStackNavigator<MapStackParamList>();

export default function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={MapMainScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="MyEvents" component={MyEventsScreen} />
      <Stack.Screen name="Territory" component={TerritoryScreen as any} />
    </Stack.Navigator>
  );
}
