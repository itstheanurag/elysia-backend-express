/**
 * Base Repository
 * Generic CRUD operations with full type safety for Drizzle ORM
 * All methods accept optional transaction parameter
 */

import { eq, sql, type SQL } from "drizzle-orm";
import type { PgTable, TableConfig } from "drizzle-orm/pg-core";
import { db } from "./db.client";

type InferSelect<T extends PgTable<TableConfig>> = T["$inferSelect"];
type InferInsert<T extends PgTable<TableConfig>> = T["$inferInsert"];
type DbInstance = NonNullable<typeof db>;

// Transaction type extracted from db.transaction
export type Transaction = Parameters<DbInstance["transaction"]>[0] extends (
  tx: infer T
) => any
  ? T
  : never;

// DbLike can be either the main db or a transaction
type DbLike = DbInstance | Transaction;

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Base repository providing common CRUD operations
 * All methods accept an optional transaction parameter
 *
 * @example
 * ```ts
 * class UserRepository extends BaseRepository<typeof users> {
 *   constructor() {
 *     super(users, users.id);
 *   }
 * }
 *
 * // Normal usage
 * await UserRepository.findById(1);
 *
 * // With transaction
 * await db.transaction(async (tx) => {
 *   await UserRepository.create({ email: 'test@test.com' }, tx);
 *   await OrderRepository.create({ userId: 1 }, tx);
 * });
 * ```
 */
export class BaseRepository<
  TTable extends PgTable<TableConfig>,
  TSelect = InferSelect<TTable>,
  TInsert = InferInsert<TTable>
> {
  constructor(
    protected readonly table: TTable,
    protected readonly primaryKey: TTable["_"]["columns"][string]
  ) {}

  protected getDb(tx?: DbLike): DbLike {
    if (tx) return tx;
    if (!db) throw new Error("Database not configured");
    return db;
  }

  /**
   * Execute operations within a transaction
   */
  async transaction<T>(
    callback: Parameters<DbInstance["transaction"]>[0]
  ): Promise<T> {
    if (!db) throw new Error("Database not configured");
    return db.transaction(callback) as Promise<T>;
  }

  /**
   * Find a single record by primary key
   */
  async findById(
    id: number | string,
    tx?: Transaction
  ): Promise<TSelect | null> {
    const [record] = await this.getDb(tx)
      .select()
      .from(this.table)
      .where(eq(this.primaryKey, id))
      .limit(1);

    return (record as TSelect) || null;
  }

  /**
   * Find a single record by a condition
   */
  async findOneBy(where: SQL, tx?: Transaction): Promise<TSelect | null> {
    const [record] = await this.getDb(tx)
      .select()
      .from(this.table)
      .where(where)
      .limit(1);

    return (record as TSelect) || null;
  }

  /**
   * Find all records matching a condition
   */
  async findBy(where?: SQL, tx?: Transaction): Promise<TSelect[]> {
    const query = this.getDb(tx).select().from(this.table);

    if (where) {
      return (await query.where(where)) as TSelect[];
    }

    return (await query) as TSelect[];
  }

  /**
   * Find all records with pagination
   */
  async findAll(
    options: PaginationOptions = {},
    where?: SQL,
    tx?: Transaction
  ): Promise<PaginatedResult<TSelect>> {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const dbInstance = this.getDb(tx);
    const query = dbInstance.select().from(this.table);

    const data = where
      ? await query.where(where).limit(limit).offset(offset)
      : await query.limit(limit).offset(offset);

    const countQuery = dbInstance
      .select({ count: sql<number>`count(*)` })
      .from(this.table);

    const [{ count }] = where
      ? await countQuery.where(where)
      : await countQuery;

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as TSelect[],
      meta: { page, limit, total, totalPages },
    };
  }

  /**
   * Create a new record
   */
  async create(data: TInsert, tx?: Transaction): Promise<TSelect> {
    const [record] = await this.getDb(tx)
      .insert(this.table)
      .values(data as any)
      .returning();

    return record as TSelect;
  }

  /**
   * Create multiple records
   */
  async createMany(data: TInsert[], tx?: Transaction): Promise<TSelect[]> {
    const records = await this.getDb(tx)
      .insert(this.table)
      .values(data as any)
      .returning();

    return records as TSelect[];
  }

  /**
   * Update a record by primary key
   */
  async update(
    id: number | string,
    data: Partial<TInsert>,
    tx?: Transaction
  ): Promise<TSelect | null> {
    const [record] = await this.getDb(tx)
      .update(this.table)
      .set(data as any)
      .where(eq(this.primaryKey, id))
      .returning();

    return (record as TSelect) || null;
  }

  /**
   * Update records matching a condition
   */
  async updateBy(
    where: SQL,
    data: Partial<TInsert>,
    tx?: Transaction
  ): Promise<TSelect[]> {
    const records = await this.getDb(tx)
      .update(this.table)
      .set(data as any)
      .where(where)
      .returning();

    return records as TSelect[];
  }

  /**
   * Delete a record by primary key
   */
  async delete(id: number | string, tx?: Transaction): Promise<boolean> {
    const result = await this.getDb(tx)
      .delete(this.table)
      .where(eq(this.primaryKey, id))
      .returning({ id: this.primaryKey });

    return result.length > 0;
  }

  /**
   * Delete records matching a condition
   */
  async deleteBy(where: SQL, tx?: Transaction): Promise<number> {
    const result = await this.getDb(tx)
      .delete(this.table)
      .where(where)
      .returning({ id: this.primaryKey });

    return result.length;
  }

  /**
   * Count records matching a condition
   */
  async count(where?: SQL, tx?: Transaction): Promise<number> {
    const query = this.getDb(tx)
      .select({ count: sql<number>`count(*)` })
      .from(this.table);

    const [{ count }] = where ? await query.where(where) : await query;

    return Number(count);
  }

  /**
   * Check if a record exists by primary key
   */
  async exists(id: number | string, tx?: Transaction): Promise<boolean> {
    const [record] = await this.getDb(tx)
      .select({ id: this.primaryKey })
      .from(this.table)
      .where(eq(this.primaryKey, id))
      .limit(1);

    return !!record;
  }

  /**
   * Check if any record matches a condition
   */
  async existsBy(where: SQL, tx?: Transaction): Promise<boolean> {
    const [record] = await this.getDb(tx)
      .select({ id: this.primaryKey })
      .from(this.table)
      .where(where)
      .limit(1);

    return !!record;
  }
}
