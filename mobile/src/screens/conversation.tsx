import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowUp,
  Camera,
  ChevronLeft,
  ChevronRight,
  Columns2,
  ImagePlus,
  Images,
  MessageCircle,
  Paperclip,
  Trash2,
  X,
} from 'lucide-react-native';
import { randomUUID } from 'expo-crypto';
import {
  PHOTO_VIEWS,
  photoSets,
  photoViewLabel,
  type MediaRef,
  type MemberDetail,
  type PhotoView,
  type ProgressPhoto,
} from '../../../lib/coaching';
import { dateLabel, today, validDate } from '../../../lib/fitness';
import { mediaUri, request, uploadMedia } from '../api';
import { USER_KEY } from '../account';
import type { Training } from '../use-training';
import { font, useTheme } from '../theme';
import { useI18n, type Translate } from '../i18n';
import {
  Body,
  Chip,
  DangerButton,
  Field,
  Input,
  Press,
  PrimaryButton,
  SecondaryButton,
  Segmented,
  Sheet,
  T,
  TextButton,
  easeOut,
} from '../ui';
import { FileVideo } from '../components/demo-video';
import type { Act } from './shared';

const native = Platform.OS !== 'web';
type Picked = {
  uri: string;
  type: string;
  kind: 'image' | 'video';
  name: string;
};

async function pick(imagesOnly: boolean): Promise<Picked | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: imagesOnly ? ['images'] : ['images', 'videos'],
    quality: 0.85,
    videoMaxDuration: 60,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const kind = asset.type === 'video' ? 'video' : 'image';
  const type =
    asset.mimeType ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg');
  return {
    uri: asset.uri,
    type,
    kind,
    name: asset.fileName ?? (kind === 'video' ? 'video' : 'photo'),
  };
}

const VIEW_KEYS = {
  front: 'chat.front',
  side: 'chat.side',
  back: 'chat.back',
} as const;
function viewLabel(view: PhotoView, t: Translate) {
  return VIEW_KEYS[view] ? t(VIEW_KEYS[view]) : photoViewLabel(view);
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
function dayHeading(iso: string, t: Translate) {
  const date = new Date(iso),
    now = new Date();
  const diff = Math.round(
    (new Date(now.toDateString()).getTime() -
      new Date(date.toDateString()).getTime()) /
      86400000,
  );
  if (diff === 0) return t('chat.today');
  if (diff === 1) return t('chat.yesterday');
  return date.toLocaleDateString('en-GB', {
    weekday: diff < 7 ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
  });
}

function UploadBar({ active }: { active: boolean }) {
  const { theme } = useTheme();
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: native,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, value]);
  if (!active) return null;
  return (
    <View
      style={{
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: theme.line,
      }}
    >
      <Animated.View
        style={{
          width: '40%',
          height: '100%',
          backgroundColor: theme.green,
          transform: [
            {
              translateX: value.interpolate({
                inputRange: [0, 1],
                outputRange: [-120, 320],
              }),
            },
          ],
        }}
      />
    </View>
  );
}

