import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Birthday } from '@dogum-gunu/shared';
import { apiClient } from '../../src/api/client';
import { Avatar } from '../../src/components/Avatar';

export default function UpcomingBirthdaysScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['friends', 'upcoming'],
    queryFn: async () => {
      const { data } = await apiClient.get<Birthday[]>('/friends/upcoming');
      return data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Yaklaşan doğum günleri yüklenemedi.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.friendId}
        onRefresh={refetch}
        refreshing={isRefetching}
        contentContainerStyle={data?.length ? styles.list : styles.emptyList}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Henüz arkadaş eklemedin.</Text>
            <Link href="/friend/new" asChild>
              <Pressable style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>İlk arkadaşını ekle</Text>
              </Pressable>
            </Link>
          </View>
        }
        renderItem={({ item }) => {
          const isToday = item.daysUntil === 0;
          const formattedDate = format(new Date(item.birthDate), 'd MMMM', { locale: tr });

          return (
            <Link href={{ pathname: '/friend/[id]', params: { id: item.friendId } }} asChild>
              <Pressable style={[styles.card, isToday && styles.cardToday]}>
                <Avatar name={item.name} photoUrl={item.photoUrl} />
                <View style={styles.cardTextGroup}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardMeta}>
                    {formattedDate} · {item.turningAge} yaşına giriyor
                  </Text>
                </View>
                <Text style={[styles.badge, isToday && styles.badgeToday]}>
                  {isToday ? '🎉 Bugün!' : `${item.daysUntil} gün`}
                </Text>
              </Pressable>
            </Link>
          );
        }}
      />

      <Link href="/friend/new" asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyText: {
    color: '#666',
  },
  emptyButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  errorText: {
    color: '#991b1b',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
  },
  cardToday: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  cardTextGroup: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 2,
    color: '#666',
    fontSize: 13,
  },
  badge: {
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
  },
  badgeToday: {
    color: '#92400e',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
  },
});
