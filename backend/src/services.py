import random
from .database import get_db


# ── Standings ──────────────────────────────────────────────────────────────────

def compute_standings(league_id: int, group_id: int | None = None):
    """
    Returns list of team standings dicts for a league (or a specific group).
    Tiebreaker: 1) goal diff  2) goals for  3) head-to-head result
    """
    conn = get_db()

    # Fetch teams in scope
    if group_id:
        rows = conn.execute(
            "SELECT t.id, t.name, t.abbreviation FROM group_teams gt "
            "JOIN teams t ON t.id = gt.team_id WHERE gt.group_id = ?",
            (group_id,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT t.id, t.name, t.abbreviation FROM league_teams lt "
            "JOIN teams t ON t.id = lt.team_id WHERE lt.league_id = ?",
            (league_id,)
        ).fetchall()

    teams = {r["id"]: {
        "id": r["id"], "name": r["name"], "abbreviation": r["abbreviation"],
        "played": 0, "won": 0, "drawn": 0, "lost": 0,
        "goals_for": 0, "goals_against": 0, "goal_diff": 0, "points": 0
    } for r in rows}

    # Fetch played matches
    q = "SELECT * FROM matches WHERE league_id = ? AND played = 1"
    params = [league_id]
    if group_id:
        q += " AND group_id = ?"
        params.append(group_id)

    matches = conn.execute(q, params).fetchall()
    conn.close()

    h2h = {}  # (winner_id, loser_id) counts

    for m in matches:
        t1, t2 = m["team1_id"], m["team2_id"]
        s1, s2 = m["score_team1"], m["score_team2"]
        if t1 not in teams or t2 not in teams:
            continue

        teams[t1]["played"] += 1
        teams[t2]["played"] += 1
        teams[t1]["goals_for"] += s1
        teams[t1]["goals_against"] += s2
        teams[t2]["goals_for"] += s2
        teams[t2]["goals_against"] += s1

        if s1 > s2:
            teams[t1]["won"] += 1
            teams[t1]["points"] += 3
            teams[t2]["lost"] += 1
            h2h[(t1, t2)] = h2h.get((t1, t2), 0) + 1
        elif s2 > s1:
            teams[t2]["won"] += 1
            teams[t2]["points"] += 3
            teams[t1]["lost"] += 1
            h2h[(t2, t1)] = h2h.get((t2, t1), 0) + 1
        else:
            teams[t1]["drawn"] += 1
            teams[t2]["drawn"] += 1
            teams[t1]["points"] += 1
            teams[t2]["points"] += 1

    for t in teams.values():
        t["goal_diff"] = t["goals_for"] - t["goals_against"]

    def sort_key(t):
        tid = t["id"]
        return (t["points"], t["goal_diff"], t["goals_for"])

    def cmp_h2h(a, b):
        wins_a = h2h.get((a["id"], b["id"]), 0)
        wins_b = h2h.get((b["id"], a["id"]), 0)
        return wins_b - wins_a  # higher h2h wins = lower rank number

    standing = sorted(teams.values(), key=sort_key, reverse=True)

    # Apply h2h as tiebreaker between equal-points teams
    # Simple stable pass: if pts + gd + gf equal, use h2h
    for i in range(len(standing)):
        for j in range(i + 1, len(standing)):
            a, b = standing[i], standing[j]
            if (a["points"] == b["points"] and
                    a["goal_diff"] == b["goal_diff"] and
                    a["goals_for"] == b["goals_for"]):
                if cmp_h2h(a, b) > 0:
                    standing[i], standing[j] = b, a

    for pos, t in enumerate(standing, 1):
        t["position"] = pos

    return standing


# ── Group generation ───────────────────────────────────────────────────────────

def generate_groups(league_id: int, num_groups: int):
    """
    Randomly and evenly distribute league teams into groups.
    Returns list of group dicts with teams.
    """
    conn = get_db()

    # Delete old groups for this league
    conn.execute(
        "DELETE FROM groups_ WHERE league_id = ?", (league_id,)
    )

    team_ids = [r["team_id"] for r in conn.execute(
        "SELECT team_id FROM league_teams WHERE league_id = ?", (league_id,)
    ).fetchall()]

    if len(team_ids) < num_groups:
        conn.close()
        raise ValueError("More groups than teams")

    random.shuffle(team_ids)

    groups = []
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    for i in range(num_groups):
        name = f"Group {letters[i]}"
        cur = conn.execute(
            "INSERT INTO groups_ (league_id, name) VALUES (?, ?)",
            (league_id, name)
        )
        group_id = cur.lastrowid
        groups.append({"id": group_id, "name": name, "teams": []})

    for idx, team_id in enumerate(team_ids):
        group_idx = idx % num_groups
        group_id = groups[group_idx]["id"]
        conn.execute(
            "INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)",
            (group_id, team_id)
        )
        groups[group_idx]["teams"].append(team_id)

    conn.commit()
    conn.close()
    return groups


# ── Match result registration ──────────────────────────────────────────────────

def register_result(match_id: int, score_team1: int, score_team2: int):
    conn = get_db()
    match = conn.execute(
        "SELECT * FROM matches WHERE id = ?", (match_id,)
    ).fetchone()

    if not match:
        conn.close()
        raise ValueError("Match not found")

    s1 = score_team1 if score_team1 is not None else 0
    s2 = score_team2 if score_team2 is not None else 0

    if s1 > s2:
        winner_id = match["team1_id"]
    elif s2 > s1:
        winner_id = match["team2_id"]
    else:
        winner_id = None  # draw

    conn.execute(
        """UPDATE matches
           SET score_team1 = ?, score_team2 = ?, winner_id = ?,
               played = 1, played_at = datetime('now')
           WHERE id = ?""",
        (s1, s2, winner_id, match_id)
    )
    conn.commit()
    conn.close()