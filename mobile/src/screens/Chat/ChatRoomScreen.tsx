import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActionSheetIOS,
  Animated,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { Message } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socket.service';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, 'ChatRoom'>;
  route: RouteProp<ChatStackParamList, 'ChatRoom'>;
};

export default function ChatRoomScreen({ navigation, route }: Props) {
  const { matchId, userName } = route.params;
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadMessages(1, true);
    setupSocket();
    return () => {
      socketService.leaveChat?.(matchId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(typingAnim, {
      toValue: otherIsTyping ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [otherIsTyping]);

  const loadMessages = async (pageToLoad: number = 1, reset: boolean = false) => {
    if (loadingMore && !reset) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get(`/chat/${matchId}/messages?page=${pageToLoad}&limit=50`);
      const newMessages: Message[] = data.messages || [];
      if (reset) {
        setMessages(newMessages);
      } else {
        setMessages((prev) => [...newMessages, ...prev]);
      }
      setHasMore(newMessages.length === 50);
      setPage(pageToLoad);
      api.put(`/chat/${matchId}/read`).catch(() => {});
    } catch {
      // sem mensagens em caso de erro
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && !loadingMore) {
      loadMessages(page + 1, false);
    }
  };

  const setupSocket = async () => {
    if (!user) return;
    try {
      await socketService.connect(user.id);
      socketService.joinChat(matchId);
      socketService.onNewMessage((message: Message) => {
        setMessages((prev) => [...prev, message]);
      });
      socketService.onTyping?.((data: any) => {
        if (data.userId !== user.id) {
          setOtherIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setOtherIsTyping(false), 3000);
        }
      });
    } catch {
      // conexão falhou, mensagens via HTTP ainda funcionam
    }
  };

  const sendMessage = () => {
    if (!text.trim() || !user) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      match_id: matchId,
      sender_id: user.id,
      content: text.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    socketService.sendMessage(matchId, user.id, text.trim());
    setText('');
    setIsTyping(false);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      socketService.sendTyping?.(matchId, user?.id || '');
    }
    if (value.length === 0) {
      setIsTyping(false);
    }
  };

  const handleMoreOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Ver perfil', 'Limpar conversa', 'Bloquear usuario', 'Denunciar'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) {
            navigation.getParent()?.navigate('HomeTab', {
              screen: 'UserProfile',
              params: { userId: route.params.userId },
            });
          } else if (index === 2) {
            Alert.alert('Limpar conversa', 'Deseja apagar todas as mensagens?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Limpar', style: 'destructive', onPress: () => setMessages([]) },
            ]);
          } else if (index === 3) {
            Alert.alert('Bloquear', `Deseja bloquear ${userName}?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Bloquear', style: 'destructive', onPress: () => {
                Alert.alert('Bloqueado', `${userName} foi bloqueado.`);
                navigation.goBack();
              }},
            ]);
          } else if (index === 4) {
            Alert.alert('Denuncia enviada', 'Obrigado por reportar. Iremos analisar.');
          }
        },
      );
    } else {
      Alert.alert('Opcoes', '', [
        { text: 'Ver perfil', onPress: () => {} },
        { text: 'Limpar conversa', onPress: () => setMessages([]) },
        { text: 'Bloquear', style: 'destructive', onPress: () => {
          Alert.alert('Bloqueado', `${userName} foi bloqueado.`);
          navigation.goBack();
        }},
        { text: 'Denunciar', onPress: () => Alert.alert('Denuncia enviada') },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const handleAttachment = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Camera', 'Galeria', 'Localizacao', 'Treino compartilhado'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) Alert.alert('Camera', 'Funcionalidade em breve');
          if (index === 2) Alert.alert('Galeria', 'Funcionalidade em breve');
          if (index === 3) Alert.alert('Localizacao', 'Funcionalidade em breve');
          if (index === 4) Alert.alert('Treino', 'Funcionalidade em breve');
        },
      );
    } else {
      Alert.alert('Anexar', '', [
        { text: 'Camera', onPress: () => Alert.alert('Funcionalidade em breve') },
        { text: 'Galeria', onPress: () => Alert.alert('Funcionalidade em breve') },
        { text: 'Localizacao', onPress: () => Alert.alert('Funcionalidade em breve') },
        { text: 'Treino compartilhado', onPress: () => Alert.alert('Funcionalidade em breve') },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const prevMessage = messages[index - 1];
    const showTime = !prevMessage ||
      new Date(item.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000;

    return (
      <View>
        {showTime && (
          <Text style={styles.timeStamp}>
            {new Date(item.createdAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
          <Text style={[styles.messageText, isMe && styles.myMessageText]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
              {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <Ionicons
                name={item.isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.isRead ? '#4ADE80' : 'rgba(255,255,255,0.5)'}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} activeOpacity={0.7}>
          <View style={styles.headerAvatar}>
            <Image
              source={require('../../assets/images/default-avatar.png')}
              style={styles.headerAvatarImg}
            />
            <View style={styles.headerOnlineDot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{userName}</Text>
            <Text style={styles.headerSubtitle}>Online</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction} onPress={handleMoreOptions}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.dark.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          hasMore ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={loadMoreMessages}
              disabled={loadingMore}
            >
              <Text style={styles.loadMoreText}>
                {loadingMore ? 'Carregando...' : 'Carregar mensagens anteriores'}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={styles.emptyChatIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.dark.accent + '60'} />
            </View>
            <Text style={styles.emptyChatText}>
              Comece a conversa! Diga oi para {userName}
            </Text>
          </View>
        }
      />

      {/* Typing indicator */}
      <Animated.View style={[styles.typingContainer, { opacity: typingAnim, transform: [{ translateY: typingAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
        <Text style={styles.typingText}>{userName} esta digitando...</Text>
        <View style={styles.typingDots}>
          <View style={[styles.typingDot, { backgroundColor: colors.dark.secondaryText }]} />
          <View style={[styles.typingDot, { backgroundColor: colors.dark.secondaryText, opacity: 0.7 }]} />
          <View style={[styles.typingDot, { backgroundColor: colors.dark.secondaryText, opacity: 0.4 }]} />
        </View>
      </Animated.View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachBtn} onPress={handleAttachment}>
          <Ionicons name="add-circle-outline" size={26} color={colors.dark.accent} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Mensagem..."
            placeholderTextColor={colors.dark.secondaryText}
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
          />
        </View>
        {text.trim() ? (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={sendMessage}
          >
            <Ionicons name="send" size={18} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.micBtn}
            onPress={() => Alert.alert('Audio', 'Funcionalidade em breve')}
          >
            <Ionicons name="mic-outline" size={22} color={colors.dark.accent} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 38,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
    gap: spacing.sm,
  },
  headerAvatar: {
    position: 'relative',
  },
  headerAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.border,
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.dark.surface,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.dark.text,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyChatText: {
    fontSize: fontSize.sm,
    color: colors.dark.secondaryText,
    textAlign: 'center',
  },
  timeStamp: {
    fontSize: 11,
    color: colors.dark.secondaryText,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 4,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.dark.surface,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: fontSize.md,
    color: colors.dark.text,
    lineHeight: 22,
  },
  myMessageText: {
    color: colors.white,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    color: colors.secondaryText,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.6)',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    gap: spacing.xs,
  },
  typingText: {
    fontSize: fontSize.xs,
    color: colors.dark.secondaryText,
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    backgroundColor: colors.dark.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    gap: spacing.xs,
  },
  attachBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  loadMoreText: {
    fontSize: fontSize.xs,
    color: colors.dark.secondaryText,
    fontWeight: '500',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.dark.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    maxHeight: 100,
  },
  input: {
    fontSize: fontSize.md,
    color: colors.dark.text,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    minHeight: 36,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
});
