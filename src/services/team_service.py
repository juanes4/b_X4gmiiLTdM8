from ..domain.interfaces import IGestionEquipos
from ..domain.entities import Team

class GestionEquipos(IGestionEquipos):
    def __init__(self, bd):
        self.bd = bd

    def crear_equipo(self, name, country, city, abbreviation, logo):
        team = Team(name=name, country=country, city=city, abbreviation=abbreviation, logo=logo)
        self.bd.guardar("teams", team)
        return team

    def agregar_jugador_a_equipo(self, team_name, player):
        all_teams_with_ids = self.bd.obtener("teams")
        if all_teams_with_ids is None:
            return False
        for team_id, team in all_teams_with_ids:
            if team.name == team_name:
                team.players.append(player)
                self.bd.actualizar("teams", team_id, team)
                return True
        return False

    def obtener_equipo(self, team_name):
        all_teams_with_ids = self.bd.obtener("teams")
        if all_teams_with_ids is None:
            return None
        for team_id, team in all_teams_with_ids:
            if team.name == team_name:
                return team
        return None
