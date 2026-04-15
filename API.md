# API Documentation

Base URL: `http://localhost:5000/api`

---

## Abilities

### GET `/abilities`
Returns a list of all abilities, optionally filtered by name.

**Query Parameters**
| Parameter | Type   | Description                        |
|-----------|--------|------------------------------------|
| `search`  | string | Filter abilities by name prefix    |

**Response** `200 OK`
```json
[
  {
    "id": 66,
    "name": "blaze",
    "effect": "Powers up Fire-type moves in a pinch.",
    "flavor_text": "Powers up Fire-type moves when the Pokémon is in trouble."
  }
]
```

---

### GET `/abilities/:id`
Returns a single ability by ID.

**Response** `200 OK`
```json
{
  "id": 66,
  "name": "blaze",
  "effect": "Powers up Fire-type moves in a pinch.",
  "flavor_text": "Powers up Fire-type moves when the Pokémon is in trouble."
}
```

**Errors**
- `404 Not Found` — ability not found

---

### GET `/abilities/:id/pokemon`
Returns all pokemon that have the given ability in any of their ability slots (ability1, ability2, or hidden ability).

**Response** `200 OK`
```json
[
  {
    "id": 4,
    "name": "charmander",
    "type1": "fire",
    "type2": null,
    "ability1": 66,
    "ability2": null,
    "ability_hidden": 94,
    ...
  }
]
```

**Errors**
- `404 Not Found` — no pokemon found with that ability

---

## Pokemon

### GET `/pokemon`
Returns a list of all pokemon, optionally filtered by name.

**Query Parameters**
| Parameter | Type   | Description                      |
|-----------|--------|----------------------------------|
| `search`  | string | Filter pokemon by name prefix    |

**Response** `200 OK`
```json
[
  {
    "id": 1,
    "name": "bulbasaur",
    "hp": 45,
    "attack": 49,
    "defense": 49,
    "sp_attack": 65,
    "sp_defense": 65,
    "speed": 45,
    "type1": "grass",
    "type2": "poison",
    "ability1": 65,
    "ability2": null,
    "ability_hidden": 34
  }
]
```

---

### GET `/pokemon/:id`
Returns a single pokemon by ID.

**Response** `200 OK` — single pokemon object (same shape as above)

**Errors**
- `404 Not Found` — pokemon not found

---

### GET `/pokemon/:id/locations`
Returns all locations and areas where the given pokemon can be encountered in the wild.

**Response** `200 OK`
```json
[
  {
    "location_id": 1,
    "location_name": "Viridian Forest",
    "area_id": 1,
    "area_name": "Viridian Forest North",
    "encounter_rate": 20,
    "encounter_method": "grass",
    "min_level": 3,
    "max_level": 5
  }
]
```

**Errors**
- `404 Not Found` — pokemon not found

---

### GET `/pokemon/:id/moves`
Returns all moves a pokemon can learn, including learn method and level.

**Response** `200 OK`
```json
[
  {
    "move_id": 10,
    "move_name": "scratch",
    "type": "normal",
    "power": 40,
    "accuracy": 100,
    "pp": 35,
    "learn_method": "level-up",
    "level": 1
  },
  {
    "move_id": 52,
    "move_name": "ember",
    "type": "fire",
    "power": 40,
    "accuracy": 100,
    "pp": 25,
    "learn_method": "level-up",
    "level": 7
  }
]
```

**Errors**
- `404 Not Found` — pokemon not found
---

## Moves

### GET `/moves`
Returns a list of all moves, with optional filtering and sorting.

**Query Parameters**
| Parameter | Type   | Description                                      |
|-----------|--------|--------------------------------------------------|
| `search`  | string | Filter moves by name prefix                      |
| `type`    | string | Filter moves by type (e.g. `fire`, `water`)      |
| `orderBy` | string | Set to `power` to sort by power descending        |

