import FitnessApp from '../fitness-app';
// Generic offline shell: no identity or private records are rendered by the server.
export default function OfflinePage() {
  return (
    <>
      <span hidden>FORM_OFFLINE_SHELL</span>
      <FitnessApp />
    </>
  );
}
