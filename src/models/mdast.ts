// ref: https://github.com/syntax-tree/mdast

import type {
  Alternative,
  Association,
  Blockquote,
  Break,
  Code,
  Definition,
  Delete,
  Emphasis,
  Footnote,
  FootnoteDefinition,
  FootnoteReference,
  Heading,
  HTML,
  Image,
  ImageReference,
  InlineCode,
  Link,
  LinkReference,
  List,
  ListItem,
  Literal,
  Paragraph,
  Parent,
  Reference,
  Resource,
  Root,
  Strong,
  Table,
  TableCell,
  TableRow,
  Text,
  ThematicBreak,
  YAML
} from 'mdast';
export type {
  Parent,
  Literal,
  Root,
  Paragraph,
  Heading,
  ThematicBreak,
  Blockquote,
  List,
  ListItem,
  Table,
  TableRow,
  TableCell,
  HTML,
  Code,
  YAML,
  Definition,
  FootnoteDefinition,
  Text,
  Emphasis,
  Strong,
  Delete,
  InlineCode,
  Break,
  Link,
  Image,
  LinkReference,
  ImageReference,
  Footnote,
  FootnoteReference,
  Resource,
  Association,
  Reference,
  Alternative
};

export interface TOML extends Literal {
  type: 'toml';
}

export interface Math extends Literal {
  type: 'math';
}

export interface InlineMath extends Literal {
  type: 'inlineMath';
}

export interface Underline extends Parent {
  type: 'underline';
}

export interface Subscript extends Parent {
  type: 'subscript';
}

export interface Superscript extends Parent {
  type: 'superscript';
}

export interface Color extends Parent {
  type: 'color';
  color: string;
}

export type Content =
  | TopLevelContent
  | ListContent
  | TableContent
  | RowContent
  | PhrasingContent;

export type TopLevelContent =
  | BlockContent
  | FrontmatterContent
  | DefinitionContent;

export type BlockContent =
  | Paragraph
  | Heading
  | ThematicBreak
  | Blockquote
  | List
  | Table
  | HTML
  | Code
  | Math;

export type FrontmatterContent = YAML | TOML;

export type DefinitionContent = Definition | FootnoteDefinition;

export type ListContent = ListItem;

export type TableContent = TableRow;

export type RowContent = TableCell;

export type PhrasingContent = StaticPhrasingContent | Link | LinkReference;

export type StaticPhrasingContent =
  | Text
  | Emphasis
  | Strong
  | Delete
  | Underline
  | Subscript
  | Superscript
  | Color
  | HTML
  | InlineCode
  | Break
  | Image
  | ImageReference
  | Footnote
  | FootnoteReference
  | InlineMath;
