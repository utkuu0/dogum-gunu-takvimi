import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: 'center' }}>
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Takvim' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ayarlar' }} />
    </Tabs>
  );
}
