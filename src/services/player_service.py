from domain.interfaces import IGestionJugadores
from domain.entities import Player

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