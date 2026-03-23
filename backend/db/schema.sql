DROP TABLE IF EXISTS pokemon;
DROP TABLE IF EXISTS encounter;

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

CREATE TABLE encounter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pokemon_id INT NOT NULL,
  location VARCHAR(50),
  nickname VARCHAR(20),
  ability VARCHAR(50),
  nature VARCHAR(20) NOT NULL DEFAULT 'Serious',

  hp_iv INT NOT NULL DEFAULT 0 CHECK (hp_iv BETWEEN 0 AND 31),
  attack_iv INT NOT NULL DEFAULT 0 CHECK (attack_iv BETWEEN 0 AND 31),
  defense_iv INT NOT NULL DEFAULT 0 CHECK (defense_iv BETWEEN 0 AND 31),
  sp_attack_iv INT NOT NULL DEFAULT 0 CHECK (sp_attack_iv BETWEEN 0 AND 31),
  sp_defense_iv INT NOT NULL DEFAULT 0 CHECK (sp_defense_iv BETWEEN 0 AND 31),
  speed_iv INT NOT NULL DEFAULT 0 CHECK (speed_iv BETWEEN 0 AND 31),

  hp_ev INT NOT NULL DEFAULT 0 CHECK (hp_ev BETWEEN 0 AND 252),
  attack_ev INT NOT NULL DEFAULT 0 CHECK (attack_ev BETWEEN 0 AND 252),
  defense_ev INT NOT NULL DEFAULT 0 CHECK (defense_ev BETWEEN 0 AND 252),
  sp_attack_ev INT NOT NULL DEFAULT 0 CHECK (sp_attack_ev BETWEEN 0 AND 252),
  sp_defense_ev INT NOT NULL DEFAULT 0 CHECK (sp_defense_ev BETWEEN 0 AND 252),
  speed_ev INT NOT NULL DEFAULT 0 CHECK (speed_ev BETWEEN 0 AND 252),

  CHECK (
  hp_ev + attack_ev + defense_ev + sp_attack_ev + sp_defense_ev + speed_ev <= 510
  ),

  status VARCHAR(20),

  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
