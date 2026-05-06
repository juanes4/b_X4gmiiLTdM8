from flask import Blueprint, request, jsonify
from .database import get_db
from .services import compute_standings, generate_groups, register_result

api = Blueprint("api", __name__)


def row_to_dict(row):
    return dict(row) if row else None


def rows_to_list(rows):
    return [dict(r) for r in rows]


# ── Teams ──────────────────────────────────────────────────────────────────────

@api.get("/teams")
def get_teams():
    conn = get_db()
    teams = rows_to_list(conn.execute("SELECT * FROM teams ORDER BY name").fetchall())
    conn.close()
    return jsonify(teams)


@api.get("/teams/<int:team_id>")
def get_team(team_id):
    conn = get_db()
    team = row_to_dict(conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone())
    players = rows_to_list(conn.execute(
        "SELECT p.* FROM players p INNER JOIN player_teams pt ON p.id = pt.player_id WHERE pt.team_id = ?",
        (team_id,)
    ).fetchall())
    conn.close()
    if not team:
        return jsonify({"error": "Team not found"}), 404
    team["players"] = players
    return jsonify(team)


@api.post("/teams")
def create_team():
    data = request.json
    required = ["name", "country", "city", "abbreviation"]
    for f in required:
        if not data.get(f):
            return jsonify({"error": f"{f} is required"}), 400

    players = data.get("players", [])

    # Validate at least 11 players
    if len(players) < 11:
        return jsonify({"error": f"At least 11 players required, got {len(players)}"}), 400

    # Validate no duplicate player IDs in request
    player_ids = [p["id"] for p in players if p.get("id")]
    if len(player_ids) != len(set(player_ids)):
        return jsonify({"error": "Duplicate players in request"}), 400

    conn = get_db()
    try:
        for pid in player_ids:
            existing = conn.execute(
                "SELECT team_id FROM player_teams WHERE player_id = ?", (pid,)
            ).fetchone()
            if existing:
                conn.close()
                return jsonify({"error": f"Player {pid} is already assigned to another team"}), 400

        cur = conn.execute(
            "INSERT INTO teams (name, country, city, abbreviation, logo, state) VALUES (?,?,?,?,?,?)",
            (data["name"], data["country"], data["city"],
             data["abbreviation"].upper(), data.get("logo", ""), data.get("state", "active"))
        )
        team_id = cur.lastrowid

        for pid in player_ids:
            conn.execute(
                "INSERT INTO player_teams (player_id, team_id) VALUES (?, ?)",
                (pid, team_id)
            )

        conn.commit()
        team = row_to_dict(conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone())
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 409
    conn.close()
    return jsonify(team), 201


@api.put("/teams/<int:team_id>")
def update_team(team_id):
    data = request.json
    conn = get_db()
    conn.execute(
        """UPDATE teams SET name=COALESCE(?,name), country=COALESCE(?,country),
           city=COALESCE(?,city), abbreviation=COALESCE(?,abbreviation),
           logo=COALESCE(?,logo), state=COALESCE(?,state)
           WHERE id=?""",
        (data.get("name"), data.get("country"), data.get("city"),
         data.get("abbreviation"), data.get("logo"), data.get("state"), team_id)
    )
    conn.commit()
    team = row_to_dict(conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone())
    conn.close()
    if not team:
        return jsonify({"error": "Team not found"}), 404
    return jsonify(team)


@api.delete("/teams/<int:team_id>")
def delete_team(team_id):
    conn = get_db()
    conn.execute("DELETE FROM teams WHERE id = ?", (team_id,))
    conn.commit()
    conn.close()
    return jsonify({"deleted": team_id})


# ── Players ────────────────────────────────────────────────────────────────────

@api.get("/players")
def get_players():
    conn = get_db()
    players = rows_to_list(conn.execute(
        """SELECT p.id, p.name, p.age, p.position, p.number, p.photo, p.created_at,
           (SELECT team_id FROM player_teams WHERE player_id = p.id LIMIT 1) as team_id
           FROM players p ORDER BY p.name"""
    ).fetchall())
    conn.close()
    return jsonify(players)


@api.post("/players")
def create_player():
    data = request.json
    if not data.get("name") or not data.get("position"):
        return jsonify({"error": "name and position required"}), 400
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO players (name, age, position, number, photo) VALUES (?,?,?,?,?)",
        (data["name"], data.get("age"), data["position"], data.get("number"), data.get("photo", ""))
    )
    player = row_to_dict(conn.execute("SELECT * FROM players WHERE id = ?", (cur.lastrowid,)).fetchone())
    conn.commit()
    conn.close()
    return jsonify(player), 201


