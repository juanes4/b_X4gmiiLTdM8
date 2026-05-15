from src.database import get_db

players = [
    ("Andrés Ospina", 28, "Goalkeeper", 1),
    ("Luis Díaz", 26, "Goalkeeper", 23),
    ("Santiago Arias", 31, "Defender", 2),
    ("Yerry Mina", 28, "Defender", 3),
    ("Davinson Sánchez", 26, "Defender", 4),
    ("Juan Cuadrado", 33, "Defender", 5),
    ("William Tesillo", 27, "Defender", 6),
    ("Jeison Murillo", 30, "Defender", 7),
    ("Jáider Moreno", 24, "Defender", 8),
    ("Cristian Benavente", 25, "Defender", 9),
    ("Carlos Cuesta", 24, "Defender", 10),
    ("Mateus Uribe", 28, "Midfielder", 11),
    ("Wilmar Barrios", 30, "Midfielder", 12),
    ("Juan Guillermo Cuadrado", 29, "Midfielder", 13),
    ("Miguel Borja", 27, "Midfielder", 14),
    ("Richard Ríos", 25, "Midfielder", 15),
    ("Ariel Rodríguez", 22, "Midfielder", 16),
    ("Steven Alzate", 23, "Midfielder", 17),
    ("Alfredo Morelos", 26, "Forward", 18),
    ("Luis Muriel", 31, "Forward", 19),
    ("Radamel Falcao", 37, "Forward", 20),
    ("Duván Zapata", 31, "Forward", 21),
]

conn = get_db()
try:
    for name, age, position, number in players:
        conn.execute(
            "INSERT INTO players (name, age, position, number) VALUES (?,?,?,?)",
            (name, age, position, number)
        )
    conn.commit()
    print(f"✓ {len(players)} jugadores insertados correctamente")
except Exception as e:
    conn.rollback()
    print(f"✗ Error al insertar jugadores: {e}")
finally:
    conn.close()
