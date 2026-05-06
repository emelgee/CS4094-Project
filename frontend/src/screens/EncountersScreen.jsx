import { useState, useEffect, useRef } from "react";
import { API_BASE, HOENN_LOCATIONS } from "../data/constants";
import { capitalize, getPokemonSpriteUrl } from "../utils/helpers";

const REGION_PREFIX = /^(hoenn|kanto|johto|sinnoh|unova|kalos|alola|galar|paldea)-/;
const fmtLocation = n => (n || "").replace(REGION_PREFIX, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const fmtAbility = n => (n || "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

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
  const [locInput, setLocInput] = useState("");
  const [pokeOpen, setPokeOpen] = useState(false);
  const [pokeResults, setPokeResults] = useState([]);
  const [pokeLoading, setPokeLoading] = useState(false);
  const debounceRef = useRef(null);

  // Route sidebar
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routePokemon, setRoutePokemon] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  // Route search
  const [routeSearch, setRouteSearch] = useState("");

  // Quick-add from route
  const [quickAddPoke, setQuickAddPoke] = useState(null);
  const [qaForm, setQaForm] = useState({ nickname: "", level: "", nature: "serious", outcome: "Caught" });
  const [qaLoading, setQaLoading] = useState(false);
  const [qaMoveOptions, setQaMoveOptions] = useState([]);
  const [qaMoves, setQaMoves] = useState([null, null, null, null]);
  const [qaAbilityId, setQaAbilityId] = useState(null);
  const [qaAbilityOptions, setQaAbilityOptions] = useState([]);

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

  // Clear selection when switching to a route with no encounters
  useEffect(() => {
    if (selectedRoute && visibleEncounters.length === 0) {
      setActiveId(null);
      setFormData({});
      return;
    }
    const activeExists = visibleEncounters.find((e) => e.id === activeId);
    if (!activeExists && visibleEncounters.length > 0) {
      setActiveId(visibleEncounters[0].id);
      setFormData(visibleEncounters[0]);
      setLocInput(visibleEncounters[0].location ? fmtLocation(visibleEncounters[0].location) : "");
    } else if (visibleEncounters.length === 0) {
      setActiveId(null);
      setFormData({});
      setLocInput("");
    }
  }, [encounters, activeId, selectedRoute]);

  const handleSelectEncounter = (enc) => {
    setActiveId(enc.id);
    setFormData(enc);
    setLocInput(enc.location ? fmtLocation(enc.location) : "");
    setLocOpen(false);
    setPokeOpen(false);
  };

  const handleSaveDetails = (e) => {
    e.preventDefault();
    if (onUpdate && formData.id) onUpdate(formData);
  };

  const filteredLocs = HOENN_LOCATIONS.filter((l) => {
    const q = locInput.toLowerCase();
    return fmtLocation(l).toLowerCase().includes(q) || l.toLowerCase().includes(q.replace(/\s+/g, "-"));
  });

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

  const handleSelectRoutePoke = async (p) => {
    const lv = p.min_level || 5;
    setQuickAddPoke(p);
    setQaForm({ nickname: capitalize(p.pokemon_name), level: lv, nature: "serious", outcome: "Caught" });
    setQaMoveOptions([]);
    setQaMoves([null, null, null, null]);
    setQaAbilityId(null);
    setQaAbilityOptions([]);
    try {
      const [pokeRes, movesRes] = await Promise.all([
        fetch(`${API_BASE}/api/pokemon/${p.pokemon_id}`),
        fetch(`${API_BASE}/api/pokemon/${p.pokemon_id}/moves`),
      ]);
      const pokeData = await pokeRes.json();
      const movesData = await movesRes.json();
      const levelUp = Array.isArray(movesData)
        ? movesData.filter((m) => m.learn_method === "level-up").sort((a, b) => a.level - b.level)
        : [];
      setQaMoveOptions(levelUp);
      const eligible = levelUp.filter((m) => m.level <= lv);
      const last4 = eligible.slice(-4);
      setQaMoves([
        last4[0] ? { id: last4[0].move_id, name: last4[0].move_name } : null,
        last4[1] ? { id: last4[1].move_id, name: last4[1].move_name } : null,
        last4[2] ? { id: last4[2].move_id, name: last4[2].move_name } : null,
        last4[3] ? { id: last4[3].move_id, name: last4[3].move_name } : null,
      ]);
      const abilOpts = [
        pokeData.ability1_id ? { id: pokeData.ability1_id, name: pokeData.ability1 } : null,
        pokeData.ability2_id ? { id: pokeData.ability2_id, name: pokeData.ability2 } : null,
        pokeData.ability_hidden_id ? { id: pokeData.ability_hidden_id, name: pokeData.ability_hidden } : null,
      ].filter(Boolean);
      setQaAbilityOptions(abilOpts);
      setQaAbilityId(abilOpts[0]?.id || null);
    } catch {
      // leave empty
    }
  };

  const handleQuickAdd = async () => {
    if (!onAdd || !quickAddPoke || !selectedRoute) return;
    setQaLoading(true);
    try {
      await onAdd({
        location_id: selectedRoute.id,
        location: selectedRoute.name,
        pokemon: capitalize(quickAddPoke.pokemon_name),
        pokemon_id: quickAddPoke.pokemon_id,
        nickname: qaForm.nickname || capitalize(quickAddPoke.pokemon_name),
        ability_id: qaAbilityId,
        outcome: qaForm.outcome,
        level: Number(qaForm.level) || quickAddPoke.min_level || 5,
        nature: qaForm.nature,
        move1_id: qaMoves[0]?.id || null,
        move2_id: qaMoves[1]?.id || null,
        move3_id: qaMoves[2]?.id || null,
        move4_id: qaMoves[3]?.id || null,
      });
      setQuickAddPoke(null);
    } finally {
      setQaLoading(false);
    }
  };

  // Derive per-route summary
  const routeSummary = (routeName) => {
    const encs = encounters.filter((e) => e.location === routeName);
    if (encs.length === 0) return null;
    const caught = encs.filter((e) => (e.status || "").toLowerCase() === "caught").length;
    const total = encs.length;
    return { caught, total };
  };

  const filteredRoutes = routes.filter((r) =>
    fmtLocation(r.name).toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.name.toLowerCase().includes(routeSearch.toLowerCase().replace(/\s+/g, "-"))
  );

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
                  {selectedRoute ? ` — ${fmtLocation(selectedRoute.name)}` : " — All"}
                </span>
              </strong>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {selectedRoute && (
                  <button className="ghost small" onClick={() => setSelectedRoute(null)}>Show All</button>
                )}
                <button className="btn small" aria-label="Add new encounter" onClick={onOpenAdd}>+ Add</button>
              </div>
            </div>
            <ul className="list" style={{ listStyle: "none", padding: 0, maxHeight: 280, overflowY: "auto" }}>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <strong>{enc.nickname || capitalize(enc.pokemon_name) || `#${enc.pokemon_id}`}</strong>
                        </div>
                        <div className="muted" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                          {enc.location && <span style={{ fontSize: 11 }}>{fmtLocation(enc.location)}</span>}
                          {enc.location && [enc.type1, enc.type2].some(Boolean) && <span style={{ color: "#3a4060" }}>·</span>}
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
                    <label htmlFor="area-input">Location</label>
                    <div className="search-wrap">
                      <input
                        id="area-input"
                        value={locInput}
                        onChange={(e) => { setLocInput(e.target.value); setLocOpen(true); }}
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
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const found = routes.find((r) => r.name === loc);
                                    setFormData({ ...formData, location: loc, location_id: found?.id || formData.location_id });
                                    setLocInput(fmtLocation(loc));
                                    setLocOpen(false);
                                  }}
                                >
                                  <strong>{fmtLocation(loc)}</strong>
                                </div>
                              ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="edit-nickname">Nickname</label>
                    <input
                      id="edit-nickname"
                      value={formData.nickname || ""}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      disabled={!formData.id}
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-level">Level</label>
                    <input
                      id="edit-level"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.level || ""}
                      onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || "" })}
                      disabled={!formData.id}
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-status">Status</label>
                    <select
                      id="edit-status"
                      value={formData.status || "caught"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      disabled={!formData.id}
                    >
                      <option value="caught">Caught</option>
                      <option value="fainted">Fainted</option>
                      <option value="fled">Fled</option>
                      <option value="missed">Missed</option>
                    </select>
                  </div>
                </div>

                <div className="row mt8">
                  <button type="submit" className="btn primary small" disabled={!formData.id}>
                    Save Changes
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
                    <div className="statRow"><span>Location</span><span>{formData.location ? fmtLocation(formData.location) : "—"}</span></div>
                    {formData.nature && <div className="statRow"><span>Nature</span><span>{capitalize(formData.nature)}</span></div>}
                    {formData.level && <div className="statRow"><span>Level</span><span>{formData.level}</span></div>}
                    {formData.ability_name && <div className="statRow"><span>Ability</span><span>{fmtAbility(formData.ability_name)}</span></div>}
                    <div className="statRow">
                      <span>Status</span>
                      <span className={`outcome-tag ${(formData.status || "unknown").toLowerCase()}`}>
                        {formData.status || "unknown"}
                      </span>
                    </div>
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
                <button className="ghost small" onClick={() => { setSelectedRoute(null); setRouteSearch(""); }}>Clear</button>
              )}
            </div>
            <input
              placeholder="Search routes…"
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <ul className="list" style={{ listStyle: "none", padding: 0, maxHeight: 230, overflowY: "auto" }}>
              {routes.length === 0 ? (
                <li className="listItem"><div className="muted">Loading…</div></li>
              ) : filteredRoutes.length === 0 ? (
                <li className="listItem"><div className="muted">No routes match.</div></li>
              ) : (
                filteredRoutes.map((r) => {
                  const summary = routeSummary(r.name);
                  return (
                    <li
                      key={r.id}
                      className={`listItem${selectedRoute?.id === r.id ? " active" : ""}`}
                      onClick={() => setSelectedRoute(selectedRoute?.id === r.id ? null : r)}
                      style={{ cursor: "pointer" }}
                    >
                      <span>{fmtLocation(r.name)}</span>
                      {summary ? (
                        <span style={{ fontSize: 11, whiteSpace: "nowrap", color: "#7a82a0" }}>
                          {summary.caught} caught · {summary.total} enc
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#3a4060" }}>no encounters</span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Pokemon on route */}
          <div className="panel" style={{ margin: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#c8cde0", marginBottom: 8 }}>
              {selectedRoute ? `Pokémon on ${fmtLocation(selectedRoute.name)}` : "Pokémon on Route"}
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
                      onChange={(e) => {
                        const lv = e.target.value;
                        setQaForm({ ...qaForm, level: lv });
                        if (qaMoveOptions.length > 0) {
                          const eligible = qaMoveOptions.filter((m) => m.level <= (parseInt(lv) || 1));
                          const last4 = eligible.slice(-4);
                          setQaMoves([
                            last4[0] ? { id: last4[0].move_id, name: last4[0].move_name } : null,
                            last4[1] ? { id: last4[1].move_id, name: last4[1].move_name } : null,
                            last4[2] ? { id: last4[2].move_id, name: last4[2].move_name } : null,
                            last4[3] ? { id: last4[3].move_id, name: last4[3].move_name } : null,
                          ]);
                        }
                      }}
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
                    <label htmlFor="qa-ability">Ability</label>
                    <select
                      id="qa-ability"
                      value={qaAbilityId || ""}
                      onChange={(e) => setQaAbilityId(Number(e.target.value) || null)}
                    >
                      <option value="">— None —</option>
                      {qaAbilityOptions.map((a) => (
                        <option key={a.id} value={a.id}>{fmtAbility(a.name)}</option>
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
                {qaMoveOptions.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: "#7a82a0", marginBottom: 4 }}>Starting Moves</div>
                    <div className="formGrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      {qaMoves.map((mv, i) => (
                        <div key={i}>
                          <label htmlFor={`qa-move-${i}`}>Move {i + 1}</label>
                          <select
                            id={`qa-move-${i}`}
                            value={mv?.id || ""}
                            onChange={(e) => {
                              const id = Number(e.target.value) || null;
                              const found = qaMoveOptions.find((m) => m.move_id === id);
                              const next = [...qaMoves];
                              next[i] = id ? { id, name: found?.move_name || "" } : null;
                              setQaMoves(next);
                            }}
                          >
                            <option value="">— None —</option>
                            {qaMoveOptions.map((m) => (
                              <option key={m.move_id} value={m.move_id}>{fmtAbility(m.move_name)}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
