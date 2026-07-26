import { useState } from 'react';
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
import { getNextBirthdayInfo, type Birthday, type CreateFriendInput, type Friend } from '@dogum-gunu/shared';
import { apiClient } from '../../src/api/client';
import { saveFaceProfile } from '../../src/faceMatch/db';
import { tryGetFaceEmbedding } from '../../src/faceMatch/faceMatch';
import { hasShownNotificationPrompt, markNotificationPromptShown } from '../../src/notifications/notificationPreference';
import { registerFcmToken, requestNotificationPermission } from '../../src/notifications/pushNotifications';

export default function NewFriendScreen() {
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
      Alert.alert('Kaydedilemedi', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.');
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
          const embedding = await embeddingPromise;
          if (embedding) {
            await saveFaceProfile(response.data.id, embedding);
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
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.photoPicker} onPress={handlePickPhoto}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>+</Text>
          </View>
        )}
        <Text style={styles.photoLabel}>Fotoğraf ekle</Text>
      </Pressable>

      <Text style={styles.label}>İsim</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ayşe Yılmaz" />

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
        multiline
      />

      <Pressable style={styles.button} onPress={handleSubmit} disabled={isPending}>
        {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kaydet</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 24,
    gap: 8,
  },
  photoPicker: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 32,
    color: '#999',
  },
  photoLabel: {
    fontSize: 13,
    color: '#444',
  },
  label: {
    fontSize: 13,
    color: '#444',
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    minHeight: 44,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateText: {
    fontSize: 15,
  },
  datePlaceholder: {
    fontSize: 15,
    color: '#999',
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  doneButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
