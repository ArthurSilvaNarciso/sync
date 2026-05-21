// Skeletons prontos pra diferentes telas
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { spacing, borderRadius } from '../../theme';

export function ChatListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={{ padding: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.chatRow}>
          <Skeleton width={52} height={52} borderRadius={26} />
          <View style={{ flex: 1, marginLeft: spacing.md, gap: 8 }}>
            <Skeleton width={'60%'} height={14} />
            <Skeleton width={'90%'} height={12} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Skeleton width={40} height={10} />
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function EventCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={{ padding: spacing.md, gap: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.eventCard}>
          <Skeleton width={72} height={72} borderRadius={borderRadius.sm} />
          <View style={{ flex: 1, marginLeft: spacing.md, gap: 8 }}>
            <Skeleton width={'80%'} height={16} />
            <Skeleton width={'50%'} height={12} />
            <Skeleton width={'70%'} height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function StatsCardSkeleton() {
  return (
    <View style={{ padding: spacing.md, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={styles.statCard}><Skeleton width={'80%'} height={28} /><Skeleton width={'50%'} height={11} style={{ marginTop: 4 }} /></View>
        <View style={styles.statCard}><Skeleton width={'80%'} height={28} /><Skeleton width={'50%'} height={11} style={{ marginTop: 4 }} /></View>
        <View style={styles.statCard}><Skeleton width={'80%'} height={28} /><Skeleton width={'50%'} height={11} style={{ marginTop: 4 }} /></View>
      </View>
      <Skeleton width={'100%'} height={120} borderRadius={borderRadius.md} />
      <Skeleton width={'100%'} height={80} borderRadius={borderRadius.md} />
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View>
      <Skeleton width={'100%'} height={280} borderRadius={0} />
      <View style={{ padding: spacing.lg, gap: spacing.md, marginTop: -40 }}>
        <Skeleton width={120} height={120} borderRadius={60} style={{ alignSelf: 'center' }} />
        <Skeleton width={'40%'} height={20} style={{ alignSelf: 'center' }} />
        <Skeleton width={'70%'} height={14} style={{ alignSelf: 'center' }} />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <View style={styles.statCard}><Skeleton width={'80%'} height={24} /></View>
          <View style={styles.statCard}><Skeleton width={'80%'} height={24} /></View>
          <View style={styles.statCard}><Skeleton width={'80%'} height={24} /></View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statCard: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    gap: 4,
  },
});
