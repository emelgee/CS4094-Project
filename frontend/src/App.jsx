import { useState, useEffect } from "react";
import AddEncounterModal from "./components/AddEncounterModal";
import AddPokemonModal from "./components/AddPokemonModal";
import DashboardScreen from "./screens/DashboardScreen";
import TeamScreen from "./screens/TeamScreen";
import EncountersScreen from "./screens/EncountersScreen";
import CalculatorScreen from "./screens/CalculatorScreen";
import TrainerScreen from "./screens/TrainerScreen";
import BossScreen from "./screens/BossScreen";
import LookupScreen from "./screens/LookupScreen";
import AuthScreen from "./screens/AuthScreen";
import UserMenu from "./components/UserMenu";
import { useAuth } from "./auth/AuthContext";
import { apiFetch } from "./utils/api";
import { BADGES } from "./data/constants";

const BADGES_STORAGE_KEY = "pcm_earned_badges";

const NAV_ITEMS = [
  { key: "trainer", label: "Trainer" },
  { key: "dashboard", label: "Dashboard" },
  { key: "team", label: "Team" },
  { key: "encounters", label: "Encounters" },
  { key: "calculator", label: "Calculator" },
  { key: "boss", label: "Boss Data" },
  { key: "lookup", label: "Lookup" },
];

