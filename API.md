# API Documentation

Base URL: `http://localhost:5000`

---

## Pokemon

### Get all Pokemon
```
GET /api/pokemon
```
Returns all pokemon ordered by id.

**Optional query params:**
- `search` — filter by name prefix (e.g. `?search=char`)

**Examples:**
```
GET /api/pokemon
GET /api/pokemon?search=char
```

---

### Get a single Pokemon
```
GET /api/pokemon/:id
```

**Example:**
```
GET /api/pokemon/25
```

---

## Moves

### Get all moves
```
GET /api/moves
```
Returns all moves. Supports optional filtering and sorting.

**Optional query params:**
- `search` — filter by name prefix (e.g. `?search=thunder`)
- `type` — filter by type (e.g. `?type=fire`)
- `orderBy=power` — sort by base power descending

**Examples:**
```
GET /api/moves
GET /api/moves?search=thunder
GET /api/moves?type=fire
GET /api/moves?type=fire&orderBy=power
GET /api/moves?orderBy=power
```

---

### Get a single move
```
GET /api/moves/:id
```

**Example:**
```
GET /api/moves/25
```

---

## Encounters

### Get all encounters for a user
```
GET /api/encounters/:user_id
```
Returns all encounters for a given user ordered by id.

**Example:**
```
GET /api/encounters/1
```

---

### Create an encounter
```
POST /api/encounters
```

**Body:**
```json
{
  "user_id": 1,
  "pokemon_id": 25,
  "location": "viridian-forest",
  "nickname": "Sparky",
  "ability": "static",
  "nature": "timid",
  "hp_iv": 31,
  "attack_iv": 31,
  "defense_iv": 31,
  "sp_attack_iv": 31,
  "sp_defense_iv": 31,
  "speed_iv": 31,
  "hp_ev": 0,
  "attack_ev": 0,
  "defense_ev": 0,
  "sp_attack_ev": 0,
  "sp_defense_ev": 0,
  "speed_ev": 0,
  "move1_id": null,
  "move2_id": null,
  "move3_id": null,
  "move4_id": null,
  "item_id": null,
  "status": "alive"
}
```

**Returns:**
```json
{ "id": 1 }
```

---

### Update an encounter (full update)
```
PUT /api/encounters/:id
```
Replaces all fields on the encounter. `user_id` and `pokemon_id` cannot be changed.

**Body:** same fields as POST minus `user_id` and `pokemon_id`.

**Example:**
```
PUT /api/encounters/1
```

---

### Update an encounter (partial update)
```
PATCH /api/encounters/:id
```
Updates only the fields you send. Useful for small changes like EVs, IVs, status, nickname, moves.

**Example — update just EVs:**
```json
{ "hp_ev": 252, "speed_ev": 252 }
```

**Example — mark as dead:**
```json
{ "status": "dead" }
```

**Example — give a nickname:**
```json
{ "nickname": "Sparky" }
```

**Patchable fields:**
`location`, `nickname`, `ability`, `nature`, `status`,
`hp_iv`, `attack_iv`, `defense_iv`, `sp_attack_iv`, `sp_defense_iv`, `speed_iv`,
`hp_ev`, `attack_ev`, `defense_ev`, `sp_attack_ev`, `sp_defense_ev`, `speed_ev`,
`move1_id`, `move2_id`, `move3_id`, `move4_id`, `item_id`

---

### Delete an encounter
```
DELETE /api/encounters/:id
```

**Example:**
```
DELETE /api/encounters/1
```

---

## Damage Calculator

### Calculate damage between two encounters
```
POST /api/pokemon/damage
```
Calculates the min/max damage dealt by the attacker's move against the defender, using their actual stats, IVs, EVs, and level.
TODO: SUPPORT DAMAGE RANGES INSTEAD OF MIN/MAX
**Body:**
```json
{
  "attacker_id": 1,
  "defender_id": 2,
  "move_id": 53,
  "conditions": {
    "weather": "sun",
    "isCrit": false,
    "isBurned": false,
    "atkStage": 0,
    "spAtkStage": 0,
    "defStage": 0,
    "spDefStage": 0
  }
}
```

**Fields:**
- `attacker_id` — encounter id of the attacking pokemon
- `defender_id` — encounter id of the defending pokemon
- `move_id` — id of the move being used
- `conditions` — all optional, defaults to neutral if omitted
  - `weather` — `"sun"`, `"rain"`, or omit for none
  - `isCrit` — boolean, default `false`
  - `isBurned` — boolean, default `false`
  - `atkStage` / `spAtkStage` — stat stages -6 to 6, default `0`
  - `defStage` / `spDefStage` — stat stages -6 to 6, default `0`

**Returns:**
```json
{ "min": 45, "max": 53 }
```