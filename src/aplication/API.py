from domain import IGestionLigas, IGestionEquipos, IGestionJugadores, League, Team, Player, Optional

class API:
    def __init__(self, gestion_ligas: IGestionLigas, gestion_equipos: IGestionEquipos, gestion_jugadores: IGestionJugadores):
        self.gestion_ligas = gestion_ligas
        self.gestion_equipos = gestion_equipos
        self.gestion_jugadores = gestion_jugadores

    # League manejo
    def crear_liga(self, nombre_liga: str) -> League:
        return self.gestion_ligas.crear_liga(nombre_liga)

    def agregar_equipo_a_liga(self, nombre_liga: str, equipo: Team) -> bool:
        return self.gestion_ligas.agregar_equipo_a_liga(nombre_liga, equipo)

    def generar_calendario_liga(self, nombre_liga: str):
        self.gestion_ligas.generar_calendario(nombre_liga)

    def registrar_resultado_partido(self, nombre_liga: str, match_id: str, score_team1: int, score_team2: int) -> bool:
        return self.gestion_ligas.registrar_resultado(nombre_liga, match_id, score_team1, score_team2)

    def calcular_clasificacion_liga(self, nombre_liga: str):
        self.gestion_ligas.calcular_clasificacion(nombre_liga)

    # Team manejo
    def crear_equipo(self, name: str, country: str, city: str, abbreviation: str, logo: str) -> Team:
        return self.gestion_equipos.crear_equipo(name, country, city, abbreviation, logo)

    def agregar_jugador_a_equipo(self, team_name: str, player: Player) -> bool:
        return self.gestion_equipos.agregar_jugador_a_equipo(team_name, player)

    def obtener_equipo(self, team_name: str) -> Optional[Team]:
        return self.gestion_equipos.obtener_equipo(team_name)

    # Player manejo
    def crear_jugador(self, name: str, age: int, position: str, number: int) -> Player:
        return self.gestion_jugadores.crear_jugador(name, age, position, number)

    def obtener_jugador(self, player_name: str) -> Optional[Player]:
        return self.gestion_jugadores.obtener_jugador(player_name)
    