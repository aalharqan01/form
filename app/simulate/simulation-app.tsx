'use client';
import { useCallback, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft,
  FlaskConical,
  Users,
  Dumbbell,
  RotateCcw,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import CoachingWorkspace, {
  Marketplace,
  MyCoach,
} from '../coaching/coaching-ui';
import {
  CoachingTransportContext,
  type CoachingTransport,
} from '../coaching/transport';
import WorkoutPanel from '../workout-panel';
import WeightPanel from '../weight-panel';
import { type FitnessData, type Routine, completedSets } from '@/lib/fitness';
import {
  createSimulationStore,
  type Simulation,
  simulationRequest,
  simulatePayment,
  exampleProgram,
  addSimulationHistory,
  startSimulationWorkout,
} from '@/lib/simulation';
import './simulation.css';
/* oxlint-disable nextjs/no-html-link-for-pages */
export default function SimulationApp() {
  const [store] = useState(createSimulationStore);
  const s = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const [role, setRole] = useState<'coach' | 'trainee'>('trainee'),
    [panel, setPanel] = useState<
      'marketplace' | 'coach' | 'workout' | 'weight'
    >('marketplace'),
    [epoch, setEpoch] = useState(0),
    [error, setError] = useState(''),
    [reset, setReset] = useState(false);
  const m = s.member;
  const transport: CoachingTransport = useCallback(
    async <T,>(q = '', body?: unknown) => {
      const result = store.request(role, q, body);
      return structuredClone(result) as T;
    },
    [role, store],
  );
  const update = (fn: (f: FitnessData) => FitnessData) => {
    store.change((d) => {
      d.fitness = fn(d.fitness);
    });
  };
  const start = (r: Routine) => {
    try {
      store.change((d) => startSimulationWorkout(d, r));
      setPanel('workout');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  function action(fn: (draft: Simulation) => void) {
    try {
      store.change(fn);
      setError('');
      setEpoch((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const step = !m
    ? 0
    : m.status === 'requested'
      ? 1
      : m.status === 'awaiting_payment'
        ? 2
        : !m.program
          ? 3
          : !s.fitness.workouts.length
            ? 4
            : s.historyAdded
              ? 6
              : 5;
  const stopped = m && ['rejected', 'withdrawn', 'ended'].includes(m.status);
  const titles = [
    'Choose a coach',
    'Coach reviews request',
    'Simulate payment',
    'Coach assigns workouts',
    'Trainee logs a session',
    'Log bodyweight',
    'Coach reviews progress',
  ];
  const instructions = [
    'Browse Sam’s package below and send a request. Or use the sample request to move quickly.',
    'Switch to Coach, open Alex’s request, and accept it. The coach sees the intake but cannot access workout or weight history yet.',
    'Switch to Trainee. The request is accepted, but coaching is still locked. The simulation button below represents a verified payment; it never charges money.',
    'Switch to Coach, open Alex, and choose Assign program. You can build it yourself or assign the example below.',
    'Switch to Trainee → My coach → Sam → Program. Start a session, enter weights and reps, mark sets done, and finish. The saved workout is immediately visible to the simulated coach.',
    'Open Daily weight to record a weigh-in. Then add four weeks of sample progress and switch to Coach to review the results.',
    'Switch to Coach, open Alex, and use Overview → Shared progress. Open an exercise to compare weekly load, reps and volume. Weight history shows every daily entry. Try Check-ins and Messages too.',
  ];
  return (
    <div className="sim-app">
      <header className="sim-header">
        <div className="sim-header-line">
          <a href="/coaching">
            <ArrowLeft size={16} />
            Exit simulation
          </a>
          <span>
            <FlaskConical size={17} />
            SIMULATION · NO REAL DATA OR PAYMENTS
          </span>
          <Button className="text-button" onClick={() => setReset(true)}>
            <RotateCcw size={16} />
            Reset
          </Button>
        </div>
        <div className="sim-controls">
          <div className="range-switch">
            <button
              aria-pressed={role === 'trainee'}
              onClick={() => setRole('trainee')}
            >
              <Dumbbell size={17} />
              Trainee · Alex
            </button>
            <button
              aria-pressed={role === 'coach'}
              onClick={() => setRole('coach')}
            >
              <Users size={17} />
              Coach · Sam
            </button>
          </div>
          {role === 'trainee' && (
            <nav className="range-switch" aria-label="Simulation trainee views">
              {[
                ['marketplace', 'Marketplace'],
                ['coach', 'My coach'],
                ['workout', 'Workout'],
                ['weight', 'Daily weight'],
              ].map(([v, l]) => (
                <button
                  key={v}
                  aria-pressed={panel === v}
                  onClick={() => setPanel(v as typeof panel)}
                >
                  {l}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>
      <section className="sim-guide">
        <div className="sim-step">
          <span>{String(step + 1).padStart(2, '0')}</span>
          <div>
            <h1>{stopped ? 'This scenario has ended' : titles[step]}</h1>
            <p>
              {stopped
                ? 'Reset the simulation to rehearse a new coaching relationship. No real membership was affected.'
                : instructions[step]}
            </p>
          </div>
        </div>
        <div className="sim-shortcuts">
          {!m && (
            <Button
              className="secondary"
              onClick={() =>
                action((draft) => {
                  simulationRequest(draft, 'trainee', '', {
                    action: 'request',
                    name: 'Alex',
                    offerId: 'demo-package',
                    consent: true,
                    intake: {
                      goals: 'Build strength while tracking my weight.',
                      experience: 'Six months of lifting',
                      equipment: 'Full gym',
                      limitations: 'Prefer controlled, moderate loads.',
                      days: 3,
                      country: 'QA',
                    },
                  });
                  setPanel('coach');
                })
              }
            >
              Use sample request
              <ArrowRight size={16} />
            </Button>
          )}
          {m?.status === 'awaiting_payment' && role === 'trainee' && (
            <Button
              className="primary"
              onClick={() =>
                action((draft) => {
                  simulatePayment(draft);
                  setPanel('coach');
                })
              }
            >
              Simulate successful payment
              <Check size={17} />
            </Button>
          )}
          {m?.status === 'active' && !m.program && role === 'coach' && (
            <Button
              className="primary"
              onClick={() =>
                action((draft) => {
                  simulationRequest(draft, 'coach', '', {
                    action: 'program',
                    program: exampleProgram(),
                  });
                })
              }
            >
              Assign example program
              <Check size={17} />
            </Button>
          )}
          {m?.status === 'active' && m.program && !s.historyAdded && (
            <Button
              className="secondary"
              onClick={() => action((draft) => addSimulationHistory(draft))}
            >
              Jump ahead: add four weeks of sample progress
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
        <p className="sim-safety">
          Everything here stays in this tab’s memory. Refreshing or resetting
          clears it. Sample history is fictional; no real account, message,
          payment or membership is changed.
        </p>
        {error && (
          <p className="co-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <CoachingTransportContext.Provider value={transport}>
        <div
          className="sim-surface"
          key={`${role}-${panel}-${epoch}`}
          onClickCapture={(e) => {
            const a = (e.target as HTMLElement).closest('a');
            if (!a) return;
            const href = a.getAttribute('href');
            if (href?.startsWith('/') && !href.startsWith('//')) {
              e.preventDefault();
              if (href.startsWith('/coaching')) setRole('coach');
              else {
                setRole('trainee');
                setPanel(
                  href.includes('marketplace') ? 'marketplace' : 'coach',
                );
              }
            }
          }}
        >
          {role === 'coach' ? (
            <CoachingWorkspace />
          ) : (
            <main className="sim-trainee">
              {panel === 'marketplace' ? (
                <Marketplace onRequests={() => setPanel('coach')} />
              ) : panel === 'coach' ? (
                <MyCoach onStart={start} />
              ) : panel === 'weight' ? (
                <WeightPanel data={s.fitness} update={update} />
              ) : s.fitness.active ? (
                <WorkoutPanel
                  restStorageKey="form-simulation-rest"
                  data={s.fitness}
                  update={update}
                  onFinish={() => setPanel('coach')}
                />
              ) : (
                <section className="co-empty">
                  <Dumbbell size={32} />
                  <h2>
                    {s.fitness.workouts.length
                      ? 'Workout saved'
                      : 'Your assigned workouts'}
                  </h2>
                  <p>
                    {s.fitness.workouts.length
                      ? `${s.fitness.workouts.length} sessions · ${s.fitness.workouts.reduce((n, w) => n + completedSets(w), 0)} completed sets. Switch to Coach to see the same progress.`
                      : 'Open My coach, select Sam, then use the Program tab to start an assigned session.'}
                  </p>
                  <Button className="primary" onClick={() => setPanel('coach')}>
                    Open My coach
                    <ArrowRight size={17} />
                  </Button>
                </section>
              )}
            </main>
          )}
        </div>
      </CoachingTransportContext.Provider>
      <Dialog open={reset} onOpenChange={setReset}>
        <DialogContent className="form-dialog">
          <DialogTitle>Restart the simulation?</DialogTitle>
          <DialogDescription>
            This clears only the fictional coaching scenario, workouts,
            weigh-ins and messages in this tab.
          </DialogDescription>
          <Button
            className="primary full"
            onClick={() => {
              store.reset();
              sessionStorage.removeItem('form-simulation-rest');
              setRole('trainee');
              setPanel('marketplace');
              setReset(false);
              setError('');
              setEpoch((v) => v + 1);
            }}
          >
            Restart
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
