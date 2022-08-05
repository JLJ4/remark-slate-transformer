import type { Plugin } from 'unified';
import type * as mdast from '../models/mdast.js';
import type * as slate from '../models/slate.js';
import {
  mdastToSlate,
  OverridedMdastBuilders
} from '../transformers/mdast-to-slate/index.js';

export type Options = {
  overrides?: OverridedMdastBuilders;
};

const plugin: Plugin<[Options?], mdast.Root, slate.Node[]> = function ({
  overrides = {}
} = {}) {
  this.Compiler = function (node) {
    return mdastToSlate(node, overrides);
  };
};
export default plugin;
