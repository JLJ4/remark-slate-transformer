import type { Plugin } from 'unified';
import {
  mdastToSlate,
  SlateNode
} from '../transformers/mdast-to-slate/index.js';
import { slateToSlate047 } from '../transformers/slate-to-slate0.47.js';

const plugin: Plugin<[]> = function () {
  this.Compiler = function (node) {
    return slateToSlate047(mdastToSlate(node as any, {}) as SlateNode[]);
  };
};
export default plugin;
