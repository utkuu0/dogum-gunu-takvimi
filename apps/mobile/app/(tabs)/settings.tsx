import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { getMatchThreshold, setMatchThreshold } from '../../src/faceMatch/settings';
import { areNotificationsEnabled } from '../../src/notifications/notificationPreference';
import { registerFcmToken, requestNotificationPermission, unregisterFcmToken } from '../../src/notifications/pushNotifications';

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
    <View style={styles.container}>
      {user && (
        <View style={styles.profile}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.sectionTitle}>Doğum günü bildirimleri</Text>
          <Text style={styles.sectionHint}>Yarın ve 1 hafta sonra doğum günü olan arkadaşların için hatırlatma al.</Text>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={handleNotificationsToggle}
          disabled={togglingNotifications}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Galeride bul eşik değeri</Text>
        <Text style={styles.sectionHint}>
          0 ile 1 arası — yükseltmek daha az ama daha kesin eşleşme, düşürmek daha çok ama daha az kesin eşleşme verir.
        </Text>
        <TextInput
          style={styles.input}
          value={threshold}
          onChangeText={handleThresholdChange}
          keyboardType="decimal-pad"
        />
      </View>

      <Pressable style={styles.signOutButton} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Çıkış Yap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  profile: {
    marginBottom: 32,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
  },
  email: {
    color: '#666',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 100,
  },
  signOutButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutText: {
    color: '#991b1b',
    fontWeight: '700',
  },
});
