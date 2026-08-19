import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { Avatar } from '../../src/components/Avatar';
import { getMatchThreshold, setMatchThreshold } from '../../src/faceMatch/settings';
import { areNotificationsEnabled } from '../../src/notifications/notificationPreference';
import { registerFcmToken, requestNotificationPermission, unregisterFcmToken } from '../../src/notifications/pushNotifications';
import { colors, radius, shadowSm, spacing, typography } from '../../src/theme/theme';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [threshold, setThreshold] = useState('');
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [togglingNotifications, setTogglingNotifications] = useState(false);

  useEffect(() => {
    getMatchThreshold().then((value) => setThreshold(String(value)));
    areNotificationsEnabled().then(setNotificationsEnabledState);
  }, []);

  function handleThresholdChange(value: string) {
    setThreshold(value);
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1) {
      setMatchThreshold(parsed);
    }
  }

  async function handleNotificationsToggle(value: boolean) {
    setTogglingNotifications(true);
    try {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            'İzin verilmedi',
            'Bildirim gönderebilmemiz için cihaz ayarlarından bildirim iznini açman gerekiyor.'
          );
          return;
        }
        await registerFcmToken();
        setNotificationsEnabledState(true);
      } else {
        await unregisterFcmToken();
        setNotificationsEnabledState(false);
      }
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bildirim ayarı güncellenemedi.');
    } finally {
      setTogglingNotifications(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {user && (
        <View style={styles.profileCard}>
          <View style={styles.profileRingWrap}>
            <Avatar name={user.name} size={60} />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>
      )}

      <View style={styles.groupHeader}>
        <Text style={styles.groupEmoji}>🔔</Text>
        <Text style={styles.groupLabel}>Bildirimler</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.sectionTitle}>Doğum günü bildirimleri</Text>
            <Text style={styles.sectionHint}>
              Yarın ve 1 hafta sonra doğum günü olan arkadaşların için hatırlatma al.
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            disabled={togglingNotifications}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <View style={styles.groupHeader}>
        <Text style={styles.groupEmoji}>🎯</Text>
        <Text style={styles.groupLabel}>Yüz Tanıma</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Galeride bul eşik değeri</Text>
        <Text style={styles.sectionHint}>
          0 ile 1 arası — yükseltmek daha az ama daha kesin eşleşme, düşürmek daha çok ama daha az kesin eşleşme
          verir.
        </Text>
        <TextInput
          style={styles.input}
          value={threshold}
          onChangeText={handleThresholdChange}
          keyboardType="decimal-pad"
        />
      </View>

      <Pressable style={styles.signOutButton} onPress={() => signOut()}>
        <Text style={styles.signOutText}>👋 Çıkış Yap</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 130,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadowSm,
  },
  profileRingWrap: {
    padding: 3,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  profileText: {
    flex: 1,
  },
  name: {
    ...typography.heading,
  },
  email: {
    ...typography.caption,
    marginTop: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  groupEmoji: {
    fontSize: 14,
  },
  groupLabel: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadowSm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.subheading,
    marginBottom: 4,
  },
  sectionHint: {
    ...typography.caption,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    width: 100,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  signOutButton: {
    backgroundColor: colors.dangerLight,
    paddingVertical: 15,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.dangerDark,
    fontWeight: '800',
  },
});
