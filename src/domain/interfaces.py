from dataclasses import dataclass, field
from typing import List, Optional
from abc import ABC, abstractmethod
from entities import Player, Team, Match, League


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
