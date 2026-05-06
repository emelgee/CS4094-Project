import { useState, useEffect, useRef } from "react";
import { API_BASE, HOENN_LOCATIONS } from "../data/constants";
import { capitalize, getPokemonSpriteUrl } from "../utils/helpers";

const NATURES = [
  "hardy","lonely","brave","adamant","naughty",
  "bold","docile","relaxed","impish","lax",
  "timid","hasty","serious","jolly","naive",
  "modest","mild","quiet","bashful","rash",
  "calm","gentle","sassy","careful","quirky",
];

export default function EncountersScreen({ onNavigate, onOpenAdd, encounters, onDelete, onUpdate, onAdd }) {
  const [activeId, setActiveId] = useState(null);
  const [formData, setFormData] = useState({});
  const [locOpen, setLocOpen] = useState(false);
  const [pokeOpen, setPokeOpen] = useState(false);
  const [pokeResults, setPokeResults] = useState([]);
  const [pokeLoading, setPokeLoading] = useState(false);
  const debounceRef = useRef(null);

  // Route sidebar
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routePokemon, setRoutePokemon] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  // Quick-add from route
  const [quickAddPoke, setQuickAddPoke] = useState(null);
  const [qaForm, setQaForm] = useState({ nickname: "", level: "", nature: "serious", outcome: "Caught" });
  const [qaLoading, setQaLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/locations`)
      .then((r) => r.json())
      .then((data) => setRoutes(Array.isArray(data) ? data : []))
      .catch(() => setRoutes([]));
  }, []);

  useEffect(() => {
    if (!selectedRoute) { setRoutePokemon([]); return; }
    setRouteLoading(true);
    setQuickAddPoke(null);
    fetch(`${API_BASE}/api/locations/${selectedRoute.id}/encounters`)
      .then((r) => r.json())
      .then((data) => setRoutePokemon(Array.isArray(data) ? data : []))
      .catch(() => setRoutePokemon([]))
      .finally(() => setRouteLoading(false));
  }, [selectedRoute]);

  const visibleEncounters = selectedRoute
    ? encounters.filter((e) => e.location === selectedRoute.name)
    : encounters;

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

  const handleSelectRoutePoke = (p) => {
    setQuickAddPoke(p);
    setQaForm({ nickname: capitalize(p.pokemon_name), level: p.min_level || "", nature: "serious", outcome: "Caught" });
  };

  const handleQuickAdd = async () => {
    if (!onAdd || !quickAddPoke || !selectedRoute) return;
    setQaLoading(true);
    try {
      await onAdd({
        location: selectedRoute.name,
        pokemon: capitalize(quickAddPoke.pokemon_name),
        pokemon_id: quickAddPoke.pokemon_id,
        nickname: qaForm.nickname || capitalize(quickAddPoke.pokemon_name),
        ability: null,
        outcome: qaForm.outcome,
        level: Number(qaForm.level) || quickAddPoke.min_level || 5,
        nature: qaForm.nature,
      });
      setQuickAddPoke(null);
    } finally {
      setQaLoading(false);
    }
  };

  // Derive per-route outcome tags
  const routeOutcomes = (routeName) => {
    const statuses = [...new Set(encounters.filter((e) => e.location === routeName).map((e) => (e.status || "unknown").toLowerCase()))];
    return statuses;
  };

  const uniqueRoutePokemon = routePokemon.reduce((acc, cur) => {
    if (!acc.find((p) => p.pokemon_id === cur.pokemon_id)) acc.push(cur);
    return acc;
  }, []);

  return (
    <section>
      <header className="page-header">
        <h1>Encounters</h1>
        <p className="muted">Log encounters per route.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>

        {/* ── Left: encounter list + edit/preview ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

          {/* Encounter list */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="rowBetween mb8">
              <strong>
                Encounters
                <span className="muted" style={{ fontWeight: 400 }}>
                  {selectedRoute ? ` — ${selectedRoute.name}` : " — All"}
                </span>
              </strong>
              <button className="btn small" aria-label="Add new encounter" onClick={onOpenAdd}>+ Add</button>
            </div>
            <ul className="list" style={{ listStyle: "none", padding: 0 }}>
              {visibleEncounters.length === 0 ? (
                <li className="listItem"><div className="muted">No encounters logged yet.</div></li>
              ) : (
                visibleEncounters.map((enc) => (
                  <li
                    key={enc.id}
                    className={`listItem${activeId === enc.id ? " active" : ""}`}
                    onClick={() => handleSelectEncounter(enc)}
                    style={{ cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <img
                        src={getPokemonSpriteUrl(enc.pokemon_id, enc.pokemon_name)}
                        alt={enc.pokemon_name || ""}
                        className="enc-sprite"
                      />
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

          {/* Edit + Preview row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* Edit panel */}
            <div className="panel" style={{ margin: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#c8cde0", marginBottom: 10 }}>Edit Encounter</div>
              <form onSubmit={handleSaveDetails}>
                <div className="formGrid">
                  <div>
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

                  <div>
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

                  <div>
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

                  <div>
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

                <div style={{ marginTop: 10 }}>
                  <label htmlFor="notes-textarea">Notes</label>
                  <textarea
                    id="notes-textarea"
                    rows="3"
                    placeholder="Notes..."
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    disabled={!formData.id}
                  />
                </div>

                <div className="row mt8">
                  <button type="submit" className="btn primary small" disabled={!formData.id}>
                    Save Details
                  </button>
                </div>
              </form>
            </div>

            {/* Preview panel */}
            <div className="panel" style={{ margin: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#c8cde0", marginBottom: 10 }}>Selected Encounter</div>
              {formData.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={getPokemonSpriteUrl(formData.pokemon_id, formData.pokemon_name)}
                      alt={formData.pokemon_name || ""}
                      style={{ width: 128, height: 128, objectFit: "contain", imageRendering: "pixelated", borderRadius: 10, background: "#0b0e14", border: "1px solid #1f2638", padding: 4, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {formData.nickname || capitalize(formData.pokemon_name) || `#${formData.pokemon_id}`}
                      </div>
                      <div className="muted small">#{String(formData.pokemon_id || 0).padStart(3, "0")}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        {[formData.type1, formData.type2].filter(Boolean).map((t) => (
                          <span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 2 }}>
                    <div className="statRow"><span>Location</span><span>{formData.location}</span></div>
                    {formData.level && <div className="statRow"><span>Level</span><span>{formData.level}</span></div>}
                    <div className="statRow">
                      <span>Status</span>
                      <span className={`outcome-tag ${(formData.status || "unknown").toLowerCase()}`}>
                        {formData.status || "unknown"}
                      </span>
                    </div>
                    {formData.notes && (
                      <div className="statRow" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                        <span className="muted small">Notes</span>
                        <span style={{ fontSize: 12, color: "#c8cde0" }}>{formData.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="muted">Select an encounter to preview.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: routes + pokemon on route ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Routes list */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="rowBetween mb8">
              <strong>Routes</strong>
              {selectedRoute && (
                <button className="ghost small" onClick={() => setSelectedRoute(null)}>Clear</button>
              )}
            </div>
            <ul className="list" style={{ listStyle: "none", padding: 0, maxHeight: 260, overflowY: "auto" }}>
              {routes.length === 0 ? (
                <li className="listItem"><div className="muted">Loading…</div></li>
              ) : (
                routes.map((r) => {
                  const count = encounters.filter((e) => e.location === r.name).length;
                  const tags = routeOutcomes(r.name);
                  return (
                    <li
                      key={r.id}
                      className={`listItem${selectedRoute?.id === r.id ? " active" : ""}`}
                      onClick={() => setSelectedRoute(selectedRoute?.id === r.id ? null : r)}
                      style={{ cursor: "pointer" }}
                    >
                      <span>{r.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {tags.map((t) => (
                          <span key={t} className={`outcome-tag ${t}`}>{t}</span>
                        ))}
                        {count > 0 && <span className="muted small">{count}</span>}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Pokemon on route */}
          <div className="panel" style={{ margin: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#c8cde0", marginBottom: 8 }}>
              {selectedRoute ? `Pokémon on ${selectedRoute.name}` : "Pokémon on Route"}
            </div>
            <ul className="list" style={{ listStyle: "none", padding: 0, maxHeight: quickAddPoke ? 160 : 260, overflowY: "auto" }}>
              {!selectedRoute ? (
                <li className="listItem"><div className="muted">Select a route to see wild Pokémon.</div></li>
              ) : routeLoading ? (
                <li className="listItem"><div className="muted">Loading…</div></li>
              ) : uniqueRoutePokemon.length === 0 ? (
                <li className="listItem"><div className="muted">No encounters data found.</div></li>
              ) : (
                uniqueRoutePokemon.map((p) => (
                  <li
                    key={p.pokemon_id}
                    className={`listItem${quickAddPoke?.pokemon_id === p.pokemon_id ? " active" : ""}`}
                    onClick={() => handleSelectRoutePoke(p)}
                    style={{ cursor: "pointer" }}
                    title="Click to log as an encounter"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <img
                        src={getPokemonSpriteUrl(p.pokemon_id, p.pokemon_name)}
                        alt={p.pokemon_name}
                        className="enc-sprite"
                      />
                      <div>
                        <strong>{capitalize(p.pokemon_name)}</strong>
                        <div className="muted small">#{String(p.pokemon_id).padStart(3, "0")} · Lv {p.min_level}–{p.max_level}</div>
                      </div>
                    </div>
                    <span className="muted small" style={{ fontSize: 11 }}>+ Add</span>
                  </li>
                ))
              )}
            </ul>

            {/* Quick-add form */}
            {quickAddPoke && (
              <div style={{ marginTop: 10, borderTop: "1px solid #1f2638", paddingTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#c8cde0", marginBottom: 8 }}>
                  Log {capitalize(quickAddPoke.pokemon_name)} on {selectedRoute?.name}
                </div>
                <div className="formGrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div>
                    <label htmlFor="qa-nickname">Nickname</label>
                    <input
                      id="qa-nickname"
                      value={qaForm.nickname}
                      onChange={(e) => setQaForm({ ...qaForm, nickname: e.target.value })}
                      placeholder={capitalize(quickAddPoke.pokemon_name)}
                    />
                  </div>
                  <div>
                    <label htmlFor="qa-level">Level</label>
                    <input
                      id="qa-level"
                      type="number"
                      min="1"
                      max="100"
                      value={qaForm.level}
                      onChange={(e) => setQaForm({ ...qaForm, level: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="qa-nature">Nature</label>
                    <select
                      id="qa-nature"
                      value={qaForm.nature}
                      onChange={(e) => setQaForm({ ...qaForm, nature: e.target.value })}
                    >
                      {NATURES.map((n) => (
                        <option key={n} value={n}>{capitalize(n)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="qa-outcome">Outcome</label>
                    <select
                      id="qa-outcome"
                      value={qaForm.outcome}
                      onChange={(e) => setQaForm({ ...qaForm, outcome: e.target.value })}
                    >
                      <option value="Caught">Caught</option>
                      <option value="Fainted">Fainted</option>
                      <option value="Fled">Fled</option>
                      <option value="Missed">Missed</option>
                    </select>
                  </div>
                </div>
                <div className="row mt8">
                  <button className="btn small" disabled={qaLoading} onClick={handleQuickAdd}>
                    {qaLoading ? "Saving…" : "Save Encounter"}
                  </button>
                  <button className="ghost small" onClick={() => setQuickAddPoke(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
