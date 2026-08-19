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
              <Text style={styles.listHeaderTitle}>Yaklaşanlar</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{data.length}</Text>
              </View>
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
        renderItem={({ item, index }) => {
          const isToday = item.daysUntil === 0;
          const formattedDate = format(new Date(item.birthDate), 'd MMMM', { locale: tr });
          const stripeColor = STRIPE_COLORS[index % STRIPE_COLORS.length];

          return (
            <Link href={{ pathname: '/friend/[id]', params: { id: item.friendId } }} asChild>
              <Pressable style={[styles.card, isToday && styles.cardToday]}>
                <View style={[styles.stripe, { backgroundColor: isToday ? colors.accent : stripeColor }]} />
                <Avatar name={item.name} photoUrl={item.photoUrl} ring={isToday} />
                <View style={styles.cardTextGroup}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardMeta}>
                    {formattedDate} · {item.turningAge} yaşına giriyor
                  </Text>
                </View>
                <View style={[styles.badge, isToday && styles.badgeToday]}>
                  <Text style={[styles.badgeText, isToday && styles.badgeTextToday]}>
                    {isToday ? 'Bugün' : `${item.daysUntil} gün`}
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

const STRIPE_COLORS = [colors.primary, colors.secondary, colors.accent];

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
    paddingBottom: 120,
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
    ...typography.title,
    fontSize: 22,
  },
  countPill: {
    backgroundColor: colors.secondary,
    minWidth: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  countPillText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyIconEmoji: {
    fontSize: 44,
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
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    ...shadow,
  },
  emptyButtonText: {
    color: colors.white,
    fontWeight: '800',
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
    overflow: 'hidden',
    ...shadowSm,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  cardToday: {
    backgroundColor: colors.accentLight,
  },
  cardTextGroup: {
    flex: 1,
    marginLeft: spacing.xs,
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
    fontWeight: '800',
  },
  badgeTextToday: {
    color: colors.white,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 104,
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    ...shadow,
  },
  fabText: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 32,
  },
});
