import {describe, expect, it} from 'vitest';
import {IncompleteInputError, Interpreter, isComplete, parse, SchemeError, show, tokenize} from './scheme';

const evalOne = (src: string, interp = new Interpreter()): string => {
  const result = interp.run(src);
  if (result.error !== undefined) {
    throw new Error(result.error);
  }
  return result.values[result.values.length - 1];
};

describe('reader', () => {
  it('tokenizes parens, quotes, strings and comments', () => {
    expect(tokenize(`(foo 'bar "a b" ; comment\n 1.5)`)).toEqual(['(', 'foo', "'", 'bar', '"a b"', '1.5', ')']);
  });

  it('parses atoms and nested lists', () => {
    expect(parse('42 -3.5 #t #f foo "hi"').map((v) => show(v))).toEqual(['42', '-3.5', '#t', '#f', 'foo', '"hi"']);
    expect(show(parse('(a (b c) . d)')[0])).toBe('(a (b c) . d)');
    expect(show(parse("'(1 2)")[0])).toBe("'(1 2)");
  });

  it('folds symbols to lower case', () => {
    expect(show(parse('FooBar')[0])).toBe('foobar');
  });

  it('reports incomplete input distinctly from syntax errors', () => {
    expect(() => parse('(+ 1 2')).toThrow(IncompleteInputError);
    expect(() => parse('"abc')).toThrow(IncompleteInputError);
    expect(() => parse(')')).toThrow(SchemeError);
    expect(() => parse(')')).not.toThrow(IncompleteInputError);
    expect(isComplete('(define (f x)\n')).toBe(false);
    expect(isComplete('(define (f x) x)')).toBe(true);
    expect(isComplete(')')).toBe(true);
  });
});

describe('evaluation', () => {
  it('does arithmetic and comparison', () => {
    expect(evalOne('(+ 1 2 (* 3 4))')).toBe('15');
    expect(evalOne('(- 10)')).toBe('-10');
    expect(evalOne('(/ 12 4 3)')).toBe('1');
    expect(evalOne('(modulo -7 3)')).toBe('2');
    expect(evalOne('(< 1 2 3)')).toBe('#t');
    expect(evalOne('(>= 3 3 4)')).toBe('#f');
  });

  it('supports define, lambda and closures', () => {
    const interp = new Interpreter();
    interp.run('(define (make-adder n) (lambda (x) (+ x n)))');
    interp.run('(define add5 (make-adder 5))');
    expect(evalOne('(add5 10)', interp)).toBe('15');
    expect(evalOne('add5', interp)).toBe('#<procedure add5>');
    expect(evalOne('((lambda args args) 1 2 3)')).toBe('(1 2 3)');
    expect(evalOne('((lambda (a . rest) rest) 1 2 3)')).toBe('(2 3)');
  });

  it('handles if, cond, and, or, when, unless', () => {
    expect(evalOne('(if #f 1 2)')).toBe('2');
    expect(evalOne('(if 0 1 2)')).toBe('1');
    expect(evalOne('(cond ((= 1 2) (quote a)) ((= 1 1) (quote b)) (else (quote c)))')).toBe('b');
    expect(evalOne('(cond (#f 1) (else 3))')).toBe('3');
    expect(evalOne('(and 1 2 3)')).toBe('3');
    expect(evalOne('(and 1 #f 3)')).toBe('#f');
    expect(evalOne('(or #f 7)')).toBe('7');
    expect(evalOne('(when (> 2 1) 1 2)')).toBe('2');
    expect(interpValues('(unless #t 1)')).toEqual([]);
  });

  it('handles let, let*, letrec, named let, begin and set!', () => {
    expect(evalOne('(let ((x 1) (y 2)) (+ x y))')).toBe('3');
    expect(evalOne('(let* ((x 1) (y (+ x 1))) (* x y))')).toBe('2');
    expect(evalOne('(letrec ((ev? (lambda (n) (if (= n 0) #t (od? (- n 1))))) (od? (lambda (n) (if (= n 0) #f (ev? (- n 1)))))) (ev? 10))')).toBe('#t');
    expect(evalOne('(let loop ((i 0) (acc 0)) (if (> i 10) acc (loop (+ i 1) (+ acc i))))')).toBe('55');
    expect(evalOne('(begin (define x 1) (set! x (+ x 1)) x)')).toBe('2');
  });

  it('supports quoting and quasiquoting', () => {
    expect(evalOne("'(a b c)")).toBe('(a b c)');
    expect(evalOne('(quote x)')).toBe('x');
    expect(evalOne('(let ((x 1) (ys (list 2 3))) `(a ,x ,@ys))')).toBe('(a 1 2 3)');
  });

  it('provides list primitives', () => {
    expect(evalOne('(cons 1 2)')).toBe('(1 . 2)');
    expect(evalOne("(car '(1 2 3))")).toBe('1');
    expect(evalOne("(cdr '(1 2 3))")).toBe('(2 3)');
    expect(evalOne("(cadr '(1 2 3))")).toBe('2');
    expect(evalOne("(length '(1 2 3))")).toBe('3');
    expect(evalOne("(append '(1) '(2 3) '(4))")).toBe('(1 2 3 4)');
    expect(evalOne("(reverse '(1 2 3))")).toBe('(3 2 1)');
    expect(evalOne("(map (lambda (x) (* x x)) '(1 2 3))")).toBe('(1 4 9)');
    expect(evalOne("(map + '(1 2) '(10 20))")).toBe('(11 22)');
    expect(evalOne("(filter odd? '(1 2 3 4 5))")).toBe('(1 3 5)');
    expect(evalOne("(apply + 1 '(2 3))")).toBe('6');
    expect(evalOne("(null? '())")).toBe('#t');
    expect(evalOne("(equal? '(1 (2)) (list 1 (list 2)))")).toBe('#t');
    expect(evalOne("(assoc 'b '((a 1) (b 2)))")).toBe('(b 2)');
  });

  it('captures display output separately from values', () => {
    const result = new Interpreter().run('(display "hello") (newline) (display (list 1 "two")) 5');
    expect(result.output).toBe('hello\n(1 two)');
    expect(result.values).toEqual(['5']);
  });

  it('runs deep tail calls without growing the stack', () => {
    const interp = new Interpreter();
    interp.run('(define (count n) (if (= n 0) (quote done) (count (- n 1))))');
    expect(evalOne('(count 50000)', interp)).toBe('done');
  });

  it('computes recursive functions', () => {
    const interp = new Interpreter();
    interp.run('(define (fact n) (if (= n 0) 1 (* n (fact (- n 1)))))');
    expect(evalOne('(fact 10)', interp)).toBe('3628800');
  });
});

