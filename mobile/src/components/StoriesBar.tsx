// Bar horizontal de stories ativas (estilo Instagram) — aparece no topo do Discovery
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { storiesService, Story } from '../services/stories.service';
import { useAuthStore } from '../store/authStore';
import { colors, fontSize, spacing } from '../theme';

const ACCENT = '#FF6B35';

type Props = {
  onAddStory: () => void;
  onOpenStory: (storyId: string, allStories: Story[]) => void;
};

export default function StoriesBar({ onAddStory, onOpenStory }: Props) {
  const user = useAuthStore((s) => s.user);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { stories: list } = await storiesService.feed(1, 20);
      setStories(list);
    } catch {
      // sem stories ou sem net — silencia
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Agrupa stories por user — pega só a mais recente como cover
  const grouped: { user: NonNullable<Story['user']>; stories: Story[] }[] = [];
  for (const s of stories) {
    if (!s.user) continue;
    const existing = grouped.find((g) => g.user.id === s.user!.id);
    if (existing) existing.stories.push(s);
    else grouped.push({ user: s.user, stories: [s] });
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Adicionar story */}
        <TouchableOpacity style={styles.item} onPress={onAddStory} activeOpacity={0.7}>
          <View style={styles.addRing}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={[ACCENT, '#FF4500']} style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{(user?.name || 'V').charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
            <View style={styles.plusBadge}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.itemLabel} numberOfLines={1}>Seu story</Text>
        </TouchableOpacity>

        {loading && grouped.length === 0 && (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={ACCENT} />
          </View>
        )}

        {grouped.map((g) => (
          <TouchableOpacity
            key={g.user.id}
            style={styles.item}
            onPress={() => onOpenStory(g.stories[0].id, g.stories)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[ACCENT, '#FF1744', '#8B5CFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.gradientRing}
            >
              <View style={styles.innerRing}>
                {g.user.avatarUrl ? (
                  <Image source={{ uri: g.user.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {g.user.name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
            <Text style={styles.itemLabel} numberOfLines={1}>
              {g.user.name?.split(' ')[0] || 'Atleta'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const RING_SIZE = 68;
const AVATAR_SIZE = 60;

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  scroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  item: {
    alignItems: 'center',
    width: 72,
  },
  addRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gradientRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: RING_SIZE - 6,
    height: RING_SIZE - 6,
    borderRadius: (RING_SIZE - 6) / 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  itemLabel: {
    marginTop: 4,
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
    maxWidth: 72,
  },
  loading: {
    padding: spacing.md,
  },
});
