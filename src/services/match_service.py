from ..domain.interfaces import IGestionPartidos
from ..domain.entities import Match, Team

class GestionPartidos(IGestionPartidos):
    def __init__(self, bd):
        self.bd = bd

    def crear_partido(self, league_name: str, team1: Team, team2: Team) -> Match:
        match = Match(team1=team1, team2=team2, league_name=league_name)
        self.bd.guardar("matches", match)
        return match

    def obtener_partido(self, match_id: str) -> Match | None:
        return self.bd.obtener("matches", match_id)

    def registrar_resultado(self, match_id: str, score_team1: int, score_team2: int) -> bool:
        match = self.bd.obtener("matches", match_id)
        if not match:
            return False
        match.score_team1 = score_team1
        match.score_team2 = score_team2
        if score_team1 > score_team2:
            match.winner = match.team1
        elif score_team2 > score_team1:
            match.winner = match.team2
        else:
            match.winner = None
        return self.bd.actualizar("matches", match_id, match)