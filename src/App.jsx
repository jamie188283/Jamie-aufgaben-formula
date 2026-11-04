import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TASKS = [
  'Geschirrspüler',
  'Müll (Zimmer)',
  'Müll (Wohnung)',
  'Pfand zusammen packen',
  'Wäsche',
  'Einkaufen'
];

export default function App() {
  const [role, setRole] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [forms, setForms] = useState([]);
  const [selected, setSelected] = useState([]);
  const [shopping, setShopping] = useState('');
  const [money, setMoney] = useState('');
  const [sending, setSending] = useState(false);
  const [completed, setCompleted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jamie_completed') || '{}');
    } catch {
      return {};
    }
  });

  async function loadForms() {
    try {
      const { data, error: queryError } = await supabase
        .from('household_forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) {
        setError('Aufgaben konnten nicht geladen werden: ' + queryError.message);
        return false;
      }

      setForms(data || []);
      return true;
    } catch (e) {
      setError('Verbindungsfehler beim Laden: ' + (e.message || String(e)));
      return false;
    }
  }

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          const { error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
        }

        if (active) {
          setReady(true);
          await loadForms();
        }
      } catch (e) {
        if (active) setError('Verbindung fehlgeschlagen: ' + e.message);
      }
    }

    start();

    const timer = setInterval(() => {
      if (active) loadForms();
    }, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  function toggleTask(task) {
    setSelected(old =>
      old.includes(task)
        ? old.filter(t => t !== task)
        : [...old, task]
    );
  }

  async function sendForm() {
    if (!selected.length) {
      setError('Bitte wähle mindestens eine Aufgabe aus.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('household_forms')
        .insert({
          tasks: selected,
          shopping_items: selected.includes('Einkaufen') ? shopping : null,
          shopping_money_location: selected.includes('Einkaufen') ? money : null
        });

      if (insertError) throw insertError;

      setSelected([]);
      setShopping('');
      setMoney('');

      await loadForms();
      alert('Aufgaben wurden verschickt!');
    } catch (e) {
      setError('Senden fehlgeschlagen: ' + (e.message || String(e)));
    } finally {
      setSending(false);
    }
  }

  function toggleCompleted(formId, task) {
    const key = String(formId);
    const current = completed[key] || [];
    const next = current.includes(task)
      ? current.filter(t => t !== task)
      : [...current, task];

    const updated = { ...completed, [key]: next };
    setCompleted(updated);
    localStorage.setItem('jamie_completed', JSON.stringify(updated));
  }

  if (!ready) {
    return (
      <main className="app">
        <div className="panel">
          <h1>Jamie Aufgaben Formular</h1>
          <p>{error || 'Verbindung wird hergestellt ...'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="top">
        <div className="logo">JF</div>
        <div>
          <h1>Jamie Aufgaben Formular</h1>
          <p>Gemeinsam den Alltag organisieren</p>
        </div>
      </header>

      {!role ? (
        <section className="panel">
          <h2>Wer benutzt die App?</h2>
          <p className="muted">Wähle deinen Bereich aus.</p>
          <button className="primary role" onClick={() => setRole('Jamie')}>
            Jamie
            <span>Aufgaben ansehen und abhaken</span>
          </button>
          <button className="secondary role" onClick={() => setRole('Mama')}>
            Mama
            <span>Aufgaben auswählen und senden</span>
          </button>
        </section>
      ) : role === 'Mama' ? (
        <section className="panel">
          <div className="sectionHead">
            <div>
              <span className="eyebrow">MAMA-BEREICH</span>
              <h2>Aufgaben erstellen</h2>
            </div>
            <button className="small" onClick={() => setRole(null)}>Zurück</button>
          </div>

          <p className="muted">Wähle aus, was Jamie erledigen soll.</p>

          <div className="taskList">
            {TASKS.map(task => (
              <label className="taskChoice" key={task}>
                <input
                  type="checkbox"
                  checked={selected.includes(task)}
                  onChange={() => toggleTask(task)}
                />
                <span>{task}</span>
              </label>
            ))}
          </div>

          {selected.includes('Einkaufen') && (
            <div className="shoppingFields">
              <label>Was soll eingekauft werden?</label>
              <textarea
                value={shopping}
                onChange={e => setShopping(e.target.value)}
                placeholder="Einkaufsliste ..."
              />
              <label>Wo liegt das Geld?</label>
              <input
                value={money}
                onChange={e => setMoney(e.target.value)}
                placeholder="Zum Beispiel: Küchentisch"
              />
            </div>
          )}

          <button className="primary send" onClick={sendForm} disabled={sending}>
            {sending ? 'Wird gesendet ...' : 'Formular an Jamie senden'}
          </button>

          <div className="history">
            <h3>Zuletzt gesendete Formulare</h3>
            {forms.length === 0 ? (
              <p className="muted">Noch keine Formulare gesendet.</p>
            ) : forms.slice(0, 5).map(form => (
              <div className="historyItem" key={form.id}>
                {(form.tasks || []).join(' · ')}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="sectionHead">
            <div>
              <span className="eyebrow">JAMIE-BEREICH</span>
              <h2>Deine Aufgaben</h2>
            </div>
            <button className="small" onClick={() => setRole(null)}>Zurück</button>
          </div>

          {forms.length === 0 ? (
            <p className="muted">Noch keine Aufgaben erhalten.</p>
          ) : forms.map(form => {
            const done = completed[String(form.id)] || [];
            const tasks = form.tasks || [];

            return (
              <div className="receivedForm" key={form.id}>
                <div className="formDate">
                  {new Date(form.created_at).toLocaleString('de-DE')}
                </div>

                {tasks.map(task => (
                  <label className="taskChoice received" key={task}>
                    <input
                      type="checkbox"
                      checked={done.includes(task)}
                      onChange={() => toggleCompleted(form.id, task)}
                    />
                    <span className={done.includes(task) ? 'done' : ''}>
                      {task}
                    </span>
                  </label>
                ))}

                {tasks.includes('Einkaufen') && (
                  <div className="shoppingInfo">
                    {form.shopping_items && (
                      <p><strong>Einkaufsliste:</strong><br />{form.shopping_items}</p>
                    )}
                    {form.shopping_money_location && (
                      <p><strong>Geld liegt:</strong> {form.shopping_money_location}</p>
                    )}
                  </div>
                )}

                <p className="progress">
                  {done.filter(t => tasks.includes(t)).length} von {tasks.length} erledigt
                </p>
              </div>
            );
          })}
        </section>
      )}

      {error && <div className="error">{error}</div>}
      <footer>Jamie Aufgaben Formular</footer>
    </main>
  );
}
