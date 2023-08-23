const { randomUUID } = require('node:crypto');
const { CustomError } = require('../utils/customError');
const { pool } = require('../../database/pg');

class PeopleRepository {
  constructor() {}

  async find(id) {
    if (!id) return {};

    const result = await pool.query(
      `SELECT ID, APELIDO, NOME, NASCIMENTO, STACK FROM PEOPLE WHERE ID = ${id}`,
    );

    if (!result) return {};

    return result;
  }

  async search(term) {
    if (!term) return [];

    const termNormalized = decodeURIComponent(term)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const result = await pool.query(
      `SELECT ID, APELIDO, NOME, NASCIMENTO, STACK FROM PEOPLE WHERE SEARCH_TEXT ILIKE '%' || '${termNormalized}' || '%' LIMIT 50`,
    );

    if (!result || !result?.rows.length === 0) return [];

    return result.rows;
  }

  async create(data) {
    const { apelido, nome, nascimento, stack } = data;

    if (!apelido || !nome || !nascimento)
      throw new CustomError('ValidationField', 'Some fields are invalid or null');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento))
      throw new CustomError('ValidationError', `${nascimento} is format invalid, only accept AAAA-MM-DD`);

    const apelidoNormalized = apelido
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const nomeNormalized = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const stackNormalized =
      stack?.length > 0 && stack
        ? stack.map((item) =>
            item
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase(),
          )
        : [];

    const uniqueId = randomUUID();

    const result = {
      id: uniqueId,
      apelido: apelidoNormalized,
      nome: nomeNormalized,
      nascimento,
      stack: stackNormalized,
    };

    await pool.query(
      `INSERT INTO PEOPLE (ID, APELIDO, NOME, NASCIMENTO, STACK) VALUES ('${uniqueId}', '${apelido}', '${nome}', '${nascimento}', '{${stack}}')`,
    );

    return result;
  }

  async count() {
    const count = await pool.query(`SELECT COUNT(ID) FROM PEOPLE`);

    if (!count || !count?.rows[0] || !count?.rows[0]?.count || count === 0) return { count: String(0) };

    return { count: String(count.rows[0].count) };
  }
}

module.exports = { PeopleRepository };
