import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

const MIGRATIONS = [
  '20261007000000_create_mlb_tables.sql',
  '20261019000000_add_image_columns.sql',
  '20261027000000_add_player_search.sql',
  '20261101000000_create_game_comments.sql',
].map(
  (filename) =>
    new URL(`../../../supabase/migrations/${filename}`, import.meta.url),
);

async function applyMigrations(pglite) {
  await pglite.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  for (const migration of MIGRATIONS) {
    await pglite.exec(await readFile(migration, 'utf8'));
  }
}

function splitFields(value) {
  const fields = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(') depth += 1;
    if (value[index] === ')') depth -= 1;
    if (value[index] === ',' && depth === 0) {
      fields.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  const last = value.slice(start).trim();
  if (last) fields.push(last);
  return fields;
}

function parseField(field) {
  const openIndex = field.indexOf('(');
  if (openIndex === -1 || !field.endsWith(')')) {
    return { kind: 'column', name: field.trim() };
  }

  const head = field.slice(0, openIndex).trim();
  const aliasIndex = head.indexOf(':');
  const alias = aliasIndex === -1 ? head : head.slice(0, aliasIndex).trim();
  const relation = aliasIndex === -1 ? head : head.slice(aliasIndex + 1).trim();
  const modifiers = relation.split('!').slice(1);

  return {
    kind: 'relation',
    alias,
    table: relation.split('!')[0].trim(),
    modifiers,
    inner: modifiers.includes('inner'),
    columns: splitFields(field.slice(openIndex + 1, -1)).map(parseField),
  };
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function resolveRelation(parentTable, relation) {
  const explicitForeignKey = relation.modifiers.find(
    (modifier) => modifier !== 'inner',
  );
  if (parentTable === 'mlb_games' && relation.table === 'mlb_teams') {
    const foreignKey = explicitForeignKey ?? `${relation.alias}_team_id`;
    return {
      targetTable: 'mlb_teams',
      condition:
        `${quoteIdentifier(relation.sqlAlias)}.${quoteIdentifier('team_id')} = ` +
        `${quoteIdentifier(relation.parentAlias)}.${quoteIdentifier(foreignKey)}`,
    };
  }
  if (
    parentTable === 'mlb_game_player_stats' &&
    relation.table === 'mlb_games'
  ) {
    return {
      targetTable: 'mlb_games',
      condition:
        `${quoteIdentifier(relation.sqlAlias)}.${quoteIdentifier('game_pk')} = ` +
        `${quoteIdentifier(relation.parentAlias)}.${quoteIdentifier('game_pk')}`,
    };
  }
  if (
    parentTable === 'mlb_game_player_stats' &&
    relation.table === 'mlb_players'
  ) {
    return {
      targetTable: 'mlb_players',
      condition:
        `${quoteIdentifier(relation.sqlAlias)}.${quoteIdentifier('player_id')} = ` +
        `${quoteIdentifier(relation.parentAlias)}.${quoteIdentifier('player_id')}`,
    };
  }

  throw new Error(
    `Unsupported test relation: ${parentTable}.${relation.table}`,
  );
}

function collectJoins(
  fields,
  parentTable,
  parentAlias,
  parentPath,
  joins,
  aliases,
) {
  for (const field of fields) {
    if (field.kind !== 'relation') continue;

    field.parentAlias = parentAlias;
    field.parentTable = parentTable;
    field.sqlAlias = parentPath
      ? `${parentPath.replaceAll('.', '_')}_${field.alias}`
      : field.alias;
    const path = parentPath ? `${parentPath}.${field.alias}` : field.alias;
    aliases.set(path, field.sqlAlias);
    const relation = resolveRelation(parentTable, field);
    joins.push({
      table: relation.targetTable,
      alias: field.sqlAlias,
      condition: relation.condition,
      inner: field.inner,
    });
    collectJoins(
      field.columns,
      relation.targetTable,
      field.sqlAlias,
      path,
      joins,
      aliases,
    );
  }
}

function renderObject(fields, alias) {
  const pairs = [];

  for (const field of fields) {
    if (field.kind === 'column') {
      pairs.push(
        `${quoteLiteral(field.name)}, ${quoteIdentifier(alias)}.${quoteIdentifier(field.name)}`,
      );
    } else {
      pairs.push(
        `${quoteLiteral(field.alias)}, ${renderObject(field.columns, field.sqlAlias)}`,
      );
    }
  }

  return `json_build_object(${pairs.join(', ')})`;
}

function renderSelectField(field, rootAlias) {
  if (field.kind === 'column') {
    if (field.name === '*') return `${quoteIdentifier(rootAlias)}.*`;
    return `${quoteIdentifier(rootAlias)}.${quoteIdentifier(field.name)} AS ${quoteIdentifier(field.name)}`;
  }
  return `${renderObject(field.columns, field.sqlAlias)} AS ${quoteIdentifier(field.alias)}`;
}

function parseOr(expression) {
  return expression.split(',').map((part) => {
    const separator = part.indexOf('.');
    const column = part.slice(0, separator);
    const rest = part.slice(separator + 1);
    const valueSeparator = rest.indexOf('.');
    return {
      column,
      operator: rest.slice(0, valueSeparator),
      value: rest.slice(valueSeparator + 1),
    };
  });
}

function toPostgrestValue(value, key = '') {
  if (value instanceof Date) {
    const iso = value.toISOString();
    return key === 'official_date' ? iso.slice(0, 10) : iso;
  }
  if (Array.isArray(value)) return value.map((item) => toPostgrestValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        toPostgrestValue(childValue, childKey),
      ]),
    );
  }
  return value;
}

