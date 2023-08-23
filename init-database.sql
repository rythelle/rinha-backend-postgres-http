CREATE EXTENSION pg_trgm;
       
CREATE TEXT SEARCH CONFIGURATION SEARCH_TEXT (COPY = portuguese);
ALTER TEXT SEARCH CONFIGURATION SEARCH_TEXT ALTER MAPPING FOR hword, hword_part, word WITH portuguese_stem;

CREATE OR REPLACE FUNCTION ARRAY_FOR_UNIQUE_STRING (
  arr TEXT[],
  sep TEXT
) RETURNS TEXT IMMUTABLE PARALLEL SAFE LANGUAGE SQL AS $$
SELECT ARRAY_TO_STRING(arr, sep) $$;

CREATE TABLE IF NOT EXISTS PEOPLE (
	ID UUID PRIMARY KEY,
	APELIDO VARCHAR(32) UNIQUE NOT NULL,
	NOME VARCHAR(100) NOT NULL,
	NASCIMENTO DATE NOT NULL,
	STACK TEXT[] NULL,
	SEARCH_TEXT TEXT GENERATED ALWAYS AS (
        NOME || ' ' || APELIDO || ' ' || COALESCE(ARRAY_FOR_UNIQUE_STRING(STACK, ' '), '')
    ) STORED
);

CREATE INDEX PEOPLE_NOME_INDEX ON PEOPLE (NOME);
CREATE INDEX PEOPLE_APELIDO_INDEX ON PEOPLE (APELIDO);
CREATE INDEX PEOPLE_SEARCH_TEXT_INDEX ON PEOPLE USING GIST (SEARCH_TEXT gist_trgm_ops);