@api.put("/players/<int:player_id>")
def update_player(player_id):
    data = request.json
    conn = get_db()
    conn.execute(
        """UPDATE players SET name=COALESCE(?,name), age=COALESCE(?,age),
           position=COALESCE(?,position), number=COALESCE(?,number),
           photo=COALESCE(?,photo)
           WHERE id=?""",
        (data.get("name"), data.get("age"), data.get("position"),
         data.get("number"), data.get("photo"), player_id)
    )
    conn.commit()
    player = row_to_dict(conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone())
    conn.close()
    if not player:
        return jsonify({"error": "Player not found"}), 404
    return jsonify(player)


@api.delete("/players/<int:player_id>")
def delete_player(player_id):
    conn = get_db()
    conn.execute("DELETE FROM players WHERE id = ?", (player_id,))
    conn.commit()
    conn.close()
    return jsonify({"deleted": player_id})


# ── Leagues ────────────────────────────────────────────────────────────────────

@api.get("/leagues")
def get_leagues():
    conn = get_db()
    leagues = rows_to_list(conn.execute("SELECT * FROM leagues ORDER BY name").fetchall())
    for lg in leagues:
        lg["teams"] = rows_to_list(conn.execute(
            "SELECT t.* FROM league_teams lt JOIN teams t ON t.id=lt.team_id WHERE lt.league_id=?",
            (lg["id"],)
        ).fetchall())
    conn.close()
    return jsonify(leagues)


@api.get("/leagues/<int:league_id>")
def get_league(league_id):
    conn = get_db()
    league = row_to_dict(conn.execute("SELECT * FROM leagues WHERE id=?", (league_id,)).fetchone())
    if not league:
        conn.close()
        return jsonify({"error": "League not found"}), 404
    league["teams"] = rows_to_list(conn.execute(
        "SELECT t.* FROM league_teams lt JOIN teams t ON t.id=lt.team_id WHERE lt.league_id=?",
        (league_id,)
    ).fetchall())
    league["groups"] = rows_to_list(conn.execute(
        "SELECT * FROM groups_ WHERE league_id=?", (league_id,)
    ).fetchall())
    for g in league["groups"]:
        g["teams"] = rows_to_list(conn.execute(
            "SELECT t.* FROM group_teams gt JOIN teams t ON t.id=gt.team_id WHERE gt.group_id=?",
            (g["id"],)
        ).fetchall())
    conn.close()
    return jsonify(league)


@api.post("/leagues")
def create_league():
    data = request.json
    if not data.get("name"):
        return jsonify({"error": "name required"}), 400

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO leagues (name, state, current_round) VALUES (?,?,?)",
            (data["name"], data.get("state", "active"), data.get("current_round", 0))
        )
        league_id = cur.lastrowid

        for team_id in data.get("teams", []):
            conn.execute(
                "INSERT INTO league_teams (league_id, team_id) VALUES (?,?)",
                (league_id, team_id)
            )

        conn.commit()
        league = row_to_dict(conn.execute("SELECT * FROM leagues WHERE id=?", (league_id,)).fetchone())
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 409
    conn.close()
    return jsonify(league), 201


@api.put("/leagues/<int:league_id>")
def update_league(league_id):
    data = request.json
    conn = get_db()
    conn.execute(
        "UPDATE leagues SET name=COALESCE(?,name), state=COALESCE(?,state), current_round=COALESCE(?,current_round) WHERE id=?",
        (data.get("name"), data.get("state"), data.get("current_round"), league_id)
    )

    if "teams" in data:
        conn.execute("DELETE FROM league_teams WHERE league_id=?", (league_id,))
        for tid in data["teams"]:
            conn.execute("INSERT INTO league_teams (league_id, team_id) VALUES (?,?)", (league_id, tid))

    conn.commit()
    league = row_to_dict(conn.execute("SELECT * FROM leagues WHERE id=?", (league_id,)).fetchone())
    conn.close()
    if not league:
        return jsonify({"error": "League not found"}), 404
    return jsonify(league)


@api.delete("/leagues/<int:league_id>")
def delete_league(league_id):
    conn = get_db()
    conn.execute("DELETE FROM leagues WHERE id=?", (league_id,))
    conn.commit()
    conn.close()
    return jsonify({"deleted": league_id})


