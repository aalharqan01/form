import { Share, View } from 'react-native';
import { ChevronRight, Download, RefreshCw } from 'lucide-react-native';
import { today } from '../../../lib/fitness';
import type { Training } from '../use-training';
import { useTheme, type ThemePreference } from '../theme';
import { Body, Credits, Press, Segmented, Sheet, T } from '../ui';
import type { Act } from './shared';

export function PreferencesSheet({
  open,
  onClose,
  training,
  act,
}: {
  open: boolean;
  onClose: () => void;
  training: Training;
  act: Act;
}) {
  const { theme, preference, setPreference } = useTheme();
  const item = (
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    onPress: () => void,
    disabled = false,
  ) => (
    <Press
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      scale={0.985}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 12,
        minHeight: 68,
        backgroundColor: theme.soft,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <T weight={500} size={14} line={18} color={theme.secondaryText}>
          {title}
        </T>
        <Body size={12} style={{ marginTop: 4 }}>
          {subtitle}
        </Body>
      </View>
      <ChevronRight size={17} color={theme.muted} />
    </Press>
  );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Preferences"
      description="Choose kg or lb for each exercise. Body weight has its own unit setting."
    >
      <View style={{ marginTop: 18, gap: 12 }}>
        <Body size={14}>Appearance</Body>
        <Segmented<ThemePreference>
          accessibilityLabel="Appearance"
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
          value={preference}
          onChange={setPreference}
        />
      </View>
      <View style={{ gap: 8, marginTop: 18 }}>
        {item(
          <Download size={21} color={theme.secondaryText} />,
          'Export your data',
          'Share a complete backup',
          () =>
            act(async () => {
              await Share.share({
                title: `form-backup-${today()}.json`,
                message: JSON.stringify(training.data, null, 2),
              });
            }),
          !training.loaded,
        )}
        {item(
          <RefreshCw size={21} color={theme.secondaryText} />,
          'Sync now',
          training.status,
          () => act(training.refresh, 'Refreshed.'),
        )}
      </View>
      <Body size={13} style={{ marginTop: 18 }}>
        Changes save on this device and sync automatically when Form is open and connected. Marketplace,
        packages and coaching payments live on the Form website.
      </Body>
      <Credits />
    </Sheet>
  );
}
