DROP TABLE IF EXISTS pokemon;

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
