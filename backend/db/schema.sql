DROP TABLE IF EXISTS team_pokemon;
DROP TABLE IF EXISTS encounter;
DROP TABLE IF EXISTS pokemon_move;
DROP TABLE IF EXISTS move;
DROP TABLE IF EXISTS item;
DROP TABLE IF EXISTS trainer;
DROP TABLE IF EXISTS area_encounter;
DROP TABLE IF EXISTS area;
DROP TABLE IF EXISTS location;
DROP TABLE IF EXISTS pokemon;
DROP TABLE IF EXISTS ability;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ability(
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  effect TEXT,
  flavor_text TEXT
);

CREATE TABLE pokemon (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  hp INT NOT NULL,
  attack INT NOT NULL,
  defense INT NOT NULL,
  sp_attack INT NOT NULL,
  sp_defense INT NOT NULL,
  speed INT NOT NULL,
  type1 VARCHAR(20) NOT NULL,
  type2 VARCHAR(20) NULL,
  ability1 INT NULL,
  ability2 INT NULL,
  ability_hidden INT NULL,

  FOREIGN KEY (ability1) REFERENCES ability(id),
  FOREIGN KEY (ability2) REFERENCES ability(id),
  FOREIGN KEY (ability_hidden) REFERENCES ability(id)
);

CREATE TABLE location (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

CREATE TABLE area (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loc_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,

  FOREIGN KEY (loc_id) REFERENCES location(id)
);

CREATE TABLE area_encounter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area_id INT NOT NULL,
  pokemon_id INT NOT NULL,
  encounter_rate INT NOT NULL CHECK(encounter_rate > 0 && encounter_rate < 101),
  encounter_method VARCHAR(50),
  max_level INT CHECK(max_level > 0 && max_level < 101),
  min_level INT CHECK(min_level > 0 && min_level < 101),

  FOREIGN KEY (area_id) REFERENCES area(id),
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
);

CREATE TABLE item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  category VARCHAR(50),
  effect TEXT NULL,
  effect_long TEXT NULL,
  flavor_text TEXT NULL
);

CREATE TABLE trainer (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  trainer_class VARCHAR(60) NOT NULL,
  party_name VARCHAR(80) NULL,
  route VARCHAR(100) NULL,
  maps_json JSON NOT NULL,
  items_json JSON NOT NULL,
  pokemon_json JSON NOT NULL
);

CREATE TABLE move (
  id INT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  type VARCHAR(20) NOT NULL,
  power INT NULL,
  accuracy INT NULL CHECK (accuracy BETWEEN 0 AND 100 OR accuracy IS NULL),
  pp INT NOT NULL
);

CREATE TABLE pokemon_move (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pokemon_id INT NOT NULL,
  move_id INT NOT NULL,
  learn_method VARCHAR(50) NOT NULL,
  level INT NULL,

  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
  FOREIGN KEY (move_id) REFERENCES move(id)
);

CREATE TABLE encounter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pokemon_id INT NOT NULL,
  location_id INT,
  nickname VARCHAR(20),
  ability_id INT NULL,
  nature VARCHAR(20) NOT NULL DEFAULT 'hardy',
  level INT NOT NULL DEFAULT 50 CHECK (level BETWEEN 1 and 100),

  hp_iv INT NOT NULL DEFAULT 31 CHECK (hp_iv BETWEEN 0 AND 31),
  attack_iv INT NOT NULL DEFAULT 31 CHECK (attack_iv BETWEEN 0 AND 31),
  defense_iv INT NOT NULL DEFAULT 31 CHECK (defense_iv BETWEEN 0 AND 31),
  sp_attack_iv INT NOT NULL DEFAULT 31 CHECK (sp_attack_iv BETWEEN 0 AND 31),
  sp_defense_iv INT NOT NULL DEFAULT 31 CHECK (sp_defense_iv BETWEEN 0 AND 31),
  speed_iv INT NOT NULL DEFAULT 31 CHECK (speed_iv BETWEEN 0 AND 31),

  hp_ev INT NOT NULL DEFAULT 0 CHECK (hp_ev BETWEEN 0 AND 252),
  attack_ev INT NOT NULL DEFAULT 0 CHECK (attack_ev BETWEEN 0 AND 252),
  defense_ev INT NOT NULL DEFAULT 0 CHECK (defense_ev BETWEEN 0 AND 252),
  sp_attack_ev INT NOT NULL DEFAULT 0 CHECK (sp_attack_ev BETWEEN 0 AND 252),
  sp_defense_ev INT NOT NULL DEFAULT 0 CHECK (sp_defense_ev BETWEEN 0 AND 252),
  speed_ev INT NOT NULL DEFAULT 0 CHECK (speed_ev BETWEEN 0 AND 252),

  move1_id INT NULL,
  move2_id INT NULL,
  move3_id INT NULL,
  move4_id INT NULL,

  item_id INT NULL,

  CHECK (
  hp_ev + attack_ev + defense_ev + sp_attack_ev + sp_defense_ev + speed_ev <= 510
  ),

  status VARCHAR(20),

  team_slot INT DEFAULT NULL CHECK (team_slot BETWEEN 1 AND 6),
  UNIQUE (user_id, team_slot),

  FOREIGN KEY (item_id) REFERENCES item(id),
  FOREIGN KEY (ability_id) REFERENCES ability(id),
  FOREIGN KEY (location_id) REFERENCES location(id),
  FOREIGN KEY (move1_id) REFERENCES move(id),
  FOREIGN KEY (move2_id) REFERENCES move(id),
  FOREIGN KEY (move3_id) REFERENCES move(id),
  FOREIGN KEY (move4_id) REFERENCES move(id),
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
