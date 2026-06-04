import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image'; // cache em disco + transição suave
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
  cardHeight?: number;
}

function SwipeCardInner({ user, cardHeight }: SwipeCardProps) {
  const me = useAuthStore((s) => s.user);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Build photo gallery: profilePhotos first, then avatarUrl as fallback
  const photos = useMemo(() => {
    const gallery: string[] = [];
    if (user.profilePhotos && user.profilePhotos.length > 0) {
      gallery.push(...user.profilePhotos);
    } else if (user.avatarUrl) {
      gallery.push(user.avatarUrl);
    }
    return gallery;
  }, [user.profilePhotos, user.avatarUrl]);

  const currentPhoto = photos[photoIndex] || null;

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

  const handleTap = (side: 'left' | 'right') => {
    if (photos.length <= 1) return;
    setPhotoIndex((prev) => {
      if (side === 'right') return Math.min(prev + 1, photos.length - 1);
      return Math.max(prev - 1, 0);
    });
  };

  // Respect cardHeight prop so the card never overflows cardsContainer
  const computedHeight = cardHeight && cardHeight > 0 ? cardHeight : CARD_WIDTH * 1.38;

  return (
    <View style={[styles.card, { height: computedHeight }]}>
      {/* Photo */}
      <Image
        source={
          currentPhoto
            ? { uri: currentPhoto }
            : require('../../assets/images/default-avatar.png')
        }
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        placeholder={require('../../assets/images/default-avatar.png')}
      />

      {/* Tap zones for photo navigation */}
      {photos.length > 1 && (
        <View style={styles.tapZones} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={() => handleTap('left')}>
            <View style={styles.tapLeft} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={() => handleTap('right')}>
            <View style={styles.tapRight} />
          </TouchableWithoutFeedback>
        </View>
      )}

      {/* Photo dots indicator */}
      {photos.length > 1 && (
        <View style={styles.dotsRow}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.4)' },
                i === photoIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Top badges row */}
      <View style={styles.topRow}>
        {levelConfig && (
          <View style={[styles.levelBadge, { backgroundColor: levelConfig.color + 'CC' }]}>
            <Ionicons name={levelConfig.icon} size={11} color="#FFF" />
            <Text style={styles.levelText}>{levelConfig.label}</Text>
          </View>
        )}
        <View style={styles.topRight}>
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

          {user.city && (
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={12} color={colors.dark.accent} />
              <Text style={styles.distance}>
                {user.distance < 1
                  ? `${Math.round(user.distance * 1000)}m de distância`
                  : `${user.distance.toFixed(1)}km de distância`}
                {user.city ? ` · ${user.city}` : ''}
              </Text>
            </View>
          )}

          {!user.city && (
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={12} color={colors.dark.accent} />
              <Text style={styles.distance}>
                {user.distance < 1
                  ? `${Math.round(user.distance * 1000)}m de distância`
                  : `${user.distance.toFixed(1)}km de distância`}
              </Text>
            </View>
          )}

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

          {/* Frases estilo Tinder — mostra até 2 no card */}
          {user.prompts && user.prompts.length > 0 && (
            <View style={styles.prompts}>
              {user.prompts.slice(0, 2).map((p, i) => (
                <View key={i} style={styles.promptChip}>
                  <Text style={styles.promptQ}>{p.q}</Text>
                  <Text style={styles.promptA} numberOfLines={1}>{p.a}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Photo count hint if multiple photos */}
          {photos.length > 1 && (
            <Text style={styles.photoHint}>
              <Ionicons name="images-outline" size={11} color="rgba(255,255,255,0.5)" />
              {' '}{photos.length} fotos · toque para navegar
            </Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

// Memoizado: SwipeCard só re-renderiza se o user.id mudar.
// Hot path do deck de swipe — evita re-renders no PanResponder.
const SwipeCard = React.memo(SwipeCardInner, (prev, next) =>
  prev.user.id === next.user.id &&
  prev.user.bio === next.user.bio &&
  prev.user.avatarUrl === next.user.avatarUrl &&
  prev.cardHeight === next.cardHeight &&
  JSON.stringify(prev.user.profilePhotos) === JSON.stringify(next.user.profilePhotos),
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
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    // Only cover top 60% (leave bottom gradient for info)
    height: '60%',
  },
  tapLeft: {
    flex: 1,
    height: '100%',
  },
  tapRight: {
    flex: 1,
    height: '100%',
  },
  dotsRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    maxWidth: 48,
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  topRow: {
    position: 'absolute',
    top: spacing.lg + 8,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
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
  photoHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  prompts: { marginTop: spacing.sm, gap: 6 },
  promptChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  promptQ: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' },
  promptA: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 1 },
});
