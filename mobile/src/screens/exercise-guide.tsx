import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import {
  exerciseDetail,
  exerciseFrames,
  EXERCISE_SOURCE,
  GUIDES_FREE,
} from '../../../lib/exercises';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { Body, Chip, Sheet, T } from '../ui';

/**
 * How to do an exercise: the two photo frames of the movement played back and
 * forth, the muscles it works, and the steps. Free today; `GUIDES_FREE` is the
 * switch for a premium tier later.
 */
export function ExerciseGuideSheet({
  name,
  onClose,
}: {
  name: string | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const detail = name ? exerciseDetail(name) : null;
  const frames = name ? exerciseFrames(name) : [];
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!name || frames.length < 2 || !GUIDES_FREE) return;
    setFrame(0);
    const timer = setInterval(
      () => setFrame((f) => (f + 1) % frames.length),
      900,
    );
    return () => clearInterval(timer);
  }, [name, frames.length]);
  const muscles = detail
    ? [...new Set([...detail.primary, ...detail.secondary])]
    : [];
  return (
    <Sheet
      open={!!name}
      onClose={onClose}
      title={name ?? ''}
      description={
        detail
          ? `${detail.equipment} · ${detail.level}${detail.mechanic ? ` · ${detail.mechanic}` : ''}`
          : t('guide.none')
      }
    >
      {frames.length > 0 && GUIDES_FREE && (
        <View
          accessibilityLabel={t('guide.frame', {
            name: name ?? '',
            index: frame + 1,
            total: frames.length,
          })}
          style={{
            marginTop: 14,
            borderRadius: 18,
            overflow: 'hidden',
            backgroundColor: '#fff',
            aspectRatio: 1,
            maxHeight: 320,
            alignSelf: 'stretch',
          }}
        >
          {frames.map((uri, i) => (
            <Image
              key={uri}
              source={{ uri }}
              resizeMode="contain"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: i === frame ? 1 : 0,
              }}
            />
          ))}
          <View
            style={{
              position: 'absolute',
              right: 10,
              bottom: 10,
              flexDirection: 'row',
              gap: 5,
            }}
          >
            {frames.map((uri, i) => (
              <View
                key={uri}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: i === frame ? theme.green : '#c9d3bf',
                }}
              />
            ))}
          </View>
        </View>
      )}
      {muscles.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 14,
          }}
        >
          {muscles.map((m) => (
            <Chip
              key={m}
              label={m}
              selected={detail?.primary.includes(m)}
              onPress={() => {}}
            />
          ))}
        </View>
      )}
      {detail?.instructions.length ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          {detail.instructions.map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              <T
                weight={600}
                size={13}
                line={20}
                color={theme.textButton}
                style={{ minWidth: 18 }}
              >
                {i + 1}
              </T>
              <Body size={14} style={{ flex: 1 }}>
                {step}
              </Body>
            </View>
          ))}
        </View>
      ) : null}
      <Body size={11} style={{ marginTop: 18 }}>
        {t('guide.credit', { source: EXERCISE_SOURCE.name })}
      </Body>
    </Sheet>
  );
}
