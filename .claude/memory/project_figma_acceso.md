---
name: project_figma_acceso
description: Cómo se lee el Figma del portfolio de Adrián Picazo — API REST de solo lectura con el token de la cuenta UNED, nunca el MCP.
metadata:
  type: project
---

El archivo de diseño del portfolio es `JPZhLgJAUUzniPjhSZTAkr`, y pertenece a la cuenta de
Figma de la UNED de Hugo (`crodrigue548@alumno.uned.es`), a cuya cuenta de Google no tiene
acceso.

## El MCP de Figma NO se usa en este proyecto

Dos razones:

1. **Exige acceso de edición.** Con seat `View`, o sin estar compartido, hasta las llamadas de
   solo lectura (`get_metadata`, `get_screenshot`) devuelven
   `Looks like you don't have edit access to this file`.
2. **Hugo no quiere permiso de escritura sobre ese archivo.** El MCP incluye herramientas que
   modifican diseños (`use_figma`); la API REST no tiene ninguna.

Además, el OAuth del MCP **no deja elegir cuenta**: reutiliza la sesión abierta en el
navegador por defecto. Reconectar dio `hugo@lejanbrand.com` primero y `design@lejanbrand.com`
después, nunca la cuenta que hacía falta.

## La vía buena: API REST, solo lectura

- Token en `~/.figma_token_uned` (permisos 600, fuera del repo), generado en la cuenta UNED
  con scope **únicamente** `File content: read`.
- Cabecera `X-Figma-Token`. Los tokens `figd_` **no** valen como `Authorization: Bearer`.
- Salir a `api.figma.com` requiere `dangerouslyDisableSandbox: true` en el Bash tool.
- Un 404 en `/v1/files/:key` significa que ese token no ve el archivo (no que no exista).

Todo lo ejecuta `scripts/figma-ingest.mjs`, que escribe `docs/figma-raw.json`,
`docs/figma-spec.md` y un PNG por boceto.

Node-ids de los tres bocetos (falta confirmar cuál es cuál al leerlos): `2:66`, `9:167`, `2:46`.

Ver también la memoria global [[reference_figma_export_masivo_rest_api]], que ya documentaba
el token de `hugo@lejanbrand.com` en `~/.figma_token` para exportaciones en lote.
