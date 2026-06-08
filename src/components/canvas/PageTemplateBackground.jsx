import React, { useEffect, useRef } from 'react';

const SPACING = 32;

function drawTemplate(ctx, template, width, height) {
  ctx.clearRect(0, 0, width, height);

  // Paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const lineColor = 'rgba(200, 200, 210, 0.4)';

  switch (template) {
    case 'lined':
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.5;
      for (let y = SPACING * 3; y < height; y += SPACING) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
      }
      // Red margin line
      ctx.strokeStyle = 'rgba(220, 80, 80, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(80, 0);
      ctx.lineTo(80, height);
      ctx.stroke();
      break;

    case 'grid':
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.3;
      for (let x = SPACING; x < width; x += SPACING) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = SPACING; y < height; y += SPACING) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;

    case 'dotted':
      ctx.fillStyle = 'rgba(180, 180, 190, 0.4)';
      for (let x = SPACING; x < width; x += SPACING) {
        for (let y = SPACING; y < height; y += SPACING) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;

    case 'blank':
    default:
      break;
  }
}

export default function PageTemplateBackground({ template, width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    drawTemplate(ctx, template, width, height);
  }, [template, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
}