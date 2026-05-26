import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import SportsScreen from '../screens/Onboarding/SportsScreen';
import LevelScreen from '../screens/Onboarding/LevelScreen';
import ObjectivesScreen from '../screens/Onboarding/ObjectivesScreen';
import AvailabilityScreen from '../screens/Onboarding/AvailabilityScreen';
import LocationScreen from '../screens/Onboarding/LocationScreen';
import PhotosScreen from '../screens/Onboarding/PhotosScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Sports" component={SportsScreen} />
      <Stack.Screen name="Level" component={LevelScreen} />
      <Stack.Screen name="Objectives" component={ObjectivesScreen} />
      <Stack.Screen name="Availability" component={AvailabilityScreen} />
      <Stack.Screen name="Location" component={LocationScreen} />
      <Stack.Screen name="Photos" component={PhotosScreen} />
    </Stack.Navigator>
  );
}
