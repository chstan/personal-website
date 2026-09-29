// Shared request/response handling for the engine, used both inside the Web
// Worker and as a main-thread fallback where workers are unavailable.

import {Position, moveToUci} from './board';
import {search} from './search';

export interface EngineRequest {
  id: number;
  fen: string;
  maxDepth: number;
  timeMs: number;
}

export interface EngineReply {
  id: number;
  /** Best move in UCI notation (e.g. "e7e8q"), or null if there is none. */
  move: string | null;
  depth: number;
  score: number;
  nodes: number;
}

export function think(request: EngineRequest): EngineReply {
  const pos = Position.fromFen(request.fen);
  const result = search(pos, {maxDepth: request.maxDepth, timeMs: request.timeMs});
  return {
    id: request.id,
    move: result.move ? moveToUci(result.move) : null,
    depth: result.depth,
    score: result.score,
    nodes: result.nodes,
  };
}

type Pending = {resolve: (reply: EngineReply) => void; reject: (err: Error) => void};

/**
 * Runs searches off the main thread in a module Web Worker, falling back to a
 * deferred main-thread search (e.g. under jsdom) if workers are unavailable.
 */
export class EngineClient {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  constructor() {
    if (typeof Worker === 'undefined') return;
    try {
      this.worker = new Worker(new URL('./engine.worker.ts', import.meta.url), {type: 'module'});
      this.worker.onmessage = (e: MessageEvent<EngineReply>) => {
        const pending = this.pending.get(e.data.id);
        this.pending.delete(e.data.id);
        pending?.resolve(e.data);
      };
      this.worker.onerror = (e: ErrorEvent) => {
        const error = new Error(e.message || 'Engine worker failed');
        this.pending.forEach((p) => p.reject(error));
        this.pending.clear();
      };
    } catch {
      this.worker = null;
    }
  }

  bestMove(fen: string, options: {maxDepth: number; timeMs: number}): Promise<EngineReply> {
    const request: EngineRequest = {id: this.nextId++, fen, ...options};
    const worker = this.worker;
    if (!worker) {
      return new Promise((resolve, reject) => {
        // Yield first so React can paint the "thinking" state.
        setTimeout(() => {
          try {
            resolve(think(request));
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        }, 50);
      });
    }
    return new Promise((resolve, reject) => {
      this.pending.set(request.id, {resolve, reject});
      worker.postMessage(request);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}
