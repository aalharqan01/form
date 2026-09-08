'use client';
import { useEffect, useState, useRef } from 'react';
import {
  Dumbbell,
  ChartNoAxesCombined,
  History,
  Settings2,
  Plus,
  ArrowUpRight,
  Play,
  ChevronRight,
  Pencil,
  Trash2,
  Download,
  Upload,
  Smartphone,
  Check,
  X,
  CloudCheck,
  CircleAlert,
  FlaskConical,
  Bookmark,
  Users,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useFitness } from '@/hooks/use-fitness';
import {
  type FitnessData,
  type Routine,
  type Workout,
  EMPTY,
  STARTERS,
  id,
  today,
  dateLabel,
  volume,
  completedSets,
  trendStats,
  displayWeight,
  validateData,
  lastPerformance,
} from '@/lib/fitness';
import WeightPanel from './weight-panel';
import {
  AssignedWorkouts,
  MyCoach,
  Marketplace,
  CoachingNotice,
} from './coaching/coaching-ui';
import ProgressPanel from './progress-panel';
import ThemeControl from './theme-control';
import WorkoutPanel, { RoutineEditor } from './workout-panel';
function demoData(): FitnessData {
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 29 + i);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  return {
    ...EMPTY,
    goal: 72,
    routines: STARTERS.map((r) => ({ ...r, id: id() })),
    weights: dates.map((date, i) => ({
      date,
      kg: Math.round((76.8 - i * 0.063 + Math.sin(i * 2) * 0.23) * 10) / 10,
      note: 'Sample entry',
    })),
    workouts: [1, 3, 6, 8, 10, 13]
      .map((days, i) => {
        const dt = new Date();
        dt.setDate(dt.getDate() - days);
        dt.setHours(17, 30, 0, 0);
        return {
          id: id(),
          name: i % 2 ? 'Lower body' : 'Upper body',
          startedAt: dt.toISOString(),
          finishedAt: new Date(dt.getTime() + 47 * 60000).toISOString(),
          notes: 'Sample workout',
          exercises: STARTERS[i % 2].exercises.map((e) => ({
            id: id(),
            name: e.name,
            muscle: e.muscle,
            sets: Array.from({ length: 3 }, () => ({
              id: id(),
              kg: '40',
              reps: String(e.reps),
              done: true,
            })),
          })),
        };
      })
      .reverse(),
  };
}
type InstallEvent = Event & { prompt: () => Promise<void> };
type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
// Dispatch-owned sign-in must use full-page anchors; an SVG chart requires its image role.
/* oxlint-disable next/no-html-link-for-pages, jsx-a11y/prefer-tag-over-role */
export default function FitnessApp() {
  const store = useFitness();
  const [demo, setDemo] = useState<FitnessData | null>(null),
    [tab, setTab] = useState('train'),
    [editor, setEditor] = useState(false),
    [editing, setEditing] = useState<Routine | null>(null),
    [settings, setSettings] = useState(false),
    [remove, setRemove] = useState<{
      kind: 'routine' | 'workout';
      id: string;
    } | null>(null),
    [detail, setDetail] = useState<Workout | null>(null),
    [importData, setImportData] = useState<FitnessData | null>(null),
    [importError, setImportError] = useState(''),
    [installPrompt, setInstallPrompt] = useState<InstallEvent | null>(null),
    [installHelp, setInstallHelp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const data = demo ?? store.data,
    ready = !!demo || store.loaded;
  const update = (fn: (d: FitnessData) => FitnessData) => {
    if (demo) setDemo((previous) => (previous ? fn(previous) : null));
    else store.update(fn);
  };
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    const openCoach = setTimeout(() => {
      const view = new URL(location.href).searchParams.get('view');
      if (view === 'coach' || view === 'marketplace') setTab(view);
    }, 0);
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    const capture = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', capture);
    return () => {
      clearTimeout(openCoach);
      window.removeEventListener('beforeinstallprompt', capture);
    };
  }, []);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'read_fitness_summary',
            title: 'Read fitness summary',
            description:
              'Read counts of saved workouts and weigh-ins and the current weight trend. Does not change data.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: (input: unknown) => {
              if (
                !input ||
                typeof input !== 'object' ||
                Object.keys(input).length
              )
                throw new Error('Pass an empty object.');
              const d = dataRef.current,
                s = trendStats(d.weights, d.goal);
              return {
                workoutCount: d.workouts.length,
                weighInCount: d.weights.length,
                trendKg: s.latest?.trend ?? null,
                goalKg: d.goal,
                activeWorkout: d.active?.name ?? null,
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  function start(r?: Routine, membershipId?: string) {
    if (!ready) return;
    if (data.active) {
      setTab('train');
      return;
    }
    update((d) => ({
      ...d,
      active: {
        id: id(),
        name: r?.name ?? 'New workout',
        ...(membershipId ? { membershipId, programSessionId: r?.id } : {}),
        startedAt: new Date().toISOString(),
        notes: '',
        exercises:
          r?.exercises.map((e) => {
            const previous = lastPerformance(d.workouts, e.name);
            return {
              id: id(),
              name: e.name,
              muscle: e.muscle,
              instructions: e.instructions,
              videoUrl: e.videoUrl,
              unit: 'kg',
              sets: Array.from({ length: e.sets }, (_, i) => ({
                id: id(),
                kg: previous?.[i]?.kg ?? '',
                reps: membershipId
                  ? String(e.reps)
                  : (previous?.[i]?.reps ?? String(e.reps)),
                kind: 'working',
                done: false,
              })),
            };
          }) ?? [],
      },
    }));
    setTab('train');
  }
  function download(value: FitnessData = data) {
    const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `form-backup-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function readImport(file: File) {
    try {
      if (file.size > 4000000)
        throw new Error('Choose a Form backup smaller than 4 MB.');
      const value = JSON.parse(await file.text());
      if (!validateData(value))
        throw new Error(
          'This is not a valid Form backup. Choose a JSON file exported from Form.',
        );
      setImportData(value);
      setImportError('');
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not read backup.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }
  const stats = trendStats(data.weights, data.goal);
  const lastWorkout = data.workouts.at(-1);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekly = data.workouts.filter(
      (w) => new Date(w.startedAt) >= weekStart,
    ),
    weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  const nav = [
    ['train', 'Train', Dumbbell],
    ['weight', 'Weight', ChartNoAxesCombined],
    ['history', 'History', History],
    ['coach', 'My coach', Users],
    ['marketplace', 'Marketplace', Search],
  ] as const;
  const heading = tab === 'history' ? 'Workout\nhistory.' : 'Your\ntraining.';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand-button"
          onClick={() => setTab('train')}
          aria-label="Form home"
        >
          <div className="wordmark">
            form<span>®</span>
          </div>
        </button>
        <p className="brand-sub">Training & weight</p>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? 'selected' : ''}
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => setTab(key)}
            >
              <Icon size={21} strokeWidth={1.5} />
              {label}
              {key === 'train' && data.active && <i className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-statement">
            Your log.
            <br />
          </div>
          <button onClick={() => setSettings(true)}>
            <Settings2 size={19} strokeWidth={1.5} />
            Preferences
          </button>
          <a href="/coaching" className="co-workspace-link">
            Coach workspace <ArrowUpRight size={16} />
          </a>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span className="desktop-date">
            {new Date()
              .toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
              .toUpperCase()}
          </span>
          <span className="mobile-wordmark">
            form<span>®</span>
          </span>
          <div className="topbar-right">
            {!demo && <CoachingNotice onOpen={() => setTab('coach')} />}
            <span
              className={`save-status ${store.error ? 'has-error' : ''}`}
              title={demo ? 'Sample preview' : store.status}
            >
              {demo ? (
                <FlaskConical size={15} />
              ) : store.error ? (
                <CircleAlert size={15} />
              ) : (
                <CloudCheck size={16} />
              )}
              <span>{demo ? 'Sample preview' : store.status}</span>
            </span>
            <button
              className="avatar"
              aria-label="Open preferences"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={18} strokeWidth={1.5} />
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <FlaskConical size={17} />
            <span>
              Sample data. Explore freely; this won’t change your log.
            </span>
            <button
              onClick={() => {
                setDemo(null);
                setTab('train');
              }}
            >
              Back to my log <X size={16} />
            </button>
          </div>
        )}
        {!demo && store.error && (
          <div className="error-banner" role="alert">
            <div>
              <strong>
                {store.loaded
                  ? 'Your changes haven’t saved.'
                  : 'Couldn’t open your log.'}
              </strong>
              <p>{store.error}</p>
            </div>
            <Button className="secondary" onClick={store.retry}>
              Retry
            </Button>
            {store.conflict && (
              <>
                <Button
                  className="secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Keep this phone’s version? Export a backup first if you need both copies.',
                      )
                    )
                      void store.resolve('phone');
                  }}
                >
                  Keep phone version
                </Button>
                <Button
                  className="secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Use the cloud version and discard conflicting phone edits? Export a backup first.',
                      )
                    )
                      void store.resolve('cloud');
                  }}
                >
                  Use cloud version
                </Button>
              </>
            )}
            {store.loaded && (
              <Button className="text-button" onClick={() => download()}>
                Export backup
              </Button>
            )}
            <a href="/signin-with-chatgpt?return_to=%2F" target="_top">
              Sign in
            </a>
          </div>
        )}
        {!ready ? (
          <div className="loading-state">
            <div className="loading-symbol">f.</div>
            <h2>
              {store.error
                ? 'Your log is safe. Let’s reconnect.'
                : 'Loading your log…'}
            </h2>
            <p>{store.error ? 'Retry above to continue.' : ''}</p>
            <Button className="secondary" onClick={() => setDemo(demoData())}>
              Explore with sample data
            </Button>
          </div>
        ) : tab === 'marketplace' ? (
          <Marketplace onRequests={() => setTab('coach')} />
        ) : tab === 'coach' ? (
          demo ? (
            <p className="empty-line">
              Exit sample mode to connect with a coach.
            </p>
          ) : (
            <MyCoach onStart={(r, m) => start(r, m)} />
          )
        ) : tab === 'weight' ? (
          <WeightPanel data={data} update={update} />
        ) : tab === 'train' && data.active ? (
          <WorkoutPanel
            data={data}
            update={update}
            onFinish={() => setTab('train')}
          />
        ) : (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  {tab === 'history' ? 'HISTORY' : 'TRAINING'}
                </p>
                <h1>
                  {heading.split('\n')[0]}
                  <br />
                  <span>{heading.split('\n')[1]}</span>
                </h1>
              </div>
              <p>{tab === 'history' ? '' : ''}</p>
            </div>
            {tab === 'train' ? (
              <>
                {!demo && <AssignedWorkouts fitness={data} onStart={start} />}
                <div className="dashboard-grid">
                  <section className="bezel feature">
                    <div className="card">
                      <div className="section-label">
                        YOUR NEXT SESSION <span>STRENGTH</span>
                      </div>
                      <div className="feature-center">
                        <h2>
                          {data.routines[0] ? (
                            data.routines[0].name
                          ) : (
                            <>
                              Start a
                              <br />
                              workout.
                            </>
                          )}
                        </h2>
                        <span className="feature-symbol">
                          <Dumbbell size={74} strokeWidth={0.8} />
                        </span>
                      </div>
                      <p>
                        {data.routines[0]
                          ? `${data.routines[0].exercises.length} exercises · ${data.routines[0].exercises.reduce((a, e) => a + e.sets, 0)} sets`
                          : 'Build a routine that works for you.\nKeep every set in one place.'}
                      </p>
                      <Button
                        className="primary"
                        onClick={() => start(data.routines[0])}
                      >
                        Start workout{' '}
                        <span className="button-orb">
                          <ArrowUpRight size={22} strokeWidth={1.6} />
                        </span>
                      </Button>
                      <div className="feature-footer">
                        <a href="/coaching" className="co-workspace-link">
                          Coach workspace <ArrowUpRight size={16} />
                        </a>
                      </div>
                    </div>
                  </section>
                  <section className="bezel compact-weight">
                    <div className="card">
                      <div className="section-label">
                        BODY WEIGHT{' '}
                        <ChartNoAxesCombined size={18} strokeWidth={1.4} />
                      </div>
                      {stats.latest ? (
                        <>
                          <div className="compact-reading">
                            <strong>
                              {displayWeight(
                                stats.latest.trend,
                                data.unit,
                              ).toFixed(1)}
                            </strong>
                            <span>{data.unit}</span>
                          </div>
                          <p>Smoothed weight</p>
                          <svg
                            className="sparkline"
                            viewBox="0 0 240 65"
                            role="img"
                            aria-label="Smoothed weight trend"
                          >
                            {(() => {
                              const p = stats.points.slice(-30),
                                lo = Math.min(...p.map((x) => x.trend)) - 0.1,
                                hi = Math.max(...p.map((x) => x.trend)) + 0.1;
                              return (
                                <path
                                  d={p
                                    .map(
                                      (v, i) =>
                                        `${i ? 'L' : 'M'}${p.length === 1 ? 120 : (i / (p.length - 1)) * 240},${7 + ((hi - v.trend) / (hi - lo)) * 50}`,
                                    )
                                    .join(' ')}
                                  fill="none"
                                  stroke="#709246"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                              );
                            })()}
                          </svg>
                        </>
                      ) : (
                        <>
                          <h2 className="metric">
                            Weight
                            <br />
                            tracker
                          </h2>
                          <p>
                            Log your body weight.
                            <br />
                          </p>
                        </>
                      )}
                      <Button
                        className="text-button weight-link"
                        onClick={() => setTab('weight')}
                      >
                        {stats.latest ? 'See your progress' : 'Log your weight'}
                        <ArrowUpRight size={18} />
                      </Button>
                    </div>
                  </section>
                </div>
                <section className="week-strip">
                  <div>
                    <span className="eyebrow">THIS WEEK</span>
                    <h3>
                      {weekly.length}{' '}
                      {weekly.length === 1 ? 'session' : 'sessions'}{' '}
                      <span>and counting.</span>
                    </h3>
                  </div>
                  <div className="week-days">
                    {weekDays.map((date, i) => {
                      const has = data.workouts.some(
                          (w) =>
                            new Date(w.startedAt).toDateString() ===
                            date.toDateString(),
                        ),
                        isToday =
                          date.toDateString() === new Date().toDateString();
                      return (
                        <div key={i} className={isToday ? 'is-today' : ''}>
                          <span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                          <div
                            className={has ? 'trained' : ''}
                            aria-label={`${date.toLocaleDateString()}: ${has ? 'workout completed' : 'no workout'}`}
                          >
                            {has ? <Check size={15} /> : date.getDate()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <div className="section-title">
                  <h2>
                    Your routines{' '}
                    <span className="count">{data.routines.length}</span>
                  </h2>
                  <Button
                    className="text-button"
                    disabled={data.routines.length >= 100}
                    onClick={() => {
                      setEditing(null);
                      setEditor(true);
                    }}
                  >
                    <Plus size={17} />
                    Create routine
                  </Button>
                </div>
                <div className="routine-list">
                  {data.routines.map((r, i) => (
                    <section className="routine-row" key={r.id}>
                      <div className="routine-mark">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="routine-info">
                        <h3>{r.name}</h3>
                        <p>
                          {r.exercises.length} exercises ·{' '}
                          {r.exercises.reduce((a, e) => a + e.sets, 0)} sets
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        className="icon-button routine-edit"
                        aria-label={`Edit ${r.name}`}
                        onClick={() => {
                          setEditing(r);
                          setEditor(true);
                        }}
                      >
                        <Pencil size={17} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="icon-button routine-edit"
                        aria-label={`Delete ${r.name}`}
                        onClick={() => setRemove({ kind: 'routine', id: r.id })}
                      >
                        <Trash2 size={17} />
                      </Button>
                      <Button
                        className="play-routine"
                        aria-label={`Start ${r.name}`}
                        onClick={() => start(r)}
                      >
                        <Play size={17} fill="currentColor" />
                      </Button>
                    </section>
                  ))}
                  {!data.routines.length && (
                    <div className="empty-routine">
                      <div className="routine-mark">
                        <Bookmark size={25} strokeWidth={1.3} />
                      </div>
                      <div>
                        <h3>No routines yet</h3>
                        <p>
                          Add your exercises, set targets, and make it
                          repeatable.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <details className="starter-routines">
                  <summary>Need a starting point?</summary>
                  <p>
                    General starter templates. Adapt exercises and targets to
                    your own program.
                  </p>
                  <div>
                    {STARTERS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setEditing({ ...r, id: id() });
                          setEditor(true);
                        }}
                      >
                        <Dumbbell size={20} strokeWidth={1.4} />
                        <span>
                          <strong>{r.name}</strong>
                          <small>{r.exercises.length} exercises</small>
                        </span>
                        <Plus size={18} />
                      </button>
                    ))}
                  </div>
                </details>
                {lastWorkout && (
                  <div className="last-session">
                    <div>
                      <span className="eyebrow">LAST SESSION</span>
                      <h3>{lastWorkout.name}</h3>
                      <p>
                        {dateLabel(lastWorkout.startedAt, true)} ·{' '}
                        {completedSets(lastWorkout)} sets ·{' '}
                        {volume(lastWorkout).toLocaleString()} kg
                      </p>
                    </div>
                    <Button
                      className="text-button"
                      onClick={() => setDetail(lastWorkout)}
                    >
                      View session
                      <ArrowUpRight size={18} />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="history-summary">
                  <div>
                    <span>SESSIONS LOGGED</span>
                    <strong>{data.workouts.length}</strong>
                  </div>
                  <div>
                    <span>SETS COMPLETED</span>
                    <strong>
                      {data.workouts.reduce((a, w) => a + completedSets(w), 0)}
                    </strong>
                  </div>
                  <div>
                    <span>TOTAL VOLUME</span>
                    <strong>
                      {(
                        data.workouts.reduce((a, w) => a + volume(w), 0) / 1000
                      ).toFixed(1)}
                      <small> t</small>
                    </strong>
                  </div>
                </div>
                <ProgressPanel data={data} />
                <div className="section-title">
                  <h2>Session journal</h2>
                  <Button className="text-button" onClick={() => start()}>
                    <Plus size={17} />
                    {data.active ? 'Resume' : 'New workout'}
                  </Button>
                </div>
                {!data.workouts.length ? (
                  <section className="history-empty">
                    <History size={38} strokeWidth={1.2} />
                    <h2>No workouts yet</h2>
                    <p>Finish your first workout to start your journal.</p>
                    <Button className="primary" onClick={() => start()}>
                      Start workout
                      <span className="button-orb">
                        <ArrowUpRight size={20} />
                      </span>
                    </Button>
                  </section>
                ) : (
                  <div className="history-list">
                    {[...data.workouts].reverse().map((w) => (
                      <button
                        className="history-row"
                        key={w.id}
                        onClick={() => setDetail(w)}
                      >
                        <div className="date-tile">
                          <strong>{new Date(w.startedAt).getDate()}</strong>
                          <span>
                            {new Date(w.startedAt).toLocaleDateString('en-GB', {
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <div>
                          <h3>{w.name}</h3>
                          <p>
                            {w.exercises.length} exercises · {completedSets(w)}{' '}
                            sets
                          </p>
                        </div>
                        <div className="history-volume">
                          <strong>{volume(w).toLocaleString()} kg</strong>
                          <span>
                            {Math.max(
                              1,
                              Math.round(
                                (Date.parse(w.finishedAt!) -
                                  Date.parse(w.startedAt)) /
                                  60000,
                              ),
                            )}{' '}
                            min
                          </span>
                        </div>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
        {!demo && ready && !data.workouts.length && !data.weights.length && (
          <button
            className="sample-link"
            onClick={() => {
              setDemo(demoData());
              setTab('train');
            }}
          >
            <FlaskConical size={15} />
            Explore an example with sample data
          </button>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {nav.map(([key, label, Icon]) => (
          <button
            key={key}
            className={tab === key ? 'selected' : ''}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}
          >
            <Icon size={21} strokeWidth={1.5} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {editor && (
        <RoutineEditor
          open={editor}
          routine={editing}
          onClose={() => setEditor(false)}
          onSave={(r) =>
            update((d) => ({
              ...d,
              routines: d.routines.some((v) => v.id === r.id)
                ? d.routines.map((v) => (v.id === r.id ? r : v))
                : [...d.routines, r],
            }))
          }
        />
      )}
      <Dialog
        open={!!remove}
        onOpenChange={(v) => {
          if (!v) setRemove(null);
        }}
      >
        <DialogContent className="form-dialog">
          <DialogTitle>Delete this {remove?.kind}?</DialogTitle>
          <DialogDescription>
            {remove?.kind === 'routine'
              ? 'Your completed workouts will be kept.'
              : 'This removes the session and all of its sets from your history.'}
          </DialogDescription>
          <Button
            className="danger-button"
            onClick={() => {
              if (remove?.kind === 'routine')
                update((d) => ({
                  ...d,
                  routines: d.routines.filter((r) => r.id !== remove.id),
                }));
              else
                update((d) => ({
                  ...d,
                  workouts: d.workouts.filter((w) => w.id !== remove?.id),
                }));
              setRemove(null);
              setDetail(null);
            }}
          >
            Delete {remove?.kind}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
      >
        <DialogContent className="form-dialog history-dialog">
          <DialogTitle>{detail?.name}</DialogTitle>
          <DialogDescription>
            {detail ? dateLabel(detail.startedAt, true) : ''} ·{' '}
            {detail ? completedSets(detail) : 0} sets ·{' '}
            {detail ? volume(detail).toLocaleString() : 0} kg total volume
          </DialogDescription>
          {detail?.exercises.map((e) => (
            <section className="detail-exercise" key={e.id}>
              <h3>{e.name}</h3>
              <div>
                {e.sets.map((s, i) => (
                  <span key={s.id}>
                    <small>{i + 1}</small>
                    {displayWeight(Number(s.kg), e.unit ?? 'kg').toLocaleString(
                      undefined,
                      { maximumFractionDigits: 2 },
                    )}{' '}
                    {e.unit ?? 'kg'} × {s.reps}
                    {s.kind === 'warmup' ? ' · Warm-up' : ''}
                    <Check size={14} />
                  </span>
                ))}
              </div>
            </section>
          ))}
          {detail?.notes && <p className="detail-notes">{detail.notes}</p>}
          <Button
            className="secondary full"
            onClick={() => {
              if (detail) {
                const r = {
                  id: id(),
                  name: detail.name,
                  exercises: detail.exercises.map((e) => ({
                    name: e.name,
                    muscle: e.muscle,
                    unit: e.unit,
                    sets: Math.max(
                      1,
                      e.sets.filter((s) => s.kind !== 'warmup').length,
                    ),
                    reps: Number(
                      e.sets.find((s) => s.kind !== 'warmup')?.reps || '8',
                    ),
                  })),
                };
                setDetail(null);
                start(r);
              }
            }}
          >
            Repeat workout
            <Play size={17} />
          </Button>
          <Button
            className="text-button muted-danger"
            onClick={() =>
              detail && setRemove({ kind: 'workout', id: detail.id })
            }
          >
            Delete workout
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="form-dialog">
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>
            Choose kg or lb for each exercise. Body weight has its own unit
            setting.
          </DialogDescription>
          <ThemeControl />
          <div className="settings-list">
            <button
              onClick={async () => {
                if (installPrompt) {
                  await installPrompt.prompt();
                  setInstallPrompt(null);
                } else setInstallHelp(true);
              }}
            >
              <Smartphone size={21} />
              <span>
                <strong>Install on your phone</strong>
                <small>Keep Form on your home screen</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <button disabled={!ready} onClick={() => download()}>
              <Download size={21} />
              <span>
                <strong>Export your data</strong>
                <small>Download a complete backup</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <button disabled={!ready} onClick={() => fileRef.current?.click()}>
              <Upload size={21} />
              <span>
                <strong>Restore a backup</strong>
                <small>Import a Form JSON backup</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <button
              onClick={() => {
                setDemo(demoData());
                setSettings(false);
                setTab('train');
              }}
            >
              <FlaskConical size={21} />
              <span>
                <strong>Explore an example</strong>
                <small>Try Form with sample data</small>
              </span>
              <ChevronRight size={17} />
            </button>
          </div>
          <input
            type="file"
            ref={fileRef}
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              if (e.target.files?.[0]) void readImport(e.target.files[0]);
            }}
          />
          {importError && (
            <p role="alert" className="error-text">
              {importError}
            </p>
          )}
          <p className="privacy-note">
            Changes save on this phone and sync automatically when Form is open
            and connected. Open Form online once before using it offline.
            Signing out removes this phone’s saved copy after syncing.
          </p>
          <a
            className="signout-link"
            onClick={(e) => {
              if (!store.signOut()) e.preventDefault();
            }}
            href="/signout-with-chatgpt?return_to=%2F"
            target="_top"
          >
            Sign out
          </a>
        </DialogContent>
      </Dialog>
      <Dialog open={installHelp} onOpenChange={setInstallHelp}>
        <DialogContent className="form-dialog">
          <DialogTitle>A place on your home screen.</DialogTitle>
          <DialogDescription>
            Open your private Form link in your phone’s browser and sign in.
          </DialogDescription>
          <div className="install-steps">
            <h3>On iPhone</h3>
            <p>
              In Safari, tap Share, then Add to Home Screen. Leave “Open as Web
              App” enabled if shown, and tap Add.
            </p>
            <h3>On Android</h3>
            <p>
              In Chrome, open the menu and choose Install app or Add to Home
              screen.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!importData}
        onOpenChange={(v) => {
          if (!v) setImportData(null);
        }}
      >
        <DialogContent className="form-dialog">
          <DialogTitle>Restore this backup?</DialogTitle>
          <DialogDescription>
            This replaces your current log with {importData?.workouts.length}{' '}
            workouts and {importData?.weights.length} weigh-ins. Export your
            current data first if you want to keep it.
          </DialogDescription>
          <Button className="secondary" onClick={() => download()}>
            Export current data
          </Button>
          <Button
            className="primary full"
            onClick={() => {
              if (importData) update(() => importData);
              setImportData(null);
              setSettings(false);
            }}
          >
            Replace with backup
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
