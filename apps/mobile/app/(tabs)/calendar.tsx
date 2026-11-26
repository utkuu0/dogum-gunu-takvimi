import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Calendar, type DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Birthday } from '@dogum-gunu/shared';
import { apiClient } from '../../src/api/client';
import { Avatar } from '../../src/components/Avatar';
import { GradientView } from '../../src/theme/GradientView';
import { radius, spacing, type Theme } from '../../src/theme/theme';
import { useTheme } from '../../src/theme/ThemeContext';
import '../../src/utils/calendarLocale';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });
  const [selectedDate, setSelectedDate] = useState(
    toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate())
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const { data } = await apiClient.get<Birthday[]>('/friends');
      return data;
    },
  });

  const markedDates = useMemo(() => {
    if (!data) return {};

    const marks: Record<string, { marked: true; dotColor: string }> = {};
    for (const friend of data) {
      const birth = new Date(friend.birthDate);
      if (birth.getMonth() + 1 !== visibleMonth.month) continue;

      const key = toDateKey(visibleMonth.year, visibleMonth.month, birth.getDate());
      marks[key] = { marked: true, dotColor: colors.accent };
    }
    return marks;
  }, [data, visibleMonth, colors.accent]);

  const selectedDayFriends = useMemo(() => {
    if (!data) return [];
    const [, monthStr, dayStr] = selectedDate.split('-');
    const month = Number(monthStr);
    const day = Number(dayStr);

    return data.filter((friend) => {
      const birth = new Date(friend.birthDate);
      return birth.getMonth() + 1 === month && birth.getDate() === day;
    });
  }, [data, selectedDate]);

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
        <Text style={styles.errorText}>Takvim yüklenemedi.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientView
        colors={[colors.primaryLight, colors.surface]}
        direction="vertical"
        style={styles.calendarCard}
      >
        <Calendar
          key={theme.isDark ? 'dark' : 'light'}
          current={selectedDate}
          onMonthChange={(month: DateData) =>
            setVisibleMonth({ year: month.year, month: month.month })
          }
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...(markedDates[selectedDate] ?? {}),
              selected: true,
              selectedColor: colors.secondary,
            },
          }}
          theme={{
            calendarBackground: 'transparent',
            dayTextColor: colors.textPrimary,
            textDisabledColor: colors.textMuted,
            selectedDayTextColor: colors.white,
            todayTextColor: colors.primary,
            arrowColor: colors.secondary,
            textMonthFontWeight: '900',
            textDayFontWeight: '700',
            textDayHeaderFontWeight: '800',
            selectedDayBackgroundColor: colors.secondary,
            dotColor: colors.accent,
            monthTextColor: colors.textPrimary,
            textSectionTitleColor: colors.textMuted,
          }}
        />
      </GradientView>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          {format(new Date(selectedDate), 'd MMMM', { locale: tr })}
        </Text>

        <FlatList
          data={selectedDayFriends}
          keyExtractor={(item) => item.friendId}
          contentContainerStyle={styles.panelList}
          ListEmptyComponent={
            <View style={styles.panelEmpty}>
              <Text style={styles.panelEmptyEmoji}>🎈</Text>
              <Text style={styles.emptyText}>Bu gün doğum günü olan yok.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.friendRow}
              onPress={() =>
                router.push({ pathname: '/friend/[id]', params: { id: item.friendId } })
              }
            >
              <Avatar name={item.name} photoUrl={item.photoUrl} size={38} />
              <Text style={styles.friendName}>{item.name}</Text>
              <Text style={styles.friendChevron}>›</Text>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}

const createStyles = ({ colors, typography, shadowSm }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      color: colors.dangerDark,
    },
    calendarCard: {
      margin: spacing.lg,
      marginBottom: 0,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      overflow: 'hidden',
      ...shadowSm,
    },
    panel: {
      flex: 1,
      padding: spacing.lg,
      paddingBottom: 110,
    },
    panelTitle: {
      ...typography.heading,
      marginBottom: spacing.sm,
    },
    panelList: {
      gap: spacing.xs,
      flexGrow: 1,
    },
    panelEmpty: {
      alignItems: 'center',
      paddingTop: spacing.xl,
      gap: spacing.xs,
    },
    panelEmptyEmoji: {
      fontSize: 30,
      marginBottom: spacing.xs,
    },
    emptyText: {
      color: colors.textMuted,
    },
    friendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
    },
    friendName: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    friendChevron: {
      color: colors.textMuted,
      fontSize: 20,
    },
  });
