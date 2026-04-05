import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../data/constants";
import { capitalize } from "../utils/helpers";

let nextId = 3;

export default function AddPokemonModal({ onClose, onAdd }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [level, setLevel] = useState(5);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchPokemon("");
    inputRef.current?.focus();
  }, []);

  async function fetchPokemon(q) {
    setLoading(true);
    try {
      const url = q.trim()
        ? `${API_BASE}/api/pokemon?search=${encodeURIComponent(q.trim())}`
        : `${API_BASE}/api/pokemon`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    setSelected(null);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPokemon(val), 250);
  }

  function handleSelect(poke) {
    setSelected(poke);
    setSearch(capitalize(poke.name));
    setOpen(false);
  }

  function handleAdd() {
    if (!selected) return;
    const types = [selected.type1, selected.type2].filter(Boolean);
    onAdd({
      id: nextId++,
      name: capitalize(selected.name),
      level: parseInt(level) || 1,
      gender: "♂ Male",
      types: types.map(capitalize),
      primaryType: selected.type1,
      stats: {
        hp: selected.hp, atk: selected.attack, def: selected.defense,
        spa: selected.sp_attack, spd: selected.sp_defense, spe: selected.speed,
      },
      nature: "Hardy (Neutral)",
      ability: capitalize(selected.ability1 || ""),
      moves: ["", "", "", ""],
      dbData: selected,
    });
    onClose();
  }

  const filtered = results.slice(0, 80);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="rowBetween">
          <h2>Add Pokémon to Party</h2>
          <button className="ghost small" onClick={onClose}>✕</button>
        </div>

        <div>
          <label>
            Search Pokémon (Gen 1–3)
            <div className="search-wrap" style={{ marginTop: 5 }}>
              <input
                ref={inputRef}
                className="search-input"
                placeholder="e.g. Breloom, Pikachu, Mewtwo..."
                value={search}
                onChange={handleSearchChange}
                onFocus={() => setOpen(true)}
              />
              {open && (
                <div className="dropdown">
                  {loading && <div className="dropdown-empty">Loading…</div>}
                  {!loading && filtered.length === 0 && <div className="dropdown-empty">No Pokémon found</div>}
                  {!loading && filtered.map((p) => {
                    const types = [p.type1, p.type2].filter(Boolean);
                    return (
                      <div
                        key={p.id}
                        className={`dropdown-item${selected?.id === p.id ? " selected" : ""}`}
                        onMouseDown={() => handleSelect(p)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="muted small">#{String(p.id).padStart(3, "0")}</span>
                          <strong>{capitalize(p.name)}</strong>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {types.map((t) => (
                            <span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </label>
        </div>

        <label>
          Starting Level
          <input type="number" min="1" max="100" value={level} onChange={(e) => setLevel(e.target.value)} style={{ marginTop: 5 }} />
        </label>

        {selected && (
          <div className="preview-card">
            <div className="preview-header">
              <div>
                <strong style={{ fontSize: 16 }}>{capitalize(selected.name)}</strong>
                <span className="muted small" style={{ marginLeft: 8 }}>#{String(selected.id).padStart(3, "0")}</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[selected.type1, selected.type2].filter(Boolean).map((t) => (
                  <span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>
                ))}
              </div>
            </div>
            <div className="preview-stats">
              {[["HP", selected.hp], ["Atk", selected.attack], ["Def", selected.defense], ["SpA", selected.sp_attack], ["SpD", selected.sp_defense], ["Spe", selected.speed]].map(([lbl, val]) => (
                <div key={lbl} className="preview-stat">
                  <span>{lbl}</span>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
            {(selected.ability1 || selected.ability2 || selected.ability_hidden) && (
              <div style={{ fontSize: 12, color: "#7a82a0", marginTop: 2 }}>
                {[selected.ability1, selected.ability2].filter(Boolean).map(capitalize).join(" / ")}
                {selected.ability_hidden && (
                  <span style={{ marginLeft: 6, color: "#5a6380" }}>
                    · {capitalize(selected.ability_hidden)} <span style={{ fontSize: 10 }}>(Hidden)</span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={!selected} onClick={handleAdd} style={{ opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "default" }}>
            Add to Party
          </button>
        </div>
      </div>
    </div>
  );
}
