import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'championship.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS teams (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL UNIQUE,
            country     TEXT NOT NULL,
            city        TEXT NOT NULL,
            abbreviation TEXT NOT NULL,
            logo        TEXT,
            state       TEXT NOT NULL DEFAULT 'active',
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS players (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            age         INTEGER,
            position    TEXT NOT NULL,
            number      INTEGER,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS player_teams (
            player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            PRIMARY KEY (player_id, team_id)
        );

        CREATE TABLE IF NOT EXISTS leagues (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT NOT NULL UNIQUE,
            state           TEXT NOT NULL DEFAULT 'active',
            current_round   INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS league_teams (
            league_id   INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
            team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            PRIMARY KEY (league_id, team_id)
        );

        CREATE TABLE IF NOT EXISTS groups_ (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            league_id   INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
            name        TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_teams (
            group_id    INTEGER NOT NULL REFERENCES groups_(id) ON DELETE CASCADE,
            team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            PRIMARY KEY (group_id, team_id)
        );

        CREATE TABLE IF NOT EXISTS matches (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            league_id       INTEGER REFERENCES leagues(id) ON DELETE SET NULL,
            group_id        INTEGER REFERENCES groups_(id) ON DELETE SET NULL,
            team1_id        INTEGER NOT NULL REFERENCES teams(id),
            team2_id        INTEGER NOT NULL REFERENCES teams(id),
            score_team1     INTEGER,
            score_team2     INTEGER,
            winner_id       INTEGER REFERENCES teams(id),
            round           INTEGER,
            played          INTEGER NOT NULL DEFAULT 0,
            played_at       TEXT,
            created_at      TEXT DEFAULT (datetime('now'))
        );
    """)

    conn.commit()

    # Migrate existing DB: add winner_id if missing
    cols = [r[1] for r in cur.execute("PRAGMA table_info(matches)").fetchall()]
    if "winner_id" not in cols:
        cur.execute("ALTER TABLE matches ADD COLUMN winner_id INTEGER REFERENCES teams(id)")
        conn.commit()

    conn.close()