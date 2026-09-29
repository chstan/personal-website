// A small Scheme interpreter used by the /scheme REPL page.
//
// This is a client-side re-implementation of the server-backed C interpreter
// (github.com/chstan/SchemeREPL) that powered the 2015 incarnation of the site.
// It supports a practical subset of Scheme: numbers, booleans, strings,
// symbols, lists, closures with proper tail calls, and the usual special forms.

export class SchemeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemeError';
  }
}

/** Raised by the reader when the input ends before an expression is closed. */
export class IncompleteInputError extends SchemeError {
  constructor() {
    super('unexpected end of input');
    this.name = 'IncompleteInputError';
  }
}

export class Sym {
  private static table = new Map<string, Sym>();

  private constructor(readonly name: string) {}

  static of(name: string): Sym {
    let s = Sym.table.get(name);
    if (s === undefined) {
      s = new Sym(name);
      Sym.table.set(name, s);
    }
    return s;
  }
}

class Nil {}
class Unspecified {}

export const NIL = new Nil();
export const UNSPECIFIED = new Unspecified();

export class Pair {
  constructor(public car: Value, public cdr: Value) {}
}

export class Builtin {
  constructor(readonly name: string, readonly fn: (args: Value[], interp: Interpreter) => Value) {}
}

export class Lambda {
  constructor(
    readonly params: Sym[],
    readonly rest: Sym | null,
    readonly body: Value[],
    readonly env: Env,
    public name: string | null,
  ) {}
}

export type Value = number | boolean | string | Sym | Nil | Unspecified | Pair | Builtin | Lambda;

export class Env {
  private vars = new Map<Sym, Value>();

  constructor(readonly parent: Env | null = null) {}

  define(s: Sym, v: Value): void {
    this.vars.set(s, v);
  }

  lookup(s: Sym): Value {
    const v = this.vars.get(s);
    if (v !== undefined) {
      return v;
    }
    if (this.parent === null) {
      throw new SchemeError(`unbound variable: ${s.name}`);
    }
    return this.parent.lookup(s);
  }

  set(s: Sym, v: Value): void {
    if (this.vars.has(s)) {
      this.vars.set(s, v);
    } else if (this.parent === null) {
      throw new SchemeError(`set!: unbound variable: ${s.name}`);
    } else {
      this.parent.set(s, v);
    }
  }
}

// ---------------------------------------------------------------------------
// Reader

const TOKEN_RE = /\s*(?:;[^\n]*|(,@|[()'`,])|("(?:\\.|[^\\"])*"?)|([^\s()'`",;]+))/y;

export const tokenize = (src: string): string[] => {
  const tokens: string[] = [];
  TOKEN_RE.lastIndex = 0;
  while (TOKEN_RE.lastIndex < src.length) {
    const start = TOKEN_RE.lastIndex;
    const m = TOKEN_RE.exec(src);
    if (m === null || TOKEN_RE.lastIndex === start) {
      break;
    }
    const tok = m[1] ?? m[2] ?? m[3];
    if (tok !== undefined) {
      tokens.push(tok);
    }
  }
  return tokens;
};

const QUOTE_NAMES: Record<string, string> = {
  "'": 'quote',
  '`': 'quasiquote',
  ',': 'unquote',
  ',@': 'unquote-splicing',
};

const parseAtom = (tok: string): Value => {
  if (tok === '#t' || tok === '#true') return true;
  if (tok === '#f' || tok === '#false') return false;
  if (tok.startsWith('"')) {
    if (!/^"(?:\\.|[^\\"])*"$/.test(tok)) {
      throw new IncompleteInputError();
    }
    return tok.slice(1, -1).replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c === 't' ? '\t' : c));
  }
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(tok)) {
    return Number(tok);
  }
  if (tok.startsWith('#')) {
    throw new SchemeError(`unknown syntax: ${tok}`);
  }
  return Sym.of(tok.toLowerCase());
};

class Reader {
  private pos = 0;

  constructor(private readonly tokens: string[]) {}

  atEnd(): boolean {
    return this.pos >= this.tokens.length;
  }

