/**
 * Ingesta del diseño desde la API REST de Figma — SOLO LECTURA.
 *
 * No se usa el MCP a propósito: la API REST no tiene endpoints que modifiquen un diseño,
 * así que es imposible tocar el archivo desde aquí. El token vive en ~/.figma_token_uned
 * (permisos 600, fuera del repo) y solo necesita el scope "File content: read".
 *
 *   node scripts/figma-ingest.mjs
 *
 * Deja en docs/:
 *   figma-raw.json      respuesta cruda de /v1/files/:key/nodes (por si hay que releerla)
 *   figma-spec.md       la geometría medida, legible: es la fuente de verdad de los gates
 *   figma-<node>.png    el render de cada boceto, para el gate visual
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(ROOT, 'docs');

const FILE_KEY = 'JPZhLgJAUUzniPjhSZTAkr';
const NODES = ['2:66', '9:167', '2:46'];

const TOKEN_PATHS = [
  join(homedir(), '.figma_token_uned'),
  join(homedir(), '.figma_token')
];

async function loadToken() {
  for (const path of TOKEN_PATHS) {
    try {
      const token = (await readFile(path, 'utf8')).trim();
      if (token) return { token, path };
    } catch { /* siguiente */ }
  }
  throw new Error(
    'No hay token. Crea uno con scope "File content: read" y guárdalo en ~/.figma_token_uned'
  );
}

async function api(token, path) {
  const res = await fetch(`https://api.figma.com/v1${path}`, {
    headers: { 'X-Figma-Token': token }   // los figd_ NO valen como Bearer
  });
  const body = await res.json();
  if (!res.ok || body.status >= 400) {
    throw new Error(`${path} → ${body.status || res.status}: ${body.err || res.statusText}`);
  }
  return body;
}

/* Recorre el árbol del nodo aplanando lo que importa para medir. */
function flatten(node, depth = 0, out = []) {
  const box = node.absoluteBoundingBox;
  out.push({
    depth,
    id: node.id,
    name: node.name,
    type: node.type,
    x: box ? +box.x.toFixed(2) : null,
    y: box ? +box.y.toFixed(2) : null,
    w: box ? +box.width.toFixed(2) : null,
    h: box ? +box.height.toFixed(2) : null,
    text: node.characters || null,
    font: node.style
      ? {
          family: node.style.fontFamily,
          weight: node.style.fontWeight,
          size: node.style.fontSize,
          lineHeightPx: node.style.lineHeightPx,
          letterSpacing: node.style.letterSpacing,
          align: node.style.textAlignHorizontal
        }
      : null,
    fills: (node.fills || [])
      .filter((f) => f.visible !== false)
      .map((f) =>
        f.type === 'SOLID'
          ? rgbaToHex(f.color, f.opacity)
          : f.type
      ),
    layout: node.layoutMode || null,
    itemSpacing: node.itemSpacing ?? null,
    padding: node.paddingLeft != null
      ? [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft]
      : null,
    cornerRadius: node.cornerRadius ?? null
  });

  (node.children || []).forEach((child) => flatten(child, depth + 1, out));
  return out;
}

function rgbaToHex(color, opacity) {
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const hex = `#${to(color.r)}${to(color.g)}${to(color.b)}`;
  const alpha = opacity == null ? color.a : opacity * color.a;
  return alpha < 0.999 ? `${hex} (${Math.round(alpha * 100)}%)` : hex;
}

function toMarkdown(sections) {
  const lines = [
    '# Especificación medida del diseño',
    '',
    'Generado por `scripts/figma-ingest.mjs` desde la API REST de Figma.',
    'Es la **fuente de verdad de las medidas**: no se copian valores del panel de Figma',
    'ni del "Copy as CSS", que redondea y miente en el line-height.',
    '',
    `Archivo: \`${FILE_KEY}\``,
    '',
    `Generado: ${new Date().toISOString().slice(0, 10)}`,
    ''
  ];

  for (const section of sections) {
    const root = section.rows[0];
    lines.push(
      `## ${root.name}  (\`${root.id}\`)`,
      '',
      `Frame: **${root.w} × ${root.h}**`,
      '',
      '| | Capa | Tipo | x | y | w | h | Tipografía | Relleno |',
      '|---|---|---|---|---|---|---|---|---|'
    );

    for (const row of section.rows) {
      const indent = '·'.repeat(row.depth);
      const font = row.font
        ? `${row.font.family} ${row.font.weight} · ${row.font.size}px / ${row.font.lineHeightPx}px · ls ${row.font.letterSpacing}`
        : '';
      lines.push(
        `| ${indent} | ${row.name} | ${row.type} | ${row.x ?? ''} | ${row.y ?? ''} | ` +
        `${row.w ?? ''} | ${row.h ?? ''} | ${font} | ${row.fills.join(', ')} |`
      );
    }

    const texts = section.rows.filter((r) => r.text);
    if (texts.length) {
      lines.push('', '### Textos literales', '');
      texts.forEach((t) => lines.push(`- **${t.name}**: \`${t.text.replace(/\n/g, '\\n')}\``));
    }

    lines.push('');
  }

  return lines.join('\n');
}

/* ---------- Ejecución ---------- */

const { token, path } = await loadToken();
console.log(`Token: ${path}`);

const me = await api(token, '/me');
console.log(`Cuenta: ${me.email}`);

await mkdir(DOCS, { recursive: true });

const ids = NODES.join(',');
const raw = await api(token, `/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(ids)}`);
await writeFile(join(DOCS, 'figma-raw.json'), JSON.stringify(raw, null, 2));

const sections = NODES.map((id) => {
  const entry = raw.nodes[id] || raw.nodes[id.replace(':', '-')];
  if (!entry) throw new Error(`El nodo ${id} no viene en la respuesta`);
  return { id, rows: flatten(entry.document) };
});

await writeFile(join(DOCS, 'figma-spec.md'), toMarkdown(sections));
console.log(`docs/figma-spec.md — ${sections.reduce((n, s) => n + s.rows.length, 0)} capas medidas`);

/* Renders a escala 2 para el gate visual */
const images = await api(
  token,
  `/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=2`
);

for (const [id, url] of Object.entries(images.images)) {
  if (!url) { console.warn(`Sin render para ${id}`); continue; }
  const png = Buffer.from(await (await fetch(url)).arrayBuffer());
  const name = `figma-${id.replace(':', '-')}.png`;
  await writeFile(join(DOCS, name), png);
  console.log(`docs/${name} — ${(png.length / 1024).toFixed(0)} KB`);
}

console.log('\nIngesta completa.');
for (const section of sections) {
  const root = section.rows[0];
  console.log(`  ${section.id}  ${root.name}  ${root.w}×${root.h}  (${section.rows.length} capas)`);
}
