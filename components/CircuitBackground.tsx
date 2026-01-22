"use client";

import { useEffect, useRef } from "react";

interface CircuitBackgroundProps {
  className?: string;
}

const CircuitBackground = ({ className = "" }: CircuitBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const nodes: { x: number; y: number; connections: number[] }[] = [];
    const nodeCount = 50;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        connections: [],
      });
    }

    nodes.forEach((node, i) => {
      nodes.forEach((other, j) => {
        if (i !== j) {
          const dist = Math.sqrt(
            Math.pow(node.x - other.x, 2) + Math.pow(node.y - other.y, 2)
          );
          if (dist < 150 && node.connections.length < 3) {
            node.connections.push(j);
          }
        }
      });
    });

    let animationFrame: number;
    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      nodes.forEach((node, i) => {
        node.connections.forEach((j) => {
          const other = nodes[j];
          const gradient = ctx.createLinearGradient(
            node.x,
            node.y,
            other.x,
            other.y
          );

          const pulse = Math.sin(time + i * 0.5) * 0.5 + 0.5;
          gradient.addColorStop(0, `rgba(0, 212, 255, ${0.1 + pulse * 0.2})`);
          gradient.addColorStop(1, `rgba(191, 167, 107, ${0.1 + pulse * 0.2})`);

          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(other.x, other.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });

      nodes.forEach((node, i) => {
        const pulse = Math.sin(time + i * 0.3) * 0.5 + 0.5;
        const color = i % 2 === 0 ? "0, 212, 255" : "191, 167, 107";

        ctx.beginPath();
        ctx.arc(node.x, node.y, 2 + pulse * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${0.3 + pulse * 0.4})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, 4 + pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${0.1 + pulse * 0.1})`;
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
};

export default CircuitBackground;
