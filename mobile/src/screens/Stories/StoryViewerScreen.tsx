// Story viewer fullscreen com timer auto-avance, pause on press, swipe pra fechar.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, Pressable, Animated, Dimensions,
  TouchableWithoutFeedback, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Story, storiesService } from '../../services/stories.service';

const { width: SW, height: SH } = Dimensions.get('window');
const STORY_DURATION_MS = 6000;
const ACCENT = '#FF6B35';

type Props = {
  initialStories: Story[];
  initialIndex?: number;
  onClose: () => void;
};

export default function StoryViewerScreen({ initialStories, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const story = initialStories[index];

  useEffect(() => {
    if (!story) {
      onClose();
      return;
    }
    progress.setValue(0);
    setLiked(false);
    // Marca como visto
    storiesService.view(story.id).catch(() => {});
    // Anima progress bar
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION_MS,
      useNativeDriver: false,
    });
    if (!paused) {
      anim.start(({ finished }) => {
        if (finished) goNext();
      });
    }
    return () => anim.stop();
  }, [index, paused]);

  const goNext = () => {
    if (index + 1 < initialStories.length) setIndex(index + 1);
    else onClose();
  };

  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    try {
      await storiesService.like(story.id);
    } catch { setLiked(false); }
  };

  if (!story) return null;

  return (
    <View style={styles.container}>
      {/* Mídia */}
      <Image source={{ uri: story.mediaUrl }} style={styles.media} resizeMode="contain" />

      {/* Progress bars no topo */}
      <View style={styles.progressContainer}>
        {initialStories.map((_, i) => (
          <View key={i} style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width:
                    i < index
                      ? '100%'
                      : i === index
                      ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                      : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Header: avatar + nome + close */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          {story.user?.avatarUrl ? (
            <Image source={{ uri: story.user.avatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Text style={styles.headerAvatarInitial}>
                {story.user?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{story.user?.name || 'Atleta'}</Text>
            <Text style={styles.headerTime}>{relativeTime(story.createdAt)}</Text>
          </View>
        </View>
        <Pressable onPress={onClose} hitSlop={20}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </View>

      {/* Sport + distance badges */}
      {(story.sport || story.distanceKm) && (
        <View style={styles.badges}>
          {story.sport && (
            <View style={styles.badge}>
              <Ionicons name="flash" size={12} color={ACCENT} />
              <Text style={styles.badgeText}>{story.sport}</Text>
            </View>
          )}
          {story.distanceKm && (
            <View style={styles.badge}>
              <Ionicons name="navigate" size={12} color="#fff" />
              <Text style={styles.badgeText}>{story.distanceKm.toFixed(1)} km</Text>
            </View>
          )}
        </View>
      )}

      {/* Caption + actions (bottom) */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
        style={styles.bottomGradient}
      >
        {story.caption && (
          <Text style={styles.caption}>{story.caption}</Text>
        )}
        <View style={styles.actionsRow}>
          <View style={styles.stats}>
            <Ionicons name="eye-outline" size={14} color="#fff" />
            <Text style={styles.statsText}>{story.viewCount}</Text>
            <Ionicons name="heart" size={14} color={ACCENT} style={{ marginLeft: 12 }} />
            <Text style={styles.statsText}>{story.likeCount}</Text>
          </View>
          <Pressable onPress={handleLike} hitSlop={10} style={styles.likeBtn}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={28}
              color={liked ? ACCENT : '#fff'}
            />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Áreas de tap: esquerda (prev), centro (pause), direita (next) */}
      <View style={styles.tapZones} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={goPrev}>
          <View style={styles.tapLeft} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback
          onPressIn={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        >
          <View style={styles.tapCenter} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={goNext}>
          <View style={styles.tapRight} />
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
  },
  media: {
    width: SW,
    height: SH,
    backgroundColor: '#000',
  },
  progressContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 18,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 62 : 30,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#fff' },
  headerAvatarFallback: {
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarInitial: { color: '#fff', fontWeight: '800' },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  headerTime: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  badges: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 78,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bottomGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingTop: 80,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: 12,
  },
  caption: { color: '#fff', fontSize: 15, lineHeight: 22 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  likeBtn: {
    padding: 8,
  },
  tapZones: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
  },
  tapLeft: { flex: 1 },
  tapCenter: { flex: 1 },
  tapRight: { flex: 1 },
});