@api.post("/leagues/<int:league_id>/generate-groups")
def api_generate_groups(league_id):
    data = request.json or {}
    num_groups = data.get("num_groups", 4)
    try:
        groups = generate_groups(league_id, num_groups)
        return jsonify({"groups": groups})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@api.get("/leagues/<int:league_id>/standings")
def get_standings(league_id):
    group_id = request.args.get("group_id", type=int)
    standings = compute_standings(league_id, group_id)
    return jsonify(standings)


# ── Matches ────────────────────────────────────────────────────────────────────

@api.get("/matches")
def get_matches():
    league_id = request.args.get("league_id", type=int)
    conn = get_db()
    q = """
        SELECT m.*,
               t1.name as team1_name, t1.abbreviation as team1_abbr,
               t2.name as team2_name, t2.abbreviation as team2_abbr,
               l.name as league_name
        FROM matches m
        JOIN teams t1 ON t1.id=m.team1_id
        JOIN teams t2 ON t2.id=m.team2_id
        LEFT JOIN leagues l ON l.id=m.league_id
    """
    params = []
    if league_id:
        q += " WHERE m.league_id=?"
        params.append(league_id)
    q += " ORDER BY m.id DESC"
    matches = rows_to_list(conn.execute(q, params).fetchall())
    conn.close()
    return jsonify(matches)


@api.get("/matches/<int:match_id>")
def get_match(match_id):
    conn = get_db()
    match = row_to_dict(conn.execute(
        """SELECT m.*,
               t1.name as team1_name, t1.abbreviation as team1_abbr,
               t2.name as team2_name, t2.abbreviation as team2_abbr
           FROM matches m
           JOIN teams t1 ON t1.id=m.team1_id
           JOIN teams t2 ON t2.id=m.team2_id
           WHERE m.id=?""", (match_id,)
    ).fetchone())
    conn.close()
    if not match:
        return jsonify({"error": "Match not found"}), 404
    return jsonify(match)


@api.post("/matches")
def create_match():
    data = request.json
    if not data.get("team1_id") or not data.get("team2_id"):
        return jsonify({"error": "team1_id and team2_id required"}), 400
    if data["team1_id"] == data["team2_id"]:
        return jsonify({"error": "Teams must be different"}), 400

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO matches (league_id, group_id, team1_id, team2_id, round) VALUES (?,?,?,?,?)",
        (data.get("league_id"), data.get("group_id"),
         data["team1_id"], data["team2_id"], data.get("round"))
    )
    match_id = cur.lastrowid
    conn.commit()
    
    # Return match with team information via JOINs
    match = row_to_dict(conn.execute(
        """SELECT m.*,
               t1.name as team1_name, t1.abbreviation as team1_abbr,
               t2.name as team2_name, t2.abbreviation as team2_abbr,
               l.name as league_name
           FROM matches m
           JOIN teams t1 ON t1.id=m.team1_id
           JOIN teams t2 ON t2.id=m.team2_id
           LEFT JOIN leagues l ON l.id=m.league_id
           WHERE m.id=?""", (match_id,)
    ).fetchone())
    conn.close()
    return jsonify(match), 201


@api.put("/matches/<int:match_id>/result")
def update_result(match_id):
    data = request.json
    s1 = data.get("score_team1")
    s2 = data.get("score_team2")
    if s1 is None or s2 is None:
        return jsonify({"error": "score_team1 and score_team2 required"}), 400
    if s1 < 0 or s2 < 0:
        return jsonify({"error": "Scores must be non-negative"}), 400
    try:
        register_result(match_id, s1, s2)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404

    conn = get_db()
    match = row_to_dict(conn.execute(
        """SELECT m.*,
               t1.name as team1_name, t1.abbreviation as team1_abbr,
               t2.name as team2_name, t2.abbreviation as team2_abbr,
               l.name as league_name
           FROM matches m
           JOIN teams t1 ON t1.id=m.team1_id
           JOIN teams t2 ON t2.id=m.team2_id
           LEFT JOIN leagues l ON l.id=m.league_id
           WHERE m.id=?""", (match_id,)
    ).fetchone())
    conn.close()
    return jsonify(match)


@api.delete("/matches/<int:match_id>")
def delete_match(match_id):
    conn = get_db()
    conn.execute("DELETE FROM matches WHERE id=?", (match_id,))
    conn.commit()
    conn.close()
    return jsonify({"deleted": match_id})