export default function App() {
  const { status } = useAuth();

  // ── Navigation ──────────────────────────────────────────────────────
  const [screen, setScreen] = useState("trainer");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigate = (s) => setScreen(s);

  // ── Calculator preload ──────────────────────────────────────────────
  // Set when another screen (e.g. Boss Data) wants to hand a specific
  // trainer + Pokémon to the calculator. The calculator consumes it on
  // its next render and clears it via onCalcPreloadConsumed so it
  // doesn't re-apply on subsequent visits.
  const [calcPreload, setCalcPreload] = useState(null);

  const handleLoadBossIntoCalc = (trainerId, monIdx = 0) => {
    if (!trainerId) return;
    setCalcPreload({ trainerId, monIdx });
    setScreen("calculator");
  };

  // ── Badges ──────────────────────────────────────────────────────────
  // Earned badges live here (not in TrainerScreen) so the sidebar's
  // "Badges: X / 8" indicator stays in sync with the badge grid.
  // Persisted in localStorage so a refresh doesn't wipe progress.
  const [earnedBadges, setEarnedBadges] = useState(() => {
    try {
      const raw = localStorage.getItem(BADGES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify([...earnedBadges]));
    } catch { /* ignore quota / private mode */ }
  }, [earnedBadges]);

  const toggleBadge = (name) => {
    setEarnedBadges((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const earnedBadgeCount = BADGES.reduce(
    (acc, b) => acc + (earnedBadges.has(b.name) ? 1 : 0),
    0
  );

  // ── Party / PC Box / Graveyard ──────────────────────────────────────
  // All three are slices of the same `encounter` table:
  //   party      → team_slot 1-6
  //   PC Box     → team_slot null AND status !== "dead"
  //   Graveyard  → team_slot null AND status === "dead"
  // Using the existing `status` column avoids a schema migration; "dead"
  // is a value distinct from the encounter outcomes (caught/fled/etc.).
  const [party, setParty] = useState([]);
  const [pcBox, setPcBox] = useState([]);
  const [graveyard, setGraveyard] = useState([]);

  const fetchTeam = async () => {
    try {
      const res = await apiFetch("/api/team");
      if (!res.ok) return;
      const data = await res.json();
      const mapped = data.map((row) => ({
        id: row.id,
        pokemonId: row.pokemon_id,
        name: row.name.charAt(0).toUpperCase() + row.name.slice(1),
        nickname: row.nickname,
        level: row.level,
        nature: row.nature.charAt(0).toUpperCase() + row.nature.slice(1),
        ability: row.ability,
        types: [row.type1, row.type2]
          .filter(Boolean)
          .map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
        primaryType: row.type1,
        stats: {
          hp: row.hp,
          atk: row.attack,
          def: row.defense,
          spa: row.sp_attack,
          spd: row.sp_defense,
          spe: row.speed,
        },
        ivs: {
          hp: row.hp_iv ?? 31,
          atk: row.attack_iv ?? 31,
          def: row.defense_iv ?? 31,
          spa: row.sp_attack_iv ?? 31,
          spd: row.sp_defense_iv ?? 31,
          spe: row.speed_iv ?? 31,
        },
        evs: {
          hp: row.hp_ev ?? 0,
          atk: row.attack_ev ?? 0,
          def: row.defense_ev ?? 0,
          spa: row.sp_attack_ev ?? 0,
          spd: row.sp_defense_ev ?? 0,
          spe: row.speed_ev ?? 0,
        },
        moves: [
          row.move1 || "",
          row.move2 || "",
          row.move3 || "",
          row.move4 || "",
        ],
        slot: row.team_slot,
        status: row.status,
        dbData: {
          ability1: row.ability1,
          ability2: row.ability2,
          ability_hidden: row.ability_hidden,
        },
      }));
      setParty(mapped.filter((m) => m.slot !== null));
      setPcBox(mapped.filter((m) => m.slot === null && m.status !== "dead"));
      setGraveyard(mapped.filter((m) => m.slot === null && m.status === "dead"));
    } catch (err) {
      console.error("Failed to fetch team:", err);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchTeam();
  }, [status]);

  const handleSendToBox = async (id) => {
    if (party.length <= 1) {
      alert("You need at least 1 Pokémon in your party!");
      return;
    }
    try {
      await apiFetch(`/api/team/${id}/slot`, {
        method: "PATCH",
        json: { team_slot: null },
      });
      await fetchTeam();
    } catch (err) {
      console.error("Send to box failed:", err);
    }
  };

  const handleWithdraw = async (id) => {
    if (party.length >= 6) {
      alert("Party is full (6/6)! Move someone to PC Box first.");
      return;
    }
    try {
      const usedSlots = party.map((m) => m.slot);
      const slot = [1, 2, 3, 4, 5, 6].find((s) => !usedSlots.includes(s));
      // Withdrawing a "dead" Pokémon also revives it to a normal status.
      const target = pcBox.find((m) => m.id === id) || graveyard.find((m) => m.id === id);
      if (target?.status === "dead") {
        await apiFetch(`/api/encounters/${id}`, {
          method: "PATCH",
          json: { status: "caught" },
        });
      }
      await apiFetch(`/api/team/${id}/slot`, {
        method: "PATCH",
        json: { team_slot: slot },
      });
      await fetchTeam();
    } catch (err) {
      console.error("Withdraw failed:", err);
    }
  };

  // Move a Pokémon to the Graveyard. Works from party or PC Box: clears
  // any team_slot (so it leaves the active party) and flags it as dead so
  // it shows up in the graveyard list instead of the PC Box.
  const handleSendToGraveyard = async (id) => {
    try {
      const inParty = party.some((m) => m.id === id);
      if (inParty && party.length <= 1) {
        alert("You need at least 1 Pokémon in your party!");
        return;
      }
      if (!window.confirm("Move this Pokémon to the Graveyard?")) return;
      if (inParty) {
        await apiFetch(`/api/team/${id}/slot`, {
          method: "PATCH",
          json: { team_slot: null },
        });
      }
      await apiFetch(`/api/encounters/${id}`, {
        method: "PATCH",
        json: { status: "dead" },
      });
      await fetchTeam();
    } catch (err) {
      console.error("Send to graveyard failed:", err);
    }
  };

  // Bring a Pokémon out of the Graveyard back into the PC Box.
  const handleReviveFromGraveyard = async (id) => {
    try {
      await apiFetch(`/api/encounters/${id}`, {
        method: "PATCH",
        json: { status: "caught" },
      });
      await fetchTeam();
    } catch (err) {
      console.error("Revive failed:", err);
    }
  };

  // ── Encounters ──────────────────────────────────────────────────────
  const [encounters, setEncounters] = useState([]);

  const fetchEncounters = async () => {
    try {
      const res = await apiFetch("/api/encounters");
      if (!res.ok) return;
      const data = await res.json();
      setEncounters(data);
    } catch (err) {
      console.error("Failed to fetch encounters:", err);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchEncounters();
  }, [status]);

  const handleDeleteEncounter = async (id) => {
    if (!window.confirm("Release this Pokémon? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/encounters/${id}`, { method: "DELETE" });
      await fetchEncounters();
      await fetchTeam();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleUpdateEncounter = async (updatedEnc) => {
    try {
      await apiFetch(`/api/encounters/${updatedEnc.id}`, {
        method: "PATCH",
        json: {
          location: updatedEnc.location,
          nickname: updatedEnc.nickname,
          status: updatedEnc.outcome?.toLowerCase(),
        },
      });
      fetchEncounters();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  // ── Modals ───────────────────────────────────────────────────────────
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [showAddPokemonModal, setShowAddPokemonModal] = useState(false);

  const handleAddPokemonToTeam = async (mon) => {
    try {
      const usedSlots = party.map((m) => m.slot).filter((s) => s != null);
      const nextSlot = [1, 2, 3, 4, 5, 6].find((s) => !usedSlots.includes(s));

      const res = await apiFetch("/api/team", {
        method: "POST",
        json: {
          pokemon_id: mon?.dbData?.id,
          nickname: null,
          level: Number(mon?.level) || 5,
          nature: "hardy",
          ability_id: null,
          team_slot: nextSlot ?? null,
          location_id: null,
        },
      });

      if (!res.ok) throw new Error("Failed to add Pokemon to team");

      await fetchTeam();
      setShowAddPokemonModal(false);
    } catch (err) {
      console.error("Add Pokemon failed:", err);
    }
  };

  const handleAddEncounter = async (enc) => {
    try {
      const res = await apiFetch("/api/encounters", {
        method: "POST",
        json: {
          pokemon_id: enc.pokemon_id,
          location: enc.location,
          nickname: enc.nickname,
          ability: enc.ability,
          nature: enc.nature || "serious",
          level: Number(enc.level) || 50,
          hp_iv: 31, attack_iv: 31, defense_iv: 31,
          sp_attack_iv: 31, sp_defense_iv: 31, speed_iv: 31,
          hp_ev: 0, attack_ev: 0, defense_ev: 0,
          sp_attack_ev: 0, sp_defense_ev: 0, speed_ev: 0,
          move1_id: null, move2_id: null, move3_id: null, move4_id: null,
          item_id: null,
          status: enc.outcome?.toLowerCase() || "caught",
        },
      });
      if (!res.ok) throw new Error("Failed to create encounter");

      // Auto-assign to team if there's a free slot
      const newEncounter = await res.json();
      if (party.length < 6) {
        const usedSlots = party.map((m) => m.slot);
        const slot = [1, 2, 3, 4, 5, 6].find((s) => !usedSlots.includes(s));
        await apiFetch(`/api/team/${newEncounter.id}/slot`, {
          method: "PATCH",
          json: { team_slot: slot },
        });
      }

      await fetchEncounters();
      await fetchTeam();
      setShowEncounterModal(false);
    } catch (err) {
      console.error("Add encounter failed:", err);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="auth-shell">
        <div className="muted">Loading…</div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <AuthScreen />;
  }

  return (
    <>
      {showEncounterModal && (
        <AddEncounterModal
          onClose={() => setShowEncounterModal(false)}
          onAdd={handleAddEncounter}
        />
      )}
      {showAddPokemonModal && (
        <AddPokemonModal
          onClose={() => setShowAddPokemonModal(false)}
          onAdd={handleAddPokemonToTeam}
        />
      )}

      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">⚔</span>
          <strong>PokeChallenge</strong>
          <span className="badge">Gen 3</span>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              className={`navbtn${screen === key ? " active" : ""}`}
              onClick={() => navigate(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <UserMenu />
        <button
          className="ghost icon-btn"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          ☰
        </button>
      </header>

      <div className="shell">
        <aside className={`sidebar${sidebarOpen ? "" : " collapsed"}`}>
          <h3>Quick Actions</h3>
          <details open>
            <summary>Current Run</summary>
            <div className="stack">
              <div className="row">
                <span>Run:</span>
                <strong>Emerald Nuzlocke</strong>
              </div>
              <div className="row">
                <span>Status:</span>
                <strong className="status-active">Active</strong>
              </div>
              <div className="row">
                <span>Badges:</span>
                <strong>{earnedBadgeCount} / {BADGES.length}</strong>
              </div>
            </div>
          </details>
          <details open>
            <summary>Shortcuts</summary>
            <div className="stack">
              {[
                ["encounters", "+ Add Encounter"],
                ["calculator", "Open Calculator"],
                ["boss", "Boss Quick Load"],
                ["lookup", "Search Pokémon"],
              ].map(([s, lbl]) => (
                <button key={s} className="btn" onClick={() => navigate(s)}>
                  {lbl}
                </button>
              ))}
            </div>
          </details>
          <details>
            <summary>Boss Quick Load</summary>
            <div className="stack">
              {[
                ["roxanne", "Roxanne (Gym 1)"],
                ["brawly", "Brawly (Gym 2)"],
                ["wattson", "Wattson (Gym 3)"],
                ["flannery", "Flannery (Gym 4)"],
              ].map(([key, lbl]) => (
                <button
                  key={key}
                  className="btn small"
                  onClick={() => navigate("boss")}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </details>
        </aside>

        <main className="main">
          {screen === "dashboard" && (
            <DashboardScreen
              party={party}
              encounters={encounters}
              onNavigate={navigate}
              onOpenAdd={() => setShowAddPokemonModal(true)}
            />
          )}
          {screen === "team" && (
            <TeamScreen
              party={party}
              pcBox={pcBox}
              graveyard={graveyard}
              onSendToBox={handleSendToBox}
              onSendToGraveyard={handleSendToGraveyard}
              onRevive={handleReviveFromGraveyard}
              onWithdraw={handleWithdraw}
              onNavigate={navigate}
              onOpenAdd={() => setShowAddPokemonModal(true)}
              onRemove={handleDeleteEncounter}
              onRelease={handleDeleteEncounter}
              onSave={fetchTeam}
            />
          )}
          {screen === "encounters" && (
            <EncountersScreen
              onNavigate={navigate}
              onOpenAdd={() => setShowEncounterModal(true)}
              encounters={encounters}
              onDelete={handleDeleteEncounter}
              onUpdate={handleUpdateEncounter}
              onAdd={handleAddEncounter}
            />
          )}
          <div style={{ display: screen === "calculator" ? "" : "none" }}>
            <CalculatorScreen
              onNavigate={navigate}
              encounters={encounters}
              pcBox={pcBox}
              party={party}
              onRefreshEncounters={fetchEncounters}
              visible={screen === "calculator"}
              calcPreload={calcPreload}
              onCalcPreloadConsumed={() => setCalcPreload(null)}
            />
          </div>
          {screen === "trainer" && (
            <TrainerScreen
              earnedBadges={earnedBadges}
              onToggleBadge={toggleBadge}
              earnedBadgeCount={earnedBadgeCount}
              graveyard={graveyard}
            />
          )}
          {screen === "boss" && (
            <BossScreen
              onNavigate={navigate}
              onLoadIntoCalc={handleLoadBossIntoCalc}
              party={party}
            />
          )}
          {screen === "lookup" && <LookupScreen onNavigate={navigate} />}
        </main>
      </div>
    </>
  );
}