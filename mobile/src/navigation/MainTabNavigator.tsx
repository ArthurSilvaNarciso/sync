import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from './types';
import { colors } from '../theme';

import Logo from '../components/Logo';
import FeedStack from './stacks/FeedStack';
import HomeStack from './stacks/HomeStack';
import MapStack from './stacks/MapStack';
import TrackingStack, { TRACKING_FULLSCREEN_ROUTES } from './stacks/TrackingStack';
import ChatStack from './stacks/ChatStack';
import ProfileStack from './stacks/ProfileStack';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ACCENT = '#FF6B35';

// Altura base da barra (sem safe area — o padding bottom é dinâmico via insets)
const BAR_INNER_HEIGHT = Platform.OS === 'ios' ? 60 : 58;

// Exportado para uso em paddingBottom de listas
export const TAB_BAR_HEIGHT = BAR_INNER_HEIGHT + (Platform.OS === 'ios' ? 34 : 0);

const TABS: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }
> = {
  FeedTab:     { label: 'Feed',     icon: 'grid-outline',      iconActive: 'grid' },
  HomeTab:     { label: 'Descobrir',icon: 'compass-outline',   iconActive: 'compass' },
  MapTab:      { label: 'Mapa',     icon: 'map-outline',       iconActive: 'map' },
  TrackingTab: { label: 'Treinar',  icon: 'add',               iconActive: 'add' },
  ChatTab:     { label: 'Chat',     icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  ProfileTab:  { label: 'Perfil',   icon: 'person-outline',    iconActive: 'person' },
};

// ─── TabItem ──────────────────────────────────────────────────────────────────
function TabItem({
  focused, onPress, onLongPress, routeName, badgeCount = 0,
}: {
  focused: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  routeName: string;
  badgeCount?: number;
}) {
  const config = TABS[routeName];
  const scale = useRef(new Animated.Value(1)).current;
  const pillWidth = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.08 : 1,
        useNativeDriver: true,
        friction: 7,
        tension: 120,
      }),
      Animated.timing(pillWidth, {
        toValue: focused ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [focused]);

  // ── Tracking center button ───────────────────────────────────────────────
  if (routeName === 'TrackingTab') {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.tabCenter}
        accessibilityRole="button"
        accessibilityLabel="Treinar"
        accessibilityState={{ selected: focused }}
      >
        <Animated.View style={[styles.centerOuter, { transform: [{ scale }] }]}>
          <LinearGradient
            colors={focused ? ['#FF6B35', '#FF3D00'] : ['#2A1520', '#1A0E18']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.centerGradient}
          >
            <Logo size={26} color="#fff" />
          </LinearGradient>
        </Animated.View>
        <Text style={[styles.centerLabel, { color: focused ? ACCENT : '#7A7A8E' }]}>
          {config.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityLabel={config.label}
      accessibilityState={{ selected: focused }}
    >
      {/* Pill indicator por trás do ícone */}
      <Animated.View
        style={[
          styles.iconPill,
          {
            backgroundColor: pillWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['transparent', ACCENT + '20'],
            }),
            paddingHorizontal: pillWidth.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 14],
            }),
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons
            name={focused ? config.iconActive : config.icon}
            size={22}
            color={focused ? ACCENT : '#7A7A8E'}
          />
        </Animated.View>
      </Animated.View>

      <Text
        style={[
          styles.label,
          {
            color: focused ? ACCENT : '#7A7A8E',
            fontWeight: focused ? '700' : '500',
          },
        ]}
      >
        {config.label}
      </Text>

      {/* Badge */}
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── CustomTabBar ─────────────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key]?.options;
  const tabBarStyle = focusedOptions?.tabBarStyle as any;
  if (tabBarStyle && tabBarStyle.display === 'none') return null;

  // Padding bottom dinâmico: home indicator real do dispositivo
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 6);

  return (
    <View
      style={[styles.barContainer, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      {/* Background glassmorphism */}
      <View style={styles.barBg}>
        <LinearGradient
          colors={['rgba(18,18,28,0.96)', 'rgba(10,10,15,0.99)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Linha superior sutil */}
        <View style={styles.topLine} />
      </View>

      <View style={[styles.row, { height: BAR_INNER_HEIGHT }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <TabItem
              key={route.key}
              focused={focused}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              routeName={route.name}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="FeedTab"     component={FeedStack} />
      <Tab.Screen name="HomeTab"     component={HomeStack} />
      <Tab.Screen name="MapTab"      component={MapStack} />
      <Tab.Screen
        name="TrackingTab"
        component={TrackingStack}
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route) ?? 'TrackingMain';
          const hidden = TRACKING_FULLSCREEN_ROUTES.has(focused);
          return { tabBarStyle: hidden ? { display: 'none' } : undefined };
        }}
      />
      <Tab.Screen name="ChatTab"     component={ChatStack} />
      <Tab.Screen name="ProfileTab"  component={ProfileStack} />
    </Tab.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  barContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  barBg: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },

  // Regular tab item — full pressable area 44px+ effective
  tabItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  iconPill: {
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: '15%',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F87171',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // Center (Tracking) button — elevated
  tabCenter: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: -20,
    paddingVertical: 4,
  },
  centerOuter: {
    width: 52,
    height: 52,
    borderRadius: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  centerGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
