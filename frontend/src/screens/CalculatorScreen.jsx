import { useState, useEffect } from "react";
import { API_BASE, BOSS_PRIORITY } from "../data/constants";
import {
  groupTrainersByRoute,
  formatTrainerRoute,
  formatSpeciesName,
  buildTrainerPokemonView,
  gen3CombatStat,
  calculateGen3Stat,
  applyNatureModifier,
  NATURES,
  capitalize,
} from "../utils/helpers";
import { calculateDamage } from "../utils/calc";

/* ── Type colour map (matches your existing CSS type chips) ── */
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

const STAT_KEYS = ["hp","atk","def","spa","spd","spe"];
const STAT_LABELS = { hp:"HP", atk:"Atk", def:"Def", spa:"SpA", spd:"SpD", spe:"Spe" };

// Returns up to 4 move names a Pokémon would know at `level` via level-up moves only.
// Mirrors in-game behaviour: last 4 moves learned at or before current level, most recent first.
function getAutoFillMoves(learnset, level) {
  if (!learnset?.length) return [];
  const eligible = learnset
    .filter(m => m.learn_method === "level-up" && Number(m.level) <= level)
    .sort((a, b) => Number(b.level) - Number(a.level));
  const seen = new Set();
  const result = [];
  for (const m of eligible) {
    if (!seen.has(m.move_id)) {
      seen.add(m.move_id);
      result.push(m.move_name || "");
    }
    if (result.length >= 4) break;
  }
  return result;
}

function TypeChip({ type }) {
  if (!type) return null;
  const t = type.toLowerCase();
  return (
    <span style={{
      display:"inline-block", fontSize:10, fontWeight:700,
      padding:"2px 7px", borderRadius:999, textTransform:"uppercase",
      letterSpacing:"0.05em",
      background: TYPE_BG[t] || "#2a2a2a44",
      color: TYPE_COLORS[t] || "#aaa",
      border:`1px solid ${(TYPE_COLORS[t]||"#aaa")}44`,
    }}>{t}</span>
  );
}

function MoveButton({ move, active, onClick, disabled }) {
  const type = move?.type?.toLowerCase();
  const meta = move ? [
    move.power ? `BP ${move.power}` : "—",
    move.accuracy ? `${move.accuracy}%` : "—",
  ].join(" · ") : null;
  return (
    <button
      onClick={onClick}
      disabled={disabled || !move}
      style={{
        padding:"8px 10px", borderRadius:8, border:"1px solid",
        borderColor: active ? (TYPE_COLORS[type]||"#3a58cc") : "#252c40",
        background: active ? (TYPE_BG[type]||"#1a2240") : "#0b0e14",
        color: active ? (TYPE_COLORS[type]||"#e4e6ef") : (move ? "#c8cde0" : "#3a3f52"),
        cursor: (disabled||!move) ? "default" : "pointer",
        fontSize:12, fontWeight: active ? 700 : 400,
        transition:"all 0.12s", textAlign:"left",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        gap:6, width:"100%", minHeight:36,
      }}
    >
      <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}>
        {move?.type && (
          <span style={{
            fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:999,
            textTransform:"uppercase", letterSpacing:"0.04em", flexShrink:0,
            background: TYPE_BG[type]||"#2a2a2a44",
            color: TYPE_COLORS[type]||"#aaa",
            border:`1px solid ${(TYPE_COLORS[type]||"#aaa")}44`,
          }}>{type}</span>
        )}
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {move ? move.name : "—"}
        </span>
      </div>
      {meta && (
        <span style={{fontSize:10, opacity:0.65, flexShrink:0, whiteSpace:"nowrap"}}>
          {meta}
        </span>
      )}
    </button>
  );
}

