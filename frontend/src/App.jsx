import { useState, useEffect, useRef, useCallback } from "react";

// =====================================================================
// STYLES
// =====================================================================
const css = `
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background: #0b0e14; color: #e4e6ef; }
.topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 10px; padding: 9px 14px; background: #111520; border-bottom: 1px solid #1f2638; }
.brand { display: flex; align-items: center; gap: 8px; white-space: nowrap; font-size: 15px; }
.brand-icon { font-size: 16px; }
.badge { font-size: 11px; padding: 3px 8px; border: 1px solid #2b3246; border-radius: 999px; color: #a0a8c0; }
.nav { display: flex; gap: 4px; flex-wrap: wrap; margin-left: 8px; flex: 1; }
.navbtn { padding: 6px 10px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: #9099b5; cursor: pointer; font-size: 13px; transition: all 0.15s; }
.navbtn:hover { background: #181e2e; color: #e4e6ef; }
.navbtn.active { background: #1a2240; border-color: #3348aa44; color: #e4e6ef; }
.icon-btn { padding: 8px 12px; border-radius: 8px; border: 1px solid #2b3246; background: transparent; color: #e4e6ef; cursor: pointer; white-space: nowrap; }
.shell { display: flex; min-height: calc(100vh - 48px); }
.sidebar { width: 260px; flex-shrink: 0; padding: 14px; border-right: 1px solid #1f2638; background: #0e1120; overflow: hidden; transition: width 0.2s, padding 0.2s; }
.sidebar.collapsed { width: 0; padding: 0; overflow: hidden; }
.sidebar h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #5a6380; margin: 0 0 12px; }
.status-active { color: #4ade80; }
.main { flex: 1; padding: 20px; min-width: 0; }
.page-header { margin-bottom: 16px; }
h1 { margin: 0 0 6px; font-size: 24px; font-weight: 700; }
h3 { margin: 0 0 10px; font-size: 14px; }
.muted { color: #7a82a0; margin: 0; }
.small { font-size: 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.twoCol { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 900px) { .twoCol { grid-template-columns: 1fr; } }
.col { display: flex; flex-direction: column; }
.panel { background: #111520; border: 1px solid #1f2638; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
.card { background: #111520; border: 1px solid #1f2638; border-radius: 12px; padding: 12px; }
.card.empty { display: grid; place-items: center; color: #5a6380; border-style: dashed; cursor: pointer; min-height: 64px; font-size: 13px; transition: border-color 0.15s, color 0.15s; }
.card.empty:hover { border-color: #3348aa88; color: #9099b5; }
.card.big { min-height: 120px; }
.gen-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.card.gen { display: flex; flex-direction: column; gap: 4px; text-align: left; cursor: pointer; border: 1px solid #1f2638; background: #111520; transition: border-color 0.15s, background 0.15s; }
.card.gen:not([disabled]):hover { border-color: #3a58cc88; background: #141b2e; }
.card.gen.supported { border-color: #1f3366; }
.card.gen.future { opacity: 0.45; cursor: default; }
.gen-num { font-size: 18px; font-weight: 700; }
.gen-label { font-size: 12px; color: #7a82a0; }
.gen-badge { font-size: 11px; margin-top: 6px; width: fit-content; padding: 2px 8px; border-radius: 999px; }
.supported-badge { background: #0d2a1a; color: #4ade80; border: 1px solid #1a5235; }
.future-badge { background: #1a1f2e; color: #5a6380; border: 1px solid #2b3246; }
details { }
summary { font-size: 13px; font-weight: 600; color: #c8cde0; cursor: pointer; padding: 4px 0; user-select: none; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary::before { content: '▸ '; color: #5a6380; font-size: 11px; }
details[open] summary::before { content: '▾ '; }
details > *:not(summary) { margin-top: 8px; }
.formGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 8px; }
.formGrid.tight { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }
label { display: grid; gap: 5px; color: #9099b5; font-size: 12px; }
input, select, textarea { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #252c40; background: #0b0e14; color: #e4e6ef; font-size: 13px; font-family: inherit; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #3a58cc66; }
textarea { resize: vertical; }
.mini-select { padding: 4px 6px; font-size: 12px; border-radius: 6px; width: auto; }
.btn { padding: 8px 14px; border-radius: 8px; border: 1px solid #2b3246; background: #1e2d5a44; color: #e4e6ef; cursor: pointer; font-size: 13px; transition: background 0.15s; white-space: nowrap; }
.btn:hover { background: #1e2d5a88; }
.btn.small { padding: 6px 10px; font-size: 12px; }
.ghost { padding: 8px 14px; border-radius: 8px; border: 1px solid #252c40; background: transparent; color: #9099b5; cursor: pointer; font-size: 13px; transition: background 0.15s, color 0.15s; }
.ghost:hover { background: #181e2e; color: #e4e6ef; }
.ghost.small { padding: 6px 10px; font-size: 12px; }
.ghost.danger { color: #f87171; }
.ghost.danger:hover { background: #2a1010; border-color: #6b2020; }
.btn-group { display: grid; gap: 8px; }
.row { display: flex; gap: 8px; align-items: center; }
.rowBetween { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.stack { display: grid; gap: 8px; }
.small-gap { gap: 4px; }
.mb8 { margin-bottom: 8px; }
.mt8 { margin-top: 8px; }
.list { display: grid; gap: 6px; }
.listItem { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid #1f2638; background: #0e1120; font-size: 13px; }
.listItem.active { border-color: #2a3d8055; background: #111a30; }
.listItem strong { font-size: 13px; }
.type-chip { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; }
.type-normal    { background: #6b6b5844; color: #a8a87a; border: 1px solid #6b6b5866; }
.type-fire      { background: #8b350044; color: #ff7d40; border: 1px solid #8b350066; }
.type-water     { background: #1a3a8b44; color: #5898fa; border: 1px solid #1a3a8b66; }
.type-grass     { background: #1a5a1a44; color: #6abf69; border: 1px solid #1a5a1a66; }
.type-electric  { background: #6b5a0044; color: #ffd740; border: 1px solid #6b5a0066; }
.type-ice       { background: #1a5a6a44; color: #66d9ef; border: 1px solid #1a5a6a66; }
.type-fighting  { background: #6a1a0044; color: #e05050; border: 1px solid #6a1a0066; }
.type-poison    { background: #4a0a6a44; color: #c060c0; border: 1px solid #4a0a6a66; }
.type-ground    { background: #6a4a0a44; color: #c09040; border: 1px solid #6a4a0a66; }
.type-flying    { background: #2a2a6a44; color: #8888ee; border: 1px solid #2a2a6a66; }
.type-psychic   { background: #6a0a3a44; color: #f060a0; border: 1px solid #6a0a3a66; }
.type-bug       { background: #3a5a0a44; color: #90c040; border: 1px solid #3a5a0a66; }
.type-rock      { background: #4a4a1a44; color: #b09840; border: 1px solid #4a4a1a66; }
.type-ghost     { background: #2a0a4a44; color: #9060b0; border: 1px solid #2a0a4a66; }
.type-dragon    { background: #1a0a8a44; color: #6060f0; border: 1px solid #1a0a8a66; }
.type-dark      { background: #2a1a0a44; color: #806040; border: 1px solid #2a1a0a66; }
.type-steel     { background: #4a4a5a44; color: #8888aa; border: 1px solid #4a4a5a66; }
.poke-meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.pokemon-card { display: flex; flex-direction: column; gap: 10px; }
.pokemon-mini { display: flex; flex-direction: column; gap: 4px; }
.poke-header { display: flex; gap: 10px; align-items: flex-start; }
.poke-type-pip { width: 4px; min-height: 40px; border-radius: 999px; flex-shrink: 0; }
.poke-name { font-size: 16px; }
.poke-sections { display: flex; flex-direction: column; gap: 4px; }
.stat-bars { display: grid; gap: 6px; margin-top: 8px; }
.stat-bar-row { display: grid; grid-template-columns: 36px 1fr 32px; align-items: center; gap: 8px; font-size: 12px; color: #7a82a0; }
.bar-track { height: 6px; background: #1a2030; border-radius: 999px; overflow: hidden; }
.bar-fill { height: 100%; background: #3a58cc; border-radius: 999px; }
.bar-fill.atk { background: #e05050; }
.statRow { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; color: #7a82a0; padding: 4px 0; border-bottom: 1px solid #1a2030; }
.statRow:last-child { border-bottom: none; }
.outcome-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.caught  { background: #0d2a1a; color: #4ade80; border: 1px solid #1a5235; }
.missed  { background: #1a1a1a; color: #7a82a0; border: 1px solid #2b3246; }
.fainted { background: #2a0e0e; color: #f87171; border: 1px solid #5a1a1a; }
.results-block { text-align: center; padding: 16px 0 8px; }
.result-main { font-size: 32px; font-weight: 700; color: #e4e6ef; }
.type-chart-mini { display: grid; gap: 6px; margin-top: 8px; }
.type-matchup { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.ev-total-row { display: flex; justify-content: space-between; margin-top: 10px; font-size: 13px; color: #7a82a0; padding-top: 8px; border-top: 1px solid #1a2030; }
.iv-note { margin-top: 8px; }
.badge-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
.badge-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px; border-radius: 10px; border: 1px solid #1f2638; background: #0e1120; font-size: 11px; color: #5a6380; opacity: 0.5; }
.badge-item.earned { opacity: 1; border-color: #2a4a2055; background: #0d1a10; color: #a0d090; }
.badge-icon { font-size: 20px; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #c8cde0; cursor: pointer; }
.checkbox-row input { width: auto; }
.graveyard-empty { font-style: italic; text-align: center; padding: 10px; }
.boss-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.boss-poke-card { background: #0b0e14; border: 1px solid #1f2638; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.boss-stats { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: #7a82a0; }
.boss-stats strong { color: #c8cde0; }
.boss-moves { display: flex; gap: 6px; flex-wrap: wrap; }
.move-tag { font-size: 11px; padding: 2px 8px; border-radius: 6px; background: #181e2e; border: 1px solid #252c40; color: #9099b5; }
.boss-list-item { cursor: pointer; }
.boss-list-item.active { border-color: #2a3d8055; background: #111a30; }
.type-matchup-grid { display: grid; gap: 10px; margin-top: 8px; }
.matchup-group { display: flex; flex-direction: column; gap: 6px; }
.matchup-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.matchup-label.weakness { color: #f87171; }
.matchup-label.resist { color: #4ade80; }
.matchup-group > div { display: flex; gap: 6px; flex-wrap: wrap; }
.ability-row { display: flex; gap: 8px; align-items: baseline; font-size: 13px; }
.move-list { display: flex; gap: 6px; flex-wrap: wrap; }
.def-mode-toggle { display: flex; gap: 4px; background: #0b0e14; border: 1px solid #252c40; border-radius: 8px; padding: 3px; }
.def-mode-btn { padding: 5px 10px; border-radius: 6px; border: none; background: transparent; color: #7a82a0; cursor: pointer; font-size: 12px; transition: all 0.15s; white-space: nowrap; }
.def-mode-btn.active { background: #1a2240; color: #e4e6ef; }
.def-mode-btn:hover:not(.active) { color: #c8cde0; }
.pc-box-card { background: #0e1120; border: 1px solid #1f2638; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.pc-box-card .pc-mon-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pc-box-card .pc-mon-meta { font-size: 12px; color: #7a82a0; }
.pc-box-actions { display: flex; gap: 6px; margin-top: 4px; }

/* ── Add Pokémon Modal ── */
.modal-backdrop {
  position: fixed; inset: 0; background: #000000bb;
  display: flex; align-items: center; justify-content: center;
  z-index: 999; padding: 16px;
}
.modal {
  background: #111520; border: 1px solid #1f2638; border-radius: 16px;
  padding: 20px; width: 100%; max-width: 480px;
  display: flex; flex-direction: column; gap: 14px;
  max-height: 90vh; overflow-y: auto;
}
.modal h2 { margin: 0; font-size: 18px; }
.search-wrap { position: relative; }
.search-input { width: 100%; }
.dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: #0e1120; border: 1px solid #252c40; border-radius: 10px;
  max-height: 220px; overflow-y: auto; z-index: 10;
}
.dropdown-item {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 8px 12px; cursor: pointer; font-size: 13px;
  border-bottom: 1px solid #1a2030; transition: background 0.1s;
}
.dropdown-item:last-child { border-bottom: none; }
.dropdown-item:hover { background: #181e2e; }
.dropdown-item.selected { background: #1a2240; }
.dropdown-empty { padding: 12px; text-align: center; color: #5a6380; font-size: 13px; }
.preview-card {
  background: #0b0e14; border: 1px solid #1f2638; border-radius: 10px; padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.preview-header { display: flex; align-items: center; justify-content: space-between; }
.preview-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 4px; }
.preview-stat { background: #111520; border-radius: 6px; padding: 5px 8px; font-size: 12px; display: flex; flex-direction: column; gap: 1px; }
.preview-stat span { color: #5a6380; font-size: 10px; text-transform: uppercase; }
.preview-stat strong { color: #e4e6ef; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
`;

