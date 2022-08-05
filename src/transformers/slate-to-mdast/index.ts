import type * as unistLib from 'unist';
import type * as mdast from '../../models/mdast.js';
import type * as slate from '../../models/slate.js';
import { unreachable } from '../../utils.js';
import type * as slateInternal from '../mdast-to-slate/index.js';

type DecorationType = keyof slateInternal.Decoration;

type TextOrDecoration =
  | mdast.Text
  | mdast.Emphasis
  | mdast.Strong
  | mdast.Delete
  | mdast.Underline
  | mdast.Subscript
  | mdast.Superscript
  | mdast.Color
  | mdast.InlineCode;

export type OverridedSlateBuilders = { [key: string]: SlateBuilder };

export type SlateBuilder = (
  node: unknown,
  // type-coverage:ignore-next-line
  next: (children: any[]) => any
) => object | undefined;

export const slateToMdast = (
  node: slate.Node,
  overrides: OverridedSlateBuilders
): mdast.Root => {
  return buildMdastRoot(node, overrides);
};

const buildMdastRoot = (
  node: slate.Node,
  overrides: OverridedSlateBuilders
): mdast.Root => {
  return <mdast.Root>{
    type: 'root',
    // type-coverage:ignore-next-line
    children: convertNodes(
      // type-coverage:ignore-next-line
      (node as any).children,
      overrides
      // type-coverage:ignore-next-line
    ) as mdast.Root['children']
  };
};

const convertNodes = (
  nodes: slate.Node[],
  overrides: OverridedSlateBuilders
): unistLib.Node[] => {
  const mdastNodes: unistLib.Node[] = [];
  let textQueue: slateInternal.Text[] = [];
  for (let i = 0; i <= nodes.length; i++) {
    // type-coverage:ignore-next-line
    const n = nodes[i] as slateInternal.SlateNode;
    if (n && isText(n)) {
      textQueue.push(n);
    } else {
      const mdastTexts: TextOrDecoration[] = [];
      const starts: DecorationType[] = [];
      let ends: DecorationType[] = [];
      let textTemp: string = '';
      for (let j = 0; j < textQueue.length; j++) {
        // type-coverage:ignore-next-line
        const cur = textQueue[j]!;
        textTemp += cur.text;

        const prevStarts = starts.slice();
        const prevEnds = ends.slice();

        const prev = textQueue[j - 1];
        const next = textQueue[j + 1];
        ends = [];
        (
          [
            'inlineCode',
            'emphasis',
            'strong',
            'delete',
            'underline',
            'subscript',
            'superscript',
            'color'
          ] as const
        ).forEach((k) => {
          if (cur[k]) {
            if (!prev || !prev[k]) {
              starts.push(k);
            }
            if (!next || !next[k]) {
              ends.push(k);
            }
          }
        });

        const endsToRemove = starts.reduce<
          { key: DecorationType; index: number }[]
        >((acc, k, kIndex) => {
          if (ends.includes(k)) {
            acc.push({ key: k, index: kIndex });
          }
          return acc;
        }, []);

        if (starts.length > 0) {
          let bef = '';
          let aft = '';
          if (
            endsToRemove.length === 1 &&
            (prevStarts.toString() !== starts.toString() ||
              // https://github.com/inokawa/remark-slate-transformer/issues/90
              (prevEnds.includes('emphasis') && ends.includes('strong'))) &&
            starts.length - endsToRemove.length === 0
          ) {
            while (textTemp.startsWith(' ')) {
              bef += ' ';
              textTemp = textTemp.slice(1);
            }
            while (textTemp.endsWith(' ')) {
              aft += ' ';
              textTemp = textTemp.slice(0, -1);
            }
          }
          let res: TextOrDecoration = {
            type: 'text',
            value: textTemp
          };
          textTemp = '';
          const startsReversed = starts.slice().reverse();
          startsReversed.forEach((k) => {
            switch (k) {
              case 'inlineCode':
                res = {
                  type: k,
                  // type-coverage:ignore-next-line
                  value: (res as any).value
                };
                break;
              case 'strong':
              case 'emphasis':
              case 'delete':
              case 'underline':
              case 'subscript':
              case 'superscript':
              case 'color':
                res = {
                  type: k,
                  // @ts-expect-error: types not directly fitting
                  children: [res]
                };
                break;
              default:
                unreachable(k);
                break;
            }
          });
          const arr: TextOrDecoration[] = [];
          if (bef.length > 0) {
            arr.push({ type: 'text', value: bef });
          }
          arr.push(res);
          if (aft.length > 0) {
            arr.push({ type: 'text', value: aft });
          }
          mdastTexts.push(...arr);
        }

        if (endsToRemove.length > 0) {
          endsToRemove.reverse().forEach((e) => {
            starts.splice(e.index, 1);
          });
        } else {
          mdastTexts.push({ type: 'text', value: textTemp });
          textTemp = '';
        }
      }
      if (textTemp) {
        mdastTexts.push({ type: 'text', value: textTemp });
        textTemp = '';
      }

      // type-coverage:ignore-next-line
      mdastNodes.push(...(mergeTexts(mdastTexts) as any as unistLib.Node[]));
      textQueue = [];
      if (!n) continue;
      const node = buildMdastNode(n, overrides);
      if (node) {
        mdastNodes.push(node as unistLib.Node);
      }
    }
  }

  return mdastNodes;
};