/* ── Move slot with edit icon + searchable learnset dropdown ── */
function MoveSlot({ move, active, onMoveClick, disabled, slotIdx, learnset, allMoves, onSwap }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");

  const toHyphenated = (s) => s.toLowerCase().replace(/[\s_]+/g, "-");
  const toDisplay = (s) => s.replace(/[-_]/g," ").toLowerCase()
    .replace(/\b\w/g, c=>c.toUpperCase());

  // Build sorted move list: learnset first, then rest of allMoves.
  // Deduplicate learnset by move_id, preferring level-up entries so the Lv. badge shows.
  const learnsetDeduped = new Map();
  for (const m of (learnset||[])) {
    const existing = learnsetDeduped.get(m.move_id);
    if (!existing || m.learn_method === "level-up") learnsetDeduped.set(m.move_id, m);
  }
  const learnsetIds = new Set(learnsetDeduped.keys());
  const learnsetMoves = [...learnsetDeduped.values()].map(m=>({
    id: m.move_id,
    name: toDisplay(m.move_name||""),
    type: m.type,
    power: m.power,
    accuracy: m.accuracy,
    pp: m.pp,
    learn_method: m.learn_method,
    level: m.level,
    inLearnset: true,
  }));
  const otherMoves = (allMoves||[])
    .filter(m=>!learnsetIds.has(m.id))
    .map(m=>({...m, name:toDisplay(m.name||""), inLearnset:false}));
  const combined = [...learnsetMoves, ...otherMoves];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? combined.filter(m=>(m.name||"").toLowerCase().includes(q))
    : combined;

  const handleSelect = (m) => {
    onSwap(slotIdx, {
      id: m.id,
      name: m.name,
      type: m.type,
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
    });
    setEditing(false);
    setQuery("");
  };

  return (
    <div style={{position:"relative"}}>
      <div style={{display:"flex",gap:4,alignItems:"stretch"}}>
        <div style={{flex:1}}>
          <MoveButton
            move={move}
            active={active}
            onClick={onMoveClick}
            disabled={disabled}
          />
        </div>
        {/* Edit icon */}
        <button
          onClick={()=>{ setEditing(e=>!e); setQuery(""); }}
          title="Change move"
          style={{
            padding:"0 7px", borderRadius:7, border:"1px solid #252c40",
            background: editing?"#1a2240":"transparent",
            color: editing?"#7a9ef0":"#3a3f52",
            cursor:"pointer", fontSize:13, flexShrink:0,
            transition:"all 0.12s",
          }}
        >✎</button>
      </div>

      {/* Dropdown */}
      {editing && (
        <>
          <div style={{position:"fixed",inset:0,zIndex:99}} onClick={()=>setEditing(false)}/>
          <div style={{
            position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:100,
            background:"#0e1120", border:"1px solid #252c40", borderRadius:10,
            boxShadow:"0 4px 24px #00000099", overflow:"hidden",
          }}>
            <div style={{padding:"6px 8px", borderBottom:"1px solid #1a2030"}}>
              <input
                autoFocus
                type="text"
                placeholder="Search moves…"
                value={query}
                onChange={e=>setQuery(e.target.value)}
                style={{fontSize:12, padding:"5px 8px"}}
                onClick={e=>e.stopPropagation()}
              />
            </div>
            <div style={{maxHeight:220, overflowY:"auto"}}>
              {filtered.length===0 && (
                <div style={{padding:"10px 12px",color:"#5a6380",fontSize:12,textAlign:"center"}}>
                  No moves found
                </div>
              )}
              {/* Learnset header */}
              {filtered.some(m=>m.inLearnset) && !q && (
                <div style={{padding:"4px 10px",fontSize:10,color:"#3a3f52",
                  textTransform:"uppercase",letterSpacing:"0.06em",background:"#0b0e14"}}>
                  Learnset
                </div>
              )}
              {filtered.map((m,i)=>{
                const t = (m.type||"").toLowerCase();
                const showDivider = !q && i>0 && !m.inLearnset && filtered[i-1]?.inLearnset;
                return (
                  <div key={m.id||i}>
                    {showDivider && (
                      <div style={{padding:"4px 10px",fontSize:10,color:"#3a3f52",
                        textTransform:"uppercase",letterSpacing:"0.06em",
                        background:"#0b0e14",borderTop:"1px solid #1a2030"}}>
                        All Moves
                      </div>
                    )}
                    <button
                      onClick={()=>handleSelect(m)}
                      style={{
                        display:"flex", width:"100%", textAlign:"left",
                        padding:"7px 10px", background:"transparent", border:"none",
                        borderBottom:"1px solid #1a2030", cursor:"pointer",
                        alignItems:"center", gap:8, transition:"background 0.1s",
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background="#181e2e"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <span style={{
                        fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:999,
                        textTransform:"uppercase",letterSpacing:"0.04em",flexShrink:0,
                        background:TYPE_BG[t]||"#2a2a2a44",
                        color:TYPE_COLORS[t]||"#aaa",
                        border:`1px solid ${(TYPE_COLORS[t]||"#aaa")}44`,
                      }}>{t||"?"}</span>
                      <span style={{flex:1,fontSize:12,color:"#c8cde0",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {m.name}
                      </span>
                      <span style={{fontSize:10,color:"#5a6380",flexShrink:0,whiteSpace:"nowrap"}}>
                        {m.power??"-"} / {m.accuracy??"-"}%
                        {m.inLearnset && m.learn_method==="level-up" && m.level
                          ? <span style={{color:"#3a5a8a",marginLeft:4}}>Lv.{m.level}</span>
                          : m.inLearnset
                            ? <span style={{color:"#3a5a3a",marginLeft:4}}>{m.learn_method}</span>
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

function StatRow({ label, base, iv, ev, battle }) {
  const display = battle ?? base ?? 0;
  const pct = Math.min(100, Math.round((display / (battle != null ? 400 : 255)) * 100));
  const color = display >= 120 ? "#4ade80" : display >= 70 ? "#ffd740" : "#f87171";
  return (
    <div style={{display:"grid",gridTemplateColumns:"28px 1fr 30px 22px 26px 32px",gap:4,alignItems:"center",fontSize:11}}>
      <span style={{color:"#5a6380",textAlign:"right"}}>{label}</span>
      <div style={{height:8,background:"#1a2030",borderRadius:999,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:999,transition:"width 0.3s"}}/>
      </div>
      <span style={{color:"#c0c4d8",textAlign:"right"}}>{base??"-"}</span>
      <span style={{color:"#5a6a8a",textAlign:"right"}}>{iv??"-"}</span>
      <span style={{color:"#4a6a4a",textAlign:"right"}}>{ev??"-"}</span>
      <span style={{color:"#e4e6ef",textAlign:"right",fontWeight:700}}>{battle??"-"}</span>
    </div>
  );
}

function PokemonSide({
  label, mon, moves, activeMoveIdx, onMoveClick,
  isAttacker, extraControls, spriteUrl,
  learnset, allMoves, onSwap, statData,
}) {
  return (
    <div style={{
      background:"#111520", border:"1px solid",
      borderColor: isAttacker ? "#2a3d8055" : "#3a1a1a55",
      borderRadius:14, padding:14, display:"flex", flexDirection:"column", gap:10,
    }}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
        <span style={{
          fontSize:10, fontWeight:700, textTransform:"uppercase",
          letterSpacing:"0.08em", padding:"2px 8px", borderRadius:999,
          background: isAttacker?"#1a2240":"#2a1010",
          color: isAttacker?"#7a9ef0":"#f87171",
          border:`1px solid ${isAttacker?"#3a58cc44":"#6b1a1a44"}`,
        }}>{label}</span>
        {mon && (
          <span style={{fontSize:12,color:"#5a6380",marginLeft:"auto"}}>
            {isAttacker?"Atk":"Def"}
          </span>
        )}
      </div>

      {/* Mon identity */}
      {mon ? (
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          {spriteUrl && (
            <img src={spriteUrl} alt={mon.name||mon.displayName}
              style={{width:56,height:56,imageRendering:"pixelated",
                borderRadius:8,background:"#0b0e14",
                border:"1px solid #1f2638",padding:4,flexShrink:0}}
            />
          )}
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
              <strong style={{fontSize:15,color:"#e4e6ef"}}>
                {mon.nickname || mon.name || mon.displayName}
              </strong>
              {(mon.name||mon.displayName) && mon.nickname && (
                <span style={{fontSize:11,color:"#5a6380"}}>
                  ({mon.name||mon.displayName})
                </span>
              )}
              <span style={{fontSize:11,color:"#7a82a0",marginLeft:"auto"}}>
                Lv.{mon.level}
              </span>
            </div>
            <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
              {(mon.types||[mon.type1,mon.type2]).filter(Boolean).map(t=>(
                <TypeChip key={t} type={t}/>
              ))}
            </div>
            {mon.nature && (
              <div style={{fontSize:11,color:"#5a6380",marginTop:3}}>
                {capitalize(mon.nature)} nature
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          border:"1px dashed #252c40",borderRadius:10,padding:20,
          textAlign:"center",color:"#3a3f52",fontSize:13,
        }}>No Pokémon selected</div>
      )}

      {/* Stats: Base / IV / EV / Stat */}
      {statData && (
        <div style={{display:"grid",gap:3}}>
          <div style={{display:"grid",gridTemplateColumns:"28px 1fr 30px 22px 26px 32px",gap:4,
            fontSize:9,color:"#3a3f52",textTransform:"uppercase",letterSpacing:"0.06em",
            paddingBottom:3,borderBottom:"1px solid #1a2030"}}>
            <span/><span/>
            <span style={{textAlign:"right"}}>Base</span>
            <span style={{textAlign:"right"}}>IV</span>
            <span style={{textAlign:"right"}}>EV</span>
            <span style={{textAlign:"right"}}>Stat</span>
          </div>
          {STAT_KEYS.map(k=>(
            <StatRow
              key={k}
              label={STAT_LABELS[k]}
              base={statData.base?.[STAT_LABELS[k]]}
              iv={statData.ivs?.[STAT_LABELS[k]]}
              ev={statData.evs?.[STAT_LABELS[k]]}
              battle={statData.battle?.[STAT_LABELS[k]]}
            />
          ))}
        </div>
      )}

      {/* Extra controls (nature, burn, etc.) */}
      {extraControls && <div>{extraControls}</div>}

      {/* Move buttons */}
      <div style={{borderTop:"1px solid #1a2030",paddingTop:10}}>
        <div style={{fontSize:11,color:"#5a6380",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>
          Moves
        </div>
        <div style={{display:"grid",gap:5}}>
          {[0,1,2,3].map(i=>(
            <MoveSlot
              key={i}
              slotIdx={i}
              move={moves[i]||null}
              active={activeMoveIdx===i}
              onMoveClick={()=>onMoveClick(i)}
              disabled={!mon}
              learnset={learnset}
              allMoves={allMoves}
              onSwap={onSwap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HpControl({ maxHp, currentHp, onChange }) {
  const pct = Math.round((currentHp / maxHp) * 100);
  const barColor = pct > 50 ? "#4ade80" : pct > 20 ? "#ffd740" : "#f87171";
  return (
    <div style={{display:"grid",gap:4}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
        <span style={{fontSize:11,color:"#5a6380",flexShrink:0}}>Current HP</span>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <input
            type="number"
            className="no-spinner"
            min={1}
            max={maxHp}
            value={currentHp}
            onChange={e => {
              const v = Math.max(1, Math.min(maxHp, Number(e.target.value) || 1));
              onChange(v);
            }}
            style={{width:48,fontSize:11,padding:"2px 6px",textAlign:"center",
              borderRadius:6,border:"1px solid #252c40",background:"#0b0e14",color:"#e4e6ef"}}
          />
          <span style={{fontSize:11,color:"#5a6380"}}>/ {maxHp} ({pct}%)</span>
        </div>
      </div>
      <div style={{height:5,background:"#1a2030",borderRadius:999,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:barColor,borderRadius:999,transition:"width 0.15s"}}/>
      </div>
    </div>
  );
}

function FieldEffects({
  weather, setWeather,
  crit, setCrit,
  reflect, setReflect,
  lightScreen, setLightScreen,
  helpingHand, setHelpingHand,
}) {
  function Toggle({ label, val, set, color="#ffd740" }) {
    return (
      <button onClick={() => set(v => !v)} style={{
        padding:"6px 8px", borderRadius:7, border:"1px solid",
        borderColor: val ? `${color}66` : "#1a2030",
        background: val ? "#1a2030" : "transparent",
        color: val ? color : "#7a82a0",
        fontSize:11, cursor:"pointer", textAlign:"left",
        display:"flex", alignItems:"center", gap:6, transition:"all 0.12s",
      }}>
        <span style={{
          width:12, height:12, borderRadius:3, flexShrink:0,
          background: val ? color : "transparent",
          border: `1px solid ${val ? color : "#3a3f52"}`,
          display:"inline-flex", alignItems:"center", justifyContent:"center",
          fontSize:9, color:"#000",
        }}>{val ? "✓" : ""}</span>
        {label}
      </button>
    );
  }

  return (
    <div style={{
      background:"#111520", border:"1px solid #1f2638",
      borderRadius:12, padding:12, display:"flex",
      flexDirection:"column", gap:10,
    }}>
      <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",
        letterSpacing:"0.08em",color:"#5a6380",textAlign:"center"}}>
        Field
      </div>

      {/* Weather — Sun/Rain affect Fire/Water power; Sand boosts Rock SpD */}
      <div style={{display:"grid",gap:4}}>
        <span style={{fontSize:11,color:"#5a6380"}}>Weather</span>
        {[
          {val:"",    icon:"○", label:"None"},
          {val:"sun", icon:"☀", label:"Sun"},
          {val:"rain",icon:"☂", label:"Rain"},
          {val:"sand",icon:"🌪",label:"Sandstorm"},
          {val:"hail",icon:"❄", label:"Hail"},
        ].map(({val,icon,label}) => (
          <button key={val} onClick={() => setWeather(val)} style={{
            padding:"6px 8px", borderRadius:7, border:"1px solid",
            borderColor: weather===val ? "#3a58cc66" : "#1a2030",
            background: weather===val ? "#1a2240" : "transparent",
            color: weather===val ? "#e4e6ef" : "#7a82a0",
            fontSize:11, cursor:"pointer", textAlign:"left",
            display:"flex", alignItems:"center", gap:6, transition:"all 0.12s",
          }}>
            <span style={{fontSize:14}}>{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* Screens on the defender's side — halved by crits */}
      <div style={{display:"grid",gap:4}}>
        <span style={{fontSize:11,color:"#5a6380"}}>Screens (defender)</span>
        <Toggle label="Reflect"      val={reflect}     set={setReflect}     color="#7a9ef0" />
        <Toggle label="Light Screen" val={lightScreen} set={setLightScreen} color="#7a9ef0" />
      </div>

      {/* Other conditions */}
      <div style={{display:"grid",gap:4}}>
        <span style={{fontSize:11,color:"#5a6380"}}>Conditions</span>
        <Toggle label="Crit hit"           val={crit}        set={setCrit}        color="#ffd740" />
        <Toggle label="Helping Hand (atk)" val={helpingHand} set={setHelpingHand} color="#4ade80" />
      </div>
    </div>
  );
}

function DamageResult({ damageResult, defenderHp, maxHp, moveName, moveType }) {
  if (!damageResult) return (
    <div style={{
      background:"#0e1120",border:"1px solid #1a2030",borderRadius:12,
      padding:20,textAlign:"center",color:"#3a3f52",fontSize:13,
    }}>
      Select Pokémon and click a move
    </div>
  );

  const { min, max, rolls = [] } = damageResult;
  const typeColor = TYPE_COLORS[moveType?.toLowerCase()] || "#7a9ef0";
  const hp = defenderHp || null;
  const hpBase = maxHp || hp;
  const minPct = hpBase ? (min / hpBase * 100) : null;
  const maxPct = hpBase ? (max / hpBase * 100) : null;

  const ohkoCount = hp ? rolls.filter(r => r >= hp).length : 0;
  const ohkoPct   = ohkoCount / 16 * 100;

  let twoHkoCount = 0;
  if (hp && ohkoPct < 100) {
    for (const r1 of rolls) for (const r2 of rolls) if (r1 + r2 >= hp) twoHkoCount++;
  }
  const twoHkoPct = twoHkoCount / 256 * 100;

  let threeHkoCount = 0;
  if (hp && twoHkoPct < 100 && ohkoPct < 100) {
    for (const r1 of rolls) for (const r2 of rolls) for (const r3 of rolls)
      if (r1 + r2 + r3 >= hp) threeHkoCount++;
  }
  const threeHkoPct = threeHkoCount / 4096 * 100;

  const guarHits = hp && min > 0 ? Math.ceil(hp / min) : null;

  return (
    <div style={{
      background:"#111520",border:"1px solid #1f2638",borderRadius:12,padding:14,
      display:"flex",flexDirection:"column",gap:10,
    }}>
      {/* Move label */}
      {moveName && (
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <TypeChip type={moveType}/>
          <span style={{fontSize:12,color:"#c8cde0",fontWeight:600}}>{moveName}</span>
        </div>
      )}

      {/* Main result line */}
      <div style={{
        background:"#0b0e14",borderRadius:10,padding:"12px 14px",
        borderLeft:`3px solid ${typeColor}`,
      }}>
        <div style={{fontSize:22,fontWeight:700,color:"#e4e6ef",fontVariantNumeric:"tabular-nums"}}>
          {min} – {max}
        </div>
        {minPct != null && (
          <div style={{fontSize:13,color:"#7a82a0",marginTop:2}}>
            {minPct.toFixed(1)}% – {maxPct.toFixed(1)}% of max HP
          </div>
        )}
      </div>

      {hp && (
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
            <span style={{color:"#5a6380"}}>OHKO</span>
            <span style={{fontWeight:700,fontVariantNumeric:"tabular-nums",
              color: ohkoPct===100?"#f87171": ohkoPct>0?"#ffd740":"#3a3f52"}}>
              {ohkoPct===100?"Guaranteed": ohkoPct>0?`${ohkoCount}/16 (${ohkoPct.toFixed(1)}%)`:"No"}
            </span>
          </div>
          {ohkoPct < 100 && (
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
              <span style={{color:"#5a6380"}}>2HKO</span>
              <span style={{fontWeight:700,fontVariantNumeric:"tabular-nums",
                color: twoHkoPct===100?"#ffd740": twoHkoPct>0?"#c8cde0":"#3a3f52"}}>
                {twoHkoPct===100?"Guaranteed": twoHkoPct>0?`${twoHkoPct.toFixed(1)}%`:"No"}
              </span>
            </div>
          )}
          {ohkoPct < 100 && twoHkoPct < 100 && (
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
              <span style={{color:"#5a6380"}}>3HKO</span>
              <span style={{fontWeight:700,fontVariantNumeric:"tabular-nums",
                color: threeHkoPct===100?"#4ade80": threeHkoPct>0?"#c8cde0":"#3a3f52"}}>
                {threeHkoPct===100?"Guaranteed": threeHkoPct>0?`${threeHkoPct.toFixed(1)}%`:"No"}
              </span>
            </div>
          )}
          {guarHits && guarHits > 1 && (
            <div style={{fontSize:11,color:"#5a6380",borderTop:"1px solid #1a2030",paddingTop:4,marginTop:2}}>
              Guaranteed KO in {guarHits} hits (min roll)
            </div>
          )}
        </div>
      )}

      {rolls.length > 0 && (
        <div>
          <div style={{fontSize:11,color:"#5a6380",textTransform:"uppercase",
            letterSpacing:"0.06em",marginBottom:5}}>
            Damage rolls (16)
          </div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
            {rolls.map((r,i) => {
              const isKo = hp && r >= hp;
              return (
                <span key={i} style={{
                  fontSize:11,padding:"2px 6px",borderRadius:5,
                  background: isKo?"#0d2a1a": r===min?"#2a1010":"#0b0e14",
                  color: isKo?"#4ade80": r===min?"#f87171":"#7a82a0",
                  border:`1px solid ${isKo?"#1a5235": r===min?"#5a1a1a":"#1a2030"}`,
                  fontVariantNumeric:"tabular-nums",
                }}>{r}</span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalculatorScreen({
  onNavigate,
  encounters = [],
  party = [],
  pcBox = [],
  onRefreshEncounters,
  visible = false,
}) {
  /* ── State ── */
  const [defMode, setDefMode] = useState("lookup");
  const [trainerRows, setTrainerRows] = useState([]);
  const [pokemonIndex, setPokemonIndex] = useState({});
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [selectedPokemonIndex, setSelectedPokemonIndex] = useState("");
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [preview, setPreview] = useState(null);

  const [moves, setMoves] = useState([]);
  const [attackerPartyMonId, setAttackerPartyMonId] = useState("");
  const [defenderId, setDefenderId] = useState("");
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [damageResult, setDamageResult] = useState(null);
  const [crit, setCrit] = useState(false);
  const [burned, setBurned] = useState(false);
  const [weather, setWeather] = useState("");
  const [reflect, setReflect] = useState(false);
  const [lightScreen, setLightScreen] = useState(false);
  const [helpingHand, setHelpingHand] = useState(false);
  const [lookupDefender, setLookupDefender] = useState(null);
  const [defenderHp, setDefenderHp] = useState(null);
  const [myCurrentHp, setMyCurrentHp] = useState(null);   // null = use max
  const [enemyCurrentHp, setEnemyCurrentHp] = useState(null);
  const [atkNature, setAtkNature] = useState("hardy");
  const [defNature, setDefNature] = useState("hardy");
  const [enemyBurned, setEnemyBurned] = useState(false);

  /* Which side is attacking + which move slot is selected */
  const [attackerSide, setAttackerSide] = useState("my"); // "my" | "enemy"
  const [myActiveMoveIdx, setMyActiveMoveIdx] = useState(null);
  const [enemyActiveMoveIdx, setEnemyActiveMoveIdx] = useState(null);

  /* Temp move overrides (for testing without saving) */
  const [myMoveOverrides, setMyMoveOverrides] = useState({});
  const [enemyMoveOverrides, setEnemyMoveOverrides] = useState({});

  /* ── Trainer search ── */
  const [trainerQuery, setTrainerQuery] = useState("");
  const [trainerSearchOpen, setTrainerSearchOpen] = useState(false);

  /* ── Active sprite strip selection ── */
  const [myStripMonId, setMyStripMonId] = useState(null);   // id from party/pcBox
  const [enemyStripIdx, setEnemyStripIdx] = useState(null); // index into selectedTeam

  /* ── Learnsets ── */
  const [myLearnset, setMyLearnset] = useState([]);
  const [enemyLearnset, setEnemyLearnset] = useState([]);

  /* ── Data loading ── */
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/moves?orderBy=power`);
        if (!res.ok) throw new Error("Failed to load moves");
        const data = await res.json();
        if (!cancelled)
          setMoves(data);
      } catch { if (!cancelled) setMoves([]); }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  /* Fetch my mon's learnset when active mon changes */
  useEffect(() => {
    const mon = [...party, ...pcBox].find(m=>String(m.id)===(myStripMonId||attackerPartyMonId));
    const pokemonId = mon?.pokemonId;
    if (!pokemonId) { setMyLearnset([]); return; }
    let cancelled = false;
    (async()=>{
      try {
        const res = await fetch(`${API_BASE}/api/pokemon/${pokemonId}/moves`);
        if(!res.ok) throw new Error();
        const data = await res.json();
        if(!cancelled) setMyLearnset(Array.isArray(data)?data:[]);
      } catch { if(!cancelled) setMyLearnset([]); }
    })();
    return ()=>{cancelled=true;};
  }, [myStripMonId, attackerPartyMonId, party]);

  /* Fetch enemy mon's learnset — only raw state, no derived consts */
  useEffect(() => {
    let pokemonId = null;
    if (enemyStripIdx !== null) {
      // Derive team from raw state: trainerRows + selectedTrainerId
      const trainer = trainerRows.find(t => t.id === selectedTrainerId) || null;
      const team = Array.isArray(trainer?.pokemon) ? trainer.pokemon : [];
      const p = team[enemyStripIdx] || null;
      if (p) {
        const baseData = pokemonIndex[String(p.species||"").toLowerCase()] || null;
        pokemonId = baseData?.id ?? null;
      }
    } else if (lookupDefender?.basePokemon?.id) {
      pokemonId = lookupDefender.basePokemon.id;
    } else if (defenderId) {
      const enc = encounters.find(e=>String(e.id)===String(defenderId));
      pokemonId = enc?.pokemon_id ?? null;
    }
    if (!pokemonId) { setEnemyLearnset([]); return; }
    let cancelled = false;
    (async()=>{
      try {
        const res = await fetch(`${API_BASE}/api/pokemon/${pokemonId}/moves`);
        if(!res.ok) throw new Error();
        const data = await res.json();
        if(!cancelled) setEnemyLearnset(Array.isArray(data)?data:[]);
      } catch { if(!cancelled) setEnemyLearnset([]); }
    })();
    return ()=>{cancelled=true;};
  }, [enemyStripIdx, selectedTrainerId, trainerRows, pokemonIndex, lookupDefender, defenderId, encounters]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    async function load() {
      setLookupLoading(true);
      setLookupError("");
      try {
        const [trainerRes, pokemonRes] = await Promise.all([
          fetch(`${API_BASE}/api/trainers`),
          fetch(`${API_BASE}/api/pokemon`),
        ]);
        if (!trainerRes.ok) throw new Error("Failed to load trainer data.");
        if (!pokemonRes.ok) throw new Error("Failed to load Pokémon data.");
        const [trainerData, pokemonData] = await Promise.all([
          trainerRes.json(), pokemonRes.json(),
        ]);
        if (cancelled) return;
        const index = {};
        for (const p of Array.isArray(pokemonData)?pokemonData:[])
          index[String(p.name||"").toLowerCase()] = p;
        const rows = Array.isArray(trainerData)?trainerData:[];
        setPokemonIndex(index);
        setTrainerRows(rows);
        const sortedBosses = rows
          .filter(r => BOSS_PRIORITY.includes(r.id))
          .sort((a, b) => BOSS_PRIORITY.indexOf(a.id) - BOSS_PRIORITY.indexOf(b.id));
        const defaultTrainer = sortedBosses[0] || rows[0];
        if (defaultTrainer) {
          setSelectedRoute(formatTrainerRoute(defaultTrainer) || "");
          setSelectedTrainerId(defaultTrainer.id || "");
          setTrainerQuery(`${defaultTrainer.name}${defaultTrainer.party ? ` (${defaultTrainer.party})` : ""}`);
        }
      } catch (err) {
        if (!cancelled) {
          setLookupError(err.message||"Failed to load trainer lookup data.");
          setTrainerRows([]); setPokemonIndex({});
          setSelectedRoute(""); setSelectedTrainerId("");
          setSelectedPokemonIndex(""); setPreview(null);
        }
      } finally { if (!cancelled) setLookupLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [visible]);

  /* Auto-select first enemy Pokemon when the active trainer changes */
  useEffect(() => {
    if (!selectedTrainerId) { setEnemyStripIdx(null); return; }
    setEnemyStripIdx(0);
    setEnemyMoveOverrides({});
    setEnemyCurrentHp(null);
  }, [selectedTrainerId]);

  /* Reset current HP when the active mon changes */
  useEffect(() => { setMyCurrentHp(null); }, [myStripMonId, attackerPartyMonId]);
  useEffect(() => { setEnemyCurrentHp(null); }, [enemyStripIdx]);

  /* ── Derived data ── */
  const groupedTrainers = groupTrainersByRoute(trainerRows);
  const routeEntries = Object.entries(groupedTrainers).sort(([a],[b])=>a.localeCompare(b));
  const trainerEntries = selectedRoute&&groupedTrainers[selectedRoute]
    ? groupedTrainers[selectedRoute] : [];
  const selectedTrainer = trainerEntries.find(t=>t.id===selectedTrainerId)||trainerEntries[0]||null;
  const selectedTeam = Array.isArray(selectedTrainer?.pokemon)?selectedTrainer.pokemon:[];

  /* Trainer search results — matches on name OR route/location */
  const trainerSearchResults = (() => {
    const q = trainerQuery.trim().toLowerCase();
    if (!q) return [];
    return trainerRows.filter(t => {
      const name = (t.name||"").toLowerCase();
      const route = formatTrainerRoute(t).toLowerCase();
      const party = (t.party||"").toLowerCase();
      return name.includes(q) || route.includes(q) || party.includes(q);
    }).slice(0, 20);
  })();

  /* Active mon on my side — strip selection overrides top-bar dropdown */
  const activeMyMonId = myStripMonId || attackerPartyMonId;
  const atkMon = [...party, ...pcBox].find(m=>String(m.id)===activeMyMonId) || null;

  const myStatData = atkMon ? {
    base: { HP: atkMon.stats?.hp, Atk: atkMon.stats?.atk, Def: atkMon.stats?.def, SpA: atkMon.stats?.spa, SpD: atkMon.stats?.spd, Spe: atkMon.stats?.spe },
    ivs:  { HP: atkMon.ivs?.hp??31, Atk: atkMon.ivs?.atk??31, Def: atkMon.ivs?.def??31, SpA: atkMon.ivs?.spa??31, SpD: atkMon.ivs?.spd??31, Spe: atkMon.ivs?.spe??31 },
    evs:  { HP: atkMon.evs?.hp??0,  Atk: atkMon.evs?.atk??0,  Def: atkMon.evs?.def??0,  SpA: atkMon.evs?.spa??0,  SpD: atkMon.evs?.spd??0,  Spe: atkMon.evs?.spe??0  },
    battle: {
      HP:  Math.floor(((2*(atkMon.stats?.hp||0)+(atkMon.ivs?.hp??31)+Math.floor((atkMon.evs?.hp??0)/4))*atkMon.level)/100)+atkMon.level+10,
      Atk: applyNatureModifier(gen3CombatStat(atkMon.stats?.atk, atkMon.ivs?.atk??31, atkMon.evs?.atk??0, atkMon.level), "atk", atkNature),
      Def: applyNatureModifier(gen3CombatStat(atkMon.stats?.def, atkMon.ivs?.def??31, atkMon.evs?.def??0, atkMon.level), "def", atkNature),
      SpA: applyNatureModifier(gen3CombatStat(atkMon.stats?.spa, atkMon.ivs?.spa??31, atkMon.evs?.spa??0, atkMon.level), "spa", atkNature),
      SpD: applyNatureModifier(gen3CombatStat(atkMon.stats?.spd, atkMon.ivs?.spd??31, atkMon.evs?.spd??0, atkMon.level), "spd", atkNature),
      Spe: applyNatureModifier(gen3CombatStat(atkMon.stats?.spe, atkMon.ivs?.spe??31, atkMon.evs?.spe??0, atkMon.level), "spe", atkNature),
    },
  } : null;

  /* Build display objects for enemy side —
     Priority: strip selection from trainer > lookupDefender > encounter dropdown */
  const stripMon = enemyStripIdx !== null && selectedTeam[enemyStripIdx]
    ? selectedTeam[enemyStripIdx] : null;

  const buildFromStripMon = (p) => {
    if (!p) return null;
    const baseData = pokemonIndex[String(p.species||"").toLowerCase()] || null;
    const lv = Number(p.level)||50;
    const rawIv = p.iv != null ? Number(p.iv) : 255;
    const actualIv = Math.floor(rawIv / 10);
    const actualEv = actualIv;
    const baseStats = baseData ? {
      HP: baseData.hp, Atk: baseData.attack, Def: baseData.defense,
      SpA: baseData.sp_attack, SpD: baseData.sp_defense, Spe: baseData.speed,
    } : null;
    const ivs = { HP: actualIv, Atk: actualIv, Def: actualIv, SpA: actualIv, SpD: actualIv, Spe: actualIv };
    const evs = { HP: actualEv, Atk: actualEv, Def: actualEv, SpA: actualEv, SpD: actualEv, Spe: actualEv };
    const battleStats = baseData ? {
      HP:  calculateGen3Stat(baseData.hp,         actualIv, actualEv, lv, true),
      Atk: calculateGen3Stat(baseData.attack,     actualIv, actualEv, lv, false),
      Def: calculateGen3Stat(baseData.defense,    actualIv, actualEv, lv, false),
      SpA: calculateGen3Stat(baseData.sp_attack,  actualIv, actualEv, lv, false),
      SpD: calculateGen3Stat(baseData.sp_defense, actualIv, actualEv, lv, false),
      Spe: calculateGen3Stat(baseData.speed,      actualIv, actualEv, lv, false),
    } : {};
    const monMoves = Array.isArray(p.moves) && p.moves.length
      ? p.moves.filter(Boolean)
      : [p.move1,p.move2,p.move3,p.move4].filter(Boolean);
    const displayName = (p.species||"Unknown").replace(/[-_]/g," ").toLowerCase()
      .replace(/\b\w/g,c=>c.toUpperCase());
    return {
      displayName, name: displayName, level: lv,
      types:[baseData?.type1,baseData?.type2].filter(Boolean),
      baseStats, ivs, evs, battleStats, moves: monMoves,
      basePokemon: baseData||{},
      pokemonId: baseData?.id||null,
    };
  };

  const enemyDisplayMon = stripMon
    ? buildFromStripMon(stripMon)
    : lookupDefender
      ? {
          displayName: lookupDefender.displayName,
          name: lookupDefender.displayName,
          level: lookupDefender.level,
          types: [lookupDefender.basePokemon?.type1, lookupDefender.basePokemon?.type2].filter(Boolean),
          baseStats: lookupDefender.baseStats||null,
          ivs: lookupDefender.ivs||null,
          evs: lookupDefender.evs||null,
          battleStats: lookupDefender.battleStats,
          moves: lookupDefender.moves||[],
          basePokemon: lookupDefender.basePokemon||{},
          pokemonId: lookupDefender.basePokemon?.id||null,
        }
      : defenderId
        ? (() => {
            const enc = encounters.find(e=>String(e.id)===String(defenderId));
            return enc ? {
              name: enc.pokemon_name, nickname: enc.nickname,
              level: enc.level,
              types: [enc.type1,enc.type2].filter(Boolean),
              moves: Array.isArray(enc.moves)&&enc.moves.length ? enc.moves.filter(Boolean) : [enc.move1,enc.move2,enc.move3,enc.move4].filter(Boolean),
              pokemonId: enc.pokemon_id,
              baseStats: null,
              ivs: { HP: enc.hp_iv??31, Atk: enc.attack_iv??31, Def: enc.defense_iv??31, SpA: enc.sp_attack_iv??31, SpD: enc.sp_defense_iv??31, Spe: enc.speed_iv??31 },
              evs: { HP: enc.hp_ev??0,  Atk: enc.attack_ev??0,  Def: enc.defense_ev??0,  SpA: enc.sp_attack_ev??0,  SpD: enc.sp_defense_ev??0,  Spe: enc.speed_ev??0  },
              battleStats: null,
            } : null;
          })()
        : null;

  const enemyStatData = enemyDisplayMon ? {
    base:   enemyDisplayMon.baseStats || null,
    ivs:    enemyDisplayMon.ivs || null,
    evs:    enemyDisplayMon.evs || null,
    battle: enemyDisplayMon.battleStats ? {
      HP:  enemyDisplayMon.battleStats.HP,
      Atk: applyNatureModifier(enemyDisplayMon.battleStats.Atk||0, "atk", defNature),
      Def: applyNatureModifier(enemyDisplayMon.battleStats.Def||0, "def", defNature),
      SpA: applyNatureModifier(enemyDisplayMon.battleStats.SpA||0, "spa", defNature),
      SpD: applyNatureModifier(enemyDisplayMon.battleStats.SpD||0, "spd", defNature),
      Spe: applyNatureModifier(enemyDisplayMon.battleStats.Spe||0, "spe", defNature),
    } : null,
  } : null;

  /* defMon for calc: strip selection wins, then lookupDefender, then encounter */
  const defMon = stripMon
    ? enemyDisplayMon
    : defenderId
      ? encounters.find(e=>String(e.id)===String(defenderId))||null
      : lookupDefender||null;

  /* Build move lists */
  const toHyphenated = (s) => s.toLowerCase().replace(/[\s_]+/g, "-");
  const toDisplayName = (s) => s.replace(/[-_]/g, " ").toLowerCase().replace(/\b\w/g, c=>c.toUpperCase());

  // Look up a move by name: check full moves list first, then learnsets as fallback
  const getMoveObjByName = (name, learnsetHint) => {
    if (!name) return null;
    const key = toHyphenated(name);
    // 1. Try full moves list (has accuracy, PP, etc.)
    const found = moves.find(m => toHyphenated(m.name) === key);
    if (found) return { ...found, name: toDisplayName(found.name) };
    // 2. Try learnset hint (available before full move list loads)
    if (learnsetHint) {
      const fromLearnset = learnsetHint.find(m => toHyphenated(m.move_name||"") === key);
      if (fromLearnset) return {
        id: fromLearnset.move_id,
        name: toDisplayName(fromLearnset.move_name||name),
        type: fromLearnset.type,
        power: fromLearnset.power,
        accuracy: fromLearnset.accuracy,
        pp: fromLearnset.pp,
      };
    }
    // 3. Stub — at least show the name correctly formatted
    return { name: toDisplayName(name), type: null, power: null, accuracy: null };
  };

  const myMoves = [0,1,2,3].map(i=> {
    if (myMoveOverrides[i]) return myMoveOverrides[i];
    const name = atkMon?.moves?.[i];
    return getMoveObjByName(name, myLearnset);
  });

  const enemyMoveList = (() => {
    const fromMon     = enemyDisplayMon?.moves?.length ? enemyDisplayMon.moves : null;
    const fromPreview = preview?.moves?.length         ? preview.moves         : null;
    const fromDefMon  = defMon
      ? [defMon.move1, defMon.move2, defMon.move3, defMon.move4].filter(Boolean)
      : [];
    const explicit = fromMon || fromPreview || (fromDefMon.length ? fromDefMon : null);
    if (explicit) return explicit;
    return getAutoFillMoves(enemyLearnset, enemyDisplayMon?.level ?? preview?.level ?? 50);
  })();
  const enemyMoves = [0,1,2,3].map(i=>{
    if (enemyMoveOverrides[i]) return enemyMoveOverrides[i];
    const name = Array.isArray(enemyMoveList)?enemyMoveList[i]:null;
    return getMoveObjByName(name, enemyLearnset);
  });

  /* Active move */
  const activeMoveObj = attackerSide==="my"
    ? (myActiveMoveIdx!==null ? myMoves[myActiveMoveIdx] : null)
    : (enemyActiveMoveIdx!==null ? enemyMoves[enemyActiveMoveIdx] : null);

  /* ── Handlers ── */
  const handleMyMoveClick = (idx) => {
    setAttackerSide("my");
    setMyActiveMoveIdx(idx);
    setEnemyActiveMoveIdx(null);
  };

  const handleEnemyMoveClick = (idx) => {
    setAttackerSide("enemy");
    setEnemyActiveMoveIdx(idx);
    setMyActiveMoveIdx(null);
  };

  const handlePokeChange = (idx) => {
    setSelectedPokemonIndex(idx);
    const sel = idx!==""?selectedTeam[Number(idx)]||null:null;
    setPreview(sel?buildTrainerPokemonView(sel,pokemonIndex):null);
  };

  const handleRouteChange = (routeLabel) => {
    setSelectedRoute(routeLabel);
    const first = groupedTrainers[routeLabel]?.[0]||null;
    setSelectedTrainerId(first?.id||"");
    setSelectedPokemonIndex(""); setPreview(null);
  };

  const handleTrainerChange = (trainerId) => {
    setSelectedTrainerId(trainerId);
    setSelectedPokemonIndex(""); setPreview(null);
  };

  const handleAddLookupAsDefender = () => {
    if (!preview) return;
    setLookupDefender(preview);
    setDefenderId("");
  };

  /* ── Calculate ── */
  useEffect(() => {
    if (!activeMoveObj?.power) { setDamageResult(null); return; }
    if (attackerSide === "my" && !atkMon) return;
    runCalc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    myActiveMoveIdx, enemyActiveMoveIdx, attackerSide,
    myMoveOverrides, enemyMoveOverrides,
    crit, burned, enemyBurned, weather, atkNature, defNature,
    attackerPartyMonId, myStripMonId, defenderId, lookupDefender, enemyStripIdx,
  ]);

  const runCalc = async () => {
    setCalcError(null);
    setDamageResult(null);
    if (!activeMoveObj) return;
    const moveRow = activeMoveObj;
    if (!moveRow?.power) { setCalcError("Move has no base power."); return; }

    setCalcLoading(true);
    try {
      let attackerData, defenderData;

      if (attackerSide==="my") {
        if (!atkMon) { setCalcError("Select a party Pokémon."); setCalcLoading(false); return; }
        const atkStat = gen3CombatStat(atkMon.stats.atk, atkMon.ivs?.atk??31, atkMon.evs?.atk??0, atkMon.level);
        const spaStat = gen3CombatStat(atkMon.stats.spa, atkMon.ivs?.spa??31, atkMon.evs?.spa??0, atkMon.level);
        attackerData = {
          level:atkMon.level,
          attack: applyNatureModifier(atkStat,"atk",atkNature),
          sp_attack: applyNatureModifier(spaStat,"spa",atkNature),
          type1:(atkMon.types||[])[0]||null,
          type2:(atkMon.types||[])[1]||null,
          item:atkMon.item||null, atkStage:0, spAtkStage:0,
        };

        if (!defMon) { setCalcError("Select a defender."); setCalcLoading(false); return; }
        let defStat, spdStat, hpStat, type1, type2;
        if (stripMon) {
          // Strip mon: battleStats are pre-nature; apply defNature here before passing to calculateDamage
          defStat = applyNatureModifier(defMon.battleStats?.Def, "def", defNature);
          spdStat = applyNatureModifier(defMon.battleStats?.SpD, "spd", defNature);
          hpStat  = defMon.battleStats?.HP ?? null;
          type1   = defMon.types?.[0] || defMon.basePokemon?.type1 || "normal";
          type2   = defMon.types?.[1] || defMon.basePokemon?.type2 || null;
        } else if (defenderId) {
          const enc = encounters.find(e=>String(e.id)===String(defenderId));
          if (!enc||enc.pokemon_id==null) { setCalcError("Defender not found."); setCalcLoading(false); return; }
          const pres = await fetch(`${API_BASE}/api/pokemon/${enc.pokemon_id}`);
          if (!pres.ok) { setCalcError("Could not load defender species."); setCalcLoading(false); return; }
          const p = await pres.json();
          const lv = Number(enc.level);
          defStat = gen3CombatStat(p.defense, enc.defense_iv, enc.defense_ev, lv);
          spdStat = gen3CombatStat(p.sp_defense, enc.sp_defense_iv, enc.sp_defense_ev, lv);
          hpStat = Math.floor(((2*(Number(p.hp)||0)+(enc.hp_iv??31)+Math.floor((enc.hp_ev??0)/4))*lv)/100)+lv+10;
          type1=p.type1; type2=p.type2;
        } else if (lookupDefender) {
          defStat = applyNatureModifier(lookupDefender.battleStats?.Def, "def", defNature);
          spdStat = applyNatureModifier(lookupDefender.battleStats?.SpD, "spd", defNature);
          hpStat=lookupDefender.battleStats?.HP??null;
          type1=lookupDefender.basePokemon?.type1||"normal";
          type2=lookupDefender.basePokemon?.type2||null;
        } else {
          setCalcError("No defender stats available."); setCalcLoading(false); return;
        }
        defenderData = { defense:defStat, sp_defense:spdStat, type1, type2, defStage:0, spDefStage:0 };
        setDefenderHp(hpStat??null);
      } else {
        // enemy attacking my mon
        if (!defMon) { setCalcError("Select an enemy Pokémon."); setCalcLoading(false); return; }
        if (!atkMon) { setCalcError("Select a party Pokémon to defend."); setCalcLoading(false); return; }

        // enemy as attacker
        let enemyAtk, enemySpa, enemyType1, enemyType2, enemyLevel;
        if (stripMon) {
          enemyAtk   = defMon.battleStats?.Atk || 0;
          enemySpa   = defMon.battleStats?.SpA || 0;
          enemyType1 = defMon.types?.[0] || defMon.basePokemon?.type1 || "normal";
          enemyType2 = defMon.types?.[1] || defMon.basePokemon?.type2 || null;
          enemyLevel = defMon.level || 50;
        } else if (lookupDefender) {
          enemyAtk = lookupDefender.battleStats?.Atk||0;
          enemySpa = lookupDefender.battleStats?.SpA||0;
          enemyType1 = lookupDefender.basePokemon?.type1||"normal";
          enemyType2 = lookupDefender.basePokemon?.type2||null;
          enemyLevel = lookupDefender.level||50;
        } else if (defenderId) {
          const enc = encounters.find(e=>String(e.id)===String(defenderId));
          if (!enc||enc.pokemon_id==null) { setCalcError("Enemy not found."); setCalcLoading(false); return; }
          const pres = await fetch(`${API_BASE}/api/pokemon/${enc.pokemon_id}`);
          if (!pres.ok) { setCalcError("Could not load enemy species."); setCalcLoading(false); return; }
          const p = await pres.json();
          const lv = Number(enc.level);
          enemyAtk = gen3CombatStat(p.attack, enc.attack_iv, enc.attack_ev, lv);
          enemySpa = gen3CombatStat(p.sp_attack, enc.sp_attack_iv, enc.sp_attack_ev, lv);
          enemyType1=p.type1; enemyType2=p.type2; enemyLevel=lv;
        }
        attackerData = {
          level:enemyLevel,
          attack: applyNatureModifier(enemyAtk, "atk", defNature),
          sp_attack: applyNatureModifier(enemySpa, "spa", defNature),
          type1:enemyType1, type2:enemyType2, item:null, atkStage:0, spAtkStage:0,
        };

        // my mon as defender
        const defStatVal = applyNatureModifier(
          gen3CombatStat(atkMon.stats.def, atkMon.ivs?.def??31, atkMon.evs?.def??0, atkMon.level),
          "def", atkNature,
        );
        const spdStatVal = applyNatureModifier(
          gen3CombatStat(atkMon.stats.spd, atkMon.ivs?.spd??31, atkMon.evs?.spd??0, atkMon.level),
          "spd", atkNature,
        );
        const hpVal = Math.floor(((2*(atkMon.stats.hp||0)+(atkMon.ivs?.hp??31)+Math.floor((atkMon.evs?.hp??0)/4))*atkMon.level)/100)+atkMon.level+10;
        defenderData = {
          defense:defStatVal, sp_defense:spdStatVal,
          type1:(atkMon.types||[])[0]||null,
          type2:(atkMon.types||[])[1]||null,
          defStage:0, spDefStage:0,
        };
        setDefenderHp(hpVal);
      }

      const activeBurned = attackerSide==="my" ? burned : enemyBurned;
      const moveName = (moveRow.name || "").toLowerCase().replace(/[\s_-]/g, "");
      const explosion = moveName === "explosion" || moveName === "selfdestruct";
      const conditions = { isCrit:crit, isBurned:activeBurned, weather:weather||"", reflect, lightScreen, helpingHand, explosion };
      const out = calculateDamage(attackerData, defenderData,
        { type:moveRow.type, basePower:moveRow.power }, conditions);
      setDamageResult(out);
    } catch (err) {
      setCalcError(err.message||"Calculation failed");
    } finally { setCalcLoading(false); }
  };

  const handleReset = () => {
    setAttackerPartyMonId(""); setDefenderId(""); setCrit(false);
    setAtkNature("hardy"); setDefNature("hardy"); setWeather("");
    setBurned(false); setEnemyBurned(false);
    setReflect(false); setLightScreen(false); setHelpingHand(false);
    setDamageResult(null); setDefenderHp(null); setCalcError(null);
    setMyCurrentHp(null); setEnemyCurrentHp(null);
    setDefMode("lookup"); setSelectedPokemonIndex(""); setPreview(null);
    setLookupDefender(null); setMyActiveMoveIdx(null); setEnemyActiveMoveIdx(null);
    setAttackerSide("my"); setMyMoveOverrides({}); setEnemyMoveOverrides({});
    setMyStripMonId(null); setEnemyStripIdx(null); setTrainerQuery(""); setTrainerSearchOpen(false);
  };

  /* ── Boss navigation ── */
  const sortedBossTrainers = trainerRows
    .filter(r => BOSS_PRIORITY.includes(r.id))
    .sort((a, b) => BOSS_PRIORITY.indexOf(a.id) - BOSS_PRIORITY.indexOf(b.id));
  const currentBossIdx = sortedBossTrainers.findIndex(t => t.id === selectedTrainerId);

  const applyTrainer = (t) => {
    setSelectedTrainerId(t.id);
    setSelectedRoute(formatTrainerRoute(t));
    setTrainerQuery(`${t.name}${t.party ? ` (${t.party})` : ""}`);
    setLookupDefender(null);
    setDefenderId("");
    setSelectedPokemonIndex("");
    setPreview(null);
    setDamageResult(null);
  };

  const goToPrevBoss = () => {
    if (currentBossIdx <= 0) return;
    applyTrainer(sortedBossTrainers[currentBossIdx - 1]);
  };

  const goToNextBoss = () => {
    if (currentBossIdx === -1 || currentBossIdx >= sortedBossTrainers.length - 1) return;
    applyTrainer(sortedBossTrainers[currentBossIdx + 1]);
  };

  /* Sprite helpers */
  const getSprite = (pokemonId) => pokemonId
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`
    : null;

  const atkMonForSide = attackerSide==="my" ? atkMon : defMon;
  const defMonForSide = attackerSide==="my" ? defMon : atkMon;



  return (
    <section>
      {/* ── Page header ── */}
      <div className="page-header">
        <h1 style={{margin:0,fontSize:20}}>Damage Calculator</h1>
        <p className="muted small" style={{marginTop:2}}>
          Gen 3 · Click a move to calculate · highlighted side = attacker
        </p>
      </div>

      {/* ── Attacker / Defender selectors ── */}
      <div style={{
        display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12,
      }}>
        {/* My team selector — col 1 */}
        <div style={{background:"#111520",border:"1px solid #1f2638",borderRadius:10,padding:10}}>
          <label style={{color:"#5a6380",fontSize:11,display:"grid",gap:4}}>
            My Pokémon
            <select
              value={attackerPartyMonId}
              onChange={e=>{
                setAttackerPartyMonId(e.target.value);
                const mon = party.find(m=>String(m.id)===e.target.value);
                setAtkNature(mon?String(mon.nature||"hardy").toLowerCase():"hardy");
                setMyMoveOverrides({});
                setDamageResult(null);
              }}
            >
              <option value="">{party.length?"Select party Pokémon…":"Party empty — add on Team screen"}</option>
              {party.map(mon=>(
                <option key={mon.id} value={String(mon.id)}>
                  {mon.nickname||mon.name} · Lv.{mon.level}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Page actions — col 2 */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          background:"#111520",border:"1px solid #1f2638",borderRadius:10,padding:10,
        }}>
          <button className="ghost small" onClick={()=>onNavigate("team")}>Team</button>
          <button className="ghost small" onClick={()=>onNavigate("encounters")}>Encounters</button>
          <button className="ghost small" onClick={handleReset}>Reset</button>
        </div>

        {/* Enemy trainer search — col 3 */}
        <div style={{background:"#111520",border:"1px solid #1f2638",borderRadius:10,padding:10,position:"relative"}}>
          <div style={{color:"#5a6380",fontSize:11,marginBottom:4}}>Enemy Trainer</div>
          <input
            type="text"
            placeholder="Search trainer or location… (e.g. Roxanne, Rustboro)"
            value={trainerQuery}
            onChange={e=>{ setTrainerQuery(e.target.value); setTrainerSearchOpen(true); }}
            onFocus={()=>setTrainerSearchOpen(true)}
            style={{fontSize:12,padding:"6px 8px"}}
          />
          {trainerSearchOpen && trainerQuery.trim() && (
            <div style={{
              position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:50,
              background:"#0e1120",border:"1px solid #252c40",borderRadius:10,
              maxHeight:260,overflowY:"auto",boxShadow:"0 4px 24px #00000088",
            }}>
              {trainerSearchResults.length===0 && (
                <div style={{padding:"12px",textAlign:"center",color:"#5a6380",fontSize:12}}>
                  No trainers found
                </div>
              )}
              {trainerSearchResults.map((t,i)=>(
                <button key={t.id||i}
                  onClick={()=>{
                    setSelectedTrainerId(t.id);
                    setSelectedRoute(formatTrainerRoute(t));
                    setTrainerQuery(`${t.name}${t.party?" ("+t.party+")":""}`);
                    setTrainerSearchOpen(false);
                    setLookupDefender(null);
                    setDefenderId("");
                    setSelectedPokemonIndex("");
                    setPreview(null);
                    setDamageResult(null);
                  }}
                  style={{
                    display:"block",width:"100%",textAlign:"left",
                    padding:"9px 12px",background:"transparent",border:"none",
                    borderBottom:"1px solid #1a2030",cursor:"pointer",
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background="#181e2e"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                >
                  <div style={{fontSize:13,color:"#e4e6ef",fontWeight:600}}>
                    {t.name}{t.party?` (${t.party})`:""}
                  </div>
                  <div style={{fontSize:11,color:"#5a6380",marginTop:1}}>
                    {formatTrainerRoute(t)}
                  </div>
                </button>
              ))}
            </div>
          )}
          {trainerSearchOpen && trainerQuery.trim() && (
            <div style={{position:"fixed",inset:0,zIndex:49}} onClick={()=>setTrainerSearchOpen(false)}/>
          )}
        </div>
      </div>

      {/* ── Main 3-col battle layout ── */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr 1fr",
        gap:10, alignItems:"start",
      }}>
        {/* LEFT — My team */}
        <PokemonSide
          label={attackerSide==="my"?"Attacker":"Defender"}
          mon={atkMon}
          moves={myMoves}
          activeMoveIdx={myActiveMoveIdx}
          onMoveClick={handleMyMoveClick}
          isAttacker={attackerSide==="my"}
          spriteUrl={atkMon?.pokemonId ? getSprite(atkMon.pokemonId) : null}
          learnset={myLearnset}
          allMoves={moves}
          onSwap={(idx, m) => setMyMoveOverrides(ov=>({...ov,[idx]:m}))}
          statData={myStatData}
          extraControls={
            <div style={{display:"grid",gap:6}}>
              <label style={{color:"#5a6380",fontSize:11,display:"grid",gap:3}}>
                Nature
                <select
                  className="mini-select"
                  value={atkNature}
                  onChange={e=>setAtkNature(e.target.value)}
                  style={{width:"100%"}}
                >
                  {Object.keys(NATURES).map(n=>{
                    const {up,down}=NATURES[n];
                    const SL={atk:"Atk",def:"Def",spa:"SpA",spd:"SpD",spe:"Spe"};
                    return <option key={n} value={n}>
                      {up?`${capitalize(n)} (+${SL[up]}/-${SL[down]})`:capitalize(n)}
                    </option>;
                  })}
                </select>
              </label>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#5a6380",cursor:"pointer"}}>
                <input type="checkbox" checked={burned} onChange={e=>setBurned(e.target.checked)} style={{width:"auto"}}/>
                Burned
              </label>
              {myStatData?.battle?.HP && (
                <HpControl
                  maxHp={myStatData.battle.HP}
                  currentHp={myCurrentHp ?? myStatData.battle.HP}
                  onChange={setMyCurrentHp}
                />
              )}
            </div>
          }
        />

        {/* MIDDLE — Field + result */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <FieldEffects
            weather={weather} setWeather={setWeather}
            crit={crit} setCrit={setCrit}
            reflect={reflect} setReflect={setReflect}
            lightScreen={lightScreen} setLightScreen={setLightScreen}
            helpingHand={helpingHand} setHelpingHand={setHelpingHand}
          />

          {/* Attacker direction badge */}
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"2px 0"}}>
            <div style={{flex:1,height:1,background:"#1a2030"}}/>
            <div style={{
              display:"flex",alignItems:"center",gap:5,
              padding:"4px 10px",borderRadius:999,
              background: attackerSide==="my"?"#1a2240":"#2a1010",
              border:`1px solid ${attackerSide==="my"?"#3a58cc44":"#6b1a1a44"}`,
              fontSize:11,fontWeight:700,letterSpacing:"0.06em",whiteSpace:"nowrap",
              color: attackerSide==="my"?"#7a9ef0":"#f87171",
            }}>
              <span>{attackerSide==="my"?"ME":"ENEMY"}</span>
              <span style={{fontSize:14}}>→</span>
              <span>{attackerSide==="my"?"ENEMY":"ME"}</span>
            </div>
            <div style={{flex:1,height:1,background:"#1a2030"}}/>
          </div>

          {/* Result */}
          <DamageResult
            damageResult={damageResult}
            defenderHp={(() => {
              const enemyMaxHp = enemyStatData?.battle?.HP ?? defenderHp;
              const myMaxHp = myStatData?.battle?.HP ?? defenderHp;
              if (attackerSide === "my") return enemyMaxHp ? (enemyCurrentHp ?? enemyMaxHp) : null;
              return myMaxHp ? (myCurrentHp ?? myMaxHp) : null;
            })()}
            maxHp={attackerSide === "my"
              ? (enemyStatData?.battle?.HP ?? defenderHp)
              : (myStatData?.battle?.HP ?? defenderHp)}
            moveName={activeMoveObj?.name}
            moveType={activeMoveObj?.type}
          />

          {calcLoading && (
            <div style={{textAlign:"center",fontSize:11,color:"#5a6380"}}>calculating…</div>
          )}
          {calcError && (
            <div style={{fontSize:11,color:"#f87171",textAlign:"center",padding:"4px 0"}}>
              {calcError}
            </div>
          )}
        </div>

        {/* RIGHT — Enemy */}
        <PokemonSide
          label={attackerSide==="enemy"?"Attacker":"Defender"}
          mon={enemyDisplayMon}
          moves={enemyMoves}
          activeMoveIdx={enemyActiveMoveIdx}
          onMoveClick={handleEnemyMoveClick}
          isAttacker={attackerSide==="enemy"}
          spriteUrl={
            enemyDisplayMon?.pokemonId
              ? getSprite(enemyDisplayMon.pokemonId)
              : lookupDefender?.basePokemon?.id
                ? getSprite(lookupDefender.basePokemon.id)
                : null
          }
          learnset={enemyLearnset}
          allMoves={moves}
          onSwap={(idx, m) => setEnemyMoveOverrides(ov=>({...ov,[idx]:m}))}
          statData={enemyStatData}
          extraControls={
            <div style={{display:"grid",gap:6}}>
              <label style={{color:"#5a6380",fontSize:11,display:"grid",gap:3}}>
                Nature
                <select
                  className="mini-select"
                  value={defNature}
                  onChange={e=>setDefNature(e.target.value)}
                  style={{width:"100%"}}
                >
                  {Object.keys(NATURES).map(n=>{
                    const {up,down}=NATURES[n];
                    const SL={atk:"Atk",def:"Def",spa:"SpA",spd:"SpD",spe:"Spe"};
                    return <option key={n} value={n}>
                      {up?`${capitalize(n)} (+${SL[up]}/-${SL[down]})`:capitalize(n)}
                    </option>;
                  })}
                </select>
              </label>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#5a6380",cursor:"pointer"}}>
                <input type="checkbox" checked={enemyBurned} onChange={e=>setEnemyBurned(e.target.checked)} style={{width:"auto"}}/>
                Burned
              </label>
              {(enemyStatData?.battle?.HP || defenderHp) && (
                <HpControl
                  maxHp={enemyStatData?.battle?.HP ?? defenderHp}
                  currentHp={enemyCurrentHp ?? (enemyStatData?.battle?.HP ?? defenderHp)}
                  onChange={setEnemyCurrentHp}
                />
              )}
            </div>
          }
        />
      </div>

      {/* ── Sprite strips ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>

        {/* My side strip: party + PC box */}
        <div style={{background:"#111520",border:"1px solid #1f2638",borderRadius:12,padding:10}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",
            letterSpacing:"0.08em",color:"#5a6380",marginBottom:8}}>My Party</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {party.map(mon => {
              const active = String(mon.id) === activeMyMonId;
              return (
                <button key={mon.id} onClick={()=>{
                  setMyStripMonId(String(mon.id));
                  setAttackerPartyMonId(String(mon.id));
                  setAtkNature(String(mon.nature||"hardy").toLowerCase());
                  setMyMoveOverrides({});
                  setMyActiveMoveIdx(null);
                  setDamageResult(null);
                }} title={`${mon.nickname||mon.name} Lv.${mon.level}`}
                style={{
                  padding:3,borderRadius:8,border:"2px solid",
                  borderColor: active?"#3a58cc":"#1f2638",
                  background: active?"#1a2240":"#0b0e14",
                  cursor:"pointer",transition:"all 0.12s",
                }}>
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.pokemonId}.png`}
                    alt={mon.name}
                    style={{width:40,height:40,imageRendering:"pixelated",display:"block"}}
                    onError={e=>{e.target.style.display="none";}}
                  />
                </button>
              );
            })}
          </div>
          {pcBox.length > 0 && (
            <>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",
                letterSpacing:"0.08em",color:"#5a6380",marginTop:10,marginBottom:8}}>PC Box</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {pcBox.map(mon => {
                  const active = String(mon.id) === activeMyMonId;
                  return (
                    <button key={mon.id} onClick={()=>{
                      setMyStripMonId(String(mon.id));
                      setAttackerPartyMonId(String(mon.id));
                      setAtkNature(String(mon.nature||"hardy").toLowerCase());
                      setMyMoveOverrides({});
                      setMyActiveMoveIdx(null);
                      setDamageResult(null);
                    }} title={`${mon.nickname||mon.name} Lv.${mon.level}`}
                    style={{
                      padding:3,borderRadius:8,border:"2px solid",
                      borderColor: active?"#3a58cc":"#1f2638",
                      background: active?"#1a2240":"#0b0e14",
                      cursor:"pointer",transition:"all 0.12s",
                      opacity:0.7,
                    }}>
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.pokemonId}.png`}
                        alt={mon.name}
                        style={{width:40,height:40,imageRendering:"pixelated",display:"block"}}
                        onError={e=>{e.target.style.display="none";}}
                      />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Enemy side strip: selected trainer's team */}
        <div style={{background:"#111520",border:"1px solid #1f2638",borderRadius:12,padding:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <button
              onClick={goToPrevBoss}
              disabled={currentBossIdx <= 0}
              title="Previous boss"
              style={{
                padding:"2px 7px",borderRadius:5,border:"1px solid #1f2638",
                background:"transparent",color:currentBossIdx<=0?"#2a2f40":"#7a9ef0",
                cursor:currentBossIdx<=0?"default":"pointer",fontSize:12,lineHeight:1,
              }}
            >‹</button>
            <div style={{flex:1,fontSize:10,fontWeight:700,textTransform:"uppercase",
              letterSpacing:"0.08em",color:"#5a6380",textAlign:"center",overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {selectedTrainer
                ? `${selectedTrainer.name}${selectedTrainer.party ? " (" + selectedTrainer.party + ")" : ""}`
                : "Enemy Team"}
              {currentBossIdx !== -1 && (
                <span style={{color:"#3a4060",marginLeft:4,fontWeight:400}}>
                  {currentBossIdx + 1}/{sortedBossTrainers.length}
                </span>
              )}
            </div>
            <button
              onClick={goToNextBoss}
              disabled={currentBossIdx === -1 || currentBossIdx >= sortedBossTrainers.length - 1}
              title="Next boss"
              style={{
                padding:"2px 7px",borderRadius:5,border:"1px solid #1f2638",
                background:"transparent",
                color:(currentBossIdx===-1||currentBossIdx>=sortedBossTrainers.length-1)?"#2a2f40":"#7a9ef0",
                cursor:(currentBossIdx===-1||currentBossIdx>=sortedBossTrainers.length-1)?"default":"pointer",
                fontSize:12,lineHeight:1,
              }}
            >›</button>
          </div>
          {selectedTeam.length === 0 ? (
            <div style={{fontSize:12,color:"#3a3f52"}}>Search a trainer above to load their team</div>
          ) : (
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {selectedTeam.map((p,i) => {
                const baseData = pokemonIndex[String(p.species||"").toLowerCase()]||null;
                const spriteId = baseData?.id||null;
                const active = enemyStripIdx === i;
                const speciesName = (p.species||"?").replace(/[-_]/g," ")
                  .toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
                return (
                  <button key={i} onClick={()=>{
                    setEnemyStripIdx(i);
                    setLookupDefender(null);
                    setDefenderId("");
                    setEnemyActiveMoveIdx(null);
                    setEnemyMoveOverrides({});
                    setDamageResult(null);
                  }} title={`${speciesName} Lv.${p.level}`}
                  style={{
                    padding:3,borderRadius:8,border:"2px solid",
                    borderColor: active?"#c03030":"#1f2638",
                    background: active?"#2a1010":"#0b0e14",
                    cursor:"pointer",transition:"all 0.12s",
                  }}>
                    {spriteId ? (
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`}
                        alt={speciesName}
                        style={{width:40,height:40,imageRendering:"pixelated",display:"block"}}
                        onError={e=>{e.target.style.display="none";}}
                      />
                    ) : (
                      <div style={{width:40,height:40,display:"flex",alignItems:"center",
                        justifyContent:"center",fontSize:10,color:"#5a6380"}}>?</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* TODO: Commented out to determine if necessary*/}
      {/* {/* ── Route / Trainer Lookup (under enemy) ── }
      <div style={{marginTop:12}}>
        <details className="panel">
          <summary>Route / Trainer Lookup</summary>

          {/* Mode toggle }
          <div style={{display:"flex",gap:4,marginTop:8,marginBottom:8}}>
            {[["lookup","Game Lookup"],["manual","Manual"]].map(([m,lbl])=>(
              <button key={m} className={`def-mode-btn${defMode===m?" active":""}`}
                onClick={()=>setDefMode(m)}>{lbl}</button>
            ))}
          </div>

          {defMode==="lookup" && (
            <div>
              {lookupLoading&&<div className="muted small">Loading trainer database…</div>}
              {!lookupLoading&&lookupError&&<div className="muted small" style={{color:"#f87171"}}>{lookupError}</div>}
              <div className="formGrid">
                <label>
                  Route / Location
                  <select value={selectedRoute} disabled={!routeEntries.length}
                    onChange={e=>handleRouteChange(e.target.value)}>
                    <option value="">Select Route…</option>
                    {routeEntries.map(([r])=><option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label>
                  Trainer
                  <select value={selectedTrainerId} disabled={!selectedRoute||!trainerEntries.length}
                    onChange={e=>handleTrainerChange(e.target.value)}>
                    <option value="">Select Trainer…</option>
                    {trainerEntries.map(t=>(
                      <option key={t.id} value={t.id}>
                        {t.name}{t.party?` (${t.party})`:""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Opponent Pokémon
                  <select value={selectedPokemonIndex}
                    disabled={!selectedTrainer||!selectedTeam.length}
                    onChange={e=>handlePokeChange(e.target.value)}>
                    <option value="">Select Pokémon…</option>
                    {selectedTeam.map((p,i)=>(
                      <option key={i} value={i}>
                        Lv.{p.level} {formatSpeciesName(p.species)}{p.iv!=null?` · IV ${p.iv}`:""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedTrainer&&(
                <div className="panel mt8">
                  <div className="rowBetween">
                    <strong>{selectedTrainer.name}</strong>
                    {preview&&(
                      <button className="btn small" onClick={handleAddLookupAsDefender}>
                        + Use as Enemy
                      </button>
                    )}
                  </div>
                  {preview&&(
                    <div className="stack mt8">
                      <div className="rowBetween">
                        <strong>{preview.displayName}</strong>
                        <span className="badge">Lv {preview.level}</span>
                      </div>
                      {preview.battleStats&&(
                        <div className="formGrid tight">
                          {Object.entries(preview.battleStats).map(([k,v])=>(
                            <div key={k} className="preview-stat">
                              <span>{k}</span><strong>{v}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                      {preview.moves?.length>0&&(
                        <div className="boss-moves">
                          {preview.moves.map(m=>(
                            <span key={m} className="move-tag">{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {defMode==="manual" && (
            <div>
              <div className="muted small mt8">Enter defender stats manually.</div>
              <div className="formGrid tight" style={{marginTop:8}}>
                {[["HP",45],["Atk",30],["Def",35],["SpA",35],["SpD",30],["Spe",25]].map(([lbl,def])=>(
                  <label key={lbl}>{lbl}<input defaultValue={def} type="number"/></label>
                ))}
              </div>
            </div>
          )}
        </details>

        {/* Type chart — commented out, preserved for later */}
        {/* 
        <details className="panel">
          <summary>Type Chart Reference</summary>
          <div className="type-chart-mini">
            TODO: auto-populate based on selected move type
          </div>
        </details>
        }
      </div> */}
    </section>
  );
}