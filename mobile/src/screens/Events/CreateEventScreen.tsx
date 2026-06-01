import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MapStackParamList } from '../../navigation/types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import { SPORTS } from '../../types';
import { getCurrentLocation } from '../../services/location.service';
import * as ExpoLocation from 'expo-location';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<MapStackParamList, 'CreateEvent'>;
};

export default function CreateEventScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [loading, setLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');

  const handleCreate = async () => {
    if (!title || !sport) {
      Alert.alert('Erro', 'Preencha o nome e selecione um esporte');
      return;
    }
    if (!date) {
      Alert.alert('Erro', 'Informe a data do evento');
      return;
    }

    setLoading(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      if (useCurrentLocation) {
        try {
          const coords = await getCurrentLocation();
          lat = coords.latitude;
          lng = coords.longitude;
        } catch (e: any) {
          Alert.alert('Localização indisponível', e?.message || 'Não foi possível pegar sua localização agora. Tente novamente ou desative a opção.');
          setLoading(false);
          return;
        }
      }

      if (lat == null || lng == null) {
        Alert.alert('Localização', 'Defina a localização do evento.');
        setLoading(false);
        return;
      }

      const dateStr = time ? `${date}T${time}:00` : `${date}T08:00:00`;

      await api.post('/events', {
        title,
        description,
        sport,
        date: new Date(dateStr).toISOString(),
        latitude: lat,
        longitude: lng,
        address,
        maxParticipants: parseInt(maxParticipants, 10),
      });
      Alert.alert('Sucesso', 'Evento criado!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao criar evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
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
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Novo evento</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Input
            label="Nome do evento"
            placeholder="Ex: Corrida no parque"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Esporte</Text>
          <View style={styles.chips}>
            {SPORTS.slice(0, 8).map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                selected={sport === s.id}
                onPress={() => setSport(s.id)}
              />
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Data"
                placeholder="2026-04-15"
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Hora"
                placeholder="08:00"
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>

          <Input
            label="Local"
            placeholder="Endereco ou nome do local"
            value={address}
            onChangeText={setAddress}
          />

          <TouchableOpacity
            style={styles.locationToggle}
            onPress={async () => {
              const next = !useCurrentLocation;
              setUseCurrentLocation(next);
              if (next) {
                setLocationLoading(true);
                setLocationLabel('');
                try {
                  const coords = await getCurrentLocation();
                  const geocodeResult = await ExpoLocation.reverseGeocodeAsync(coords).catch(() => []);
                  const geo = geocodeResult[0];
                  const city = geo?.city || geo?.subregion || '';
                  setLocationLabel(city ? `Localizacao: ${city}` : 'Localizacao obtida');
                } catch {
                  setLocationLabel('Localizacao obtida');
                } finally {
                  setLocationLoading(false);
                }
              } else {
                setLocationLabel('');
              }
            }}
          >
            <Ionicons
              name={useCurrentLocation ? 'checkbox' : 'square-outline'}
              size={22}
              color={colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationToggleText}>
                Usar minha localizacao atual
              </Text>
              {locationLoading && (
                <Text style={{ fontSize: 11, color: colors.secondaryText }}>Obtendo localização...</Text>
              )}
              {locationLabel ? (
                <Text style={{ fontSize: 11, color: colors.success }}>{locationLabel}</Text>
              ) : null}
            </View>
          </TouchableOpacity>

          <Input
            label="Descricao"
            placeholder="Detalhes do evento (opcional)"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Input
            label="Maximo de participantes"
            placeholder="10"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="number-pad"
          />

          <Button
            title="Criar evento"
            onPress={handleCreate}
            loading={loading}
            disabled={!title || !sport}
            style={styles.createBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 62 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  locationToggleText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
  },
  createBtn: {
    marginTop: spacing.lg,
  },
});
