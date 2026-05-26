import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  TextInput,
  RefreshControl,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { Conversation } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, 'ConversationList'>;
};

export default function ConversationListScreen({ navigation }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: showSearch ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [showSearch]);

  const loadConversations = async () => {
    setError(false);
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(true);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, []);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' });
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        (c.user?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.lastMessage?.content ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() =>
        navigation.navigate('ChatRoom', {
          matchId: item.matchId,
          userName: item.user.name,
          userId: item.user.id,
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <Image
          source={
            item.user.avatarUrl
              ? { uri: item.user.avatarUrl }
              : require('../../assets/images/default-avatar.png')
          }
          style={styles.avatar}
        />
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, item.unreadCount > 0 && styles.nameBold]} numberOfLines={1}>
            {item.user.name}
          </Text>
          {item.lastMessage && (
            <Text style={[styles.time, item.unreadCount > 0 && styles.timeActive]}>
              {formatTime(item.lastMessage.createdAt)}
            </Text>
          )}
        </View>
        <View style={styles.messageRow}>
          <Text
            style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.lastMessage?.content || 'Diga oi! 👋'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unreadCount > 9 ? '9+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="wifi-outline" size={44} color={colors.primary + '40'} />
        <Text style={styles.emptyTitle}>Erro ao carregar</Text>
        <Text style={styles.emptyText}>Verifique sua conexão e tente novamente.</Text>
        <TouchableOpacity
          style={styles.discoverBtn}
          onPress={() => { setLoading(true); loadConversations(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color={colors.primary} />
          <Text style={styles.discoverBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Mensagens</Text>
          {totalUnread > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalUnread}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchBtn, showSearch && styles.searchBtnActive]}
          onPress={() => {
            setShowSearch(!showSearch);
            if (showSearch) setSearchQuery('');
          }}
        >
          <Ionicons
            name={showSearch ? 'close' : 'search-outline'}
            size={22}
            color={showSearch ? colors.white : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <Animated.View style={[
        styles.searchContainer,
        {
          maxHeight: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }),
          opacity: searchAnim,
        },
      ]}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={colors.secondaryText} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversas..."
            placeholderTextColor={colors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={showSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {filteredConversations.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={44} color={colors.primary + '40'} />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Nenhum resultado' : 'Nenhuma conversa'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? `Nenhuma conversa encontrada para "${searchQuery}"`
              : 'Seus matches aparecerao aqui.\nComece a dar likes!'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.discoverBtn}
              onPress={() => navigation.getParent()?.navigate('HomeTab')}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={18} color={colors.primary} />
              <Text style={styles.discoverBtnText}>Descobrir pessoas</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.matchId}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  headerBadge: {
    backgroundColor: colors.primary,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnActive: {
    backgroundColor: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    height: 44,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.border,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  nameBold: {
    fontWeight: '700',
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.secondaryText,
  },
  timeActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMessage: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
    flex: 1,
  },
  lastMessageUnread: {
    color: colors.text,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: '700',
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.full,
  },
  discoverBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
});
