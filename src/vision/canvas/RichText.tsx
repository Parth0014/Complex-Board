import { Text } from 'react-konva';
import Konva from 'konva';
import type { SceneContext } from 'konva/lib/Context';
import type { BoardItem } from '../document';
import type { TextStyle } from '../text';
import { fontFamily } from '../fonts';

export function RichText({
  item,
  ownerWindow,
  common,
}: {
  item: BoardItem;
  ownerWindow: Window & typeof globalThis;
  common: Record<string, unknown>;
}) {
  const context = ownerWindow.document.createElement('canvas').getContext('2d');
  if (!context) return null;
  const font = item.fontSize || 34,
    padding = item.textPadding || 0,
    contentWidth = Math.max(1, item.width - padding * 2),
    lineHeight = font * (item.lineHeight || 1),
    nodes: Array<{
      text: string;
      x: number;
      y: number;
      width: number;
      style: TextStyle;
      size: number;
      line: number;
    }> = [];
  let x = 0,
    line = 0;
  const text = item.text || '';
  const styleAt = (index: number): TextStyle => ({
    ...item,
    ...item.textRuns?.find((run) => index >= run.start && index < run.end),
  });
  const measure = (value: string, style: TextStyle, size: number) => {
    context.font = `${style.italic ? 'italic ' : ''}${style.bold ? 'bold' : item.fontWeight || 400} ${size}px ${fontFamily(item.fontFamily)}`;
    context.fontKerning = item.kerning === false ? 'none' : 'normal';
    return (
      context.measureText(value).width + Math.max(0, value.length - 1) * (item.letterSpacing || 0)
    );
  };
  let index = 0;
  while (index < text.length) {
    if (text[index] === '\n') {
      line++;
      x = 0;
      index++;
      continue;
    }
    const start = index,
      style = styleAt(index),
      size = style.script && style.script !== 'normal' ? font * 0.65 : font;
    const space = /\s/.test(text[index]);
    index++;
    while (
      index < text.length &&
      text[index] !== '\n' &&
      /\s/.test(text[index]) === space &&
      JSON.stringify(styleAt(index)) === JSON.stringify(style)
    )
      index++;
    const token = text.slice(start, index),
      width = measure(token, style, size);
    if (x + width > contentWidth && x > 0 && !space) {
      line++;
      x = 0;
    }
    if (width > contentWidth) {
      for (const character of token) {
        const width = measure(character, style, size);
        if (x + width > contentWidth && x > 0) {
          line++;
          x = 0;
        }
        nodes.push({ text: character, x, y: line * lineHeight, width, style, size, line });
        x += width;
      }
    } else {
      nodes.push({ text: token, x, y: line * lineHeight, width, style, size, line });
      x += width;
    }
  }
  const widths = new Map<number, number>();
  nodes.forEach((node) =>
    widths.set(node.line, Math.max(widths.get(node.line) || 0, node.x + node.width)),
  );
  return (
    <>
      {nodes.map((node, index) => {
        const spare = Math.max(0, contentWidth - (widths.get(node.line) || 0)),
          spaces = nodes.filter((other) => other.line === node.line && /^\s+$/.test(other.text)),
          before = spaces.filter((other) => other.x < node.x).length;
        const offset =
          item.align === 'center'
            ? spare / 2
            : item.align === 'right'
              ? spare
              : item.align === 'justify' && node.line < line && spaces.length
                ? (spare * before) / spaces.length
                : 0;
        return (
          <Text
            {...common}
            key={index}
            x={padding + node.x + offset}
            y={
              padding +
              Math.max(0, (item.height - padding * 2 - (line + 1) * lineHeight) / 2) +
              node.y +
              (node.style.script === 'super'
                ? -font * 0.15
                : node.style.script === 'sub'
                  ? font * 0.3
                  : 0)
            }
            text={node.text}
            fontFamily={fontFamily(item.fontFamily)}
            fontSize={node.size}
            fontStyle={[
              node.style.bold ? 'bold' : String(item.fontWeight || 400),
              node.style.italic ? 'italic' : '',
            ].join(' ')}
            fill={node.style.color || item.color || '#33272b'}
            strokeWidth={item.borderWidth || (item.effect === 'outline' ? 2 : 0)}
            fillAfterStrokeEnabled
            lineJoin="round"
            textDecoration={[
              node.style.underline ? 'underline' : '',
              node.style.strike ? 'line-through' : '',
            ].join(' ')}
            letterSpacing={item.letterSpacing || (item.ligatures === false ? 0.001 : 0)}
            sceneFunc={(context, shape) => {
              context._context.fontKerning = item.kerning === false ? 'none' : 'normal';
              Konva.Text.prototype._sceneFunc.call(shape as Konva.Text, context as SceneContext);
            }}
          />
        );
      })}
    </>
  );
}