  read(): Value {
    if (this.atEnd()) {
      throw new IncompleteInputError();
    }
    const tok = this.tokens[this.pos++];
    if (tok === '(') {
      const items: Value[] = [];
      let tail: Value = NIL;
      for (;;) {
        if (this.atEnd()) {
          throw new IncompleteInputError();
        }
        const next = this.tokens[this.pos];
        if (next === ')') {
          this.pos++;
          break;
        }
        if (next === '.') {
          this.pos++;
          if (items.length === 0) {
            throw new SchemeError('unexpected "."');
          }
          tail = this.read();
          if (this.atEnd()) {
            throw new IncompleteInputError();
          }
          if (this.tokens[this.pos++] !== ')') {
            throw new SchemeError('expected ")" after dotted tail');
          }
          break;
        }
        items.push(this.read());
      }
      return arrayToList(items, tail);
    }
    if (tok === ')') {
      throw new SchemeError('unexpected ")"');
    }
    if (tok in QUOTE_NAMES) {
      return list(Sym.of(QUOTE_NAMES[tok]), this.read());
    }
    return parseAtom(tok);
  }
}

/** Parse every expression in `src`. Throws IncompleteInputError on unbalanced input. */
export const parse = (src: string): Value[] => {
  const reader = new Reader(tokenize(src));
  const out: Value[] = [];
  while (!reader.atEnd()) {
    out.push(reader.read());
  }
  return out;
};

/** True if `src` is a complete sequence of expressions (useful for multi-line REPL input). */
export const isComplete = (src: string): boolean => {
  try {
    parse(src);
    return true;
  } catch (e) {
    return !(e instanceof IncompleteInputError);
  }
};

// ---------------------------------------------------------------------------
// List helpers

export const arrayToList = (items: Value[], tail: Value = NIL): Value => {
  let result = tail;
  for (let i = items.length - 1; i >= 0; i--) {
    result = new Pair(items[i], result);
  }
  return result;
};

export const list = (...items: Value[]): Value => arrayToList(items);

export const listToArray = (v: Value, what = 'list'): Value[] => {
  const out: Value[] = [];
  let cur = v;
  while (cur instanceof Pair) {
    out.push(cur.car);
    cur = cur.cdr;
  }
  if (cur !== NIL) {
    throw new SchemeError(`expected a proper ${what}, got ${show(v)}`);
  }
  return out;
};

const isTruthy = (v: Value): boolean => v !== false;

// ---------------------------------------------------------------------------
// Printer

export const show = (v: Value, display = false): string => {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '#t' : '#f';
  if (typeof v === 'string') return display ? v : JSON.stringify(v);
  if (v instanceof Sym) return v.name;
  if (v === NIL) return '()';
  if (v === UNSPECIFIED) return '';
  if (v instanceof Builtin) return `#<builtin ${v.name}>`;
  if (v instanceof Lambda) return v.name ? `#<procedure ${v.name}>` : '#<procedure>';
  if (v instanceof Pair) {
    if (v.car instanceof Sym && v.cdr instanceof Pair && v.cdr.cdr === NIL) {
      const prefix = Object.keys(QUOTE_NAMES).find((k) => QUOTE_NAMES[k] === (v.car as Sym).name);
      if (prefix !== undefined) {
        return prefix + show(v.cdr.car, display);
      }
    }
    const parts: string[] = [];
    let cur: Value = v;
    while (cur instanceof Pair) {
      parts.push(show(cur.car, display));
      cur = cur.cdr;
    }
    if (cur !== NIL) {
      parts.push('.', show(cur, display));
    }
    return `(${parts.join(' ')})`;
  }
  return '#<unknown>';
};

// ---------------------------------------------------------------------------
// Evaluator

const S = {
  quote: Sym.of('quote'),
  quasiquote: Sym.of('quasiquote'),
  unquote: Sym.of('unquote'),
  unquoteSplicing: Sym.of('unquote-splicing'),
  if: Sym.of('if'),
  define: Sym.of('define'),
  set: Sym.of('set!'),
  lambda: Sym.of('lambda'),
  begin: Sym.of('begin'),
  let: Sym.of('let'),
  letStar: Sym.of('let*'),
  letrec: Sym.of('letrec'),
  cond: Sym.of('cond'),
  else: Sym.of('else'),
  and: Sym.of('and'),
  or: Sym.of('or'),
  when: Sym.of('when'),
  unless: Sym.of('unless'),
};

