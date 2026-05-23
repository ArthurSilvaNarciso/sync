import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../types';
import MyProfileScreen from '../../screens/Profile/MyProfileScreen';
import EditProfileScreen from '../../screens/Profile/EditProfileScreen';
import SettingsScreen from '../../screens/Settings/SettingsScreen';
import RankingScreen from '../../screens/Ranking/RankingScreen';
import AchievementsScreen from '../../screens/Profile/AchievementsScreen';
import StatsScreen from '../../screens/Profile/StatsScreen';
import StatsDashboardScreen from '../../screens/Stats/StatsDashboardScreen';
import NotificationsScreen from '../../screens/Notifications/NotificationsScreen';
import GroupsScreen from '../../screens/Groups/GroupsScreen';
import TrainingPlanScreen from '../../screens/Training/TrainingPlanScreen';
import FeedScreen from '../../screens/Feed/FeedScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyProfile" component={MyProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Ranking" component={RankingScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="StatsDashboard" component={StatsDashboardScreen as any} />
      <Stack.Screen name="Notifications" component={NotificationsScreen as any} />
      <Stack.Screen name="Groups" component={GroupsScreen as any} />
      <Stack.Screen name="Training" component={TrainingPlanScreen as any} />
      <Stack.Screen name="Feed" component={FeedScreen as any} />
    </Stack.Navigator>
  );
}
