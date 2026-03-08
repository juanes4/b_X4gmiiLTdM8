from dataclasses import dataclass, field
from typing import List, Optional
from abc import ABC, abstractmethod

@dataclass
class Player:
  name: str
  age: int
  position: str
  number: int

@dataclass
class Team:
  name: str
  country: str
  city: str
  abbreviation: str
  logo: str
  points: int = field(default=0)
  goals: list = field(default_factory=list)
  goals_for: int = field(default=0)
  goals_against: int = field(default=0)
  state: str = field(default="active")
  players: list[Player] = field(default_factory=list)

@dataclass
class Match:
  team1: Team
  team2: Team
  score_team1: Optional[int] = field(default=None)
  score_team2: Optional[int] = field(default=None)
  winner: Optional[Team] = field(default=None)

@dataclass
class League:
  name: str
  teams: List[Team] = field(default_factory=list)
  rounds: List[List[Match]] = field(default_factory=list)
  current_round: int = field(default=0)
  matches: List[Match] = field(default_factory=list)


class IConexionBD(ABC):
    @abstractmethod
    def guardar(self, tabla: str, dato: dict):
        pass

    @abstractmethod
    def obtener(self, tabla: str):
        pass

    @abstractmethod
    def actualizar(self, tabla: str, id: str, dato: dict):
        pass

class IGestionLigas(ABC):
    @abstractmethod
    def crear_liga(self, nombre_liga: str):
        pass

    @abstractmethod
    def agregar_equipo_a_liga(self, nombre_liga: str, equipo: 'Team'):
        pass

    @abstractmethod
    def generar_calendario(self, nombre_liga: str):
        pass

    @abstractmethod
    def registrar_resultado(self, nombre_liga: str, match_id: str, score_team1: int, score_team2: int):
        pass

    @abstractmethod
    def calcular_clasificacion(self, nombre_liga: str):
        pass

class IGestionEquipos(ABC):
    @abstractmethod
    def crear_equipo(self, name: str, country: str, city: str, abbreviation: str, logo: str):
        pass

    @abstractmethod
    def agregar_jugador_a_equipo(self, team_name: str, player: 'Player'):
        pass

    @abstractmethod
    def obtener_equipo(self, team_name: str):
        pass

class IGestionJugadores(ABC):
    @abstractmethod
    def crear_jugador(self, name: str, age: int, position: str, number: int):
        pass

    @abstractmethod
    def obtener_jugador(self, player_name: str):
        pass


#persistencia
class ConexionBD(IConexionBD):
    def __init__(self):
        self.storage = {
            "players": {},
            "teams": {},
            "leagues": {},
            "matches": {}
        }
        self._id_counter = 0 

    def _generate_id(self):
        self._id_counter += 1
        return str(self._id_counter)

    def guardar(self, tabla, dato):
        if tabla not in self.storage:
            print(f"[BD] Error: Tabla '{tabla}' no existe.")
            return None

        item_id = self._generate_id()
        self.storage[tabla][item_id] = dato

        print(f"[BD] Guardando en {tabla} con ID: {item_id}")
        return item_id

    def obtener(self, tabla, item_id = None):
        if tabla not in self.storage:
            print(f"[BD] Error: Tabla '{tabla}' no existe.")
            return None

        if item_id:
            return self.storage[tabla].get(item_id)
        return [(id, obj) for id, obj in self.storage[tabla].items()]

    def actualizar(self, tabla, id, dato):
        if tabla not in self.storage:
            print(f"[BD] Error: Tabla '{tabla}' no existe.")
            return False

        if id not in self.storage[tabla]:
            print(f"[BD] Error: ID '{id}' no encontrado en la tabla '{tabla}'.")
            return False

        self.storage[tabla][id] = dato

        print(f"[BD] Actualizando en {tabla} con ID: {id}")
        return True


class GestionJugadores(IGestionJugadores):
    def __init__(self, bd):
        self.bd = bd

    def crear_jugador(self, name, age, position, number):
        player = Player(name=name, age=age, position=position, number=number)
        self.bd.guardar("players", player)
        return player

    def obtener_jugador(self, player_name):
        all_players_with_ids = self.bd.obtener("players")
        if all_players_with_ids is None:
            return None
        for player_id, player in all_players_with_ids:
            if player.name == player_name:
                return player
        return None


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
    

class WebApp:
    def __init__(self, api: API):
        self.api = api

    def show_dashboard(self):
        print("[WebApp] Displaying League Dashboard...")

    def create_new_league_form(self, name: str):
        print(f"[WebApp] User creating league: {name}")
        league = self.api.crear_liga(name)
        if league: print(f"[WebApp] League '{league.name}' created successfully!")
        else: print("[WebApp] Failed to create league.")

    def add_team_to_league_form(self, league_name: str, team_data: dict):
        print(f"[WebApp] User adding team to {league_name}: {team_data['name']}")
        team = self.api.crear_equipo(**team_data)
        if team and self.api.agregar_equipo_a_liga(league_name, team):
            print(f"[WebApp] Team '{team.name}' added to '{league_name}' successfully!")
        else: print("[WebApp] Failed to add team to league.")