import { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  getNextBirthdayInfo,
  type Birthday,
  type CreateFriendInput,
  type Friend,
} from '@dogum-gunu/shared';
import { apiClient } from '../../src/api/client';
import { saveFaceProfile } from '../../src/faceMatch/db';
import { tryGetFaceEmbedding } from '../../src/faceMatch/faceMatch';
import {
  hasShownNotificationPrompt,
  markNotificationPromptShown,
} from '../../src/notifications/notificationPreference';
import {
  registerFcmToken,
  requestNotificationPermission,
} from '../../src/notifications/pushNotifications';
import { radius, spacing, type Theme } from '../../src/theme/theme';
import { useTheme } from '../../src/theme/ThemeContext';

export default function NewFriendScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (input: CreateFriendInput) => apiClient.post<Friend>('/friends', input),
    onMutate: async (input) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['friends'] }),
        queryClient.cancelQueries({ queryKey: ['friends', 'upcoming'] }),
      ]);

      const previousAll = queryClient.getQueryData<Birthday[]>(['friends']);
      const previousUpcoming = queryClient.getQueryData<Birthday[]>(['friends', 'upcoming']);

      const info = getNextBirthdayInfo(input.birthDate);
      const optimisticEntry: Birthday = {
        friendId: `temp-${Date.now()}`,
        name: input.name,
        photoUrl: input.photoUrl ?? null,
        birthDate: input.birthDate,
        daysUntil: info.daysUntil,
        turningAge: info.turningAge,
      };

      const insertSorted = (list: Birthday[] = []) =>
        [...list, optimisticEntry].sort((a, b) => a.daysUntil - b.daysUntil);

      queryClient.setQueryData<Birthday[]>(['friends'], insertSorted(previousAll));
      queryClient.setQueryData<Birthday[]>(['friends', 'upcoming'], insertSorted(previousUpcoming));

      return { previousAll, previousUpcoming };
    },
    onError: (err, _input, context) => {
      if (context) {
        queryClient.setQueryData(['friends'], context.previousAll);
        queryClient.setQueryData(['friends', 'upcoming'], context.previousUpcoming);
      }
      Alert.alert(
        'Kaydedilemedi',
        err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.'
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'upcoming'] });
    },
  });

  function handlePickPhoto() {
    (async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('İzin gerekli', 'Fotoğraf seçebilmek için galeri erişim izni vermelisin.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets.length > 0) {
        setPhotoUrl(result.assets[0].uri);
      }
    })();
  }

  function handleDateChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selected) {
      setBirthDate(selected);
    }
  }

  function handleSubmit() {
    if (!name.trim() || !birthDate) {
      Alert.alert('Eksik bilgi', 'İsim ve doğum tarihi gerekli.');
      return;
    }

    // Embedding çıkarımı fotoğraf seçildiği anda arka planda başlar; kaydetme
    // ekrana dönmeyi beklemez, sunucudan gerçek friendId gelince (onSuccess) yazılır.
    const embeddingPromise = photoUrl ? tryGetFaceEmbedding(photoUrl) : Promise.resolve(null);

    router.back();
    mutate(
      {
        name: name.trim(),
        birthDate: birthDate.toISOString().slice(0, 10),
        notes: notes.trim() || null,
        photoUrl,
      },
      {
        onSuccess: async (response) => {
          try {
            const embedding = await embeddingPromise;
            if (embedding) {
              await saveFaceProfile(response.data.id, embedding);
            } else if (photoUrl) {
              Alert.alert(
                'Yüz bulunamadı',
                'Bu fotoğrafta yüz tespit edilemedi, o yüzden "Galeride bul" kullanılamaz. Arkadaşı düzenleyip net bir yüz fotoğrafı ekleyebilirsin.'
              );
            }
          } catch (err) {
            Alert.alert(
              'Yüz profili oluşturulamadı',
              err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.'
            );
          }

          const alreadyPrompted = await hasShownNotificationPrompt();
          if (!alreadyPrompted) {
            await markNotificationPromptShown();
            Alert.alert(
              'Doğum günlerini hatırlatalım mı?',
              'İzin verirsen arkadaşlarının doğum gününden bir gün ve bir hafta önce bildirim göndeririz.',
              [
                { text: 'Hayır', style: 'cancel' },
                {
                  text: 'Evet',
                  onPress: async () => {
                    const granted = await requestNotificationPermission();
                    if (granted) {
                      await registerFcmToken();
                    }
                  },
                },
              ]
            );
          }
        },
      }
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Pressable style={styles.photoPicker} onPress={handlePickPhoto}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>🎂</Text>
          </View>
        )}
        <Text style={styles.photoLabel}>Fotoğraf ekle</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.label}>İsim</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ayşe Yılmaz"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Doğum tarihi</Text>
        <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
          <Text style={birthDate ? styles.dateText : styles.datePlaceholder}>
            {birthDate ? format(birthDate, 'd MMMM yyyy', { locale: tr }) : 'Tarih seç'}
          </Text>
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={birthDate ?? new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            themeVariant={theme.isDark ? 'dark' : 'light'}
            onChange={handleDateChange}
          />
        )}
        {showPicker && Platform.OS === 'ios' && (
          <Pressable style={styles.doneButton} onPress={() => setShowPicker(false)}>
            <Text style={styles.doneButtonText}>Tamam</Text>
          </Pressable>
        )}

        <Text style={styles.label}>Not</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Sevdiği şeyler, hediye fikirleri..."
          placeholderTextColor={colors.textMuted}
          multiline
        />
      </View>

      <Pressable style={styles.buttonShadowWrap} onPress={handleSubmit} disabled={isPending}>
        <View style={styles.button}>
          {isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Kaydet</Text>
          )}
        </View>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = ({ colors, typography, shadow }: Theme) =>
  StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
    },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    photoPicker: {
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    photoPreview: {
      width: 104,
      height: 104,
      borderRadius: radius.full,
      borderWidth: 3,
      borderColor: colors.accent,
    },
    photoPlaceholder: {
      width: 104,
      height: 104,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    photoPlaceholderText: {
      fontSize: 36,
    },
    photoLabel: {
      ...typography.caption,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: 4,
    },
    label: {
      ...typography.caption,
      marginTop: spacing.md,
      marginBottom: 4,
    },
    input: {
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      justifyContent: 'center',
      minHeight: 46,
      fontSize: 15,
      color: colors.textPrimary,
    },
    notesInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    dateText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    datePlaceholder: {
      fontSize: 15,
      color: colors.textMuted,
    },
    doneButton: {
      alignSelf: 'flex-end',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    doneButtonText: {
      color: colors.primary,
      fontWeight: '800',
    },
    buttonShadowWrap: {
      marginTop: spacing.xl,
      borderRadius: radius.full,
      ...shadow,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 17,
      borderRadius: radius.full,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.white,
      fontWeight: '800',
      fontSize: 16,
    },
  });
