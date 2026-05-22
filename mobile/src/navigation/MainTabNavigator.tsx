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
import { MainTabParamList } from './types';
import { colors } from '../theme';

import HomeStack from './stacks/HomeStack';
import MapStack from './stacks/MapStack';
import TrackingStack from './stacks/TrackingStack';
import ChatStack from './stacks/ChatStack';
import ProfileStack from './stacks/ProfileStack';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ACCENT = '#FF6B35';

// Configuração visual de cada tab — ícones mais expressivos
const TABS: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }
> = {
  HomeTab: { label: 'Feed', icon: 'home-outline', iconActive: 'home' },
  MapTab: { label: 'Mapa', icon: 'navigate-circle-outline', iconActive: 'navigate-circle' },
  TrackingTab: { label: 'Treinar', icon: 'flash-outline', iconActive: 'flash' },
  ChatTab: { label: 'Grupos', icon: 'people-circle-outline', iconActive: 'people-circle' },
  ProfileTab: { label: 'Perfil', icon: 'person-circle-outline', iconActive: 'person-circle' },
};

// ================== Tab Item ==================
function TabItem({
  focused,
  onPress,
  onLongPress,
  routeName,
}: {
  focused: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  routeName: string;
}) {
  const config = TABS[routeName];
  const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const labelOpacity = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.05 : 1,
        useNativeDriver: true,
        friction: 6,
        tension: 100,
      }),
      Animated.timing(labelOpacity, {
        toValue: focused ? 1 : 0.55,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  // Tracking tab é especial — botão central elevado
  if (routeName === 'TrackingTab') {
    return (
      <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.tabCenter}>
        <Animated.View style={[styles.centerOuter, { transform: [{ scale }] }]}>
          <LinearGradient
            colors={focused ? [ACCENT, '#FF4500'] : ['#2A2A40', '#1E1E32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.centerGradient}
          >
            <Ionicons
              name={focused ? config.iconActive : config.icon}
              size={26}
              color={focused ? '#fff' : '#8E8EA0'}
            />
          </LinearGradient>
        </Animated.View>
        <Animated.Text
          style={[
            styles.centerLabel,
            { opacity: labelOpacity, color: focused ? ACCENT : '#8E8EA0' },
          ]}
        >
          {config.label}
        </Animated.Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.7 }]}
    >
      <Animated.View style={[styles.iconBox, { transform: [{ scale }] }]}>
        {focused && (
          <LinearGradient
            colors={[ACCENT + '40', ACCENT + '10']}
            style={styles.iconBoxBg}
          />
        )}
        <Ionicons
          name={focused ? config.iconActive : config.icon}
          size={22}
          color={focused ? ACCENT : '#8E8EA0'}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          {
            opacity: labelOpacity,
            color: focused ? ACCENT : '#8E8EA0',
            fontWeight: focused ? '700' : '500',
          },
        ]}
      >
        {config.label}
      </Animated.Text>
      {/* Indicador inferior */}
      {focused && <View style={styles.dotIndicator} />}
    </Pressable>
  );
}

// ================== Custom Tab Bar ==================
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.barContainer} pointerEvents="box-none">
      {/* Glass background com gradient sutil */}
      <View style={styles.barBg}>
        <LinearGradient
          colors={['rgba(20,20,32,0.92)', 'rgba(10,10,15,0.98)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Borda superior gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(255,107,53,0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topHairline}
        />
      </View>

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];

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

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
              routeName={route.name}
            />
          );
        })}
      </View>
    </View>
  );
}

// ================== Navigator ==================
export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="MapTab" component={MapStack} />
      <Tab.Screen name="TrackingTab" component={TrackingStack} />
      <Tab.Screen name="ChatTab" component={ChatStack} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} />
    </Tab.Navigator>
  );
}

const BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 72;

const styles = StyleSheet.create({
  barContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  barBg: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  topHairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  row: {
    width: '100%',
    maxWidth: 520, // centraliza na web
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
    paddingHorizontal: 4,
    height: BAR_HEIGHT,
    alignItems: 'flex-start',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    gap: 4,
  },
  iconBox: {
    width: 42,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconBoxBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  dotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginTop: 1,
  },
  // Center button (Tracking)
  tabCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    marginTop: -16,
  },
  centerOuter: {
    width: 56,
    height: 56,
    borderRadius: 18,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 14,
  },
  centerGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.3,
  },
});
