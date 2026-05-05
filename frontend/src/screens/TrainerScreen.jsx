import { useState } from "react";

export default function TrainerScreen() {
  const [badges, setBadges] = useState([
    { icon: "🪨", name: "Stone",   earned: false  },
    { icon: "✊", name: "Knuckle", earned: false  },
    { icon: "⚡", name: "Dynamo",  earned: false },
    { icon: "🔥", name: "Heat",    earned: false },
    { icon: "⚖",  name: "Balance", earned: false },
    { icon: "🪶", name: "Feather", earned: false },
    { icon: "🔮", name: "Mind",    earned: false },
    { icon: "🌊", name: "Rain",    earned: false },
  ]);

  const toggleBadge = (name) => {
    setBadges((prev) =>
      prev.map((b) => (b.name === name ? { ...b, earned: !b.earned } : b))
    );
  };

  const customRules = [
    ["Fainted Pokémon are dead (permadeath)", false],
    ["Only catch first encounter per route",  false],
    ["Species / duplication clause",          false],
    ["Nickname all Pokémon",                  false],
    ["No items in battle",                    false],
  ];

  const earnedCount = badges.filter((b) => b.earned).length;

  const runStats = [
    ["Total Encounters",  0],
    ["Pokémon Caught",    0],
    ["Deaths",            0],
    ["Badges Earned",     `${earnedCount} / 8`],
    ["Current Location",  ""],
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
              <label>Trainer Name<input defaultValue="Trainer" /></label>
              <label>
                Game
                <select>
                  {["Pokémon Emerald","Pokémon Ruby","Pokémon Sapphire","Pokémon FireRed","Pokémon LeafGreen",].map((g) => (
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
            <div className="badge-grid">
              {badges.map((b) => (
                <div 
                  key={b.name} 
                  className={`badge-item${b.earned ? " earned" : ""}`}
                  onClick={() => toggleBadge(b.name)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="badge-icon">{b.icon}</div>
                  <span>{b.name}</span>
                </div>
              ))}
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