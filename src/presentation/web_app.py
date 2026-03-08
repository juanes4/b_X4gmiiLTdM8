from aplication.API import API

class WebApp:
    def __init__(self, api: API):
        self.api = api

    def show_dashboard(self):
        print("Mostrando dashboard...")

    def create_new_league_form(self, name: str):
        print(f"Usuario: {name}. Creando liga")
        league = self.api.crear_liga(name)
        if league: print(f"[WebApp] Liga '{league.name}' Creada con exito!")
        else: print("[WebApp] Failed to create league.")

    def add_team_to_league_form(self, league_name: str, team_data: dict):
        print(f"[WebApp] Usuario agregando equipo a {league_name}: {team_data['name']}")
        team = self.api.crear_equipo(**team_data)
        if team and self.api.agregar_equipo_a_liga(league_name, team):
            print(f"[WebApp] Equipo '{team.name}' agregado a '{league_name}' con exito!")
        else: print("[WebApp] No se ha podido agregar el equipo.")