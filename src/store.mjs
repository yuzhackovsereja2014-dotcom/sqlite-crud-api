import { DatabaseSync } from "node:sqlite";

export function createStore(filename = "data.sqlite") {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const listStatement = db.prepare("SELECT * FROM items ORDER BY id ASC");
  const getStatement = db.prepare("SELECT * FROM items WHERE id = ?");
  const createStatement = db.prepare("INSERT INTO items (title, description) VALUES (?, ?)");
  const updateStatement = db.prepare("UPDATE items SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const deleteStatement = db.prepare("DELETE FROM items WHERE id = ?");

  return {
    list: () => listStatement.all(),
    get: (id) => getStatement.get(id),
    create({ title, description = "" }) {
      const result = createStatement.run(title, description);
      return getStatement.get(result.lastInsertRowid);
    },
    update(id, { title, description = "" }) {
      const result = updateStatement.run(title, description, id);
      return result.changes === 0 ? undefined : getStatement.get(id);
    },
    delete(id) {
      return deleteStatement.run(id).changes > 0;
    },
    close: () => db.close()
  };
}
