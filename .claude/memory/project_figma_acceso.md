---
name: project_figma_acceso
description: Qué cuenta de Figma da acceso al archivo del portfolio de Adrián Picazo, y los node-ids de los tres bocetos.
metadata:
  type: project
---

El archivo de diseño del portfolio es `JPZhLgJAUUzniPjhSZTAkr` ("Sin título").

**Dueño:** la cuenta de la UNED de Hugo, `crodrigue548@alumno.uned.es`.

**Cuenta que usa el MCP:** `design@lejanbrand.com` (handle "Lejan"), seat `Full` en el plan
Pro del team Lejan Brand, role admin → 200 llamadas/día, 15/min. Es la sesión que coge el
OAuth desde Chrome.

Para que el MCP pueda leerlo, el archivo tiene que estar compartido con
`design@lejanbrand.com` con permiso **can edit**. Con seat `View`, o sin compartir, cualquier
llamada devuelve `Looks like you don't have edit access to this file` — incluidas las de solo
lectura como `get_metadata` y `get_screenshot`.

Node-ids de los tres bocetos (a confirmar cuál es cuál al leerlos):

- `2:66`
- `9:167`
- `2:46`

Ojo: reconectar el MCP no permite elegir cuenta, reutiliza la sesión abierta en el navegador
por defecto. Compartir el archivo es más rápido que pelearse con la sesión, y además conserva
el `fileKey` y los node-ids (duplicar el archivo cambia el `fileKey`).
