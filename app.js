import path from "path";
import express from "express";
import sqlite3 from "sqlite3";
import dotenv from "dotenv";
import crypto from "crypto";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// Initialize app
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize SQLite database
const db = new sqlite3.Database("db.sqlite", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  }
});

// Clé maître depuis .env
const MASTER_KEY = crypto
  .createHash("sha256")
  .update(process.env.MASTER_KEY)
  .digest();

// Fonction de chiffrement AES-GCM
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", MASTER_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  });
}

// Fonction de déchiffrement
function decrypt(jsonEncrypted) {
  const obj = JSON.parse(jsonEncrypted);
  const iv = Buffer.from(obj.iv, "base64");
  const tag = Buffer.from(obj.tag, "base64");
  const encryptedData = Buffer.from(obj.data, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", MASTER_KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.locals.siteName = "ipass";
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Get all
app.get("/", async (req, res) => {
  // Insert into database, if no table, create one
  db.run(
    `CREATE TABLE IF NOT EXISTS ipass (id INTEGER PRIMARY KEY AUTOINCREMENT, organisation TEXT, link TEXT, identification TEXT, password_encrypted TEXT)`,
    [],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ msg: "Database error" });
      }

      db.all(`SELECT * FROM ipass`, [], (err, rows) => {
        if (err) {
          console.log("err", err);
          return res.status(500).json({ msg: "Database error" });
        }

        // Decrypt passwords before sending to template
        rows = rows.map((row) => ({
          ...row,
          password: Array.from(decrypt(row.password_encrypted))
            .fill("*")
            .join(""),
        }));

        res.render("index", { title: "Home", passwords: rows, password: null });
      });
    }
  );
});

// Get password by ID
app.get("/api/v1/ipass/:id", async (req, res) => {
  const { id } = req.params;
  const master_password = req.query.master_password;

  if (!master_password || !process.env.MASTER_PASSWORD) {
    return res.status(400).json({
      msg: "Master password is required",
    });
  }

  if (master_password !== process.env.MASTER_PASSWORD) {
    return res.status(401).json({
      msg: "Invalid master password",
    });
  }

  db.get(`SELECT * FROM ipass WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.log("err", err);
      return res.status(500).json({ msg: "Database error" });
    }

    if (!row) {
      return res.status(404).json({ msg: "Password not found" });
    }

    // Decrypt password before sending to template
    res.status(200).json({ reveal: decrypt(row.password_encrypted) });
  });
});

// Create
app.post("/add", async (req, res) => {
  const { organisation, link, identification, password } = req.body;

  const encrypted = encrypt(password);

  // Insert into database, if no table, create one
  db.run(
    `CREATE TABLE IF NOT EXISTS ipass (id INTEGER PRIMARY KEY AUTOINCREMENT, organisation TEXT, link TEXT, identification TEXT, password_encrypted TEXT)`,
    [],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ msg: "Database error" });
      }

      db.run(
        `INSERT INTO ipass (organisation, link, identification, password_encrypted) VALUES (?, ?, ?, ?)`,
        [organisation, link, identification, encrypted],
        function (err) {
          if (err) {
            console.log(err);
            return res.status(500).json({ msg: "Database error" });
          }

          res.redirect("/");
        }
      );
    }
  );
});

// Update - UI
app.get("/update/ui/:id", async (req, res) => {
  const { id } = req.params;

  // Get all entries for rendering
  db.all(`SELECT * FROM ipass`, [], (err, rows) => {
    if (err) {
      console.log("err", err);
      return res.status(500).json({ msg: "Database error" });
    }

    // Decrypt passwords before sending to template
    rows = rows.map((row) => ({
      ...row,
      password: Array.from(decrypt(row.password_encrypted)).fill("*").join(""),
    }));

    // Get existing entry
    db.get(`SELECT * FROM ipass WHERE id = ?`, [id], (err, row) => {
      if (err) {
        console.log("err", err);
        return res.status(500).json({ msg: "Database error" });
      }
      if (!row) {
        return res.status(404).json({ msg: "Password not found" });
      }

      row.password = decrypt(row.password_encrypted);
      res.render("index", { title: "Home", passwords: rows, password: row });
    });
  });
});

// Update - Submit
app.post("/update/:id", async (req, res) => {
  const { organisation, link, identification, password } = req.body;
  const { id } = req.params;

  const encrypted = encrypt(password);

  // Update entry field if exists
  db.run(
    `UPDATE ipass SET organisation = ?, link = ?, identification = ?, password_encrypted = ? WHERE id = ?`,
    [organisation, link, identification, encrypted, id],
    function (err) {
      if (err) {
        console.log("err", err);
        return res.status(500).json({ msg: "Database error" });
      }
      res.redirect("/");
    }
  );
});

// Delete
app.post("/delete/:id", async (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM ipass WHERE id = ?`, [id], function (err) {
    if (err) {
      console.log("err", err);
      return res.status(500).json({ msg: "Database error" });
    }

    res.redirect("/");
  });
});

// Catch-all
app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

// Error handler
app.use((err, req, res, next) => {
  if (err.status) {
    return res.status(err.status).json({ msg: err.message });
  }
  res.status(500).json({ msg: "Server error" });
});

// Start server
app.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});
