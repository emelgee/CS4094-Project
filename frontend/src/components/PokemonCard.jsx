import { capitalize } from "../utils/helpers";

export default function PokemonCard({ mon, onSendToBox, onRemove, onNavigate }) {
  return (
    <div className="card pokemon-card">
      <div className="poke-header">
        <div className={`poke-type-pip type-${mon.primaryType}`}></div>
        <div style={{ flex: 1 }}>
          <div className="rowBetween">
            <strong className="poke-name">{mon.name}</strong>
            <span className="badge">Lv {mon.level}</span>
          </div>
          <div className="poke-meta">
            <select className="mini-select" defaultValue={mon.gender}>
              <option>♂ Male</option>
              <option>♀ Female</option>
              <option>— Genderless</option>
            </select>
            {mon.types.map((t) => (
              <span key={t} className={`type-chip type-${t.toLowerCase()}`}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="poke-sections">
        <details open>
          <summary>Core Stats</summary>
          <div className="formGrid tight">
            {[["HP", "hp"], ["Atk", "atk"], ["Def", "def"], ["SpA", "spa"], ["SpD", "spd"], ["Spe", "spe"]].map(([lbl, key]) => (
              <label key={key}>{lbl}<input defaultValue={mon.stats[key]} type="number" /></label>
            ))}
          </div>
        </details>

        <details open>
          <summary>Nature &amp; Ability</summary>
          <div className="formGrid tight">
            <label>
              Nature
              <select defaultValue={mon.nature}>
                <option>{mon.nature}</option>
                <option>Adamant (+Atk, -SpA)</option>
                <option>Jolly (+Spe, -SpA)</option>
                <option>Modest (+SpA, -Atk)</option>
                <option>Timid (+Spe, -Atk)</option>
                <option>Bold (+Def, -Atk)</option>
              </select>
            </label>
            <label>
              Ability
              <select defaultValue={mon.ability}>
                {mon.dbData
                  ? [mon.dbData.ability1, mon.dbData.ability2, mon.dbData.ability_hidden].filter(Boolean).map((a) => (
                      <option key={a}>{capitalize(a)}</option>
                    ))
                  : <option>{mon.ability}</option>}
              </select>
            </label>
          </div>
        </details>

        <details open>
          <summary>Moves (4)</summary>
          <div className="formGrid tight">
            {[0, 1, 2, 3].map((i) => (
              <label key={i}>Move {i + 1}<input defaultValue={mon.moves[i]} placeholder="—" /></label>
            ))}
          </div>
        </details>
      </div>

      <div className="row">
        <button className="btn small">Save</button>
        <button className="ghost small" onClick={() => onNavigate("ivev")}>IV/EV</button>
        <button className="ghost small" onClick={() => onSendToBox(mon.id)}>📦 To Box</button>
        <button className="ghost small danger" onClick={() => onRemove(mon.id)}>Remove</button>
      </div>
    </div>
  );
}