async function seedFixtures(pglite, fixtures) {
  for (const [table, rows] of Object.entries(fixtures)) {
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = columns.map((column) =>
        [
          'linescore',
          'batting_stats',
          'pitching_stats',
          'fielding_stats',
        ].includes(column)
          ? JSON.stringify(row[column])
          : row[column],
      );
      const expressions = columns.map(
        (column, index) =>
          `$${index + 1}${['linescore', 'batting_stats', 'pitching_stats', 'fielding_stats'].includes(column) ? '::jsonb' : ''}`,
      );
      await pglite.query(
        `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')}) ` +
          `VALUES (${expressions.join(', ')})`,
        values,
      );
    }
  }

  await pglite.query(
    `SELECT setval(pg_get_serial_sequence('game_comments', 'comment_id'), ` +
      `(SELECT COALESCE(MAX(comment_id), 0) FROM game_comments))`,
  );
}

class PGliteQuery {
  constructor(database, table) {
    this.database = database;
    this.table = table;
    this.selection = '*';
    this.filters = [];
    this.orders = [];
    this.maxRows = undefined;
    this.rowRange = undefined;
    this.mode = 'many';
    this.writeOperation = 'select';
    this.payload = undefined;
    this.upsertOptions = undefined;
    this.returningRequested = false;
  }

  select(columns = '*') {
    this.selection = columns;
    if (this.writeOperation !== 'select') this.returningRequested = true;
    return this;
  }

  eq(column, value) {
    return this.filter('eq', column, value);
  }
  neq(column, value) {
    return this.filter('neq', column, value);
  }
  gte(column, value) {
    return this.filter('gte', column, value);
  }
  in(column, values) {
    return this.filter('in', column, values);
  }
  is(column, value) {
    return this.filter('is', column, value);
  }
  not(column, operator, value) {
    return this.filter('not', column, value, operator);
  }

  filter(kind, column, value, operator) {
    this.filters.push({ kind, column, value, operator });
    return this;
  }

  or(expression) {
    this.filters.push({ kind: 'or', conditions: parseOr(expression) });
    return this;
  }

  order(column, options = {}) {
    this.orders.push({ column, ascending: options.ascending !== false });
    return this;
  }

  limit(count) {
    this.maxRows = count;
    return this;
  }
  range(from, to) {
    this.rowRange = { from, to };
    return this;
  }
  maybeSingle() {
    this.mode = 'maybeSingle';
    return this;
  }
  single() {
    this.mode = 'single';
    return this;
  }
  overrideTypes() {
    return this;
  }

  insert(values) {
    this.writeOperation = 'insert';
    this.payload = values;
    return this;
  }

  update(values) {
    this.writeOperation = 'update';
    this.payload = values;
    return this;
  }

  upsert(values, options) {
    this.writeOperation = 'upsert';
    this.payload = values;
    this.upsertOptions = options;
    return this;
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }

  async execute() {
    this.database.calls.queries.push({
      table: this.table,
      operation: this.writeOperation,
      selection: this.selection,
      filters: this.filters,
      orders: this.orders,
    });

    const error = this.database.takeError(this.table);
    if (error) return { data: null, error };

    try {
      if (this.writeOperation === 'insert') return await this.insertRows();
      if (this.writeOperation === 'update') return await this.updateRows();
      if (this.writeOperation === 'upsert') return await this.upsertRows();

      const { sql, params } = this.buildSelect();
      const { rows } = await this.database.pglite.query(sql, params);
      const resultRows = rows.map((row) => toPostgrestValue(row));
      if (this.mode === 'many') return { data: resultRows, error: null };
      if (resultRows.length === 0 && this.mode === 'maybeSingle') {
        return { data: null, error: null };
      }
      if (resultRows.length !== 1) {
        return {
          data: null,
          error: {
            code: 'PGRST116',
            message: `Expected one row, received ${resultRows.length}.`,
          },
        };
      }
      return { data: resultRows[0], error: null };
    } catch (cause) {
      return {
        data: null,
        error: {
          code: cause.code ?? 'PGLITE_ERROR',
          message: cause.message ?? String(cause),
        },
      };
    }
  }

