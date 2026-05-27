import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, ActivityIndicator, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { colors, fontSize, spacing, borderRadius } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface SearchUser {
  id: string;
  name: string;
  avatarUrl?: string;
  city?: string;
  sports?: string[];
  level?: string;
}

export default function UserSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get('/users/search', { params: { q: q.trim() } });
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => search(text), 400);
  };

  const renderItem = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
      activeOpacity={0.7}
    >
      <Image
        source={
          item.avatarUrl
            ? { uri: item.avatarUrl }
            : require('../../assets/images/default-avatar.png')
        }
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.city ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={colors.dark.secondaryText} />
            <Text style={styles.metaText}>{item.city}</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.dark.secondaryText} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.dark.secondaryText} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar atletas..."
            placeholderTextColor={colors.dark.secondaryText}
            value={query}
            onChangeText={handleChangeText}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => search(query)}
            maxLength={60}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={colors.dark.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            searched ? (
              <View style={styles.empty}>
                <Ionicons name="person-outline" size={48} color={colors.primary + '40'} />
                <Text style={styles.emptyText}>Nenhum atleta encontrado</Text>
                <Text style={styles.emptyHint}>Tente outro nome ou cidade</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={48} color={colors.primary + '30'} />
                <Text style={styles.emptyText}>Busque por nome</Text>
                <Text style={styles.emptyHint}>Encontre atletas do Sync</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.md,
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
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.20)',
  },
  searchInput: {
    flex: 1,
    color: colors.dark.text,
    fontSize: fontSize.md,
    padding: 0,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: spacing.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.dark.surface,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: fontSize.xs, color: colors.dark.secondaryText },
  empty: { alignItems: 'center', marginTop: 80, gap: spacing.sm },
  emptyText: { color: colors.dark.text, fontSize: fontSize.md, fontWeight: '600' },
  emptyHint: { color: colors.dark.secondaryText, fontSize: fontSize.sm },
});
