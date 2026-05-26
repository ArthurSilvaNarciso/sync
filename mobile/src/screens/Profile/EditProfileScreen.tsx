import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { SPORTS } from '../../types';
import { colors, fontSize, spacing } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import ScreenContainer from '../../components/layout/ScreenContainer';
import Input from '../../components/ui/Input';
import Chip from '../../components/ui/Chip';
import Button from '../../components/ui/Button';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;
};

const ACCENT = '#FF6B35';

/** Web-only: usa canvas para redimensionar a imagem para quadrado de `size`px e retornar data URL */
function resizeAvatarForWeb(uri: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('no window')); return; }
    const img = new (window as any).Image() as HTMLImageElement;
    img.onload = () => {
      const canvas = (window as any).document.createElement('canvas') as HTMLCanvasElement;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const ox = (img.naturalWidth - side) / 2;
      const oy = (img.naturalHeight - side) / 2;
      ctx.drawImage(img, ox, oy, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.55));
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = uri;
  });
}

export default function EditProfileScreen({ navigation }: Props) {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [sports, setSports] = useState<string[]>(user?.sports || []);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const toggleSport = (id: string) => {
    setSports((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const pickAvatar = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permissão negada', 'Libere o acesso à galeria para escolher uma foto.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,   // baixa qualidade para manter base64 pequeno
        base64: true,   // pede base64 direto (nativo)
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setUploadingAvatar(true);
      let avatarBase64: string;

      if (Platform.OS === 'web') {
        // Web: redimensiona via canvas para 300×300 e converte para data URL
        avatarBase64 = await resizeAvatarForWeb(asset.uri, 300);
      } else {
        // Native: ImagePicker já entrega base64 raw
        const mime = asset.mimeType || 'image/jpeg';
        avatarBase64 = `data:${mime};base64,${asset.base64}`;
      }

      const { data } = await api.post('/users/me/avatar', { avatarBase64 });
      setUser(data);
      Alert.alert('Foto atualizada!', 'Seu avatar foi salvo com sucesso.');
    } catch (error: any) {
      console.log('avatar upload error', error?.response?.data || error?.message);
      Alert.alert('Erro', error?.response?.data?.message || 'Não foi possível enviar a foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await api.put('/users/me', { name, bio, sports });
      setUser(data);
      Alert.alert('Sucesso', 'Perfil atualizado!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.centered}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Editar perfil</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Avatar uploader */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[ACCENT, '#FF5021']}
                  style={[styles.avatar, styles.avatarPlaceholder]}
                >
                  <Text style={styles.avatarInitial}>
                    {(name || 'S').charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.avatarEditBadge}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="camera" size={16} color={colors.white} />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Toque para trocar sua foto</Text>
          </View>

          <Input label="Nome" value={name} onChangeText={setName} />
          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Conte sobre voce..."
          />

          <Text style={styles.label}>Esportes</Text>
          <View style={styles.chips}>
            {SPORTS.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                selected={sports.includes(s.id)}
                onPress={() => toggleSport(s.id)}
              />
            ))}
          </View>

          <Button
            title="Salvar"
            onPress={handleSave}
            loading={loading}
            style={{ marginTop: spacing.lg, marginBottom: spacing.xxl }}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    alignItems: 'center',
  },
  centered: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  avatarSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: ACCENT,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.white,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  avatarHint: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.secondaryText,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
