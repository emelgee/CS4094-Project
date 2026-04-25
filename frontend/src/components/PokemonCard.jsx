import { useState } from "react";
import { capitalize, getPokemonSpriteUrl, gen3CombatStat, applyNatureModifier, NATURES } from "../utils/helpers";

function calcInGame(mon, nature) {
  const lv = mon.level || 1;
  const iv = mon.ivs || {};
  const ev = mon.evs || {};
  const b  = mon.stats || {};
  const nat = nature || "hardy";
  const hp = Math.floor(((2 * (b.hp ?? 0) + (iv.hp ?? 31) + Math.floor((ev.hp ?? 0) / 4)) * lv) / 100) + lv + 10;
  return {
    hp,
    atk: applyNatureModifier(gen3CombatStat(b.atk ?? 0, iv.atk ?? 31, ev.atk ?? 0, lv), "atk", nat),
    def: applyNatureModifier(gen3CombatStat(b.def ?? 0, iv.def ?? 31, ev.def ?? 0, lv), "def", nat),
    spa: applyNatureModifier(gen3CombatStat(b.spa ?? 0, iv.spa ?? 31, ev.spa ?? 0, lv), "spa", nat),
    spd: applyNatureModifier(gen3CombatStat(b.spd ?? 0, iv.spd ?? 31, ev.spd ?? 0, lv), "spd", nat),
    spe: applyNatureModifier(gen3CombatStat(b.spe ?? 0, iv.spe ?? 31, ev.spe ?? 0, lv), "spe", nat),
  };
}

export default function PokemonCard({ mon, onSendToBox, onRemove, onNavigate }) {
  const [nature, setNature] = useState(String(mon.nature || "hardy").toLowerCase());
  const spriteUrl = getPokemonSpriteUrl(mon.pokemonId, mon.name);
  const inGame = calcInGame(mon, nature);
  const STAT_KEYS = [["HP", "hp"], ["Atk", "atk"], ["Def", "def"], ["SpA", "spa"], ["SpD", "spd"], ["Spe", "spe"]];

  return (
    <div className="card pokemon-card">
      <div className="poke-header">
        <div className={`poke-type-pip type-${mon.primaryType}`}></div>
        <img
          className="poke-sprite"
          src={spriteUrl}
          alt={`${mon.name} sprite`}
          loading="lazy"
        />
        <div style={{ flex: 1 }}>
          <div className="rowBetween">
            <strong className="poke-name">
              {mon.nickname && mon.nickname !== mon.name
                ? `${mon.nickname} - ${mon.name}`
                : mon.name}
            </strong>
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
          <div style={{ marginTop: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 56px", gap: "2px 8px", alignItems: "center", marginBottom: 4 }}>
              <span />
              <span className="muted small">Base</span>
              <span className="muted small" style={{ textAlign: "right" }}>In-game</span>
            </div>
            {STAT_KEYS.map(([lbl, key]) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "36px 1fr 56px", gap: "2px 8px", alignItems: "center", marginBottom: 2 }}>
                <span className="muted small" style={{ textTransform: "uppercase", fontSize: 10, whiteSpace: "nowrap" }}>{lbl}</span>
                <input defaultValue={mon.stats[key]} type="number" style={{ width: "100%", padding: "2px 6px", fontSize: 12 }} />
                <span style={{ textAlign: "right", fontWeight: 600, fontSize: 13, color: "#e4e6ef" }}>{inGame[key]}</span>
              </div>
            ))}
          </div>
        </details>

        <details open>
          <summary>Nature &amp; Ability</summary>
          <div className="formGrid tight">
            <label>
              Nature
              <select value={nature} onChange={(e) => setNature(e.target.value)}>
                {Object.keys(NATURES).map((n) => {
                  const { up, down } = NATURES[n];
                  const STAT_LABEL = { atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe" };
                  const label = up
                    ? `${capitalize(n)} (+${STAT_LABEL[up]} / -${STAT_LABEL[down]})`
                    : capitalize(n);
                  return <option key={n} value={n}>{label}</option>;
                })}
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
