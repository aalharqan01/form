'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  MEDIA_LIMITS,
  PHOTO_VIEWS,
  mediaUrl,
  photoSets,
  photoViewLabel,
  type MediaRef,
  type Message,
  type PhotoView,
  type ProgressPhoto,
} from '@/lib/coaching';
import { dateLabel, id as newId, today } from '@/lib/fitness';
import { useIsNetworkTransport } from './transport';
/* Coaching media is private to two people; alt text names the sender. */
/* oxlint-disable nextjs/no-img-element, jsx-a11y/media-has-caption */

type Act = (b: Record<string, unknown>) => Promise<boolean>;
const ACCEPT_IMAGE = 'image/jpeg,image/png,image/webp';
const ACCEPT_MEDIA = ACCEPT_IMAGE + ',video/mp4,video/webm,video/quicktime';

/** Upload with progress; the server validates type, size and membership. */
function uploadMedia(
  memberId: string,
  file: File,
  onProgress: (fraction: number) => void,
) {
  return new Promise<MediaRef>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media?member=' + encodeURIComponent(memberId));
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('X-Media-Size', String(file.size));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () =>
      reject(new Error('Upload failed. Check your connection and retry.'));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as MediaRef & {
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || 'Upload failed. Please retry.'));
      } catch {
        reject(new Error('Upload failed. Please retry.'));
      }
    };
    xhr.send(file);
  });
}
function checkFile(file: File, imagesOnly = false) {
  const kind = file.type.startsWith('image/') ? 'image' : 'video';
  if (
    !(imagesOnly ? ACCEPT_IMAGE : ACCEPT_MEDIA).split(',').includes(file.type)
  )
    return imagesOnly
      ? 'Choose a JPEG, PNG or WebP photo.'
      : 'Choose a JPEG, PNG or WebP photo, or an MP4, WebM or MOV video.';
  if (file.size > MEDIA_LIMITS[kind])
    return kind === 'image'
      ? 'Photos can be up to 12 MB.'
      : 'Videos can be up to 25 MB.';
  if (file.size < 12) return 'This file looks empty.';
  return '';
}
const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
function dayKey(iso: string) {
  return new Date(iso).toDateString();
}
function dayHeading(iso: string) {
  const date = new Date(iso),
    now = new Date();
  const diff = Math.round(
    (new Date(now.toDateString()).getTime() -
      new Date(date.toDateString()).getTime()) /
      86400000,
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-GB', {
    weekday: diff < 7 ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

function Lightbox({
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
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (e.key === 'ArrowRight' && index < items.length - 1)
        onIndex(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, onIndex]);
  return (
    <Dialog
      open={!!item}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="co-lightbox" showCloseButton={false}>
        <DialogTitle className="sr-only">
          {item?.caption ?? 'Media'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Use the arrow keys to move between attachments.
        </DialogDescription>
        {item && (
          <figure>
            {item.media.kind === 'image' ? (
              <img src={mediaUrl(item.media.id)} alt={item.caption} />
            ) : (
              <video
                src={mediaUrl(item.media.id)}
                controls
                autoPlay
                playsInline
              />
            )}
            <figcaption>{item.caption}</figcaption>
          </figure>
        )}
        <button
          type="button"
          className="co-lightbox-close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {index !== null && index > 0 && (
          <button
            type="button"
            className="co-lightbox-nav prev"
            aria-label="Previous"
            onClick={() => onIndex(index - 1)}
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {index !== null && index < items.length - 1 && (
          <button
            type="button"
            className="co-lightbox-nav next"
            aria-label="Next"
            onClick={() => onIndex(index + 1)}
          >
            <ChevronRight size={22} />
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Attachment({
  media,
  alt,
  onOpen,
}: {
  media: MediaRef;
  alt: string;
  onOpen: () => void;
}) {
  if (media.kind === 'video')
    return (
      <video
        className="co-bubble-media"
        src={mediaUrl(media.id)}
        controls
        preload="metadata"
        playsInline
      />
    );
  return (
    <button
      type="button"
      className="co-bubble-media co-bubble-image"
      onClick={onOpen}
    >
      <img src={mediaUrl(media.id)} alt={alt} loading="lazy" decoding="async" />
    </button>
  );
}

export function Conversation({
  memberId,
  messages,
  photos,
  userId,
  partnerName,
  responseHours,
  busy,
  act,
}: {
  memberId: string;
  messages: Message[];
  photos: ProgressPhoto[];
  userId: string;
  partnerName: string;
  responseHours: number;
  busy: boolean;
  act: Act;
}) {
  const network = useIsNetworkTransport();
  const [view, setView] = useState<'messages' | 'photos'>('messages');
  const [body, setBody] = useState('');
  const [staged, setStaged] = useState<{ file: File; preview: string } | null>(
    null,
  );
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const pendingId = useRef(newId());
  const thread = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const gallery = useMemo(
    () =>
      messages
        .filter((m) => m.media)
        .map((m) => ({
          media: m.media!,
          caption: `${m.sender_id === userId ? 'You' : partnerName} · ${dateLabel(m.created_at, true)}`,
          id: m.id,
        })),
    [messages, userId, partnerName],
  );
  const lastId = messages.at(-1)?.id;
  useLayoutEffect(() => {
    const el = thread.current;
    if (!el || view !== 'messages') return;
    el.scrollTop = el.scrollHeight;
  }, [lastId, view]);
  useEffect(
    () => () => {
      if (staged) URL.revokeObjectURL(staged.preview);
    },
    [staged],
  );
  const stage = (file?: File) => {
    if (!file) return;
    const problem = checkFile(file);
    setError(problem);
    if (problem) return;
    if (staged) URL.revokeObjectURL(staged.preview);
    setStaged({ file, preview: URL.createObjectURL(file) });
    textarea.current?.focus();
  };
  const sending = progress !== null;
  const canSend = !busy && !sending && (!!body.trim() || !!staged);
  async function send() {
    if (!canSend) return;
    setError('');
    let media: MediaRef | null = null;
    try {
      if (staged) {
        setProgress(0);
        media = await uploadMedia(memberId, staged.file, setProgress);
      }
    } catch (e) {
      setProgress(null);
      setError((e as Error).message);
      return;
    }
    const ok = await act({
      action: 'message',
      id: pendingId.current,
      body: body.trim(),
      ...(media ? { mediaId: media.id } : {}),
    });
    setProgress(null);
    if (ok) {
      setBody('');
      if (staged) URL.revokeObjectURL(staged.preview);
      setStaged(null);
      pendingId.current = newId();
      textarea.current?.focus();
    }
  }
  const groups: { day: string; items: Message[] }[] = [];
  for (const m of messages) {
    const key = dayKey(m.created_at);
    const last = groups.at(-1);
    if (last && last.day === key) last.items.push(m);
    else groups.push({ day: key, items: [m] });
  }
  return (
    <section className="co-card co-chat">
      <header className="co-chat-head">
        <div>
          <h2>{view === 'messages' ? 'Conversation' : 'Progress photos'}</h2>
          <p className="co-muted">
            {view === 'messages'
              ? `Replies within ${responseHours} hours. Photos and short videos are private to you both.`
              : 'Front, side and back photos by date. Both of you can add and compare them.'}
          </p>
        </div>
        <fieldset
          className="range-switch co-chat-switch"
          aria-label="Conversation view"
        >
          <button
            type="button"
            aria-pressed={view === 'messages'}
            onClick={() => setView('messages')}
          >
            <MessageCircle size={15} />
            Messages
          </button>
          <button
            type="button"
            aria-pressed={view === 'photos'}
            onClick={() => setView('photos')}
          >
            <Images size={15} />
            Progress photos
            {photos.length > 0 && (
              <span className="co-chat-count">{photos.length}</span>
            )}
          </button>
        </fieldset>
      </header>
      {view === 'photos' ? (
        <ProgressPhotos
          memberId={memberId}
          photos={photos}
          userId={userId}
          partnerName={partnerName}
          busy={busy}
          act={act}
          canUpload={network}
        />
      ) : (
        <>
          <div className="co-chat-thread" ref={thread} aria-live="polite">
            {!messages.length && (
              <div className="co-chat-empty">
                <MessageCircle size={28} strokeWidth={1.4} />
                <p>
                  Say hello. Ask about a set, share a form check, or send a
                  progress photo.
                </p>
              </div>
            )}
            {groups.map((group) => (
              <div key={group.day} className="co-chat-day">
                <span>{dayHeading(group.items[0].created_at)}</span>
                {group.items.map((m, i) => {
                  const mine = m.sender_id === userId;
                  const next = group.items[i + 1];
                  const tail =
                    !next ||
                    next.sender_id !== m.sender_id ||
                    Date.parse(next.created_at) - Date.parse(m.created_at) >
                      5 * 60000;
                  const photoLabel = m.body.startsWith('Progress photo ·')
                    ? m.body
                    : '';
                  return (
                    <div
                      key={m.id}
                      className={`co-bubble ${mine ? 'mine' : 'theirs'} ${tail ? 'tail' : ''}`}
                    >
                      {photoLabel && (
                        <span className="co-bubble-tag">
                          <Camera size={12} />
                          {photoLabel.replace('Progress photo · ', '')}
                        </span>
                      )}
                      {m.media && (
                        <Attachment
                          media={m.media}
                          alt={`${mine ? 'Your' : partnerName + '’s'} attachment`}
                          onOpen={() =>
                            setOpen(gallery.findIndex((g) => g.id === m.id))
                          }
                        />
                      )}
                      {m.body && !photoLabel && <p>{m.body}</p>}
                      {tail && (
                        <time dateTime={m.created_at}>
                          {timeOf(m.created_at)}
                        </time>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <form
            className="co-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            {staged && (
              <div className="co-attach-chip">
                {staged.file.type.startsWith('image/') ? (
                  <img src={staged.preview} alt="" />
                ) : (
                  <video src={staged.preview} muted playsInline />
                )}
                <span>
                  <strong>{staged.file.name}</strong>
                  <small>{formatSize(staged.file.size)}</small>
                </span>
                {sending ? (
                  <span className="co-attach-progress" aria-label="Uploading">
                    <i style={{ transform: `scaleX(${progress ?? 0})` }} />
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() => {
                      URL.revokeObjectURL(staged.preview);
                      setStaged(null);
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            {error && (
              <p className="co-error" role="alert">
                {error}
              </p>
            )}
            <div className="co-composer-row">
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT_MEDIA}
                hidden
                onChange={(e) => {
                  stage(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="co-composer-icon"
                aria-label="Attach a photo or video"
                disabled={!network || sending}
                title={
                  network
                    ? 'Photo or video up to 25 MB'
                    : 'Attachments are unavailable right now'
                }
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip size={19} />
              </button>
              <textarea
                ref={textarea}
                aria-label="Message"
                placeholder={`Message ${partnerName}…`}
                rows={1}
                maxLength={4000}
                value={body}
                disabled={sending}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="submit"
                className="co-composer-send"
                aria-label={sending ? 'Sending' : 'Send message'}
                disabled={!canSend}
              >
                <ArrowUp size={20} strokeWidth={2.2} />
              </button>
            </div>
          </form>
        </>
      )}
      <Lightbox
        items={gallery}
        index={open}
        onClose={() => setOpen(null)}
        onIndex={setOpen}
      />
    </section>
  );
}

function PhotoTile({
  photo,
  view,
  onOpen,
  onAdd,
  canAdd,
}: {
  photo?: ProgressPhoto;
  view: PhotoView;
  onOpen: () => void;
  onAdd: () => void;
  canAdd: boolean;
}) {
  if (!photo)
    return (
      <button
        type="button"
        className="co-photo-tile empty"
        onClick={onAdd}
        disabled={!canAdd}
        aria-label={`Add ${photoViewLabel(view).toLowerCase()} view`}
      >
        <ImagePlus size={20} strokeWidth={1.5} />
        <span>{photoViewLabel(view)}</span>
      </button>
    );
  return (
    <button
      type="button"
      className="co-photo-tile"
      onClick={onOpen}
      aria-label={`${photoViewLabel(view)} view, ${dateLabel(photo.taken_on, true)}`}
    >
      <img
        src={mediaUrl(photo.media.id)}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span>{photoViewLabel(view)}</span>
    </button>
  );
}

export function ProgressPhotos({
  memberId,
  photos,
  userId,
  partnerName,
  busy,
  act,
  canUpload,
}: {
  memberId: string;
  photos: ProgressPhoto[];
  userId: string;
  partnerName: string;
  busy: boolean;
  act: Act;
  canUpload: boolean;
}) {
  const sets = useMemo(() => photoSets(photos), [photos]);
  const [adding, setAdding] = useState<{
    view: PhotoView;
    date: string;
  } | null>(null);
  const [compare, setCompare] = useState(false);
  const [left, setLeft] = useState(''),
    [right, setRight] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ProgressPhoto | null>(null);
  const ordered = useMemo(
    () =>
      sets.flatMap((set) =>
        PHOTO_VIEWS.filter((v) => set.views[v]).map((v) => {
          const photo = set.views[v]!;
          return {
            media: photo.media,
            caption: `${photoViewLabel(v)} view · ${dateLabel(set.date, true)}${photo.note ? ' · ' + photo.note : ''}`,
            photo,
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
  return (
    <div className="co-photos">
      <div className="co-photos-toolbar">
        <Button
          className="primary"
          disabled={!canUpload || busy}
          onClick={() => setAdding({ view: 'front', date: today() })}
        >
          Add photo
          <Camera size={17} />
        </Button>
        {sets.length > 1 && (
          <Button
            className="secondary"
            aria-pressed={compare}
            onClick={() => setCompare(!compare)}
          >
            <Columns2 size={16} />
            {compare ? 'Show all sets' : 'Compare two dates'}
          </Button>
        )}
      </div>
      {!canUpload && (
        <p className="co-muted">Photo uploads are unavailable right now.</p>
      )}
      {!sets.length ? (
        <div className="co-photo-set">
          <div className="co-photo-set-head">
            <strong>No progress photos yet</strong>
            <span className="co-muted">
              Take the three views in the same light and stance each time so
              changes are easy to see.
            </span>
          </div>
          <div className="co-photo-grid">
            {PHOTO_VIEWS.map((v) => (
              <PhotoTile
                key={v}
                view={v}
                canAdd={canUpload && !busy}
                onOpen={() => {}}
                onAdd={() => setAdding({ view: v, date: today() })}
              />
            ))}
          </div>
        </div>
      ) : compare && leftSet && rightSet ? (
        <div className="co-photo-compare">
          <div className="co-photo-compare-heads">
            <label>
              Before
              <select
                value={leftSet.date}
                onChange={(e) => setLeft(e.target.value)}
              >
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {dateLabel(d, true)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              After
              <select
                value={rightSet.date}
                onChange={(e) => setRight(e.target.value)}
              >
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {dateLabel(d, true)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {PHOTO_VIEWS.map((v) => (
            <div key={v} className="co-photo-compare-row">
              <span className="co-photo-compare-label">
                {photoViewLabel(v)}
              </span>
              <PhotoTile
                view={v}
                photo={leftSet.views[v]}
                canAdd={canUpload && !busy}
                onOpen={() => openPhoto(leftSet.views[v]!)}
                onAdd={() => setAdding({ view: v, date: leftSet.date })}
              />
              <PhotoTile
                view={v}
                photo={rightSet.views[v]}
                canAdd={canUpload && !busy}
                onOpen={() => openPhoto(rightSet.views[v]!)}
                onAdd={() => setAdding({ view: v, date: rightSet.date })}
              />
            </div>
          ))}
        </div>
      ) : (
        sets.map((set, i) => {
          const owner = PHOTO_VIEWS.map((v) => set.views[v]?.owner_id).find(
            Boolean,
          );
          return (
            <div key={set.date} className="co-photo-set">
              <div className="co-photo-set-head">
                <strong>{dateLabel(set.date, true)}</strong>
                <span className="co-muted">
                  {i === 0
                    ? 'Latest'
                    : `${Math.round((Date.parse(sets[0].date) - Date.parse(set.date)) / 86400000)} days earlier`}
                  {owner
                    ? ` · added by ${owner === userId ? 'you' : partnerName}`
                    : ''}
                </span>
                {PHOTO_VIEWS.some((v) => set.views[v]?.owner_id === userId) && (
                  <button
                    type="button"
                    className="co-photo-remove"
                    aria-label={`Remove photos from ${dateLabel(set.date, true)}`}
                    onClick={() =>
                      setConfirm(
                        PHOTO_VIEWS.map((v) => set.views[v]).find(
                          (p) => p?.owner_id === userId,
                        ) ?? null,
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <div className="co-photo-grid">
                {PHOTO_VIEWS.map((v) => (
                  <PhotoTile
                    key={v}
                    view={v}
                    photo={set.views[v]}
                    canAdd={canUpload && !busy}
                    onOpen={() => openPhoto(set.views[v]!)}
                    onAdd={() => setAdding({ view: v, date: set.date })}
                  />
                ))}
              </div>
              {PHOTO_VIEWS.map((v) => set.views[v]?.note)
                .filter(Boolean)
                .slice(0, 1)
                .map((note) => (
                  <p key={note} className="co-photo-note">
                    {note}
                  </p>
                ))}
            </div>
          );
        })
      )}
      {adding && (
        <PhotoUploader
          memberId={memberId}
          initial={adding}
          onClose={() => setAdding(null)}
          onSave={async (media, view, takenOn, note) => {
            const ok = await act({
              action: 'photo',
              id: newId(),
              mediaId: media.id,
              view,
              takenOn,
              note,
            });
            if (ok) setAdding(null);
            return ok;
          }}
        />
      )}
      <Lightbox
        items={ordered}
        index={open}
        onClose={() => setOpen(null)}
        onIndex={setOpen}
      />
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="form-dialog co-dialog">
          <DialogTitle>
            Remove this{' '}
            {confirm ? photoViewLabel(confirm.view).toLowerCase() : ''} photo?
          </DialogTitle>
          <DialogDescription>
            It disappears from the conversation and from progress photos for
            both of you.
          </DialogDescription>
          <Button
            className="danger-button"
            disabled={busy}
            onClick={async () => {
              if (
                confirm &&
                (await act({ action: 'photo-delete', id: confirm.id }))
              )
                setConfirm(null);
            }}
          >
            Remove photo
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotoUploader({
  memberId,
  initial,
  onClose,
  onSave,
}: {
  memberId: string;
  initial: { view: PhotoView; date: string };
  onClose: () => void;
  onSave: (
    media: MediaRef,
    view: PhotoView,
    takenOn: string,
    note: string,
  ) => Promise<boolean>;
}) {
  const [view, setView] = useState<PhotoView>(initial.view);
  const [date, setDate] = useState(initial.date);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<{ file: File; preview: string } | null>(
    null,
  );
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (file) URL.revokeObjectURL(file.preview);
    },
    [file],
  );
  const uploading = progress !== null;
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !uploading) onClose();
      }}
    >
      <DialogContent className="form-dialog co-dialog co-photo-dialog">
        <DialogTitle>Add progress photo</DialogTitle>
        <DialogDescription>
          Same light, same distance, same stance. That is what makes the
          comparison honest.
        </DialogDescription>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file) {
              setError('Choose a photo first.');
              return;
            }
            setError('');
            try {
              setProgress(0);
              const media = await uploadMedia(memberId, file.file, setProgress);
              const ok = await onSave(media, view, date, note.trim());
              if (!ok)
                setError(
                  'The photo uploaded but could not be saved. Please retry.',
                );
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setProgress(null);
            }
          }}
        >
          <fieldset
            className="range-switch co-photo-views"
            aria-label="Photo view"
          >
            {PHOTO_VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {photoViewLabel(v)}
              </button>
            ))}
          </fieldset>
          <input
            ref={input}
            type="file"
            accept={ACCEPT_IMAGE}
            capture="environment"
            hidden
            onChange={(e) => {
              const next = e.target.files?.[0];
              e.target.value = '';
              if (!next) return;
              const problem = checkFile(next, true);
              setError(problem);
              if (problem) return;
              if (file) URL.revokeObjectURL(file.preview);
              setFile({ file: next, preview: URL.createObjectURL(next) });
            }}
          />
          <button
            type="button"
            className={`co-photo-drop ${file ? 'has-photo' : ''}`}
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            {file ? (
              <img src={file.preview} alt="Your selection" />
            ) : (
              <>
                <Camera size={26} strokeWidth={1.4} />
                <strong>Choose or take a photo</strong>
                <small>JPEG, PNG or WebP · up to 12 MB</small>
              </>
            )}
            {uploading && (
              <span className="co-attach-progress large" aria-label="Uploading">
                <i style={{ transform: `scaleX(${progress ?? 0})` }} />
              </span>
            )}
          </button>
          {file && !uploading && (
            <button
              type="button"
              className="text-button co-photo-change"
              onClick={() => input.current?.click()}
            >
              Choose a different photo
            </button>
          )}
          <div className="co-form-grid">
            <label>
              Taken on
              <Input
                type="date"
                required
                max={today()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Note <span className="co-muted">optional</span>
              <Input
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Morning, fasted"
              />
            </label>
          </div>
          {error && (
            <p className="co-error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="primary full"
            type="submit"
            disabled={uploading || !file}
          >
            {uploading ? 'Uploading…' : 'Save photo'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
