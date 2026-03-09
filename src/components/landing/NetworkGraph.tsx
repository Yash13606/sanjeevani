import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
  isAlert: boolean;
  radius: number;
  pulsePhase: number;
}

interface Edge {
  from: number;
  to: number;
}

const labels = [
  "781001", "781003", "781005", "781007", "781009",
  "781011", "781014", "781016", "781018", "781020",
  "781022", "781024",
];
const alertIndices = [1, 5, 9];

const NetworkGraph = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const w = () => canvas.width / window.devicePixelRatio;
    const h = () => canvas.height / window.devicePixelRatio;

    // Init nodes
    const nodes: Node[] = labels.map((label, i) => ({
      x: Math.random() * 0.6 * w() + 0.2 * w(),
      y: Math.random() * 0.6 * h() + 0.2 * h(),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      label,
      isAlert: alertIndices.includes(i),
      radius: alertIndices.includes(i) ? 8 : 5,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    // Create edges (connect nearby nodes)
    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() < 0.35) {
          edges.push({ from: i, to: j });
        }
      }
    }
    // Ensure connected
    for (let i = 1; i < nodes.length; i++) {
      if (!edges.some((e) => e.from === i || e.to === i)) {
        edges.push({ from: i, to: Math.floor(Math.random() * i) });
      }
    }

    let time = 0;

    const draw = () => {
      const cw = w();
      const ch = h();
      ctx.clearRect(0, 0, cw, ch);
      time += 0.01;

      // Update positions
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 40 || n.x > cw - 40) n.vx *= -1;
        if (n.y < 40 || n.y > ch - 40) n.vy *= -1;
        n.x = Math.max(40, Math.min(cw - 40, n.x));
        n.y = Math.max(40, Math.min(ch - 40, n.y));
      });

      // Draw edges
      edges.forEach((e) => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const opacity = Math.max(0, 1 - dist / 300) * 0.3;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(46, 216, 163, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Pulse along edge
        const pulsePos = ((time * 0.5 + e.from * 0.3) % 1);
        const px = a.x + dx * pulsePos;
        const py = a.y + dy * pulsePos;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(46, 216, 163, ${opacity * 2})`;
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach((n) => {
        // Glow for alerts
        if (n.isAlert) {
          const pulse = Math.sin(time * 3 + n.pulsePhase) * 0.5 + 0.5;
          const glowRadius = n.radius + 12 + pulse * 8;
          const gradient = ctx.createRadialGradient(n.x, n.y, n.radius, n.x, n.y, glowRadius);
          gradient.addColorStop(0, "rgba(229, 57, 53, 0.4)");
          gradient.addColorStop(1, "rgba(229, 57, 53, 0)");
          ctx.beginPath();
          ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.isAlert ? "#E53935" : "#2ED8A3";
        ctx.fill();

        // Label
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + n.radius + 14);
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
};

export default NetworkGraph;
