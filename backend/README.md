# Football Championship Backend

API REST en Python/Flask + SQLite.

## Requisitos

- Python 3.11+
- pip

## Instalación

```bash
cd backend
pip install -r requirements.txt
python run.py
```

Servidor corre en `http://localhost:5000`

---

## Endpoints

### Teams

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/teams` | Listar equipos |
| GET | `/api/teams/:id` | Equipo + jugadores |
| POST | `/api/teams` | Crear equipo |
| PUT | `/api/teams/:id` | Actualizar equipo |
| DELETE | `/api/teams/:id` | Eliminar equipo |

**POST /api/teams** body:
```json
{
  "name": "Atlético Nacional",
  "country": "Colombia",
  "city": "Medellín",
  "abbreviation": "ATN",
  "logo": "https://...",
  "state": "active",
  "players": [
    { "name": "Juan Pérez", "position": "Goalkeeper" }
  ]
}
```

---

### Players

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/players` | Listar jugadores |
| POST | `/api/players` | Crear jugador |
| PUT | `/api/players/:id` | Actualizar jugador |
| DELETE | `/api/players/:id` | Eliminar jugador |

**POST /api/players** body:
```json
{
  "name": "Juan Pérez",
  "age": 25,
  "position": "Striker",
  "number": 9,
  "team_id": 1
}
```

---

### Leagues

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/leagues` | Listar ligas |
| GET | `/api/leagues/:id` | Liga con equipos y grupos |
| POST | `/api/leagues` | Crear liga |
| PUT | `/api/leagues/:id` | Actualizar liga |
| DELETE | `/api/leagues/:id` | Eliminar liga |
| POST | `/api/leagues/:id/generate-groups` | Generar grupos aleatorios |
| GET | `/api/leagues/:id/standings` | Tabla de posiciones |

**POST /api/leagues** body:
```json
{
  "name": "Liga Postobón 2025",
  "state": "active",
  "current_round": 0,
  "teams": [1, 2, 3, 4, 5, 6, 7, 8]
}
```

**POST /api/leagues/:id/generate-groups** body:
```json
{ "num_groups": 2 }
```

**GET /api/leagues/:id/standings** — tabla general  
**GET /api/leagues/:id/standings?group_id=1** — tabla de un grupo

Respuesta standings:
```json
[
  {
    "position": 1,
    "id": 3,
    "name": "Atlético Nacional",
    "abbreviation": "ATN",
    "played": 3,
    "won": 2,
    "drawn": 1,
    "lost": 0,
    "goals_for": 7,
    "goals_against": 2,
    "goal_diff": 5,
    "points": 7
  }
]
```

---

### Matches

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/matches` | Listar partidos |
| GET | `/api/matches?league_id=1` | Partidos de una liga |
| GET | `/api/matches/:id` | Detalle de partido |
| POST | `/api/matches` | Crear partido |
| PUT | `/api/matches/:id/result` | Registrar resultado |
| DELETE | `/api/matches/:id` | Eliminar partido |

**POST /api/matches** body:
```json
{
  "league_id": 1,
  "group_id": 2,
  "team1_id": 1,
  "team2_id": 2,
  "round": 1
}
```

**PUT /api/matches/:id/result** body:
```json
{
  "score_team1": 2,
  "score_team2": 1
}
```

---

## Reglas de negocio

- Victoria → 3 puntos
- Empate → 1 punto
- Derrota → 0 puntos

**Desempate (en orden):**
1. Diferencia de goles
2. Goles a favor
3. Resultado directo entre equipos

## Estructura

```
backend/
├── run.py              # Entrypoint
├── requirements.txt
├── championship.db     # SQLite (se crea automático)
└── src/
    ├── app.py          # Flask app factory
    ├── database.py     # Conexión + schema SQL
    ├── routes.py       # Todos los endpoints
    └── services.py     # Lógica de negocio
```
