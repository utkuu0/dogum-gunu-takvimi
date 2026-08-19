import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Birthday } from '@dogum-gunu/shared';
import { apiClient } from '../../src/api/client';
import { Avatar } from '../../src/components/Avatar';
import { colors, radius, shadow, shadowSm, spacing, typography } from '../../src/theme/theme';

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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>😕</Text>
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
        ListHeaderComponent={
          data?.length ? (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>Yaklaşan Doğum Günleri</Text>
              <Text style={styles.listHeaderCount}>{data.length}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconEmoji}>🎈</Text>
            </View>
            <Text style={styles.emptyTitle}>Henüz arkadaş eklemedin</Text>
            <Text style={styles.emptyText}>İlk arkadaşını ekle, doğum gününü kaçırma.</Text>
            <Link href="/friend/new" asChild>
              <Pressable style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>+ İlk arkadaşını ekle</Text>
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
                <Avatar name={item.name} photoUrl={item.photoUrl} ring={isToday} />
                <View style={styles.cardTextGroup}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardMeta}>
                    {formattedDate} · {item.turningAge} yaşına giriyor
                  </Text>
                </View>
                <View style={[styles.badge, isToday && styles.badgeToday]}>
                  <Text style={[styles.badgeText, isToday && styles.badgeTextToday]}>
                    {isToday ? '🎉 Bugün' : `${item.daysUntil} gün`}
                  </Text>
                </View>
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
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  listHeaderTitle: {
    ...typography.heading,
  },
  listHeaderCount: {
    ...typography.caption,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyIconEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    ...typography.heading,
  },
  emptyText: {
    ...typography.caption,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    ...shadow,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },
  emptyButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  errorEmoji: {
    fontSize: 36,
  },
  errorText: {
    color: colors.dangerDark,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadowSm,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardToday: {
    backgroundColor: colors.accentLight,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  cardTextGroup: {
    flex: 1,
  },
  cardName: {
    ...typography.subheading,
  },
  cardMeta: {
    marginTop: 2,
    ...typography.caption,
  },
  badge: {
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  badgeToday: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  badgeTextToday: {
    color: colors.white,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  fabPressed: {
    backgroundColor: colors.primaryDark,
  },
  fabText: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 32,
  },
});
