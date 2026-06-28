// Lista de comentários + input + kudos em atividade.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './ui/Avatar';
import api from '../services/api';
import { colors, fontSize, spacing, borderRadius } from '../theme';
import { showToast } from './ui/Toast';

const ACCENT = '#FF6B35';

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string };
};

type Props = {
  activityId: string;
  currentUserId: string;
};

export default function ActivityComments({ activityId, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [kudosTotal, setKudosTotal] = useState(0);
  const [iLiked, setILiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState('');
  const heartScale = React.useRef(new Animated.Value(1)).current;

  const load = async () => {
    try {
      const [c, k] = await Promise.all([
        api.get(`/activities/${activityId}/comments`),
        api.get(`/activities/${activityId}/kudos`),
      ]);
      setComments(c.data);
      setKudosTotal(k.data.total || 0);
    } catch { /* silencia */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activityId]);

  const handleKudos = async () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    try {
      const { data } = await api.post(`/activities/${activityId}/kudos`);
      setILiked(data.kudos);
      setKudosTotal(data.total);
    } catch {
      showToast('Erro ao dar kudos', 'error');
    }
  };

  const handlePost = async () => {
    const content = text.trim();
    if (!content) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/activities/${activityId}/comments`, { content });
      setComments([data, ...comments]);
      setText('');
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Erro ao comentar', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/activities/comments/${id}`);
      setComments(comments.filter((c) => c.id !== id));
    } catch {
      showToast('Erro ao apagar', 'error');
    }
  };

  return (
    <View style={styles.container}>
      {/* Kudos bar */}
      <View style={styles.kudosBar}>
        <TouchableOpacity onPress={handleKudos} style={styles.kudosBtn} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={iLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={iLiked ? ACCENT : colors.text}
            />
          </Animated.View>
          <Text style={[styles.kudosText, iLiked && { color: ACCENT, fontWeight: '800' }]}>
            {kudosTotal} kudo{kudosTotal !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
        <View style={styles.commentCount}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.commentCountText}>{comments.length}</Text>
        </View>
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Comentar…"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={text}
          onChangeText={setText}
          maxLength={500}
          multiline
        />
        <TouchableOpacity
          onPress={handlePost}
          disabled={!text.trim() || posting}
          style={[styles.sendBtn, (!text.trim() || posting) && { opacity: 0.4 }]}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: spacing.lg }} />
      ) : comments.length === 0 ? (
        <Text style={styles.empty}>Seja o primeiro a comentar 💬</Text>
      ) : (
        comments.map((c) => (
          <View key={c.id} style={styles.commentRow}>
            {c.user.avatarUrl ? (
              <Avatar uri={c.user.avatarUrl} size={32} style={styles.commentAvatar} />
            ) : (
              <View style={[styles.commentAvatar, styles.commentAvatarFallback]}>
                <Text style={styles.commentAvatarInitial}>
                  {c.user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.commentBody}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentName}>{c.user.name}</Text>
                <Text style={styles.commentTime}>{relativeTime(c.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{c.content}</Text>
              {c.user.id === currentUserId && (
                <TouchableOpacity onPress={() => handleDelete(c.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={12} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}
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
  container: { paddingVertical: spacing.md },
  kudosBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: spacing.md,
  },
  kudosBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kudosText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  commentCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentCountText: { color: colors.secondaryText, fontSize: 14, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    color: '#F0F0FF', fontSize: 14, maxHeight: 80,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)',
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
  },
  empty: {
    textAlign: 'center', color: colors.secondaryText,
    paddingVertical: spacing.lg, fontSize: 13,
  },
  commentRow: {
    flexDirection: 'row', gap: 10,
    paddingVertical: spacing.sm,
  },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentAvatarFallback: {
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarInitial: { color: '#fff', fontWeight: '800', fontSize: 13 },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  commentTime: { color: colors.secondaryText, fontSize: 11 },
  commentText: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 2 },
  deleteBtn: {
    position: 'absolute', right: 0, bottom: 0,
    padding: 4,
  },
});
