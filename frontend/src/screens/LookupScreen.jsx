import { useState, useEffect, useRef } from "react";
import { capitalize, getPokemonSpriteUrl } from "../utils/helpers";
import { API_BASE } from "../data/constants";

const CATEGORIES = {
  pokemon:  { label: "Pokémon",  color: "#ef4444", bg: "#7f1d1d33" },
  move:     { label: "Move",     color: "#3b82f6", bg: "#1e3a8a33" },
  ability:  { label: "Ability",  color: "#8b5cf6", bg: "#4c1d9533" },
  item:     { label: "Item",     color: "#f59e0b", bg: "#78350f33" },
  location: { label: "Route",    color: "#10b981", bg: "#06402833" },
};

const TYPE_COLORS = {
  normal:"#a8a87a", fire:"#ff7d40", water:"#5898fa", grass:"#6abf69",
  electric:"#ffd740", ice:"#66d9ef", fighting:"#e05050", poison:"#c060c0",
  ground:"#c09040", flying:"#8888ee", psychic:"#f060a0", bug:"#90c040",
  rock:"#b09840", ghost:"#9060b0", dragon:"#6060f0", dark:"#806040",
  steel:"#8888aa",
};

const ALL_TYPES = ["normal","fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel"];

const TYPE_CHART = {
  normal:   { rock: 0.5, steel: 0.5, ghost: 0 },
  fire:     { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5, grass: 2, ice: 2, bug: 2, steel: 2 },
  water:    { water: 0.5, grass: 0.5, dragon: 0.5, fire: 2, ground: 2, rock: 2 },
  electric: { electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0, water: 2, flying: 2 },
  grass:    { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5, water: 2, ground: 2, rock: 2 },
  ice:      { water: 0.5, ice: 0.5, steel: 0.5, grass: 2, ground: 2, flying: 2, dragon: 2 },
  fighting: { ghost: 0, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, normal: 2, ice: 2, rock: 2, dark: 2, steel: 2 },
  poison:   { steel: 0, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, grass: 2 },
  ground:   { grass: 0.5, bug: 0.5, flying: 0, electric: 2, fire: 2, poison: 2, rock: 2, steel: 2 },
  flying:   { electric: 0.5, rock: 0.5, steel: 0.5, grass: 2, fighting: 2, bug: 2 },
  psychic:  { dark: 0, psychic: 0.5, steel: 0.5, fighting: 2, poison: 2 },
  bug:      { fire: 0.5, flying: 0.5, fighting: 0.5, ghost: 0.5, steel: 0.5, grass: 2, psychic: 2, dark: 2 },
  rock:     { fighting: 0.5, ground: 0.5, steel: 0.5, fire: 2, ice: 2, flying: 2, bug: 2 },
  ghost:    { normal: 0, dark: 0.5, steel: 0.5, psychic: 2, ghost: 2 },
  dragon:   { steel: 0.5, dragon: 2 },
  dark:     { fighting: 0.5, dark: 0.5, steel: 0.5, psychic: 2, ghost: 2 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5, ice: 2, rock: 2 },
};

function getDefenseChart(type1, type2) {
  const t1 = (type1 || "").toLowerCase();
  const t2 = (type2 || "").toLowerCase();
  return ALL_TYPES.map(atk => {
    const vs1 = (TYPE_CHART[atk] || {})[t1] ?? 1;
    const vs2 = t2 ? ((TYPE_CHART[atk] || {})[t2] ?? 1) : 1;
    return { type: atk, mult: vs1 * vs2 };
  });
}

function TypeChip({ type, small }) {
  const t = (type || "").toLowerCase();
  const color = TYPE_COLORS[t] || "#888";
  return (
    <span style={{
      display: "inline-block",
      padding: small ? "2px 7px" : "3px 12px",
      borderRadius: 999,
      fontSize: small ? 10 : 12,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      background: color + "33",
      color,
      border: `1px solid ${color}66`,
    }}>{t}</span>
  );
}

