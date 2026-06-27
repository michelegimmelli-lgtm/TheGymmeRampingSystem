import { useEffect, useMemo, useRef, useState } from "react";
import { APP_VERSION } from "./appConfig";
import { buildProtocol, evaluateProgression, formatLoadLine, formatWorkSetLine } from "./utils/rampingEngine";
import { loadRampingData } from "./utils/rampingData";

const MAX_COMPLETED_REP_CELLS = 8;
const PREVIOUS_SUGGESTION_STORAGE_PREFIX = "thegymme.previousSuggestion.";
const SUGGESTION_FALLBACK = "Inserisci le reps completate per generare il suggerimento.";

const DEFAULT_FORM = {
  exerciseKey: "back_squat",
  targetKg: 110,
  sets: 4,
  reps: 4,
};

const positiveInt = (value, fallback = 1) => Math.max(1, parseInt(value, 10) || fallback);

const clampSetCount = value => Math.min(MAX_COMPLETED_REP_CELLS, positiveInt(value));

const normalizeSetInput = value => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return String(Math.min(MAX_COMPLETED_REP_CELLS, positiveInt(digits)));
};

const buildDefaultCompletedReps = (sets, reps) =>
  Array.from({ length: clampSetCount(sets) }, () => positiveInt(reps));

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [completedReps, setCompletedReps] = useState(() => buildDefaultCompletedReps(DEFAULT_FORM.sets, DEFAULT_FORM.reps));
  const [previousSuggestion, setPreviousSuggestion] = useState("");
  const previousTargetRepsRef = useRef(DEFAULT_FORM.reps);
  const lastSuggestionRef = useRef("");

  useEffect(() => {
    let mounted = true;
    loadRampingData()
      .then(nextData => {
        if (mounted) setData(nextData);
      })
      .catch(() => {
        if (mounted) setError("Dati ramping non disponibili.");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const protocol = useMemo(() => {
    if (!data) return null;
    return buildProtocol({ ...form, data });
  }, [data, form]);

  const visibleSetCount = clampSetCount(form.sets);
  const targetRepCount = positiveInt(form.reps);

  useEffect(() => {
    const previousTargetReps = previousTargetRepsRef.current;

    setCompletedReps(prev =>
      Array.from({ length: visibleSetCount }, (_, index) => {
        const current = prev[index];
        const parsed = parseInt(current, 10);

        if (!Number.isFinite(parsed)) return targetRepCount;
        if (previousTargetReps !== targetRepCount && parsed === previousTargetReps) return targetRepCount;

        return current;
      })
    );

    previousTargetRepsRef.current = targetRepCount;
  }, [targetRepCount, visibleSetCount]);

  const progression = useMemo(() => {
    if (!data || !protocol) return null;
    return evaluateProgression({
      targetSets: visibleSetCount,
      targetReps: targetRepCount,
      completedReps,
      data,
    });
  }, [completedReps, data, protocol, targetRepCount, visibleSetCount]);

  const currentSuggestion = progression?.rule?.suggestion || "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = `${PREVIOUS_SUGGESTION_STORAGE_PREFIX}${form.exerciseKey}`;
    const storedSuggestion = window.localStorage.getItem(storageKey) || "";
    setPreviousSuggestion(storedSuggestion);
    lastSuggestionRef.current = storedSuggestion;
  }, [form.exerciseKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !currentSuggestion) return;

    const storageKey = `${PREVIOUS_SUGGESTION_STORAGE_PREFIX}${form.exerciseKey}`;
    const lastSuggestion = lastSuggestionRef.current || window.localStorage.getItem(storageKey) || "";

    if (lastSuggestion && lastSuggestion !== currentSuggestion) {
      setPreviousSuggestion(lastSuggestion);
    }

    window.localStorage.setItem(storageKey, currentSuggestion);
    lastSuggestionRef.current = currentSuggestion;
  }, [currentSuggestion, form.exerciseKey]);

  const exercises = data
    ? Object.entries(data.exercises).map(([key, exercise]) => ({ key, ...exercise }))
    : [];

  const updateField = event => {
    const { name, value } = event.target;
    const nextValue = name === "sets" ? normalizeSetInput(value) : value;
    setForm(prev => ({ ...prev, [name]: nextValue }));
  };

  const updateCompletedRep = (index, value) => {
    setCompletedReps(prev => {
      const next = [...prev];
      next[index] = value === "" ? "" : Math.max(0, parseInt(value, 10) || 0);
      return next;
    });
  };

  if (error) {
    return (
      <>
        <header className="tg-header">
          <p className="logo">The<span>Gym</span>me</p>
          <p className="subtitle">Ramping System</p>
        </header>
        <main className="wrap">
          <div className="card ca2">{error}</div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="tg-header">
        <div className="app-version">ver {APP_VERSION}</div>
        <p className="logo">The<span>Gym</span>me</p>
        <p className="subtitle">Ramping System</p>
        <p className="desc">Protocollo ramping rapido per fondamentali</p>
      </header>

      <main className="wrap">
        <div className="grid">
          <section>
            <div className="card ca1">
              <div className="section-title">Dati allenamento</div>
              <label>Esercizio</label>
              <select name="exerciseKey" value={form.exerciseKey} onChange={updateField}>
                {exercises.map(exercise => (
                  <option key={exercise.key} value={exercise.key}>{exercise.name}</option>
                ))}
              </select>

              <div className="row3">
                <div>
                  <label>Peso target kg</label>
                  <input name="targetKg" type="number" min="0" step="2.5" value={form.targetKg} onChange={updateField} />
                </div>
                <div>
                  <label>Serie</label>
                  <input name="sets" type="text" inputMode="numeric" pattern="[0-9]*" value={form.sets} onChange={updateField} />
                </div>
                <div>
                  <label>Ripetizioni</label>
                  <input name="reps" type="number" min="1" value={form.reps} onChange={updateField} />
                </div>
              </div>
            </div>

          </section>

          <section>
            <div className="sticky-panel">
              <div className="kpi">
                <div className="kbox k1">
                  <div className="kl">Target</div>
                  <div className="kv">{form.targetKg}</div>
                  <div className="ks">kg</div>
                </div>
                <div className="kbox k2">
                  <div className="kl">Schema</div>
                  <div className="kv">{form.sets}x{form.reps}</div>
                </div>
                <div className="kbox k3">
                  <div className="kl">Pattern</div>
                  <div className="kv small-kv">{protocol?.exercise?.pattern || "-"}</div>
                </div>
              </div>

              <div className="card ca1">
                <div className="section-title">Protocollo</div>
                {!protocol ? (
                  <div className="empty">Caricamento dati</div>
                ) : (
                  <div className="protocol">
                    <h1>{protocol.title}</h1>
                    <ProtocolBlock title="Mobilita" items={protocol.pattern.mobility.map(item => `${item.name} × ${item.reps || item.duration}`)} />
                    <ProtocolBlock title="Attivazione" items={protocol.pattern.activation.map(item => `${item.name} × ${item.reps || item.duration}`)} />
                    <ProtocolBlock title="Ramping" items={protocol.ramping.map(formatLoadLine)} />
                    <ProtocolBlock title="Work Set" items={protocol.workSets.map(set => formatWorkSetLine(set.load, set.reps))} />
                    <ProtocolBlock title="Recuperi" items={protocol.pattern.recoveries} />
                    <ProtocolBlock title="Cues Tecnici" items={protocol.pattern.cues} />
                    <ProtocolBlock title="Over 40 Notes" items={protocol.pattern.over40Notes} />
                    <ProtocolBlock
                      title="Suggerimenti sedute"
                      items={[
                        `Seduta precedente: ${previousSuggestion || "Nessun suggerimento precedente salvato."}`,
                        `Prossima seduta: ${currentSuggestion || SUGGESTION_FALLBACK}`,
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
        <div className="card ca2">
          <div className="section-title">Auto.Feedback Progressione</div>
          <label>Reps completate</label>
          <div className="reps-grid">
            {completedReps.map((value, index) => (
              <div className="rep-cell" key={`completed-rep-${index}`}>
                <span>Serie {index + 1}</span>
                <input
                  type="number"
                  min="0"
                  max={targetRepCount}
                  value={value}
                  onChange={event => updateCompletedRep(index, event.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="ibox">
            <strong>{progression?.rule?.label || "Pronto"}</strong>
            <br />
            Target {progression?.targetReps || 0} reps - completate {progression?.completedReps || 0} - mancanti {progression?.missingReps || 0}
            <br />
            {progression?.rule?.suggestion || "Inserisci le reps completate."}
          </div>
        </div>
      </main>
    </>
  );
}

function ProtocolBlock({ title, items }) {
  return (
    <section className="protocol-block">
      <h2>{title}</h2>
      <ul>
        {(items || []).map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