**Response** `200 OK`
```json
[
  {
    "id": 53,
    "name": "flamethrower",
    "type": "fire",
    "power": 90,
    "accuracy": 100,
    "pp": 15
  }
]
```

---

### GET `/moves/:id`
Returns a single move by ID.

**Response** `200 OK` — single move object (same shape as above)

**Errors**
- `404 Not Found` — move not found

---

## Items

### GET `/items`
Returns a list of all items, optionally filtered by name.

**Query Parameters**
| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| `search`  | string | Filter items by name prefix    |

**Response** `200 OK`
```json
[
  {
    "id": 1,
    "name": "potion",
    "category": "medicine",
    "effect": "Restores 20 HP.",
    "effect_long": "A spray-type medicine...",
    "flavor_text": "A spray-type medicine for treating wounds."
  }
]
```

---

### GET `/items/:id`
Returns a single item by ID.

**Response** `200 OK` — single item object (same shape as above)

**Errors**
- `404 Not Found` — item not found

---

## Locations

### GET `/locations`
Returns a list of all locations. Optionally includes sub-areas nested under each location.

**Query Parameters**
| Parameter       | Type    | Description                                   |
|-----------------|---------|-----------------------------------------------|
| `include_areas` | boolean | Set to `true` to include nested areas         |

**Response without `include_areas`** `200 OK`
```json
[
  { "id": 1, "name": "Viridian Forest" }
]
```