  buildSelect() {
    const fields = splitFields(this.selection).map(parseField);
    const joins = [];
    const aliases = new Map();
    collectJoins(fields, this.table, 'root', '', joins, aliases);
    const params = [];
    const select = fields
      .map((field) => renderSelectField(field, 'root'))
      .join(', ');
    const joinSql = joins
      .map(
        (join) =>
          ` ${join.inner ? 'INNER' : 'LEFT'} JOIN ${quoteIdentifier(join.table)} AS ` +
          `${quoteIdentifier(join.alias)} ON ${join.condition}`,
      )
      .join('');
    const clauses = this.filters.map((filter) =>
      this.renderFilter(filter, aliases, params),
    );
    let sql = `SELECT ${select} FROM ${quoteIdentifier(this.table)} AS "root"${joinSql}`;
    if (clauses.length) sql += ` WHERE ${clauses.join(' AND ')}`;

    if (this.orders.length) {
      sql +=
        ' ORDER BY ' +
        this.orders
          .map(
            (order) =>
              `${this.columnReference(order.column, aliases)} ${order.ascending ? 'ASC' : 'DESC'}`,
          )
          .join(', ');
    }

    let limit = this.maxRows;
    let offset = 0;
    if (this.rowRange) {
      const rangeLength = this.rowRange.to - this.rowRange.from + 1;
      limit = limit === undefined ? rangeLength : Math.min(limit, rangeLength);
      offset = this.rowRange.from;
    }
    if (limit !== undefined) sql += ` LIMIT ${Math.max(0, Number(limit))}`;
    if (offset > 0) sql += ` OFFSET ${Math.max(0, Number(offset))}`;
    return { sql, params };
  }

  columnReference(path, aliases) {
    const parts = path.split('.');
    const column = parts.pop();
    const relationPath = parts.join('.');
    const alias = relationPath ? aliases.get(relationPath) : 'root';
    if (!alias) throw new Error(`Unknown relation path in test query: ${path}`);
    return `${quoteIdentifier(alias)}.${quoteIdentifier(column)}`;
  }

  renderFilter(filter, aliases, params) {
    if (filter.kind === 'or') {
      const conditions = filter.conditions.map(({ column, operator, value }) =>
        this.renderFilter(
          { kind: operator, column, value: value === 'null' ? null : value },
          aliases,
          params,
        ),
      );
      return `(${conditions.join(' OR ')})`;
    }

    const column = this.columnReference(filter.column, aliases);
    if (
      filter.kind === 'is' ||
      (filter.kind === 'not' && filter.operator === 'is')
    ) {
      const isNull = filter.value === null;
      const expression = `${column} IS ${isNull ? '' : 'NOT '}${filter.value === true ? 'TRUE' : filter.value === false ? 'FALSE' : 'NULL'}`;
      return filter.kind === 'not' ? `NOT (${expression})` : expression;
    }
    if (filter.kind === 'not') {
      const operator = filter.operator === 'eq' ? '<>' : filter.operator;
      params.push(filter.value);
      return `${column} ${operator} $${params.length}`;
    }
    if (filter.kind === 'in') {
      if (filter.value.length === 0) return 'FALSE';
      const placeholders = filter.value.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `${column} IN (${placeholders.join(', ')})`;
    }

    const operator = { eq: '=', neq: '<>', gte: '>=' }[filter.kind];
    if (!operator) throw new Error(`Unsupported test filter: ${filter.kind}`);
    if (filter.value === null)
      return `${column} ${filter.kind === 'neq' ? 'IS NOT' : 'IS'} NULL`;
    params.push(filter.value);
    return `${column} ${operator} $${params.length}`;
  }

  async insertRows() {
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
    if (rows.length === 0) return { data: null, error: null };
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const values = [];
    const valueRows = rows.map((row) => {
      const expressions = columns.map((column) => {
        values.push(this.parameterValue(column, row[column]));
        const cast = this.isJsonColumn(column) ? '::jsonb' : '';
        return `$${values.length}${cast}`;
      });
      return `(${expressions.join(', ')})`;
    });
    const returningSql = this.returningRequested
      ? ` RETURNING ${splitFields(this.selection).map(quoteIdentifier).join(', ')}`
      : '';
    const sql =
      `INSERT INTO ${quoteIdentifier(this.table)} ` +
      `(${columns.map(quoteIdentifier).join(', ')}) VALUES ${valueRows.join(', ')}` +
      returningSql;
    const { rows: insertedRows } = await this.database.pglite.query(
      sql,
      values,
    );
    if (this.returningRequested) {
      const rows = insertedRows.map((row) => toPostgrestValue(row));
      if (this.mode === 'single' && rows.length !== 1) {
        return {
          data: null,
          error: {
            code: 'PGRST116',
            message: `Expected one row, received ${rows.length}.`,
          },
        };
      }
      return {
        data: this.mode === 'single' ? rows[0] : rows,
        error: null,
      };
    }
    return { data: null, error: null };
  }