const buildMdastNode = (
  node: Exclude<slateInternal.SlateNode, slateInternal.Text>,
  overrides: OverridedSlateBuilders
): Exclude<mdast.Content, TextOrDecoration> | null => {
  // type-coverage:ignore-next-line
  const customNode = overrides[node.type]?.(node as any, (children) =>
    convertNodes(children, overrides)
  );
  if (customNode != null) {
    // type-coverage:ignore-next-line
    return customNode as any;
  }

  switch (node.type) {
    case 'paragraph':
      return buildParagraph(node, overrides);
    case 'heading':
      return buildHeading(node, overrides);
    case 'thematicBreak':
      return buildThematicBreak(node);
    case 'blockquote':
      return buildBlockquote(node, overrides);
    case 'list':
      return buildList(node, overrides);
    case 'listItem':
      return buildListItem(node, overrides);
    case 'table':
      return buildTable(node, overrides);
    case 'tableRow':
      return buildTableRow(node, overrides);
    case 'tableCell':
      return buildTableCell(node, overrides);
    case 'html':
      return buildHtml(node);
    case 'code':
      return buildCode(node);
    case 'yaml':
      return buildYaml(node);
    case 'toml':
      return buildToml(node);
    case 'definition':
      return buildDefinition(node);
    case 'footnoteDefinition':
      return buildFootnoteDefinition(node, overrides);
    case 'break':
      return buildBreak(node);
    case 'link':
      return buildLink(node, overrides);
    case 'image':
      return buildImage(node);
    case 'linkReference':
      return buildLinkReference(node, overrides);
    case 'imageReference':
      return buildImageReference(node);
    case 'footnote':
      return buildFootnote(node, overrides);
    case 'footnoteReference':
      return creatFootnoteReference(node);
    case 'math':
      return buildMath(node);
    case 'inlineMath':
      return buildInlineMath(node);
    default:
      unreachable(node);
      break;
  }
  return null;
};

const isText = (node: slateInternal.SlateNode): node is slateInternal.Text => {
  return 'text' in node;
};

const mergeTexts = (nodes: TextOrDecoration[]): TextOrDecoration[] => {
  const res: TextOrDecoration[] = [];
  for (const cur of nodes) {
    const last = res[res.length - 1];
    if (last && last.type === cur.type) {
      if (last.type === 'text') {
        // type-coverage:ignore-next-line
        last.value += (cur as typeof last).value;
      } else if (last.type === 'inlineCode') {
        // type-coverage:ignore-next-line
        last.value += (cur as typeof last).value;
      } else {
        // @ts-expect-error: types not directly fitting
        last.children = mergeTexts(
          // type-coverage:ignore-next-line
          last.children.concat(
            // @ts-expect-error: types not directly fitting
            // type-coverage:ignore-next-line
            (cur as typeof last).children
            // type-coverage:ignore-next-line
          ) as TextOrDecoration[]
        );
      }
    } else {
      if (cur.type === 'text' && cur.value === '') continue;
      res.push(cur);
    }
  }
  return res;
};

const buildParagraph = (
  { type, children }: slateInternal.Paragraph,
  overrides: OverridedSlateBuilders
): mdast.Paragraph => {
  return {
    type,
    // type-coverage:ignore-next-line
    children: convertNodes(children, overrides) as mdast.Paragraph['children']
  };
};

const buildHeading = (
  { type, depth, children }: slateInternal.Heading,
  overrides: OverridedSlateBuilders
): mdast.Heading => {
  return {
    type,
    depth,
    // type-coverage:ignore-next-line
    children: convertNodes(children, overrides) as mdast.Heading['children']
  };
};

const buildThematicBreak = ({
  type
}: slateInternal.ThematicBreak): mdast.ThematicBreak => {
  return {
    type
  };
};

const buildBlockquote = (
  { type, children }: slateInternal.Blockquote,
  overrides: OverridedSlateBuilders
): mdast.Blockquote => {
  return {
    type,
    // type-coverage:ignore-next-line
    children: convertNodes(children, overrides) as mdast.Blockquote['children']
  };
};

const buildList = (
  { type, ordered, start, spread, children }: slateInternal.List,
  overrides: OverridedSlateBuilders
): mdast.List => {
  return {
    type,
    ordered,
    start,
    spread,
    // type-coverage:ignore-next-line
    children: convertNodes(children, overrides) as mdast.List['children']
  };
};

