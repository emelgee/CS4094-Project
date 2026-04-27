import { useState, useEffect } from "react";
import { API_BASE } from "../data/constants";
import {
  groupTrainersByRoute,
  formatTrainerRoute,
  formatSpeciesName,
  buildTrainerPokemonView,
  gen3CombatStat,
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
      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        {move ? move.name : "—"}
      </span>
      {move && (
        <span style={{fontSize:10, opacity:0.7, flexShrink:0}}>
          {move.power && `BP ${move.power}`}
        </span>
      )}
    </button>
  );
}

function StatRow({ label, value, max=255 }) {
  const pct = Math.min(100, Math.round((value/max)*100));
  const color = value>=100?"#4ade80":value>=60?"#ffd740":"#f87171";
  return (
    <div style={{display:"grid",gridTemplateColumns:"32px 1fr 30px",gap:6,alignItems:"center",fontSize:11}}>
      <span style={{color:"#5a6380",textAlign:"right"}}>{label}</span>
      <div style={{height:4,background:"#1a2030",borderRadius:999,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:999,transition:"width 0.3s"}}/>
      </div>
      <span style={{color:"#c8cde0",textAlign:"right"}}>{value}</span>
    </div>
  );
}

function PokemonSide({
  label, mon, moves, activeMoveIdx, onMoveClick,
  isAttacker, extraControls, spriteUrl,
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

      {/* Stats (compact) */}
      {mon?.stats && (
        <div style={{display:"grid",gap:4}}>
          {STAT_KEYS.map(k=>(
            <StatRow key={k} label={STAT_LABELS[k]} value={mon.stats[k]??mon.battleStats?.[STAT_LABELS[k]]??0}/>
          ))}
        </div>
      )}
      {mon?.battleStats && !mon.stats && (
        <div style={{display:"grid",gap:4}}>
          {Object.entries(mon.battleStats).map(([k,v])=>(
            <StatRow key={k} label={k} value={v}/>
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
            <MoveButton
              key={i}
              move={moves[i]||null}
              active={activeMoveIdx===i}
              onClick={()=>onMoveClick(i)}
              disabled={!mon||!moves[i]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldEffects({ weather, setWeather, crit, setCrit }) {
  return (
    <div style={{
      background:"#0e1120", border:"1px solid #1a2030",
      borderRadius:12, padding:12, display:"flex",
      flexDirection:"column", gap:10,
    }}>
      <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",
        letterSpacing:"0.08em",color:"#5a6380",textAlign:"center"}}>
        Field
      </div>

      {/* Weather */}
      <div style={{display:"grid",gap:4}}>
        <span style={{fontSize:11,color:"#5a6380"}}>Weather</span>
        {[
          {val:"",icon:"○",label:"None"},
          {val:"sun",icon:"☀",label:"Sun"},
          {val:"rain",icon:"☂",label:"Rain"},
        ].map(({val,icon,label})=>(
          <button key={val} onClick={()=>setWeather(val)} style={{
            padding:"6px 8px", borderRadius:7, border:"1px solid",
            borderColor: weather===val?"#3a58cc66":"#1a2030",
            background: weather===val?"#1a2240":"transparent",
            color: weather===val?"#e4e6ef":"#7a82a0",
            fontSize:11, cursor:"pointer", textAlign:"left",
            display:"flex",alignItems:"center",gap:6,transition:"all 0.12s",
          }}>
            <span style={{fontSize:14}}>{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* Conditions */}
      <div style={{display:"grid",gap:4}}>
        <span style={{fontSize:11,color:"#5a6380"}}>Conditions</span>
        {[
          {key:"crit",label:"Crit hit",val:crit,set:setCrit},
        ].map(({key,label,val,set})=>(
          <button key={key} onClick={()=>set(v=>!v)} style={{
            padding:"6px 8px", borderRadius:7, border:"1px solid",
            borderColor: val?"#ffd74066":"#1a2030",
            background: val?"#2a2a0a":"transparent",
            color: val?"#ffd740":"#7a82a0",
            fontSize:11, cursor:"pointer", textAlign:"left",
            display:"flex",alignItems:"center",gap:6,transition:"all 0.12s",
          }}>
            <span style={{
              width:12,height:12,borderRadius:3,flexShrink:0,
              background:val?"#ffd740":"transparent",
              border:`1px solid ${val?"#ffd740":"#3a3f52"}`,
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#000",
            }}>{val?"✓":""}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DamageResult({ damageResult, defenderHp, moveName, moveType }) {
  if (!damageResult) return (
    <div style={{
      background:"#0e1120",border:"1px solid #1a2030",borderRadius:12,
      padding:20,textAlign:"center",color:"#3a3f52",fontSize:13,
    }}>
      Select Pokémon and click a move
    </div>
  );

  const { min, max, rolls } = damageResult;
  const minPct = defenderHp ? ((min/defenderHp)*100) : null;
  const maxPct = defenderHp ? ((max/defenderHp)*100) : null;
  const ohko = maxPct>=100;
  const twohko = minPct && (minPct*2)>=100;
  const koLabel = ohko?"guaranteed OHKO": twohko?"guaranteed 2HKO": maxPct>=50?"possible 2HKO":"";
  const typeColor = TYPE_COLORS[moveType?.toLowerCase()] || "#7a9ef0";

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
        {minPct && (
          <div style={{fontSize:13,color:"#7a82a0",marginTop:2}}>
            {minPct.toFixed(1)}% – {maxPct.toFixed(1)}% of max HP
            {koLabel && (
              <span style={{
                marginLeft:8,fontSize:11,fontWeight:700,
                color: ohko?"#f87171":twohko?"#ffd740":"#4ade80",
              }}>({koLabel})</span>
            )}
          </div>
        )}
      </div>

      {/* Damage rolls */}
      {Array.isArray(rolls) && rolls.length > 0 && (
        <div>
          <div style={{fontSize:11,color:"#5a6380",textTransform:"uppercase",
            letterSpacing:"0.06em",marginBottom:5}}>
            Damage rolls (16)
          </div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
            {rolls.map((r,i)=>(
              <span key={i} style={{
                fontSize:11,padding:"2px 6px",borderRadius:5,
                background: r===min?"#2a1010":r===max?"#0d2a1a":"#0b0e14",
                color: r===min?"#f87171":r===max?"#4ade80":"#7a82a0",
                border:`1px solid ${r===min?"#5a1a1a":r===max?"#1a5235":"#1a2030"}`,
                fontVariantNumeric:"tabular-nums",
              }}>{r}</span>
            ))}
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
  const [lookupDefender, setLookupDefender] = useState(null);
  const [defenderHp, setDefenderHp] = useState(null);
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
        const firstRoute = formatTrainerRoute(rows[0]);
        setSelectedRoute(firstRoute||"");
        setSelectedTrainerId(rows[0]?.id||"");
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

  /* Build display objects for enemy side —
     Priority: strip selection from trainer > lookupDefender > encounter dropdown */
  const stripMon = enemyStripIdx !== null && selectedTeam[enemyStripIdx]
    ? selectedTeam[enemyStripIdx] : null;

    const buildFromStripMon = (p) => {
    if (!p) return null;
    const baseData = pokemonIndex[String(p.species||"").toLowerCase()] || null;
    const lv = Number(p.level)||50;
    const iv = p.iv!=null ? Number(p.iv) : 31;
    const calcStat = (base,isHp) => {
      if(!base) return 0;
      if(isHp) return Math.floor(((2*base+iv)*lv)/100)+lv+10;
      return Math.floor(((2*base+iv)*lv)/100)+5;
    };
    const battleStats = baseData ? {
      HP: calcStat(baseData.hp,true), Atk: calcStat(baseData.attack),
      Def: calcStat(baseData.defense), SpA: calcStat(baseData.sp_attack),
      SpD: calcStat(baseData.sp_defense), Spe: calcStat(baseData.speed),
    } : {};
    const moves = [p.move1,p.move2,p.move3,p.move4].filter(Boolean);
    const displayName = (p.species||"Unknown").replace(/[-_]/g," ").toLowerCase()
      .replace(/\w/g,c=>c.toUpperCase());
    return {
      displayName, name: displayName, level:lv,
      types:[baseData?.type1,baseData?.type2].filter(Boolean),
      battleStats, moves,
      basePokemon: baseData||{},
      pokemonId: baseData?.id||null,
    };
  };

  /* Active mon on my side — strip selection overrides top-bar dropdown */
  const activeMyMonId = myStripMonId || attackerPartyMonId;
  const atkMon = party.find(m=>String(m.id)===activeMyMonId)
    || null;
  /* defMon for calc: strip selection wins, then lookupDefender, then encounter */
  const defMon =
    stripMon
    ? buildFromStripMon(stripMon)
    : defenderId
      ? encounters.find(e=>String(e.id)===String(defenderId)) || null
      : lookupDefender || null;
  
  /* Build move lists */
  const toHyphenated = (s) => s.toLowerCase().replace(/[\s_]+/g, "-");
  const toDisplayName = (s) => s.replace(/[-_]/g, " ").toLowerCase().replace(/\b\w/g, c=>c.toUpperCase());
  const getMoveObjByName = (name) => {
    if (!name) return null;
    const key = toHyphenated(name);
    const found = moves.find(m => toHyphenated(m.name) === key);
    if (found) return { ...found, name: toDisplayName(found.name) };
    return { name: toDisplayName(name), type: "normal", power: null };
  };

  const myMoves = [0,1,2,3].map(i=> {
    if (myMoveOverrides[i]) return myMoveOverrides[i];
    const name = atkMon?.moves?.[i];
    return getMoveObjByName(name);
  });

  const enemyMoveList = defMon?.moves||preview?.moves||[];
  const enemyMoves = [0,1,2,3].map(i=>{
    if (enemyMoveOverrides[i]) return enemyMoveOverrides[i];
    const name = Array.isArray(enemyMoveList)?enemyMoveList[i]:null;
    return getMoveObjByName(name);
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
    if (!activeMoveObj || !atkMon && attackerSide==="my") return;
    if (!activeMoveObj) { setDamageResult(null); return; }
    runCalc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMoveObj, attackerSide, crit, burned, enemyBurned, weather, atkNature, defNature, attackerPartyMonId, defenderId, lookupDefender, enemyStripIdx, myStripMonId]);

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
        if (defenderId) {
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
        } else {
          defStat=lookupDefender.battleStats?.Def;
          spdStat=lookupDefender.battleStats?.SpD;
          hpStat=lookupDefender.battleStats?.HP??null;
          type1=lookupDefender.basePokemon?.type1||"normal";
          type2=lookupDefender.basePokemon?.type2||null;
        }
        defenderData = { defense:defStat, sp_defense:spdStat, type1, type2, defStage:0, spDefStage:0 };
        setDefenderHp(hpStat??null);
      } else {
        // enemy attacking my mon
        if (!defMon) { setCalcError("Select an enemy Pokémon."); setCalcLoading(false); return; }
        if (!atkMon) { setCalcError("Select a party Pokémon to defend."); setCalcLoading(false); return; }

        // enemy as attacker
        let enemyAtk, enemySpa, enemyType1, enemyType2, enemyLevel;
        if (lookupDefender) {
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
        const defStatVal = gen3CombatStat(atkMon.stats.def, atkMon.ivs?.def??31, atkMon.evs?.def??0, atkMon.level);
        const spdStatVal = gen3CombatStat(atkMon.stats.spd, atkMon.ivs?.spd??31, atkMon.evs?.spd??0, atkMon.level);
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
      const conditions = { isCrit:crit, isBurned:activeBurned, weather:weather||"" };
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
    setDamageResult(null); setDefenderHp(null); setCalcError(null);
    setDefMode("lookup"); setSelectedPokemonIndex(""); setPreview(null);
    setLookupDefender(null); setMyActiveMoveIdx(null); setEnemyActiveMoveIdx(null);
    setAttackerSide("my"); setMyMoveOverrides({}); setEnemyMoveOverrides({});
    setMyStripMonId(null); setEnemyStripIdx(null); setTrainerQuery(""); setTrainerSearchOpen(false);
  };

  /* Sprite helpers */
  const getSprite = (pokemonId) => pokemonId
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`
    : null;

  const atkMonForSide = attackerSide==="my" ? atkMon : defMon;
  const defMonForSide = attackerSide==="my" ? defMon : atkMon;

  const enemyDisplayMon = stripMon
    ? buildFromStripMon(stripMon)
    : lookupDefender
      ? {
          displayName: lookupDefender.displayName,
          name: lookupDefender.displayName,
          level: lookupDefender.level,
          types: [lookupDefender.basePokemon?.type1, lookupDefender.basePokemon?.type2].filter(Boolean),
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
              moves: [enc.move1,enc.move2,enc.move3,enc.move4].filter(Boolean),
              pokemonId: enc.pokemon_id,
            } : null;
          })()
        : null;

  return (
    <section>
      {/* ── Page header ── */}
      <div className="page-header" style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <h1 style={{margin:0,fontSize:20}}>Damage Calculator</h1>
          <p className="muted small" style={{marginTop:2}}>
            Gen 3 · Click a move to calculate · highlighted side = attacker
          </p>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button className="ghost small" onClick={()=>onNavigate("team")}>Team</button>
          <button className="ghost small" onClick={()=>onNavigate("encounters")}>Encounters</button>
          <button className="ghost small" onClick={handleReset}>Reset</button>
        </div>
      </div>

      {/* ── Attacker / Defender selectors ── */}
      <div style={{
        display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12,
      }}>
        {/* My team selector */}
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

        {/* Enemy trainer search */}
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
        gridTemplateColumns:"1fr 140px 1fr",
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
            </div>
          }
        />

        {/* MIDDLE — Field + result */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <FieldEffects weather={weather} setWeather={setWeather} crit={crit} setCrit={setCrit}/>

          {/* VS badge */}
          <div style={{
            textAlign:"center",fontSize:13,fontWeight:700,
            color:"#3a3f52",padding:"4px 0",letterSpacing:"0.1em",
          }}>VS</div>

          {/* Result */}
          <DamageResult
            damageResult={damageResult}
            defenderHp={defenderHp}
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
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",
            letterSpacing:"0.08em",color:"#5a6380",marginBottom:8}}>
            {selectedTrainer ? `${selectedTrainer.name}${selectedTrainer.party?" ("+selectedTrainer.party+")":""}` : "Enemy Team"}
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
                  .toLowerCase().replace(/\w/g,c=>c.toUpperCase());
                return (
                  <button key={i} onClick={()=>{
                    setEnemyStripIdx(i);
                    setLookupDefender(null);
                    setDefenderId("");
                    setEnemyActiveMoveIdx(null);
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

      {/* ── Route / Trainer Lookup (under enemy) ── */}
      <div style={{marginTop:12}}>
        <details className="panel">
          <summary>Route / Trainer Lookup</summary>

          {/* Mode toggle */}
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
        */}
      </div>
    </section>
  );
}