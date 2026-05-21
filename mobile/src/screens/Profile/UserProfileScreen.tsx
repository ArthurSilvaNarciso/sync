import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { User, SPORTS, OBJECTIVES, AVAILABILITY, SportLevel } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'UserProfile'>;
  route: RouteProp<HomeStackParamList, 'UserProfile'>;
};

const levelLabels: Record<SportLevel, string> = {
  [SportLevel.BEGINNER]: 'Iniciante',
  [SportLevel.INTERMEDIATE]: 'Intermediario',
  [SportLevel.ADVANCED]: 'Avancado',
};

export default function UserProfileScreen({ navigation, route }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data } = await api.get(`/users/${route.params.userId}`);
      setUser(data);
    } catch (error) {
      console.log('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header com foto */}
      <View style={styles.header}>
        <Image
          source={
            user.avatarUrl
              ? { uri: user.avatarUrl }
              : require('../../assets/images/default-avatar.png')
          }
          style={styles.avatar}
        />
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{user.name}</Text>
        {user.city && (
          <Text style={styles.city}>
            <Ionicons name="location-outline" size={14} /> {user.city}
          </Text>
        )}

        {/* Bio */}
        {user.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre</Text>
            <Text style={styles.bio}>{user.bio}</Text>
          </View>
        )}

        {/* Esportes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Esportes</Text>
          <View style={styles.tags}>
            {user.sports?.map((s) => {
              const sport = SPORTS.find((sp) => sp.id === s);
              return (
                <View key={s} style={styles.tag}>
                  <Text style={styles.tagText}>{sport?.label || s}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Nivel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nivel</Text>
          <Text style={styles.value}>{levelLabels[user.level]}</Text>
        </View>

        {/* Disponibilidade */}
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

        {/* Objetivos */}
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
      </View>
    </ScrollView>
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
  },
  header: {
    height: 350,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  city: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
    marginTop: 4,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  bio: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
  value: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
});
