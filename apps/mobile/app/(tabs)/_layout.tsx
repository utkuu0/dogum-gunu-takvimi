import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { GradientView } from '../../src/theme/GradientView';
import { radius, type Theme } from '../../src/theme/theme';
import { useTheme } from '../../src/theme/ThemeContext';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'center',
        headerBackground: () => (
          <GradientView
            colors={[colors.secondaryLight, colors.primaryLight, colors.accentLight]}
            style={styles.headerGradient}
          />
        ),
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '900', color: colors.textPrimary, fontSize: 19 },
        sceneStyle: { backgroundColor: colors.background },
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Takvim',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const createStyles = ({ colors, shadow }: Theme) =>
  StyleSheet.create({
    headerGradient: {
      flex: 1,
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
    },
    tabBar: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 22,
      height: 64,
      paddingTop: 0,
      paddingBottom: 0,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderTopWidth: 0,
      ...shadow,
    },
    tabBarItem: {
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapFocused: {
      backgroundColor: colors.primaryLight,
    },
  });
