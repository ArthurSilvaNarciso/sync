import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TrackingStackParamList } from '../types';
import TrackingMainScreen from '../../screens/Tracking/TrackingMainScreen';
import ActiveTrackingScreen from '../../screens/Tracking/ActiveTrackingScreen';
import ActivitySummaryScreen from '../../screens/Tracking/ActivitySummaryScreen';
import ActivityHistoryScreen from '../../screens/Tracking/ActivityHistoryScreen';

const Stack = createNativeStackNavigator<TrackingStackParamList>();

export default function TrackingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrackingMain" component={TrackingMainScreen} />
      <Stack.Screen name="ActiveTracking" component={ActiveTrackingScreen} />
      <Stack.Screen name="ActivitySummary" component={ActivitySummaryScreen} />
      <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
    </Stack.Navigator>
  );
}
