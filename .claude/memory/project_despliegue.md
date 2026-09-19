---
name: project_despliegue
description: Dónde vive publicado el portfolio de Adrián Picazo, con qué cuenta se empuja y cómo está configurado GitHub Pages.
metadata:
  type: project
---

**URL publicada:** https://picazoadrian.github.io

**Repositorio:** `picazoadrian/picazoadrian.github.io`, público, rama `main`, carpeta raíz.

El handle de Adrián es **`picazoadrian`**, no `adrian-picazo` (ese nombre se barajó pero la
cuenta se creó con el otro). El repo tiene que llamarse exactamente `<handle>.github.io` para
que el sitio salga en la raíz del dominio y no en una subcarpeta.

Ojo, `adrianpicazo` a secas está ocupado en GitHub por otra persona (Adrián Picazo Marín, de
la UJI), así que `adrianpicazo.github.io` no era posible. Se descartó comprar el dominio
`adrianpicazo.com`, que sí estaba libre.

## Empujar

En esta máquina hay **tres** cuentas de GitHub autenticadas: `picazoadrian` (la activa),
`Hugo-Rodriguez-Ortega` y `Hugolejan`. Antes de empujar conviene comprobar cuál está activa:

```bash
gh auth status          # ver cuál tiene "Active account: true"
gh auth switch --user picazoadrian
```

Un "Repository not found" en un repo propio casi siempre es la cuenta equivocada, no el repo.

## Pages

Activado por API (`POST repos/:owner/:repo/pages` con `source[branch]=main` y
`source[path]=/`), `build_type: legacy`, HTTPS forzado. No hay workflow de Actions: es un
sitio estático sin build, se sirve tal cual desde la rama.

## El historial se limpió antes del primer push

Los PNG de referencia de Figma (6,5 MB de frames del vídeo) llegaron a commitearse y se
sacaron del historial con `git filter-branch` **antes** de que existiera el remoto. Siguen en
`docs/` en local, ignorados por git. Pasó de 10 MB a 192 KB.
