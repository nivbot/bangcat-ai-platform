import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(currentDirectory, "../../db/migrations/001_initial.sql");

export function openDatabase(path: string): DatabaseSync {
  const database = new DatabaseSync(path);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(readFileSync(migrationPath, "utf8"));
  return database;
}
