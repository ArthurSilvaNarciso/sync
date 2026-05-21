// Tela de criar story: escolhe foto/vídeo + caption + sport + envia
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
  ActivityIndicator, Alert, Platform, ScrollView, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { storiesService } from '../../services/stories.service';
import { SPORTS } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { showToast } from '../../components/ui/Toast';

const ACCENT = '#FF6B35';

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateStoryScreen({ onClose, onSuccess }: Props) {
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video'; name?: string; mime?: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [sport, setSport] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickFromGallery = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão negada', 'Libere o acesso à galeria nas configurações.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    setMedia({
      uri: a.uri,
      type: a.type === 'video' ? 'video' : 'image',
      name: a.fileName || `story-${Date.now()}.${a.type === 'video' ? 'mp4' : 'jpg'}`,
      mime: a.mimeType || (a.type === 'video' ? 'video/mp4' : 'image/jpeg'),
    });
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      pickFromGallery();
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Libere o acesso à câmera nas configurações.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    setMedia({
      uri: a.uri,
      type: 'image',
      name: a.fileName || `story-${Date.now()}.jpg`,
      mime: 'image/jpeg',
    });
  };

  const handlePost = async () => {
    if (!media) {
      Alert.alert('Mídia', 'Adicione uma foto ou vídeo primeiro.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      if (Platform.OS === 'web') {
        const blob = await fetch(media.uri).then((r) => r.blob());
        form.append('media', new File([blob], media.name || 'story.jpg', { type: blob.type || media.mime }));
      } else {
        form.append('media', { uri: media.uri, name: media.name, type: media.mime } as any);
      }
      if (caption) form.append('caption', caption);
      if (sport) form.append('sport', sport);
      await storiesService.create(form);
      showToast('Story publicado!', 'success');
      onSuccess();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Erro ao publicar', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Novo Story</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Media preview / picker */}
        <View style={styles.mediaArea}>
          {media ? (
            <View style={styles.preview}>
              <Image source={{ uri: media.uri }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removeBtn} onPress={() => setMedia(null)}>
                <Ionicons name="trash" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={takePhoto} activeOpacity={0.7}>
                <Ionicons name="camera" size={32} color={ACCENT} />
                <Text style={styles.pickBtnText}>Câmera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickBtn} onPress={pickFromGallery} activeOpacity={0.7}>
                <Ionicons name="image" size={32} color={ACCENT} />
                <Text style={styles.pickBtnText}>Galeria</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Caption */}
        <Text style={styles.label}>Legenda</Text>
        <TextInput
          style={styles.captionInput}
          placeholder="Como foi o treino?"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={caption}
          onChangeText={setCaption}
          maxLength={200}
          multiline
        />
        <Text style={styles.counter}>{caption.length}/200</Text>

        {/* Sport */}
        <Text style={styles.label}>Esporte (opcional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportRow}>
          {SPORTS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sportChip, sport === s.id && styles.sportChipActive]}
              onPress={() => setSport(sport === s.id ? null : s.id)}
            >
              <Text style={[styles.sportChipText, sport === s.id && styles.sportChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* CTA */}
        <Pressable
          onPress={handlePost}
          disabled={!media || uploading}
          style={({ pressed }) => [
            styles.cta,
            (!media || uploading) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <LinearGradient
            colors={[ACCENT, '#FF4500']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.ctaInner}
          >
            {uploading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.ctaText}>Publicando…</Text>
              </>
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.ctaText}>Publicar story</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
        <Text style={styles.hint}>O story expira em 24h.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingBottom: spacing.xxl,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  closeBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  mediaArea: { marginBottom: spacing.lg },
  pickRow: { flexDirection: 'row', gap: spacing.md },
  pickBtn: {
    flex: 1, aspectRatio: 9/12,
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderWidth: 2, borderColor: 'rgba(255,107,53,0.3)', borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  pickBtnText: { color: ACCENT, fontWeight: '700', fontSize: 13 },
  preview: {
    aspectRatio: 9/16, borderRadius: borderRadius.lg, overflow: 'hidden',
    backgroundColor: '#000', position: 'relative',
  },
  previewImage: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  captionInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 12, color: '#fff', fontSize: 15,
    minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.border,
  },
  counter: {
    fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'right',
    marginTop: 4, marginBottom: spacing.lg,
  },
  sportRow: { gap: 8, paddingBottom: spacing.md },
  sportChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sportChipActive: { borderColor: ACCENT, backgroundColor: ACCENT + '20' },
  sportChipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  sportChipTextActive: { color: ACCENT, fontWeight: '800' },
  cta: {
    marginTop: spacing.lg, borderRadius: 14, overflow: 'hidden',
    shadowColor: ACCENT, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  ctaInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: spacing.sm },
});
