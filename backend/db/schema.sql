DROP TABLE IF EXISTS team_pokemon;
DROP TABLE IF EXISTS encounter;
DROP TABLE IF EXISTS ability;
DROP TABLE IF EXISTS move;
DROP TABLE IF EXISTS item;
DROP TABLE IF EXISTS trainer;
DROP TABLE IF EXISTS pokemon;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  ability1 VARCHAR(50) NULL,
  ability2 VARCHAR(50) NULL,
  ability_hidden VARCHAR(50) NULL
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

CREATE TABLE ability(
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  effect JSON NOT NULL,
  flavorText VARCHAR(255)
);

CREATE TABLE encounter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pokemon_id INT NOT NULL,
  location VARCHAR(50),
  nickname VARCHAR(20),
  ability VARCHAR(50),
  nature VARCHAR(20) NOT NULL DEFAULT 'serious',
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

  FOREIGN KEY (item_id) REFERENCES item(id),
  FOREIGN KEY (move1_id) REFERENCES move(id),
  FOREIGN KEY (move2_id) REFERENCES move(id),
  FOREIGN KEY (move3_id) REFERENCES move(id),
  FOREIGN KEY (move4_id) REFERENCES move(id),
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS team_pokemon (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pokemon_id INT NOT NULL,
  nickname VARCHAR(50),
  level INT NOT NULL DEFAULT 5 CHECK (level BETWEEN 1 AND 100),
  nature VARCHAR(20) NOT NULL DEFAULT 'hardy',
  ability VARCHAR(50),
  move1_id INT NULL,
  move2_id INT NULL,
  move3_id INT NULL,
  move4_id INT NULL,
  slot TINYINT NULL,  -- 0-5 = active party slot, NULL = PC box
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
  FOREIGN KEY (move1_id) REFERENCES move(id),
  FOREIGN KEY (move2_id) REFERENCES move(id),
  FOREIGN KEY (move3_id) REFERENCES move(id),
  FOREIGN KEY (move4_id) REFERENCES move(id)
);