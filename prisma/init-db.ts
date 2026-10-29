import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

const directory = path.resolve(process.cwd(), "data");
fs.mkdirSync(directory, { recursive: true });
const filename = path.join(directory, process.env.DATABASE_FILE || "dev.db");
new Database(filename).close();
console.log(`SQLite ready: ${filename}`);
