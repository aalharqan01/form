import { Share, View } from 'react-native';
import { ChevronRight, Download, RefreshCw } from 'lucide-react-native';
import { today } from '../../../lib/fitness';
import type { Training } from '../use-training';
import { useTheme, type ThemePreference } from '../theme';
import { useI18n } from '../i18n';
import type { LanguagePreference } from '../../../lib/i18n';
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
  const { t, preference: language, setPreference: setLanguage } = useI18n();
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
      title={t('prefs.title')}
      description={t('prefs.description')}
    >
      <View style={{ marginTop: 18, gap: 12 }}>
        <Body size={14}>{t('prefs.language')}</Body>
        <Segmented<LanguagePreference>
          accessibilityLabel={t('prefs.language')}
          options={[
            { value: 'system', label: t('prefs.languageSystem') },
            { value: 'en', label: t('prefs.english') },
            { value: 'ar', label: t('prefs.arabic') },
          ]}
          value={language}
          onChange={setLanguage}
        />
      </View>
      <View style={{ marginTop: 18, gap: 12 }}>
        <Body size={14}>{t('prefs.appearance')}</Body>
        <Segmented<ThemePreference>
          accessibilityLabel={t('prefs.appearance')}
          options={[
            { value: 'light', label: t('prefs.light') },
            { value: 'dark', label: t('prefs.dark') },
            { value: 'system', label: t('prefs.system') },
          ]}
          value={preference}
          onChange={setPreference}
        />
      </View>
      <View style={{ gap: 8, marginTop: 18 }}>
        {item(
          <Download size={21} color={theme.secondaryText} />,
          t('prefs.export'),
          t('prefs.exportHint'),
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
          t('prefs.sync'),
          training.status,
          () => act(training.refresh, t('prefs.refreshed')),
        )}
      </View>
      <Body size={13} style={{ marginTop: 18 }}>
        {t('prefs.note')}
      </Body>
      <Credits />
    </Sheet>
  );
}
