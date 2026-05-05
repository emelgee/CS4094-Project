import { BADGES } from "../data/constants";

export default function TrainerScreen({
  earnedBadges,
  onToggleBadge,
  earnedBadgeCount = 0,
}) {
  // Fall back to an empty Set so the screen still renders if it's ever
  // mounted without these props (e.g. in tests / storybook).
  const earned = earnedBadges instanceof Set ? earnedBadges : new Set();

  const customRules = [
    ["Fainted Pokémon are dead (permadeath)", true],
    ["Only catch first encounter per route",  true],
    ["Species / duplication clause",          false],
    ["Nickname all Pokémon",                  false],
    ["No items in battle",                    false],
  ];

  const runStats = [
    ["Total Encounters",  3],
    ["Pokémon Caught",    2],
    ["Deaths",            0],
    ["Badges Earned",     `${earnedBadgeCount} / ${BADGES.length}`],
    ["Current Location",  "Mauville City"],
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

          <details className="panel">
            <summary>Graveyard</summary>
            <div className="muted small">Pokémon lost during this run will appear here.</div>
            <div className="list mt8">
              <div className="graveyard-empty muted">— No deaths yet. Keep it that way. —</div>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
