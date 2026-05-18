import random
from datetime import datetime, timedelta
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


# ── Round-robin schedule generation ───────────────────────────────────────────

def _round_dates(start_date: str | None, end_date: str | None, num_rounds: int) -> list:
    """Distribute num_rounds evenly in [start_date, end_date]. Returns list of ISO strings or Nones."""
    if not start_date or not end_date or num_rounds <= 0:
        return [None] * num_rounds
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    except ValueError:
        return [None] * num_rounds
    total_days = (end - start).days
    if total_days <= 0:
        return [start.strftime("%Y-%m-%dT12:00")] * num_rounds
    step = total_days / num_rounds
    return [(start + timedelta(days=i * step)).strftime("%Y-%m-%dT12:00") for i in range(num_rounds)]


def generate_round_robin_schedule(league_id: int):
    """
    Generate a full round-robin schedule using the rotation algorithm.
    For N teams: N-1 rounds (N rounds if odd, with one bye per round).
    Each round has floor(N/2) real matches.
    Deletes existing matches for the league before inserting new ones.
    """
    conn = get_db()

    conn.execute("DELETE FROM matches WHERE league_id = ?", (league_id,))

    league = conn.execute("SELECT * FROM leagues WHERE id = ?", (league_id,)).fetchone()

    team_ids = [r["team_id"] for r in conn.execute(
        "SELECT team_id FROM league_teams WHERE league_id = ?", (league_id,)
    ).fetchall()]

    if len(team_ids) < 2:
        conn.close()
        raise ValueError("Need at least 2 teams to generate schedule")

    teams = list(team_ids)
    if len(teams) % 2 == 1:
        teams.append(None)  # phantom team = bye

    m = len(teams)
    num_rounds = m - 1
    rotation = list(range(m))

    dates = _round_dates(league["start_date"], league["end_date"], num_rounds)

    for round_num in range(1, m):
        round_date = dates[round_num - 1]
        for i in range(m // 2):
            home = teams[rotation[i]]
            away = teams[rotation[m - 1 - i]]
            if home is not None and away is not None:
                conn.execute(
                    "INSERT INTO matches (league_id, team1_id, team2_id, round, scheduled_at) VALUES (?,?,?,?,?)",
                    (league_id, home, away, round_num, round_date)
                )
        # Rotate: keep position 0 fixed, shift the rest right by 1
        rotation = [rotation[0]] + [rotation[-1]] + rotation[1:-1]

    conn.execute("UPDATE leagues SET current_round = 1 WHERE id = ?", (league_id,))
    conn.commit()
    conn.close()


# ── Match result registration ──────────────────────────────────────────────────

def register_result(match_id: int, score_team1: int, score_team2: int,
                    halftime_score_team1=None, halftime_score_team2=None,
                    venue=None, referee=None, scheduled_at=None):
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
               played = 1, played_at = datetime('now'),
               halftime_score_team1 = COALESCE(?, halftime_score_team1),
               halftime_score_team2 = COALESCE(?, halftime_score_team2),
               venue = COALESCE(?, venue),
               referee = COALESCE(?, referee),
               scheduled_at = COALESCE(?, scheduled_at)
           WHERE id = ?""",
        (s1, s2, winner_id,
         halftime_score_team1, halftime_score_team2,
         venue, referee, scheduled_at,
         match_id)
    )
    conn.commit()
    conn.close()