/**
 * Intérprete de fórmulas SEGURO para convertir el valor crudo de un sensor en el
 * dato final. Nunca usa eval(): sólo entiende aritmética, unas pocas funciones y
 * referencias a otros campos de la misma trama.
 *
 *   "x * 0.1"                       escala
 *   "(sis + 2 * dia) / 3"           presión arterial media desde dos campos
 *   "round(sqrt(x) * 10) / 10"      funciones permitidas
 */

// Sin prototipo: 'constructor', 'toString' o 'valueOf' NO deben resolverse como funciones.
const FUNCIONES: Record<string, (...a: number[]) => number> = Object.assign(Object.create(null), {
  sqrt: Math.sqrt, abs: Math.abs, log: Math.log, log10: Math.log10, exp: Math.exp,
  round: Math.round, floor: Math.floor, ceil: Math.ceil,
  min: Math.min, max: Math.max, pow: Math.pow,
});

type Nodo =
  | { t: 'num'; v: number }
  | { t: 'var'; n: string }
  | { t: 'neg'; a: Nodo }
  | { t: 'bin'; op: string; a: Nodo; b: Nodo }
  | { t: 'fn'; n: string; args: Nodo[] };

export class ErrorFormula extends Error {}

function tokenizar(s: string): string[] {
  const out: string[] = [];
  const re = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|[A-Za-z_][A-Za-z0-9_]*|[-+*/^(),])/gy;
  let m: RegExpExecArray | null;
  let i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    m = re.exec(s);
    if (!m) {
      if (/^\s*$/.test(s.slice(i))) break;
      throw new ErrorFormula(`carácter no permitido en la posición ${i}: "${s[i]}"`);
    }
    out.push(m[1]!);
    i = re.lastIndex;
  }
  return out;
}

/** Compila una fórmula a un árbol. Falla al guardar, no al recibir datos. */
export function compilar(formula: string): Nodo {
  if (formula.length > 300) throw new ErrorFormula('fórmula demasiado larga');
  const tk = tokenizar(formula);
  let p = 0;
  const ver = () => tk[p];
  const tomar = (esperado?: string) => {
    const t = tk[p++];
    if (esperado && t !== esperado) throw new ErrorFormula(`se esperaba "${esperado}"`);
    if (t === undefined) throw new ErrorFormula('fórmula incompleta');
    return t;
  };

  const expr = (): Nodo => {
    let a = termino();
    while (ver() === '+' || ver() === '-') { const op = tomar(); a = { t: 'bin', op, a, b: termino() }; }
    return a;
  };
  const termino = (): Nodo => {
    let a = potencia();
    while (ver() === '*' || ver() === '/') { const op = tomar(); a = { t: 'bin', op, a, b: potencia() }; }
    return a;
  };
  const potencia = (): Nodo => {
    const a = unario();
    if (ver() === '^') { tomar(); return { t: 'bin', op: '^', a, b: potencia() }; }
    return a;
  };
  const unario = (): Nodo => {
    if (ver() === '-') { tomar(); return { t: 'neg', a: unario() }; }
    if (ver() === '+') { tomar(); return unario(); }
    return primario();
  };
  const primario = (): Nodo => {
    const t = tomar();
    if (/^\d/.test(t)) return { t: 'num', v: Number(t) };
    if (t === '(') { const e = expr(); tomar(')'); return e; }
    if (/^[A-Za-z_]/.test(t)) {
      if (ver() === '(') {
        if (!Object.hasOwn(FUNCIONES, t)) throw new ErrorFormula(`función no permitida: ${t}`);
        tomar('(');
        const args: Nodo[] = [];
        if (ver() !== ')') { args.push(expr()); while (ver() === ',') { tomar(); args.push(expr()); } }
        tomar(')');
        return { t: 'fn', n: t, args };
      }
      return { t: 'var', n: t };
    }
    throw new ErrorFormula(`símbolo inesperado: "${t}"`);
  };

  const arbol = expr();
  if (p !== tk.length) throw new ErrorFormula(`sobra texto desde "${tk[p]}"`);
  return arbol;
}

/** Nombres de campo que usa la fórmula. Sirve para validar que existan. */
export function variablesDe(n: Nodo, acc = new Set<string>()): Set<string> {
  if (n.t === 'var') acc.add(n.n);
  else if (n.t === 'neg') variablesDe(n.a, acc);
  else if (n.t === 'bin') { variablesDe(n.a, acc); variablesDe(n.b, acc); }
  else if (n.t === 'fn') n.args.forEach((x) => variablesDe(x, acc));
  return acc;
}

export function evaluar(n: Nodo, ctx: Record<string, number>): number {
  switch (n.t) {
    case 'num': return n.v;
    case 'var': {
      if (!Object.hasOwn(ctx, n.n)) throw new ErrorFormula(`campo desconocido: ${n.n}`);
      return ctx[n.n]!;
    }
    case 'neg': return -evaluar(n.a, ctx);
    case 'fn': return FUNCIONES[n.n]!(...n.args.map((a) => evaluar(a, ctx)));
    case 'bin': {
      const a = evaluar(n.a, ctx), b = evaluar(n.b, ctx);
      if (n.op === '+') return a + b;
      if (n.op === '-') return a - b;
      if (n.op === '*') return a * b;
      if (n.op === '/') return a / b;
      return Math.pow(a, b);
    }
  }
}