function StatBar({ label, value, color }) {
  const pct = Math.min(100, (value / 255) * 100);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 40px", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "#7a8099", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <div style={{ background: "#1a2030", borderRadius: 999, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
      <span style={{ textAlign: "right", fontWeight: 600, fontSize: 13 }}>{value}</span>
    </div>
  );
}

function DefenseGrid({ type1, type2 }) {
  const chart = getDefenseChart(type1, type2);
  const groups = [
    { mult: 0,    label: "Immune", color: "#6b7280" },
    { mult: 0.25, label: "¼×",     color: "#16a34a" },
    { mult: 0.5,  label: "½×",     color: "#4ade80" },
    { mult: 2,    label: "2×",     color: "#f97316" },
    { mult: 4,    label: "4×",     color: "#ef4444" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {groups.map(g => {
        const matches = chart.filter(c => c.mult === g.mult);
        if (!matches.length) return null;
        return (
          <div key={g.mult} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: g.color, minWidth: 44, textAlign: "right" }}>{g.label}</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {matches.map(m => <TypeChip key={m.type} type={m.type} small />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MoveTable({ moves, showLevel }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 6 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1a2030" }}>
            {showLevel && <th style={{ textAlign: "left", padding: "4px 8px", color: "#5a6380", fontWeight: 600, width: 36 }}>Lv</th>}
            <th style={{ textAlign: "left", padding: "4px 8px", color: "#5a6380", fontWeight: 600 }}>Move</th>
            <th style={{ textAlign: "left", padding: "4px 8px", color: "#5a6380", fontWeight: 600 }}>Type</th>
            <th style={{ textAlign: "right", padding: "4px 8px", color: "#5a6380", fontWeight: 600 }}>Pwr</th>
            <th style={{ textAlign: "right", padding: "4px 8px", color: "#5a6380", fontWeight: 600 }}>Acc</th>
            <th style={{ textAlign: "right", padding: "4px 8px", color: "#5a6380", fontWeight: 600 }}>PP</th>
          </tr>
        </thead>
        <tbody>
          {moves.map((m, i) => {
            const t = (m.type || "").toLowerCase();
            const color = TYPE_COLORS[t] || "#888";
            return (
              <tr key={`${m.move_id}-${i}`}
                style={{ borderBottom: "1px solid #0f1520" }}
                onMouseEnter={e => e.currentTarget.style.background = "#0e1425"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {showLevel && <td style={{ padding: "5px 8px", color: "#5a6380" }}>{m.level ?? "—"}</td>}
                <td style={{ padding: "5px 8px", color: "#c8cde0", fontWeight: 500, textTransform: "capitalize" }}>
                  {(m.move_name || "").replace(/-/g, " ")}
                </td>
                <td style={{ padding: "5px 8px" }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                    textTransform: "uppercase", color, border: `1px solid ${color}66`,
                  }}>{t || "—"}</span>
                </td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: m.power ? "#e4e6ef" : "#3a3f52" }}>{m.power ?? "—"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: m.accuracy ? "#e4e6ef" : "#3a3f52" }}>{m.accuracy ? `${m.accuracy}%` : "—"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: "#7a8099" }}>{m.pp ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildEvoTree(pokemon, edges) {
  const children = edges.filter(e => e.from_pokemon_id === pokemon.id);
  return {
    ...pokemon,
    evolutions: children.map(e => ({
      trigger: e.trigger,
      min_level: e.min_level,
      item: e.item,
      into: buildEvoTree(
        { id: e.to_pokemon_id, name: e.to_name, type1: e.to_type1, type2: e.to_type2 },
        edges
      ),
    })),
  };
}

function conditionLabel(evo) {
  if (evo.trigger === "level-up" && evo.min_level) return `Lv. ${evo.min_level}`;
  if (evo.trigger === "use-item" && evo.item)
    return evo.item.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  if (evo.trigger === "trade") return "Trade";
  if (evo.trigger === "shed") return "Shed";
  return evo.trigger || "";
}

function EvoNode({ node, currentId }) {
  const isCurrent = node.id === currentId;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{
          borderRadius: 10, padding: 6,
          background: isCurrent ? "#1a2240" : "transparent",
          border: `1px solid ${isCurrent ? "#3a58cc" : "transparent"}`,
        }}>
          <img
            src={getPokemonSpriteUrl(node.id, node.name)}
            alt={node.name}
            style={{ width: 56, height: 56, imageRendering: "pixelated", display: "block" }}
          />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize", textAlign: "center", color: isCurrent ? "#7a9ef0" : "#c8cde0" }}>
          {capitalize(node.name)}
        </span>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
          {[node.type1, node.type2].filter(Boolean).map(t => <TypeChip key={t} type={t} small />)}
        </div>
      </div>

      {node.evolutions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {node.evolutions.map(evo => (
            <div key={evo.into.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "0 4px" }}>
                <span style={{ color: "#5a6380", fontSize: 18, lineHeight: 1 }}>→</span>
                <span style={{ fontSize: 10, color: "#5a6380", whiteSpace: "nowrap" }}>{conditionLabel(evo)}</span>
              </div>
              <EvoNode node={evo.into} currentId={currentId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PokemonDetail({ selected, detail, loading, onBack, onNavigate }) {
  const base = detail?.base;
  const moves = detail?.moves || [];
  const chain = detail?.chain || null;
  const locs = detail?.locs || [];

  const dexNum = String(selected.id).padStart(4, "0");

  const levelUpMoves = moves.filter(m => m.learn_method === "level-up").sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const tmMoves     = moves.filter(m => m.learn_method === "machine");
  const eggMoves    = moves.filter(m => m.learn_method === "egg");
  const tutorMoves  = moves.filter(m => m.learn_method === "tutor");

  const locsByLocation = {};
  for (const l of locs) {
    if (!locsByLocation[l.location_name]) locsByLocation[l.location_name] = [];
    locsByLocation[l.location_name].push(l);
  }

  const statRows = base ? [
    { label: "HP",  value: base.hp,         color: "#f87171" },
    { label: "Atk", value: base.attack,      color: "#fb923c" },
    { label: "Def", value: base.defense,     color: "#facc15" },
    { label: "SpA", value: base.sp_attack,   color: "#a78bfa" },
    { label: "SpD", value: base.sp_defense,  color: "#34d399" },
    { label: "Spe", value: base.speed,       color: "#60a5fa" },
  ] : [];

  return (
    <section>
      <button className="ghost small" onClick={onBack} style={{ marginBottom: 20 }}>← Back to Search</button>

      {loading || !detail ? (
        <div className="muted" style={{ textAlign: "center", padding: 60 }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Header card */}
          <div className="card" style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <img
              src={getPokemonSpriteUrl(selected.id, base.name)}
              alt={base.name}
              style={{ width: 112, height: 112, imageRendering: "pixelated", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 26, fontWeight: 800, textTransform: "capitalize" }}>{capitalize(base.name)}</span>
                <span className="muted small">no {dexNum}</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {[base.type1, base.type2].filter(Boolean).map(t => <TypeChip key={t} type={t} />)}
              </div>
              <div style={{ fontSize: 12, color: "#7a8099", marginBottom: 12 }}>
                <span style={{ color: "#5a6380", marginRight: 8 }}>Abilities</span>
                {[base.ability1, base.ability2].filter(Boolean).map((a, i) => (
                  <span key={a}>{i > 0 && " · "}{capitalize(a)}</span>
                ))}
                {base.ability_hidden && (
                  <span style={{ color: "#5a6380" }}> · {capitalize(base.ability_hidden)} <em>(Hidden)</em></span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn small" onClick={() => onNavigate("team")}>Add to Team</button>
                <button className="ghost small" onClick={() => onNavigate("calculator")}>Open in Calc</button>
              </div>
            </div>
          </div>

          {/* 2-col: stats + defense */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="card">
              <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em" }}>Base Stats</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {statRows.map(s => <StatBar key={s.label} {...s} />)}
                <div style={{ borderTop: "1px solid #1a2030", paddingTop: 8, display: "grid", gridTemplateColumns: "44px 1fr 40px", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#7a8099", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</span>
                  <div />
                  <span style={{ textAlign: "right", fontWeight: 700, fontSize: 13 }}>
                    {statRows.reduce((s, r) => s + r.value, 0)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ flex: 1 }}>
                <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em" }}>Type Defenses</strong>
                <div style={{ marginTop: 12 }}>
                  <DefenseGrid type1={base.type1} type2={base.type2} />
                </div>
              </div>

              {chain && chain.edges && chain.edges.length > 0 && (
                <div className="card">
                  <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em" }}>Evolution Chain</strong>
                  <div style={{ marginTop: 14, overflowX: "auto" }}>
                    <EvoNode node={buildEvoTree(chain.root, chain.edges)} currentId={selected.id} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Locations */}
          {locs.length > 0 && (
            <div className="card">
              <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em" }}>Found At</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
                {Object.entries(locsByLocation).map(([locName, areas]) => (
                  <div key={locName} style={{ background: "#0b0e14", borderRadius: 8, padding: "8px 12px", border: "1px solid #1a2030" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#c8cde0", textTransform: "capitalize", marginBottom: 4 }}>{locName}</div>
                    {areas.map((a, i) => (
                      <div key={i} style={{ fontSize: 11, color: "#5a6380", display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ textTransform: "capitalize" }}>{a.area_name}</span>
                        {a.encounter_method && <span>· {a.encounter_method}</span>}
                        {a.min_level != null && (
                          <span>· Lv {a.min_level}{a.max_level && a.max_level !== a.min_level ? `–${a.max_level}` : ""}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learnset */}
          <div className="card">
            <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em" }}>Learnset</strong>

            {levelUpMoves.length > 0 && (
              <details open style={{ marginTop: 12 }}>
                <summary style={{ fontSize: 12, color: "#7a8099", cursor: "pointer", userSelect: "none" }}>
                  Level-Up <span className="muted small">({levelUpMoves.length})</span>
                </summary>
                <MoveTable moves={levelUpMoves} showLevel />
              </details>
            )}
            {tmMoves.length > 0 && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: 12, color: "#7a8099", cursor: "pointer", userSelect: "none" }}>
                  TM / HM <span className="muted small">({tmMoves.length})</span>
                </summary>
                <MoveTable moves={tmMoves} />
              </details>
            )}
            {eggMoves.length > 0 && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: 12, color: "#7a8099", cursor: "pointer", userSelect: "none" }}>
                  Egg Moves <span className="muted small">({eggMoves.length})</span>
                </summary>
                <MoveTable moves={eggMoves} />
              </details>
            )}
            {tutorMoves.length > 0 && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: 12, color: "#7a8099", cursor: "pointer", userSelect: "none" }}>
                  Tutor <span className="muted small">({tutorMoves.length})</span>
                </summary>
                <MoveTable moves={tutorMoves} />
              </details>
            )}
          </div>

        </div>
      )}
    </section>
  );
}

export default function LookupScreen({ onNavigate }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const q = encodeURIComponent(query.trim());
        const [pokeRes, moveRes, abilityRes, itemRes, locRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/pokemon?search=${q}`).then(r => r.json()),
          fetch(`${API_BASE}/api/moves?search=${q}`).then(r => r.json()),
          fetch(`${API_BASE}/api/abilities?search=${q}`).then(r => r.json()),
          fetch(`${API_BASE}/api/items?search=${q}`).then(r => r.json()),
          fetch(`${API_BASE}/api/locations?search=${q}`).then(r => r.json()),
        ]);
        const merged = [
          ...(pokeRes.status === "fulfilled" && Array.isArray(pokeRes.value) ? pokeRes.value : []).slice(0, 6).map(p => ({ id: p.id, name: p.name, category: "pokemon" })),
          ...(moveRes.status === "fulfilled" && Array.isArray(moveRes.value) ? moveRes.value : []).slice(0, 4).map(m => ({ id: m.id, name: m.name, category: "move" })),
          ...(abilityRes.status === "fulfilled" && Array.isArray(abilityRes.value) ? abilityRes.value : []).slice(0, 4).map(a => ({ id: a.id, name: a.name, category: "ability" })),
          ...(itemRes.status === "fulfilled" && Array.isArray(itemRes.value) ? itemRes.value : []).slice(0, 4).map(i => ({ id: i.id, name: i.name, category: "item" })),
          ...(locRes.status === "fulfilled" && Array.isArray(locRes.value) ? locRes.value : []).slice(0, 4).map(l => ({ id: l.id, name: l.name, category: "location" })),
        ];
        setResults(merged);
      } catch { /* noop */ }
      setSearching(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    if (!selected || selected.category !== "pokemon") return;
    setLoadingDetail(true);
    setDetail(null);
    (async () => {
      try {
        const [base, moves, chain, locs] = await Promise.all([
          fetch(`${API_BASE}/api/pokemon/${selected.id}`).then(r => r.json()),
          fetch(`${API_BASE}/api/pokemon/${selected.id}/moves`).then(r => r.json()),
          fetch(`${API_BASE}/api/pokemon/${selected.id}/evolution-chain`).then(r => r.json()),
          fetch(`${API_BASE}/api/pokemon/${selected.id}/locations`).then(r => r.json()),
        ]);
        setDetail({ base, moves, chain, locs });
      } catch { /* noop */ }
      setLoadingDetail(false);
    })();
  }, [selected]);

  const handleSelect = (result) => {
    setSelected(result);
    setResults([]);
    setQuery("");
  };

  const handleBack = () => {
    setSelected(null);
    setDetail(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (selected?.category === "pokemon") {
    return (
      <PokemonDetail
        selected={selected}
        detail={detail}
        loading={loadingDetail}
        onBack={handleBack}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <section style={{ maxWidth: 680, margin: "0 auto", padding: "60px 20px 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <div style={{ fontSize: 56, marginBottom: 10 }}>🔴</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: "0 0 6px" }}>Pokédex</h1>
        <p className="muted">Search Pokémon, Moves, Abilities, Items, and Routes</p>
      </div>

      <div style={{ position: "relative" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "#111520", border: "1px solid #252c40",
          borderRadius: 999, padding: "13px 22px",
          boxShadow: "0 4px 24px #00000044",
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for Pokémon, Item, Routes, Ability, or Moves…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, color: "#e4e6ef" }}
          />
          {searching && <span className="muted small" style={{ flexShrink: 0 }}>…</span>}
        </div>

        {results.length > 0 && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setResults([])} />
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 10,
              background: "#111520", border: "1px solid #252c40", borderRadius: 14,
              boxShadow: "0 8px 40px #00000099", overflow: "hidden",
            }}>
              {results.map((r, i) => {
                const cat = CATEGORIES[r.category] || {};
                return (
                  <button
                    key={`${r.category}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "13px 22px",
                      background: "transparent", border: "none",
                      borderBottom: i < results.length - 1 ? "1px solid #1a2030" : "none",
                      cursor: "pointer", textAlign: "left",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#181e2e"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: 14, color: "#e4e6ef", textTransform: "capitalize" }}>{r.name.replace(/-/g, " ")}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 999,
                      textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
                      background: cat.bg || "#33333333",
                      color: cat.color || "#888",
                      border: `1px solid ${cat.color || "#888"}66`,
                    }}>{cat.label || r.category}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
