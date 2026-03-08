from ..domain.interfaces import IConexionBD
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

