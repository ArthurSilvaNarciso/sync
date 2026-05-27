import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  activityCommentsApi,
  ActivityCommentItem,
  ALLOWED_COMMENT_REACTIONS,
  parseCommentTokens,
  AllowedCommentReaction,
} from '../../services/activity-comments.service';

interface Props {
  comment: ActivityCommentItem;
  currentUserId?: string;
  onMentionPress?: (name: string) => void;
  onHashtagPress?: (tag: string) => void;
  onDeleted?: (commentId: string) => void;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export const CommentItem: React.FC<Props> = ({ comment, currentUserId, onMentionPress, onHashtagPress, onDeleted }) => {
  const [reactions, setReactions] = useState(comment.reactions || []);
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const isMine = currentUserId && comment.user_id === currentUserId;

  const tokens = useMemo(() => parseCommentTokens(comment.content), [comment.content]);

  const toggleReaction = useCallback(
    async (emoji: AllowedCommentReaction) => {
      if (busy) return;
      setBusy(true);
      // Otimista
      setReactions((prev) => {
        const idx = prev.findIndex((r) => r.emoji === emoji);
        if (idx >= 0) {
          const r = prev[idx];
          const newCount = r.count + (r.mine ? -1 : 1);
          if (newCount <= 0 && r.mine) {
            return prev.filter((_, i) => i !== idx);
          }
          const copy = [...prev];
          copy[idx] = { ...r, count: newCount, mine: !r.mine };
          return copy;
        }
        return [...prev, { emoji, count: 1, mine: true }];
      });
      try {
        const res = await activityCommentsApi.toggleReaction(comment.id, emoji);
        // Reconcile com servidor
        setReactions((prev) => {
          const others = prev.filter((r) => r.emoji !== emoji);
          if (res.count > 0) {
            return [...others, { emoji, count: res.count, mine: res.added }];
          }
          return others;
        });
      } catch {
        // Reverte se erro
        setReactions(comment.reactions || []);
      } finally {
        setBusy(false);
        setShowPicker(false);
      }
    },
    [busy, comment.id, comment.reactions],
  );

  const handleDelete = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await activityCommentsApi.remove(comment.id);
      onDeleted?.(comment.id);
    } catch {
      setBusy(false);
    }
  }, [busy, comment.id, onDeleted]);

  return (
    <View style={styles.row}>
      {comment.user.avatarUrl ? (
        <Image source={{ uri: comment.user.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{(comment.user.name || '?')[0]?.toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {comment.user.name}
          </Text>
          <Text style={styles.time}>{formatRelative(comment.createdAt)}</Text>
        </View>

        <Text style={styles.text}>
          {tokens.map((t, i) => {
            if (t.type === 'mention') {
              return (
                <Text key={i} style={styles.mention} onPress={() => onMentionPress?.(t.value)}>
                  @{t.value}
                </Text>
              );
            }
            if (t.type === 'hashtag') {
              return (
                <Text key={i} style={styles.hashtag} onPress={() => onHashtagPress?.(t.value)}>
                  #{t.value}
                </Text>
              );
            }
            return <Text key={i}>{t.value}</Text>;
          })}
        </Text>

        <View style={styles.reactionsRow}>
          {reactions.map((r) => (
            <Pressable
              key={r.emoji}
              onPress={() => toggleReaction(r.emoji as AllowedCommentReaction)}
              style={[styles.reactionPill, r.mine && styles.reactionPillMine]}
              hitSlop={6}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              <Text style={[styles.reactionCount, r.mine && styles.reactionCountMine]}>{r.count}</Text>
            </Pressable>
          ))}

          <TouchableOpacity
            onPress={() => setShowPicker((v) => !v)}
            hitSlop={8}
            style={styles.addReactionBtn}
            accessibilityLabel="Adicionar reação"
          >
            <Text style={styles.addReactionTxt}>＋</Text>
          </TouchableOpacity>

          {isMine && (
            <TouchableOpacity onPress={handleDelete} hitSlop={8} style={styles.deleteBtn}>
              <Text style={styles.deleteTxt}>excluir</Text>
            </TouchableOpacity>
          )}
        </View>

        {showPicker && (
          <View style={styles.picker}>
            {ALLOWED_COMMENT_REACTIONS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => toggleReaction(e)}
                style={styles.pickerBtn}
                hitSlop={4}
              >
                <Text style={styles.pickerEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  content: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 6,
  },
  name: { color: colors.text, fontWeight: '700', fontSize: fontSize.sm },
  time: { color: '#7E7EA0', fontSize: 10 },
  text: { color: colors.text, fontSize: fontSize.sm, marginTop: 2, lineHeight: 19 },
  mention: { color: colors.primary, fontWeight: '700' },
  hashtag: { color: colors.blueAccent, fontWeight: '600' },
  reactionsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reactionPillMine: {
    backgroundColor: 'rgba(255, 107, 53, 0.16)',
    borderColor: colors.primary,
  },
  reactionEmoji: { fontSize: 14, lineHeight: 18 },
  reactionCount: { fontSize: 11, color: colors.text, fontWeight: '700' },
  reactionCountMine: { color: colors.primary },
  addReactionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  addReactionTxt: { color: '#7E7EA0', fontSize: 14, fontWeight: '700', lineHeight: 14 },
  deleteBtn: { marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 3 },
  deleteTxt: { color: '#7E7EA0', fontSize: 10, textDecorationLine: 'underline' },
  picker: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexWrap: 'wrap',
  },
  pickerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  pickerEmoji: { fontSize: 22 },
});
