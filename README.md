# Kilo Speedway Dashboard

## Estructura del repositorio

```text
/
├─ index.html
├─ theme.css
├─ app.js
├─ data.json
└─ assets/
   ├─ logo-competencia.png
   ├─ logo-ranger.png
   └─ fondo-auto.jpg
```

## Qué hace cada archivo

- `index.html`: estructura visual del panel.
- `theme.css`: colores, layout y estilos responsive.
- `app.js`: lógica de búsqueda, filtros, tabs, orden y render.
- `data.json`: base de datos del cronograma en formato fácil de editar.
- `assets/`: imágenes del proyecto.

## Cómo subirlo a GitHub Pages

1. Crear un repositorio nuevo, por ejemplo:
   `kilo-speedway-dashboard`

2. Subir estos archivos a la raíz del repositorio:
   - `index.html`
   - `theme.css`
   - `app.js`
   - `data.json`

3. Crear la carpeta `assets` y subir dentro:
   - `logo-competencia.png`
   - `logo-ranger.png`
   - `fondo-auto.jpg`

4. En GitHub:
   - ir a **Settings**
   - entrar a **Pages**
   - en **Build and deployment**, elegir:
     - **Source:** Deploy from a branch
     - **Branch:** main
     - **Folder:** /root

5. Guardar y esperar que GitHub publique la URL.

## Cómo actualizar la data

Solo reemplazar `data.json`.

Mientras mantengas las mismas claves por fila, la app seguirá funcionando:

```json
{
  "evento": "ALL GAS NO LIMITS",
  "categoria": "DUPLAS MIXTAS ROOKIE",
  "heat": "Heat 1",
  "hora_heat": "11/04/2026 09:00 am",
  "lane": 1,
  "numero": 170,
  "equipo": "LOS DOBLE ESPRESSO ☕️",
  "pais": "Chile",
  "box": "",
  "atleta1": "BRAEN ORELLANA DONOSO",
  "atleta2": "STEPHENIE DE LUCA"
}
```

## Prueba local rápida

Abrir una terminal dentro de la carpeta y ejecutar:

### Python
```bash
python -m http.server 8000
```

Luego abrir:
`http://localhost:8000`

Eso evita problemas de `fetch()` al abrir el HTML directo con doble clic.
