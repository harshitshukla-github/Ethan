import { useEffect, useRef } from 'react';

const FRAME_INTERVAL_MS = 1000 / 30;
const MAX_STARS = 320;

// Twinkling star background, drawn on a fixed canvas behind every page.
export default function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let stars = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastDraw = 0;

    function draw(time) {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const twinkle = reducedMotion.matches ? 1 : 0.6 + 0.4 * Math.sin(time * 0.001 * star.speed + star.phase);
        context.globalAlpha = star.alpha * twinkle;
        context.fillStyle = star.color;
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    function resize() {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const count = Math.min(MAX_STARS, Math.round((width * height) / 5500));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.1 + 0.25,
        alpha: Math.random() * 0.6 + 0.25,
        speed: Math.random() * 1.4 + 0.3,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.15 ? '#bcd0ff' : Math.random() < 0.1 ? '#ffe2b8' : '#ffffff',
      }));
      draw(performance.now());
    }

    function loop(time) {
      if (time - lastDraw >= FRAME_INTERVAL_MS) {
        lastDraw = time;
        draw(time);
      }
      frame = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(frame);
      if (reducedMotion.matches) draw(0);
      else frame = requestAnimationFrame(loop);
    }

    resize();
    start();
    window.addEventListener('resize', resize);
    reducedMotion.addEventListener('change', start);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      reducedMotion.removeEventListener('change', start);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
