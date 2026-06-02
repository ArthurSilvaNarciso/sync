import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GroupsStackParamList } from '../types';
import GroupsScreen from '../../screens/Groups/GroupsScreen';
import GroupDetailScreen from '../../screens/Groups/GroupDetailScreen';

const Stack = createNativeStackNavigator<GroupsStackParamList>();

// Aba de Grupos: criar grupo, descobrir grupos, ranking e detalhe do grupo
export default function GroupsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupsHome" component={GroupsScreen as any} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen as any} />
    </Stack.Navigator>
  );
}
