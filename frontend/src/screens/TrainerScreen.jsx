import { BADGES } from "../data/constants";
import { getPokemonSpriteUrl } from "../utils/helpers";

export default function TrainerScreen({
  earnedBadges,
  onToggleBadge,
  earnedBadgeCount = 0,
  graveyard = [],
  encounters = [],
}) {
  const earned = earnedBadges instanceof Set ? earnedBadges : new Set();

  const caught = encounters.filter(e => (e.status || "").toLowerCase() === "caught").length;

  const customRules = [
    ["Fainted Pokémon are dead (permadeath)", true],
    ["Only catch first encounter per route",  true],
    ["Species / duplication clause",          false],
    ["Nickname all Pokémon",                  false],
    ["No items in battle",                    false],
  ];

  const runStats = [
    ["Pokémon Caught",  caught],
    ["Deaths",          graveyard.length],
    ["Badges Earned",   `${earnedBadgeCount} / ${BADGES.length}`],
  ];

  return (
    <section>
      <div className="page-header">
        <h1>Trainer Profile</h1>
        <p className="muted">Your challenge run identity and progress tracker.</p>
      </div>

      <div className="twoCol">
        <div className="col">
          <details open className="panel">
            <summary>Run Info</summary>
            <div className="formGrid">
              <label>Trainer Name<input defaultValue="Martin" /></label>
              <label>
                Game
                <select>
                  {["Pokémon Emerald","Pokémon Ruby","Pokémon Sapphire","Pokémon FireRed","Pokémon LeafGreen","Pokémon Red","Pokémon Blue","Pokémon Yellow","Pokémon Gold","Pokémon Silver","Pokémon Crystal"].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label>
                Challenge Type
                <select>
                  {["Nuzlocke","Hardcore Nuzlocke","Wedlocke","Monotype","Solo Run","Custom ROM Hack"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Run Status
                <select>
                  {["Active","Completed","Wiped (Failed)","Paused"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          <details open className="panel">
            <summary>Custom Rules</summary>
            <div className="stack">
              {customRules.map(([lbl, chk]) => (
                <label key={lbl} className="checkbox-row">
                  <input type="checkbox" defaultChecked={chk} style={{ width: "auto" }} /> {lbl}
                </label>
              ))}
            </div>
            <textarea rows="3" className="mt8" placeholder="Additional custom rules..."></textarea>
          </details>
        </div>

        <div className="col">
          <details open className="panel">
            <summary>Badge Progress</summary>
            <p className="muted small">Click a badge to toggle whether you've earned it.</p>
            <div className="badge-grid">
              {BADGES.map((b) => {
                const isEarned = earned.has(b.name);
                return (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => onToggleBadge?.(b.name)}
                    className={`badge-item${isEarned ? " earned" : ""}`}
                    aria-pressed={isEarned}
                    title={isEarned ? `Unset ${b.name} Badge` : `Mark ${b.name} Badge earned`}
                  >
                    <div className="badge-icon">{b.icon}</div>
                    <span>{b.name}</span>
                  </button>
                );
              })}
            </div>
          </details>

          <details open className="panel">
            <summary>Run Stats</summary>
            <div className="stack">
              {runStats.map(([k, v]) => (
                <div key={k} className="statRow">
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </details>

          <details open={graveyard.length > 0} className="panel">
            <summary>Graveyard ({graveyard.length})</summary>
            <div className="muted small">
              Pokémon lost during this run. Manage them from the Team screen.
            </div>
            <div className="list mt8">
              {graveyard.length === 0 ? (
                <div className="graveyard-empty muted">— No deaths yet. Keep it that way. —</div>
              ) : (
                graveyard.map((mon) => (
                  <div key={mon.id} className="listItem trainer-graveyard-row">
                    <div className="pc-mon-name-wrap">
                      <img
                        className="pc-mon-sprite"
                        src={getPokemonSpriteUrl(mon.pokemonId, mon.name)}
                        alt={`${mon.name} sprite`}
                        loading="lazy"
                      />
                      <div>
                        <strong>{mon.nickname || mon.name}</strong>
                        <div className="muted small">
                          {mon.nickname ? `${mon.name} · ` : ""}Lv {mon.level}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      {(mon.types || []).map((t) => (
                        <span
                          key={t}
                          className={`type-chip type-${t.toLowerCase().split("/")[0]}`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