const expectSym = (v: Value, form: string): Sym => {
  if (!(v instanceof Sym)) {
    throw new SchemeError(`${form}: expected a symbol, got ${show(v)}`);
  }
  return v;
};

const parseParams = (spec: Value): [Sym[], Sym | null] => {
  const params: Sym[] = [];
  let cur = spec;
  while (cur instanceof Pair) {
    params.push(expectSym(cur.car, 'lambda'));
    cur = cur.cdr;
  }
  if (cur === NIL) {
    return [params, null];
  }
  return [params, expectSym(cur, 'lambda')];
};

const makeLambda = (spec: Value, body: Value[], env: Env, name: string | null): Lambda => {
  if (body.length === 0) {
    throw new SchemeError('lambda: empty body');
  }
  const [params, rest] = parseParams(spec);
  return new Lambda(params, rest, body, env, name);
};

const bindArgs = (fn: Lambda, args: Value[]): Env => {
  const n = fn.params.length;
  if (args.length < n || (fn.rest === null && args.length > n)) {
    throw new SchemeError(
      `${fn.name ?? 'procedure'}: expected ${fn.rest ? 'at least ' : ''}${n} argument${n === 1 ? '' : 's'}, got ${args.length}`,
    );
  }
  const env = new Env(fn.env);
  fn.params.forEach((p, i) => env.define(p, args[i]));
  if (fn.rest !== null) {
    env.define(fn.rest, arrayToList(args.slice(n)));
  }
  return env;
};

export interface InterpreterOptions {
  /** Maximum evaluation steps per `run` call before aborting (guards infinite loops). */
  stepBudget?: number;
  /** Maximum nesting of non-tail calls before aborting (guards the JS stack). */
  maxDepth?: number;
}

export interface RunResult {
  /** Text written with `display` / `newline`. */
  output: string;
  /** Printed values of each top-level expression (unspecified values omitted). */
  values: string[];
  /** Error message if evaluation failed; earlier values/output are still reported. */
  error?: string;
}

export class Interpreter {
  readonly global: Env;
  readonly stepBudget: number;
  readonly maxDepth: number;
  private steps = 0;
  private depth = 0;
  private out: string[] = [];

  constructor(options: InterpreterOptions = {}) {
    this.stepBudget = options.stepBudget ?? 1_000_000;
    this.maxDepth = options.maxDepth ?? 2_000;
    this.global = new Env();
    installPrimitives(this.global);
  }

  write(s: string): void {
    this.out.push(s);
  }

  /** Read and evaluate all expressions in `src`, with a fresh step budget. */
  run(src: string): RunResult {
    this.steps = 0;
    this.depth = 0;
    this.out = [];
    const values: string[] = [];
    const finish = (error?: string): RunResult => {
      const result: RunResult = {output: this.out.join(''), values};
      if (error !== undefined) {
        result.error = error;
      }
      return result;
    };
    try {
      for (const expr of parse(src)) {
        const v = this.eval(expr, this.global);
        if (v !== UNSPECIFIED) {
          values.push(show(v));
        }
      }
    } catch (e) {
      if (e instanceof SchemeError) {
        return finish(e.message);
      }
      if (e instanceof RangeError) {
        return finish('maximum recursion depth exceeded');
      }
      throw e;
    }
    return finish();
  }

  apply(fn: Value, args: Value[]): Value {
    if (fn instanceof Builtin) {
      return fn.fn(args, this);
    }
    if (fn instanceof Lambda) {
      return this.evalBody(fn.body, bindArgs(fn, args));
    }
    throw new SchemeError(`not a procedure: ${show(fn)}`);
  }

  private evalBody(body: Value[], env: Env): Value {
    for (let i = 0; i < body.length - 1; i++) {
      this.eval(body[i], env);
    }
    return this.eval(body[body.length - 1], env);
  }

  eval(expr: Value, env: Env): Value {
    this.depth++;
    if (this.depth > this.maxDepth) {
      throw new SchemeError('maximum recursion depth exceeded');
    }
    try {
      return this.evalLoop(expr, env);
    } finally {
      this.depth--;
    }
  }

