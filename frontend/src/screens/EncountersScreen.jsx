import { useState, useEffect, useRef } from "react";
import { API_BASE, HOENN_LOCATIONS } from "../data/constants";
import { capitalize } from "../utils/helpers";

export default function EncountersScreen({ onNavigate, onOpenAdd, encounters, onDelete, onUpdate }) {
  const [activeId, setActiveId] = useState(null);
  const [formData, setFormData] = useState({});
  const [locOpen, setLocOpen] = useState(false);
  const [pokeOpen, setPokeOpen] = useState(false);
  const [pokeResults, setPokeResults] = useState([]);
  const [pokeLoading, setPokeLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const activeExists = encounters.find((e) => e.id === activeId);
    if (!activeExists && encounters.length > 0) {
      setActiveId(encounters[0].id);
      setFormData(encounters[0]);
    } else if (encounters.length === 0) {
      setActiveId(null);
      setFormData({});
    }
  }, [encounters, activeId]);

  const handleSelectEncounter = (enc) => {
    setActiveId(enc.id);
    setFormData(enc);
    setLocOpen(false);
    setPokeOpen(false);
  };

  const handleSaveDetails = (e) => {
    e.preventDefault();
    if (onUpdate && formData.id) onUpdate(formData);
  };

  const filteredLocs = HOENN_LOCATIONS.filter((l) =>
    l.toLowerCase().includes((formData.location || "").toLowerCase())
  );

  const fetchPokemon = async (q) => {
    setPokeLoading(true);
    try {
      const url = q.trim()
        ? `${API_BASE}/api/pokemon?search=${encodeURIComponent(q.trim())}`
        : `${API_BASE}/api/pokemon`;
      const res = await fetch(url);
      const data = await res.json();
      setPokeResults(Array.isArray(data) ? data : []);
    } catch {
      setPokeResults([]);
    } finally {
      setPokeLoading(false);
    }
  };

  const handlePokeChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, pokemon: val });
    setPokeOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPokemon(val), 250);
  };

  return (
    <section>
      <header className="page-header">
        <h1>Encounters</h1>
        <p className="muted">Log encounters and damage events per route.</p>
      </header>

      <div className="twoCol">
        {/* ── Left: encounter list ── */}
        <div className="col">
          <div className="rowBetween mb8">
            <strong>Encounter List</strong>
            <button className="btn small" aria-label="Add new encounter" onClick={onOpenAdd}>+ Add</button>
          </div>

          <ul className="list" style={{ listStyle: "none", padding: 0 }}>
            {encounters.length === 0 ? (
              <li className="listItem"><div className="muted">No encounters logged yet.</div></li>
            ) : (
              encounters.map((enc) => (
                <li
                  key={enc.id}
                  className={`listItem${activeId === enc.id ? " active" : ""}`}
                  onClick={() => handleSelectEncounter(enc)}
                  style={{ cursor: "pointer" }}
                >
                  <div>
                    <strong>{enc.location}</strong>
                    <div className="muted" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>#{String(enc.pokemon_id).padStart(3, "0")}</span>
                      <span>{enc.nickname || capitalize(enc.pokemon_name) || `Pokemon #${enc.pokemon_id}`}</span>
                      {[enc.type1, enc.type2].filter(Boolean).map((t) => (
                        <span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="row">
                    <span className={`outcome-tag ${(enc.status || "unknown").toLowerCase()}`}>
                      {enc.status || "unknown"}
                    </span>
                    <button
                      className="ghost small danger"
                      onClick={(e) => { e.stopPropagation(); onDelete(enc.id); }}
                      aria-label="Delete encounter"
                    >✕</button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* ── Right: detail + damage events ── */}
        <div className="col">
          <details open className="panel">
            <summary>Encounter Details</summary>
            <form onSubmit={handleSaveDetails}>
              <div className="formGrid">
                {/* Area */}
                <div className="form-group">
                  <label htmlFor="area-input">Area</label>
                  <div className="search-wrap">
                    <input
                      id="area-input"
                      value={formData.location || ""}
                      onChange={(e) => { setFormData({ ...formData, location: e.target.value }); setLocOpen(true); }}
                      onFocus={() => setLocOpen(true)}
                      onBlur={() => setTimeout(() => setLocOpen(false), 200)}
                      disabled={!formData.id}
                      autoComplete="off"
                    />
                    {locOpen && formData.id && (
                      <div className="dropdown">
                        {filteredLocs.length === 0
                          ? <div className="dropdown-empty">No locations found</div>
                          : filteredLocs.map((loc) => (
                              <div
                                key={loc}
                                className="dropdown-item"
                                onMouseDown={(e) => { e.preventDefault(); setFormData({ ...formData, location: loc }); setLocOpen(false); }}
                              >
                                <strong>{loc}</strong>
                              </div>
                            ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Opponent */}
                <div className="form-group">
                  <label htmlFor="opponent-input">Opponent</label>
                  <div className="search-wrap">
                    <input
                      id="opponent-input"
                      value={formData.pokemon || ""}
                      onChange={handlePokeChange}
                      onFocus={() => { setPokeOpen(true); fetchPokemon(formData.pokemon || ""); }}
                      onBlur={() => setTimeout(() => setPokeOpen(false), 200)}
                      disabled={!formData.id}
                      autoComplete="off"
                    />
                    {pokeOpen && formData.id && (
                      <div className="dropdown">
                        {pokeLoading && <div className="dropdown-empty">Loading…</div>}
                        {!pokeLoading && pokeResults.length === 0 && <div className="dropdown-empty">No Pokémon found</div>}
                        {!pokeLoading && pokeResults.slice(0, 50).map((p) => (
                          <div
                            key={p.id}
                            className="dropdown-item"
                            onMouseDown={(e) => { e.preventDefault(); setFormData({ ...formData, pokemon: capitalize(p.name) }); setPokeOpen(false); }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span className="muted small">#{String(p.id).padStart(3, "0")}</span>
                              <strong>{capitalize(p.name)}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Level */}
                <div className="form-group">
                  <label htmlFor="level-input">Opponent Level</label>
                  <input
                    id="level-input"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.level || ""}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || "" })}
                    disabled={!formData.id}
                  />
                </div>

                {/* Outcome */}
                <div className="form-group">
                  <label htmlFor="outcome-select">Outcome</label>
                  <select
                    id="outcome-select"
                    value={formData.outcome || "Caught"}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    disabled={!formData.id}
                  >
                    <option value="Caught">Caught</option>
                    <option value="Fainted">Fainted</option>
                    <option value="Fled">Fled</option>
                    <option value="Missed">Missed</option>
                  </select>
                </div>
              </div>

              <div className="form-group mt8">
                <label htmlFor="notes-textarea">Notes</label>
                <textarea
                  id="notes-textarea"
                  rows="2"
                  placeholder="Notes..."
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={!formData.id}
                ></textarea>
              </div>

              <div className="row mt8">
                <button type="submit" className="btn primary small" disabled={!formData.id}>
                  Save Details
                </button>
              </div>
            </form>
          </details>

          <details open className="panel mt8">
            <summary>Damage Events</summary>
            <ul className="list" style={{ listStyle: "none", padding: 0 }}>
              <li className="listItem">
                <div>
                  <strong>Turn 1</strong>
                  <div className="muted">Breloom → Taillow | Mach Punch | 12 dmg</div>
                </div>
                <button className="ghost small" onClick={() => onNavigate("calculator")}>Calc</button>
              </li>
              <li className="listItem">
                <div>
                  <strong>Turn 2</strong>
                  <div className="muted">Taillow → Breloom | Peck | 8 dmg</div>
                </div>
                <button className="ghost small" onClick={() => onNavigate("calculator")}>Calc</button>
              </li>
            </ul>
            <div className="row mt8">
              <button className="btn small">+ Add Damage Event</button>
              <button className="ghost small" onClick={() => onNavigate("calculator")}>Open Calculator</button>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
