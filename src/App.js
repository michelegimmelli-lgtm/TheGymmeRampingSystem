import { useEffect, useMemo, useState } from "react";
import { APP_VERSION } from "./appConfig";
import { buildExportText, buildProtocol, evaluateProgression, formatLoadLine, formatWorkSetLine } from "./utils/rampingEngine";
import { loadRampingData } from "./utils/rampingData";

const DEFAULT_FORM = {
  exerciseKey: "back_squat",
  targetKg: 110,
  sets: 4,
  reps: 4,
};

const normalizeCompletedReps = value =>
  String(value || "")
    .split(/[,\s]+/)
    .map(item => parseInt(item, 10))
    .filter(Number.isFinite);

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [completedText, setCompletedText] = useState("4, 4, 4, 3");
  const [rpe, setRpe] = useState("7");
  const [copyStatus, setCopyStatus] = useState("");

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

  const progression = useMemo(() => {
    if (!data || !protocol) return null;
    return evaluateProgression({
      targetReps: form.reps,
      completedReps: normalizeCompletedReps(completedText),
      rpe,
      data,
    });
  }, [completedText, data, form.reps, protocol, rpe]);

  const exportText = useMemo(() => {
    if (!protocol) return "";
    return buildExportText({
      ...protocol,
      progressionSuggestion: progression?.rule?.suggestion || "",
    });
  }, [progression, protocol]);

  const exercises = data
    ? Object.entries(data.exercises).map(([key, exercise]) => ({ key, ...exercise }))
    : [];

  const updateField = event => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopyStatus("Copiato");
      window.setTimeout(() => setCopyStatus(""), 1400);
    } catch {
      setCopyStatus("Copia manuale dal box export");
    }
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
                  <input name="sets" type="number" min="1" value={form.sets} onChange={updateField} />
                </div>
                <div>
                  <label>Ripetizioni</label>
                  <input name="reps" type="number" min="1" value={form.reps} onChange={updateField} />
                </div>
              </div>
            </div>

            <div className="card ca2">
              <div className="section-title">Progression Engine</div>
              <div className="row">
                <div style={{ flex: 2 }}>
                  <label>Reps completate</label>
                  <input type="text" value={completedText} onChange={event => setCompletedText(event.target.value)} placeholder="4, 4, 4, 3" />
                </div>
                <div style={{ flex: 1 }}>
                  <label>RPE</label>
                  <input type="number" min="1" max="10" step="0.5" value={rpe} onChange={event => setRpe(event.target.value)} />
                </div>
              </div>
              <div className="ibox">
                <strong>{progression?.rule?.label || "Pronto"}</strong>
                <br />
                {progression?.rule?.suggestion || "Inserisci le reps completate."}
              </div>
            </div>

            <div className="card ca3">
              <div className="section-title">Export Notion / WhatsApp</div>
              <textarea className="export-box" readOnly value={exportText} />
              <div className="btn-row">
                <button className="btn bcta" onClick={copyExport} style={{ flex: 1 }}>Copia testo</button>
                {copyStatus ? <span className="copy-status">{copyStatus}</span> : null}
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
                    <ProtocolBlock title="Mobilità" items={protocol.pattern.mobility.map(item => `${item.name} × ${item.reps || item.duration}`)} />
                    <ProtocolBlock title="Attivazione" items={protocol.pattern.activation.map(item => `${item.name} × ${item.reps || item.duration}`)} />
                    <ProtocolBlock title="Ramping" items={protocol.ramping.map(formatLoadLine)} />
                    <ProtocolBlock title="Work Set" items={protocol.workSets.map(set => formatWorkSetLine(set.load, set.reps))} />
                    <ProtocolBlock title="Recuperi" items={protocol.pattern.recoveries} />
                    <ProtocolBlock title="Cues Tecnici" items={protocol.pattern.cues} />
                    <ProtocolBlock title="Over 40 Notes" items={protocol.pattern.over40Notes} />
                    <ProtocolBlock title="Suggerimento prossima seduta" items={[progression?.rule?.suggestion || "Inserisci le reps completate per generare il suggerimento."]} />
                  </div>
                )}
              </div>
            </div>
          </section>
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