**Response with `include_areas=true`** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Viridian Forest",
    "areas": [
      { "id": 1, "loc_id": 1, "name": "Viridian Forest North" },
      { "id": 2, "loc_id": 1, "name": "Viridian Forest South" }
    ]
  }
]
```

---

### GET `/locations/:id/encounters`
Returns all wild pokemon encounters across all areas within a location.

**Response** `200 OK`
```json
[
  {
    "encounter_id": 1,
    "encounter_rate": 20,
    "encounter_method": "grass",
    "min_level": 3,
    "max_level": 5,
    "area_id": 1,
    "area_name": "Viridian Forest North",
    "pokemon_id": 10,
    "pokemon_name": "caterpie"
  }
]
```

**Errors**
- `404 Not Found` — location not found

---

## Encounters

A user's personal encounter log (pokemon caught or seen during a playthrough).

### GET `/encounters/:user_id`
Returns all encounters for a given user, including basic pokemon info.

**Response** `200 OK`
```json
[
  {
    "id": 1,
    "user_id": 1,
    "pokemon_id": 4,
    "pokemon_name": "charmander",
    "type1": "fire",
    "type2": null,
    "nickname": "Charmy",
    "nature": "adamant",
    "level": 10,
    ...
  }
]
```

---

### GET `/encounters/encounter/:id`
Returns one encounter based on encounter ID:

**Response** `200 OK`
```json
  {
  "id": 1,
  "user_id": 1,
  "pokemon_id": 4,
  "pokemon_name": "charmander",
  "type1": "fire",
  "type2": null,
  "nickname": "Charmy",
  "nature": "adamant",
  "level": 10,
  ...
}
```

---

### POST `/encounters`
Creates a new encounter.

**Request Body**
```json
{
  "user_id": 1,
  "pokemon_id": 4,
  "nickname": "Charmy",
  "nature": "adamant",
  "level": 10,
  "hp_iv": 31, "attack_iv": 31, "defense_iv": 31,
  "sp_attack_iv": 31, "sp_defense_iv": 31, "speed_iv": 31,
  "hp_ev": 0, "attack_ev": 0, "defense_ev": 0,
  "sp_attack_ev": 0, "sp_defense_ev": 0, "speed_ev": 0,
  "move1_id": 1, "move2_id": null, "move3_id": null, "move4_id": null,
  "item_id": null,
  "status": null
}
```

**Response** `201 Created`
```json
{ "id": 42 }
```

---

### PATCH `/encounters/:id`
Partially updates an encounter. Only the fields provided will be updated.

**Allowed fields:** `location_id`, `nickname`, `ability_id`, `nature`, `status`, `hp_iv`, `attack_iv`, `defense_iv`, `sp_attack_iv`, `sp_defense_iv`, `speed_iv`, `hp_ev`, `attack_ev`, `defense_ev`, `sp_attack_ev`, `sp_defense_ev`, `speed_ev`, `move1_id`, `move2_id`, `move3_id`, `move4_id`, `item_id`

**Request Body** — any subset of allowed fields
```json
{ "nickname": "Flamey", "status": "caught" }
```

**Response** `200 OK`
```json
{ "message": "Encounter updated" }
```

**Errors**
- `400 Bad Request` — no valid fields provided
- `404 Not Found` — encounter not found

---

### PUT `/encounters/:id`
Fully replaces an encounter's mutable fields.

**Request Body** — all mutable fields (same as POST minus `user_id` and `pokemon_id`)

**Response** `200 OK`
```json
{ "message": "Encounter updated" }
```

**Errors**
- `404 Not Found` — encounter not found

---

### DELETE `/encounters/:id`
Deletes an encounter.

**Response** `200 OK`
```json
{ "message": "Encounter deleted" }
```

**Errors**
- `404 Not Found` — encounter not found

---

## Team

A user's active team and PC box.

> Slot values `0–5` are active party slots. A `null` slot means the pokemon is in the PC box.

### GET `/team/:user_id`
Returns all team pokemon for a user (party and PC box), with full pokemon stats and move names.

**Response** `200 OK`
```json
[
  {
    "id": 1,
    "user_id": 1,
    "slot": 0,
    "nickname": "Charmy",
    "level": 10,
    "nature": "adamant",
    "ability": "blaze",
    "pokemon_id": 4,
    "name": "charmander",
    "type1": "fire",
    "type2": null,
    "hp": 39, "attack": 52, "defense": 43,
    "sp_attack": 60, "sp_defense": 50, "speed": 65,
    "move1": "scratch", "move2": "growl", "move3": null, "move4": null
  }
]
```

---

### POST `/team`
Adds a pokemon to the team.

**Request Body**
```json
{
  "user_id": 1,
  "pokemon_id": 4,
  "nickname": "Charmy",
  "level": 10,
  "nature": "adamant",
  "ability": "blaze",
  "slot": 0
}
```

> `level` defaults to `5`, `nature` defaults to `"hardy"`, `slot` defaults to `null` (PC box).

**Response** `201 Created` — the newly created team member with full pokemon data

---

### PATCH `/team/:id/slot`
Moves a team pokemon to a different party slot or to the PC box.

**Request Body**
```json
{ "slot": 2 }
```

> Set `slot` to `null` to move the pokemon to the PC box.

**Response** `200 OK`
```json
{ "ok": true }
```

---

### DELETE `/team/:id`
Permanently removes a pokemon from the team (release).

**Response** `200 OK`
```json
{ "ok": true }
```

---

## Trainers

### GET `/trainers`
Returns all trainers. Falls back to `data/trainerData.json` if the database table is empty.

**Response** `200 OK`
```json
[
  {
    "id": "youngster_joey_1",
    "name": "Joey",
    "class": "Youngster",
    "party": "Joey's Team",
    "route": "Route 30",
    "maps": [],
    "items": [],
    "pokemon": []
  }
]
```

---

### GET `/trainers/:id`
Returns a single trainer by ID.

**Response** `200 OK` — single trainer object (same shape as above)

**Errors**
- `404 Not Found` — trainer not found

---

## Common Error Responses

| Status | Body                          | Meaning                         |
|--------|-------------------------------|---------------------------------|
| `400`  | `{ "error": "..." }`          | Bad request / invalid input     |
| `404`  | `{ "error": "..." }`          | Resource not found              |
| `500`  | `{ "error": "Database error"}`| Unexpected server/database error|
