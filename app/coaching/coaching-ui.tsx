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
  X,
  Dumbbell,
  Wallet,
  Search,
  Bell,
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
  type MarketplaceCoach,
  memberStatus,
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
import { ExercisePicker } from '../workout-panel';
import ExerciseVideo from '../exercise-video';
import { exerciseVideo } from '@/lib/video';
import ProgressPanel from '../progress-panel';
import ThemeControl from '../theme-control';
import { useCoachingTransport } from './transport';
import './coaching.css';
/* oxlint-disable nextjs/no-html-link-for-pages, jsx-a11y/prefer-tag-over-role */
const money = (price: number, currency: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
function useCoaching() {
  const api = useCoachingTransport();
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
  }, [api]);
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
    [filter, setFilter] = useState(''),
    [attention, setAttention] = useState(false);
  const state = c.state,
    clients = state?.clients ?? [],
    active = clients.filter((m) => m.status === 'active'),
    needs = (m: Member) =>
      m.status === 'requested' ||
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
            Clients & requests
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
          <a href="/simulate">
            <ClipboardList size={20} strokeWidth={1.5} />
            Try a simulation
          </a>
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
                <p>
                  Set up your profile and packages, then list your services in
                  the Marketplace.
                </p>
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
                <p>
                  Define your packages and choose when to appear in the
                  Marketplace.
                </p>
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
                    ? `${active.length} active client${active.length === 1 ? '' : 's'}. ${clients.filter(needs).length} need attention.`
                    : 'Your next coaching relationship starts here.'}
                </p>
              </div>
              <Button
                className="primary"
                onClick={() => setSection('offering')}
                disabled={!state.profile.offers.length}
              >
                Manage listing{' '}
                <span className="button-orb">
                  <Plus size={18} />
                </span>
              </Button>
            </div>
            {clients.some((m) => m.status === 'requested') && (
              <div className="co-notification" role="status">
                <ClipboardList size={22} />
                <div>
                  <strong>
                    {clients.filter((m) => m.status === 'requested').length} new
                    coaching request(s)
                  </strong>
                  <p>
                    Review the trainee’s intake, then accept or decline.
                    Membership starts after payment.
                  </p>
                </div>
                <Button
                  className="secondary"
                  onClick={() => {
                    setAttention(true);
                  }}
                >
                  Review requests
                </Button>
              </div>
            )}
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
                  {clients.filter(needs).length.toString().padStart(2, '0')}
                </strong>
                <small>Check-ins, messages & missed sessions</small>
              </button>
              <button onClick={() => setAttention(false)}>
                <span>New requests</span>
                <strong>
                  {clients
                    .filter((m) => m.status === 'requested')
                    .length.toString()
                    .padStart(2, '0')}
                </strong>
                <small>Awaiting your decision</small>
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
                    : 'Your first request starts in the Marketplace'
                }
              >
                <p>
                  {clients.length
                    ? 'Try another name or view all clients.'
                    : 'List your packages so trainees can find you. New requests appear here for you to accept or decline.'}
                </p>
                {!clients.length && (
                  <Button
                    className="secondary"
                    onClick={() => setSection('offering')}
                    disabled={!state.profile.offers.length}
                  >
                    Manage listing <Plus size={17} />
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
                          {memberStatus(m.status)}
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
      </main>
    </div>
  );
}
function BillingNote() {
  return (
    <div className="co-billing-note">
      <Wallet size={20} strokeWidth={1.5} />
      <div>
        <strong>Payment setup pending</strong>
        <p>
          Trainees can request packages and coaches can review them. Accepted
          requests remain pending payment. Checkout and payouts are not
          connected yet.
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
        <label className="co-consent">
          <input
            type="checkbox"
            checked={p.listed ?? false}
            onChange={(e) => field('listed', e.target.checked)}
          />
          <span>
            List my profile and packages in the Marketplace. Packages must have
            a price greater than zero.
          </span>
        </label>
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
          Clients see this profile in the Marketplace when you list your
          services.
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
                Monthly package price
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
          Changes apply to new requests. Existing requests keep their agreed
          package and price.
        </p>
        <Button disabled={busy} className="primary full" type="submit">
          {busy ? 'Saving…' : saved ? 'Saved' : 'Save profile & packages'}
          <Check size={18} />
        </Button>
      </section>
    </form>
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
          <p>Your requests, memberships and conversations.</p>
        </div>
      </div>
      <ErrorNote text={c.error} />
      {c.state?.memberships.some((m) => m.status === 'awaiting_payment') && (
        <div className="co-notification" role="status">
          <Check size={22} />
          <div>
            <strong>Your coaching request has been accepted</strong>
            <p>Open the request to review your package and payment status.</p>
          </div>
        </div>
      )}
      {!c.state ? (
        <Empty title="Loading coaching">
          <Button onClick={() => void c.reload()}>Retry</Button>
        </Empty>
      ) : !c.state.memberships.length ? (
        <Empty icon={ClipboardList} title="Find your coach">
          <p>
            Browse the Marketplace, choose a coach and request a package. Once
            accepted, payment starts your membership.
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
                <span className="co-badge">{memberStatus(m.status)}</span>
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
  const api = useCoachingTransport();
  const [detail, setDetail] = useState<MemberDetail | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('overview'),
    [editing, setEditing] = useState(false),
    [ending, setEnding] = useState(false),
    [weightHistory, setWeightHistory] = useState(false);
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
  }, [memberId, api]);
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
  }, [tab, memberId, detail?.messages, api]);
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
            <span className="co-badge">{memberStatus(m.status)}</span>
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
        <RequestStatus member={m} isCoach={!!isCoach} busy={busy} act={act} />
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
                <button
                  type="button"
                  className="co-weight-metric"
                  onClick={() => setWeightHistory(true)}
                >
                  <span>Weekly average weight</span>
                  <strong>
                    {m.stats?.averageKg?.toFixed(1) ?? '—'}
                    <em> kg</em>
                  </strong>
                  <small>
                    {m.stats?.weightCount ?? 0} weigh-ins · this week, Mon–Sun
                    (UTC)
                  </small>
                  <small className="co-weight-action">
                    View all entries <ChevronRight size={14} />
                  </small>
                </button>
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
      <Dialog
        open={weightHistory && m.status === 'active'}
        onOpenChange={setWeightHistory}
      >
        <DialogContent className="form-dialog co-dialog">
          <DialogTitle>{m.name} · Weight history</DialogTitle>
          <DialogDescription>
            All shared daily weigh-ins, newest first. The overview averages
            entries from this Monday through today (UTC).
          </DialogDescription>
          <div className="co-history co-weight-history">
            {[...(detail.fitness?.weights ?? [])]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((w) => (
                <div key={w.date}>
                  <span>{dateLabel(w.date, true)}</span>
                  <strong>{w.kg.toFixed(1)} kg</strong>
                  <span>{w.note}</span>
                </div>
              ))}
            {!detail.fitness?.weights.length && (
              <p className="co-muted">No weigh-ins shared yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
          {[...readings].reverse().map((w) => (
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
                {e.videoUrl && <ExerciseVideo url={e.videoUrl} name={e.name} />}
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
  const [picker, setPicker] = useState<{
    sessionId: string;
    index?: number;
  } | null>(null);
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
      sessions: [{ id: id(), name: 'Session 1', day: 1, exercises: [] }],
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
                  <button
                    type="button"
                    className="co-exercise-choice"
                    onClick={() => setPicker({ sessionId: s.id, index: j })}
                  >
                    <Dumbbell size={20} />
                    <span>
                      <strong>{e.name || 'Choose exercise'}</strong>
                      <small>
                        {e.muscle || 'Exercise library'} · Change exercise
                      </small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
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
                      placeholder="YouTube, Vimeo or direct video URL"
                    />
                  </label>
                  {e.videoUrl && (
                    <ExerciseVideo url={e.videoUrl} name={e.name} />
                  )}
                </div>
              ))}
              {!s.exercises.length && (
                <p className="co-muted">
                  Choose exercises from the library to build this session.
                </p>
              )}
              <Button
                type="button"
                className="secondary"
                disabled={s.exercises.length >= 30}
                onClick={() => setPicker({ sessionId: s.id })}
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
                    exercises: [],
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
            disabled={
              busy ||
              !p.sessions.length ||
              p.sessions.some(
                (s) =>
                  !s.exercises.length ||
                  s.exercises.some(
                    (e) =>
                      !e.name.trim() ||
                      (!!e.videoUrl && !exerciseVideo(e.videoUrl)),
                  ),
              )
            }
          >
            {busy ? 'Saving…' : 'Assign program'}
            <Check size={18} />
          </Button>
        </form>
        <ExercisePicker
          open={!!picker}
          onClose={() => setPicker(null)}
          onPick={(name, muscle) => {
            if (!picker) return;
            setP((v) => ({
              ...v,
              sessions: v.sessions.map((s) =>
                s.id !== picker.sessionId
                  ? s
                  : {
                      ...s,
                      exercises:
                        picker.index === undefined
                          ? [...s.exercises, { ...newExercise(), name, muscle }]
                          : s.exercises.map((e, j) =>
                              j === picker.index
                                ? {
                                    ...e,
                                    name,
                                    muscle,
                                    instructions: '',
                                    videoUrl: '',
                                  }
                                : e,
                            ),
                    },
              ),
            }));
            setPicker(null);
          }}
        />
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
function RequestStatus({
  member: m,
  isCoach,
  busy,
  act,
}: {
  member: Member;
  isCoach: boolean;
  busy: boolean;
  act: (b: Record<string, unknown>) => Promise<boolean>;
}) {
  const [note, setNote] = useState(''),
    [decision, setDecision] = useState<'accept' | 'reject' | null>(null),
    [withdraw, setWithdraw] = useState(false);
  const open = m.status === 'requested' || m.status === 'awaiting_payment';
  return (
    <section className="co-card">
      <span className="co-badge">{memberStatus(m.status)}</span>
      <h2 style={{ marginTop: 20 }}>{m.offer.name}</h2>
      <p className="co-price">
        {money(m.offer.price, m.offer.currency)}
        <small> / month</small>
      </p>
      <p className="co-preserve">{m.offer.description}</p>
      <div className="co-request-steps">
        <span className="done">1 · Request sent</span>
        <span className={m.status === 'awaiting_payment' ? 'done' : ''}>
          2 · Coach review
        </span>
        <span>3 · Payment</span>
        <span>4 · Membership starts</span>
      </div>
      {open && (
        <>
          <h3>Training goals</h3>
          <p className="co-preserve">{m.intake.goals}</p>
          <dl className="co-intake">
            <dt>Experience & equipment</dt>
            <dd>
              {m.intake.experience} · {m.intake.equipment}
            </dd>
            <dt>Availability</dt>
            <dd>
              {m.intake.days} days/week ·{' '}
              {m.intake.country === 'QA' ? 'Qatar' : 'Saudi Arabia'}
            </dd>
            <dt>Considerations</dt>
            <dd>{m.intake.limitations || 'None shared'}</dd>
          </dl>
          <p className="co-muted">
            Workout and weight history are not shared until membership starts
            after payment.
          </p>
        </>
      )}
      {m.decision_note && (
        <div className="co-feedback">
          <strong>Coach’s response</strong>
          <p>{m.decision_note}</p>
        </div>
      )}
      {m.status === 'requested' &&
        (isCoach ? (
          <>
            <label>
              Response to trainee (optional)
              <Textarea
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="co-actions">
              <Button
                className="primary"
                disabled={busy}
                onClick={() => setDecision('accept')}
              >
                Accept request
                <Check size={17} />
              </Button>
              <Button
                className="secondary"
                disabled={busy}
                onClick={() => setDecision('reject')}
              >
                Decline
              </Button>
            </div>
          </>
        ) : (
          <p>
            Your coach is reviewing your request. Their decision will appear
            here.
          </p>
        ))}
      {m.status === 'awaiting_payment' && (
        <div className="co-payment-gate">
          <Wallet size={24} />
          <h3>
            {isCoach
              ? 'Accepted · waiting for trainee payment'
              : 'Your coach accepted your request'}
          </h3>
          <p>
            {isCoach
              ? 'The client must pay before coaching begins.'
              : 'Pay ' +
                money(m.offer.price, m.offer.currency) +
                ' to start your membership once checkout is available.'}
          </p>
          <Button className="primary" disabled>
            Payment setup pending
          </Button>
          <p className="co-muted">
            Checkout is not connected yet. No charge has been made and
            membership has not started.
          </p>
        </div>
      )}
      {!isCoach && open && (
        <Button
          className="text-button co-danger"
          disabled={busy}
          onClick={() => setWithdraw(true)}
        >
          Withdraw request
        </Button>
      )}
      {m.status === 'rejected' && (
        <p>
          The coach declined this request. You can choose another coach or
          package in the Marketplace.
        </p>
      )}
      {m.status === 'withdrawn' && (
        <p>This request was withdrawn. No membership started.</p>
      )}
      {m.status === 'invited' && (
        <p>
          Invitations have been retired. Trainees now choose a package through
          the Marketplace.
        </p>
      )}
      {m.status === 'ended' && (
        <p>Coaching has ended. Shared progress is no longer accessible.</p>
      )}
      <Dialog
        open={!!decision || withdraw}
        onOpenChange={(v) => {
          if (!v) {
            setDecision(null);
            setWithdraw(false);
          }
        }}
      >
        <DialogContent className="form-dialog co-dialog">
          <DialogTitle>
            {withdraw
              ? 'Withdraw this request?'
              : decision === 'accept'
                ? 'Accept this coaching request?'
                : 'Decline this coaching request?'}
          </DialogTitle>
          <DialogDescription>
            {withdraw
              ? 'This cancels the request without starting a membership.'
              : decision === 'accept'
                ? 'The trainee will see your acceptance in the app. Membership stays pending until payment is verified.'
                : 'The trainee will see your decision and optional response in the app.'}
          </DialogDescription>
          <Button
            className="primary full"
            disabled={busy}
            onClick={async () => {
              if (
                await act(
                  withdraw
                    ? { action: 'withdraw' }
                    : { action: 'decision', decision, note },
                )
              ) {
                setDecision(null);
                setWithdraw(false);
              }
            }}
          >
            {busy ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function Marketplace({ onRequests }: { onRequests: () => void }) {
  const api = useCoachingTransport();
  const [coaches, setCoaches] = useState<MarketplaceCoach[] | null>(null),
    [error, setError] = useState(''),
    [search, setSearch] = useState(''),
    [country, setCountry] = useState(''),
    [selected, setSelected] = useState<{
      coach: MarketplaceCoach;
      offer: Member['offer'];
    } | null>(null),
    [success, setSuccess] = useState(false);
  const reload = useCallback(async () => {
    try {
      const r = await api<{ coaches: MarketplaceCoach[] }>('?marketplace=1');
      setCoaches(r.coaches);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api]);
  useEffect(() => {
    const boot = setTimeout(() => void reload(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void reload();
    }, 30000);
    return () => {
      clearTimeout(boot);
      clearInterval(timer);
    };
  }, [reload]);
  const visible = coaches?.filter(
    (c) =>
      (!country || c.country === country) &&
      (c.name + ' ' + c.specialties + ' ' + c.bio)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="co-marketplace">
      <div className="co-heading">
        <div>
          <p className="co-overline">COACHING MARKETPLACE</p>
          <h1>Find your coach.</h1>
          <p>
            Explore their approach, choose a package and request to train
            together.
          </p>
        </div>
        <Button className="secondary" onClick={onRequests}>
          My requests
          <ChevronRight size={17} />
        </Button>
      </div>
      <ErrorNote text={error} />
      {success && (
        <div className="co-notification" role="status">
          <Check size={22} />
          <div>
            <strong>Request sent to your coach</strong>
            <p>
              Track their decision in My coach. You’ll pay after acceptance.
            </p>
          </div>
          <Button className="secondary" onClick={onRequests}>
            View request
          </Button>
        </div>
      )}
      <div className="co-list-toolbar">
        <label className="co-search">
          <Search size={18} />
          <Input
            aria-label="Search coaches"
            placeholder="Coach or specialty"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Coach country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="">All locations</option>
          <option value="QA">Qatar</option>
          <option value="SA">Saudi Arabia</option>
        </select>
      </div>
      {!coaches ? (
        <Empty title="Loading coaches">
          <Button onClick={() => void reload()}>Retry</Button>
        </Empty>
      ) : !visible?.length ? (
        <Empty
          title={
            coaches.length ? 'No matching coaches' : 'Coaches will appear here'
          }
        >
          <p>
            {coaches.length
              ? 'Try another search or location.'
              : 'Coaches can list their profile and packages from their workspace.'}
          </p>
          <a className="co-workspace-link" href="/coaching">
            Open coach workspace
            <ArrowUpRight size={17} />
          </a>
        </Empty>
      ) : (
        <div className="co-market-grid">
          {visible.map((c) => (
            <section key={c.coachId} className="co-card co-coach-listing">
              <div className="co-section-line">
                <span className="co-initials">
                  {c.name
                    .split(' ')
                    .map((v) => v[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <span className="co-badge">
                  {c.country === 'QA' ? 'Qatar' : 'Saudi Arabia'}
                </span>
              </div>
              <h2>{c.name}</h2>
              <p className="co-specialties">{c.specialties}</p>
              <p>{c.bio}</p>
              <div className="co-package-list">
                {c.offers.map((o) => (
                  <div key={o.id}>
                    <div className="co-section-line">
                      <h3>{o.name}</h3>
                      <strong>
                        {money(o.price, o.currency)}
                        <small> / month</small>
                      </strong>
                    </div>
                    <p className="co-preserve">{o.description}</p>
                    <p className="co-muted">
                      Coach responds within {o.responseHours} hours.
                    </p>
                    <Button
                      className="primary full"
                      onClick={() => {
                        setSuccess(false);
                        setSelected({ coach: c, offer: o });
                      }}
                    >
                      Request package
                      <ArrowUpRight size={17} />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {selected && (
        <PackageRequest
          coach={selected.coach}
          offer={selected.offer}
          onClose={() => setSelected(null)}
          onSent={() => {
            setSelected(null);
            setSuccess(true);
          }}
        />
      )}
    </div>
  );
}
function PackageRequest({
  coach,
  offer,
  onClose,
  onSent,
}: {
  coach: MarketplaceCoach;
  offer: Member['offer'];
  onClose: () => void;
  onSent: () => void;
}) {
  const api = useCoachingTransport();
  const [name, setName] = useState(''),
    [intake, setIntake] = useState<Intake>({
      goals: '',
      experience: '',
      equipment: '',
      limitations: '',
      days: 3,
      country: 'QA',
    }),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="form-dialog co-dialog">
        <DialogTitle>Request {offer.name}</DialogTitle>
        <DialogDescription>
          {coach.name} · {money(offer.price, offer.currency)}/month. Your coach
          reviews the request first. Payment is required after acceptance to
          start membership.
        </DialogDescription>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setError('');
            try {
              await api('', {
                action: 'request',
                coachId: coach.coachId,
                profileRevision: coach.revision,
                offerId: offer.id,
                name,
                intake,
                consent,
              });
              onSent();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
              lock.current = false;
            }
          }}
        >
          <label>
            Your name
            <Input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Training goals
            <Textarea
              required
              maxLength={2000}
              value={intake.goals}
              onChange={(e) => setIntake({ ...intake, goals: e.target.value })}
            />
          </label>
          <label>
            Experience
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
            Equipment
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
              Days per week
              <Input
                type="number"
                required
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
            Considerations (optional)
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
              I agree to share this intake with {coach.name} for review. If
              accepted, my existing and future workout and weight history will
              be shared only after payment starts membership. I can end coaching
              to stop sharing.
            </span>
          </label>
          <p className="co-muted">
            Payments are not connected yet. You can submit a request, but
            accepted requests will wait for payment setup.
          </p>
          <ErrorNote text={error} />
          <Button
            className="primary full"
            type="submit"
            disabled={busy || !consent}
          >
            {busy ? 'Sending…' : 'Send coaching request'}
            <ArrowUpRight size={17} />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CoachingNotice({ onOpen }: { onOpen: () => void }) {
  const api = useCoachingTransport();
  const [counts, setCounts] = useState({ reviews: 0, payments: 0 });
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const n = await api<{ reviews: number; payments: number }>(
          '?notifications=1',
        );
        if (alive) setCounts(n);
      } catch {}
    };
    void check();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [api]);
  return (
    <>
      {counts.reviews > 0 && (
        <a
          className="co-notice-button"
          href="/coaching"
          aria-label={`${counts.reviews} new coaching requests`}
          title="New coaching requests"
        >
          <Bell size={17} />
          <span>{counts.reviews}</span>
        </a>
      )}
      {counts.payments > 0 && (
        <button
          className="co-notice-button"
          onClick={onOpen}
          aria-label={`${counts.payments} accepted requests awaiting payment`}
          title="Your coach accepted your request"
        >
          <Bell size={17} />
          <span>{counts.payments}</span>
        </button>
      )}
    </>
  );
}