const buildListItem = (
  { type, checked, spread, children }: slateInternal.ListItem,
  overrides: OverridedSlateBuilders
): mdast.ListItem => {
  return {
    type,
    checked,
    spread,
    // type-coverage:ignore-next-line
    children: convertNodes(children, overrides) as mdast.ListItem['children']
  };
};

const buildTable = (
  { type, align, children }: slateInternal.Table,
  overrides: OverridedSlateBuilders
): mdast.Table => {
  return {
    type,
    align,
    // type-coverage:ignore-next-line
    children: convertNodes(children, overrides) as mdast.Table['children']
  };
};

const buildTableRow = (
  { type, children }: slateInternal.TableRow,
  overrides: OverridedSlateBuilders
): mdast.TableRow => {
  return {
    type,
    // type-coverage:ignore-next-line
    children: convertNodes(children, overrides) as mdast.TableRow['children']
  };
};

const buildTableCell = (
  { type, children }: slateInternal.TableCell,
  overrides: OverridedSlateBuilders
): mdast.TableCell => {
  return {
    type,
    // type-coverage:ignore-next-line
    children: convertNodes(children, overrides) as mdast.TableCell['children']
  };
};

const buildHtml = ({ type, children }: slateInternal.Html): mdast.HTML => {
  return {
    type,
    // type-coverage:ignore-next-line
    value: children[0]!.text
  };
};

const buildCode = ({
  type,
  lang,
  meta,
  children
}: slateInternal.Code): mdast.Code => {
  return {
    type,
    lang,
    meta,
    // type-coverage:ignore-next-line
    value: children[0]!.text
  };
};

const buildYaml = ({ type, children }: slateInternal.Yaml): mdast.YAML => {
  return {
    type,
    // type-coverage:ignore-next-line
    value: children[0]!.text
  };
};

const buildToml = ({ type, children }: slateInternal.Toml): mdast.TOML => {
  return {
    type,
    // type-coverage:ignore-next-line
    value: children[0]!.text
  };
};

const buildDefinition = ({
  type,
  identifier,
  label,
  url,
  title
}: slateInternal.Definition): mdast.Definition => {
  return {
    type,
    identifier,
    label,
    url,
    title
  };
};

const buildFootnoteDefinition = (
  { type, identifier, label, children }: slateInternal.FootnoteDefinition,
  overrides: OverridedSlateBuilders
): mdast.FootnoteDefinition => {
  return {
    type,
    identifier,
    label,
    // type-coverage:ignore-next-line
    children: convertNodes(
      children,
      overrides
      // type-coverage:ignore-next-line
    ) as mdast.FootnoteDefinition['children']
  };
};

const buildBreak = ({ type }: slateInternal.Break): mdast.Break => {
  return {
    type
  };
};

const buildLink = (
  { type, url, title, children }: slateInternal.Link,
  overrides: OverridedSlateBuilders
): mdast.Link => {
  return {
    type,
    url,
    title,
    // type-coverage:ignore-next-line
    children: convertNodes(children, overrides) as mdast.Link['children']
  };
};

const buildImage = ({
  type,
  url,
  title,
  alt
}: slateInternal.Image): mdast.Image => {
  return {
    type,
    url,
    title,
    alt
  };
};

const buildLinkReference = (
  {
    type,
    identifier,
    label,
    referenceType,
    children
  }: slateInternal.LinkReference,
  overrides: OverridedSlateBuilders
): mdast.LinkReference => {
  return {
    type,
    identifier,
    label,
    referenceType,
    // type-coverage:ignore-next-line
    children: convertNodes(
      children,
      overrides
      // type-coverage:ignore-next-line
    ) as mdast.LinkReference['children']
  };
};

const buildImageReference = ({
  type,
  identifier,
  label,
  alt,
  referenceType
}: slateInternal.ImageReference): mdast.ImageReference => {
  return {
    type,
    identifier,
    label,
    alt,
    referenceType
  };
};

const buildFootnote = (
  { type, children }: slateInternal.Footnote,
  overrides: OverridedSlateBuilders
): mdast.Footnote => {
  return {
    type,
    // type-coverage:ignore-next-line
    children: convertNodes(children, overrides) as mdast.Footnote['children']
  };
};

const creatFootnoteReference = ({
  type,
  identifier,
  label
}: slateInternal.FootnoteReference): mdast.FootnoteReference => {
  return {
    type,
    identifier,
    label
  };
};

const buildMath = ({ type, children }: slateInternal.Math): mdast.Math => {
  return {
    type,
    // type-coverage:ignore-next-line
    value: children[0]!.text
  };
};

const buildInlineMath = ({
  type,
  children
}: slateInternal.InlineMath): mdast.InlineMath => {
  return {
    type,
    // type-coverage:ignore-next-line
    value: children[0]!.text
  };
};
