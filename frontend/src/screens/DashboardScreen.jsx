import { getPokemonSpriteUrl, capitalize } from "../utils/helpers";

const REGION_PREFIX = /^(hoenn|kanto|johto|sinnoh|unova|kalos|alola|galar|paldea)-/;
const fmtLocation = n => (n || "").replace(REGION_PREFIX, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export default function DashboardScreen({
  party,
  encounters,
  onNavigate,
  onOpenAdd,
}) {
  const recent = (encounters || []).slice(-5).reverse();
  return (
    <section>
      <div className="page-header">
        <h1>Run Dashboard</h1>
        <p className="muted">Emerald Nuzlocke — Active · 2 Badges</p>
      </div>

      <div className="twoCol">
        <div className="col">
          <details open className="panel">
            <summary>Team Preview</summary>
            <div className="grid">
              {party.map((mon) => (
                <div
                  key={mon.id}
                  className="card pokemon-mini"
                  style={{ cursor: "pointer" }}
                  onClick={() => onNavigate("team")}
                >
                  <div className="team-top-row">
                    <div
                      className={`poke-type-pip type-${mon.primaryType}`}
                    ></div>
                    <img
                      className="team-sprite"
                      src={getPokemonSpriteUrl(mon.pokemonId, mon.name)}
                      alt={`${mon.name} sprite`}
                      loading="lazy"
                    />
                    <div className="team-mini-types">
                      {(mon.types || []).filter(Boolean).map((type) => (
                        <span
                          key={`${mon.id}-${type}`}
                          className={`type-chip type-${type
                            .toLowerCase()
                            .split("/")[0]}`}
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                  <strong>{mon.name}</strong>
                  <div className="muted">Lv {mon.level}</div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 6 - party.length) }).map(
                (_, i) => (
                  <div key={i} className="card empty" onClick={onOpenAdd}>
                    + Add
                  </div>
                )
              )}
            </div>
          </details>

          <details open className="panel">
            <summary>Quick Actions</summary>
            <div className="btn-group">
              <button className="btn" onClick={() => onNavigate("team")}>
                Manage Team
              </button>
              <button className="btn" onClick={() => onNavigate("encounters")}>
                Go to Encounters
              </button>
              <button className="btn" onClick={() => onNavigate("calculator")}>
                Open Calculator
              </button>
              <button className="btn" onClick={() => onNavigate("boss")}>
                Boss Quick Load
              </button>
            </div>
          </details>
        </div>

        <div className="col">
          <details open className="panel">
            <summary>Recent Encounters</summary>
            <div className="list">
              {recent.length === 0 ? (
                <div className="listItem">
                  <div className="muted">No encounters logged yet.</div>
                </div>
              ) : (
                recent.map((enc) => (
                  <div key={enc.id} className="listItem">
                    <div>
                      <strong>{fmtLocation(enc.location)}</strong>
                      <div className="muted">
                        {enc.nickname || enc.pokemon_name} — {capitalize(enc.status || "unknown")}
                      </div>
                    </div>
                    <span
                      className={`outcome-tag ${(enc.status || "unknown").toLowerCase()}`}
                    >
                      {capitalize(enc.status || "unknown")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </details>

          <details open className="panel">
            <summary>Run Notes</summary>
            <textarea
              rows="5"
              placeholder="Strategy notes, reminders..."
            ></textarea>
          </details>
        </div>
      </div>
    </section>
  );
}
