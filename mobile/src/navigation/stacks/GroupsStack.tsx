import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GroupsStackParamList } from '../types';
import GroupsScreen from '../../screens/Groups/GroupsScreen';

const Stack = createNativeStackNavigator<GroupsStackParamList>();

// Aba de Grupos: criar grupo, descobrir grupos e ranking dos maiores
export default function GroupsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupsHome" component={GroupsScreen as any} />
    </Stack.Navigator>
  );
}