// =====================================================================
// CONSTANTS
// =====================================================================
const API_BASE = "http://localhost:5000";

const defenderDB = {
  emerald: {
    label: "Pokémon Emerald",
    routes: {
      route_101: { label: "Route 101", trainers: { wild: { label: "Wild Pokémon", team: [
        { species: "Zigzagoon", level: 2, type: "Normal",  hp: 38, def: 35, spd: 35, atk: 30, spe: 60, moves: ["Tackle", "Growl"] },
        { species: "Wurmple",   level: 2, type: "Bug",     hp: 45, def: 35, spd: 30, atk: 35, spe: 20, moves: ["Tackle", "String Shot"] }
      ]}}},
      route_104: { label: "Route 104", trainers: {
        youngster_billy: { label: "Youngster Billy", team: [{ species: "Zigzagoon", level: 5, type: "Normal", hp: 38, def: 35, spd: 35, atk: 30, spe: 60, moves: ["Tackle","Growl","Tail Whip"] }]},
        lass_haley:      { label: "Lass Haley",      team: [{ species: "Shroomish",  level: 6, type: "Grass",  hp: 60, def: 40, spd: 60, atk: 40, spe: 35, moves: ["Absorb","Tackle"] }]}
      }},
      rustboro_gym: { label: "Rustboro City Gym", trainers: {
        hiker_devin: { label: "Hiker Devin",    team: [{ species: "Geodude", level: 9,  type: "Rock/Ground", hp: 40, def: 100, spd: 55, atk: 80, spe: 20, moves: ["Tackle"] },{ species: "Geodude", level: 9, type: "Rock/Ground", hp: 40, def: 100, spd: 55, atk: 80, spe: 20, moves: ["Tackle"] }]},
        roxanne:     { label: "Leader Roxanne", team: [{ species: "Geodude",  level: 14, type: "Rock/Ground", hp: 40, def: 100, spd: 55, atk: 80, spe: 20, moves: ["Tackle","Defense Curl","Mud Sport"] },{ species: "Nosepass", level: 15, type: "Rock", hp: 30, def: 115, spd: 70, atk: 45, spe: 30, moves: ["Tackle","Harden","Rock Throw"] }]}
      }},
      dewford_gym:  { label: "Dewford Town Gym",   trainers: { brawly:  { label: "Leader Brawly",  team: [{ species: "Machop",   level: 17, type: "Fighting", hp: 70, def: 50, spd: 35, atk: 80, spe: 35, moves: ["Karate Chop","Low Kick"] },{ species: "Makuhita", level: 18, type: "Fighting", hp: 72, def: 30, spd: 25, atk: 60, spe: 25, moves: ["Arm Thrust","Fake Out","Vital Throw"] }]}}},
      mauville_gym: { label: "Mauville City Gym",  trainers: { wattson: { label: "Leader Wattson", team: [{ species: "Magnemite", level: 22, type: "Electric/Steel", hp: 25, def: 115, spd: 55, atk: 35, spe: 45, moves: ["SonicBoom","Thunder Wave","Thundershock"] },{ species: "Voltorb", level: 20, type: "Electric", hp: 40, def: 30, spd: 55, atk: 30, spe: 100, moves: ["Rollout","Shock Wave"] },{ species: "Magneton", level: 24, type: "Electric/Steel", hp: 25, def: 115, spd: 70, atk: 60, spe: 70, moves: ["Thunder Wave","Supersonic","Shock Wave"] }]}}}
    }
  },
  ruby_sapphire:     { label: "Ruby / Sapphire",    routes: { route_101: { label: "Route 101", trainers: { wild: { label: "Wild Pokémon", team: [{ species: "Zigzagoon", level: 2, type: "Normal", hp: 38, def: 35, spd: 35, atk: 30, spe: 60, moves: ["Tackle"] }]}}}, rustboro_gym: { label: "Rustboro City Gym", trainers: { roxanne: { label: "Leader Roxanne", team: [{ species: "Geodude", level: 12, type: "Rock/Ground", hp: 40, def: 100, spd: 55, atk: 80, spe: 20, moves: ["Tackle","Defense Curl"] },{ species: "Nosepass", level: 14, type: "Rock", hp: 30, def: 115, spd: 70, atk: 45, spe: 30, moves: ["Tackle","Harden","Rock Throw"] }]}}} }},
  firered_leafgreen: { label: "FireRed / LeafGreen", routes: { route_1: { label: "Route 1", trainers: { wild: { label: "Wild Pokémon", team: [{ species: "Pidgey", level: 3, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle","Sand Attack"] },{ species: "Rattata", level: 2, type: "Normal", hp: 30, def: 35, spd: 40, atk: 56, spe: 72, moves: ["Tackle","Tail Whip"] }]}}}, pewter_gym: { label: "Pewter City Gym", trainers: { brock: { label: "Leader Brock", team: [{ species: "Geodude", level: 12, type: "Rock/Ground", hp: 40, def: 100, spd: 55, atk: 80, spe: 20, moves: ["Tackle","Defense Curl"] },{ species: "Onix", level: 14, type: "Rock/Ground", hp: 35, def: 160, spd: 30, atk: 45, spe: 70, moves: ["Tackle","Screech","Bide"] }]}}} }},
  red_blue:          { label: "Red / Blue",          routes: { route_1: { label: "Route 1", trainers: { wild: { label: "Wild Pokémon", team: [{ species: "Pidgey", level: 3, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle"] },{ species: "Rattata", level: 2, type: "Normal", hp: 30, def: 35, spd: 40, atk: 56, spe: 72, moves: ["Tackle"] }]}}}, pewter_gym: { label: "Pewter City Gym", trainers: { brock: { label: "Leader Brock", team: [{ species: "Geodude", level: 12, type: "Rock/Ground", hp: 40, def: 100, spd: 55, atk: 80, spe: 20, moves: ["Tackle"] },{ species: "Onix", level: 14, type: "Rock/Ground", hp: 35, def: 160, spd: 30, atk: 45, spe: 70, moves: ["Tackle","Screech"] }]}}} }},
  gold_silver:       { label: "Gold / Silver",       routes: { route_29: { label: "Route 29", trainers: { wild: { label: "Wild Pokémon", team: [{ species: "Pidgey", level: 2, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle"] },{ species: "Sentret", level: 2, type: "Normal", hp: 35, def: 44, spd: 45, atk: 46, spe: 20, moves: ["Scratch"] }]}}}, violet_gym: { label: "Violet City Gym", trainers: { falkner: { label: "Leader Falkner", team: [{ species: "Pidgey", level: 7, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle","Sand Attack"] },{ species: "Pidgeotto", level: 9, type: "Normal/Flying", hp: 63, def: 55, spd: 50, atk: 60, spe: 71, moves: ["Tackle","Sand Attack","Gust"] }]}}} }},
  crystal:           { label: "Crystal",             routes: { route_29: { label: "Route 29", trainers: { wild: { label: "Wild Pokémon", team: [{ species: "Pidgey", level: 2, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle"] },{ species: "Sentret", level: 2, type: "Normal", hp: 35, def: 44, spd: 45, atk: 46, spe: 20, moves: ["Scratch"] }]}}}, violet_gym: { label: "Violet City Gym", trainers: { falkner: { label: "Leader Falkner", team: [{ species: "Pidgey", level: 7, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle","Sand Attack","Gust"] },{ species: "Pidgeotto", level: 9, type: "Normal/Flying", hp: 63, def: 55, spd: 50, atk: 60, spe: 71, moves: ["Sand Attack","Gust","Quick Attack"] }]}}} }}
};

// =====================================================================
// HELPERS
// =====================================================================
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

let nextId = 3;

// =====================================================================
// ADD POKÉMON MODAL
// =====================================================================
function AddPokemonModal({ onClose, onAdd }) {
  const [search, setSearch]       = useState("");
  const [results, setResults]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [level, setLevel]         = useState(5);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(false);
  const debounceRef               = useRef(null);
  const inputRef                  = useRef(null);

  // Fetch all on mount so dropdown is populated from the start
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
      const res  = await fetch(url);
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
        hp:  selected.hp,
        atk: selected.attack,
        def: selected.defense,
        spa: selected.sp_attack,
        spd: selected.sp_defense,
        spe: selected.speed,
      },
      nature: "Hardy (Neutral)",
      ability: capitalize(selected.ability1 || ""),
      moves: ["", "", "", ""],
      dbData: selected,
    });
    onClose();
  }

  const filtered = results.slice(0, 80); // cap dropdown at 80 items

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="rowBetween">
          <h2>Add Pokémon to Party</h2>
          <button className="ghost small" onClick={onClose}>✕</button>
        </div>

        {/* Search input + dropdown */}
        <div>
          <label>Search Pokémon (Gen 1–3)
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
                  {!loading && filtered.length === 0 && (
                    <div className="dropdown-empty">No Pokémon found</div>
                  )}
                  {!loading && filtered.map(p => {
                    const types = [p.type1, p.type2].filter(Boolean);
                    return (
                      <div
                        key={p.id}
                        className={`dropdown-item${selected?.id === p.id ? " selected" : ""}`}
                        onMouseDown={() => handleSelect(p)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="muted small">#{String(p.id).padStart(3,"0")}</span>
                          <strong>{capitalize(p.name)}</strong>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {types.map(t => (
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

        {/* Level input */}
        <label>Starting Level
          <input type="number" min="1" max="100" value={level}
            onChange={e => setLevel(e.target.value)} style={{ marginTop: 5 }} />
        </label>

        {/* Selected Pokémon preview */}
        {selected && (
          <div className="preview-card">
            <div className="preview-header">
              <div>
                <strong style={{ fontSize: 16 }}>{capitalize(selected.name)}</strong>
                <span className="muted small" style={{ marginLeft: 8 }}>#{String(selected.id).padStart(3,"0")}</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[selected.type1, selected.type2].filter(Boolean).map(t => (
                  <span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>
                ))}
              </div>
            </div>

            <div className="preview-stats">
              {[["HP", selected.hp],["Atk", selected.attack],["Def", selected.defense],
                ["SpA", selected.sp_attack],["SpD", selected.sp_defense],["Spe", selected.speed]].map(([lbl, val]) => (
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
          <button className="btn" disabled={!selected} onClick={handleAdd}
            style={{ opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "default" }}>
            Add to Party
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// POKEMON PARTY CARD
// =====================================================================
function PokemonCard({ mon, onSendToBox, onRemove, onNavigate }) {
  return (
    <div className="card pokemon-card">
      <div className="poke-header">
        <div className={`poke-type-pip type-${mon.primaryType}`}></div>
        <div style={{ flex: 1 }}>
          <div className="rowBetween">
            <strong className="poke-name">{mon.name}</strong>
            <span className="badge">Lv {mon.level}</span>
          </div>
          <div className="poke-meta">
            <select className="mini-select" defaultValue={mon.gender}>
              <option>♂ Male</option><option>♀ Female</option><option>— Genderless</option>
            </select>
            {mon.types.map(t => (
              <span key={t} className={`type-chip type-${t.toLowerCase()}`}>{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="poke-sections">
        <details open>
          <summary>Core Stats</summary>
          <div className="formGrid tight">
            {[["HP","hp"],["Atk","atk"],["Def","def"],["SpA","spa"],["SpD","spd"],["Spe","spe"]].map(([lbl,key]) => (
              <label key={key}>{lbl}<input defaultValue={mon.stats[key]} type="number" /></label>
            ))}
          </div>
        </details>
        <details>
          <summary>Nature &amp; Ability</summary>
          <div className="formGrid tight">
            <label>Nature<select defaultValue={mon.nature}><option>{mon.nature}</option><option>Adamant (+Atk, -SpA)</option><option>Jolly (+Spe, -SpA)</option><option>Modest (+SpA, -Atk)</option><option>Timid (+Spe, -Atk)</option><option>Bold (+Def, -Atk)</option></select></label>
            <label>Ability
              <select defaultValue={mon.ability}>
                {mon.dbData ? (
                  [mon.dbData.ability1, mon.dbData.ability2, mon.dbData.ability_hidden]
                    .filter(Boolean)
                    .map(a => <option key={a}>{capitalize(a)}</option>)
                ) : (
                  <option>{mon.ability}</option>
                )}
              </select>
            </label>
          </div>
        </details>
        <details>
          <summary>Moves (4)</summary>
          <div className="formGrid tight">
            {[0,1,2,3].map(i => (
              <label key={i}>Move {i+1}<input defaultValue={mon.moves[i]} placeholder="—" /></label>
            ))}
          </div>
        </details>
      </div>
      <div className="row">
        <button className="btn small">Save</button>
        <button className="ghost small" onClick={() => onNavigate("ivev")}>IV/EV</button>
        <button className="ghost small" onClick={() => onSendToBox(mon.id)}>📦 To Box</button>
        <button className="ghost small danger" onClick={() => onRemove(mon.id)}>Remove</button>
      </div>
    </div>
  );
}

// =====================================================================
// SCREENS
// =====================================================================
function GenScreen({ onSelectGen }) {
  const gens = [
    { n: 1, label: "Red / Blue / Yellow", supported: true },
    { n: 2, label: "Gold / Silver / Crystal", supported: true },
    { n: 3, label: "Ruby / Sapphire / Emerald", supported: true },
    { n: 4, label: "Diamond / Pearl / Platinum", supported: false },
    { n: 5, label: "Black / White", supported: false },
    { n: 6, label: "X / Y", supported: false },
  ];
  return (
    <section>
      <div className="page-header">
        <h1>Choose Generation</h1>
        <p className="muted">This affects mechanics, stats, and lookups. Gen 1–3 fully supported.</p>
      </div>
      <div className="gen-grid">
        {gens.map(g => (
          <button key={g.n} className={`card gen ${g.supported ? "supported" : "future"}`}
            disabled={!g.supported} onClick={() => g.supported && onSelectGen(g.n)}>
            <span className="gen-num">Gen {g.n}</span>
            <span className="gen-label">{g.label}</span>
            <span className={`gen-badge ${g.supported ? "supported-badge" : "future-badge"}`}>
              {g.supported ? "✓ Supported" : "Stretch Goal"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DashboardScreen({ party, onNavigate, onOpenAdd }) {
  return (
    <section>
      <div className="page-header">
        <h1>Run Dashboard</h1>
        <p className="muted">Emerald Nuzlocke — Active · 2 Badges</p>
      </div>
      <div className="twoCol">
        <div className="col">
          <details open className="panel">
            <summary>Team Preview</summary>
            <div className="grid">
              {party.map(mon => (
                <div key={mon.id} className="card pokemon-mini" style={{ cursor: "pointer" }}
                  onClick={() => onNavigate("team")}>
                  <div className={`poke-type-pip type-${mon.primaryType}`}></div>
                  <strong>{mon.name}</strong>
                  <div className="muted">Lv {mon.level} · {mon.types.join("/")}</div>
                </div>
              ))}
              {/* Fill remaining empty slots up to 6 */}
              {Array.from({ length: Math.max(0, 6 - party.length) }).map((_, i) => (
                <div key={i} className="card empty" onClick={onOpenAdd}>+ Add</div>
              ))}
            </div>
          </details>
          <details open className="panel">
            <summary>Quick Actions</summary>
            <div className="btn-group">
              <button className="btn" onClick={() => onNavigate("team")}>Manage Team</button>
              <button className="btn" onClick={() => onNavigate("encounters")}>Go to Encounters</button>
              <button className="btn" onClick={() => onNavigate("calculator")}>Open Calculator</button>
              <button className="btn" onClick={() => onNavigate("boss")}>Boss Quick Load</button>
              <button className="btn" onClick={() => onNavigate("ivev")}>IV / EV Tracker</button>
            </div>
          </details>
        </div>
        <div className="col">
          <details open className="panel">
            <summary>Recent Encounters</summary>
            <div className="list">
              <div className="listItem"><div><strong>Route 104</strong><div className="muted">Taillow — Caught</div></div><span className="outcome-tag caught">Caught</span></div>
              <div className="listItem"><div><strong>Petalburg Woods</strong><div className="muted">Shroomish — Missed</div></div><span className="outcome-tag missed">Missed</span></div>
            </div>
          </details>
          <details open className="panel">
            <summary>Run Notes</summary>
            <textarea rows="5" placeholder="Strategy notes, reminders..."></textarea>
          </details>
        </div>
      </div>
    </section>
  );
}

function TeamScreen({ party, pcBox, onSendToBox, onRemove, onWithdraw, onRelease, onOpenAdd, onNavigate }) {
  const emptySlots = Math.max(0, 6 - party.length);
  return (
    <section>
      <div className="page-header rowBetween">
        <div>
          <h1>Your Team</h1>
          <p className="muted">Active party (max 6) · Manage stats, moves, and nature. Overflow goes to PC Box.</p>
        </div>
        <button className="btn" onClick={() => document.getElementById("pcBoxAnchor")?.scrollIntoView({ behavior: "smooth" })}>
          💾 PC Box ↓
        </button>
      </div>

      <div className="rowBetween mb8">
        <strong>Active Party <span className="muted small">({party.length} / 6)</span></strong>
        <button className="btn small" onClick={onOpenAdd}>+ Add Pokémon</button>
      </div>

      <div className="grid">
        {party.map(mon => (
          <PokemonCard key={mon.id} mon={mon}
            onSendToBox={onSendToBox} onRemove={onRemove} onNavigate={onNavigate} />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={i} className="card empty big" onClick={onOpenAdd}>+ Add Pokémon</div>
        ))}
      </div>

      {/* PC Box */}
      <div id="pcBoxAnchor" style={{ marginTop: 28 }}>
        <div className="rowBetween mb8">
          <div>
            <strong>💾 PC Box</strong>
            <span className="muted small" style={{ marginLeft: 8 }}>({pcBox.length} stored)</span>
          </div>
          <span className="muted small">Pokémon here can be withdrawn back to party</span>
        </div>
        <div className="grid">
          {pcBox.length === 0 ? (
            <div className="card empty big" style={{ gridColumn: "1 / -1" }}>
              📦 PC Box is empty. Send Pokémon here when your party is full.
            </div>
          ) : (
            pcBox.map((mon, idx) => (
              <div key={idx} className="pc-box-card">
                <div className="pc-mon-header">
                  <strong>{mon.name}</strong>
                  <span className="badge">Lv {mon.level}</span>
                </div>
                <div className="pc-mon-meta" style={{ margin: "4px 0" }}>
                  {mon.types.map(t => (
                    <span key={t} className={`type-chip type-${t.toLowerCase().split("/")[0]}`}>{t}</span>
                  ))}
                </div>
                {mon.moves.filter(Boolean).length > 0 && (
                  <div className="pc-mon-meta">{mon.moves.filter(Boolean).slice(0,4).join(" · ")}</div>
                )}
                <div className="pc-box-actions">
                  <button className="btn small" onClick={() => onWithdraw(idx)}>⬆ Withdraw</button>
                  <button className="ghost small danger" onClick={() => onRelease(idx)}>Release</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function EncountersScreen({ onNavigate }) {
  return (
    <section>
      <div className="page-header"><h1>Encounters</h1><p className="muted">Log encounters and damage events per route.</p></div>
      <div className="twoCol">
        <div className="col">
          <div className="rowBetween mb8"><strong>Encounter List</strong><button className="btn small">+ Add</button></div>
          <div className="list">
            <div className="listItem active"><div><strong>Route 104</strong><div className="muted">Taillow — Caught</div></div><span className="outcome-tag caught">Caught</span></div>
            <div className="listItem"><div><strong>Petalburg Woods</strong><div className="muted">Shroomish — Missed</div></div><span className="outcome-tag missed">Missed</span></div>
            <div className="listItem"><div><strong>Route 116</strong><div className="muted">Whismur — Fainted</div></div><span className="outcome-tag fainted">Fainted</span></div>
          </div>
        </div>
        <div className="col">
          <details open className="panel">
            <summary>Encounter Details</summary>
            <div className="formGrid">
              <label>Area<input defaultValue="Route 104" /></label>
              <label>Opponent<input defaultValue="Taillow" /></label>
              <label>Opponent Level<input defaultValue="10" type="number" /></label>
              <label>Outcome<select><option>Caught</option><option>Fainted</option><option>Fled</option><option>Missed</option></select></label>
            </div>
            <label>Notes<textarea rows="2" placeholder="Notes..."></textarea></label>
          </details>
          <details open className="panel">
            <summary>Damage Events</summary>
            <div className="list">
              <div className="listItem"><div><strong>Turn 1</strong><div className="muted">Breloom → Taillow | Mach Punch | 12 dmg</div></div><button className="ghost small" onClick={() => onNavigate("calculator")}>Calc</button></div>
              <div className="listItem"><div><strong>Turn 2</strong><div className="muted">Taillow → Breloom | Peck | 8 dmg</div></div><button className="ghost small" onClick={() => onNavigate("calculator")}>Calc</button></div>
            </div>
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

function CalculatorScreen({ onNavigate }) {
  const [defMode, setDefMode] = useState("lookup");
  const [gameKey, setGameKey] = useState("");
  const [routeKey, setRouteKey] = useState("");
  const [trainerKey, setTrainerKey] = useState("");
  const [pokeIdx, setPokeIdx] = useState("");
  const [preview, setPreview] = useState(null);
  const routes   = gameKey && defenderDB[gameKey] ? Object.entries(defenderDB[gameKey].routes) : [];
  const trainers = gameKey && routeKey && defenderDB[gameKey]?.routes[routeKey] ? Object.entries(defenderDB[gameKey].routes[routeKey].trainers) : [];
  const team     = gameKey && routeKey && trainerKey ? defenderDB[gameKey].routes[routeKey].trainers[trainerKey]?.team || [] : [];
  const handlePokeChange = idx => { setPokeIdx(idx); setPreview(idx !== "" ? team[parseInt(idx)] : null); };
  return (
    <section>
      <div className="page-header"><h1>Damage Calculator</h1><p className="muted">Gen 3 mechanics · parity target with Pokémon Showdown.</p></div>
      <div className="twoCol">
        <div className="col">
          <details open className="panel">
            <summary>Attacker</summary>
            <div className="formGrid">
              <label>Pokémon (team)<select><option>Breloom</option><option>Gyarados</option><option>Manual...</option></select></label>
              <label>Level<input defaultValue="24" type="number" /></label>
              <label>Atk / SpA<input defaultValue="90" type="number" /></label>
              <label>Nature Modifier<select><option value="1">Neutral (1.0×)</option><option value="1.1">+10% (1.1×)</option><option value="0.9">−10% (0.9×)</option></select></label>
            </div>
          </details>
          <details open className="panel">
            <summary>Defender</summary>
            <div className="rowBetween mb8" style={{ marginTop: 8 }}>
              <span className="muted small">Input mode:</span>
              <div className="def-mode-toggle">
                <button className={`def-mode-btn${defMode==="lookup"?" active":""}`} onClick={() => setDefMode("lookup")}>🔍 Game Lookup</button>
                <button className={`def-mode-btn${defMode==="manual"?" active":""}`} onClick={() => setDefMode("manual")}>⚙ Showdown / Manual</button>
              </div>
            </div>
            {defMode === "lookup" && (
              <div>
                <div className="formGrid">
                  <label>Game<select value={gameKey} onChange={e=>{setGameKey(e.target.value);setRouteKey("");setTrainerKey("");setPokeIdx("");setPreview(null);}}><option value="">Select Game...</option>{Object.entries(defenderDB).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>
                  <label>Route / Location<select value={routeKey} disabled={!gameKey} onChange={e=>{setRouteKey(e.target.value);setTrainerKey("");setPokeIdx("");setPreview(null);}}><option value="">Select Route...</option>{routes.map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>
                  <label>Trainer<select value={trainerKey} disabled={!routeKey} onChange={e=>{setTrainerKey(e.target.value);setPokeIdx("");setPreview(null);}}><option value="">Select Trainer...</option>{trainers.map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>
                  <label>Opponent Pokémon<select value={pokeIdx} disabled={!trainerKey} onChange={e=>handlePokeChange(e.target.value)}><option value="">Select Pokémon...</option>{team.map((p,i)=><option key={i} value={i}>Lv.{p.level} {p.species}</option>)}</select></label>
                </div>
                {preview && (
                  <div className="stack mt8">
                    <div className="statRow"><span>Type</span><strong>{preview.type}</strong></div>
                    <div className="statRow"><span>Level</span><strong>{preview.level}</strong></div>
                    <div className="statRow"><span>HP</span><strong>{preview.hp}</strong></div>
                    <div className="statRow"><span>Def / SpD</span><strong>{preview.def} / {preview.spd}</strong></div>
                    <div className="statRow"><span>Moves</span><strong style={{fontSize:12,textAlign:"right"}}>{preview.moves.join(", ")}</strong></div>
                    <div className="muted small">Stats auto-loaded · Switch to Manual to override</div>
                  </div>
                )}
              </div>
            )}
            {defMode === "manual" && (
              <div>
                <div className="formGrid">
                  <label>Species / Label<input placeholder="e.g. Nosepass" /></label>
                  <label>Level<input defaultValue="10" type="number" /></label>
                  <label>HP<input defaultValue="35" type="number" /></label>
                  <label>Def / SpD<input defaultValue="20" type="number" /></label>
                  <label>Atk<input defaultValue="30" type="number" /></label>
                  <label>Spe<input defaultValue="25" type="number" /></label>
                </div>
                <div className="muted small mt8">💡 Paste stats from Pokémon Showdown or enter manually.</div>
              </div>
            )}
          </details>
          <details open className="panel">
            <summary>Move</summary>
            <div className="formGrid">
              <label>Move Power<input defaultValue="40" type="number" /></label>
              <label>Category<select><option>Physical</option><option>Special</option></select></label>
              <label>STAB<select><option>Yes (1.5×)</option><option>No (1.0×)</option></select></label>
              <label>Effectiveness<select><option>0.25×</option><option>0.5×</option><option>1×</option><option>2×</option><option>4×</option></select></label>
            </div>
            <div className="row mt8"><button className="btn">Calculate</button><button className="ghost">Save to Encounter</button></div>
          </details>
          <details className="panel"><summary>Advanced (later)</summary><div className="muted small">Crit, held items, weather, stat stages, abilities — Gen 3 parity pass.</div></details>
        </div>
        <div className="col">
          <details open className="panel">
            <summary>Results</summary>
            <div className="results-block"><div className="result-main">12 – 16</div><div className="muted">damage range</div></div>
            <div className="stack mt8">
              <div className="statRow"><span>% of HP</span><strong>35% – 46%</strong></div>
              <div className="statRow"><span>KO Estimate</span><strong>2HKO</strong></div>
              <div className="statRow"><span>Crit Damage</span><strong>18 – 24</strong></div>
            </div>
          </details>
          <details open className="panel">
            <summary>Type Chart Reference</summary>
            <div className="type-chart-mini">
              <div className="muted small">Quick lookup — Fighting vs common types</div>
              {[["normal","2×"],["rock","2×"],["ice","2×"],["psychic","0.5×"],["flying","0.5×"],["ghost","0×"]].map(([t,eff])=>(
                <div key={t} className="type-matchup"><span className={`type-chip type-${t}`}>{capitalize(t)}</span><strong>{eff}</strong></div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

function IvEvScreen() {
  const [evs, setEvs] = useState({ hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 });
  const total = Object.values(evs).reduce((s,v) => s + (parseInt(v)||0), 0);
  const totalColor = total > 510 ? "#f87171" : total === 510 ? "#4ade80" : undefined;
  return (
    <section>
      <div className="page-header"><h1>IV / EV Tracker</h1><p className="muted">Track Individual Values and Effort Values per Pokémon.</p></div>
      <div className="twoCol">
        <div className="col">
          <details open className="panel">
            <summary>Select Pokémon</summary>
            <div className="formGrid">
              <label>Pokémon<select><option>Breloom</option><option>Gyarados</option></select></label>
              <label>Level<input defaultValue="24" type="number" /></label>
            </div>
          </details>
          <details open className="panel">
            <summary>Individual Values (IVs) <span className="muted small">0–31 per stat</span></summary>
            <div className="formGrid">
              {[["HP IV",28],["Atk IV",31],["Def IV",14],["SpA IV",10],["SpD IV",22],["Spe IV",19]].map(([lbl,val])=>(
                <label key={lbl}>{lbl}<input defaultValue={val} type="number" min="0" max="31" /></label>
              ))}
            </div>
            <div className="iv-note muted small">💡 Gen 1/2: IVs are 0–15 (DVs). Gen 3: 0–31.</div>
          </details>
        </div>
        <div className="col">
          <details open className="panel">
            <summary>Effort Values (EVs) <span className="muted small">0–255 per stat, 510 total</span></summary>
            <div className="formGrid">
              {Object.entries(evs).map(([stat,val])=>(
                <label key={stat}>{stat.toUpperCase()} EV<input value={val} type="number" min="0" max="255" onChange={e=>setEvs(p=>({...p,[stat]:e.target.value}))} /></label>
              ))}
            </div>
            <div className="ev-total-row"><span>Total EVs Used:</span><strong style={{color:totalColor}}>{total} / 510</strong></div>
          </details>
          <details open className="panel">
            <summary>Calculated Final Stats</summary>
            <div className="stack">
              {["HP","Attack","Defense","Sp. Atk","Sp. Def","Speed"].map(s=>(
                <div key={s} className="statRow"><span>{s}</span><strong>—</strong></div>
              ))}
            </div>
            <div className="muted small mt8">Formula calculation coming in main build phase.</div>
          </details>
        </div>
      </div>
    </section>
  );
}

function TrainerScreen() {
  const badges = [
    {icon:"🪨",name:"Stone",earned:true},{icon:"✊",name:"Knuckle",earned:true},
    {icon:"⚡",name:"Dynamo",earned:false},{icon:"🔥",name:"Heat",earned:false},
    {icon:"⚖",name:"Balance",earned:false},{icon:"🪶",name:"Feather",earned:false},
    {icon:"🔮",name:"Mind",earned:false},{icon:"🌊",name:"Rain",earned:false},
  ];
  return (
    <section>
      <div className="page-header"><h1>Trainer Profile</h1><p className="muted">Your challenge run identity and progress tracker.</p></div>
      <div className="twoCol">
        <div className="col">
          <details open className="panel">
            <summary>Run Info</summary>
            <div className="formGrid">
              <label>Trainer Name<input defaultValue="Martin" /></label>
              <label>Game<select><option>Pokémon Emerald</option><option>Pokémon Ruby</option><option>Pokémon Sapphire</option><option>Pokémon FireRed</option><option>Pokémon LeafGreen</option><option>Pokémon Red</option><option>Pokémon Blue</option><option>Pokémon Yellow</option><option>Pokémon Gold</option><option>Pokémon Silver</option><option>Pokémon Crystal</option></select></label>
              <label>Challenge Type<select><option>Nuzlocke</option><option>Hardcore Nuzlocke</option><option>Wedlocke</option><option>Monotype</option><option>Solo Run</option><option>Custom ROM Hack</option></select></label>
              <label>Run Status<select><option>Active</option><option>Completed</option><option>Wiped (Failed)</option><option>Paused</option></select></label>
            </div>
          </details>
          <details open className="panel">
            <summary>Custom Rules</summary>
            <div className="stack">
              {[["Fainted Pokémon are dead (permadeath)",true],["Only catch first encounter per route",true],["Species / duplication clause",false],["Nickname all Pokémon",false],["No items in battle",false]].map(([lbl,chk])=>(
                <label key={lbl} className="checkbox-row"><input type="checkbox" defaultChecked={chk} style={{width:"auto"}} /> {lbl}</label>
              ))}
            </div>
            <textarea rows="3" className="mt8" placeholder="Additional custom rules..."></textarea>
          </details>
        </div>
        <div className="col">
          <details open className="panel">
            <summary>Badge Progress</summary>
            <div className="badge-grid">
              {badges.map(b=>(
                <div key={b.name} className={`badge-item${b.earned?" earned":""}`}>
                  <div className="badge-icon">{b.icon}</div><span>{b.name}</span>
                </div>
              ))}
            </div>
          </details>
          <details open className="panel">
            <summary>Run Stats</summary>
            <div className="stack">
              {[["Total Encounters",3],["Pokémon Caught",2],["Deaths",0],["Badges Earned","2 / 8"],["Current Location","Mauville City"]].map(([k,v])=>(
                <div key={k} className="statRow"><span>{k}</span><strong>{v}</strong></div>
              ))}
            </div>
          </details>
          <details className="panel">
            <summary>Graveyard</summary>
            <div className="muted small">Pokémon lost during this run will appear here.</div>
            <div className="list mt8"><div className="graveyard-empty muted">— No deaths yet. Keep it that way. —</div></div>
          </details>
        </div>
      </div>
    </section>
  );
}

function BossScreen({ onNavigate }) {
  const [activeBoss, setActiveBoss] = useState("roxanne");
  const bossList = [
    {key:"roxanne",name:"Roxanne",sub:"Gym 1 · Rustboro City · Rock",type:"rock"},
    {key:"brawly", name:"Brawly", sub:"Gym 2 · Dewford Town · Fighting",type:"fighting"},
    {key:"wattson",name:"Wattson",sub:"Gym 3 · Mauville City · Electric",type:"electric"},
    {key:"flannery",name:"Flannery",sub:"Gym 4 · Lavaridge Town · Fire",type:"fire"},
    {key:"norman", name:"Norman", sub:"Gym 5 · Petalburg City · Normal",type:"normal"},
    {key:"winona", name:"Winona", sub:"Gym 6 · Fortree City · Flying",type:"flying"},
  ];
  return (
    <section>
      <div className="page-header"><h1>Boss Data</h1><p className="muted">Gym leaders, rivals, and Elite Four — preset data for Gen 3.</p></div>
      <div className="twoCol">
        <div className="col">
          <div className="rowBetween mb8">
            <strong>Bosses — Emerald</strong>
            <select style={{width:"auto",padding:"6px 10px",fontSize:13}}><option>Emerald</option><option>Ruby / Sapphire</option><option>FireRed / LeafGreen</option></select>
          </div>
          <div className="list">
            {bossList.map(b=>(
              <div key={b.key} className={`listItem boss-list-item${activeBoss===b.key?" active":""}`} onClick={()=>setActiveBoss(b.key)}>
                <div><strong>{b.name}</strong><div className="muted">{b.sub}</div></div>
                <span className={`type-chip type-${b.type}`}>{capitalize(b.type)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col">
          <details open className="panel">
            <summary>Roxanne — Gym 1</summary>
            <div className="boss-meta"><span className="type-chip type-rock">Rock</span><span className="muted small">Rustboro City · Lv 14–15 range</span></div>
            <div className="list mt8">
              {[
                {name:"Geodude", level:14, types:["Rock","Ground"], stats:{HP:40,Atk:60,Def:80,SpA:30,SpD:30,Spe:20}, moves:["Tackle","Defense Curl","Mud Sport"]},
                {name:"Nosepass",level:15, types:["Rock"],           stats:{HP:45,Atk:30,Def:115,SpA:45,SpD:90,Spe:30},moves:["Tackle","Harden","Rock Throw"]},
              ].map(p=>(
                <div key={p.name} className="boss-poke-card">
                  <div className="rowBetween">
                    <strong>{p.name}</strong>
                    <div><span className="badge">Lv {p.level}</span>{p.types.map(t=><span key={t} className={`type-chip type-${t.toLowerCase()}`}>{t}</span>)}</div>
                  </div>
                  <div className="boss-stats">{Object.entries(p.stats).map(([k,v])=><span key={k}>{k} <strong>{v}</strong></span>)}</div>
                  <div className="boss-moves">{p.moves.map(m=><span key={m} className="move-tag">{m}</span>)}</div>
                </div>
              ))}
            </div>
            <div className="row mt8">
              <button className="btn small" onClick={()=>onNavigate("calculator")}>Load into Calc</button>
              <button className="ghost small">Export Team</button>
            </div>
          </details>
          <details className="panel">
            <summary>Threat Notes</summary>
            <textarea rows="4" placeholder="Danger moves, recommended types, strategy notes..." defaultValue="Rock Throw can threaten Flying/Bug types. Nosepass high def — use special attackers or Fighting types if available."></textarea>
          </details>
        </div>
      </div>
    </section>
  );
}

function LookupScreen({ onNavigate }) {
  return (
    <section>
      <div className="page-header"><h1>Pokémon Lookup</h1><p className="muted">386 Pokémon · Gens 1–3 · Data via PokéAPI.</p></div>
      <div className="twoCol">
        <div className="col">
          <div className="panel">
            <label>Search Pokémon<input placeholder="e.g., Breloom, Gardevoir, Mewtwo..." /></label>
            <div className="muted small mt8">National Dex #001–386 supported in MVP.</div>
          </div>
          <div className="card">
            <div className="poke-header">
              <div className="poke-type-pip type-grass"></div>
              <div>
                <div className="rowBetween"><strong className="poke-name">Breloom</strong><span className="badge">#286</span></div>
                <div className="poke-meta"><span className="type-chip type-grass">Grass</span><span className="type-chip type-fighting">Fighting</span></div>
              </div>
            </div>
            <details open>
              <summary>Base Stats</summary>
              <div className="stat-bars">
                {[["HP",60,24,false],["Atk",130,52,true],["Def",80,32,false],["SpA",60,24,false],["SpD",60,24,false],["Spe",70,28,false]].map(([s,v,w,isAtk])=>(
                  <div key={s} className="stat-bar-row"><span>{s}</span><div className="bar-track"><div className={`bar-fill${isAtk?" atk":""}`} style={{width:`${w}%`}}></div></div><strong>{v}</strong></div>
                ))}
              </div>
            </details>
            <details>
              <summary>Abilities</summary>
              <div className="stack small-gap mt8">
                <div className="ability-row"><strong>Effect Spore</strong> <span className="muted">Contact may cause status</span></div>
                <div className="ability-row"><strong>Poison Heal</strong> <span className="muted small">(Hidden)</span></div>
              </div>
            </details>
            <details>
              <summary>Learnset (sample)</summary>
              <div className="move-list mt8">
                {["Mach Punch","Seed Bomb","Sky Uppercut","Spore","Stun Spore"].map(m=><span key={m} className="move-tag">{m}</span>)}
              </div>
            </details>
            <div className="row mt8">
              <button className="btn small" onClick={()=>onNavigate("team")}>Add to Team</button>
              <button className="ghost small" onClick={()=>onNavigate("encounters")}>Set as Opponent</button>
              <button className="ghost small" onClick={()=>onNavigate("calculator")}>Load to Calc</button>
            </div>
          </div>
        </div>
        <div className="col">
          <details open className="panel">
            <summary>Type Effectiveness (against Breloom)</summary>
            <div className="type-matchup-grid">
              <div className="matchup-group"><div className="matchup-label weakness">4× Weak</div><div><span className="type-chip type-flying">Flying</span></div></div>
              <div className="matchup-group"><div className="matchup-label weakness">2× Weak</div><div>{["fire","ice","poison","psychic"].map(t=><span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>)}</div></div>
              <div className="matchup-group"><div className="matchup-label resist">½× Resist</div><div>{["water","grass","electric","ground","rock","dark"].map(t=><span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>)}</div></div>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// ROOT APP
// =====================================================================
const initialParty = [
  { id: 1, name: "Breloom", level: 24, gender: "♂ Male", types: ["Grass","Fighting"], primaryType: "grass",
    stats: {hp:70,atk:90,def:60,spa:60,spd:60,spe:70}, nature: "Adamant (+Atk, -SpA)", ability: "Effect Spore",
    moves: ["Mach Punch","Seed Bomb","",""], dbData: {ability1:"effect-spore",ability2:null,ability_hidden:"poison-heal"} },
  { id: 2, name: "Gyarados", level: 22, gender: "♂ Male", types: ["Water","Flying"], primaryType: "water",
    stats: {hp:95,atk:125,def:79,spa:60,spd:100,spe:81}, nature: "Adamant (+Atk, -SpA)", ability: "Intimidate",
    moves: ["Surf","Bite","",""], dbData: {ability1:"intimidate",ability2:null,ability_hidden:null} },
];

export default function App() {
  const [screen, setScreen]         = useState("gen");
  const [genBadge, setGenBadge]     = useState("—");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [party, setParty]           = useState(initialParty);
  const [pcBox, setPcBox]           = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const navigate = (s) => setScreen(s);

  const handleSelectGen = (n) => { setGenBadge(n); setScreen("dashboard"); };

  // Open the add modal and navigate to team screen
  const handleOpenAdd = () => {
    setScreen("team");
    setShowAddModal(true);
  };

  const handleAddPokemon = (mon) => {
    if (party.length >= 6) { alert("Party is full (6/6)! Send a Pokémon to PC Box first."); return; }
    setParty(prev => [...prev, mon]);
  };

  const handleSendToBox = (id) => {
    if (party.length <= 1) { alert("You need at least 1 Pokémon in your party!"); return; }
    const mon = party.find(m => m.id === id);
    if (!mon) return;
    setParty(prev => prev.filter(m => m.id !== id));
    setPcBox(prev => [...prev, mon]);
  };

  const handleRemove = (id) => {
    if (party.length <= 1) { alert("Party can't be empty! Send them to PC Box first if needed."); return; }
    if (window.confirm("Remove this Pokémon from your run entirely?")) {
      setParty(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleWithdraw = (idx) => {
    if (party.length >= 6) { alert("Party is full (6/6)! Move someone to PC Box first."); return; }
    const mon = pcBox[idx];
    setPcBox(prev => prev.filter((_,i) => i !== idx));
    setParty(prev => [...prev, mon]);
  };

  const handleRelease = (idx) => {
    const mon = pcBox[idx];
    if (window.confirm(`Release ${mon.name} permanently? This can't be undone.`)) {
      setPcBox(prev => prev.filter((_,i) => i !== idx));
    }
  };

  const navItems = [
    {key:"gen",label:"Generation"},{key:"dashboard",label:"Dashboard"},{key:"team",label:"Team"},
    {key:"encounters",label:"Encounters"},{key:"calculator",label:"Calculator"},{key:"ivev",label:"IV / EV"},
    {key:"trainer",label:"Trainer"},{key:"boss",label:"Boss Data"},{key:"lookup",label:"Lookup"},
  ];

  return (
    <>
      <style>{css}</style>

      {showAddModal && (
        <AddPokemonModal
          onClose={() => setShowAddModal(false)}
          onAdd={(mon) => { handleAddPokemon(mon); setShowAddModal(false); }}
        />
      )}

      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">⚔</span>
          <strong>PokeChallenge</strong>
          <span className="badge">Gen {genBadge}</span>
        </div>
        <nav className="nav">
          {navItems.map(({key,label}) => (
            <button key={key} className={`navbtn${screen===key?" active":""}`} onClick={() => navigate(key)}>{label}</button>
          ))}
        </nav>
        <button className="ghost icon-btn" onClick={() => setSidebarOpen(o => !o)}>☰</button>
      </header>

      <div className="shell">
        <aside className={`sidebar${sidebarOpen?"":" collapsed"}`}>
          <h3>Quick Actions</h3>
          <details open>
            <summary>Current Run</summary>
            <div className="stack">
              <div className="row"><span>Run:</span><strong>Emerald Nuzlocke</strong></div>
              <div className="row"><span>Status:</span><strong className="status-active">Active</strong></div>
              <div className="row"><span>Badges:</span><strong>2 / 8</strong></div>
            </div>
          </details>
          <details open>
            <summary>Shortcuts</summary>
            <div className="stack">
              {[["encounters","+ Add Encounter"],["calculator","Open Calculator"],["boss","Boss Quick Load"],["lookup","Search Pokémon"]].map(([s,lbl])=>(
                <button key={s} className="btn" onClick={() => navigate(s)}>{lbl}</button>
              ))}
            </div>
          </details>
          <details>
            <summary>Boss Quick Load</summary>
            <div className="stack">
              {[["roxanne","Roxanne (Gym 1)"],["brawly","Brawly (Gym 2)"],["wattson","Wattson (Gym 3)"],["flannery","Flannery (Gym 4)"]].map(([key,lbl])=>(
                <button key={key} className="btn small" onClick={() => navigate("boss")}>{lbl}</button>
              ))}
            </div>
          </details>
        </aside>

        <main className="main">
          {screen === "gen"        && <GenScreen onSelectGen={handleSelectGen} />}
          {screen === "dashboard"  && <DashboardScreen party={party} onNavigate={navigate} onOpenAdd={handleOpenAdd} />}
          {screen === "team"       && <TeamScreen party={party} pcBox={pcBox} onSendToBox={handleSendToBox} onRemove={handleRemove} onWithdraw={handleWithdraw} onRelease={handleRelease} onOpenAdd={() => setShowAddModal(true)} onNavigate={navigate} />}
          {screen === "encounters" && <EncountersScreen onNavigate={navigate} />}
          {screen === "calculator" && <CalculatorScreen onNavigate={navigate} />}
          {screen === "ivev"       && <IvEvScreen />}
          {screen === "trainer"    && <TrainerScreen />}
          {screen === "boss"       && <BossScreen onNavigate={navigate} />}
          {screen === "lookup"     && <LookupScreen onNavigate={navigate} />}
        </main>
      </div>
    </>
  );
}
