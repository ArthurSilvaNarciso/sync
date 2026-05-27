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
import { LinearGradient } from 'expo-linear-gradient';
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
      // JWT is read from SecureStore inside connect() — no userId arg needed
      await socketService.connect();
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
    // senderId is derived server-side from the JWT — only pass matchId + content
    socketService.sendMessage(matchId, text.trim());
    setText('');
    setIsTyping(false);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      socketService.emitTyping(matchId);
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
      {/* Premium gradient header */}
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
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
            <Text style={styles.headerSubtitle}>Online agora</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction} onPress={handleMoreOptions}>
            <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

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
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.dark.border,
    borderWidth: 2,
    borderColor: 'rgba(255,107,53,0.4)',
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
    borderColor: '#0A0A0F',
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
    backgroundColor: 'rgba(255,255,255,0.07)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
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
    backgroundColor: '#0D0D1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
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
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
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