  // Tail positions re-enter the loop instead of recursing, giving proper tail calls.
  private evalLoop(expr: Value, env: Env): Value {
    for (;;) {
      if (++this.steps > this.stepBudget) {
        throw new SchemeError(`step budget of ${this.stepBudget} exceeded (infinite loop?)`);
      }
      if (expr instanceof Sym) {
        return env.lookup(expr);
      }
      if (!(expr instanceof Pair)) {
        if (expr === NIL) {
          throw new SchemeError('cannot evaluate empty combination ()');
        }
        return expr;
      }
      const head = expr.car;
      const args = listToArray(expr.cdr, 'expression');

      if (head === S.quote) {
        if (args.length !== 1) throw new SchemeError('quote: expected 1 argument');
        return args[0];
      }
      if (head === S.quasiquote) {
        if (args.length !== 1) throw new SchemeError('quasiquote: expected 1 argument');
        return this.quasi(args[0], env);
      }
      if (head === S.if) {
        if (args.length < 2 || args.length > 3) throw new SchemeError('if: expected 2 or 3 arguments');
        if (isTruthy(this.eval(args[0], env))) {
          expr = args[1];
        } else if (args.length === 3) {
          expr = args[2];
        } else {
          return UNSPECIFIED;
        }
        continue;
      }
      if (head === S.define) {
        if (args.length < 1) throw new SchemeError('define: missing name');
        const target = args[0];
        if (target instanceof Pair) {
          const name = expectSym(target.car, 'define');
          env.define(name, makeLambda(target.cdr, args.slice(1), env, name.name));
        } else {
          const name = expectSym(target, 'define');
          if (args.length !== 2) throw new SchemeError('define: expected a name and a value');
          const v = this.eval(args[1], env);
          if (v instanceof Lambda && v.name === null) v.name = name.name;
          env.define(name, v);
        }
        return UNSPECIFIED;
      }
      if (head === S.set) {
        if (args.length !== 2) throw new SchemeError('set!: expected a name and a value');
        env.set(expectSym(args[0], 'set!'), this.eval(args[1], env));
        return UNSPECIFIED;
      }
      if (head === S.lambda) {
        if (args.length < 1) throw new SchemeError('lambda: missing parameter list');
        return makeLambda(args[0], args.slice(1), env, null);
      }
      if (head === S.begin) {
        if (args.length === 0) return UNSPECIFIED;
        for (let i = 0; i < args.length - 1; i++) this.eval(args[i], env);
        expr = args[args.length - 1];
        continue;
      }
      if (head === S.let || head === S.letStar || head === S.letrec) {
        if (args.length < 2) throw new SchemeError(`${(head as Sym).name}: expected bindings and a body`);
        if (head === S.let && args[0] instanceof Sym) {
          // Named let: (let loop ((var init) ...) body ...)
          const name = args[0];
          const bindings = this.bindings(args[1], 'let');
          const loopEnv = new Env(env);
          const fn = makeLambda(list(...bindings.map(([s]) => s)), args.slice(2), loopEnv, name.name);
          loopEnv.define(name, fn);
          const initArgs = bindings.map(([, init]) => this.eval(init, env));
          env = bindArgs(fn, initArgs);
          const body = fn.body;
          for (let i = 0; i < body.length - 1; i++) this.eval(body[i], env);
          expr = body[body.length - 1];
          continue;
        }
        const bindings = this.bindings(args[0], (head as Sym).name);
        if (head === S.let) {
          const vals = bindings.map(([, init]) => this.eval(init, env));
          env = new Env(env);
          bindings.forEach(([s], i) => env.define(s, vals[i]));
        } else {
          // let* nests a fresh scope per binding; letrec shares one scope so bindings can see each other.
          if (head === S.letrec) env = new Env(env);
          for (const [s, init] of bindings) {
            const v = this.eval(init, env);
            if (head === S.letStar) env = new Env(env);
            if (v instanceof Lambda && v.name === null) v.name = s.name;
            env.define(s, v);
          }
        }
        const body = args.slice(1);
        for (let i = 0; i < body.length - 1; i++) this.eval(body[i], env);
        expr = body[body.length - 1];
        continue;
      }
      if (head === S.cond) {
        let next: Value | null = null;
        for (const clause of args) {
          const parts = listToArray(clause, 'cond clause');
          if (parts.length === 0) throw new SchemeError('cond: empty clause');
          if (parts[0] === S.else) {
            if (parts.length === 1) throw new SchemeError('cond: empty else clause');
            for (let i = 1; i < parts.length - 1; i++) this.eval(parts[i], env);
            next = parts[parts.length - 1];
            break;
          }
          const test = this.eval(parts[0], env);
          if (isTruthy(test)) {
            if (parts.length === 1) return test;
            for (let i = 1; i < parts.length - 1; i++) this.eval(parts[i], env);
            next = parts[parts.length - 1];
            break;
          }
        }
        if (next === null) return UNSPECIFIED;
        expr = next;
        continue;
      }
      if (head === S.and || head === S.or) {
        if (args.length === 0) return head === S.and;
        let short: Value | null = null;
        for (let i = 0; i < args.length - 1; i++) {
          const v = this.eval(args[i], env);
          if (isTruthy(v) === (head === S.or)) {
            short = v;
            break;
          }
        }
        if (short !== null) return short;
        expr = args[args.length - 1];
        continue;
      }
      if (head === S.when || head === S.unless) {
        if (args.length < 2) throw new SchemeError(`${(head as Sym).name}: expected a test and a body`);
        if (isTruthy(this.eval(args[0], env)) !== (head === S.when)) return UNSPECIFIED;
        for (let i = 1; i < args.length - 1; i++) this.eval(args[i], env);
        expr = args[args.length - 1];
        continue;
      }

      // Procedure application.
      const fn = this.eval(head, env);
      const argVals = args.map((a) => this.eval(a, env));
      if (fn instanceof Lambda) {
        env = bindArgs(fn, argVals);
        for (let i = 0; i < fn.body.length - 1; i++) this.eval(fn.body[i], env);
        expr = fn.body[fn.body.length - 1];
        continue;
      }
      if (fn instanceof Builtin) {
        return fn.fn(argVals, this);
      }
      throw new SchemeError(`not a procedure: ${show(fn)}`);
    }
  }

