import { capitalize } from "../utils/helpers";

export default function LookupScreen({ onNavigate }) {
  return (
    <section>
      <div className="page-header">
        <h1>Pokémon Lookup</h1>
        <p className="muted">386 Pokémon · Gens 1–3 · Data via PokéAPI.</p>
      </div>

      <div className="twoCol">
        <div className="col">
          <div className="panel">
            <label>
              Search Pokémon
              <input placeholder="e.g., Breloom, Gardevoir, Mewtwo..." />
            </label>
            <div className="muted small mt8">National Dex #001–386 supported in MVP.</div>
          </div>

          <div className="card">
            <div className="poke-header">
              <div className="poke-type-pip type-grass"></div>
              <div>
                <div className="rowBetween">
                  <strong className="poke-name">Breloom</strong>
                  <span className="badge">#286</span>
                </div>
                <div className="poke-meta">
                  <span className="type-chip type-grass">Grass</span>
                  <span className="type-chip type-fighting">Fighting</span>
                </div>
              </div>
            </div>

            <details open>
              <summary>Base Stats</summary>
              <div className="stat-bars">
                {[
                  ["HP",  60, 24, false],
                  ["Atk", 130, 52, true],
                  ["Def", 80, 32, false],
                  ["SpA", 60, 24, false],
                  ["SpD", 60, 24, false],
                  ["Spe", 70, 28, false],
                ].map(([s, v, w, isAtk]) => (
                  <div key={s} className="stat-bar-row">
                    <span>{s}</span>
                    <div className="bar-track">
                      <div className={`bar-fill${isAtk ? " atk" : ""}`} style={{ width: `${w}%` }}></div>
                    </div>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
            </details>

            <details>
              <summary>Abilities</summary>
              <div className="stack small-gap mt8">
                <div className="ability-row"><strong>Effect Spore</strong> <span className="muted">Contact may cause status</span></div>
                <div className="ability-row"><strong>Poison Heal</strong> <span className="muted small">(Hidden)</span></div>
              </div>
            </details>

            <details>
              <summary>Learnset (sample)</summary>
              <div className="move-list mt8">
                {["Mach Punch", "Seed Bomb", "Sky Uppercut", "Spore", "Stun Spore"].map((m) => (
                  <span key={m} className="move-tag">{m}</span>
                ))}
              </div>
            </details>

            <div className="row mt8">
              <button className="btn small" onClick={() => onNavigate("team")}>Add to Team</button>
              <button className="ghost small" onClick={() => onNavigate("encounters")}>Set as Opponent</button>
              <button className="ghost small" onClick={() => onNavigate("calculator")}>Load to Calc</button>
            </div>
          </div>
        </div>

        <div className="col">
          <details open className="panel">
            <summary>Type Effectiveness (against Breloom)</summary>
            <div className="type-matchup-grid">
              <div className="matchup-group">
                <div className="matchup-label weakness">4× Weak</div>
                <div><span className="type-chip type-flying">Flying</span></div>
              </div>
              <div className="matchup-group">
                <div className="matchup-label weakness">2× Weak</div>
                <div>
                  {["fire", "ice", "poison", "psychic"].map((t) => (
                    <span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>
                  ))}
                </div>
              </div>
              <div className="matchup-group">
                <div className="matchup-label resist">½× Resist</div>
                <div>
                  {["water", "grass", "electric", "ground", "rock", "dark"].map((t) => (
                    <span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