  async updateRows() {
    const aliases = new Map();
    const params = [];
    const values = Object.entries(this.payload);
    const assignments = values.map(([column, value]) => {
      params.push(this.parameterValue(column, value));
      return `${quoteIdentifier(column)} = $${params.length}${this.isJsonColumn(column) ? '::jsonb' : ''}`;
    });
    const clauses = this.filters.map((filter) =>
      this.renderFilter(filter, aliases, params),
    );
    const sql =
      `UPDATE ${quoteIdentifier(this.table)} AS "root" SET ${assignments.join(', ')}` +
      (clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '');
    await this.database.pglite.query(sql, params);
    return { data: null, error: null };
  }

  async upsertRows() {
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
    if (rows.length === 0) return { data: null, error: null };
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const values = [];
    const valueRows = rows.map(
      (row) =>
        `(${columns
          .map((column) => {
            values.push(this.parameterValue(column, row[column]));
            return `$${values.length}${this.isJsonColumn(column) ? '::jsonb' : ''}`;
          })
          .join(', ')})`,
    );
    const conflictColumns = (this.upsertOptions?.onConflict ?? '')
      .split(',')
      .filter(Boolean);
    const updates = columns
      .filter((column) => !conflictColumns.includes(column))
      .map(
        (column) =>
          `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`,
      );
    const conflict = conflictColumns.length
      ? ` ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(', ')}) DO ` +
        (updates.length ? `UPDATE SET ${updates.join(', ')}` : 'NOTHING')
      : '';
    const sql =
      `INSERT INTO ${quoteIdentifier(this.table)} ` +
      `(${columns.map(quoteIdentifier).join(', ')}) VALUES ${valueRows.join(', ')}${conflict}`;
    await this.database.pglite.query(sql, values);
    return { data: null, error: null };
  }

  parameterValue(column, value) {
    return this.isJsonColumn(column) && value !== null
      ? JSON.stringify(value)
      : value;
  }

  isJsonColumn(column) {
    return [
      'linescore',
      'batting_stats',
      'pitching_stats',
      'fielding_stats',
      'payload',
      'error_details',
    ].includes(column);
  }
}

export async function createInMemorySupabase(fixtures) {
  const pglite = new PGlite('memory://');
  await pglite.waitReady;
  await applyMigrations(pglite);
  await seedFixtures(pglite, fixtures);

  const database = {
    pglite,
    calls: { from: [], rpc: [], queries: [] },
    errors: new Map(),
    takeError(table) {
      const queue = this.errors.get(table);
      if (!queue?.length) return null;
      const error = queue.shift();
      if (queue.length === 0) this.errors.delete(table);
      return error;
    },
  };

  const client = {
    from(table) {
      database.calls.from.push(table);
      return new PGliteQuery(database, table);
    },
    async rpc(name, args) {
      database.calls.rpc.push({ name, args });
      const error = database.takeError(`rpc:${name}`);
      if (error) return { data: null, error };
      try {
        if (name !== 'search_mlb_players') {
          throw new Error(`Unknown function ${name}.`);
        }
        const { rows } = await pglite.query(
          'SELECT * FROM search_mlb_players($1, $2)',
          [args.search_query, args.result_limit],
        );
        return { data: rows, error: null };
      } catch (cause) {
        return {
          data: null,
          error: { code: cause.code ?? 'PGLITE_ERROR', message: cause.message },
        };
      }
    },
  };

  return {
    client,
    database,
    calls: database.calls,
    prepare() {},
    async reset(nextFixtures) {
      await pglite.exec(
        'TRUNCATE game_comments, mlb_game_player_stats, mlb_game_team_stats, ' +
          'mlb_source_payloads, mlb_games, mlb_players, mlb_teams, mlb_ingest_runs ' +
          'RESTART IDENTITY CASCADE',
      );
      database.calls.from.length = 0;
      database.calls.rpc.length = 0;
      database.calls.queries.length = 0;
      database.errors.clear();
      await seedFixtures(pglite, nextFixtures);
    },
    failNext(table, message, code = 'TEST_ERROR') {
      const queue = database.errors.get(table) ?? [];
      queue.push({ message, code });
      database.errors.set(table, queue);
    },
    async clear() {
      await pglite.exec(
        'TRUNCATE game_comments, mlb_game_player_stats, mlb_game_team_stats, ' +
          'mlb_source_payloads, mlb_games, mlb_players, mlb_teams, mlb_ingest_runs ' +
          'RESTART IDENTITY CASCADE',
      );
    },
    async close() {
      await pglite.close();
    },
  };
}