  private bindings(spec: Value, form: string): Array<[Sym, Value]> {
    return listToArray(spec, `${form} binding list`).map((b) => {
      const parts = listToArray(b, `${form} binding`);
      if (parts.length !== 2) throw new SchemeError(`${form}: malformed binding ${show(b)}`);
      return [expectSym(parts[0], form), parts[1]];
    });
  }

  private quasi(tmpl: Value, env: Env): Value {
    if (!(tmpl instanceof Pair)) return tmpl;
    if (tmpl.car === S.unquote) {
      return this.eval(listToArray(tmpl.cdr)[0], env);
    }
    const head = tmpl.car;
    if (head instanceof Pair && head.car === S.unquoteSplicing) {
      const spliced = listToArray(this.eval(listToArray(head.cdr)[0], env));
      return arrayToList(spliced, this.quasi(tmpl.cdr, env));
    }
    return new Pair(this.quasi(head, env), this.quasi(tmpl.cdr, env));
  }
}

// ---------------------------------------------------------------------------
// Primitives

const num = (v: Value, name: string): number => {
  if (typeof v !== 'number') throw new SchemeError(`${name}: expected a number, got ${show(v)}`);
  return v;
};

const pair = (v: Value, name: string): Pair => {
  if (!(v instanceof Pair)) throw new SchemeError(`${name}: expected a pair, got ${show(v)}`);
  return v;
};

const arity = (name: string, args: Value[], min: number, max = min): void => {
  if (args.length < min || args.length > max) {
    const expected = min === max ? `${min}` : max === Infinity ? `at least ${min}` : `${min} to ${max}`;
    throw new SchemeError(`${name}: expected ${expected} argument${max === 1 ? '' : 's'}, got ${args.length}`);
  }
};

const isProcedure = (v: Value): boolean => v instanceof Builtin || v instanceof Lambda;

const eqv = (a: Value, b: Value): boolean => a === b;

const equal = (a: Value, b: Value): boolean => {
  if (a instanceof Pair && b instanceof Pair) {
    return equal(a.car, b.car) && equal(a.cdr, b.cdr);
  }
  return a === b;
};

