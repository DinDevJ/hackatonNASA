/**
 * Verifica las fuentes que citan mis 78 variables (catálogos 02 y 03).
 *  - DOI: se resuelve en doi.org (API de handles) y se obtiene el título real en Crossref.
 *  - PubMed (PMID): se obtiene título y DOI con NCBI E-utilities (esummary).
 *  - URL: se comprueba que abre (HTTP 2xx tras redirecciones).
 * Uso: npm run fuentes   →   out/fuentes-verificadas.json
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const CAT = new URL("../../../../variables-diagnostico/", import.meta.url);
const UA = "monarcas-ingesta/0.1 (hackathon research script)";

interface Ref {
  catalogo: "02" | "03";
  n: string;
  texto: string;
  dois: string[];
  pmids: string[];
  urls: string[];
}

function leerRefs(archivo: string, catalogo: "02" | "03"): Ref[] {
  const txt = readFileSync(new URL(archivo, CAT), "utf8");
  const seccion = txt.slice(txt.indexOf("## Fuentes"));
  return seccion
    .split("\n")
    .map((l) => /^(\d+b?)\.\s+(.*)$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map(([, n, texto]) => {
      const t = texto ?? "";
      const urls = [...t.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0].replace(/[.,;]$/, ""));
      const dois = [...new Set([...t.matchAll(/\b(10\.\d{4,9}\/[^\s)]+)/gi)].map((m) => m[1]!.replace(/[.,;]$/, "").toLowerCase()))];
      const pmids = [...new Set(urls.map((u) => /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/.exec(u)?.[1]).filter((x): x is string => Boolean(x)))];
      return { catalogo, n: n ?? "", texto: t, dois, pmids, urls };
    });
}

/** IDs de referencia que usan mis variables (columna Fuente de cada fila). */
function refsUsadas(archivo: string, ids: (n: number) => boolean): Set<string> {
  const usadas = new Set<string>();
  for (const l of readFileSync(new URL(archivo, CAT), "utf8").split("\n")) {
    const m = /^\| V(\d+)[ab]? \|/.exec(l);
    if (!m || !ids(Number(m[1]))) continue;
    for (const r of l.matchAll(/\[(\d+b?)\]/g)) usadas.add(r[1]!);
  }
  return usadas;
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function json(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function verificarDoi(doi: string) {
  try {
    const h = (await json(`https://doi.org/api/handles/${encodeURIComponent(doi)}`)) as { responseCode: number };
    const resuelve = h.responseCode === 1;
    let titulo: string | null = null;
    let revista: string | null = null;
    let anio: number | null = null;
    try {
      const c = (await json(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)) as {
        message: { title?: string[]; "container-title"?: string[]; issued?: { "date-parts"?: number[][] } };
      };
      titulo = c.message.title?.[0] ?? null;
      revista = c.message["container-title"]?.[0] ?? null;
      anio = c.message.issued?.["date-parts"]?.[0]?.[0] ?? null;
    } catch {
      /* algunos DOI (p. ej. DataCite) no están en Crossref */
    }
    return { doi, resuelve, enlace: `https://doi.org/${doi}`, titulo, revista, anio };
  } catch (e) {
    return { doi, resuelve: false, enlace: `https://doi.org/${doi}`, titulo: null, revista: null, anio: null, error: String(e) };
  }
}

async function verificarPmid(pmid: string) {
  try {
    const r = (await json(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`)) as {
      result: Record<string, { title?: string; source?: string; pubdate?: string; articleids?: { idtype: string; value: string }[]; error?: string }>;
    };
    const x = r.result[pmid];
    if (!x || x.error) return { pmid, existe: false };
    return {
      pmid,
      existe: true,
      titulo: x.title ?? null,
      revista: x.source ?? null,
      fecha: x.pubdate ?? null,
      doi: x.articleids?.find((a) => a.idtype === "doi")?.value.toLowerCase() ?? null,
    };
  } catch (e) {
    return { pmid, existe: false, error: String(e) };
  }
}

async function verificarUrl(url: string) {
  try {
    const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": UA } });
    await r.body?.cancel();
    return { url, http: r.status, abre: r.ok };
  } catch (e) {
    return { url, http: 0, abre: false, error: String(e) };
  }
}

const refs = [
  ...leerRefs("02-hueso-musculo-rinon-nutricion.md", "02").filter((r) =>
    refsUsadas("02-hueso-musculo-rinon-nutricion.md", (n) => n >= 40 && n <= 97).has(r.n),
  ),
  ...leerRefs("03-conducta-sueno-cognicion.md", "03").filter((r) =>
    refsUsadas("03-conducta-sueno-cognicion.md", (n) => (n >= 30 && n <= 43) || n === 49 || n === 50 || n === 82 || n === 83).has(r.n),
  ),
];

const resultado = [];
for (const r of refs) {
  const dois = [];
  const pmids = [];
  for (const p of r.pmids) {
    const v = await verificarPmid(p);
    pmids.push(v);
    if ("doi" in v && v.doi && !r.dois.includes(v.doi)) r.dois.push(v.doi); // DOI obtenido de PubMed
    await pausa(400); // límite de NCBI sin API key: 3 por segundo
  }
  for (const d of r.dois) dois.push(await verificarDoi(d));
  const urls = [];
  for (const u of r.urls) urls.push(await verificarUrl(u));
  const algunaAbre = urls.some((u) => u.abre) || dois.some((d) => d.resuelve);
  resultado.push({ ref: `${r.catalogo}[${r.n}]`, cita: r.texto.slice(0, 200), estado: algunaAbre ? "verificada" : "NO VERIFICADA", dois, pmids, urls });
  console.log(`${algunaAbre ? "✓" : "✗"} ${r.catalogo}[${r.n}] doi:${dois.map((d) => (d.resuelve ? "ok" : "X")).join(",") || "-"} url:${urls.map((u) => u.http).join(",")}`);
}

const OUT = new URL("../../out/", import.meta.url);
mkdirSync(OUT, { recursive: true });
writeFileSync(new URL("fuentes-verificadas.json", OUT), JSON.stringify({ verificado: new Date().toISOString(), fuentes: resultado }, null, 2) + "\n");
console.log(`\n${resultado.filter((r) => r.estado === "verificada").length}/${resultado.length} fuentes verificadas → out/fuentes-verificadas.json`);