const interpValues = (src: string): string[] => new Interpreter().run(src).values;

describe('errors', () => {
  it('reports unbound variables and bad applications', () => {
    expect(new Interpreter().run('undefined-thing').error).toBe('unbound variable: undefined-thing');
    expect(new Interpreter().run('(1 2)').error).toBe('not a procedure: 1');
    expect(new Interpreter().run('()').error).toMatch(/empty combination/);
  });

  it('reports type, arity and arithmetic errors', () => {
    expect(new Interpreter().run('(+ 1 "a")').error).toMatch(/expected a number/);
    expect(new Interpreter().run("(car '())").error).toMatch(/expected a pair/);
    expect(new Interpreter().run('((lambda (x) x))').error).toMatch(/expected 1 argument, got 0/);
    expect(new Interpreter().run('(/ 1 0)').error).toMatch(/division by zero/);
    expect(new Interpreter().run('(error "boom" 42)').error).toBe('boom 42');
  });

  it('reports syntax errors', () => {
    expect(new Interpreter().run('(+ 1').error).toBe('unexpected end of input');
    expect(new Interpreter().run(')').error).toBe('unexpected ")"');
  });

  it('keeps values produced before an error and interpreter state afterwards', () => {
    const interp = new Interpreter();
    const result = interp.run('(define x 3) x (car x)');
    expect(result.values).toEqual(['3']);
    expect(result.error).toMatch(/car/);
    expect(evalOne('x', interp)).toBe('3');
  });

  it('guards against runaway non-tail recursion', () => {
    const result = new Interpreter().run('(define (f n) (+ 1 (f n))) (f 0)');
    expect(result.error).toBe('maximum recursion depth exceeded');
  });
});

describe('step budget', () => {
  it('aborts infinite loops', () => {
    const interp = new Interpreter({stepBudget: 10_000});
    const result = interp.run('(define (spin) (spin)) (spin)');
    expect(result.error).toMatch(/step budget of 10000 exceeded/);
  });

  it('resets between runs so the interpreter stays usable', () => {
    const interp = new Interpreter({stepBudget: 10_000});
    interp.run('(define (spin) (spin))');
    expect(interp.run('(spin)').error).toMatch(/step budget/);
    expect(evalOne('(+ 1 1)', interp)).toBe('2');
  });

  it('allows work that fits in the budget', () => {
    const interp = new Interpreter({stepBudget: 10_000});
    expect(evalOne('(let loop ((i 0)) (if (< i 100) (loop (+ i 1)) i))', interp)).toBe('100');
  });
});
