import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeedScreen from '../../screens/Feed/FeedScreen';
import CommentsScreen from '../../screens/Feed/CommentsScreen';
import UserSearchScreen from '../../screens/Feed/UserSearchScreen';
import UserProfileScreen from '../../screens/Profile/UserProfileScreen';
import NotificationsScreen from '../../screens/Notifications/NotificationsScreen';

export type FeedStackParamList = {
  FeedMain: undefined;
  Comments: { postId: string; postAuthorName: string };
  UserSearch: undefined;
  UserProfile: { userId: string };
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

export default function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FeedMain" component={FeedScreen as any} />
      <Stack.Screen name="Comments" component={CommentsScreen as any} />
      <Stack.Screen name="UserSearch" component={UserSearchScreen as any} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen as any} />
      <Stack.Screen name="Notifications" component={NotificationsScreen as any} />
    </Stack.Navigator>
  );
}
