// Web Worker entry point: searches positions without blocking the page.

import {EngineRequest, think} from './engine';

self.onmessage = (e: MessageEvent<EngineRequest>) => {
  self.postMessage(think(e.data));
};
