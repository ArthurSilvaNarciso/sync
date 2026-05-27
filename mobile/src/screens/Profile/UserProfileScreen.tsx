import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeStackParamList } from '../../navigation/types';
import { User, SPORTS, OBJECTIVES, AVAILABILITY, SportLevel } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { showToast } from '../../components/ui/Toast';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any, any>;
};

const levelLabels: Record<string, string> = {
  [SportLevel.BEGINNER]: 'Iniciante',
  [SportLevel.INTERMEDIATE]: 'Intermediário',
  [SportLevel.ADVANCED]: 'Avançado',
};

const levelColors: Record<string, string> = {
  [SportLevel.BEGINNER]: '#4ADE80',
  [SportLevel.INTERMEDIATE]: '#FB923C',
  [SportLevel.ADVANCED]: '#F87171',
};

export default function UserProfileScreen({ navigation, route }: Props) {
  const { userId } = route.params as { userId: string };
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const { data } = await api.get(`/users/${userId}`);
      setUser(data);
    } catch {
      showToast('Erro ao carregar perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMoreOptions = () => {
    Alert.alert(
      'Opções',
      undefined,
      [
        {
          text: 'Bloquear usuário',
          style: 'destructive',
          onPress: confirmBlock,
        },
        {
          text: 'Denunciar usuário',
          style: 'destructive',
          onPress: handleReport,
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  };

  const confirmBlock = () => {
    Alert.alert(
      'Bloquear usuário?',
      `Você não verá mais ${user?.name || 'este usuário'} no app e eles não poderão te contatar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            setBlocking(true);
            try {
              await api.post(`/users/${userId}/block`);
              showToast('Usuário bloqueado', 'success');
              navigation.goBack();
            } catch {
              showToast('Erro ao bloquear usuário', 'error');
            } finally {
              setBlocking(false);
            }
          },
        },
      ],
    );
  };

  const handleReport = () => {
    Alert.alert(
      'Denunciar usuário',
      'Qual é o motivo da denúncia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Spam ou fraude',
          onPress: () => submitReport('spam'),
        },
        {
          text: 'Conteúdo inadequado',
          onPress: () => submitReport('inappropriate'),
        },
        {
          text: 'Assédio',
          onPress: () => submitReport('harassment'),
        },
      ],
    );
  };

  const submitReport = async (reason: string) => {
    try {
      await api.post(`/users/${userId}/report`, { reason });
      showToast('Denúncia enviada. Obrigado!', 'success');
    } catch {
      showToast('Erro ao enviar denúncia', 'error');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color={colors.dark.secondaryText} />
        <Text style={styles.errorText}>Perfil não encontrado</Text>
        <TouchableOpacity style={styles.backBtnFallback} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const levelColor = levelColors[user.level] || colors.primary;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* Hero photo */}
        <View style={styles.heroWrap}>
          <Image
            source={
              user.avatarUrl
                ? { uri: user.avatarUrl }
                : require('../../assets/images/default-avatar.png')
            }
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Gradient overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.35)', 'rgba(10,10,15,0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroOverlay}
          />

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>

          {/* More / block-report */}
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={handleMoreOptions}
            disabled={blocking}
          >
            {blocking
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Ionicons name="ellipsis-vertical" size={20} color={colors.white} />
            }
          </TouchableOpacity>

          {/* Name overlay */}
          <View style={styles.heroNameWrap}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName} numberOfLines={1}>{user.name}</Text>
              {user.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              )}
              {user.subscriptionTier && user.subscriptionTier !== 'free' && (
                <View style={[
                  styles.tierBadge,
                  user.subscriptionTier === 'atleta_pro' && styles.tierBadgePro,
                ]}>
                  <Ionicons
                    name={user.subscriptionTier === 'atleta_pro' ? 'trophy' : 'star'}
                    size={10}
                    color="#fff"
                  />
                </View>
              )}
            </View>
            {user.city && (
              <View style={styles.heroLocation}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroCity} numberOfLines={1}>{user.city}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>

          {/* Badges row */}
          <View style={styles.badgesRow}>
            {user.level && (
              <View style={[styles.levelBadge, { borderColor: levelColor + '50', backgroundColor: levelColor + '12' }]}>
                <Ionicons name="trophy-outline" size={14} color={levelColor} />
                <Text style={[styles.levelText, { color: levelColor }]}>
                  {levelLabels[user.level] || user.level}
                </Text>
              </View>
            )}
            {user.isVerified && (
              <View style={styles.verifiedRowBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                <Text style={styles.verifiedRowText}>Verificado</Text>
              </View>
            )}
            {user.subscriptionTier === 'premium' && (
              <View style={styles.premiumRowBadge}>
                <Ionicons name="star" size={13} color="#FCD34D" />
                <Text style={styles.premiumRowText}>Premium</Text>
              </View>
            )}
            {user.subscriptionTier === 'atleta_pro' && (
              <View style={styles.proRowBadge}>
                <Ionicons name="trophy" size={13} color="#A78BFA" />
                <Text style={styles.proRowText}>Atleta Pro</Text>
              </View>
            )}
          </View>

          {/* Challenge button */}
          <TouchableOpacity
            style={styles.challengeBtn}
            onPress={() => navigation.navigate('Challenges')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF4500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.challengeBtnGradient}
            >
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.challengeBtnText}>Desafiar {user.name.split(' ')[0]}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Bio */}
          {user.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre</Text>
              <Text style={styles.bio}>{user.bio}</Text>
            </View>
          )}

          {/* Sports */}
          {user.sports && user.sports.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Esportes</Text>
              <View style={styles.tags}>
                {user.sports.map((s) => {
                  const sport = SPORTS.find((sp) => sp.id === s);
                  return (
                    <View key={s} style={styles.tag}>
                      <Text style={styles.tagText}>{sport?.label || s}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Availability */}
          {user.availability && user.availability.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Disponibilidade</Text>
              <View style={styles.tags}>
                {user.availability.map((a) => {
                  const item = AVAILABILITY.find((av) => av.id === a);
                  return (
                    <View key={a} style={styles.tag}>
                      <Text style={styles.tagText}>{item?.label || a}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Objectives */}
          {user.objectives && user.objectives.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Objetivos</Text>
              <View style={styles.tags}>
                {user.objectives.map((o) => {
                  const obj = OBJECTIVES.find((ob) => ob.id === o);
                  return (
                    <View key={o} style={styles.tag}>
                      <Text style={styles.tagText}>{obj?.label || o}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#0A0A0F',
  },
  errorText: { color: colors.dark.secondaryText, fontSize: fontSize.md },
  backBtnFallback: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    backgroundColor: colors.primary, borderRadius: borderRadius.md, marginTop: spacing.md,
  },
  backBtnText: { color: colors.white, fontWeight: '700' },
  heroWrap: { height: 380, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: spacing.lg,
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(10,10,15,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  moreBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    right: spacing.lg,
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(10,10,15,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroNameWrap: {
    position: 'absolute', bottom: spacing.lg, left: spacing.lg, right: spacing.lg,
  },
  heroName: {
    fontSize: 28, fontWeight: '800', color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  heroLocation: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
  },
  heroCity: {
    fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  content: { padding: spacing.lg },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center',
  },
  tierBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FF6B35',
    justifyContent: 'center', alignItems: 'center',
  },
  tierBadgePro: { backgroundColor: '#7C3AED' },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, borderWidth: 1,
  },
  levelText: { fontSize: fontSize.sm, fontWeight: '700' },
  verifiedRowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.30)',
  },
  verifiedRowText: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
  premiumRowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(252,211,77,0.12)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(252,211,77,0.30)',
  },
  premiumRowText: { fontSize: 11, fontWeight: '700', color: '#FCD34D' },
  proRowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(167,139,250,0.30)',
  },
  proRowText: { fontSize: 11, fontWeight: '700', color: '#A78BFA' },

  challengeBtn: { borderRadius: borderRadius.md, overflow: 'hidden', marginBottom: spacing.lg },
  challengeBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13,
  },
  challengeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: spacing.sm,
  },
  bio: { fontSize: fontSize.md, color: 'rgba(255,255,255,0.80)', lineHeight: 24 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    backgroundColor: 'rgba(255,107,53,0.14)',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.30)',
  },
  tagText: { fontSize: fontSize.sm, color: '#FF9A5C', fontWeight: '600' },
});
