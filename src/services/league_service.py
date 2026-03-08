from ..domain.interfaces import IGestionLigas
from ..domain.entities import League



class GestionLigas(IGestionLigas):
    def __init__(self, bd):
        self.bd = bd

    def crear_liga(self, nombre_liga):
        liga = League(name=nombre_liga)
        self.bd.guardar("leagues", liga)
        return liga

    def agregar_equipo_a_liga(self, nombre_liga, equipo):
        all_leagues_with_ids = self.bd.obtener("leagues")
        if all_leagues_with_ids is None:
            return False
        for league_id, liga in all_leagues_with_ids:
            if liga.name == nombre_liga:
                liga.teams.append(equipo)
                self.bd.actualizar("leagues", league_id, liga)
                return True
        return False

    def generar_calendario(self, nombre_liga):
        pass

    def registrar_resultado(self, nombre_liga, match_id, score_team1, score_team2):
        return False

    def calcular_clasificacion(self, nombre_liga):
        pass