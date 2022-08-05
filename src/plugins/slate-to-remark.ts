import type { Plugin } from 'unified';
import type * as mdast from '../models/mdast.js';
import type * as slate from '../models/slate.js';
import {
  OverridedSlateBuilders,
  slateToMdast
} from '../transformers/slate-to-mdast/index.js';

export type Options = {
  overrides?: OverridedSlateBuilders;
};

const plugin: Plugin<[Options?], slate.Node, mdast.Root> = ({
  overrides = {}
} = {}) => {
  return function (node) {
    return slateToMdast(node, overrides);
  };
};
export default plugin;