function Viewer({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: { media: MediaRef; caption: string }[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const item = index === null ? null : items[index];
  const { width, height } = useWindowDimensions();
  const { t } = useI18n();
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (item)
      Animated.timing(fade, {
        toValue: 1,
        duration: 200,
        easing: easeOut,
        useNativeDriver: native,
      }).start();
    else fade.setValue(0);
  }, [item, fade]);
  if (!item) return null;
  const control = (
    label: string,
    icon: React.ReactNode,
    onPress: () => void,
    style: object,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={[
        {
          position: 'absolute',
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: '#ffffff22',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={{ flex: 1, backgroundColor: '#0b1610', opacity: fade }}
      >
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {item.media.kind === 'image' ? (
            <Image
              source={{ uri: mediaUri(item.media.id) }}
              resizeMode="contain"
              accessibilityLabel={item.caption}
              style={{ width, height: height * 0.8 }}
            />
          ) : (
            <View style={{ width, height: height * 0.7 }}>
              <FileVideo uri={mediaUri(item.media.id)} height={height * 0.7} />
            </View>
          )}
          <T
            size={13}
            line={18}
            color="#cfe0c6"
            center
            style={{ marginTop: 12, paddingHorizontal: 20 }}
          >
            {item.caption}
          </T>
        </View>
        {control(t('chat.close'), <X size={20} color="#fff" />, onClose, {
          top: 54,
          right: 16,
        })}
        {index !== null &&
          index > 0 &&
          control(
            t('chat.previous'),
            <ChevronLeft size={22} color="#fff" />,
            () => onIndex(index - 1),
            {
              left: 12,
              top: '48%',
            },
          )}
        {index !== null &&
          index < items.length - 1 &&
          control(
            t('chat.next'),
            <ChevronRight size={22} color="#fff" />,
            () => onIndex(index + 1),
            {
              right: 12,
              top: '48%',
            },
          )}
      </Animated.View>
    </Modal>
  );
}

function Bubble({
  mine,
  tail,
  body,
  media,
  createdAt,
  partner,
  width,
  onOpen,
}: {
  mine: boolean;
  tail: boolean;
  body: string;
  media: MediaRef | null | undefined;
  createdAt: string;
  partner: string;
  width: number;
  onOpen: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const photoLabel = body.startsWith('Progress photo ·')
    ? body.replace('Progress photo · ', '')
    : '';
  const color = mine ? theme.mineText : theme.ink;
  return (
    <View
      style={{
        maxWidth: '82%',
        alignSelf: mine ? 'flex-end' : 'flex-start',
        padding: media ? 5 : 12,
        paddingHorizontal: media ? 5 : 14,
        backgroundColor: mine ? theme.mine : theme.message,
        borderRadius: 18,
        borderBottomRightRadius: mine ? (tail ? 4 : 8) : 18,
        borderBottomLeftRadius: mine ? 18 : tail ? 4 : 8,
        marginBottom: tail ? 10 : 3,
        gap: 6,
      }}
    >
      {!!photoLabel && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: media ? 8 : 0,
            paddingTop: media ? 4 : 0,
          }}
        >
          <Camera size={12} color={color} />
          <T size={12} line={16} color={color} style={{ opacity: 0.85 }}>
            {photoLabel}
          </T>
        </View>
      )}
      {media?.kind === 'image' && (
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={
            mine
              ? t('chat.openYourPhoto')
              : t('chat.openPartnerPhoto', { name: partner })
          }
          onPress={onOpen}
          style={{ borderRadius: 13, overflow: 'hidden' }}
        >
          <Image
            source={{ uri: mediaUri(media.id) }}
            resizeMode="cover"
            style={{
              width: Math.min(260, width * 0.66),
              height: Math.min(300, width * 0.75),
            }}
          />
        </Pressable>
      )}
      {media?.kind === 'video' && (
        <View
          style={{
            width: Math.min(280, width * 0.7),
            borderRadius: 13,
            overflow: 'hidden',
          }}
        >
          <FileVideo uri={mediaUri(media.id)} height={200} />
        </View>
      )}
      {!!body && !photoLabel && (
        <T
          size={15}
          line={21}
          color={color}
          style={{ paddingHorizontal: media ? 8 : 0 }}
        >
          {body}
        </T>
      )}
      {tail && (
        <T
          size={11}
          line={13}
          color={color}
          style={{
            opacity: 0.65,
            alignSelf: 'flex-end',
            paddingHorizontal: media ? 8 : 0,
            paddingBottom: media ? 4 : 0,
          }}
        >
          {timeOf(createdAt)}
        </T>
      )}
    </View>
  );
}

export function ConversationScreen({
  training,
  detail,
  act,
  busy,
  onThreadReady,
}: {
  training: Training;
  detail: MemberDetail;
  act: Act;
  busy: boolean;
  onThreadReady: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const m = detail.member;
  const [view, setView] = useState<'messages' | 'photos'>('messages');
  const [body, setBody] = useState('');
  const [staged, setStaged] = useState<Picked | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const pending = useRef<{ id: string; body: string } | null>(null);
  const lastId = detail.messages.at(-1)?.id;
  useEffect(() => {
    if (view === 'messages') onThreadReady();
    // Scroll when the thread changes; the callback identity is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, view]);
  const gallery = useMemo(
    () =>
      detail.messages
        .filter((msg) => msg.media)
        .map((msg) => ({
          id: msg.id,
          media: msg.media!,
          caption: `${msg.sender_id === USER_KEY ? 'You' : m.coachName} · ${dateLabel(msg.created_at, true)}`,
        })),
    [detail.messages, m.coachName],
  );
  const canSend = !busy && !uploading && (!!body.trim() || !!staged);
  const send = () =>
    act(async () => {
      if (!canSend) return;
      setError('');
      const text = body.trim();
      if (pending.current?.body !== text)
        pending.current = { id: randomUUID(), body: text };
      let mediaId: string | undefined;
      if (staged) {
        setUploading(true);
        try {
          mediaId = (await uploadMedia(m.id, staged.uri, staged.type)).id;
        } finally {
          setUploading(false);
        }
      }
      await request('/api/coaching', {
        action: 'message',
        memberId: m.id,
        ...pending.current,
        ...(mediaId ? { mediaId } : {}),
      });
      pending.current = null;
      setBody('');
      setStaged(null);
      await training.refreshCoach();
    }, t('chat.sent'));
  const groups: { day: string; items: MemberDetail['messages'] }[] = [];
  for (const msg of detail.messages) {
    const day = new Date(msg.created_at).toDateString();
    const last = groups.at(-1);
    if (last && last.day === day) last.items.push(msg);
    else groups.push({ day, items: [msg] });
  }
  return (
    <View style={{ gap: 14 }}>
      <Body size={13}>
        {view === 'messages'
          ? t('chat.replies', { hours: m.offer.responseHours })
          : t('chat.photosIntro')}
      </Body>
      <Segmented
        options={[
          { value: 'messages', label: t('chat.messages') },
          {
            value: 'photos',
            label: detail.photos.length
              ? t('chat.progressPhotosCount', { count: detail.photos.length })
              : t('chat.progressPhotos'),
          },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'photos' ? (
        <ProgressPhotosPanel
          detail={detail}
          training={training}
          act={act}
          busy={busy}
        />
      ) : (
        <>
          <View
            style={{ gap: 3, paddingTop: 6, minHeight: 160 }}
            accessibilityLiveRegion="polite"
          >
            {!detail.messages.length && (
              <View
                style={{ alignItems: 'center', gap: 10, paddingVertical: 40 }}
              >
                <MessageCircle
                  size={28}
                  strokeWidth={1.4}
                  color={theme.muted}
                />
                <Body size={14} center style={{ maxWidth: 260 }}>
                  {t('chat.sayHello')}
                </Body>
              </View>
            )}
            {groups.map((group) => (
              <View key={group.day} style={{ gap: 3 }}>
                <T
                  size={12}
                  line={16}
                  color={theme.muted}
                  center
                  style={{ paddingVertical: 12 }}
                >
                  {dayHeading(group.items[0].created_at, t)}
                </T>
                {group.items.map((msg, i) => {
                  const next = group.items[i + 1];
                  const tail =
                    !next ||
                    next.sender_id !== msg.sender_id ||
                    Date.parse(next.created_at) - Date.parse(msg.created_at) >
                      5 * 60000;
                  return (
                    <Bubble
                      key={msg.id}
                      mine={msg.sender_id === USER_KEY}
                      tail={tail}
                      body={msg.body}
                      media={msg.media}
                      createdAt={msg.created_at}
                      partner={m.coachName}
                      width={width}
                      onOpen={() =>
                        setOpen(gallery.findIndex((g) => g.id === msg.id))
                      }
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <View
            style={{
              gap: 10,
              borderTopWidth: 1,
              borderColor: theme.line,
              paddingTop: 12,
            }}
          >
            {staged && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 8,
                  borderRadius: 14,
                  backgroundColor: theme.soft,
                }}
              >
                {staged.kind === 'image' ? (
                  <Image
                    source={{ uri: staged.uri }}
                    style={{ width: 48, height: 48, borderRadius: 9 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 9,
                      backgroundColor: theme.deep,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Images size={20} color={theme.textButton} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <T weight={500} size={14} line={18} numberOfLines={1}>
                    {staged.name}
                  </T>
                  {uploading ? (
                    <UploadBar active />
                  ) : (
                    <Body size={12}>
                      {t('chat.readyToSend', {
                        kind:
                          staged.kind === 'video'
                            ? t('chat.video')
                            : t('chat.photo'),
                      })}
                    </Body>
                  )}
                </View>
                {!uploading && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('chat.removeAttachment')}
                    hitSlop={8}
                    onPress={() => setStaged(null)}
                  >
                    <X size={18} color={theme.muted} />
                  </Pressable>
                )}
              </View>
            )}
            {!!error && (
              <T
                size={13}
                line={18}
                color={theme.errorText}
                accessibilityRole="alert"
              >
                {error}
              </T>
            )}
            <View
              style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}
            >
              <Press
                accessibilityRole="button"
                accessibilityLabel={t('chat.attach')}
                disabled={uploading}
                scale={0.9}
                onPress={() =>
                  void pick(false)
                    .then((picked) => {
                      if (picked) setStaged(picked);
                    })
                    .catch(() => setError(t('chat.libraryError')))
                }
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: theme.soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Paperclip size={19} color={theme.muted} />
              </Press>
              <TextInput
                accessibilityLabel={t('chat.messageCoach')}
                placeholder={t('chat.messagePlaceholder', {
                  name: m.coachName,
                })}
                placeholderTextColor={theme.placeholder}
                multiline
                maxLength={4000}
                value={body}
                editable={!uploading}
                onChangeText={setBody}
                style={[
                  font(400),
                  {
                    flex: 1,
                    minHeight: 46,
                    maxHeight: 150,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 23,
                    borderWidth: 1,
                    borderColor: theme.line,
                    backgroundColor: theme.soft,
                    color: theme.ink,
                    fontSize: 15.5,
                  },
                ]}
              />
              <Press
                accessibilityRole="button"
                accessibilityLabel={t('chat.send')}
                disabled={!canSend}
                scale={0.9}
                onPress={send}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: theme.primaryButton,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowUp
                  size={20}
                  strokeWidth={2.2}
                  color={theme.primaryText}
                />
              </Press>
            </View>
          </View>
        </>
      )}
      <Viewer
        items={gallery}
        index={open}
        onClose={() => setOpen(null)}
        onIndex={setOpen}
      />
    </View>
  );
}

function PhotoTile({
  photo,
  view,
  size,
  onOpen,
  onAdd,
  disabled,
}: {
  photo?: ProgressPhoto;
  view: PhotoView;
  size: number;
  onOpen: () => void;
  onAdd: () => void;
  disabled: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const height = Math.round((size * 4) / 3);
  if (!photo)
    return (
      <Press
        accessibilityRole="button"
        accessibilityLabel={t('chat.addView', { view: viewLabel(view, t) })}
        disabled={disabled}
        onPress={onAdd}
        scale={0.97}
        style={{
          width: size,
          height,
          borderRadius: 14,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: theme.line,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <ImagePlus size={20} strokeWidth={1.5} color={theme.muted} />
        <T size={12} line={15} color={theme.muted}>
          {viewLabel(view, t)}
        </T>
      </Press>
    );
  return (
    <Press
      accessibilityRole="imagebutton"
      accessibilityLabel={`${photoViewLabel(view)} view, ${dateLabel(photo.taken_on, true)}`}
      onPress={onOpen}
      scale={0.97}
      style={{
        width: size,
        height,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: theme.soft,
      }}
    >
      <Image
        source={{ uri: mediaUri(photo.media.id) }}
        resizeMode="cover"
        style={{ width: size, height }}
      />
      <View
        style={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          paddingVertical: 3,
          paddingHorizontal: 7,
          borderRadius: 7,
          backgroundColor: '#0b161099',
        }}
      >
        <T size={10} line={13} color="#fff" tracking={0.4}>
          {photoViewLabel(view)}
        </T>
      </View>
    </Press>
  );
}

function ProgressPhotosPanel({
  detail,
  training,
  act,
  busy,
}: {
  detail: MemberDetail;
  training: Training;
  act: Act;
  busy: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const m = detail.member;
  const sets = useMemo(() => photoSets(detail.photos), [detail.photos]);
  const [adding, setAdding] = useState<{
    view: PhotoView;
    date: string;
  } | null>(null);
  const [compare, setCompare] = useState(false);
  const [left, setLeft] = useState(''),
    [right, setRight] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ProgressPhoto | null>(null);
  const tile = Math.floor((Math.min(width, 600) - 40 - 20) / 3);
  const wide = Math.floor((Math.min(width, 600) - 40 - 10) / 2);
  const ordered = useMemo(
    () =>
      sets.flatMap((set) =>
        PHOTO_VIEWS.filter((v) => set.views[v]).map((v) => {
          const photo = set.views[v]!;
          return {
            photo,
            media: photo.media,
            caption: `${photoViewLabel(v)} view · ${dateLabel(set.date, true)}${photo.note ? ' · ' + photo.note : ''}`,
          };
        }),
      ),
    [sets],
  );
  const dates = sets.map((s) => s.date);
  const leftSet = sets.find((s) => s.date === (left || dates[1] || dates[0]));
  const rightSet = sets.find((s) => s.date === (right || dates[0]));
  const openPhoto = (photo: ProgressPhoto) =>
    setOpen(ordered.findIndex((o) => o.photo.id === photo.id));
  const remove = (photo: ProgressPhoto) =>
    act(async () => {
      await request('/api/coaching', {
        action: 'photo-delete',
        memberId: m.id,
        id: photo.id,
      });
      setConfirm(null);
      await training.refreshCoach();
    }, t('chat.photoRemoved'));
  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <PrimaryButton
          small
          label={t('chat.addPhoto')}
          icon={<Camera size={16} color={theme.primaryText} />}
          disabled={busy}
          onPress={() => setAdding({ view: 'front', date: today() })}
        />
        {sets.length > 1 && (
          <SecondaryButton
            height={44}
            size={13}
            label={compare ? t('chat.showAll') : t('chat.compare')}
            icon={<Columns2 size={15} color={theme.secondaryText} />}
            onPress={() => setCompare(!compare)}
          />
        )}
      </View>
      {!sets.length ? (
        <View style={{ gap: 12 }}>
          <T weight={500} size={17} line={22} tracking={-0.3}>
            No progress photos yet
          </T>
          <Body size={13}>
            Same light, same distance, same stance each time so changes are easy
            to see.
          </Body>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {PHOTO_VIEWS.map((v) => (
              <PhotoTile
                key={v}
                view={v}
                size={tile}
                disabled={busy}
                onOpen={() => {}}
                onAdd={() => setAdding({ view: v, date: today() })}
              />
            ))}
          </View>
        </View>
      ) : compare && leftSet && rightSet ? (
        <View style={{ gap: 14 }}>
          {(
            [
              [t('chat.before'), leftSet.date, setLeft],
              [t('chat.after'), rightSet.date, setRight],
            ] as const
          ).map(([label, value, set]) => (
            <View key={label} style={{ gap: 8 }}>
              <T weight={500} size={13} line={16} color={theme.muted}>
                {label}
              </T>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                {dates.map((d) => (
                  <Chip
                    key={d}
                    label={dateLabel(d)}
                    selected={value === d}
                    onPress={() => set(d)}
                  />
                ))}
              </ScrollView>
            </View>
          ))}
          {PHOTO_VIEWS.map((v) => (
            <View key={v} style={{ gap: 6 }}>
              <T size={13} line={16} color={theme.muted}>
                {photoViewLabel(v)}
              </T>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <PhotoTile
                  view={v}
                  size={wide}
                  photo={leftSet.views[v]}
                  disabled={busy}
                  onOpen={() => openPhoto(leftSet.views[v]!)}
                  onAdd={() => setAdding({ view: v, date: leftSet.date })}
                />
                <PhotoTile
                  view={v}
                  size={wide}
                  photo={rightSet.views[v]}
                  disabled={busy}
                  onOpen={() => openPhoto(rightSet.views[v]!)}
                  onAdd={() => setAdding({ view: v, date: rightSet.date })}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        sets.map((set, i) => {
          const own = PHOTO_VIEWS.map((v) => set.views[v]).find(
            (p) => p?.owner_id === USER_KEY,
          );
          const note = PHOTO_VIEWS.map((v) => set.views[v]?.note).find(Boolean);
          return (
            <View key={set.date} style={{ gap: 10 }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <View style={{ flex: 1 }}>
                  <T weight={500} size={17} line={22} tracking={-0.3}>
                    {dateLabel(set.date, true)}
                  </T>
                  <Body size={12}>
                    {i === 0
                      ? t('chat.latest')
                      : t('chat.daysEarlier', {
                          count: Math.round(
                            (Date.parse(sets[0].date) - Date.parse(set.date)) /
                              86400000,
                          ),
                        })}
                  </Body>
                </View>
                {own && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('chat.removeSet', {
                      date: dateLabel(set.date, true),
                    })}
                    hitSlop={8}
                    onPress={() => setConfirm(own)}
                  >
                    <Trash2 size={16} color={theme.muted} />
                  </Pressable>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {PHOTO_VIEWS.map((v) => (
                  <PhotoTile
                    key={v}
                    view={v}
                    size={tile}
                    photo={set.views[v]}
                    disabled={busy}
                    onOpen={() => openPhoto(set.views[v]!)}
                    onAdd={() => setAdding({ view: v, date: set.date })}
                  />
                ))}
              </View>
              {!!note && <Body size={13}>{note}</Body>}
            </View>
          );
        })
      )}
      {adding && (
        <PhotoUploader
          memberId={m.id}
          initial={adding}
          onClose={() => setAdding(null)}
          onSaved={async () => {
            setAdding(null);
            await training.refreshCoach();
          }}
        />
      )}
      <Viewer
        items={ordered}
        index={open}
        onClose={() => setOpen(null)}
        onIndex={setOpen}
      />
      <Sheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={t('chat.removeTitle', {
          view: confirm ? viewLabel(confirm.view, t) : '',
        })}
        description={t('chat.removeBody')}
      >
        <View style={{ marginTop: 18 }}>
          <DangerButton
            label={t('chat.removePhoto')}
            disabled={busy}
            onPress={() => confirm && remove(confirm)}
          />
        </View>
      </Sheet>
    </View>
  );
}

function PhotoUploader({
  memberId,
  initial,
  onClose,
  onSaved,
}: {
  memberId: string;
  initial: { view: PhotoView; date: string };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [view, setView] = useState<PhotoView>(initial.view);
  const [date, setDate] = useState(initial.date);
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dropWidth = Math.min(width, 460) - 46 - 24;
  const choose = () =>
    void pick(true)
      .then((next) => {
        if (next) setPicked(next);
        setError('');
      })
      .catch(() => setError(t('chat.libraryError')));
  return (
    <Sheet
      open
      onClose={() => !saving && onClose()}
      title={t('chat.addProgress')}
      description={t('chat.addProgressBody')}
    >
      <View style={{ marginTop: 14 }}>
        <Segmented
          accessibilityLabel={t('chat.photoView')}
          options={PHOTO_VIEWS.map((v) => ({
            value: v,
            label: viewLabel(v, t),
          }))}
          value={view}
          onChange={setView}
        />
      </View>
      <Press
        accessibilityRole="button"
        accessibilityLabel={
          picked ? t('chat.chooseDifferent') : t('chat.chooseOrTake')
        }
        disabled={saving}
        onPress={choose}
        scale={0.985}
        style={{
          marginTop: 14,
          width: dropWidth,
          height: picked ? Math.round((dropWidth * 4) / 3) : 200,
          maxHeight: 380,
          borderRadius: 18,
          borderWidth: 1.5,
          borderStyle: picked ? 'solid' : 'dashed',
          borderColor: theme.line,
          backgroundColor: theme.soft,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          gap: 6,
        }}
      >
        {picked ? (
          <Image
            source={{ uri: picked.uri }}
            resizeMode="cover"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <>
            <Camera size={26} strokeWidth={1.4} color={theme.muted} />
            <T weight={500} size={15} line={20}>
              Choose or take a photo
            </T>
            <Body size={12}>JPEG, PNG or WebP · up to 12 MB</Body>
          </>
        )}
      </Press>
      {picked && !saving && (
        <TextButton
          label={t('chat.chooseDifferent')}
          size={13}
          onPress={choose}
        />
      )}
      <Field label={t('chat.takenOn')} hint="YYYY-MM-DD">
        <Input
          accessibilityLabel={t('chat.takenOn')}
          value={date}
          onChangeText={setDate}
          maxLength={10}
          placeholder={today()}
        />
      </Field>
      <Field label={t('chat.note')} hint={t('chat.optional')}>
        <Input
          accessibilityLabel={t('chat.photoNote')}
          value={note}
          onChangeText={setNote}
          maxLength={500}
          placeholder={t('chat.notePlaceholder')}
        />
      </Field>
      {saving && (
        <View style={{ marginTop: 14 }}>
          <UploadBar active />
        </View>
      )}
      {!!error && (
        <T
          size={13}
          line={18}
          color={theme.errorText}
          style={{ marginTop: 14 }}
          accessibilityRole="alert"
        >
          {error}
        </T>
      )}
      <View style={{ marginTop: 22 }}>
        <PrimaryButton
          full
          label={saving ? t('chat.uploading') : t('chat.savePhoto')}
          accessibilityLabel={t('chat.savePhoto')}
          disabled={saving || !picked}
          onPress={() => {
            if (!picked) return;
            if (!validDate(date) || date > today()) {
              setError(t('chat.dateError'));
              return;
            }
            setSaving(true);
            setError('');
            void (async () => {
              try {
                const media = await uploadMedia(
                  memberId,
                  picked.uri,
                  picked.type,
                );
                await request('/api/coaching', {
                  action: 'photo',
                  memberId,
                  id: randomUUID(),
                  mediaId: media.id,
                  view,
                  takenOn: date,
                  note: note.trim(),
                });
                await onSaved();
              } catch (e) {
                setError(e instanceof Error ? e.message : t('chat.saveError'));
              } finally {
                setSaving(false);
              }
            })();
          }}
        />
      </View>
    </Sheet>
  );
}
