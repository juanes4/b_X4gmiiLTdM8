from src.infraestructure.database import ConexionBD
from src.services.player_service import GestionJugadores
from src.services.team_service import GestionEquipos
from src.services.league_service import GestionLigas
from src.aplication.API import API
from src.presentation.web_app import WebApp

def main():
    # 1. Inicializar persistencia
    bd = ConexionBD()

    # 2. Inicializar servicios de lógica
    g_jugadores = GestionJugadores(bd)
    g_equipos = GestionEquipos(bd)
    g_ligas = GestionLigas(bd)

    # 3. Crear API y WebApp
    api = API(g_ligas, g_equipos, g_jugadores)
    app = WebApp(api)

    # 4. Ejecutar flujo
    app.create_new_league_form("Liga BetPlay 2026")
    
    equipo_data = {
        "name": "Nacional", 
        "country": "Colombia", 
        "city": "Medellín", 
        "abbreviation": "NAL", 
        "logo": "escudo.png"
    }
    app.add_team_to_league_form("Liga BetPlay 2026", equipo_data)

if __name__ == "__main__":
    main()