import { useState } from "react";

export default function IvEvScreen() {
  const [evs, setEvs] = useState({ hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 });
  const total = Object.values(evs).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const totalColor = total > 510 ? "#f87171" : total === 510 ? "#4ade80" : undefined;

  return (
    <section>
      <div className="page-header">
        <h1>IV / EV Tracker</h1>
        <p className="muted">Track Individual Values and Effort Values per Pokémon.</p>
      </div>

      <div className="twoCol">
        <div className="col">
          <details open className="panel">
            <summary>Select Pokémon</summary>
            <div className="formGrid">
              <label>
                Pokémon
                <select>
                  <option>Breloom</option>
                  <option>Gyarados</option>
                </select>
              </label>
              <label>
                Level
                <input defaultValue="24" type="number" />
              </label>
            </div>
          </details>

          <details open className="panel">
            <summary>
              Individual Values (IVs) <span className="muted small">0–31 per stat</span>
            </summary>
            <div className="formGrid">
              {[["HP IV", 28], ["Atk IV", 31], ["Def IV", 14], ["SpA IV", 10], ["SpD IV", 22], ["Spe IV", 19]].map(([lbl, val]) => (
                <label key={lbl}>{lbl}<input defaultValue={val} type="number" min="0" max="31" /></label>
              ))}
            </div>
            <div className="iv-note muted small">💡 Gen 1/2: IVs are 0–15 (DVs). Gen 3: 0–31.</div>
          </details>
        </div>

        <div className="col">
          <details open className="panel">
            <summary>
              Effort Values (EVs) <span className="muted small">0–255 per stat, 510 total</span>
            </summary>
            <div className="formGrid">
              {Object.entries(evs).map(([stat, val]) => (
                <label key={stat}>
                  {stat.toUpperCase()} EV
                  <input
                    value={val}
                    type="number"
                    min="0"
                    max="255"
                    onChange={(e) => setEvs((p) => ({ ...p, [stat]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <div className="ev-total-row">
              <span>Total EVs Used:</span>
              <strong style={{ color: totalColor }}>{total} / 510</strong>
            </div>
          </details>

          <details open className="panel">
            <summary>Calculated Final Stats</summary>
            <div className="stack">
              {["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"].map((s) => (
                <div key={s} className="statRow">
                  <span>{s}</span>
                  <strong>—</strong>
                </div>
              ))}
            </div>
            <div className="muted small mt8">Formula calculation coming in main build phase.</div>
          </details>
        </div>
      </div>
    </section>
  );
}
