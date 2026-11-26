import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Birthday } from '@dogum-gunu/shared';
import { apiClient } from '../../src/api/client';
import { Avatar } from '../../src/components/Avatar';
import { GradientView } from '../../src/theme/GradientView';
import { radius, spacing, type Theme } from '../../src/theme/theme';
import { useTheme } from '../../src/theme/ThemeContext';

export default function UpcomingBirthdaysScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const stripeColors = [colors.primary, colors.secondary, colors.accent];
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const { data } = await apiClient.get<Birthday[]>('/friends');
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
        <Text style={styles.errorText}>Doğum günleri yüklenemedi.</Text>
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
              <Text style={styles.listHeaderTitle}>Doğum günleri</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{data.length}</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <GradientView
              colors={[colors.primaryLight, colors.secondaryLight]}
              style={styles.emptyIconCircle}
            >
              <Text style={styles.emptyIconEmoji}>🎈</Text>
            </GradientView>
            <Text style={styles.emptyTitle}>Henüz arkadaş eklemedin</Text>
            <Text style={styles.emptyText}>İlk arkadaşını ekle, doğum gününü kaçırma.</Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push('/friend/new')}>
              <Text style={styles.emptyButtonText}>+ İlk arkadaşını ekle</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => {
          const isToday = item.daysUntil === 0;
          const formattedDate = format(new Date(item.birthDate), 'd MMMM', { locale: tr });
          const accentColor = isToday ? colors.accent : stripeColors[index % stripeColors.length];

          return (
            <Pressable
              style={[styles.card, isToday && styles.cardToday]}
              onPress={() =>
                router.push({ pathname: '/friend/[id]', params: { id: item.friendId } })
              }
            >
              <View style={[styles.stripe, { backgroundColor: accentColor }]} />
              <Avatar name={item.name} photoUrl={item.photoUrl} ring={isToday} />
              <View style={styles.cardTextGroup}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {formattedDate} · {item.turningAge} yaşına giriyor
                </Text>
              </View>
              <View style={[styles.badge, isToday && styles.badgeToday]}>
                <Text style={[styles.badgeNumber, isToday && styles.badgeTextToday]}>
                  {isToday ? '🎉' : item.daysUntil}
                </Text>
                <Text style={[styles.badgeLabel, isToday && styles.badgeTextToday]}>
                  {isToday ? 'Bugün' : 'gün'}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/friend/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const createStyles = ({ colors, typography, shadow, shadowSm }: Theme) =>
  StyleSheet.create({
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
      minWidth: 30,
      height: 30,
      borderRadius: radius.full,
      backgroundColor: colors.secondary,
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
      marginTop: spacing.sm,
      paddingVertical: 15,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
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
      minWidth: 56,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      alignItems: 'center',
    },
    badgeToday: {
      backgroundColor: colors.accent,
    },
    badgeNumber: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '900',
      color: colors.primary,
    },
    badgeLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
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
      borderWidth: 3,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow,
    },
    fabText: {
      color: colors.white,
      fontSize: 30,
      lineHeight: 32,
    },
  });
