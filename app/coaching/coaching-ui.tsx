'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowLeft,
  Users,
  Plus,
  Check,
  MessageCircle,
  ClipboardList,
  ChevronRight,
  Copy,
  X,
  Dumbbell,
  Wallet,
  Search,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  type CoachingState,
  type Member,
  type MemberDetail,
  type CoachProfile,
  type Program,
  type Checkin,
  type Intake,
  DAYS,
  weekOf,
} from '@/lib/coaching';
import {
  type Routine,
  type FitnessData,
  id,
  today,
  dateLabel,
  displayWeight,
  completedSets,
  smoothWeights,
} from '@/lib/fitness';
import ProgressPanel from '../progress-panel';
import ThemeControl from '../theme-control';
import './coaching.css';
/* oxlint-disable nextjs/no-html-link-for-pages, jsx-a11y/prefer-tag-over-role */
const money = (price: number, currency: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
async function api<T>(query = '', body?: unknown): Promise<T> {
  const r = await fetch('/api/coaching' + query, {
    cache: 'no-store',
    ...(body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(data.error || 'Please retry.');
  return data;
}
function useCoaching() {
  const [state, setState] = useState<CoachingState | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const request = useRef(0),
    lock = useRef(false);
  const reload = useCallback(async () => {
    const n = ++request.current;
    try {
      const d = await api<CoachingState>();
      if (n === request.current) {
        setState(d);
        setError('');
      }
    } catch (e) {
      if (n === request.current) setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const boot = setTimeout(() => void reload(), 0);
    const refresh = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('online', refresh);
    return () => {
      clearTimeout(boot);
      clearInterval(timer);
      window.removeEventListener('online', refresh);
    };
  }, [reload]);
  const mutate = async <T,>(body: unknown): Promise<T | null> => {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api<T>('', body);
      await reload();
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { state, error, busy, reload, mutate };
}
function ErrorNote({ text: message }: { text: string }) {
  return message ? (
    <p className="co-error" role="alert">
      {message}
    </p>
  ) : null;
}
function Empty({
  icon: Icon = Users,
  title,
  children,
}: {
  icon?: typeof Users;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="co-empty">
      <Icon size={32} strokeWidth={1.3} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export default function CoachingWorkspace() {
  const c = useCoaching();
  const [section, setSection] = useState<'clients' | 'offering'>('clients'),
    [selected, setSelected] = useState<string | null>(null),
    [invite, setInvite] = useState(false),
    [filter, setFilter] = useState(''),
    [attention, setAttention] = useState(false);
  const state = c.state,
    clients = state?.clients ?? [],
    active = clients.filter((m) => m.status === 'active'),
    needs = (m: Member) =>
      m.unread > 0 ||
      m.pending > 0 ||
      (m.stats?.due ?? 0) > (m.stats?.completed ?? 0);
  const visible = clients.filter(
    (m) =>
      (!attention || needs(m)) &&
      (m.name + ' ' + m.email).toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <div className="co-shell">
      <aside className="co-sidebar">
        <a className="co-logo" href="/">
          form<span>®</span>
        </a>
        <span className="co-overline">COACH WORKSPACE</span>
        <nav>
          <button
            aria-current={section === 'clients' ? 'page' : undefined}
            onClick={() => {
              setSection('clients');
              setSelected(null);
            }}
          >
            <Users size={20} strokeWidth={1.5} />
            Clients
          </button>
          <button
            aria-current={section === 'offering' ? 'page' : undefined}
            onClick={() => {
              setSection('offering');
              setSelected(null);
            }}
          >
            <Wallet size={20} strokeWidth={1.5} />
            Profile & packages
          </button>
          <a href="/">
            <Dumbbell size={20} strokeWidth={1.5} />
            My training
          </a>
        </nav>
        <div className="co-sidebar-bottom">
          <ThemeControl />
          <span className="co-pilot">Private coaching pilot</span>
        </div>
      </aside>
      <main className="co-main">
        <header className="co-topbar">
          <a href="/" className="co-mobile-brand">
            form®
          </a>
          <span>
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
          <a href="/">
            My training <ArrowUpRight size={16} />
          </a>
        </header>
        <ErrorNote text={c.error} />
        {!state ? (
          <Empty title="Loading your workspace">
            <Button onClick={() => void c.reload()}>Retry</Button>
          </Empty>
        ) : !state.profile ? (
          <>
            <div className="co-heading">
              <div>
                <p className="co-overline">YOUR COACHING BUSINESS</p>
                <h1>
                  Make room
                  <br />
                  for your clients.
                </h1>
                <p>Set up your profile, then invite your first client.</p>
              </div>
              <div className="co-heading-mark">
                <Users size={54} strokeWidth={1} />
              </div>
            </div>
            <ProfileEditor
              profile={null}
              revision={state.profileRevision}
              busy={c.busy}
              onSave={async (p, revision) =>
                !!(await c.mutate({
                  action: 'profile',
                  profile: p,
                  revision,
                }))
              }
            />
          </>
        ) : selected ? (
          <ClientDetail
            memberId={selected}
            userId={state.userId}
            onBack={() => {
              setSelected(null);
              void c.reload();
            }}
          />
        ) : section === 'offering' ? (
          <>
            <div className="co-heading">
              <div>
                <p className="co-overline">YOUR OFFERING</p>
                <h1>Profile & packages</h1>
                <p>Define what clients receive before inviting them.</p>
              </div>
            </div>
            <ProfileEditor
              revision={state.profileRevision}
              profile={state.profile}
              busy={c.busy}
              onSave={async (p, revision) =>
                !!(await c.mutate({
                  action: 'profile',
                  profile: p,
                  revision,
                }))
              }
            />
            <BillingNote />
          </>
        ) : (
          <>
            <div className="co-heading">
              <div>
                <p className="co-overline">
                  {state.profile.name.toUpperCase()}
                </p>
                <h1>Your clients.</h1>
                <p>
                  {active.length
                    ? `${active.length} active client${active.length === 1 ? '' : 's'}. ${active.filter(needs).length} need attention.`
                    : 'Your next coaching relationship starts here.'}
                </p>
              </div>
              <Button
                className="primary"
                onClick={() => setInvite(true)}
                disabled={!state.profile.offers.length}
              >
                Invite client{' '}
                <span className="button-orb">
                  <Plus size={18} />
                </span>
              </Button>
            </div>
            <div className="co-metrics">
              <button onClick={() => setAttention(false)}>
                <span>Active clients</span>
                <strong>{active.length.toString().padStart(2, '0')}</strong>
                <small>Current coaching relationships</small>
              </button>
              <button
                className="co-metric-accent"
                onClick={() => setAttention(true)}
              >
                <span>Needs attention</span>
                <strong>
                  {active.filter(needs).length.toString().padStart(2, '0')}
                </strong>
                <small>Check-ins, messages & missed sessions</small>
              </button>
              <button onClick={() => setAttention(false)}>
                <span>Pending invitations</span>
                <strong>
                  {clients
                    .filter(
                      (m) =>
                        m.status === 'invited' &&
                        m.expires_at > new Date().toISOString(),
                    )
                    .length.toString()
                    .padStart(2, '0')}
                </strong>
                <small>Waiting for clients to join</small>
              </button>
            </div>
            <div className="co-list-toolbar">
              <div className="range-switch">
                <button
                  aria-pressed={!attention}
                  onClick={() => setAttention(false)}
                >
                  All clients
                </button>
                <button
                  aria-pressed={attention}
                  onClick={() => setAttention(true)}
                >
                  Needs attention
                </button>
              </div>
              <label className="co-search">
                <Search size={17} />
                <Input
                  aria-label="Search clients"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Find a client"
                />
              </label>
            </div>
            {!visible.length ? (
              <Empty
                title={
                  clients.length
                    ? 'No matching clients'
                    : 'Invite your first client'
                }
              >
                <p>
                  {clients.length
                    ? 'Try another name or view all clients.'
                    : 'Send a personal invitation link. Your client completes their intake and chooses to share their progress.'}
                </p>
                {!clients.length && (
                  <Button
                    className="secondary"
                    onClick={() => setInvite(true)}
                    disabled={!state.profile.offers.length}
                  >
                    Create invitation <Plus size={17} />
                  </Button>
                )}
              </Empty>
            ) : (
              <div className="co-client-list">
                {visible.map((m) => (
                  <button
                    className="co-client-row"
                    key={m.id}
                    onClick={() => setSelected(m.id)}
                  >
                    <span className="co-initials">
                      {m.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <span className="co-client-name">
                      <strong>{m.name}</strong>
                      <small>{m.offer.name}</small>
                    </span>
                    <span className="co-client-stat">
                      <strong>
                        {m.stats?.completed ?? 0}/{m.stats?.due ?? 0}
                      </strong>
                      <small>Scheduled · 7 days</small>
                    </span>
                    <span className="co-client-signals">
                      {m.pending > 0 ? (
                        <span className="co-badge amber">
                          {m.pending} check-in{m.pending > 1 ? 's' : ''}
                        </span>
                      ) : m.unread > 0 ? (
                        <span className="co-badge amber">
                          {m.unread} unread
                        </span>
                      ) : (
                        <span className="co-badge">
                          {m.status === 'invited' &&
                          m.expires_at < new Date().toISOString()
                            ? 'Expired'
                            : m.status === 'active'
                              ? 'Pilot active'
                              : m.status}
                        </span>
                      )}
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
            )}
            <BillingNote />
          </>
        )}
        {invite && state?.profile && (
          <InviteDialog
            profile={state.profile}
            busy={c.busy}
            error={c.error}
            onClose={() => setInvite(false)}
            onInvite={(b) => c.mutate(b)}
          />
        )}
      </main>
    </div>
  );
}
function BillingNote() {
  return (
    <div className="co-billing-note">
      <Wallet size={20} strokeWidth={1.5} />
      <div>
        <strong>Unpaid pilot</strong>
        <p>
          Package prices are for planning. No client is charged, subscriptions
          do not renew, and coach payouts are not enabled.
        </p>
      </div>
    </div>
  );
}
function ProfileEditor({
  profile,
  revision,
  busy,
  onSave,
}: {
  profile: CoachProfile | null;
  revision: number;
  busy: boolean;
  onSave: (p: CoachProfile, revision: number) => Promise<boolean>;
}) {
  const [p, setP] = useState<CoachProfile>(
      profile ?? {
        name: '',
        bio: '',
        country: 'QA',
        specialties: '',
        offers: [
          {
            id: id(),
            name: 'Personal coaching',
            price: 0,
            currency: 'QAR',
            description:
              'Weekly check-in, a personalised training program and messaging.',
            responseHours: 48,
          },
        ],
      },
    ),
    [saved, setSaved] = useState(false);
  const baseRevision = useRef(revision);
  const field = (key: keyof CoachProfile, value: unknown) => {
    setSaved(false);
    setP((v) => ({ ...v, [key]: value }));
  };
  return (
    <form
      className="co-profile-layout"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSave(p, baseRevision.current)) {
          baseRevision.current++;
          setSaved(true);
        }
      }}
    >
      <section className="co-card">
        <p className="co-overline">01 / ABOUT YOU</p>
        <h2>Coach profile</h2>
        <label>
          Name
          <Input
            required
            maxLength={100}
            value={p.name}
            onChange={(e) => field('name', e.target.value)}
            placeholder="Your coaching name"
          />
        </label>
        <div className="co-form-grid">
          <label>
            Based in
            <select
              value={p.country}
              onChange={(e) => field('country', e.target.value)}
            >
              <option value="QA">Qatar</option>
              <option value="SA">Saudi Arabia</option>
            </select>
          </label>
          <label>
            Specialties
            <Input
              maxLength={300}
              value={p.specialties}
              onChange={(e) => field('specialties', e.target.value)}
              placeholder="Strength, fat loss, mobility…"
            />
          </label>
        </div>
        <label>
          About your coaching
          <Textarea
            maxLength={2000}
            value={p.bio}
            onChange={(e) => field('bio', e.target.value)}
            placeholder="Your approach and who you work with"
          />
        </label>
        <p className="co-muted">
          Clients see this profile when they open your invitation.
        </p>
      </section>
      <section className="co-card">
        <p className="co-overline">02 / PACKAGES</p>
        <h2>What clients receive</h2>
        {p.offers.map((o, i) => (
          <div className="co-offer-editor" key={o.id}>
            <div className="co-section-line">
              <strong>Package {i + 1}</strong>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Remove ${o.name}`}
                onClick={() =>
                  field(
                    'offers',
                    p.offers.filter((v) => v.id !== o.id),
                  )
                }
              >
                <X size={17} />
              </Button>
            </div>
            <label>
              Package name
              <Input
                required
                value={o.name}
                maxLength={100}
                onChange={(e) =>
                  field(
                    'offers',
                    p.offers.map((v) =>
                      v.id === o.id ? { ...v, name: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <div className="co-form-grid">
              <label>
                Planned monthly price
                <Input
                  type="number"
                  required
                  min={0}
                  max={100000}
                  step={1}
                  value={o.price}
                  onChange={(e) =>
                    field(
                      'offers',
                      p.offers.map((v) =>
                        v.id === o.id
                          ? { ...v, price: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Currency
                <select
                  value={o.currency}
                  onChange={(e) =>
                    field(
                      'offers',
                      p.offers.map((v) =>
                        v.id === o.id ? { ...v, currency: e.target.value } : v,
                      ),
                    )
                  }
                >
                  <option>QAR</option>
                  <option>SAR</option>
                </select>
              </label>
            </div>
            <label>
              Included services
              <Textarea
                required
                maxLength={2000}
                value={o.description}
                onChange={(e) =>
                  field(
                    'offers',
                    p.offers.map((v) =>
                      v.id === o.id ? { ...v, description: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <label>
              Expected reply within (hours)
              <Input
                required
                type="number"
                min={1}
                max={168}
                value={o.responseHours}
                onChange={(e) =>
                  field(
                    'offers',
                    p.offers.map((v) =>
                      v.id === o.id
                        ? { ...v, responseHours: Number(e.target.value) }
                        : v,
                    ),
                  )
                }
              />
            </label>
          </div>
        ))}
        <Button
          type="button"
          className="secondary"
          disabled={p.offers.length >= 10}
          onClick={() =>
            field('offers', [
              ...p.offers,
              {
                id: id(),
                name: '',
                price: 0,
                currency: p.country === 'SA' ? 'SAR' : 'QAR',
                description: '',
                responseHours: 48,
              },
            ])
          }
        >
          <Plus size={17} />
          Add package
        </Button>
        <p className="co-muted">
          Changes apply to new invitations. Existing clients keep their agreed
          package.
        </p>
        <Button disabled={busy} className="primary full" type="submit">
          {busy ? 'Saving…' : saved ? 'Saved' : 'Save profile & packages'}
          <Check size={18} />
        </Button>
      </section>
    </form>
  );
}
function InviteDialog({
  profile,
  busy,
  error,
  onClose,
  onInvite,
}: {
  profile: CoachProfile;
  busy: boolean;
  error: string;
  onClose: () => void;
  onInvite: (b: unknown) => Promise<{ invitePath: string } | null>;
}) {
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [offerId, setOffer] = useState(profile.offers[0]?.id ?? ''),
    [link, setLink] = useState(''),
    [copied, setCopied] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="form-dialog co-dialog">
        <DialogTitle>
          {link ? 'Invitation ready' : 'Invite a client'}
        </DialogTitle>
        <DialogDescription>
          {link
            ? 'Share this link directly with your client. It expires in 14 days.'
            : 'The client must sign in with the email address below.'}
        </DialogDescription>
        {link ? (
          <>
            <label>
              Personal invitation link
              <Input readOnly value={link} onFocus={(e) => e.target.select()} />
            </label>
            <Button
              className="primary full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              <Copy size={17} />
              {copied ? 'Copied' : 'Copy invitation'}
            </Button>
            <p className="co-muted">
              Save the link now. For privacy, it won’t be shown again. No email
              has been sent.
            </p>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await onInvite({
                action: 'invite',
                name,
                email,
                offerId,
              });
              if (r) setLink(location.origin + r.invitePath);
            }}
          >
            <label>
              Client name
              <Input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Client email
              <Input
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Package
              <select
                value={offerId}
                onChange={(e) => setOffer(e.target.value)}
              >
                {profile.offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {money(o.price, o.currency)}/month
                  </option>
                ))}
              </select>
            </label>
            <p className="co-muted">
              This invitation grants unpaid pilot access. No payment details are
              collected.
            </p>
            <ErrorNote text={error} />
            <Button
              type="submit"
              className="primary full"
              disabled={busy || !offerId}
            >
              {busy ? 'Creating…' : 'Create invitation'}
              <ArrowUpRight size={18} />
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function MyCoach({
  onStart,
}: {
  onStart: (routine: Routine, membershipId: string) => void;
}) {
  const c = useCoaching(),
    [selected, setSelected] = useState<string | null>(null);
  if (selected && c.state)
    return (
      <ClientDetail
        memberId={selected}
        userId={c.state.userId}
        onBack={() => {
          setSelected(null);
          void c.reload();
        }}
        onStart={onStart}
      />
    );
  return (
    <div className="co-trainee">
      <div className="co-heading">
        <div>
          <p className="co-overline">YOUR COACHING</p>
          <h1>My coach.</h1>
          <p>Your program, check-ins and conversations.</p>
        </div>
      </div>
      <ErrorNote text={c.error} />
      {!c.state ? (
        <Empty title="Loading coaching">
          <Button onClick={() => void c.reload()}>Retry</Button>
        </Empty>
      ) : !c.state.memberships.length ? (
        <Empty icon={ClipboardList} title="Connect with your coach">
          <p>
            Open your coach’s invitation link to choose your package and
            complete your intake. Your personal tracker remains available.
          </p>
        </Empty>
      ) : (
        <div className="co-membership-grid">
          {c.state.memberships.map((m) => (
            <button
              className="co-card co-membership-card"
              key={m.id}
              onClick={() => setSelected(m.id)}
            >
              <div className="co-section-line">
                <span className="co-badge">
                  {m.status === 'active' ? 'Pilot active' : 'Ended'}
                </span>
                <ChevronRight size={19} />
              </div>
              <h2>{m.coachName}</h2>
              <p>{m.offer.name}</p>
              <span className="co-muted">
                {m.unread
                  ? `${m.unread} unread messages`
                  : 'Program & weekly check-ins'}
              </span>
            </button>
          ))}
        </div>
      )}
      <a className="co-workspace-link" href="/coaching">
        Are you a coach? Open your workspace <ArrowUpRight size={17} />
      </a>
    </div>
  );
}
function ClientDetail({
  memberId,
  userId,
  onBack,
  onStart,
}: {
  memberId: string;
  userId: string;
  onBack: () => void;
  onStart?: (r: Routine, membershipId: string) => void;
}) {
  const [detail, setDetail] = useState<MemberDetail | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('overview'),
    [editing, setEditing] = useState(false),
    [ending, setEnding] = useState(false);
  const editingRevision = useRef(0);
  const serial = useRef(0),
    lock = useRef(false);
  const load = useCallback(async () => {
    const n = ++serial.current;
    try {
      const d = await api<MemberDetail>(
        '?member=' + encodeURIComponent(memberId),
      );
      if (n === serial.current) setDetail(d);
    } catch (e) {
      if (n === serial.current) setError((e as Error).message);
    }
  }, [memberId]);
  useEffect(() => {
    const boot = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 15000);
    return () => {
      clearTimeout(boot);
      clearInterval(timer);
    };
  }, [load]);
  const m = detail?.member,
    isCoach = m?.coach_id === userId;
  useEffect(() => {
    const through = detail?.messages.at(-1)?.created_at;
    if (tab === 'messages' && through)
      void api('', { action: 'read', memberId, through }).catch(() => {});
  }, [tab, memberId, detail?.messages]);
  async function act(body: Record<string, unknown>) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api('', { ...body, memberId });
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!detail || !m)
    return (
      <>
        <Button className="text-button" onClick={onBack}>
          <ArrowLeft size={17} />
          Back
        </Button>
        <ErrorNote text={error} />
        <Empty title="Loading client">
          <Button onClick={() => void load()}>Retry</Button>
        </Empty>
      </>
    );
  return (
    <div className="co-detail">
      <Button className="text-button co-back" onClick={onBack}>
        <ArrowLeft size={17} />
        {isCoach ? 'All clients' : 'My coaches'}
      </Button>
      <div className="co-heading">
        <div>
          <p className="co-overline">
            {isCoach ? 'CLIENT OVERVIEW' : 'YOUR COACH'}
          </p>
          <h1>{isCoach ? m.name : m.coachName}</h1>
          <p>
            {m.offer.name}{' '}
            <span className="co-badge">
              {m.status === 'active' ? 'Unpaid pilot' : m.status}
            </span>
          </p>
        </div>
        {isCoach && m.status === 'active' && (
          <Button
            className="primary"
            onClick={() => {
              editingRevision.current = m.revision;
              setEditing(true);
            }}
          >
            {m.program ? 'Edit program' : 'Assign program'}
            <Plus size={17} />
          </Button>
        )}
      </div>
      <ErrorNote text={error} />
      {m.status !== 'active' ? (
        <Empty
          title={
            m.status === 'invited' ? 'Invitation pending' : 'Coaching ended'
          }
        >
          <p>
            {m.status === 'invited'
              ? `Waiting for ${m.email} to join. Expires ${dateLabel(m.expires_at, true)}.`
              : 'Shared progress, check-ins and messages are no longer accessible. Personal workout and weight records stay with the trainee.'}
          </p>
          {m.status === 'invited' && (
            <Button className="secondary" onClick={() => setEnding(true)}>
              Revoke invitation
            </Button>
          )}
        </Empty>
      ) : (
        <>
          <div className="co-detail-tabs range-switch">
            {[
              ['overview', 'Overview'],
              ['program', 'Program'],
              ['checkins', 'Check-ins'],
              ['messages', `Messages${m.unread ? ' · ' + m.unread : ''}`],
              ['membership', 'Membership'],
            ].map(([v, l]) => (
              <button
                key={v}
                aria-pressed={tab === v}
                onClick={() => setTab(v)}
              >
                {l}
              </button>
            ))}
          </div>
          {tab === 'overview' && (
            <>
              <div className="co-metrics">
                <div>
                  <span>Workouts · last 7 days</span>
                  <strong>{m.stats?.workouts ?? 0}</strong>
                  <small>
                    {m.stats?.lastWorkout
                      ? 'Last session ' + dateLabel(m.stats.lastWorkout)
                      : 'No completed workouts yet'}
                  </small>
                </div>
                <div className="co-metric-accent">
                  <span>Scheduled sessions</span>
                  <strong>
                    {m.stats?.completed ?? 0}
                    <em>/{m.stats?.due ?? 0}</em>
                  </strong>
                  <small>Completed · last 7 calendar days (UTC)</small>
                </div>
                <div>
                  <span>Latest weigh-in</span>
                  <strong>
                    {m.stats?.latestKg?.toFixed(1) ?? '—'}
                    <em> kg</em>
                  </strong>
                  <small>From the client’s shared log</small>
                </div>
              </div>
              <div className="co-detail-grid">
                <section className="co-card">
                  <div className="co-section-line">
                    <h2>Weekly check-in</h2>
                    <ClipboardList size={21} strokeWidth={1.5} />
                  </div>
                  <p>
                    {detail.checkins.some((c) => c.week === weekOf())
                      ? 'This week’s check-in has been submitted.'
                      : isCoach
                        ? 'Waiting for this week’s update.'
                        : 'Share how training has felt this week.'}
                  </p>
                  <Button
                    className="secondary"
                    onClick={() => setTab('checkins')}
                  >
                    {isCoach ? 'Review check-ins' : 'Open check-in'}
                    <ChevronRight size={17} />
                  </Button>
                  <div className="co-divider" />
                  <h3>Current program</h3>
                  <p>{m.program?.title ?? 'No program assigned yet.'}</p>
                  <Button
                    className="text-button"
                    onClick={() => setTab('program')}
                  >
                    View program
                    <ChevronRight size={16} />
                  </Button>
                </section>
                <section className="co-card">
                  <h2>Intake</h2>
                  <dl className="co-intake">
                    <dt>Goals</dt>
                    <dd>{m.intake.goals}</dd>
                    <dt>Training experience</dt>
                    <dd>{m.intake.experience}</dd>
                    <dt>Equipment</dt>
                    <dd>{m.intake.equipment}</dd>
                    <dt>Considerations</dt>
                    <dd>{m.intake.limitations || 'None shared'}</dd>
                    <dt>Availability</dt>
                    <dd>
                      {m.intake.days} days/week ·{' '}
                      {m.intake.country === 'QA' ? 'Qatar' : 'Saudi Arabia'}
                    </dd>
                  </dl>
                </section>
              </div>
              {detail.fitness && <SharedProgress fitness={detail.fitness} />}
            </>
          )}
          {tab === 'program' && (
            <ProgramView
              program={m.program}
              onStart={onStart ? (r) => onStart(r, m.id) : undefined}
            />
          )}{' '}
          {tab === 'checkins' && (
            <Checkins
              items={detail.checkins}
              isCoach={!!isCoach}
              busy={busy}
              act={act}
            />
          )}{' '}
          {tab === 'messages' && (
            <Messages
              messages={detail.messages}
              userId={userId}
              busy={busy}
              responseHours={m.offer.responseHours}
              act={act}
            />
          )}{' '}
          {tab === 'membership' && (
            <section className="co-card co-membership-detail">
              <p className="co-overline">COACHING MEMBERSHIP</p>
              <h2>{m.offer.name}</h2>
              <p className="co-price">
                {money(m.offer.price, m.offer.currency)}
                <small> / month · planned price</small>
              </p>
              <p className="co-preserve">{m.offer.description}</p>
              <p>
                Expected coach response: within {m.offer.responseHours} hours.
              </p>
              <p>
                Joined {m.accepted_at ? dateLabel(m.accepted_at, true) : '—'}
              </p>
              <BillingNote />
              <p className="co-muted">
                Ending coaching immediately stops progress sharing and access to
                coaching conversations. Your personal training log remains
                yours.
              </p>
              <Button
                className="secondary co-danger"
                onClick={() => setEnding(true)}
              >
                End coaching
              </Button>
            </section>
          )}
        </>
      )}
      {editing && (
        <ProgramEditor
          program={m.program}
          busy={busy}
          error={error}
          onClose={() => setEditing(false)}
          onSave={async (p) => {
            if (
              await act({
                action: 'program',
                program: p,
                revision: editingRevision.current,
              })
            ) {
              setEditing(false);
              setTab('program');
            }
          }}
        />
      )}
      <Dialog open={ending} onOpenChange={setEnding}>
        <DialogContent className="form-dialog co-dialog">
          <DialogTitle>
            {m.status === 'invited'
              ? 'Revoke invitation?'
              : 'End this coaching relationship?'}
          </DialogTitle>
          <DialogDescription>
            {m.status === 'invited'
              ? 'The invitation link will stop working.'
              : 'The coach will lose access to shared progress immediately. The trainee keeps their personal workout and weight records. No payment cancellation is needed for this unpaid pilot.'}
          </DialogDescription>
          <Button
            className="primary full"
            disabled={busy}
            onClick={async () => {
              if (await act({ action: 'end' })) {
                setEnding(false);
                onBack();
              }
            }}
          >
            {busy ? 'Ending…' : 'Confirm'}
          </Button>
          <ErrorNote text={error} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
function SharedProgress({ fitness }: { fitness: FitnessData }) {
  const readings = [...fitness.weights].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const points = smoothWeights(readings).slice(-30);
  const low =
      Math.min(...points.map((p) => p.kg), ...points.map((p) => p.trend)) - 0.5,
    high =
      Math.max(...points.map((p) => p.kg), ...points.map((p) => p.trend)) + 0.5;
  const x = (i: number) =>
    points.length < 2 ? 300 : 30 + (i / (points.length - 1)) * 540;
  const y = (v: number) => 160 - ((v - low) / (high - low || 1)) * 125;
  return (
    <section className="co-card co-shared">
      <h2>Shared progress</h2>
      {points.length > 0 && (
        <div className="co-weight-chart">
          <div className="co-section-line">
            <h3>Weight trend</h3>
            <span className="co-muted">
              Last {points.length} weigh-ins · kg
            </span>
          </div>
          <svg
            viewBox="0 0 600 200"
            role="img"
            aria-label="Smoothed weight trend with individual weigh-ins"
          >
            <line x1="30" x2="570" y1="165" y2="165" stroke="var(--line)" />
            {points.map((p, i) => (
              <circle
                key={p.date}
                cx={x(i)}
                cy={y(p.kg)}
                r="3"
                fill="var(--muted)"
                opacity=".5"
              />
            ))}
            <path
              d={points
                .map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.trend)}`)
                .join(' ')}
              fill="none"
              stroke="var(--green)"
              strokeWidth="3"
            />
            <text x="30" y="190" fill="var(--muted)" fontSize="13">
              {dateLabel(points[0].date)}
            </text>
            <text
              x="570"
              y="190"
              fill="var(--muted)"
              fontSize="13"
              textAnchor="end"
            >
              {dateLabel(points.at(-1)!.date)}
            </text>
          </svg>
          <p className="co-muted">
            Trend {points.at(-1)!.trend.toFixed(1)} kg · dots show individual
            readings
          </p>
        </div>
      )}
      <ProgressPanel data={fitness} />
      <details>
        <summary>Weight history · {readings.length} entries</summary>
        <div className="co-history">
          {[...readings]
            .reverse()
            .slice(0, 90)
            .map((w) => (
              <div key={w.date}>
                <span>{dateLabel(w.date, true)}</span>
                <strong>{w.kg.toFixed(1)} kg</strong>
                <span>{w.note}</span>
              </div>
            ))}
        </div>
      </details>
      <h3>Recent workouts</h3>
      {[...fitness.workouts]
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 20)
        .map((w) => (
          <details key={w.id}>
            <summary>
              {w.name} · {dateLabel(w.startedAt)} · {completedSets(w)} sets
            </summary>
            {w.exercises.map((e) => (
              <div key={e.id} className="co-workout-read">
                <strong>{e.name}</strong>
                <span>
                  {e.sets
                    .filter((s) => s.done)
                    .map(
                      (s) =>
                        `${displayWeight(Number(s.kg), e.unit ?? 'kg').toFixed(1)} ${e.unit ?? 'kg'} × ${s.reps}${s.kind === 'warmup' ? ' (warm-up)' : ''}`,
                    )
                    .join(' · ')}
                </span>
              </div>
            ))}
            {w.notes && <p>{w.notes}</p>}
          </details>
        ))}
      {!fitness.workouts.length && (
        <p className="co-muted">Completed workouts will appear here.</p>
      )}
    </section>
  );
}
function ProgramView({
  program,
  onStart,
}: {
  program: Program | null;
  onStart?: (r: Routine) => void;
}) {
  return !program ? (
    <Empty icon={Dumbbell} title="No program assigned yet">
      <p>
        Your coach can build a program with scheduled sessions and exercise
        instructions.
      </p>
    </Empty>
  ) : (
    <div className="co-program">
      <div className="co-section-line">
        <div>
          <h2>{program.title}</h2>
          <p className="co-muted">
            Weekly schedule · starts {dateLabel(program.startDate, true)}
          </p>
        </div>
        <CalendarDays size={25} strokeWidth={1.5} />
      </div>
      {program.notes && <p className="co-program-note">{program.notes}</p>}
      {program.sessions.map((s, i) => (
        <section className="co-card co-session" key={s.id}>
          <div className="co-section-line">
            <div>
              <p className="co-overline">
                {DAYS[s.day]} / SESSION {i + 1}
              </p>
              <h2>{s.name}</h2>
            </div>
            {onStart && (
              <Button className="primary" onClick={() => onStart(s)}>
                Start
                <ArrowUpRight size={17} />
              </Button>
            )}
          </div>
          {s.exercises.map((e, j) => (
            <div className="co-prescription" key={j}>
              <span className="co-prescription-index">
                {String(j + 1).padStart(2, '0')}
              </span>
              <div>
                <strong>{e.name}</strong>
                <span>
                  {e.sets} sets × {e.reps} reps · {e.unit ?? 'kg'}
                </span>
                {e.instructions && <p>{e.instructions}</p>}
                {e.videoUrl && e.videoUrl.startsWith('https://') && (
                  <a
                    href={e.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch demonstration <ArrowUpRight size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
function ProgramEditor({
  program,
  busy,
  error,
  onClose,
  onSave,
}: {
  program: Program | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (p: Program) => Promise<void>;
}) {
  const newExercise = () => ({
    name: '',
    muscle: '',
    sets: 3,
    reps: 10,
    unit: 'kg' as const,
    instructions: '',
    videoUrl: '',
  });
  const [p, setP] = useState<Program>(
    program ?? {
      title: 'Training program',
      notes: '',
      startDate: today(),
      sessions: [
        { id: id(), name: 'Session 1', day: 1, exercises: [newExercise()] },
      ],
    },
  );
  const session = (i: number, patch: Partial<Program['sessions'][number]>) =>
    setP((v) => ({
      ...v,
      sessions: v.sessions.map((s, j) => (i === j ? { ...s, ...patch } : s)),
    }));
  const exercise = (
    i: number,
    j: number,
    patch: Partial<Routine['exercises'][number]>,
  ) =>
    session(i, {
      exercises: p.sessions[i].exercises.map((e, k) =>
        k === j ? { ...e, ...patch } : e,
      ),
    });
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="form-dialog co-dialog co-program-dialog">
        <DialogTitle>
          {program ? 'Edit program' : 'Build a program'}
        </DialogTitle>
        <DialogDescription>
          Assign a weekly schedule. Saving updates the client’s program without
          changing completed workouts.
        </DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave(p);
          }}
        >
          <div className="co-form-grid">
            <label>
              Program title
              <Input
                required
                maxLength={100}
                value={p.title}
                onChange={(e) => setP({ ...p, title: e.target.value })}
              />
            </label>
            <label>
              Start date
              <Input
                type="date"
                required
                value={p.startDate}
                onChange={(e) => setP({ ...p, startDate: e.target.value })}
              />
            </label>
          </div>
          <label>
            Program notes
            <Textarea
              maxLength={2000}
              value={p.notes}
              onChange={(e) => setP({ ...p, notes: e.target.value })}
            />
          </label>
          {p.sessions.map((s, i) => (
            <div key={s.id} className="co-session-editor">
              <div className="co-section-line">
                <h3>Session {i + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Remove session ${i + 1}`}
                  onClick={() =>
                    setP({
                      ...p,
                      sessions: p.sessions.filter((v) => v.id !== s.id),
                    })
                  }
                >
                  <X size={18} />
                </Button>
              </div>
              <div className="co-form-grid">
                <label>
                  Name
                  <Input
                    required
                    maxLength={100}
                    value={s.name}
                    onChange={(e) => session(i, { name: e.target.value })}
                  />
                </label>
                <label>
                  Training day
                  <select
                    value={s.day}
                    onChange={(e) =>
                      session(i, { day: Number(e.target.value) })
                    }
                  >
                    {DAYS.map((d, k) => (
                      <option key={d} value={k}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {s.exercises.map((e, j) => (
                <div className="co-exercise-editor" key={j}>
                  <div className="co-section-line">
                    <strong>Exercise {j + 1}</strong>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Remove exercise ${j + 1}`}
                      onClick={() =>
                        session(i, {
                          exercises: s.exercises.filter((_, k) => k !== j),
                        })
                      }
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  <label>
                    Exercise name
                    <Input
                      required
                      maxLength={100}
                      value={e.name}
                      onChange={(v) => exercise(i, j, { name: v.target.value })}
                      placeholder="e.g. Seated cable row"
                    />
                  </label>
                  <div className="co-form-grid three">
                    <label>
                      Sets
                      <Input
                        required
                        type="number"
                        min={1}
                        max={20}
                        value={e.sets}
                        onChange={(v) =>
                          exercise(i, j, { sets: Number(v.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Reps
                      <Input
                        required
                        type="number"
                        min={1}
                        max={100}
                        value={e.reps}
                        onChange={(v) =>
                          exercise(i, j, { reps: Number(v.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Load unit
                      <select
                        value={e.unit ?? 'kg'}
                        onChange={(v) =>
                          exercise(i, j, {
                            unit: v.target.value as 'kg' | 'lb',
                          })
                        }
                      >
                        <option>kg</option>
                        <option>lb</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Coaching instructions
                    <Input
                      maxLength={1000}
                      value={e.instructions ?? ''}
                      onChange={(v) =>
                        exercise(i, j, { instructions: v.target.value })
                      }
                      placeholder="Tempo, effort, rest or target load"
                    />
                  </label>
                  <label>
                    Demonstration video (optional)
                    <Input
                      type="url"
                      pattern="https://.*"
                      maxLength={1000}
                      value={e.videoUrl ?? ''}
                      onChange={(v) =>
                        exercise(i, j, { videoUrl: v.target.value })
                      }
                      placeholder="https://…"
                    />
                  </label>
                </div>
              ))}
              <Button
                type="button"
                className="secondary"
                disabled={s.exercises.length >= 30}
                onClick={() =>
                  session(i, { exercises: [...s.exercises, newExercise()] })
                }
              >
                <Plus size={17} />
                Add exercise
              </Button>
            </div>
          ))}
          <Button
            type="button"
            className="secondary full"
            disabled={p.sessions.length >= 14}
            onClick={() =>
              setP({
                ...p,
                sessions: [
                  ...p.sessions,
                  {
                    id: id(),
                    name: `Session ${p.sessions.length + 1}`,
                    day: 3,
                    exercises: [newExercise()],
                  },
                ],
              })
            }
          >
            <Plus size={17} />
            Add session
          </Button>
          <ErrorNote text={error} />
          <Button
            className="primary full"
            type="submit"
            disabled={busy || !p.sessions.length}
          >
            {busy ? 'Saving…' : 'Assign program'}
            <Check size={18} />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function Checkins({
  items,
  isCoach,
  busy,
  act,
}: {
  items: Checkin[];
  isCoach: boolean;
  busy: boolean;
  act: (b: Record<string, unknown>) => Promise<boolean>;
}) {
  const [energy, setEnergy] = useState(3),
    [sleep, setSleep] = useState('7'),
    [wins, setWins] = useState(''),
    [challenges, setChallenges] = useState('');
  return (
    <div className="co-checkins">
      {!isCoach && !items.some((c) => c.week === weekOf()) && (
        <form
          className="co-card"
          onSubmit={async (e) => {
            e.preventDefault();
            await act({
              action: 'checkin',
              answers: { energy, sleep: Number(sleep), wins, challenges },
            });
          }}
        >
          <p className="co-overline">
            WEEK OF {dateLabel(weekOf()).toUpperCase()}
          </p>
          <h2>Your weekly check-in</h2>
          <div className="co-form-grid">
            <label>
              Energy this week
              <select
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
              >
                {['Very low', 'Low', 'Okay', 'Good', 'Great'].map((s, i) => (
                  <option key={s} value={i + 1}>
                    {i + 1} · {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Average sleep (hours)
              <Input
                required
                type="number"
                step={0.5}
                min={0}
                max={24}
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
              />
            </label>
          </div>
          <label>
            What went well?
            <Textarea
              maxLength={2000}
              value={wins}
              onChange={(e) => setWins(e.target.value)}
            />
          </label>
          <label>
            Challenges or questions for your coach
            <Textarea
              maxLength={2000}
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
            />
          </label>
          <Button className="primary" disabled={busy} type="submit">
            {busy ? 'Sending…' : 'Submit check-in'}
            <Check size={18} />
          </Button>
        </form>
      )}
      {!items.length && isCoach && (
        <Empty icon={ClipboardList} title="No check-ins yet">
          <p>The client can submit one check-in each week.</p>
        </Empty>
      )}
      {items.map((c) => (
        <CheckinCard
          key={c.id}
          item={c}
          isCoach={isCoach}
          busy={busy}
          act={act}
        />
      ))}
    </div>
  );
}
function CheckinCard({
  item: c,
  isCoach,
  busy,
  act,
}: {
  item: Checkin;
  isCoach: boolean;
  busy: boolean;
  act: (b: Record<string, unknown>) => Promise<boolean>;
}) {
  const [feedback, setFeedback] = useState(c.feedback);
  return (
    <section className="co-card">
      <div className="co-section-line">
        <h2>Week of {dateLabel(c.week)}</h2>
        <span className={'co-badge ' + (c.reviewed_at ? '' : 'amber')}>
          {c.reviewed_at ? 'Reviewed' : 'Awaiting review'}
        </span>
      </div>
      <div className="co-checkin-numbers">
        <span>
          Energy <strong>{c.answers.energy}/5</strong>
        </span>
        <span>
          Sleep <strong>{c.answers.sleep} hours</strong>
        </span>
      </div>
      <h3>Wins</h3>
      <p className="co-preserve">{c.answers.wins || 'No notes'}</p>
      <h3>Challenges & questions</h3>
      <p className="co-preserve">{c.answers.challenges || 'No notes'}</p>
      {c.reviewed_at ? (
        <div className="co-feedback">
          <strong>Coach feedback</strong>
          <p className="co-preserve">{c.feedback}</p>
        </div>
      ) : isCoach ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await act({ action: 'feedback', checkinId: c.id, feedback });
          }}
        >
          <label>
            Your feedback
            <Textarea
              required
              maxLength={4000}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </label>
          <Button className="primary" type="submit" disabled={busy}>
            Send feedback & mark reviewed
            <Check size={17} />
          </Button>
        </form>
      ) : (
        <p className="co-muted">Your coach will review this update.</p>
      )}
    </section>
  );
}
function Messages({
  messages,
  userId,
  busy,
  responseHours,
  act,
}: {
  messages: MemberDetail['messages'];
  userId: string;
  busy: boolean;
  responseHours: number;
  act: (b: Record<string, unknown>) => Promise<boolean>;
}) {
  const [body, setBody] = useState('');
  const pendingId = useRef(id());
  return (
    <section className="co-card co-messages">
      <div className="co-section-line">
        <div>
          <h2>Conversation</h2>
          <p className="co-muted">
            Coach replies within {responseHours} hours. Updates refresh while
            this page is open.
          </p>
        </div>
        <MessageCircle size={25} strokeWidth={1.5} />
      </div>
      <div className="co-message-list" aria-live="polite">
        {!messages.length && (
          <p className="co-muted">
            Start a conversation about the training program.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={'co-message ' + (m.sender_id === userId ? 'mine' : '')}
          >
            <p>{m.body}</p>
            <small>
              {m.sender_id === userId ? 'You' : 'Coaching partner'} ·{' '}
              {new Date(m.created_at).toLocaleString('en-GB', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </small>
          </div>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act({ action: 'message', id: pendingId.current, body })) {
            setBody('');
            pendingId.current = id();
          }
        }}
      >
        <label htmlFor="co-message-input">Message</label>
        <Textarea
          id="co-message-input"
          required
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
        />
        <Button
          className="primary"
          type="submit"
          disabled={busy || !body.trim()}
        >
          {busy ? 'Sending…' : 'Send message'}
          <ArrowUpRight size={17} />
        </Button>
      </form>
    </section>
  );
}
export function JoinCoaching() {
  const [token, setToken] = useState(''),
    [offer, setOffer] = useState<{
      coach: CoachProfile;
      offer: Member['offer'];
      name: string;
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [joined, setJoined] = useState(false),
    [consent, setConsent] = useState(false);
  const [intake, setIntake] = useState<Intake>({
    goals: '',
    experience: '',
    equipment: '',
    limitations: '',
    days: 3,
    country: 'QA',
  });
  useEffect(() => {
    const boot = setTimeout(() => {
      const t =
        new URL(location.href).searchParams.get('invite') ??
        location.hash.slice(1);
      setToken(t);
      if (!t) {
        setError('Open the full invitation link provided by your coach.');
        return;
      }
      void api<typeof offer>('?invite=' + encodeURIComponent(t))
        .then(setOffer)
        .catch((e) => setError(e.message));
    }, 0);
    return () => clearTimeout(boot);
  }, []);
  return (
    <main className="co-join">
      <a href="/" className="co-logo">
        form<span>®</span>
      </a>
      {joined ? (
        <Empty icon={Check} title="You’re connected">
          <p>Your coach can now review your intake and assign a program.</p>
          <a className="co-anchor-button" href="/?view=coach">
            Open My coach <ArrowUpRight size={18} />
          </a>
        </Empty>
      ) : (
        <>
          <ErrorNote text={error} />
          {offer && (
            <>
              <div className="co-heading">
                <div>
                  <p className="co-overline">YOUR INVITATION</p>
                  <h1>
                    Train with
                    <br />
                    {offer.coach.name}.
                  </h1>
                  <p>{offer.coach.bio}</p>
                </div>
              </div>
              <div className="co-card">
                <span className="co-badge">Unpaid pilot</span>
                <h2>{offer.offer.name}</h2>
                <p className="co-preserve">{offer.offer.description}</p>
                <p>
                  {money(offer.offer.price, offer.offer.currency)}/month planned
                  · no charge during this pilot
                </p>
                <p className="co-muted">
                  Coach replies within {offer.offer.responseHours} hours.
                </p>
              </div>
              <form
                className="co-card"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy) return;
                  setBusy(true);
                  setError('');
                  try {
                    await api('', { action: 'accept', token, intake, consent });
                    setJoined(true);
                    history.replaceState(null, '', '/join');
                  } catch (err) {
                    setError((err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h2>Tell your coach about you</h2>
                <p className="co-muted">
                  Your answers and saved workout and weight history will be
                  shared only after you agree below.
                </p>
                <label>
                  Your goals
                  <Textarea
                    required
                    maxLength={2000}
                    value={intake.goals}
                    onChange={(e) =>
                      setIntake({ ...intake, goals: e.target.value })
                    }
                  />
                </label>
                <label>
                  Training experience
                  <Input
                    required
                    maxLength={500}
                    value={intake.experience}
                    onChange={(e) =>
                      setIntake({ ...intake, experience: e.target.value })
                    }
                  />
                </label>
                <label>
                  Available equipment
                  <Input
                    required
                    maxLength={500}
                    value={intake.equipment}
                    onChange={(e) =>
                      setIntake({ ...intake, equipment: e.target.value })
                    }
                  />
                </label>
                <div className="co-form-grid">
                  <label>
                    Training days per week
                    <Input
                      required
                      type="number"
                      min={1}
                      max={7}
                      value={intake.days}
                      onChange={(e) =>
                        setIntake({ ...intake, days: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Country
                    <select
                      value={intake.country}
                      onChange={(e) =>
                        setIntake({
                          ...intake,
                          country: e.target.value as 'QA' | 'SA',
                        })
                      }
                    >
                      <option value="QA">Qatar</option>
                      <option value="SA">Saudi Arabia</option>
                    </select>
                  </label>
                </div>
                <label>
                  Limitations or preferences (optional)
                  <Textarea
                    maxLength={2000}
                    value={intake.limitations}
                    onChange={(e) =>
                      setIntake({ ...intake, limitations: e.target.value })
                    }
                  />
                </label>
                <label className="co-consent">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I agree to share my intake, existing and future workout and
                    weight history, check-ins and messages with{' '}
                    {offer.coach.name}. I can stop sharing by ending coaching.
                    This pilot does not charge me or renew automatically.
                  </span>
                </label>
                <ErrorNote text={error} />
                <Button
                  className="primary full"
                  type="submit"
                  disabled={busy || !consent}
                >
                  {busy ? 'Joining…' : 'Agree & join pilot'}
                  <ArrowUpRight size={18} />
                </Button>
              </form>
            </>
          )}
        </>
      )}
    </main>
  );
}
