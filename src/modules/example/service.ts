/**
 * Example Service
 * Business logic decoupled from HTTP layer
 */

import type { ExampleModel } from "./model";
import { createLogger, logEvent, type Logger} from "@core/logger";

// Create a module-specific logger
const log: Logger = createLogger("example-service");

// In-memory store for demo purposes
const store: ExampleModel.Item[] = [
  {
    id: "1",
    name: "Example Item 1",
    description: "This is the first example item",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Example Item 2",
    description: "This is the second example item",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let nextId = 3;

/**
 * Example service - uses abstract class pattern for static methods
 * This avoids unnecessary class instantiation
 */
export abstract class ExampleService {
  /**
   * List items with pagination
   */
  static async list(
    query: ExampleModel.ListQuery
  ): Promise<ExampleModel.ListResponse> {
    const { page = 1, limit = 10, search } = query;

    let filtered = [...store];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
      );

      // Log search event
      log.debug({ search, resultCount: filtered.length }, "Search performed");
    }

    // Apply pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const data = filtered.slice(offset, offset + limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get single item by ID
   */
  static async getById(id: string): Promise<ExampleModel.Item | null> {
    return store.find((item) => item.id === id) || null;
  }

  /**
   * Create new item
   */
  static async create(
    data: ExampleModel.CreateBody
  ): Promise<ExampleModel.Item> {
    const now = new Date().toISOString();
    const item: ExampleModel.Item = {
      id: String(nextId++),
      name: data.name,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };
    store.push(item);

    // Log business event
    logEvent("example.created", { itemId: item.id, name: item.name });

    return item;
  }

  /**
   * Update existing item
   */
  static async update(
    id: string,
    data: ExampleModel.UpdateBody
  ): Promise<ExampleModel.Item | null> {
    const index = store.findIndex((item) => item.id === id);
    if (index === -1) return null;

    store[index] = {
      ...store[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    logEvent("example.updated", { itemId: id });

    return store[index];
  }

  /**
   * Delete item
   */
  static async delete(id: string): Promise<boolean> {
    const index = store.findIndex((item) => item.id === id);
    if (index === -1) return false;

    store.splice(index, 1);

    logEvent("example.deleted", { itemId: id });

    return true;
  }
}
