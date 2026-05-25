import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DiscoveryUser, SPORTS, SportLevel } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import CompatibilityBadge from './CompatibilityBadge';
import { calculateMatchCompatibility } from '../../utils/matchCompatibility';
import { useAuthStore } from '../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

const LEVEL_CONFIG: Record<SportLevel, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  beginner: { label: 'Iniciante', icon: 'leaf', color: '#4ADE80' },
  intermediate: { label: 'Intermediário', icon: 'flame', color: '#FAAD14' },
  advanced: { label: 'Avançado', icon: 'trophy', color: '#FF6B35' },
};

const SPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  running: 'walk',
  cycling: 'bicycle',
  swimming: 'water',
  football: 'football',
  basketball: 'basketball',
  tennis: 'tennisball',
  yoga: 'body',
  gym: 'barbell',
  hiking: 'trail-sign',
  default: 'fitness',
};

interface SwipeCardProps {
  user: DiscoveryUser;
}

function SwipeCardInner({ user }: SwipeCardProps) {
  const me = useAuthStore((s) => s.user);

  const sportLabels = user.sports?.map(
    (s) => SPORTS.find((sp) => sp.id === s)?.label || s,
  ) || [];

  const age = user.birthDate
    ? new Date().getFullYear() - new Date(user.birthDate).getFullYear()
    : null;

  const levelConfig = user.level ? LEVEL_CONFIG[user.level as SportLevel] : null;
  const primarySport = user.sports?.[0];

  const compatibility = useMemo(
    () =>
      calculateMatchCompatibility({
        meSports: (me as any)?.sports,
        themSports: user.sports,
        meLevel: (me as any)?.level,
        themLevel: user.level,
        meObjectives: (me as any)?.objectives,
        themObjectives: (user as any)?.objectives,
        meAvailability: (me as any)?.availability,
        themAvailability: (user as any)?.availability,
        distanceKm: user.distance ?? null,
      }),
    [me, user],
  );

  return (
    <View style={styles.card}>
      <Image
        source={
          user.avatarUrl
            ? { uri: user.avatarUrl }
            : require('../../assets/images/default-avatar.png')
        }
        style={styles.image}
        defaultSource={require('../../assets/images/default-avatar.png')}
      />

      {/* Top badges row */}
      <View style={styles.topRow}>
        {levelConfig && (
          <View style={[styles.levelBadge, { backgroundColor: levelConfig.color + 'CC' }]}>
            <Ionicons name={levelConfig.icon} size={11} color="#FFF" />
            <Text style={styles.levelText}>{levelConfig.label}</Text>
          </View>
        )}
        {compatibility.score > 0 && (
          <CompatibilityBadge result={compatibility} compact />
        )}
        {primarySport && (
          <View style={styles.sportBadge}>
            <Ionicons
              name={SPORT_ICONS[primarySport] || SPORT_ICONS.default}
              size={14}
              color="#FFF"
            />
          </View>
        )}
      </View>

      {/* Strong bottom gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      >
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name}</Text>
            {age && <Text style={styles.age}>, {age}</Text>}
          </View>

          <View style={styles.distanceRow}>
            <Ionicons name="location" size={12} color={colors.dark.accent} />
            <Text style={styles.distance}>
              {user.distance < 1
                ? `${Math.round(user.distance * 1000)}m de distância`
                : `${user.distance.toFixed(1)}km de distância`}
            </Text>
          </View>

          {sportLabels.length > 0 && (
            <View style={styles.tags}>
              {sportLabels.slice(0, 3).map((label, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{label}</Text>
                </View>
              ))}
              {sportLabels.length > 3 && (
                <View style={[styles.tag, styles.tagMore]}>
                  <Text style={styles.tagText}>+{sportLabels.length - 3}</Text>
                </View>
              )}
            </View>
          )}

          {user.bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {user.bio}
            </Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

// Memoizado: SwipeCard só re-renderiza se o user.id mudar (ou bio/avatarUrl).
// Hot path do deck de swipe — evita re-renders no PanResponder.
const SwipeCard = React.memo(SwipeCardInner, (prev, next) =>
  prev.user.id === next.user.id &&
  prev.user.bio === next.user.bio &&
  prev.user.avatarUrl === next.user.avatarUrl,
);

export default SwipeCard;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.38,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A1A2E',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  topRow: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backdropFilter: 'blur(10px)',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  sportBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    justifyContent: 'flex-end',
  },
  info: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  name: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  age: {
    fontSize: fontSize.xl,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.85)',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  distance: {
    fontSize: fontSize.xs,
    color: colors.dark.accent,
    fontWeight: '600',
  },
  tags: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(91, 46, 255, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 255, 0.4)',
  },
  tagMore: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tagText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  bio: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
