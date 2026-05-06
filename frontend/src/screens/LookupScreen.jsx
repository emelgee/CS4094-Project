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

function statColor(v) {
  if (v < 30)  return "#ef4444";
  if (v < 50)  return "#f97316";
  if (v < 80)  return "#eab308";
  if (v < 120) return "#86efac";
  if (v < 150) return "#16a34a";
  return "#60a5fa";
}

const fmtAbility = a => (a || "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const REGION_PREFIX = /^(hoenn|kanto|johto|sinnoh|unova|kalos|alola|galar|paldea)-/;
const fmtLocation = n => (n || "").replace(REGION_PREFIX, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const DAMAGE_CLASS_STYLE = {
  physical: { color: "#f97316", label: "Physical" },
  special:  { color: "#818cf8", label: "Special" },
  status:   { color: "#94a3b8", label: "Status" },
};

function StatBar({ label, value }) {
  const pct = (value / 255) * 100;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 40px", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "#7a8099", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <div style={{ background: "#1a2030", borderRadius: 999, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: statColor(value), borderRadius: 999 }} />
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

function MoveTable({ moves, showLevel, onMoveClick }) {
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
                <td
                  onClick={onMoveClick && m.move_id ? () => onMoveClick(m.move_id) : undefined}
                  style={{ padding: "5px 8px", color: onMoveClick ? "#7a9ef0" : "#c8cde0", fontWeight: 500, textTransform: "capitalize", cursor: onMoveClick ? "pointer" : "default" }}
                >
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

function PokemonMiniGrid({ pokemon, onNavigate }) {
  if (!pokemon.length) return <div className="muted small" style={{ padding: 8 }}>None found.</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8, marginTop: 10 }}>
      {pokemon.map(p => (
        <div
          key={p.id}
          onClick={() => onNavigate({ id: p.id, name: p.name, category: "pokemon" })}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px", borderRadius: 8, border: "1px solid #1a2030", background: "#0b0e14", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#3a58cc"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#1a2030"}
        >
          <img src={getPokemonSpriteUrl(p.id, p.name)} alt={p.name} style={{ width: 48, height: 48, imageRendering: "pixelated" }} />
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "capitalize", color: "#c8cde0", textAlign: "center" }}>{capitalize(p.name)}</span>
          <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
            {[p.type1, p.type2].filter(Boolean).map(t => <TypeChip key={t} type={t} small />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function useDetailFetch(urls) {
  const [data, setData] = useState(urls.map(() => null));
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    setData(urls.map(() => null));
    Promise.all(urls.map(u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null)))
      .then(results => { setData(results); setLoading(false); });
  }, [urls.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading };
}

function DetailShell({ onBack, children, loading }) {
  return (
    <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
      {onBack && <button className="ghost small" onClick={onBack} style={{ marginBottom: 20 }}>← Back to Search</button>}
      {loading ? <div className="muted" style={{ textAlign: "center", padding: 60 }}>Loading…</div> : children}
    </section>
  );
}

function ItemDetail({ id, onBack }) {
  const { data: [item], loading } = useDetailFetch([`${API_BASE}/api/items/${id}`]);
  const spriteUrl = item ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/versions/generation-iii/emerald/${item.name}.png` : null;
  return (
    <DetailShell onBack={onBack} loading={loading}>
      {item && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <img
              src={spriteUrl}
              alt={item.name}
              style={{ width: 64, height: 64, imageRendering: "pixelated", marginBottom: 8 }}
              onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.name}.png`; e.target.onerror = () => { e.target.style.display = "none"; }; }}
            />
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
              {(item.name || "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </div>
            {item.category && (
              <span style={{ fontSize: 11, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {item.category.replace(/-/g, " ")}
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {item.effect && (
              <div className="card">
                <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center", marginBottom: 10 }}>Effect</strong>
                <p style={{ fontSize: 13, color: "#c8cde0", lineHeight: 1.6, margin: 0 }}>{item.effect}</p>
              </div>
            )}
            {item.effect_long && (
              <div className="card">
                <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center", marginBottom: 10 }}>Detailed Effect</strong>
                <p style={{ fontSize: 13, color: "#c8cde0", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>{item.effect_long}</p>
              </div>
            )}
          </div>
          {item.flavor_text && (
            <div className="card" style={{ textAlign: "center" }}>
              <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>In-Game Description</strong>
              <p style={{ fontSize: 13, color: "#c8cde0", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>{item.flavor_text}</p>
            </div>
          )}
        </div>
      )}
    </DetailShell>
  );
}

function MoveDetail({ id, onBack, onNavigate }) {
  const { data: [move, learnersRaw], loading } = useDetailFetch([
    `${API_BASE}/api/moves/${id}`,
    `${API_BASE}/api/moves/${id}/pokemon`,
  ]);
  const learners = Array.isArray(learnersRaw) ? learnersRaw : [];
  const t = (move?.type || "").toLowerCase();
  return (
    <DetailShell onBack={onBack} loading={loading}>
      {move && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, textTransform: "capitalize", marginBottom: 8 }}>
              {(move.name || "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
              <TypeChip type={t} />
              {move.damage_class && (() => {
                const dc = DAMAGE_CLASS_STYLE[move.damage_class] || { color: "#888", label: move.damage_class };
                return (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, border: `1px solid ${dc.color}66`, color: dc.color, background: dc.color + "22", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {dc.label}
                  </span>
                );
              })()}
              {[["Power", move.power], ["Accuracy", move.accuracy ? `${move.accuracy}%` : null], ["PP", move.pp]].map(([lbl, val]) => val != null && (
                <span key={lbl} style={{ fontSize: 12, color: "#7a8099" }}>
                  <span style={{ color: "#5a6380" }}>{lbl} </span>
                  <span style={{ fontWeight: 700, color: "#e4e6ef" }}>{val}</span>
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {move.effect && (
              <div className="card">
                <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center", marginBottom: 10 }}>Effect</strong>
                <p style={{ fontSize: 13, color: "#c8cde0", lineHeight: 1.6, margin: 0 }}>{move.effect}</p>
              </div>
            )}
            {move.flavor_text && (
              <div className="card">
                <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center", marginBottom: 10 }}>In-Game Description</strong>
                <p style={{ fontSize: 13, color: "#c8cde0", lineHeight: 1.6, margin: 0 }}>{move.flavor_text}</p>
              </div>
            )}
          </div>
          {learners.length > 0 && (
            <div className="card">
              <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center" }}>
                Learned By ({learners.length})
              </strong>
              <PokemonMiniGrid pokemon={learners} onNavigate={onNavigate} />
            </div>
          )}
        </div>
      )}
    </DetailShell>
  );
}

function AbilityDetail({ id, onBack, onNavigate }) {
  const { data: [ability, learnersRaw], loading } = useDetailFetch([
    `${API_BASE}/api/abilities/${id}`,
    `${API_BASE}/api/abilities/${id}/pokemon`,
  ]);
  const learners = Array.isArray(learnersRaw) ? learnersRaw : [];
  return (
    <DetailShell onBack={onBack} loading={loading}>
      {ability && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{fmtAbility(ability.name)}</div>
            <span style={{ fontSize: 11, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em" }}>Ability</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {ability.effect && (
              <div className="card">
                <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center", marginBottom: 10 }}>Effect</strong>
                <p style={{ fontSize: 13, color: "#c8cde0", lineHeight: 1.6, margin: 0 }}>{ability.effect}</p>
              </div>
            )}
            {ability.flavor_text && (
              <div className="card">
                <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center", marginBottom: 10 }}>In-Game Description</strong>
                <p style={{ fontSize: 13, color: "#c8cde0", lineHeight: 1.6, margin: 0 }}>{ability.flavor_text}</p>
              </div>
            )}
          </div>
          {learners.length > 0 && (
            <div className="card">
              <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center" }}>
                Pokémon with this Ability ({learners.length})
              </strong>
              <PokemonMiniGrid pokemon={learners} onNavigate={onNavigate} />
            </div>
          )}
        </div>
      )}
    </DetailShell>
  );
}

const METHOD_ORDER = ["walk","land","surf","surfing","old-rod","good-rod","super-rod","rock-smash","headbutt","gift","static","other"];
const METHOD_LABEL = { walk:"Land", land:"Land", surf:"Surfing", surfing:"Surfing", "old-rod":"Old Rod", "good-rod":"Good Rod", "super-rod":"Super Rod", "rock-smash":"Rock Smash", headbutt:"Headbutt", gift:"Gift / Static", static:"Gift / Static" };

function RouteDetail({ id, name, onBack, onNavigate }) {
  const { data: [encountersRaw], loading } = useDetailFetch([
    `${API_BASE}/api/locations/${id}/encounters`,
  ]);
  const encounters = Array.isArray(encountersRaw) ? encountersRaw : [];

  const rawLocName = name || "";

  const fmtAreaSuffix = (areaName) => {
    let s = areaName || "";
    const prefix = rawLocName + "-";
    if (s.startsWith(prefix)) s = s.slice(prefix.length);
    else if (s.startsWith(rawLocName)) s = s.slice(rawLocName.length).replace(/^-/, "");
    if (!s || s === "area") return null;
    return s.replace(/-/g, " ").toUpperCase();
  };

  // Group by area first, then method within each area
  const byArea = {};
  for (const e of encounters) {
    const area = e.area_name || "__default";
    if (!byArea[area]) byArea[area] = {};
    const m = (e.encounter_method || "other").toLowerCase();
    if (!byArea[area][m]) byArea[area][m] = [];
    byArea[area][m].push(e);
  }
  for (const area of Object.keys(byArea)) {
    for (const m of Object.keys(byArea[area])) {
      byArea[area][m].sort((a, b) => (b.encounter_rate ?? 0) - (a.encounter_rate ?? 0));
    }
  }

  const areaKeys = Object.keys(byArea);
  const multiArea = areaKeys.length > 1;

  return (
    <DetailShell onBack={onBack} loading={loading}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{fmtLocation(rawLocName)}</div>
          <span style={{ fontSize: 11, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em" }}>Route</span>
        </div>
        {areaKeys.map(areaKey => {
          const areaLabel = fmtAreaSuffix(areaKey);
          const methodsInArea = byArea[areaKey];
          const methodKeys = [
            ...METHOD_ORDER.filter(m => methodsInArea[m]),
            ...Object.keys(methodsInArea).filter(m => !METHOD_ORDER.includes(m)),
          ];
          return (
            <div key={areaKey} className="card">
              {multiArea && areaLabel && (
                <div style={{ fontSize: 13, fontWeight: 800, color: "#e4e6ef", textAlign: "center", letterSpacing: "0.05em", paddingBottom: 10, marginBottom: 4, borderBottom: "1px solid #1a2030" }}>
                  {areaLabel}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {methodKeys.map((method, mi) => (
                  <div key={method} style={{ paddingTop: mi > 0 ? 8 : 0, borderTop: mi > 0 ? "1px solid #1a2030" : "none" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                      {METHOD_LABEL[method] || method.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    {methodsInArea[method].map((e, i) => (
                      <div
                        key={i}
                        onClick={() => onNavigate({ id: e.pokemon_id, name: e.pokemon_name, category: "pokemon" })}
                        style={{ display: "grid", gridTemplateColumns: "38px 1fr 50px 72px", gap: 8, alignItems: "center", padding: "5px 4px", borderBottom: "1px solid #0f1520", cursor: "pointer" }}
                        onMouseEnter={ev => ev.currentTarget.style.background = "#0e1425"}
                        onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}
                      >
                        <img src={getPokemonSpriteUrl(e.pokemon_id, e.pokemon_name)} alt={e.pokemon_name} style={{ width: 34, height: 34, imageRendering: "pixelated" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#c8cde0", textTransform: "capitalize" }}>{e.pokemon_name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981", textAlign: "right" }}>{e.encounter_rate != null ? `${e.encounter_rate}%` : "—"}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#c8cde0", textAlign: "right" }}>
                          {e.min_level != null ? `Lv ${e.min_level}${e.max_level && e.max_level !== e.min_level ? `–${e.max_level}` : ""}` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DetailShell>
  );
}

function SidePanel({ panel, onClose, onNavigate }) {
  const inner = (() => {
    if (panel.category === "move")    return <MoveDetail    id={panel.id} onNavigate={onNavigate} />;
    if (panel.category === "ability") return <AbilityDetail id={panel.id} onNavigate={onNavigate} />;
    if (panel.category === "item")    return <ItemDetail    id={panel.id} />;
    if (panel.category === "location") return <RouteDetail  id={panel.id} name={panel.name} onNavigate={onNavigate} />;
    return null;
  })();
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 199, background: "transparent" }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420, zIndex: 200,
        background: "#0b0e18", borderLeft: "1px solid #1a2030",
        boxShadow: "-8px 0 40px #00000088",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderBottom: "1px solid #1a2030", flexShrink: 0 }}>
          <button className="ghost small" onClick={onClose}>✕ Close</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
          {inner}
        </div>
      </div>
    </>
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

function EvoNode({ node, currentId, onSelect }) {
  const isCurrent = node.id === currentId;
  const clickable = !isCurrent;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div
          onClick={clickable ? () => onSelect({ id: node.id, name: node.name, category: "pokemon" }) : undefined}
          style={{
            borderRadius: 10, padding: 6,
            background: isCurrent ? "#1a2240" : "transparent",
            border: `1px solid ${isCurrent ? "#3a58cc" : "transparent"}`,
            cursor: clickable ? "pointer" : "default",
            transition: "border-color 0.12s, background 0.12s",
          }}
          onMouseEnter={e => { if (clickable) { e.currentTarget.style.borderColor = "#3a58cc"; e.currentTarget.style.background = "#111830"; } }}
          onMouseLeave={e => { if (clickable) { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; } }}
        >
          <img
            src={getPokemonSpriteUrl(node.id, node.name)}
            alt={node.name}
            style={{ width: 56, height: 56, imageRendering: "pixelated", display: "block" }}
          />
        </div>
        <span
          onClick={clickable ? () => onSelect({ id: node.id, name: node.name, category: "pokemon" }) : undefined}
          style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize", textAlign: "center", color: isCurrent ? "#7a9ef0" : "#c8cde0", cursor: clickable ? "pointer" : "default" }}
          onMouseEnter={e => { if (clickable) e.currentTarget.style.color = "#7a9ef0"; }}
          onMouseLeave={e => { if (clickable) e.currentTarget.style.color = "#c8cde0"; }}
        >
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
              <EvoNode node={evo.into} currentId={currentId} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PokemonDetail({ selected, detail, loading, onBack, onSelect, onOpenPanel }) {
  const [activeTab, setActiveTab] = useState(null);

  const handleAbilityClick = async (abilityName) => {
    if (!onOpenPanel) return;
    try {
      const res = await fetch(`${API_BASE}/api/abilities/by-name/${encodeURIComponent(abilityName)}`);
      if (res.ok) { const ab = await res.json(); onOpenPanel("ability", ab.id); }
    } catch { /* noop */ }
  };

  const base = detail?.base;
  const moves = detail?.moves || [];
  const chain = detail?.chain || null;
  const locs = detail?.locs || [];

  const dexNum = String(selected.id).padStart(4, "0");

  const levelUpMoves = moves.filter(m => m.learn_method === "level-up").sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const tmMoves     = moves.filter(m => m.learn_method === "machine");
  const eggMoves    = moves.filter(m => m.learn_method === "egg");
  const tutorMoves  = moves.filter(m => m.learn_method === "tutor");

  const moveTabs = [
    { key: "level-up", label: "Level Up", moves: levelUpMoves, showLevel: true },
    { key: "machine",  label: "TM / HM",  moves: tmMoves,      showLevel: false },
    { key: "egg",      label: "Egg",       moves: eggMoves,     showLevel: false },
    { key: "tutor",    label: "Tutor",     moves: tutorMoves,   showLevel: false },
  ].filter(t => t.moves.length > 0);

  useEffect(() => { setActiveTab(null); }, [selected.id]);

  const currentTab = moveTabs.find(t => t.key === activeTab) ?? moveTabs[0];

  const locsByLocation = {};
  for (const l of locs) {
    if (!locsByLocation[l.location_name]) locsByLocation[l.location_name] = [];
    locsByLocation[l.location_name].push(l);
  }

  const statRows = base ? [
    { label: "HP",  value: base.hp },
    { label: "Atk", value: base.attack },
    { label: "Def", value: base.defense },
    { label: "SpA", value: base.sp_attack },
    { label: "SpD", value: base.sp_defense },
    { label: "Spe", value: base.speed },
  ] : [];

  return (
    <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
      <button className="ghost small" onClick={onBack} style={{ marginBottom: 20 }}>← Back to Search</button>

      {loading || !detail ? (
        <div className="muted" style={{ textAlign: "center", padding: 60 }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Header card */}
          <div className="card" style={{ display: "grid", gridTemplateColumns: "128px 1fr 128px", alignItems: "center", gap: 16 }}>
            {/* Normal sprite */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingLeft: 12 }}>
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/emerald/${selected.id}.png`}
                alt={`${base.name} normal`}
                style={{ width: 128, height: 128, imageRendering: "pixelated" }}
                onError={e => { e.target.style.opacity = "0.2"; }}
              />
              <span style={{ fontSize: 10, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.06em" }}>Normal</span>
            </div>

            {/* Center: name + dex + types */}
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, justifyContent: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 800, textTransform: "capitalize" }}>{capitalize(base.name)}</span>
                <span className="muted small">no {dexNum}</span>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {[base.type1, base.type2].filter(Boolean).map(t => <TypeChip key={t} type={t} />)}
              </div>
            </div>

            {/* Shiny sprite */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingRight: 12 }}>
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/emerald/shiny/${selected.id}.png`}
                alt={`${base.name} shiny`}
                style={{ width: 128, height: 128, imageRendering: "pixelated" }}
                onError={e => { e.target.style.opacity = "0.2"; }}
              />
              <span style={{ fontSize: 10, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.06em" }}>Shiny</span>
            </div>
          </div>

          {/* 2-col: stats + defense */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="card">
              <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center" }}>Base Stats</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {statRows.map(s => <StatBar key={s.label} {...s} />)}
                <div style={{ borderTop: "1px solid #1a2030", paddingTop: 8, display: "grid", gridTemplateColumns: "44px 1fr 40px", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#7a8099", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</span>
                  <div />
                  <span style={{ textAlign: "right", fontWeight: 700, fontSize: 13 }}>
                    {statRows.reduce((s, r) => s + r.value, 0)}
                  </span>
                </div>
                <div style={{ borderTop: "1px solid #1a2030", paddingTop: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#c8cde0", marginBottom: 10 }}>Abilities</div>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0 }}>
                    {[base.ability1, base.ability2].filter(Boolean).map((a, i) => (
                      <span key={a} style={{ display: "flex", alignItems: "center" }}>
                        {i > 0 && <span style={{ color: "#2a2f42", margin: "0 14px", fontSize: 18 }}>|</span>}
                        <span
                          onClick={onOpenPanel ? () => handleAbilityClick(a) : undefined}
                          style={{ fontSize: 15, fontWeight: 600, color: onOpenPanel ? "#7a9ef0" : "#e4e6ef", cursor: onOpenPanel ? "pointer" : "default" }}
                        >{fmtAbility(a)}</span>
                      </span>
                    ))}
                  </div>
                  {base.ability_hidden && (
                    <div style={{ marginTop: 8, fontSize: 13, color: "#5a6380" }}>
                      <span
                        onClick={onOpenPanel ? () => handleAbilityClick(base.ability_hidden) : undefined}
                        style={{ cursor: onOpenPanel ? "pointer" : "default", color: onOpenPanel ? "#7a9ef0" : undefined }}
                      >{fmtAbility(base.ability_hidden)}</span>{" "}
                      <em style={{ fontSize: 11 }}>(Hidden)</em>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ flex: 1 }}>
                <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center" }}>Type Defenses</strong>
                <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                  <DefenseGrid type1={base.type1} type2={base.type2} />
                </div>
              </div>

              {chain && chain.edges && chain.edges.length > 0 && (
                <div className="card">
                  <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", textAlign: "center" }}>Evolution Chain</strong>
                  <div style={{ marginTop: 14, overflowX: "auto", display: "flex", justifyContent: "center" }}>
                    <EvoNode node={buildEvoTree(chain.root, chain.edges)} currentId={selected.id} onSelect={onSelect} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Locations + Learnset side by side */}
          <div style={{ display: "grid", gridTemplateColumns: locs.length > 0 ? "1fr 1fr" : "1fr", gap: 16 }}>

            {locs.length > 0 && (() => {
              const byMethod = {};
              for (const l of locs) {
                const method = l.encounter_method || "unknown";
                if (!byMethod[method]) byMethod[method] = [];
                byMethod[method].push(l);
              }
              const methodLabel = m => ({ "walk": "Land", "land": "Land", "surf": "Surfing", "surfing": "Surfing", "old-rod": "Old Rod", "good-rod": "Good Rod", "super-rod": "Super Rod", "fishing": "Fishing" })[m.toLowerCase()] || m.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
              return (
                <div className="card" style={{ display: "flex", flexDirection: "column", maxHeight: 340, overflow: "hidden" }}>
                  <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", flexShrink: 0, display: "block", textAlign: "center" }}>Found At</strong>
                  <div style={{ flex: 1, overflowY: "auto", marginTop: 10, display: "flex", flexDirection: "column", gap: 14 }}>
                    {Object.entries(byMethod).map(([method, rows]) => (
                      <div key={method}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#c8cde0", textTransform: "capitalize", marginBottom: 4 }}>
                          {methodLabel(method)}
                        </div>
                        <div style={{ borderTop: "1px solid #1a2030" }}>
                          {rows.map((r, i) => (
                            <div
                              key={i}
                              onClick={onOpenPanel && r.location_id ? () => onOpenPanel("location", r.location_id, r.location_name) : undefined}
                              style={{
                                display: "grid", gridTemplateColumns: "72px 44px 1fr",
                                gap: 8, alignItems: "center",
                                padding: "5px 4px",
                                borderBottom: "1px solid #1a2030",
                                fontSize: 11,
                                cursor: onOpenPanel && r.location_id ? "pointer" : "default",
                              }}
                              onMouseEnter={e => { if (onOpenPanel && r.location_id) e.currentTarget.style.background = "#0e1425"; }}
                              onMouseLeave={e => { if (onOpenPanel && r.location_id) e.currentTarget.style.background = "transparent"; }}
                            >
                              <span style={{ color: "#7a8099" }}>
                                {r.min_level != null
                                  ? `Lv ${r.min_level}${r.max_level && r.max_level !== r.min_level ? `–${r.max_level}` : ""}`
                                  : "—"}
                              </span>
                              <span style={{ color: "#10b981", fontWeight: 600 }}>
                                {r.encounter_rate != null ? `${r.encounter_rate}%` : "—"}
                              </span>
                              <span style={{ color: onOpenPanel && r.location_id ? "#7a9ef0" : "#c8cde0", textAlign: "center" }}>
                                {fmtLocation(r.location_name || r.area_name)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {moveTabs.length > 0 && (
              <div className="card" style={{ display: "flex", flexDirection: "column", maxHeight: 340, overflow: "hidden" }}>
                <strong style={{ fontSize: 12, color: "#5a6380", textTransform: "uppercase", letterSpacing: "0.07em", flexShrink: 0, display: "block", textAlign: "center" }}>Learnset</strong>

                <div style={{ display: "flex", gap: 2, marginTop: 10, borderBottom: "1px solid #1a2030", flexShrink: 0 }}>
                  {moveTabs.map(tab => {
                    const isActive = tab.key === currentTab?.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                          padding: "5px 10px",
                          fontSize: 11, fontWeight: isActive ? 700 : 500,
                          border: "none", borderRadius: "5px 5px 0 0",
                          background: isActive ? "#1a2240" : "transparent",
                          color: isActive ? "#7a9ef0" : "#5a6380",
                          borderBottom: isActive ? "2px solid #3a58cc" : "2px solid transparent",
                          cursor: "pointer", transition: "color 0.12s, background 0.12s",
                          marginBottom: -1,
                        }}
                      >
                        {tab.label}
                        <span style={{ marginLeft: 4, fontSize: 9, color: isActive ? "#5a78c0" : "#3a3f52" }}>
                          {tab.moves.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                  {currentTab && (
                    <MoveTable moves={currentTab.moves} showLevel={currentTab.showLevel} onMoveClick={onOpenPanel ? (id) => onOpenPanel("move", id) : undefined} />
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      )}
    </section>
  );
}

function CyclingSprite() {
  const [id, setId] = useState(() => Math.floor(Math.random() * 386) + 1);
  const [fade, setFade] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/pokemon/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setName(capitalize(d.name)); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setId(Math.floor(Math.random() * 386) + 1);
        setFade(true);
      }, 300);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 10 }}>
      <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          key={id}
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/emerald/${id}.png`}
          alt={name}
          style={{
            width: 240, height: 240, imageRendering: "pixelated",
            opacity: fade ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
          onError={e => { e.target.style.opacity = 0; }}
        />
      </div>
      <span style={{
        fontSize: 13, fontWeight: 600, color: "#5a6380",
        letterSpacing: "0.06em",
        opacity: fade && name ? 1 : 0,
        transition: "opacity 0.3s ease",
        minHeight: 20,
      }}>
        {name ? `No.${String(id).padStart(3, "0")} · ${name}` : ""}
      </span>
    </div>
  );
}

export default function LookupScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [panel, setPanel] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pokedex-recent") || "[]"); } catch { return []; }
  });
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const openPanel = (category, id, name) => setPanel({ category, id, name });

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
          ...(pokeRes.status === "fulfilled" && Array.isArray(pokeRes.value) ? pokeRes.value : []).slice(0, 8).map(p => ({ id: p.id, name: p.name, category: "pokemon", type1: p.type1, type2: p.type2 })),
          ...(moveRes.status === "fulfilled" && Array.isArray(moveRes.value) ? moveRes.value : []).slice(0, 8).map(m => ({ id: m.id, name: m.name, category: "move", moveType: m.type, power: m.power })),
          ...(abilityRes.status === "fulfilled" && Array.isArray(abilityRes.value) ? abilityRes.value : []).slice(0, 8).map(a => ({ id: a.id, name: a.name, category: "ability" })),
          ...(itemRes.status === "fulfilled" && Array.isArray(itemRes.value) ? itemRes.value : []).slice(0, 8).map(i => ({ id: i.id, name: i.name, category: "item", itemCategory: i.category })),
          ...(locRes.status === "fulfilled" && Array.isArray(locRes.value) ? locRes.value : []).slice(0, 8).map(l => ({ id: l.id, name: l.name, category: "location" })),
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
    setPanel(null);
    setFocused(false);
    setRecentSearches(prev => {
      const next = [result, ...prev.filter(r => !(r.id === result.id && r.category === result.category))].slice(0, 6);
      try { localStorage.setItem("pokedex-recent", JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };

  const handleBack = () => {
    setSelected(null);
    setDetail(null);
    setPanel(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (selected?.category === "pokemon") {
    return (
      <>
        <PokemonDetail
          selected={selected}
          detail={detail}
          loading={loadingDetail}
          onBack={handleBack}
          onSelect={handleSelect}
          onOpenPanel={openPanel}
        />
        {panel && (
          <SidePanel
            panel={panel}
            onClose={() => setPanel(null)}
            onNavigate={handleSelect}
            onOpenPanel={openPanel}
          />
        )}
      </>
    );
  }

  if (selected?.category === "move")     return <MoveDetail    id={selected.id} onBack={handleBack} onNavigate={handleSelect} />;
  if (selected?.category === "ability")  return <AbilityDetail id={selected.id} onBack={handleBack} onNavigate={handleSelect} />;
  if (selected?.category === "item")     return <ItemDetail    id={selected.id} onBack={handleBack} />;
  if (selected?.category === "location") return <RouteDetail   id={selected.id} name={selected.name} onBack={handleBack} onNavigate={handleSelect} />;

  const displayResults = categoryFilter === "all" ? results : results.filter(r => r.category === categoryFilter);
  const showRecents = focused && !query.trim() && recentSearches.length > 0;
  const showDropdown = displayResults.length > 0 || showRecents;

  const renderRow = (r, i, arr) => {
    const cat = CATEGORIES[r.category] || {};
    const badge = (
      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0, background: cat.bg || "#33333333", color: cat.color || "#888", border: `1px solid ${cat.color || "#888"}66` }}>
        {cat.label || r.category}
      </span>
    );
    let thumb = null;
    let primary = null;
    let secondary = null;
    if (r.category === "pokemon") {
      thumb = <img src={getPokemonSpriteUrl(r.id, r.name)} alt="" style={{ width: 40, height: 40, imageRendering: "pixelated", flexShrink: 0 }} />;
      primary = <span style={{ fontSize: 14, fontWeight: 600, color: "#e4e6ef", textTransform: "capitalize" }}>{capitalize(r.name)}</span>;
      secondary = <div style={{ display: "flex", gap: 4, marginTop: 2 }}>{[r.type1, r.type2].filter(Boolean).map(t => <TypeChip key={t} type={t} small />)}</div>;
    } else if (r.category === "move") {
      thumb = null;
      primary = <span style={{ fontSize: 14, fontWeight: 600, color: "#e4e6ef", textTransform: "capitalize" }}>{r.name.replace(/-/g, " ")}</span>;
      secondary = (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          {r.moveType && <TypeChip type={r.moveType} small />}
          {r.power && <span style={{ fontSize: 11, color: "#5a6380" }}>Pwr {r.power}</span>}
        </div>
      );
    } else if (r.category === "item") {
      thumb = <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${r.name}.png`} alt="" style={{ width: 40, height: 40, imageRendering: "pixelated", flexShrink: 0 }} onError={e => { e.target.style.opacity = "0"; }} />;
      primary = <span style={{ fontSize: 14, fontWeight: 600, color: "#e4e6ef", textTransform: "capitalize" }}>{r.name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>;
      secondary = r.itemCategory ? <span style={{ fontSize: 11, color: "#5a6380", textTransform: "capitalize" }}>{r.itemCategory.replace(/-/g, " ")}</span> : null;
    } else if (r.category === "ability") {
      thumb = <div style={{ width: 40, flexShrink: 0 }} />;
      primary = <span style={{ fontSize: 14, fontWeight: 600, color: "#e4e6ef" }}>{fmtAbility(r.name)}</span>;
    } else {
      thumb = <div style={{ width: 40, flexShrink: 0 }} />;
      primary = <span style={{ fontSize: 14, fontWeight: 600, color: "#e4e6ef" }}>{fmtLocation(r.name)}</span>;
    }
    return (
      <button
        key={`${r.category}-${r.id}`}
        onClick={() => handleSelect(r)}
        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 18px", background: "transparent", border: "none", borderBottom: i < arr.length - 1 ? "1px solid #1a2030" : "none", cursor: "pointer", textAlign: "left" }}
        onMouseEnter={e => e.currentTarget.style.background = "#181e2e"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        {thumb}
        <div style={{ flex: 1, minWidth: 0 }}>
          {primary}
          {secondary}
        </div>
        {badge}
      </button>
    );
  };

  return (
    <section style={{ maxWidth: 680, margin: "0 auto", padding: "60px 20px 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <CyclingSprite />
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: "0 0 6px" }}>Pokédex</h1>
        <p className="muted">Search Pokémon, Moves, Abilities, Items, and Routes</p>
      </div>

      {/* Category filter pills */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {["all", "pokemon", "move", "ability", "item", "location"].map(cat => {
          const isAll = cat === "all";
          const catInfo = isAll ? { label: "All", color: "#7a8099", bg: "#7a809933" } : (CATEGORIES[cat] || {});
          const isActive = categoryFilter === cat;
          return (
            <button key={cat} onClick={() => setCategoryFilter(cat)} style={{ padding: "5px 14px", borderRadius: 999, border: `1px solid ${isActive ? catInfo.color : "#252c40"}`, background: isActive ? (catInfo.bg || catInfo.color + "22") : "transparent", color: isActive ? catInfo.color : "#5a6380", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.12s" }}>
              {isAll ? "All" : catInfo.label}
            </button>
          );
        })}
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#111520", border: "1px solid #252c40", borderRadius: 999, padding: "13px 22px", boxShadow: "0 4px 24px #00000044" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search for Pokémon, Item, Routes, Ability, or Moves…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, color: "#e4e6ef" }}
          />
          {searching && <span className="muted small" style={{ flexShrink: 0 }}>…</span>}
        </div>

        {showDropdown && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => { setResults([]); setFocused(false); }} />
            <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 10, background: "#111520", border: "1px solid #252c40", borderRadius: 14, boxShadow: "0 8px 40px #00000099", overflow: "hidden" }}>
              {showRecents && !query.trim() ? (
                <>
                  <div style={{ padding: "8px 18px 4px", fontSize: 10, fontWeight: 700, color: "#3a3f52", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent</div>
                  {recentSearches.map((r, i) => renderRow(r, i, recentSearches))}
                </>
              ) : (
                displayResults.length > 0
                  ? displayResults.map((r, i) => renderRow(r, i, displayResults))
                  : <div style={{ padding: "20px", textAlign: "center", color: "#3a3f52", fontSize: 13 }}>No results in this category</div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
