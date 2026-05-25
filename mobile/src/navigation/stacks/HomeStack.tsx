import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';
import DiscoveryScreen from '../../screens/Home/DiscoveryScreen';
import UserProfileScreen from '../../screens/Profile/UserProfileScreen';
import MatchScreen from '../../screens/Home/MatchScreen';
import LikesReceivedScreen from '../../screens/Home/LikesReceivedScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Discovery" component={DiscoveryScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="MatchScreen" component={MatchScreen} />
      <Stack.Screen name="LikesReceived" component={LikesReceivedScreen} />
    </Stack.Navigator>
  );
}
