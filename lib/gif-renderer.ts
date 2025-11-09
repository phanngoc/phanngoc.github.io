import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import fs from 'fs';
import path from 'path';
import { DiagramSpec, DiagramNode, DiagramFlow, DiagramFrame } from './diagram-spec';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 6; // 6 frames per second
const FRAME_DELAY = 1000 / FPS; // milliseconds per frame

// Color scheme
const COLORS = {
  background: '#0f172a', // dark slate
  nodeDefault: '#111827', // dark gray
  nodeHighlight: '#22c55e', // green
  nodeBorderDefault: '#94a3b8', // slate gray
  nodeBorderHighlight: '#22c55e', // green
  edgeDefault: '#64748b', // slate gray
  edgeHighlight: '#38bdf8', // sky blue
  text: '#e5e7eb', // light gray
  caption: '#e5e7eb', // light gray
};

/**
 * Draw an arrow between two points
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;

  // Draw line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Draw arrow head
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowLen = 12;
  const arrowAngle = Math.PI / 6; // 30 degrees

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - arrowLen * Math.cos(angle - arrowAngle),
    toY - arrowLen * Math.sin(angle - arrowAngle)
  );
  ctx.lineTo(
    toX - arrowLen * Math.cos(angle + arrowAngle),
    toY - arrowLen * Math.sin(angle + arrowAngle)
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a rounded rectangle
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw a single frame based on frame specification
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  spec: DiagramSpec,
  frame: DiagramFrame
) {
  // Clear canvas with background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw edges (flows) first so they appear behind nodes
  for (const flow of spec.flows) {
    const fromNode = spec.nodes.find(n => n.id === flow.from);
    const toNode = spec.nodes.find(n => n.id === flow.to);
    
    if (!fromNode || !toNode) continue;

    const isHighlighted = frame.highlightFlows?.some(
      hf => hf.from === flow.from && hf.to === flow.to
    ) || false;

    const color = isHighlighted ? COLORS.edgeHighlight : COLORS.edgeDefault;
    const lineWidth = isHighlighted ? 4 : 2;

    drawArrow(
      ctx,
      fromNode.x,
      fromNode.y,
      toNode.x,
      toNode.y,
      color,
      lineWidth
    );

    // Draw flow label (optional, can be added if needed)
    // For now, we skip labels on edges to keep it simple
  }

  // Draw nodes
  for (const node of spec.nodes) {
    const isHighlighted = frame.highlightNodes?.includes(node.id) || false;
    const nodeWidth = 140;
    const nodeHeight = 60;
    const radius = 8;

    // Node background
    ctx.fillStyle = isHighlighted ? COLORS.nodeHighlight : COLORS.nodeDefault;
    ctx.strokeStyle = isHighlighted ? COLORS.nodeBorderHighlight : COLORS.nodeBorderDefault;
    ctx.lineWidth = isHighlighted ? 3 : 1.5;

    drawRoundedRect(
      ctx,
      node.x - nodeWidth / 2,
      node.y - nodeHeight / 2,
      nodeWidth,
      nodeHeight,
      radius
    );
    ctx.fill();
    ctx.stroke();

    // Node label
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y);
  }

  // Draw caption at bottom
  if (frame.caption) {
    ctx.fillStyle = COLORS.caption;
    ctx.font = '18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(frame.caption, WIDTH / 2, HEIGHT - 20);
  }
}

/**
 * Render diagram specification to GIF file
 * NOTE: GIF rendering is currently disabled - gif-encoder-2 has been removed
 */
export async function renderDiagramGif(
  spec: DiagramSpec,
  outPath: string
): Promise<void> {
  throw new Error('GIF rendering is not available. gif-encoder-2 has been removed.');
}

