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
import { colors, radius, shadowSm, spacing, typography } from '../../../src/theme/theme';

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
        <ActivityIndicator size="large" color={colors.primary} />
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
        <Avatar name={data.name} photoUrl={data.photoUrl} size={84} />
        <Text style={styles.name}>{data.name}</Text>
        <Text style={styles.meta}>{format(new Date(data.birthDate), 'd MMMM yyyy', { locale: tr })}</Text>
      </View>

      {data.notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Not</Text>
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
        <Pressable style={({ pressed }) => [styles.editButton, pressed && styles.pressed]} onPress={() => setIsEditing(true)}>
          <Text style={styles.editButtonText}>Düzenle</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          onPress={confirmDelete}
          disabled={deleteMutation.isPending}
        >
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Pressable style={styles.photoPicker} onPress={handlePickPhoto}>
        <Avatar name={name} photoUrl={photoUrl} size={96} />
        <Text style={styles.photoLabel}>Fotoğrafı değiştir</Text>
      </Pressable>

      <View style={styles.card}>
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
        <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} multiline />
      </View>

      <View style={styles.actions}>
        <Pressable style={({ pressed }) => [styles.editButton, pressed && styles.pressed]} onPress={onCancel} disabled={isSaving}>
          <Text style={styles.editButtonText}>Vazgeç</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Kaydet</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  name: {
    ...typography.title,
    fontSize: 22,
  },
  meta: {
    ...typography.caption,
  },
  notesBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadowSm,
  },
  notesLabel: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notes: {
    color: colors.textPrimary,
    lineHeight: 20,
  },
  scanButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scanButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
  },
  deleteButtonText: {
    fontWeight: '700',
    color: colors.dangerDark,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: colors.primary,
    ...shadowSm,
  },
  saveButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
  photoPicker: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  photoLabel: {
    ...typography.caption,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  label: {
    ...typography.caption,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
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
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  doneButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorText: {
    color: colors.dangerDark,
  },
});