const compare = (name: string, op: (a: number, b: number) => boolean) =>
  (args: Value[]): Value => {
    arity(name, args, 1, Infinity);
    const ns = args.map((a) => num(a, name));
    for (let i = 0; i < ns.length - 1; i++) {
      if (!op(ns[i], ns[i + 1])) return false;
    }
    return true;
  };

const integerDivision = (name: string, op: (a: number, b: number) => number) =>
  (args: Value[]): Value => {
    arity(name, args, 2);
    const a = num(args[0], name);
    const b = num(args[1], name);
    if (b === 0) throw new SchemeError(`${name}: division by zero`);
    return op(a, b);
  };

const installPrimitives = (env: Env): void => {
  const def = (name: string, fn: (args: Value[], interp: Interpreter) => Value) =>
    env.define(Sym.of(name), new Builtin(name, fn));

  def('+', (args) => args.reduce<number>((acc, a) => acc + num(a, '+'), 0));
  def('*', (args) => args.reduce<number>((acc, a) => acc * num(a, '*'), 1));
  def('-', (args) => {
    arity('-', args, 1, Infinity);
    const ns = args.map((a) => num(a, '-'));
    return ns.length === 1 ? -ns[0] : ns.slice(1).reduce((acc, n) => acc - n, ns[0]);
  });
  def('/', (args) => {
    arity('/', args, 1, Infinity);
    const ns = args.map((a) => num(a, '/'));
    const divisors = ns.length === 1 ? ns : ns.slice(1);
    if (divisors.some((n) => n === 0)) throw new SchemeError('/: division by zero');
    return ns.length === 1 ? 1 / ns[0] : divisors.reduce((acc, n) => acc / n, ns[0]);
  });
  def('quotient', integerDivision('quotient', (a, b) => Math.trunc(a / b)));
  def('remainder', integerDivision('remainder', (a, b) => a % b));
  def('modulo', integerDivision('modulo', (a, b) => ((a % b) + b) % b));
  def('=', compare('=', (a, b) => a === b));
  def('<', compare('<', (a, b) => a < b));
  def('>', compare('>', (a, b) => a > b));
  def('<=', compare('<=', (a, b) => a <= b));
  def('>=', compare('>=', (a, b) => a >= b));
  def('abs', (args) => (arity('abs', args, 1), Math.abs(num(args[0], 'abs'))));
  def('min', (args) => (arity('min', args, 1, Infinity), Math.min(...args.map((a) => num(a, 'min')))));
  def('max', (args) => (arity('max', args, 1, Infinity), Math.max(...args.map((a) => num(a, 'max')))));
  def('sqrt', (args) => (arity('sqrt', args, 1), Math.sqrt(num(args[0], 'sqrt'))));
  def('expt', (args) => (arity('expt', args, 2), Math.pow(num(args[0], 'expt'), num(args[1], 'expt'))));
  def('zero?', (args) => (arity('zero?', args, 1), num(args[0], 'zero?') === 0));
  def('even?', (args) => (arity('even?', args, 1), num(args[0], 'even?') % 2 === 0));
  def('odd?', (args) => (arity('odd?', args, 1), Math.abs(num(args[0], 'odd?') % 2) === 1));

  def('not', (args) => (arity('not', args, 1), args[0] === false));
  def('eq?', (args) => (arity('eq?', args, 2), eqv(args[0], args[1])));
  def('eqv?', (args) => (arity('eqv?', args, 2), eqv(args[0], args[1])));
  def('equal?', (args) => (arity('equal?', args, 2), equal(args[0], args[1])));

  def('number?', (args) => (arity('number?', args, 1), typeof args[0] === 'number'));
  def('boolean?', (args) => (arity('boolean?', args, 1), typeof args[0] === 'boolean'));
  def('string?', (args) => (arity('string?', args, 1), typeof args[0] === 'string'));
  def('symbol?', (args) => (arity('symbol?', args, 1), args[0] instanceof Sym));
  def('procedure?', (args) => (arity('procedure?', args, 1), isProcedure(args[0])));
  def('null?', (args) => (arity('null?', args, 1), args[0] === NIL));
  def('pair?', (args) => (arity('pair?', args, 1), args[0] instanceof Pair));
  def('list?', (args) => {
    arity('list?', args, 1);
    let cur = args[0];
    while (cur instanceof Pair) cur = cur.cdr;
    return cur === NIL;
  });

  def('cons', (args) => (arity('cons', args, 2), new Pair(args[0], args[1])));
  def('car', (args) => (arity('car', args, 1), pair(args[0], 'car').car));
  def('cdr', (args) => (arity('cdr', args, 1), pair(args[0], 'cdr').cdr));
  for (const path of ['aa', 'ad', 'da', 'dd', 'add', 'ddd']) {
    const name = `c${path}r`;
    def(name, (args) => {
      arity(name, args, 1);
      let v = args[0];
      for (const c of path.split('').reverse()) {
        const p = pair(v, name);
        v = c === 'a' ? p.car : p.cdr;
      }
      return v;
    });
  }
  def('set-car!', (args) => (arity('set-car!', args, 2), (pair(args[0], 'set-car!').car = args[1]), UNSPECIFIED));
  def('set-cdr!', (args) => (arity('set-cdr!', args, 2), (pair(args[0], 'set-cdr!').cdr = args[1]), UNSPECIFIED));
  def('list', (args) => arrayToList(args));
  def('length', (args) => (arity('length', args, 1), listToArray(args[0]).length));
  def('append', (args) => {
    if (args.length === 0) return NIL;
    const init = args.slice(0, -1).flatMap((a) => listToArray(a));
    return arrayToList(init, args[args.length - 1]);
  });
  def('reverse', (args) => (arity('reverse', args, 1), arrayToList(listToArray(args[0]).reverse())));
  def('list-ref', (args) => {
    arity('list-ref', args, 2);
    const items = listToArray(args[0]);
    const k = num(args[1], 'list-ref');
    if (k < 0 || k >= items.length || !Number.isInteger(k)) throw new SchemeError(`list-ref: index ${k} out of range`);
    return items[k];
  });
  const member = (name: string, eq: (a: Value, b: Value) => boolean) =>
    def(name, (args) => {
      arity(name, args, 2);
      let cur = args[1];
      while (cur instanceof Pair) {
        if (eq(args[0], cur.car)) return cur;
        cur = cur.cdr;
      }
      return false;
    });
  member('memq', eqv);
  member('member', equal);
  const assoc = (name: string, eq: (a: Value, b: Value) => boolean) =>
    def(name, (args) => {
      arity(name, args, 2);
      for (const entry of listToArray(args[1])) {
        if (eq(args[0], pair(entry, name).car)) return entry;
      }
      return false;
    });
  assoc('assq', eqv);
  assoc('assoc', equal);

  def('apply', (args, interp) => {
    arity('apply', args, 2, Infinity);
    const spread = [...args.slice(1, -1), ...listToArray(args[args.length - 1])];
    return interp.apply(args[0], spread);
  });
  def('map', (args, interp) => {
    arity('map', args, 2, Infinity);
    const lists = args.slice(1).map((l) => listToArray(l));
    const n = Math.min(...lists.map((l) => l.length));
    const out: Value[] = [];
    for (let i = 0; i < n; i++) out.push(interp.apply(args[0], lists.map((l) => l[i])));
    return arrayToList(out);
  });
  def('for-each', (args, interp) => {
    arity('for-each', args, 2);
    for (const item of listToArray(args[1])) interp.apply(args[0], [item]);
    return UNSPECIFIED;
  });
  def('filter', (args, interp) => {
    arity('filter', args, 2);
    return arrayToList(listToArray(args[1]).filter((item) => isTruthy(interp.apply(args[0], [item]))));
  });
  def('reduce', (args, interp) => {
    arity('reduce', args, 3);
    const items = listToArray(args[2]);
    if (items.length === 0) return args[1];
    return items.slice(1).reduce((acc, item) => interp.apply(args[0], [item, acc]), items[0]);
  });

  def('display', (args, interp) => (arity('display', args, 1), interp.write(show(args[0], true)), UNSPECIFIED));
  def('newline', (args, interp) => (arity('newline', args, 0), interp.write('\n'), UNSPECIFIED));
  def('error', (args) => {
    arity('error', args, 1, Infinity);
    throw new SchemeError(args.map((a) => show(a, true)).join(' '));
  });
};
