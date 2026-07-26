import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Birthday, Friend, UpdateFriendInput } from '@dogum-gunu/shared';
import { apiClient } from '../../../src/api/client';
import { Avatar } from '../../../src/components/Avatar';
import { deleteFaceProfile, getFaceProfile, saveFaceProfile } from '../../../src/faceMatch/db';
import { tryGetFaceEmbedding } from '../../../src/faceMatch/faceMatch';

export default function FriendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['friends', 'detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Friend>(`/friends/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  const { data: hasFaceProfile } = useQuery({
    queryKey: ['faceProfile', id],
    queryFn: async () => (await getFaceProfile(id)) !== null,
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateFriendInput) => apiClient.patch(`/friends/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      setIsEditing(false);
    },
    onError: (err) => {
      Alert.alert('Güncellenemedi', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/friends/${id}`),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['friends'] }),
        queryClient.cancelQueries({ queryKey: ['friends', 'upcoming'] }),
      ]);

      const previousAll = queryClient.getQueryData<Birthday[]>(['friends']);
      const previousUpcoming = queryClient.getQueryData<Birthday[]>(['friends', 'upcoming']);

      const remove = (list?: Birthday[]) => list?.filter((friend) => friend.friendId !== id);
      queryClient.setQueryData<Birthday[] | undefined>(['friends'], remove(previousAll));
      queryClient.setQueryData<Birthday[] | undefined>(['friends', 'upcoming'], remove(previousUpcoming));

      return { previousAll, previousUpcoming };
    },
    onError: (err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(['friends'], context.previousAll);
        queryClient.setQueryData(['friends', 'upcoming'], context.previousUpcoming);
      }
      Alert.alert('Silinemedi', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'upcoming'] });
      void deleteFaceProfile(id);
    },
  });

  function confirmDelete() {
    Alert.alert('Arkadaşı sil', `${data?.name} silinsin mi? Bu işlem geri alınamaz.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteMutation.mutate();
        },
      },
    ]);
  }

  function handleSave(input: UpdateFriendInput, photoChanged: boolean) {
    updateMutation.mutate(input);
    if (photoChanged) {
      (async () => {
        const embedding = input.photoUrl ? await tryGetFaceEmbedding(input.photoUrl) : null;
        if (embedding) {
          await saveFaceProfile(id, embedding);
        } else {
          await deleteFaceProfile(id);
        }
        queryClient.invalidateQueries({ queryKey: ['faceProfile', id] });
      })();
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Arkadaş bulunamadı.</Text>
      </View>
    );
  }

  if (isEditing) {
    return (
      <EditFriendForm
        friend={data}
        isSaving={updateMutation.isPending}
        onCancel={() => setIsEditing(false)}
        onSave={handleSave}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar name={data.name} photoUrl={data.photoUrl} size={72} />
        <Text style={styles.name}>{data.name}</Text>
        <Text style={styles.meta}>{format(new Date(data.birthDate), 'd MMMM yyyy', { locale: tr })}</Text>
      </View>

      {data.notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notes}>{data.notes}</Text>
        </View>
      )}

      {hasFaceProfile && (
        <Link href={{ pathname: '/friend/[id]/scan', params: { id } }} asChild>
          <Pressable style={styles.scanButton}>
            <Text style={styles.scanButtonText}>📷 Galeride bul</Text>
          </Pressable>
        </Link>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.editButton} onPress={() => setIsEditing(true)}>
          <Text style={styles.editButtonText}>Düzenle</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={confirmDelete} disabled={deleteMutation.isPending}>
          <Text style={styles.deleteButtonText}>Sil</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface EditFriendFormProps {
  friend: Friend;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (input: UpdateFriendInput, photoChanged: boolean) => void;
}

function EditFriendForm({ friend, isSaving, onCancel, onSave }: EditFriendFormProps) {
  const [name, setName] = useState(friend.name);
  const [birthDate, setBirthDate] = useState(new Date(friend.birthDate));
  const [notes, setNotes] = useState(friend.notes ?? '');
  const [photoUrl, setPhotoUrl] = useState(friend.photoUrl);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

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
        setPhotoChanged(true);
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

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Eksik bilgi', 'İsim gerekli.');
      return;
    }
    onSave(
      {
        name: name.trim(),
        birthDate: birthDate.toISOString().slice(0, 10),
        notes: notes.trim() || null,
        photoUrl,
      },
      photoChanged
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.photoPicker} onPress={handlePickPhoto}>
        <Avatar name={name} photoUrl={photoUrl} size={96} />
        <Text style={styles.photoLabel}>Fotoğrafı değiştir</Text>
      </Pressable>

      <Text style={styles.label}>İsim</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Doğum tarihi</Text>
      <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateText}>{format(birthDate, 'd MMMM yyyy', { locale: tr })}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={birthDate}
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
        multiline
      />

      <View style={styles.actions}>
        <Pressable style={styles.editButton} onPress={onCancel} disabled={isSaving}>
          <Text style={styles.editButtonText}>Vazgeç</Text>
        </Pressable>
        <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Kaydet</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  meta: {
    color: '#666',
  },
  notesBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  notes: {
    color: '#333',
  },
  scanButton: {
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  scanButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#eee',
  },
  editButtonText: {
    fontWeight: '700',
    color: '#333',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    fontWeight: '700',
    color: '#991b1b',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  saveButtonText: {
    fontWeight: '700',
    color: '#fff',
  },
  photoPicker: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  doneButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  errorText: {
    color: '#991b1b',
  },
});
