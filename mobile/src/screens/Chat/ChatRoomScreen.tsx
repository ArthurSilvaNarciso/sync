// ChatRoom — read receipts, voice messages (expo-av), real block/report
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
  ActivityIndicator,
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
import { showToast } from '../../components/ui/Toast';
import { confirmAsync } from '../../utils/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { uploadMedia } from '../../services/media.service';

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, 'ChatRoom'>;
  route: RouteProp<ChatStackParamList, 'ChatRoom'>;
};

export default function ChatRoomScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { matchId, userName, userId: otherUserId } = route.params as any;
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Voice recording
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micPressAnim = useRef(new Animated.Value(1)).current;

  // Acessibilidade: legenda automática do áudio (web, via Web Speech API).
  // Transcreve enquanto você grava e envia a transcrição junto pra quem é surdo
  // ou prefere ler. Grátis, sem servidor.
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  const startSpeechCaption = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      transcriptRef.current = '';
      const rec = new SR();
      rec.lang = 'pt-BR';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let finalText = '';
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        }
        if (finalText) transcriptRef.current = finalText.trim();
      };
      rec.onerror = () => {};
      rec.start();
      recognitionRef.current = rec;
    } catch { /* navegador sem suporte */ }
  };

  const stopSpeechCaption = (): string => {
    try { recognitionRef.current?.stop?.(); } catch {}
    recognitionRef.current = null;
    const t = transcriptRef.current;
    transcriptRef.current = '';
    return t;
  };

  useEffect(() => {
    loadMessages(1, true);
    setupSocket();
    return () => {
      socketService.leaveChat?.(matchId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      try { recognitionRef.current?.stop?.(); } catch {}
      recording?.stopAndUnloadAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // Toca/pausa uma mensagem de áudio a partir da URL
  const playAudio = async (messageId: string, url: string) => {
    try {
      // Se já está tocando esta, para
      if (playingId === messageId) {
        await soundRef.current?.stopAsync().catch(() => {});
        await soundRef.current?.unloadAsync().catch(() => {});
        soundRef.current = null;
        setPlayingId(null);
        return;
      }
      // Descarrega qualquer som anterior
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingId(messageId);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
          setPlayingId(null);
        }
      });
    } catch {
      showToast('Erro ao reproduzir áudio', 'error');
      setPlayingId(null);
    }
  };

  useEffect(() => {
    Animated.timing(typingAnim, {
      toValue: otherIsTyping ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [otherIsTyping]);

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = async (pageToLoad = 1, reset = false) => {
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
      // Mark as read after loading
      api.put(`/chat/${matchId}/read`).catch(() => {});
      socketService.markRead(matchId);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Socket setup ───────────────────────────────────────────────────────────
  const setupSocket = async () => {
    if (!user) return;
    try {
      await socketService.connect();
      socketService.joinChat(matchId);

      socketService.onNewMessage((message: Message) => {
        setMessages((prev) => [...prev, message]);
        // Mark as read immediately when message from other person arrives
        if (message.sender_id !== user.id) {
          socketService.markRead(matchId);
          api.put(`/chat/${matchId}/read`).catch(() => {});
        }
      });

      socketService.onTyping?.((data: any) => {
        if (data.userId !== user.id) {
          setOtherIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setOtherIsTyping(false), 3000);
        }
      });

      // Read receipts — mark our messages as read
      socketService.onMessagesRead((data) => {
        if (data.matchId === matchId && data.readBy !== user.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.sender_id === user.id ? { ...m, isRead: true } : m,
            ),
          );
        }
      });
    } catch {
      // HTTP fallback still works
    }
  };

  // ── Send text message ──────────────────────────────────────────────────────
  const sendMessage = () => {
    if (!text.trim() || !user) return;
    const optimistic: Message = {
      id: Date.now().toString(),
      match_id: matchId,
      sender_id: user.id,
      content: text.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    socketService.sendMessage(matchId, text.trim());
    setText('');
    setIsTyping(false);
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permissão de microfone necessária', 'error');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      startSpeechCaption(); // legenda automática (web) — acessibilidade
      setRecording(rec);
      setIsRecording(true);
      setRecordDuration(0);
      recordingTimer.current = setInterval(() => {
        setRecordDuration((d) => d + 1);
      }, 1000);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPressAnim, { toValue: 1.25, duration: 300, useNativeDriver: true }),
          Animated.timing(micPressAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ).start();
    } catch {
      showToast('Erro ao iniciar gravação', 'error');
    }
  };

  const stopRecording = async () => {
    if (!recording || !isRecording) return;
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    micPressAnim.stopAnimation();
    micPressAnim.setValue(1);
    setIsRecording(false);
    const caption = stopSpeechCaption(); // legenda transcrita (web)

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri || recordDuration < 1) {
        showToast('Gravação muito curta', 'error');
        setRecordDuration(0);
        return;
      }

      setUploadingAudio(true);
      // Upload do arquivo → URL pública (não mais base64 no banco!)
      const { url } = await uploadMedia(uri, {
        name: `voice-${Date.now()}.m4a`,
        mimeType: 'audio/m4a',
      });

      const optimistic: Message = {
        id: Date.now().toString(),
        match_id: matchId,
        sender_id: user!.id,
        content: url,
        type: 'audio',
        isRead: false,
        createdAt: new Date().toISOString(),
      } as any;
      setMessages((prev) => [...prev, optimistic]);
      socketService.sendAudioMessage(matchId, url);

      // Acessibilidade: envia a transcrição como legenda (mensagem de texto
      // logo após o áudio) — quem é surdo ou prefere ler consegue acompanhar.
      if (caption && caption.length > 1) {
        const capText = `🗣️ "${caption}"`;
        const capMsg: Message = {
          id: (Date.now() + 1).toString(),
          match_id: matchId,
          sender_id: user!.id,
          content: capText,
          isRead: false,
          createdAt: new Date().toISOString(),
        } as any;
        setMessages((prev) => [...prev, capMsg]);
        socketService.sendMessage(matchId, capText);
      }
    } catch {
      showToast('Erro ao enviar áudio', 'error');
    } finally {
      setUploadingAudio(false);
      setRecordDuration(0);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    stopSpeechCaption(); // descarta a transcrição
    micPressAnim.stopAnimation();
    micPressAnim.setValue(1);
    setIsRecording(false);
    setRecordDuration(0);
    try {
      await recording.stopAndUnloadAsync();
    } catch { /* ignore */ }
    setRecording(null);
    showToast('Gravação cancelada', 'info');
  };

  // ── Typing ─────────────────────────────────────────────────────────────────
  const handleTextChange = (value: string) => {
    setText(value);
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      socketService.emitTyping(matchId);
    }
    if (value.length === 0) setIsTyping(false);
  };

  // ── Block / Report ─────────────────────────────────────────────────────────
  const confirmBlock = async () => {
    const ok = await confirmAsync('Bloquear usuário?', `Você não verá mais ${userName} no app.`, {
      confirmText: 'Bloquear', destructive: true,
    });
    if (!ok) return;
    try {
      await api.post(`/users/${otherUserId}/block`);
      showToast(`${userName} bloqueado`, 'success');
      navigation.goBack();
    } catch {
      showToast('Erro ao bloquear', 'error');
    }
  };

  const handleReport = async (reason: string) => {
    const ok = await confirmAsync('Confirmar denúncia?', `Motivo: ${reason}`, {
      confirmText: 'Denunciar', destructive: true,
    });
    if (!ok) return;
    try {
      await api.post(`/users/${otherUserId}/report`, { reason });
      showToast('Denúncia enviada. Obrigado!', 'success');
    } catch {
      showToast('Erro ao enviar denúncia', 'error');
    }
  };

  const handleMoreOptions = async () => {
    // iOS: ActionSheet nativo. Demais (Android/web): confirmAsync em sequência
    // (Alert.alert ignora os botões no RN Web).
    if (Platform.OS === 'ios') {
      const options = ['Cancelar', 'Bloquear usuário', 'Spam ou fraude', 'Assédio', 'Conteúdo inadequado'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: 1, cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) confirmBlock();
          if (idx === 2) handleReport('spam');
          if (idx === 3) handleReport('harassment');
          if (idx === 4) handleReport('inappropriate');
        },
      );
      return;
    }
    const block = await confirmAsync('Bloquear usuário?', `Você não verá mais ${userName} no app.`, {
      confirmText: 'Bloquear', destructive: true,
    });
    if (block) { await confirmBlockDirect(); return; }
    const report = await confirmAsync('Denunciar usuário?', `Reportar ${userName} por conteúdo inadequado ou abuso?`, {
      confirmText: 'Denunciar', destructive: true,
    });
    if (report) {
      try {
        await api.post(`/users/${otherUserId}/report`, { reason: 'inappropriate' });
        showToast('Denúncia enviada. Obrigado!', 'success');
      } catch {
        showToast('Erro ao enviar denúncia', 'error');
      }
    }
  };

  // Bloqueio direto (sem reconfirmar — já confirmado no menu)
  const confirmBlockDirect = async () => {
    try {
      await api.post(`/users/${otherUserId}/block`);
      showToast(`${userName} bloqueado`, 'success');
      navigation.goBack();
    } catch {
      showToast('Erro ao bloquear', 'error');
    }
  };

  // ── Render message ─────────────────────────────────────────────────────────
  const renderMessage = ({ item, index }: { item: Message & { type?: string }; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const prevMessage = messages[index - 1];
    const showTime = !prevMessage ||
      new Date(item.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000;
    const isAudio = (item as any).type === 'audio';

    return (
      <View>
        {showTime && (
          <Text style={styles.timeStamp}>
            {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
          {isAudio ? (
            <TouchableOpacity
              style={styles.audioBubble}
              onPress={() => playAudio(item.id, item.content)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={playingId === item.id ? 'Pausar áudio' : 'Reproduzir áudio'}
            >
              <Ionicons
                name={playingId === item.id ? 'pause-circle' : 'play-circle'}
                size={26}
                color={isMe ? '#fff' : '#FF6B35'}
              />
              <View style={styles.audioWave}>
                {[...Array(8)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.audioBar,
                      { height: 4 + Math.sin(i * 0.8) * 6 + 6 },
                      { backgroundColor: isMe ? 'rgba(255,255,255,0.7)' : 'rgba(255,107,53,0.7)' },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.audioDurText, isMe && { color: 'rgba(255,255,255,0.8)' }]}>
                {playingId === item.id ? 'Tocando…' : 'Áudio'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, isMe && styles.myMessageText]}>
              {item.content}
            </Text>
          )}
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

  const formatDuration = (secs: number) =>
    `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 44) }]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Conversa com ${userName}`}
        >
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
        <TouchableOpacity
          style={styles.headerAction}
          onPress={handleMoreOptions}
          accessibilityRole="button"
          accessibilityLabel="Mais opções: bloquear ou denunciar"
        >
          <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
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
              onPress={() => { if (hasMore && !loadingMore) loadMessages(page + 1, false); }}
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
              <Ionicons name="chatbubble-ellipses-outline" size={36} color="rgba(255,107,53,0.4)" />
            </View>
            <Text style={styles.emptyChatText}>Comece a conversa! Diga oi para {userName}</Text>
          </View>
        }
      />

      {/* Typing indicator */}
      <Animated.View style={[
        styles.typingContainer,
        { opacity: typingAnim, transform: [{ translateY: typingAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
      ]}>
        <Text style={styles.typingText}>{userName} está digitando...</Text>
        <View style={styles.typingDots}>
          {[1, 0.7, 0.4].map((op, i) => (
            <View key={i} style={[styles.typingDot, { opacity: op }]} />
          ))}
        </View>
      </Animated.View>

      {/* Recording overlay */}
      {isRecording && (
        <View style={styles.recordingOverlay}>
          <TouchableOpacity style={styles.cancelRecordBtn} onPress={cancelRecording}>
            <Ionicons name="trash-outline" size={20} color="#F87171" />
          </TouchableOpacity>
          <View style={styles.recordingInfo}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>{formatDuration(recordDuration)}</Text>
          </View>
          <Text style={styles.recordingHint}>Solte para enviar</Text>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom + 8, spacing.md) }]}>
        {!isRecording ? (
          <>
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
              <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} accessibilityLabel="Enviar mensagem">
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            ) : uploadingAudio ? (
              <View style={styles.micBtn}>
                <ActivityIndicator size="small" color="#FF6B35" />
              </View>
            ) : (
              <Animated.View style={{ transform: [{ scale: micPressAnim }] }}>
                <TouchableOpacity
                  style={styles.micBtn}
                  onLongPress={startRecording}
                  delayLongPress={200}
                  accessibilityLabel="Segure para gravar áudio"
                >
                  <Ionicons name="mic-outline" size={22} color="#FF6B35" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={styles.stopRecordBtn}
            onPress={stopRecording}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF4500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.stopRecordGradient}
            >
              <Ionicons name="stop" size={18} color="#fff" />
              <Text style={styles.stopRecordText}>Enviar</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingTop dinâmico via insets no JSX (notch/safe-area)
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerAvatar: { position: 'relative' },
  headerAvatarImg: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: 'rgba(255,107,53,0.4)',
  },
  headerOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.success, borderWidth: 2, borderColor: '#0A0A0F',
  },
  headerTitle: { fontSize: fontSize.md, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: fontSize.xs, color: colors.success, fontWeight: '500' },
  headerAction: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Messages ───────────────────────────────────────────────────────────────
  messageList: { padding: spacing.md, paddingBottom: spacing.sm, flexGrow: 1 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyChatIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  emptyChatText: { fontSize: fontSize.sm, color: colors.dark.secondaryText, textAlign: 'center' },
  timeStamp: {
    fontSize: 11, color: colors.dark.secondaryText,
    textAlign: 'center', marginVertical: spacing.sm,
  },
  messageBubble: {
    maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: 20, marginBottom: 4,
  },
  myMessage: {
    alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderBottomLeftRadius: 6,
  },
  messageText: { fontSize: fontSize.md, color: colors.dark.text, lineHeight: 22 },
  myMessageText: { color: '#fff' },
  messageFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 4, marginTop: 2,
  },
  messageTime: { fontSize: 10, color: colors.secondaryText },
  myMessageTime: { color: 'rgba(255,255,255,0.6)' },

  // ── Audio bubble ───────────────────────────────────────────────────────────
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioWave: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  audioBar: { width: 3, borderRadius: 2 },
  audioDurText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  // ── Typing ─────────────────────────────────────────────────────────────────
  typingContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 4, gap: spacing.xs,
  },
  typingText: { fontSize: fontSize.xs, color: colors.dark.secondaryText, fontStyle: 'italic' },
  typingDots: { flexDirection: 'row', gap: 3 },
  typingDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.dark.secondaryText },

  // ── Recording overlay ──────────────────────────────────────────────────────
  recordingOverlay: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    backgroundColor: '#0D0D1A',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    gap: spacing.md,
  },
  cancelRecordBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(248,113,113,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  recordingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#F87171',
  },
  recordingTime: { fontSize: 15, fontWeight: '700', color: '#fff' },
  recordingHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    backgroundColor: '#0D0D1A',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    gap: spacing.xs,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    paddingHorizontal: spacing.md, maxHeight: 100,
  },
  input: {
    fontSize: fontSize.md, color: colors.dark.text,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8, minHeight: 36,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FF6B35',
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
  micBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  stopRecordBtn: { flex: 1, borderRadius: borderRadius.md, overflow: 'hidden' },
  stopRecordGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12,
  },
  stopRecordText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  loadMoreBtn: {
    alignItems: 'center', paddingVertical: spacing.sm, marginBottom: spacing.sm,
  },
  loadMoreText: { fontSize: fontSize.xs, color: colors.dark.secondaryText, fontWeight: '500' },
});
