import { useState, useEffect, useRef } from "react";
import { capitalize, getPokemonSpriteUrl, gen3CombatStat, applyNatureModifier, NATURES } from "../utils/helpers";
import { API_BASE } from "../data/constants";
import { apiFetch } from "../utils/api";

const TYPE_COLORS = {
  normal:"#a8a87a", fire:"#ff7d40", water:"#5898fa", grass:"#6abf69",
  electric:"#ffd740", ice:"#66d9ef", fighting:"#e05050", poison:"#c060c0",
  ground:"#c09040", flying:"#8888ee", psychic:"#f060a0", bug:"#90c040",
  rock:"#b09840", ghost:"#9060b0", dragon:"#6060f0", dark:"#806040",
  steel:"#8888aa",
};
const TYPE_BG = {
  normal:"#6b6b5844", fire:"#8b350044", water:"#1a3a8b44", grass:"#1a5a1a44",
  electric:"#6b5a0044", ice:"#1a5a6a44", fighting:"#6a1a0044", poison:"#4a0a6a44",
  ground:"#6a4a0a44", flying:"#2a2a6a44", psychic:"#6a0a3a44", bug:"#3a5a0a44",
  rock:"#4a4a1a44", ghost:"#2a0a4a44", dragon:"#1a0a8a44", dark:"#2a1a0a44",
  steel:"#4a4a5a44",
};

const STAT_KEYS = [["HP", "hp"], ["Atk", "atk"], ["Def", "def"], ["SpA", "spa"], ["SpD", "spd"], ["Spe", "spe"]];

