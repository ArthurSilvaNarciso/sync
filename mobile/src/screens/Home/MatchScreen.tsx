import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, CommonActions } from '@react-navigation/native';
import { HomeStackParamList } from '../../navigation/types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import Button from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'MatchScreen'>;
  route: RouteProp<HomeStackParamList, 'MatchScreen'>;
};

export default function MatchScreen({ navigation, route }: Props) {
  const { matchId, userName, userId } = route.params;
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;

  // Refs to hold loop animation handles for cleanup
  const sparkle1LoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const sparkle2LoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const sparkle3LoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const heartRotateLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      // Heart bounce in
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        tension: 80,
        useNativeDriver: true,
      }),
      // Heart pulse
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Sparkle animations
    const animateSparkle = (
      sparkle: Animated.Value,
      delay: number,
      loopRef: React.MutableRefObject<Animated.CompositeAnimation | null>,
    ) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(sparkle, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkle, {
            toValue: 0,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loopRef.current = loop;
      loop.start();
    };

    animateSparkle(sparkle1, 0, sparkle1LoopRef);
    animateSparkle(sparkle2, 400, sparkle2LoopRef);
    animateSparkle(sparkle3, 800, sparkle3LoopRef);

    // Title fade in
    Animated.timing(titleOpacity, {
      toValue: 1,
      duration: 500,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Subtitle fade in
    Animated.timing(subtitleOpacity, {
      toValue: 1,
      duration: 500,
      delay: 700,
      useNativeDriver: true,
    }).start();

    // Buttons slide up
    Animated.timing(buttonsOpacity, {
      toValue: 1,
      duration: 500,
      delay: 1000,
      useNativeDriver: true,
    }).start();

    // Heart slow rotation
    const heartLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartRotate, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartRotate, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    heartRotateLoopRef.current = heartLoop;
    heartLoop.start();

    // Stop all loops on unmount to prevent memory leaks
    return () => {
      sparkle1LoopRef.current?.stop();
      sparkle2LoopRef.current?.stop();
      sparkle3LoopRef.current?.stop();
      heartRotateLoopRef.current?.stop();
    };
  }, []);

  const goToChat = () => {
    // Dispatch first, then goBack — prevents navigation on a stale ref
    const parent = navigation.getParent();
    if (parent) {
      parent.dispatch(
        CommonActions.navigate({
          name: 'ChatTab',
          params: {
            screen: 'ChatRoom',
            params: {
              matchId,
              userName,
              userId,
            },
          },
        }),
      );
    }
    navigation.goBack();
  };

  const rotate = heartRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });

  return (
    <LinearGradient
      colors={['#2E7BFF', '#5B2EFF', '#8B5CFF', '#FF6B9D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Sparkles */}
        <Animated.View style={[styles.sparkle, styles.sparkle1, { opacity: sparkle1, transform: [{ scale: sparkle1 }] }]}>
          <Ionicons name="star" size={20} color="rgba(255,255,255,0.6)" />
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkle2, { opacity: sparkle2, transform: [{ scale: sparkle2 }] }]}>
          <Ionicons name="star" size={16} color="rgba(255,255,255,0.5)" />
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkle3, { opacity: sparkle3, transform: [{ scale: sparkle3 }] }]}>
          <Ionicons name="star" size={24} color="rgba(255,255,255,0.4)" />
        </Animated.View>

        {/* Heart icon */}
        <Animated.View style={{ transform: [{ scale: heartScale }, { rotate }] }}>
          <View style={styles.heartGlow}>
            <Ionicons name="heart" size={90} color={colors.white} />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
          Deu Match!
        </Animated.Text>

        {/* Subtitle */}
        <Animated.View style={{ opacity: subtitleOpacity }}>
          <Text style={styles.subtitle}>
            Voce e <Text style={styles.userName}>{userName}</Text> querem treinar juntos!
          </Text>
          <View style={styles.matchBadge}>
            <Ionicons name="fitness" size={16} color={colors.white} />
            <Text style={styles.matchBadgeText}>Parceiro de treino encontrado</Text>
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[styles.buttons, { opacity: buttonsOpacity, transform: [{ translateY: buttonsOpacity.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
          <Button
            title="Enviar mensagem"
            onPress={goToChat}
            variant="outline"
            style={styles.btn}
          />
          <Button
            title="Continuar descobrindo"
            onPress={() => navigation.goBack()}
            variant="ghost"
            style={styles.btn}
          />
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  heartGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: '20%',
    left: '15%',
  },
  sparkle2: {
    top: '25%',
    right: '15%',
  },
  sparkle3: {
    top: '35%',
    left: '25%',
  },
  title: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.white,
    marginTop: spacing.xl,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 26,
  },
  userName: {
    fontWeight: '800',
    color: colors.white,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  matchBadgeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  buttons: {
    width: '100%',
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  btn: {
  },
});
