import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Calendar, type DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Birthday } from '@dogum-gunu/shared';
import { apiClient } from '../../src/api/client';
import { Avatar } from '../../src/components/Avatar';
import '../../src/utils/calendarLocale';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export default function CalendarScreen() {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
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
      marks[key] = { marked: true, dotColor: '#2563eb' };
    }
    return marks;
  }, [data, visibleMonth]);

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
        <ActivityIndicator size="large" />
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
      <Calendar
        current={selectedDate}
        onMonthChange={(month: DateData) => setVisibleMonth({ year: month.year, month: month.month })}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markedDates={{
          ...markedDates,
          [selectedDate]: { ...(markedDates[selectedDate] ?? {}), selected: true, selectedColor: '#2563eb' },
        }}
        theme={{ todayTextColor: '#2563eb', arrowColor: '#2563eb' }}
      />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          {format(new Date(selectedDate), 'd MMMM', { locale: tr })}
        </Text>

        <FlatList
          data={selectedDayFriends}
          keyExtractor={(item) => item.friendId}
          contentContainerStyle={styles.panelList}
          ListEmptyComponent={<Text style={styles.emptyText}>Bu gün doğum günü olan yok.</Text>}
          renderItem={({ item }) => (
            <Link href={{ pathname: '/friend/[id]', params: { id: item.friendId } }} asChild>
              <Pressable style={styles.friendRow}>
                <Avatar name={item.name} photoUrl={item.photoUrl} size={36} />
                <Text style={styles.friendName}>{item.name}</Text>
              </Pressable>
            </Link>
          )}
        />
      </View>
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
  },
  errorText: {
    color: '#991b1b',
  },
  panel: {
    flex: 1,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  panelList: {
    gap: 8,
  },
  emptyText: {
    color: '#999',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  friendName: {
    fontSize: 15,
  },
});
