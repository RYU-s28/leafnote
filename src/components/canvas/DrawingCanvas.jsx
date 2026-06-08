import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

const CANVAS_W = 1200;
const CANVAS_H = 1600;

function smoothPoints(points) {
  if (points.length < 3) return points;
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    result.push({
      ...curr,
      x: (prev.x + curr.x * 2 + next.x) / 4,
      y: (prev.y + curr.y * 2 + next.y) / 4,
    });
  }
  result.push(points[points.length - 1]);
  return result;
}

function drawStroke(ctx, stroke) {
  const pts = smoothPoints(stroke.points);
  if (pts.length < 2) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  ctx.globalAlpha = stroke.opacity || 1;

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.3;
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const pressure = curr.pressure || 0.5;
    const width = stroke.baseWidth * (0.4 + pressure * 0.8);

    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);

    if (i < pts.length - 1) {
      const midX = (curr.x + pts[i + 1].x) / 2;
      const midY = (curr.y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
    } else {
      ctx.lineTo(curr.x, curr.y);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function renderAllStrokes(ctx, strokes, width, height) {
  ctx.clearRect(0, 0, width, height);
  strokes.forEach((s) => drawStroke(ctx, s));
}

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { strokes, onStrokeComplete, onEraseStroke, activeTool, penColor, penSize, highlighterColor },
  ref
) {
  const canvasRef = useRef(null);
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  // Render all strokes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);
    renderAllStrokes(ctx, strokes, CANVAS_W, CANVAS_H);
  }, [strokes]);

  const getPoint = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure || 0.5,
      tiltX: e.tiltX || 0,
      tiltY: e.tiltY || 0,
      time: Date.now(),
    };
  }, []);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    if (activeTool === 'eraser') {
      // Check if clicking on a stroke to erase
      const point = getPoint(e);
      const strokeIndex = findStrokeAtPoint(strokes, point);
      if (strokeIndex !== -1) {
        onEraseStroke(strokeIndex);
      }
      return;
    }

    if (activeTool === 'text') return;

    const point = getPoint(e);
    const color = activeTool === 'highlighter' ? highlighterColor : penColor;
    const baseWidth = activeTool === 'highlighter' ? 20 : penSize;
    const opacity = activeTool === 'highlighter' ? 0.3 : 1;

    currentStrokeRef.current = {
      tool: activeTool,
      color,
      baseWidth,
      opacity,
      points: [point],
    };
  }, [activeTool, penColor, penSize, highlighterColor, getPoint, strokes, onEraseStroke]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    if (activeTool === 'eraser') {
      const point = getPoint(e);
      const strokeIndex = findStrokeAtPoint(strokes, point);
      if (strokeIndex !== -1) {
        onEraseStroke(strokeIndex);
      }
      return;
    }

    if (!currentStrokeRef.current) return;

    const point = getPoint(e);
    currentStrokeRef.current.points.push(point);

    // Live render
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStroke(ctx, currentStrokeRef.current);
    ctx.restore();
  }, [activeTool, getPoint, strokes, onEraseStroke]);

  const handlePointerUp = useCallback((e) => {
    isDrawingRef.current = false;
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
      onStrokeComplete(currentStrokeRef.current);
    }
    currentStrokeRef.current = null;
  }, [onStrokeComplete]);

  return (
    <canvas
      ref={canvasRef}
      className={`drawing-canvas ${activeTool === 'eraser' ? 'eraser-mode' : ''}`}
      style={{ width: '100%', height: '100%' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
});

function findStrokeAtPoint(strokes, point, threshold = 15) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const stroke = strokes[i];
    for (const p of stroke.points) {
      const dist = Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2);
      if (dist < threshold) return i;
    }
  }
  return -1;
}

export default DrawingCanvas;