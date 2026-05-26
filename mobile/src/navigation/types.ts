import { NavigatorScreenParams } from '@react-navigation/native';

// Stack de autenticação
export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Terms: undefined;
  Privacy: undefined;
};

// Stack de onboarding
export type OnboardingStackParamList = {
  Sports: undefined;
  Level: undefined;
  Objectives: undefined;
  Availability: undefined;
  Location: undefined;
};

// Tabs principais
export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  TrackingTab: undefined;
  ChatTab: undefined;
  ProfileTab: undefined;
};

// Stacks dentro das tabs
export type HomeStackParamList = {
  Discovery: undefined;
  UserProfile: { userId: string };
  MatchScreen: { matchId: string; userName: string };
  LikesReceived: undefined;
};

export type ChatStackParamList = {
  ConversationList: undefined;
  ChatRoom: { matchId: string; userName: string; userId: string };
};

export type MapStackParamList = {
  MapMain: undefined;
  EventDetail: { eventId: string };
  CreateEvent: undefined;
  MyEvents: undefined;
};

export type TrackingStackParamList = {
  TrackingMain: undefined;
  ActiveTracking: { activityId: string };
  ActivitySummary: { activityId: string };
  ActivityHistory: undefined;
};

export type ProfileStackParamList = {
  MyProfile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Ranking: undefined;
  Achievements: undefined;
  Stats: undefined;
  StatsDashboard: undefined;
  Notifications: undefined;
  Groups: undefined;
  Training: undefined;
  Feed: undefined;
  Privacy: undefined;
  Terms: undefined;
  Help: undefined;
};

// Root navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
