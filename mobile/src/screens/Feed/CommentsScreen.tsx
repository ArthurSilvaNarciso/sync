import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { feedApi, FeedComment } from '../../services/feed.service';
import { useAuthStore } from '../../store/authStore';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { showToast } from '../../components/ui/Toast';
import { confirmAsync } from '../../utils/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Generic params — Comments can be reached from multiple stacks
type CommentsParams = {
  Comments: { postId: string; postAuthorName: string };
};

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<CommentsParams, 'Comments'>;
};

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export default function CommentsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { postId, postAuthorName } = route.params;
  const { user } = useAuthStore();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await feedApi.getComments(postId);
      setComments(data || []);
    } catch {
      setError(true);
      showToast('Erro ao carregar comentários', 'error');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    const optimisticId = `temp-${Date.now()}`;
    const optimistic: FeedComment = {
      id: optimisticId,
      post_id: postId,
      user_id: user!.id,
      user: { id: user!.id, name: user!.name, avatarUrl: user?.avatarUrl },
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimistic]);
    const draft = text.trim();
    setText('');
    try {
      const saved = await feedApi.addComment(postId, draft);
      setComments((prev) => prev.map((c) => (c.id === optimisticId ? saved : c)));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      setText(draft);
      showToast(e?.response?.data?.message || 'Erro ao comentar', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (comment: FeedComment) => {
    if (comment.user_id !== user?.id) return;
    // confirmAsync funciona no web (Alert.alert ignora os botões lá)
    const ok = await confirmAsync('Apagar comentário?', undefined, {
      confirmText: 'Apagar', destructive: true,
    });
    if (!ok) return;
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    try {
      await feedApi.deleteComment(postId, comment.id);
    } catch {
      setComments((prev) => [...prev, comment].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ));
      showToast('Erro ao apagar', 'error');
    }
  };

  const renderItem = ({ item }: { item: FeedComment }) => (
    <View style={styles.commentRow}>
      <Image
        source={
          item.user?.avatarUrl
            ? { uri: item.user.avatarUrl }
            : require('../../assets/images/default-avatar.png')
        }
        style={styles.avatar}
      />
      <View style={styles.bubble}>
        <View style={styles.bubbleHeader}>
          <Text style={styles.commenterName}>{item.user?.name || 'Usuário'}</Text>
          <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
      {item.user_id === user?.id && (
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={{ marginLeft: 4 }}
        >
          <Ionicons name="trash-outline" size={14} color={colors.dark.secondaryText} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Comentários</Text>
          <Text style={styles.headerSub}>post de {postAuthorName}</Text>
        </View>
      </LinearGradient>

      {/* Comments list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          ListEmptyComponent={
            error ? (
              <View style={styles.empty}>
                <Ionicons name="cloud-offline-outline" size={48} color={colors.primary + '40'} />
                <Text style={styles.emptyText}>Erro ao carregar comentários</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={load}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar novamente"
                >
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.primary + '40'} />
                <Text style={styles.emptyText}>Seja o primeiro a comentar!</Text>
              </View>
            )
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <Image
          source={
            user?.avatarUrl
              ? { uri: user.avatarUrl }
              : require('../../assets/images/default-avatar.png')
          }
          style={styles.inputAvatar}
        />
        <TextInput
          style={styles.input}
          placeholder="Adicionar comentário..."
          placeholderTextColor={colors.dark.secondaryText}
          value={text}
          onChangeText={setText}
          maxLength={500}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !text.trim()}
          style={[styles.sendBtn, (!text.trim() || submitting) && { opacity: 0.4 }]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="send" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // paddingTop dinâmico via insets no JSX (notch/safe-area)
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark.text },
  headerSub: { fontSize: fontSize.xs, color: colors.dark.secondaryText, marginTop: 1 },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.10)' },
  bubble: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commenterName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.dark.text },
  commentTime: { fontSize: 11, color: colors.dark.secondaryText },
  commentText: { fontSize: fontSize.sm, color: colors.dark.text, lineHeight: 20 },
  empty: { alignItems: 'center', marginTop: 60, gap: spacing.md },
  emptyText: { color: colors.dark.secondaryText, fontSize: fontSize.md },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FF6B35',
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0D0D1A',
    gap: spacing.sm,
  },
  inputAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.10)' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 4,
    color: colors.dark.text,
    fontSize: fontSize.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sendBtn: { paddingBottom: Platform.OS === 'ios' ? 4 : 8, paddingHorizontal: 4 },
});
