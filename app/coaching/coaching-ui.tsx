'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowLeft,
  Users,
  Plus,
  Check,
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
  type Member,
  type MemberDetail,
  type CoachProfile,
  type Program,
  type WorkoutTemplate,
  templateRoutine,
  sessionFromTemplate,
  isTemplateRoutine,
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
import ExerciseThumbnail, { ExerciseCredits } from '../exercise-thumbnail';
import Nutrition from './nutrition';
import Steps from './steps';
import { Conversation } from './conversation';
import {
  memberStatusLabel,
  weekdayLabel,
  muscleLabel,
} from '@/lib/i18n/ui-labels';
import WeightComparison, { weightChange } from './weight-comparison';
import VideoUpload from '../video-upload';
import { ExercisePicker } from '../workout-panel';
import ExerciseVideo from '../exercise-video';
import { exerciseVideo } from '@/lib/video';
import ProgressPanel from '../progress-panel';
import PreferencesMenu from './preferences-menu';
import { useI18n } from '../i18n';
import { useCoachingTransport } from './transport';
import { Wordmark } from '../wordmark';
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
function WeeklyChange({ value }: { value: number | null | undefined }) {
  const { t } = useI18n();
  if (value == null)
    return (
      <strong className="co-metric-change flat" title={t('mycoach.noCompare')}>
        —
      </strong>
    );
  const flat = Math.abs(value) < 0.05;
  return (
    <strong
      className={`co-metric-change ${flat ? 'flat' : value > 0 ? 'up' : 'down'}`}
      aria-label={weightChange(value, t)}
    >
      {flat ? '0.0' : `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`}
      <em> kg</em>
    </strong>
  );
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
  const { t } = useI18n();
  const c = useCoaching();
  const [section, setSection] = useState<'clients' | 'offering' | 'templates'>(
      'clients',
    ),
    [selected, setSelected] = useState<string | null>(null),
    [filter, setFilter] = useState(''),
    [view, setView] = useState<'all' | 'attention' | 'requests'>('all');
  const state = c.state,
    clients = state?.clients ?? [],
    active = clients.filter((m) => m.status === 'active'),
    // Total places across packages with a client limit, if the coach set any.
    limited = (state?.profile?.offers ?? []).filter((o) => o.capacity),
    placesNote = limited.length
      ? t('coachWeb.places', {
          used: clients.filter(
            (m) =>
              limited.some((o) => o.id === m.offer.id) &&
              ['requested', 'awaiting_payment', 'active'].includes(m.status),
          ).length,
          total: limited.reduce((n, o) => n + (o.capacity ?? 0), 0),
        })
      : null,
    needs = (m: Member) =>
      m.status === 'requested' ||
      m.unread > 0 ||
      m.pending > 0 ||
      (m.stats?.due ?? 0) > (m.stats?.completed ?? 0);
  const visible = clients.filter(
    (m) =>
      (view === 'all'
        ? true
        : view === 'attention'
          ? needs(m)
          : m.status === 'requested') &&
      (m.name + ' ' + m.email).toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <div className="co-shell">
      <aside className="co-sidebar">
        <a className="co-logo" href="/" aria-label={t('coach.home')}>
          <Wordmark height={22} />
        </a>
        <span className="co-overline">{t('coach.workspace')}</span>
        <nav>
          <button
            aria-current={section === 'clients' ? 'page' : undefined}
            onClick={() => {
              setSection('clients');
              setSelected(null);
            }}
          >
            <Users size={20} strokeWidth={1.5} />
            {t('coach.clients')}
          </button>
          <button
            aria-current={section === 'offering' ? 'page' : undefined}
            onClick={() => {
              setSection('offering');
              setSelected(null);
            }}
          >
            <Wallet size={20} strokeWidth={1.5} />
            {t('coach.profile')}
          </button>
          <button
            aria-current={section === 'templates' ? 'page' : undefined}
            onClick={() => {
              setSection('templates');
              setSelected(null);
            }}
          >
            <ClipboardList size={20} strokeWidth={1.5} />
            {t('coach.templates')}
          </button>
        </nav>
        <div className="co-sidebar-bottom">
          <PreferencesMenu />
          <span className="co-pilot">{t('coach.pilot')}</span>
        </div>
      </aside>
      <main className="co-main">
        <header className="co-topbar">
          <a href="/" className="co-mobile-brand" aria-label={t('coach.home')}>
            <Wordmark height={18} />
          </a>
          <span>
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </header>
        <ErrorNote text={c.error} />
        {!state ? (
          <Empty title={t('coachWeb.loadingWorkspace')}>
            <Button onClick={() => void c.reload()}>
              {t('mycoach.retry')}
            </Button>
          </Empty>
        ) : !state.profile ? (
          <>
            <div className="co-heading">
              <div>
                <p className="co-overline">{t('coachWeb.business')}</p>
                <h1>
                  {t('coachWeb.welcomeFirst')}
                  <br />
                  {t('coachWeb.welcomeSecond')}
                </h1>
                <p>{t('coachWeb.setupIntro')}</p>
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
        ) : section === 'templates' ? (
          <TemplateLibrary />
        ) : section === 'offering' ? (
          <>
            <div className="co-heading">
              <div>
                <p className="co-overline">{t('coachWeb.offering')}</p>
                <h1>{t('coachWeb.profileTitle')}</h1>
                <p>{t('coachWeb.offeringIntro')}</p>
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
                <h1>{t('coachWeb.clientsTitle')}</h1>
                <p>
                  {active.length
                    ? t('coachWeb.activeSummary', {
                        active: active.length,
                        attention: clients.filter(needs).length,
                      })
                    : t('coachWeb.clientsIntro')}
                </p>
              </div>
              <Button
                className="primary"
                onClick={() => setSection('offering')}
                disabled={!state.profile.offers.length}
              >
                {t('coachWeb.listing')}{' '}
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
                    {t('coachWeb.requestCount', {
                      count: clients.filter((m) => m.status === 'requested')
                        .length,
                    })}
                  </strong>
                  <p>{t('coachWeb.reviewIntro')}</p>
                </div>
                <Button
                  className="secondary"
                  onClick={() => setView('requests')}
                >
                  {t('coachWeb.reviewRequests')}
                </Button>
              </div>
            )}
            <div className="co-metrics">
              <button
                aria-pressed={view === 'all'}
                onClick={() => setView('all')}
              >
                <span>{t('coachWeb.activeClients')}</span>
                <strong>{active.length.toString().padStart(2, '0')}</strong>
                <small>{placesNote ?? t('coachWeb.relationships')}</small>
              </button>
              <button
                aria-pressed={view === 'attention'}
                onClick={() => setView('attention')}
              >
                <span>{t('coachWeb.attention')}</span>
                <strong>
                  {clients.filter(needs).length.toString().padStart(2, '0')}
                </strong>
                <small>{t('coachWeb.attentionHint')}</small>
              </button>
              <button
                aria-pressed={view === 'requests'}
                onClick={() => setView('requests')}
              >
                <span>{t('coachWeb.newRequests')}</span>
                <strong>
                  {clients
                    .filter((m) => m.status === 'requested')
                    .length.toString()
                    .padStart(2, '0')}
                </strong>
                <small>{t('coachWeb.awaitingDecision')}</small>
              </button>
            </div>
            <div className="co-list-toolbar">
              <div className="range-switch">
                <button
                  aria-pressed={view === 'all'}
                  onClick={() => setView('all')}
                >
                  {t('coachWeb.allClients')}
                </button>
                <button
                  aria-pressed={view === 'attention'}
                  onClick={() => setView('attention')}
                >
                  {t('coachWeb.attention')}
                </button>
                <button
                  aria-pressed={view === 'requests'}
                  onClick={() => setView('requests')}
                >
                  {t('coachWeb.newRequests')}
                </button>
              </div>
              <label className="co-search">
                <Search size={17} />
                <Input
                  aria-label={t('coachWeb.searchClients')}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={t('coachWeb.findClient')}
                />
              </label>
            </div>
            {!visible.length ? (
              <Empty
                title={
                  clients.length
                    ? t('coachWeb.noClients')
                    : t('coachWeb.firstRequest')
                }
              >
                <p>
                  {clients.length
                    ? t('coachWeb.searchHint')
                    : t('coachWeb.listHint')}
                </p>
                {!clients.length && (
                  <Button
                    className="secondary"
                    onClick={() => setSection('offering')}
                    disabled={!state.profile.offers.length}
                  >
                    {t('coachWeb.listing')}
                    <Plus size={17} />
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
                      <small>
                        {m.status === 'active'
                          ? m.stats?.lastWorkout
                            ? `${m.offer.name} · ${t('coachWeb.lastSession', { date: dateLabel(m.stats.lastWorkout) })}`
                            : `${m.offer.name} · ${t('mycoach.noWorkouts')}`
                          : `${m.offer.name} · ${memberStatusLabel(m.status, t)}`}
                      </small>
                    </span>
                    {m.status === 'active' && (
                      <span className="co-client-stats">
                        <span>
                          <strong>
                            {m.stats?.completed ?? 0}
                            <em>
                              {' '}
                              {t('coachWeb.ofTotal', {
                                total: m.stats?.due ?? 0,
                              })}
                            </em>
                          </strong>
                          <small>{t('coachWeb.sessions7')}</small>
                        </span>
                        <span>
                          <strong
                            className={
                              m.stats?.averageChangeKg == null
                                ? ''
                                : m.stats.averageChangeKg < -0.05
                                  ? 'down'
                                  : m.stats.averageChangeKg > 0.05
                                    ? 'up'
                                    : ''
                            }
                          >
                            {m.stats?.averageChangeKg == null
                              ? '—'
                              : `${m.stats.averageChangeKg > 0 ? '+' : '−'}${Math.abs(m.stats.averageChangeKg).toFixed(1)}`}
                            {m.stats?.averageChangeKg != null && <em> kg</em>}
                          </strong>
                          <small>{t('coachWeb.weightWeek')}</small>
                        </span>
                      </span>
                    )}
                    {m.pending > 0 ? (
                      <span className="co-badge amber">
                        {t('coachWeb.pendingCount', { count: m.pending })}
                      </span>
                    ) : m.unread > 0 ? (
                      <span className="co-badge amber">
                        {t('coachWeb.unreadCount', { count: m.unread })}
                      </span>
                    ) : null}
                    <ChevronRight size={18} className="co-client-chevron" />
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
  const { t } = useI18n();
  return (
    <div className="co-billing-note">
      <Wallet size={20} strokeWidth={1.5} />
      <div>
        <strong>{t('coachWeb.paymentPending')}</strong>
        <p>{t('coachWeb.paymentHint')}</p>
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
  const { t } = useI18n();
  const [p, setP] = useState<CoachProfile>(
      profile ?? {
        name: '',
        bio: '',
        country: 'QA',
        specialties: '',
        offers: [
          {
            id: id(),
            name: '',
            price: 0,
            currency: 'QAR',
            description: '',
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
        <p className="co-overline">{t('coachWeb.aboutYou')}</p>
        <h2>{t('coachWeb.coachProfile')}</h2>
        <label className="co-consent">
          <input
            type="checkbox"
            checked={p.listed ?? false}
            onChange={(e) => field('listed', e.target.checked)}
          />
          <span>{t('coachWeb.listConsent')}</span>
        </label>
        <label>
          {t('coachWeb.name')}
          <Input
            required
            maxLength={100}
            value={p.name}
            onChange={(e) => field('name', e.target.value)}
            placeholder={t('coachWeb.coachName')}
          />
        </label>
        <div className="co-form-grid">
          <label>
            {t('coachWeb.basedIn')}
            <select
              value={p.country}
              onChange={(e) => field('country', e.target.value)}
            >
              <option value="QA">{t('mycoach.qatar')}</option>
              <option value="SA">{t('mycoach.saudi')}</option>
            </select>
          </label>
          <label>
            {t('coachWeb.specialties')}
            <Input
              maxLength={300}
              value={p.specialties}
              onChange={(e) => field('specialties', e.target.value)}
              placeholder={t('coachWeb.specialtiesHint')}
            />
          </label>
        </div>
        <label>
          {t('coachWeb.aboutCoaching')}
          <Textarea
            dir="auto"
            maxLength={2000}
            value={p.bio}
            onChange={(e) => field('bio', e.target.value)}
            placeholder={t('coachWeb.approachHint')}
          />
        </label>
        <p className="co-muted">{t('coachWeb.profileHint')}</p>
      </section>
      <section className="co-card">
        <p className="co-overline">{t('coachWeb.packages')}</p>
        <h2>{t('coachWeb.packageBenefits')}</h2>
        {p.offers.map((o, i) => (
          <div className="co-offer-editor" key={o.id}>
            <div className="co-section-line">
              <strong>{t('coachWeb.packageNumber', { number: i + 1 })}</strong>
              <Button
                type="button"
                variant="ghost"
                aria-label={t('coachWeb.removePackage', { name: o.name })}
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
              {t('coachWeb.packageName')}
              <Input
                required
                placeholder={t('coachWeb.defaultPackage')}
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
                {t('coachWeb.monthlyPrice')}
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
                {t('coachWeb.currency')}
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
              {t('coachWeb.services')}
              <Textarea
                dir="auto"
                required
                maxLength={2000}
                placeholder={t('coachWeb.defaultServices')}
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
              {t('coachWeb.responseHours')}
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
            <label>
              {t('coachWeb.capacity')}
              <Input
                type="number"
                min={1}
                max={500}
                placeholder={t('coachWeb.unlimited')}
                value={o.capacity ?? ''}
                onChange={(e) =>
                  field(
                    'offers',
                    p.offers.map((v) => {
                      if (v.id !== o.id) return v;
                      const { capacity: _drop, ...rest } = v;
                      return e.target.value
                        ? { ...rest, capacity: Number(e.target.value) }
                        : rest;
                    }),
                  )
                }
              />
              <small className="co-muted">{t('coachWeb.capacityHint')}</small>
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
          {t('coachWeb.addPackage')}
        </Button>
        <p className="co-muted">{t('coachWeb.packageChangeHint')}</p>
        <Button disabled={busy} className="primary full" type="submit">
          {busy
            ? t('shell.saving')
            : saved
              ? t('coachWeb.saved')
              : t('coachWeb.saveProfile')}
          <Check size={18} />
        </Button>
      </section>
    </form>
  );
}
export function AssignedWorkouts({
  fitness,
  onStart,
}: {
  fitness: FitnessData;
  onStart: (r: Routine, memberId: string) => void;
}) {
  const c = useCoaching();
  const members =
    c.state?.memberships.filter((m) => m.status === 'active') ?? [];
  if (!c.state)
    return (
      <section className="co-card">
        <p>{c.error || 'Loading assigned workouts…'}</p>
        {c.error && <Button onClick={() => void c.reload()}>Retry</Button>}
      </section>
    );
  if (!members.length)
    return (
      <section className="co-card">
        <h2>Assigned workouts</h2>
        <p className="co-muted">
          Your coach’s sessions will appear here when your membership starts.
          You can track your own workouts below.
        </p>
      </section>
    );
  return (
    <div className="assigned-workouts">
      <ExerciseCredits />
      <div className="co-section-line">
        <h2>Your assigned workouts</h2>
        <span className="co-muted">This week</span>
      </div>
      {members.map((m) => (
        <section key={m.id}>
          <p className="co-overline">{m.coachName}</p>
          <Nutrition targets={m.nutrition} />
          <Steps member={m} />
          {!m.program ? (
            <p className="co-muted">Your coach is preparing your program.</p>
          ) : (
            <>
              <h3>{m.program.title}</h3>
              {m.program.notes && (
                <p className="co-program-note">{m.program.notes}</p>
              )}
              {m.program.sessions.map((session) => {
                const completed = fitness.workouts.filter(
                  (w) =>
                    w.membershipId === m.id &&
                    w.programSessionId === session.id &&
                    w.startedAt.slice(0, 10) >= weekOf() &&
                    w.startedAt.slice(0, 10) <=
                      new Date().toISOString().slice(0, 10),
                ).length;
                const upcoming =
                  m.program!.startDate > new Date().toISOString().slice(0, 10);
                return (
                  <div className="co-card assigned-session" key={session.id}>
                    <div className="co-section-line">
                      <div>
                        <p className="co-overline">
                          {DAYS[session.day]}
                          {completed ? ' · COMPLETED THIS WEEK' : ''}
                        </p>
                        <h3>{session.name}</h3>
                        <p className="co-muted">
                          {session.exercises.length} exercises ·{' '}
                          {session.exercises.reduce((n, e) => n + e.sets, 0)}{' '}
                          sets
                        </p>
                      </div>
                      <Button
                        className="primary"
                        disabled={upcoming}
                        onClick={() => onStart(session, m.id)}
                      >
                        {upcoming
                          ? 'Starts ' + dateLabel(m.program!.startDate)
                          : completed
                            ? 'Train again'
                            : 'Start workout'}
                      </Button>
                    </div>
                    <div className="assigned-exercise-list">
                      {session.exercises.map((e, i) => (
                        <div key={i}>
                          <ExerciseThumbnail name={e.name} />
                          <span>
                            <strong>{e.name}</strong>
                            <small>
                              {e.sets} × {e.reps} reps
                            </small>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
export function MyCoach({
  onStart,
}: {
  onStart: (routine: Routine, membershipId: string) => void;
}) {
  const { t } = useI18n();
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
                <span className="co-badge">
                  {memberStatusLabel(m.status, t)}
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
  const { t } = useI18n();
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
          {t('chat.back')}
        </Button>
        <ErrorNote text={error} />
        <Empty title={t('coachWeb.loadingClient')}>
          <Button onClick={() => void load()}>{t('mycoach.retry')}</Button>
        </Empty>
      </>
    );
  return (
    <div className="co-detail">
      <Button className="text-button co-back" onClick={onBack}>
        <ArrowLeft size={17} />
        {isCoach ? t('coachWeb.allClients') : t('coachWeb.myCoaches')}
      </Button>
      <div className="co-heading">
        <div>
          <p className="co-overline">
            {isCoach ? t('coachWeb.clientOverview') : t('mycoach.yourCoach')}
          </p>
          <h1>{isCoach ? m.name : m.coachName}</h1>
          <p>
            {m.offer.name}{' '}
            <span className="co-badge">{memberStatusLabel(m.status, t)}</span>
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
            {m.program
              ? t('coachWeb.editProgram')
              : t('coachWeb.assignProgram')}
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
              ['overview', t('mycoach.overview')],
              ['program', t('mycoach.program')],
              ['checkins', t('mycoach.checkins')],
              [
                'messages',
                `${t('chat.messages')}${m.unread ? ' · ' + m.unread : ''}`,
              ],
              ['membership', t('coachWeb.membership')],
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
                  <span>{t('mycoach.workouts7')}</span>
                  <strong>{m.stats?.workouts ?? 0}</strong>
                  <small>
                    {m.stats?.lastWorkout
                      ? t('coachWeb.lastSession', {
                          date: dateLabel(m.stats.lastWorkout),
                        })
                      : t('mycoach.noWorkouts')}
                  </small>
                </div>
                <div className="co-metric-accent">
                  <span>{t('mycoach.scheduled')}</span>
                  <strong>
                    {m.stats?.completed ?? 0}
                    <em>/{m.stats?.due ?? 0}</em>
                  </strong>
                  <small>{t('mycoach.scheduledNote')}</small>
                </div>
                <button
                  type="button"
                  className="co-weight-metric"
                  onClick={() => setWeightHistory(true)}
                >
                  <span>{t('mycoach.weeklyAverage')}</span>
                  <div className="co-metric-pair">
                    <div>
                      <strong>
                        {m.stats?.averageKg?.toFixed(1) ?? '—'}
                        <em> kg</em>
                      </strong>
                      <span>
                        {t('coachWeb.weighInsWeek', {
                          count: m.stats?.weightCount ?? 0,
                        })}
                      </span>
                    </div>
                    <div>
                      <WeeklyChange value={m.stats?.averageChangeKg} />
                      <span>{t('mycoach.vsLast')}</span>
                    </div>
                  </div>
                  <small className="co-weight-action">
                    {t('coachWeb.viewEntries')}
                    <ChevronRight size={14} />
                  </small>
                </button>
              </div>
              <Nutrition
                targets={m.nutrition}
                busy={busy}
                onSave={
                  isCoach
                    ? (nutrition) =>
                        act({
                          action: 'nutrition',
                          nutrition,
                          revision: m.revision,
                        })
                    : undefined
                }
              />
              <Steps
                member={m}
                busy={busy}
                onSave={
                  isCoach
                    ? (stepGoal) =>
                        act({
                          action: 'step-goal',
                          stepGoal,
                          revision: m.revision,
                        })
                    : undefined
                }
              />
              <div className="co-detail-grid">
                <section className="co-card">
                  <div className="co-section-line">
                    <h2>{t('mycoach.weeklyCheckin')}</h2>
                    <ClipboardList size={21} strokeWidth={1.5} />
                  </div>
                  <p>
                    {detail.checkins.some((c) => c.week === weekOf())
                      ? t('mycoach.submitted')
                      : isCoach
                        ? t('coachWeb.waitingCheckin')
                        : t('mycoach.shareWeek')}
                  </p>
                  <Button
                    className="secondary"
                    onClick={() => setTab('checkins')}
                  >
                    {isCoach
                      ? t('coachWeb.reviewCheckins')
                      : t('mycoach.openCheckin')}
                    <ChevronRight size={17} />
                  </Button>
                  <div className="co-divider" />
                  <h3>{t('mycoach.currentProgram')}</h3>
                  <p>{m.program?.title ?? t('mycoach.noProgram')}</p>
                  <Button
                    className="text-button"
                    onClick={() => setTab('program')}
                  >
                    {t('mycoach.viewProgram')}
                    <ChevronRight size={16} />
                  </Button>
                </section>
                <section className="co-card">
                  <h2>{t('coachWeb.intake')}</h2>
                  <dl className="co-intake">
                    <dt>{t('mycoach.goals')}</dt>
                    <dd>{m.intake.goals}</dd>
                    <dt>{t('mycoach.experience')}</dt>
                    <dd>{m.intake.experience}</dd>
                    <dt>{t('mycoach.equipment')}</dt>
                    <dd>{m.intake.equipment}</dd>
                    <dt>{t('coachWeb.considerations')}</dt>
                    <dd>{m.intake.limitations || t('mycoach.noneShared')}</dd>
                    <dt>{t('mycoach.availability')}</dt>
                    <dd>
                      {t('coachWeb.daysWeek', { count: m.intake.days })} ·{' '}
                      {m.intake.country === 'QA'
                        ? t('mycoach.qatar')
                        : t('mycoach.saudi')}
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
            <Conversation
              memberId={m.id}
              messages={detail.messages}
              photos={detail.photos ?? []}
              userId={userId}
              partnerName={isCoach ? m.name : m.coachName}
              busy={busy}
              responseHours={m.offer.responseHours}
              act={act}
            />
          )}{' '}
          {tab === 'membership' && (
            <section className="co-card co-membership-detail">
              <p className="co-overline">{t('coachWeb.coachingMembership')}</p>
              <h2>{m.offer.name}</h2>
              <p className="co-price">
                {money(m.offer.price, m.offer.currency)}
                <small> {t('coachWeb.plannedPrice')}</small>
              </p>
              <p className="co-preserve" dir="auto">
                {m.offer.description}
              </p>
              <p>
                {t('coachWeb.replyHours', { hours: m.offer.responseHours })}
              </p>
              <p>
                {t('coachWeb.joined', {
                  date: m.accepted_at ? dateLabel(m.accepted_at, true) : '—',
                })}
              </p>
              <BillingNote />
              <p className="co-muted">{t('coachWeb.endCoachingHint')}</p>
              <Button
                className="secondary co-danger"
                onClick={() => setEnding(true)}
              >
                {t('coachWeb.endCoaching')}
              </Button>
            </section>
          )}
        </>
      )}
      {editing && (
        <ProgramEditor
          memberId={m.id}
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
          <DialogTitle>
            {t('coachWeb.memberWeights', { name: m.name })}
          </DialogTitle>
          <DialogDescription>
            {t('coachWeb.weightHistoryHint')}
          </DialogDescription>
          <WeightComparison weights={detail.fitness?.weights ?? []} />
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
              <p className="co-muted">{t('coachWeb.noWeights')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={ending} onOpenChange={setEnding}>
        <DialogContent className="form-dialog co-dialog">
          <DialogTitle>
            {m.status === 'invited'
              ? t('coachWeb.revoke')
              : t('coachWeb.endRelationship')}
          </DialogTitle>
          <DialogDescription>
            {m.status === 'invited'
              ? t('coachWeb.revokeHint')
              : t('coachWeb.endRelationshipHint')}
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
            {busy ? t('coachWeb.ending') : t('coachWeb.confirm')}
          </Button>
          <ErrorNote text={error} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
function SharedProgress({ fitness }: { fitness: FitnessData }) {
  const { t } = useI18n();
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
      <h2>{t('coachWeb.sharedProgress')}</h2>
      {points.length > 0 && (
        <div className="co-weight-chart">
          <div className="co-section-line">
            <h3>{t('coachWeb.weightTrend')}</h3>
            <span className="co-muted">
              {t('coachWeb.recentWeighIns', { count: points.length })}
            </span>
          </div>
          <svg
            viewBox="0 0 600 200"
            role="img"
            aria-label={t('coachWeb.weightChart')}
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
            {t('coachWeb.trendCaption', {
              weight: points.at(-1)?.trend.toFixed(1) ?? '—',
            })}
          </p>
        </div>
      )}
      <WeightComparison weights={fitness.weights} />
      <ProgressPanel data={fitness} />
      <details>
        <summary>
          {t('coachWeb.weightEntries', { count: readings.length })}
        </summary>
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
      <h3>{t('coachWeb.recentWorkouts')}</h3>
      {[...fitness.workouts]
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 20)
        .map((w) => (
          <details key={w.id}>
            <summary>
              {w.name} · {dateLabel(w.startedAt)} · {completedSets(w)}{' '}
              {t('you.sets')}
              {w.endedEarly ? t('coachWeb.finishedEarly') : ''}
            </summary>
            {w.exercises.map((e) => (
              <div key={e.id} className="co-workout-read">
                <strong>{e.name}</strong>
                <span>
                  {e.sets
                    .filter((s) => s.done)
                    .map(
                      (s) =>
                        `${displayWeight(Number(s.kg), e.unit ?? 'kg').toFixed(1)} ${e.unit ?? 'kg'} × ${s.reps}${s.kind === 'warmup' ? t('coachWeb.warmup') : ''}`,
                    )
                    .join(' · ')}
                  {e.sets.some((set) => !set.done) &&
                    t('coachWeb.skippedSets', {
                      count: e.sets.filter((set) => !set.done).length,
                    })}
                </span>
              </div>
            ))}
            {w.notes && <p>{w.notes}</p>}
          </details>
        ))}
      {!fitness.workouts.length && (
        <p className="co-muted">{t('coachWeb.completedHint')}</p>
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
  const { t } = useI18n();
  return !program ? (
    <Empty icon={Dumbbell} title={t('coachWeb.noProgram')}>
      <p>{t('coachWeb.programHint')}</p>
    </Empty>
  ) : (
    <div className="co-program">
      <ExerciseCredits />
      <div className="co-section-line">
        <div>
          <h2>{program.title}</h2>
          <p className="co-muted">
            {t('coachWeb.scheduleStarts', {
              date: dateLabel(program.startDate, true),
            })}
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
                {weekdayLabel(s.day, t)} ·{' '}
                {t('coachWeb.sessionNumber', { number: i + 1 })}
              </p>
              <h2>{s.name}</h2>
            </div>
            {onStart && (
              <Button className="primary" onClick={() => onStart(s)}>
                {t('coachWeb.start')}
                <ArrowUpRight size={17} />
              </Button>
            )}
          </div>
          {s.exercises.map((e, j) => (
            <div className="co-prescription" key={j}>
              <ExerciseThumbnail name={e.name} />
              <div>
                <strong>{e.name}</strong>
                <span>
                  {t('coachWeb.setsReps', {
                    sets: e.sets ?? 3,
                    reps: e.reps ?? 10,
                  })}{' '}
                  · {e.unit ?? 'kg'}
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
function TemplateLibrary() {
  const { t } = useI18n();
  const api = useCoachingTransport();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [editing, setEditing] = useState<WorkoutTemplate | 'new' | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ templates: WorkoutTemplate[] }>(
        '?templates=1',
      );
      setTemplates(result.templates);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    const boot = setTimeout(() => void reload(), 0);
    return () => clearTimeout(boot);
  }, [reload]);
  return (
    <>
      <div className="co-heading">
        <div>
          <p className="co-overline">{t('coachWeb.library')}</p>
          <h1>{t('coachWeb.workoutTemplates')}</h1>
          <p>{t('coachWeb.libraryIntro')}</p>
        </div>
        <Button
          className="primary"
          onClick={() => {
            setSaveError('');
            setEditing('new');
          }}
        >
          <Plus size={18} />
          {t('coachWeb.createTemplate')}
        </Button>
      </div>
      <p className="co-muted">{t('coachWeb.copiesHint')}</p>
      <ErrorNote text={error} />
      <Button
        className="secondary"
        disabled={loading}
        onClick={() => void reload()}
      >
        {loading
          ? t('coachWeb.loadingTemplates')
          : t('coachWeb.refreshTemplates')}
      </Button>
      {!loading && !error && !templates.length && (
        <Empty icon={ClipboardList} title={t('coachWeb.emptyTemplates')}>
          <p>{t('coachWeb.emptyTemplatesHint')}</p>
        </Empty>
      )}
      <div className="co-template-grid">
        {templates.map((template) => (
          <article key={template.id} className="co-template-card">
            <p className="co-overline">
              {t('coachWeb.exerciseCount', {
                count: template.routine.exercises.length,
              })}{' '}
              ·{' '}
              {t('coachWeb.setCount', {
                count: template.routine.exercises.reduce(
                  (n, e) => n + e.sets,
                  0,
                ),
              })}
            </p>
            <h2>{template.routine.name}</h2>
            <p>{template.routine.exercises.map((e) => e.name).join(' · ')}</p>
            <Button
              className="secondary"
              onClick={() => {
                setSaveError('');
                setEditing(template);
              }}
              aria-label={t('coachWeb.editNamedTemplate', {
                name: template.routine.name,
              })}
            >
              {t('coachWeb.editTemplate')}
              <ArrowUpRight size={16} />
            </Button>
          </article>
        ))}
      </div>
      {editing && (
        <ProgramEditor
          templateMode
          memberId=""
          busy={busy}
          error={saveError}
          program={
            editing === 'new'
              ? null
              : {
                  title: editing.routine.name,
                  notes: '',
                  startDate: today(),
                  sessions: [
                    sessionFromTemplate(editing.routine, editing.routine.id),
                  ],
                }
          }
          onClose={() => {
            if (!busy) {
              setEditing(null);
              void reload();
            }
          }}
          onSave={async (program) => {
            if (busy) return;
            setBusy(true);
            setSaveError('');
            try {
              await api('', {
                action: 'template-save',
                ...(editing === 'new'
                  ? {}
                  : { id: editing.id, revision: editing.revision }),
                routine: templateRoutine(program.sessions[0]),
              });
              setEditing(null);
              await reload();
            } catch (e) {
              setSaveError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </>
  );
}

function ProgramEditor({
  templateMode = false,
  memberId,
  program,
  busy,
  error,
  onClose,
  onSave,
}: {
  templateMode?: boolean;
  program: Program | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (p: Program) => Promise<void>;
  memberId: string;
}) {
  const { t } = useI18n();
  const api = useCoachingTransport();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [openSession, setOpenSession] = useState(
    () => program?.sessions[0]?.id ?? '',
  );
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [templateNotice, setTemplateNotice] = useState('');
  const loadTemplates = useCallback(async () => {
    if (templateMode) return;
    try {
      setTemplates(
        (await api<{ templates: WorkoutTemplate[] }>('?templates=1')).templates,
      );
      setTemplateError('');
    } catch (e) {
      setTemplateError((e as Error).message);
    }
  }, [api, templateMode]);
  useEffect(() => {
    const boot = setTimeout(() => void loadTemplates(), 0);
    return () => clearTimeout(boot);
  }, [loadTemplates]);
  const [uploading, setUploading] = useState(false);
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
      title: '',
      notes: '',
      startDate: today(),
      sessions: [
        {
          id: id(),
          name: '',
          day: 1,
          exercises: [],
        },
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
        if (!v && !uploading && !busy && !templateBusy) onClose();
      }}
    >
      <DialogContent className="form-dialog co-dialog co-program-dialog">
        <DialogTitle>
          {templateMode
            ? program
              ? t('coachWeb.editWorkoutTemplate')
              : t('coachWeb.createWorkoutTemplate')
            : program
              ? t('coachWeb.editProgram')
              : t('coachWeb.buildProgram')}
        </DialogTitle>
        <DialogDescription>
          {templateMode
            ? t('coachWeb.templateInstructions')
            : t('coachWeb.programInstructions')}
        </DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!uploading) void onSave(p);
          }}
        >
          <fieldset
            disabled={uploading || busy || templateBusy}
            className="program-fields"
          >
            {!templateMode && (
              <>
                <div className="co-form-grid">
                  <label>
                    {t('coachWeb.programTitle')}
                    <Input
                      required
                      maxLength={100}
                      placeholder={t('coachWeb.defaultProgram')}
                      value={p.title}
                      onChange={(e) => setP({ ...p, title: e.target.value })}
                    />
                  </label>
                  <label>
                    {t('coachWeb.startDate')}
                    <Input
                      type="date"
                      required
                      value={p.startDate}
                      onChange={(e) =>
                        setP({ ...p, startDate: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  {t('coachWeb.programNotes')}
                  <Textarea
                    dir="auto"
                    maxLength={2000}
                    value={p.notes}
                    onChange={(e) => setP({ ...p, notes: e.target.value })}
                  />
                </label>
                <section
                  className="co-template-picker"
                  aria-label={t('coachWeb.addSavedTemplate')}
                >
                  <div className="co-section-line" style={{ width: '100%' }}>
                    <strong>{t('coachWeb.addSavedDay')}</strong>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void loadTemplates()}
                    >
                      {t('coachWeb.refresh')}
                    </Button>
                  </div>
                  {templates.length ? (
                    <div className="co-template-choices">
                      {templates.map((template) => {
                        const sets = template.routine.exercises.reduce(
                          (n, e) => n + e.sets,
                          0,
                        );
                        return (
                          <button
                            type="button"
                            key={template.id}
                            className="co-template-choice"
                            disabled={p.sessions.length >= 14}
                            aria-label={t('coachWeb.addNamedTemplate', {
                              name: template.routine.name,
                            })}
                            onClick={() => {
                              const copy = sessionFromTemplate(
                                template.routine,
                                id(),
                              );
                              const replacing =
                                p.sessions.length === 1 &&
                                !p.sessions[0].exercises.length;
                              setP({
                                ...p,
                                sessions: replacing
                                  ? [copy]
                                  : [...p.sessions, copy],
                              });
                              setTemplateId(copy.id);
                              setOpenSession(copy.id);
                              setTemplateNotice(
                                t('coachWeb.templateAdded', {
                                  name: template.routine.name,
                                  number: replacing ? 1 : p.sessions.length + 1,
                                }),
                              );
                            }}
                          >
                            <strong>{template.routine.name}</strong>
                            <small>
                              {t('coachWeb.exerciseCount', {
                                count: template.routine.exercises.length,
                              })}{' '}
                              · {sets} {t('you.sets')}
                            </small>
                            <em>
                              <Plus size={13} /> {t('coachWeb.addToProgram')}
                            </em>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="co-muted">{t('coachWeb.noSavedTemplates')}</p>
                  )}
                </section>
                <ErrorNote text={templateError} />
                {templateNotice && (
                  <p role="status" className="co-template-notice">
                    {templateNotice}
                  </p>
                )}
              </>
            )}
            {p.sessions.map((s, i) => (
              <details
                key={s.id}
                className={`co-session-editor ${s.id === templateId ? 'co-session-new' : ''}`}
                open={
                  templateMode || (openSession ? openSession === s.id : i === 0)
                }
                onToggle={(e) => {
                  if (templateMode) return;
                  const el = e.currentTarget as HTMLDetailsElement;
                  setOpenSession((current) =>
                    el.open ? s.id : current === s.id ? '' : current,
                  );
                }}
                ref={
                  s.id === templateId
                    ? (node) => {
                        node?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }
                    : undefined
                }
              >
                <summary className="co-session-summary">
                  <span className="co-session-summary-text">
                    <strong>
                      {templateMode
                        ? t('coachWeb.workoutDay')
                        : s.name.trim() ||
                          t('coachWeb.sessionNumber', { number: i + 1 })}
                    </strong>
                    {!templateMode && (
                      <small>
                        {weekdayLabel(s.day, t)} ·{' '}
                        {t('coachWeb.exerciseCount', {
                          count: s.exercises.length,
                        })}
                      </small>
                    )}
                  </span>
                  {!templateMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="co-session-remove"
                      aria-label={t('coachWeb.removeSession', {
                        number: i + 1,
                      })}
                      onClick={(e) => {
                        e.preventDefault();
                        setP({
                          ...p,
                          sessions: p.sessions.filter((v) => v.id !== s.id),
                        });
                      }}
                    >
                      <X size={18} />
                    </Button>
                  )}
                  {!templateMode && (
                    <ChevronRight size={18} className="co-session-chevron" />
                  )}
                </summary>
                <div className="co-form-grid">
                  <label>
                    {templateMode
                      ? t('coachWeb.templateName')
                      : t('coachWeb.name')}
                    <Input
                      required
                      maxLength={100}
                      value={s.name}
                      onChange={(e) => session(i, { name: e.target.value })}
                    />
                  </label>
                  {!templateMode && (
                    <label>
                      {t('coachWeb.trainingDay')}
                      <select
                        value={s.day}
                        onChange={(e) =>
                          session(i, { day: Number(e.target.value) })
                        }
                      >
                        {DAYS.map((d, k) => (
                          <option key={d} value={k}>
                            {weekdayLabel(k, t)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                {s.exercises.map((e, j) => (
                  <div className="co-exercise-editor" key={j}>
                    <div className="co-section-line">
                      <strong>
                        {t('coachWeb.exerciseNumber', { number: j + 1 })}
                      </strong>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={t('coachWeb.removeExercise', {
                          number: j + 1,
                        })}
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
                      <ExerciseThumbnail name={e.name} />
                      <span>
                        <strong>
                          {e.name || t('coachWeb.chooseExercise')}
                        </strong>
                        <small>
                          {e.muscle
                            ? muscleLabel(e.muscle, t)
                            : t('coachWeb.exerciseLibrary')}{' '}
                          {t('coachWeb.changeExercise')}
                        </small>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                    <div className="co-exercise-numbers">
                      <label>
                        {t('coachWeb.sets')}
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
                        {t('coachWeb.reps')}
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
                        {t('coachWeb.unit')}
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
                      <label>
                        {t('coachWeb.rest')}
                        <Input
                          aria-label={t('coachWeb.restBetween')}
                          required
                          type="number"
                          min={0}
                          max={600}
                          step={5}
                          value={e.restSeconds ?? 90}
                          onChange={(v) =>
                            exercise(i, j, {
                              restSeconds: Number(v.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <details className="co-exercise-video" open={!!e.videoUrl}>
                      <summary>
                        {e.videoUrl
                          ? t('coachWeb.demoAttached')
                          : t('coachWeb.addDemo')}
                      </summary>
                      {templateMode ? (
                        <label>
                          {t('coachWeb.demoUrl')}
                          <Input
                            maxLength={1000}
                            value={e.videoUrl ?? ''}
                            placeholder={t('coachWeb.videoPlaceholder')}
                            onChange={(v) =>
                              exercise(i, j, { videoUrl: v.target.value })
                            }
                          />
                        </label>
                      ) : (
                        <VideoUpload
                          onBusy={setUploading}
                          memberId={memberId}
                          name={e.name}
                          value={e.videoUrl ?? ''}
                          onChange={(videoUrl) => exercise(i, j, { videoUrl })}
                        />
                      )}
                    </details>
                  </div>
                ))}
                {!s.exercises.length && (
                  <p className="co-muted">{t('coachWeb.chooseExercises')}</p>
                )}
                <Button
                  type="button"
                  className="secondary"
                  disabled={s.exercises.length >= 30}
                  onClick={() => setPicker({ sessionId: s.id })}
                >
                  <Plus size={17} />
                  {t('coachWeb.addExercise')}
                </Button>
                {!templateMode && (
                  <Button
                    type="button"
                    className="secondary co-save-template"
                    disabled={!isTemplateRoutine(templateRoutine(s))}
                    onClick={() => {
                      setTemplateBusy(true);
                      setTemplateError('');
                      setTemplateNotice('');
                      void api('', {
                        action: 'template-save',
                        routine: templateRoutine(s),
                      })
                        .then(async () => {
                          await loadTemplates();
                          setTemplateNotice(
                            t('coachWeb.templateSaved', { name: s.name }),
                          );
                        })
                        .catch((e: Error) => setTemplateError(e.message))
                        .finally(() => setTemplateBusy(false));
                    }}
                  >
                    <ClipboardList size={16} />
                    {t('coachWeb.saveAsTemplate')}
                  </Button>
                )}
              </details>
            ))}
            {!templateMode && (
              <Button
                type="button"
                className="secondary full"
                disabled={p.sessions.length >= 14}
                onClick={() => {
                  const next = {
                    id: id(),
                    name: t('coachWeb.sessionNumber', {
                      number: p.sessions.length + 1,
                    }),
                    day: 3,
                    exercises: [],
                  };
                  setP({ ...p, sessions: [...p.sessions, next] });
                  setOpenSession(next.id);
                }}
              >
                <Plus size={17} />
                {t('coachWeb.addSession')}
              </Button>
            )}
            {!templateMode && (
              <p className="co-muted co-template-video-note">
                {t('coachWeb.videoTemplateHint')}
              </p>
            )}
            <div className="co-dialog-footer">
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
                {busy
                  ? t('shell.saving')
                  : templateMode
                    ? t('coachWeb.saveTemplate')
                    : t('coachWeb.assignProgram')}
                <Check size={18} />
              </Button>
            </div>
          </fieldset>
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
  const { t } = useI18n();
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
            {t('mycoach.weekOf', { date: dateLabel(weekOf()) })}
          </p>
          <h2>{t('mycoach.yourCheckin')}</h2>
          <div className="co-form-grid">
            <label>
              {t('mycoach.energyWeek')}
              <select
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
              >
                {[
                  t('mycoach.energy1'),
                  t('mycoach.energy2'),
                  t('mycoach.energy3'),
                  t('mycoach.energy4'),
                  t('mycoach.energy5'),
                ].map((s, i) => (
                  <option key={s} value={i + 1}>
                    {i + 1} · {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('mycoach.sleepHours')}
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
            {t('mycoach.wentWell')}
            <Textarea
              dir="auto"
              maxLength={2000}
              value={wins}
              onChange={(e) => setWins(e.target.value)}
            />
          </label>
          <label>
            {t('mycoach.askCoach')}
            <Textarea
              dir="auto"
              maxLength={2000}
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
            />
          </label>
          <Button className="primary" disabled={busy} type="submit">
            {busy ? t('mycoach.sending') : t('mycoach.submit')}
            <Check size={18} />
          </Button>
        </form>
      )}
      {!items.length && isCoach && (
        <Empty icon={ClipboardList} title={t('coachWeb.noCheckins')}>
          <p>{t('coachWeb.noCheckinsHint')}</p>
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
  const { t } = useI18n();
  const [feedback, setFeedback] = useState(c.feedback);
  return (
    <section className="co-card">
      <div className="co-section-line">
        <h2>{t('coachWeb.weekOf', { date: dateLabel(c.week) })}</h2>
        <span className={'co-badge ' + (c.reviewed_at ? '' : 'amber')}>
          {c.reviewed_at ? t('mycoach.reviewed') : t('mycoach.awaiting')}
        </span>
      </div>
      <div className="co-checkin-numbers">
        <span>
          {t('mycoach.energy')}
          <strong>{c.answers.energy}/5</strong>
        </span>
        <span>
          {t('mycoach.sleep')}
          <strong>{t('coachWeb.hours', { count: c.answers.sleep })}</strong>
        </span>
      </div>
      <h3>{t('mycoach.wins')}</h3>
      <p className="co-preserve" dir="auto">
        {c.answers.wins || t('mycoach.noNotes')}
      </p>
      <h3>{t('mycoach.challenges')}</h3>
      <p className="co-preserve" dir="auto">
        {c.answers.challenges || t('mycoach.noNotes')}
      </p>
      {c.reviewed_at ? (
        <div className="co-feedback">
          <strong>{t('mycoach.coachReply')}</strong>
          <p className="co-preserve" dir="auto">
            {c.feedback}
          </p>
        </div>
      ) : isCoach ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await act({ action: 'feedback', checkinId: c.id, feedback });
          }}
        >
          <label>
            {t('coachWeb.yourFeedback')}
            <Textarea
              dir="auto"
              required
              maxLength={4000}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </label>
          <Button className="primary" type="submit" disabled={busy}>
            {t('coachWeb.sendFeedback')}
            <Check size={17} />
          </Button>
        </form>
      ) : (
        <p className="co-muted">{t('mycoach.willReview')}</p>
      )}
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
  const { t } = useI18n();
  const [note, setNote] = useState(''),
    [decision, setDecision] = useState<'accept' | 'reject' | null>(null),
    [withdraw, setWithdraw] = useState(false);
  const open = m.status === 'requested' || m.status === 'awaiting_payment';
  return (
    <section className="co-card">
      <span className="co-badge">{memberStatusLabel(m.status, t)}</span>
      <h2 style={{ marginTop: 20 }}>{m.offer.name}</h2>
      <p className="co-price">
        {money(m.offer.price, m.offer.currency)}
        <small> {t('coachWeb.monthly')}</small>
      </p>
      <p className="co-preserve" dir="auto">
        {m.offer.description}
      </p>
      <div className="co-request-steps">
        <span className="done">{t('coachWeb.requestStep')}</span>
        <span className={m.status === 'awaiting_payment' ? 'done' : ''}>
          {t('coachWeb.reviewStep')}
        </span>
        <span>{t('coachWeb.paymentStep')}</span>
        <span>{t('coachWeb.membershipStep')}</span>
      </div>
      {open && (
        <>
          <h3>{t('coachWeb.trainingGoals')}</h3>
          <p className="co-preserve" dir="auto">
            {m.intake.goals}
          </p>
          <dl className="co-intake">
            <dt>{t('coachWeb.experienceEquipment')}</dt>
            <dd>
              {m.intake.experience} · {m.intake.equipment}
            </dd>
            <dt>{t('mycoach.availability')}</dt>
            <dd>
              {t('coachWeb.daysWeek', { count: m.intake.days })} ·{' '}
              {m.intake.country === 'QA'
                ? t('mycoach.qatar')
                : t('mycoach.saudi')}
            </dd>
            <dt>{t('coachWeb.considerations')}</dt>
            <dd>{m.intake.limitations || t('mycoach.noneShared')}</dd>
          </dl>
          <p className="co-muted">{t('coachWeb.sharingPaymentHint')}</p>
        </>
      )}
      {m.decision_note && (
        <div className="co-feedback">
          <strong>{t('coachWeb.coachResponse')}</strong>
          <p>{m.decision_note}</p>
        </div>
      )}
      {m.status === 'requested' &&
        (isCoach ? (
          <>
            <label>
              {t('coachWeb.responseOptional')}
              <Textarea
                dir="auto"
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
                {t('coachWeb.acceptRequest')}
                <Check size={17} />
              </Button>
              <Button
                className="secondary"
                disabled={busy}
                onClick={() => setDecision('reject')}
              >
                {t('coachWeb.decline')}
              </Button>
            </div>
          </>
        ) : (
          <p>{t('coachWeb.requestReviewHint')}</p>
        ))}
      {m.status === 'awaiting_payment' && (
        <div className="co-payment-gate">
          <Wallet size={24} />
          <h3>
            {isCoach
              ? t('coachWeb.awaitingTraineePayment')
              : t('coachWeb.requestAccepted')}
          </h3>
          <p>
            {isCoach
              ? t('coachWeb.paymentRequired')
              : t('coachWeb.payWhenAvailable', {
                  price: money(m.offer.price, m.offer.currency),
                })}
          </p>
          <Button className="primary" disabled>
            {t('coachWeb.paymentPending')}
          </Button>
          <p className="co-muted">{t('coachWeb.checkoutHint')}</p>
        </div>
      )}
      {!isCoach && open && (
        <Button
          className="text-button co-danger"
          disabled={busy}
          onClick={() => setWithdraw(true)}
        >
          {t('coachWeb.withdrawRequest')}
        </Button>
      )}
      {m.status === 'rejected' && <p>{t('coachWeb.declinedHint')}</p>}
      {m.status === 'withdrawn' && <p>{t('coachWeb.withdrawnHint')}</p>}
      {m.status === 'invited' && <p>{t('coachWeb.retiredHint')}</p>}
      {m.status === 'ended' && <p>{t('coachWeb.endedHint')}</p>}
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
              ? t('coachWeb.withdrawTitle')
              : decision === 'accept'
                ? t('coachWeb.acceptTitle')
                : t('coachWeb.declineTitle')}
          </DialogTitle>
          <DialogDescription>
            {withdraw
              ? t('coachWeb.withdrawHint')
              : decision === 'accept'
                ? t('coachWeb.acceptHint')
                : t('coachWeb.declineHint')}
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
            {busy ? t('shell.saving') : t('coachWeb.confirm')}
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
                    <p className="co-preserve" dir="auto">
                      {o.description}
                    </p>
                    <p className="co-muted">
                      Coach responds within {o.responseHours} hours.
                      {o.spotsLeft !== null && (
                        <>
                          {' · '}
                          <span className={o.spotsLeft ? '' : 'co-full'}>
                            {o.spotsLeft
                              ? `${o.spotsLeft} of ${o.capacity} ${o.capacity === 1 ? 'place' : 'places'} left`
                              : 'Full'}
                          </span>
                        </>
                      )}
                    </p>
                    <Button
                      className="primary full"
                      disabled={o.spotsLeft === 0}
                      onClick={() => {
                        setSuccess(false);
                        setSelected({ coach: c, offer: o });
                      }}
                    >
                      {o.spotsLeft === 0 ? 'Package full' : 'Request package'}
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
              dir="auto"
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
              dir="auto"
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
