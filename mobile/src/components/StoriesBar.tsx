// Bar horizontal de stories ativas (estilo Instagram) — aparece no topo do Discovery
import React, { useEffect, useState, useCallback } from 'react';
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
  onOpenStory: (storyId: string, allStories: Story[], markSeen: (userId: string) => void) => void;
};

export default function StoriesBar({ onAddStory, onOpenStory }: Props) {
  const user = useAuthStore((s) => s.user);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which user's stories have been seen in this session
  const [seenUsers, setSeenUsers] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      const { stories: list } = await storiesService.feed(1, 30);
      setStories(list);
    } catch {
      // sem stories ou sem net — silencia
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markSeen = useCallback((userId: string) => {
    setSeenUsers((prev) => new Set(prev).add(userId));
  }, []);

  // Agrupa stories por user — pega só a mais recente como cover
  const grouped: { user: NonNullable<Story['user']>; stories: Story[]; hasMine: boolean }[] = [];
  for (const s of stories) {
    if (!s.user) continue;
    // Don't show my own stories in the list (they show in "Seu story" slot)
    if (s.user.id === user?.id) continue;
    const existing = grouped.find((g) => g.user.id === s.user!.id);
    if (existing) existing.stories.push(s);
    else grouped.push({ user: s.user, stories: [s], hasMine: s.user.id === user?.id });
  }

  // Check if current user has their own story
  const myStories = stories.filter((s) => s.user?.id === user?.id);
  const hasMyStory = myStories.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Adicionar story — shows "Add" or shows your own story */}
        <TouchableOpacity
          style={styles.item}
          onPress={hasMyStory ? () => onOpenStory(myStories[0].id, myStories, markSeen) : onAddStory}
          activeOpacity={0.7}
        >
          {hasMyStory ? (
            <LinearGradient
              colors={[ACCENT, '#FF4500']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.gradientRing}
            >
              <View style={styles.innerRing}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={[ACCENT, '#FF4500']} style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{(user?.name || 'V').charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                )}
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.addRing}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={[ACCENT, '#FF4500']} style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{(user?.name || 'V').charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
              <View style={styles.plusBadge}>
                <Ionicons name="add" size={14} color="#fff" />
              </View>
            </View>
          )}
          <Text style={styles.itemLabel} numberOfLines={1}>
            {hasMyStory ? 'Seu story' : 'Adicionar'}
          </Text>
        </TouchableOpacity>

        {loading && grouped.length === 0 && (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={ACCENT} />
          </View>
        )}

        {grouped.map((g) => {
          const isSeen = seenUsers.has(g.user.id);
          return (
            <TouchableOpacity
              key={g.user.id}
              style={styles.item}
              onPress={() => onOpenStory(g.stories[0].id, g.stories, markSeen)}
              activeOpacity={0.7}
            >
              {isSeen ? (
                // Seen: gray ring
                <View style={styles.seenRing}>
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
                </View>
              ) : (
                // Unseen: colorful gradient ring
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
              )}
              <Text style={[styles.itemLabel, isSeen && styles.itemLabelSeen]} numberOfLines={1}>
                {g.user.name?.split(' ')[0] || 'Atleta'}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  itemLabelSeen: {
    color: colors.secondaryText,
    fontWeight: '500',
  },
  seenRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    padding: spacing.md,
  },
});