const toHyphenated = (s) => (s || "").toLowerCase().replace(/[\s_]+/g, "-");
const toDisplay = (s) => (s || "").replace(/[-_]/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

function calcInGame(baseStats, level, ivs, evs, nature) {
  const lv = Number(level) || 1;
  const b = baseStats || {};
  const nat = (nature || "hardy").toLowerCase();
  const hp = Math.floor(((2 * (b.hp ?? 0) + (ivs.hp ?? 31) + Math.floor((evs.hp ?? 0) / 4)) * lv) / 100) + lv + 10;
  return {
    hp,
    atk: applyNatureModifier(gen3CombatStat(b.atk ?? 0, ivs.atk ?? 31, evs.atk ?? 0, lv), "atk", nat),
    def: applyNatureModifier(gen3CombatStat(b.def ?? 0, ivs.def ?? 31, evs.def ?? 0, lv), "def", nat),
    spa: applyNatureModifier(gen3CombatStat(b.spa ?? 0, ivs.spa ?? 31, evs.spa ?? 0, lv), "spa", nat),
    spd: applyNatureModifier(gen3CombatStat(b.spd ?? 0, ivs.spd ?? 31, evs.spd ?? 0, lv), "spd", nat),
    spe: applyNatureModifier(gen3CombatStat(b.spe ?? 0, ivs.spe ?? 31, evs.spe ?? 0, lv), "spe", nat),
  };
}

function TeamMoveSlot({ slotIdx, moveObj, learnset, allMoves, onSwap }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");

  const learnsetDeduped = new Map();
  for (const m of (learnset || [])) {
    const existing = learnsetDeduped.get(m.move_id);
    if (!existing || m.learn_method === "level-up") learnsetDeduped.set(m.move_id, m);
  }
  const learnsetIds = new Set(learnsetDeduped.keys());
  const learnsetMoves = [...learnsetDeduped.values()].map(m => ({
    id: m.move_id,
    name: toDisplay(m.move_name || ""),
    type: m.type,
    power: m.power,
    accuracy: m.accuracy,
    pp: m.pp,
    learn_method: m.learn_method,
    level: m.level,
    inLearnset: true,
  }));
  const otherMoves = (allMoves || [])
    .filter(m => !learnsetIds.has(m.id))
    .map(m => ({ ...m, name: toDisplay(m.name || ""), inLearnset: false }));
  const combined = [...learnsetMoves, ...otherMoves];

  const q = query.trim().toLowerCase();
  const filtered = q ? combined.filter(m => (m.name || "").toLowerCase().includes(q)) : combined;

  const handleSelect = (m) => {
    onSwap(slotIdx, { id: m.id, name: m.name, type: m.type, power: m.power, accuracy: m.accuracy, pp: m.pp });
    setEditing(false);
    setQuery("");
  };

  const t = (moveObj?.type || "").toLowerCase();
  const hasMove = moveObj && moveObj.name;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
        <div style={{
          flex: 1, padding: "6px 8px", borderRadius: 8,
          border: "1px solid #252c40", background: "#0b0e14",
          fontSize: 12, display: "flex", alignItems: "center", gap: 6, minHeight: 34,
        }}>
          {hasMove && t && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 999,
              textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
              background: TYPE_BG[t] || "#2a2a2a44",
              color: TYPE_COLORS[t] || "#aaa",
              border: `1px solid ${(TYPE_COLORS[t] || "#aaa")}44`,
            }}>{t}</span>
          )}
          <span style={{ flex: 1, color: hasMove ? "#c8cde0" : "#3a3f52" }}>
            {hasMove ? moveObj.name : "—"}
          </span>
          {hasMove && (moveObj.power || moveObj.accuracy) && (
            <span style={{ fontSize: 10, color: "#5a6380", flexShrink: 0, whiteSpace: "nowrap" }}>
              {moveObj.power ?? "-"} / {moveObj.accuracy ? `${moveObj.accuracy}%` : "-"}
            </span>
          )}
        </div>
        <button
          onClick={() => { setEditing(e => !e); setQuery(""); }}
          title="Change move"
          style={{
            padding: "0 7px", borderRadius: 7, border: "1px solid #252c40",
            background: editing ? "#1a2240" : "transparent",
            color: editing ? "#7a9ef0" : "#3a3f52",
            cursor: "pointer", fontSize: 13, flexShrink: 0,
          }}
        >✎</button>
      </div>

      {editing && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setEditing(false)} />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
            background: "#0e1120", border: "1px solid #252c40", borderRadius: 10,
            boxShadow: "0 4px 24px #00000099", overflow: "hidden",
          }}>
            <div style={{ padding: "6px 8px", borderBottom: "1px solid #1a2030" }}>
              <input
                autoFocus
                type="text"
                placeholder="Search moves…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ fontSize: 12, padding: "5px 8px" }}
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {filtered.length === 0 && (
                <div style={{ padding: "10px 12px", color: "#5a6380", fontSize: 12, textAlign: "center" }}>
                  No moves found
                </div>
              )}
              {filtered.some(m => m.inLearnset) && !q && (
                <div style={{ padding: "4px 10px", fontSize: 10, color: "#3a3f52",
                  textTransform: "uppercase", letterSpacing: "0.06em", background: "#0b0e14" }}>
                  Learnset
                </div>
              )}
              {filtered.map((m, i) => {
                const mt = (m.type || "").toLowerCase();
                const showDivider = !q && i > 0 && !m.inLearnset && filtered[i - 1]?.inLearnset;
                return (
                  <div key={m.id || i}>
                    {showDivider && (
                      <div style={{ padding: "4px 10px", fontSize: 10, color: "#3a3f52",
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        background: "#0b0e14", borderTop: "1px solid #1a2030" }}>
                        All Moves
                      </div>
                    )}
                    <button
                      onClick={() => handleSelect(m)}
                      style={{
                        display: "flex", width: "100%", textAlign: "left",
                        padding: "7px 10px", background: "transparent", border: "none",
                        borderBottom: "1px solid #1a2030", cursor: "pointer",
                        alignItems: "center", gap: 8,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#181e2e"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 999,
                        textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
                        background: TYPE_BG[mt] || "#2a2a2a44",
                        color: TYPE_COLORS[mt] || "#aaa",
                        border: `1px solid ${(TYPE_COLORS[mt] || "#aaa")}44`,
                      }}>{mt || "?"}</span>
                      <span style={{ flex: 1, fontSize: 12, color: "#c8cde0",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.name}
                      </span>
                      <span style={{ fontSize: 10, color: "#5a6380", flexShrink: 0, whiteSpace: "nowrap" }}>
                        {m.power ?? "-"} / {m.accuracy ?? "-"}%
                        {m.inLearnset && m.learn_method === "level-up" && m.level
                          ? <span style={{ color: "#3a5a8a", marginLeft: 4 }}>Lv.{m.level}</span>
                          : m.inLearnset
                            ? <span style={{ color: "#3a5a3a", marginLeft: 4 }}>{m.learn_method}</span>
                            : null
                        }
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function PokemonCard({ mon, onSendToBox, onSendToGraveyard, onRemove, onSave }) {
  const [nature, setNature] = useState(String(mon.nature || "hardy").toLowerCase());
  const [level, setLevel] = useState(mon.level || 1);
  const [nickname, setNickname] = useState(mon.nickname || "");
  const [ivs, setIvs] = useState({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...(mon.ivs || {}) });
  const [evs, setEvs] = useState({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...(mon.evs || {}) });
  const [moveObjs, setMoveObjs] = useState([null, null, null, null]);
  const [learnset, setLearnset] = useState([]);
  const [allMoves, setAllMoves] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [evolutions, setEvolutions] = useState([]);
  const [showEvolveModal, setShowEvolveModal] = useState(false);
  const [evoAnim, setEvoAnim] = useState(null);
  const [animPhase, setAnimPhase] = useState(null);
  const audioRef = useRef(null);
  const skipRef = useRef(null);

  const spriteUrl = getPokemonSpriteUrl(mon.pokemonId, mon.name);
  const inGame = calcInGame(mon.stats, level, ivs, evs, nature);
  const totalEvs = Object.values(evs).reduce((a, b) => a + Number(b), 0);

  useEffect(() => {
    if (!mon.pokemonId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pokemon/${mon.pokemonId}/moves`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setLearnset(Array.isArray(data) ? data : []);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [mon.pokemonId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/moves`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setAllMoves(Array.isArray(data) ? data : []);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mon.pokemonId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pokemon/${mon.pokemonId}/evolutions`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setEvolutions(Array.isArray(data) ? data : []);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [mon.pokemonId]);

  // Enrich move names to full objects once allMoves is ready
  useEffect(() => {
    if (!allMoves.length) return;
    setMoveObjs([0, 1, 2, 3].map(i => {
      const name = mon.moves[i];
      if (!name) return null;
      const key = toHyphenated(name);
      const found = allMoves.find(m => toHyphenated(m.name) === key);
      if (found) return { id: found.id, name: toDisplay(found.name), type: found.type, power: found.power, accuracy: found.accuracy, pp: found.pp };
      return { id: null, name: toDisplay(name), type: null, power: null, accuracy: null };
    }));
  }, [allMoves]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwapMove = (idx, m) => {
    setMoveObjs(prev => { const next = [...prev]; next[idx] = m; return next; });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      await apiFetch(`/api/encounters/${mon.id}`, {
        method: "PATCH",
        json: {
          nickname: nickname || null,
          nature,
          level: Number(level),
          hp_iv: Number(ivs.hp ?? 31),
          attack_iv: Number(ivs.atk ?? 31),
          defense_iv: Number(ivs.def ?? 31),
          sp_attack_iv: Number(ivs.spa ?? 31),
          sp_defense_iv: Number(ivs.spd ?? 31),
          speed_iv: Number(ivs.spe ?? 31),
          hp_ev: Number(evs.hp ?? 0),
          attack_ev: Number(evs.atk ?? 0),
          defense_ev: Number(evs.def ?? 0),
          sp_attack_ev: Number(evs.spa ?? 0),
          sp_defense_ev: Number(evs.spd ?? 0),
          speed_ev: Number(evs.spe ?? 0),
          move1_id: moveObjs[0]?.id ?? null,
          move2_id: moveObjs[1]?.id ?? null,
          move3_id: moveObjs[2]?.id ?? null,
          move4_id: moveObjs[3]?.id ?? null,
        },
      });
      setSaveMsg("Saved!");
      onSave?.();
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 2500);
    }
  };

  const startEvolveAnimation = async (evo) => {
    setShowEvolveModal(false);
    setEvoAnim(evo);

    let resolveSkip;
    const skipPromise = new Promise(r => { resolveSkip = r; });
    skipRef.current = resolveSkip;

    const waitOrSkip = (ms) => Promise.race([
      new Promise(r => setTimeout(r, ms)),
      skipPromise,
    ]);

    try {
      audioRef.current = new Audio("/evolution.mp3");
      audioRef.current.play().catch(() => {});
    } catch { /* noop */ }

    await waitOrSkip(1000);

    setAnimPhase("flashing");
    await waitOrSkip(10000);

    setAnimPhase("whiteout");
    try {
      await apiFetch(`/api/team/${mon.id}/evolve`, {
        method: "PATCH",
        json: { to_pokemon_id: evo.to_pokemon_id },
      });
    } catch { /* keep animating even if API fails */ }

    await waitOrSkip(600);

    setAnimPhase("reveal");
    onSave?.();

    await waitOrSkip(2500);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    let fanfare = null;
    await Promise.race([
      skipPromise,
      new Promise(resolve => {
        try {
          fanfare = new Audio("/evolution-complete.mp3");
          const cutoff = setTimeout(() => { fanfare.pause(); resolve(); }, 4000);
          const done = () => { clearTimeout(cutoff); resolve(); };
          fanfare.addEventListener("ended", done);
          fanfare.addEventListener("error", done);
          fanfare.play().catch(done);
        } catch {
          resolve();
        }
      }),
    ]);
    if (fanfare) fanfare.pause();

    skipRef.current = null;
    setAnimPhase(null);
    setEvoAnim(null);
  };

  const evolveConditionLabel = (evo) => {
    if (evo.trigger === "level-up" && evo.min_level) return `Lv. ${evo.min_level}`;
    if (evo.trigger === "use-item" && evo.item)
      return evo.item.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    if (evo.trigger === "trade") return "Trade";
    if (evo.trigger === "shed") return "Empty party slot + Poké Ball";
    return evo.trigger ?? "—";
  };

  return (
    <div className="card pokemon-card">
      <div className="poke-header" style={{ flexDirection: "column", gap: 0 }}>
        {/* Row 1: pip | sprite | name+level / nickname */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
          <div className={`poke-type-pip type-${mon.primaryType}`} style={{ alignSelf: "stretch", minHeight: "unset" }}></div>
          <img
            className="poke-sprite"
            src={spriteUrl}
            alt={`${mon.name} sprite`}
            loading="lazy"
          />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <strong className="poke-name" style={{ flex: 1 }}>{mon.name}</strong>
              <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                <span className="muted small">Lv</span>
                <input
                  type="number"
                  value={level}
                  min={1} max={100}
                  onChange={e => setLevel(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  style={{ width: 52, padding: "4px 6px", fontWeight: 600, fontSize: 15, textAlign: "center" }}
                />
              </div>
            </div>
            <input
              type="text"
              placeholder="Nickname…"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              style={{ width: "100%", fontSize: 17, padding: "6px 8px", color: "#7a9ef0" }}
            />
          </div>
        </div>

        {/* Row 2: gender | type1 | type2 equal columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `1fr${mon.types.map(() => " 1fr").join("")}`,
          gap: 6, marginTop: 10,
          borderTop: "1px solid #1a2030", paddingTop: 8,
        }}>
          <select className="mini-select" defaultValue={mon.gender}>
            <option>♂ Male</option>
            <option>♀ Female</option>
            <option>— Genderless</option>
          </select>
          {mon.types.map((t) => (
            <span key={t} className={`type-chip type-${t.toLowerCase()}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="poke-sections">
        <details open>
          <summary>Core Stats</summary>
          <div style={{ marginTop: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 44px 50px 52px", gap: "2px 6px", alignItems: "center", marginBottom: 4 }}>
              <span />
              <span className="muted small">Base</span>
              <span className="muted small" style={{ textAlign: "center", color: "#7a9ef0" }}>IV</span>
              <span className="muted small" style={{ textAlign: "center", color: "#4ade80" }}>EV</span>
              <span className="muted small" style={{ textAlign: "right" }}>Stat</span>
            </div>
            {STAT_KEYS.map(([lbl, key]) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "32px 1fr 44px 50px 52px", gap: "2px 6px", alignItems: "center", marginBottom: 2 }}>
                <span className="muted small" style={{ textTransform: "uppercase", fontSize: 10 }}>{lbl}</span>
                <input
                  defaultValue={mon.stats[key]}
                  type="number"
                  style={{ width: "100%", padding: "2px 4px", fontSize: 11 }}
                />
                <input
                  type="number" min={0} max={31}
                  value={ivs[key] ?? 31}
                  onChange={e => setIvs(prev => ({ ...prev, [key]: Math.max(0, Math.min(31, Number(e.target.value) || 0)) }))}
                  style={{ width: "100%", padding: "2px 4px", fontSize: 11, textAlign: "center", color: "#7a9ef0" }}
                />
                <input
                  type="number" min={0} max={252}
                  value={evs[key] ?? 0}
                  onChange={e => setEvs(prev => ({ ...prev, [key]: Math.max(0, Math.min(252, Number(e.target.value) || 0)) }))}
                  style={{ width: "100%", padding: "2px 4px", fontSize: 11, textAlign: "center", color: "#4ade80" }}
                />
                <span style={{ textAlign: "right", fontWeight: 600, fontSize: 13, color: "#e4e6ef" }}>{inGame[key]}</span>
              </div>
            ))}
            <div style={{ textAlign: "right", fontSize: 10, marginTop: 3, color: totalEvs > 510 ? "#f87171" : "#3a3f52" }}>
              EVs: {totalEvs} / 510{totalEvs > 510 ? " ⚠" : ""}
            </div>
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
                  const SL = { atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe" };
                  return (
                    <option key={n} value={n}>
                      {up ? `${capitalize(n)} (+${SL[up]} / -${SL[down]})` : capitalize(n)}
                    </option>
                  );
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
          <div style={{ display: "grid", gap: 5, marginTop: 6 }}>
            {[0, 1, 2, 3].map((i) => (
              <TeamMoveSlot
                key={i}
                slotIdx={i}
                moveObj={moveObjs[i]}
                learnset={learnset}
                allMoves={allMoves}
                onSwap={handleSwapMove}
              />
            ))}
          </div>
        </details>
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn small" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        {saveMsg && (
          <span style={{ fontSize: 11, color: saveMsg === "Saved!" ? "#4ade80" : "#f87171" }}>
            {saveMsg}
          </span>
        )}
        {evolutions.length > 0 && (
          <button className="ghost small" onClick={() => setShowEvolveModal(true)}>
            ✦ Evolve
          </button>
        )}
        <button className="ghost small" onClick={() => onSendToBox(mon.id)}>📦 To Box</button>
        {onSendToGraveyard && (
          <button
            className="ghost small danger"
            onClick={() => onSendToGraveyard(mon.id)}
            title="Move to Graveyard"
          >
            🪦 Graveyard
          </button>
        )}
        <button className="ghost small danger" onClick={() => onRemove(mon.id)}>Remove</button>
      </div>

      {/* Evolution animation overlay */}
      {evoAnim && (
        <div
          onClick={() => skipRef.current?.()}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: animPhase === "whiteout" ? "#ffffff" : "#000000",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 24, transition: "background 0.3s ease",
            cursor: "pointer",
          }}
        >
          {animPhase !== "whiteout" && (
            <>
              <img
                src={animPhase === "reveal"
                  ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evoAnim.to_pokemon_id}.png`
                  : spriteUrl}
                alt="evolving"
                className={
                  animPhase === "flashing" ? "evo-sprite-flash" :
                  animPhase === "reveal" ? "evo-sprite-reveal" :
                  undefined
                }
                style={{ width: 192, height: 192, imageRendering: "pixelated" }}
              />
              <div style={{
                background: "#1a1a1a", border: "2px solid #3a3a3a",
                borderRadius: 6, padding: "14px 32px",
                fontSize: 19, fontWeight: 700, color: "#ffffff",
                letterSpacing: "0.02em", textAlign: "center", maxWidth: 420,
              }}>
                {animPhase === "reveal"
                  ? `${capitalize(mon.nickname || mon.name)} evolved into ${capitalize(evoAnim.to_pokemon_name)}!`
                  : `What? ${capitalize(mon.nickname || mon.name)} is evolving!`}
              </div>
            </>
          )}
        </div>
      )}

      {/* Evolution picker modal */}
      {showEvolveModal && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "#00000088" }}
            onClick={() => !animPhase && setShowEvolveModal(false)}
          />
          <div style={{
            position: "fixed", inset: 0, zIndex: 201,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{
              pointerEvents: "auto",
              background: "#0e1120", border: "1px solid #252c40", borderRadius: 14,
              padding: 20, minWidth: 260, maxWidth: 360,
              boxShadow: "0 8px 40px #00000099",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e4e6ef", marginBottom: 4 }}>
                Evolve {mon.nickname || mon.name}
              </div>
              <div style={{ fontSize: 11, color: "#5a6380", marginBottom: 14 }}>
                Select an evolution. IVs, EVs, moves, and nickname are kept.
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {evolutions.map((evo) => (
                  <button
                    key={evo.to_pokemon_id}
                    disabled={animPhase !== null}
                    onClick={() => startEvolveAnimation(evo)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 10,
                      border: "1px solid #252c40", background: "#111520",
                      cursor: animPhase !== null ? "default" : "pointer", textAlign: "left",
                      transition: "border-color 0.12s",
                    }}
                    onMouseEnter={e => { if (!animPhase) e.currentTarget.style.borderColor = "#3a58cc"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#252c40"; }}
                  >
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.to_pokemon_id}.png`}
                      alt={evo.to_pokemon_name}
                      style={{ width: 48, height: 48, imageRendering: "pixelated", flexShrink: 0 }}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e6ef", textTransform: "capitalize" }}>
                        {evo.to_pokemon_name}
                      </div>
                      <div style={{ fontSize: 11, color: "#5a6380", marginTop: 2 }}>
                        {evolveConditionLabel(evo)}
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        {[evo.type1, evo.type2].filter(Boolean).map(t => (
                          <span key={t} className={`type-chip type-${t.toLowerCase()}`}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                className="ghost small"
                style={{ marginTop: 12, width: "100%" }}
                onClick={() => setShowEvolveModal(false)}
                disabled={animPhase !== null}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
