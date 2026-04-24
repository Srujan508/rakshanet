import React, { useEffect, useRef } from 'react';
import { Panel, PanelHeader } from '../components/Panel';
import { Network } from 'lucide-react';

interface Node {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  color: string;
  pulse: number;
  type: 'normal' | 'suspicious' | 'mule';
}

interface Edge { a: number; b: number; alpha: number; }

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max));

const NetworkTab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Seed nodes
    for (let i = 0; i < 48; i++) {
      const type: Node['type'] = i < 6 ? 'mule' : i < 15 ? 'suspicious' : 'normal';
      nodes.push({
        x: rand(40, canvas.width - 40),
        y: rand(40, canvas.height - 40),
        vx: rand(-0.35, 0.35),
        vy: rand(-0.35, 0.35),
        radius: type === 'mule' ? rand(6, 10) : type === 'suspicious' ? rand(4, 7) : rand(3, 5),
        color: type === 'mule' ? '#f43f5e' : type === 'suspicious' ? '#f59e0b' : '#06b6d4',
        pulse: rand(0, Math.PI * 2),
        type,
      });
    }

    // Connect nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() > 0.94) edges.push({ a: i, b: j, alpha: rand(0.05, 0.2) });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      edges.forEach(e => {
        const n1 = nodes[e.a], n2 = nodes[e.b];
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${e.alpha})`;
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
      });

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 10 || n.x > canvas.width - 10) n.vx *= -1;
        if (n.y < 10 || n.y > canvas.height - 10) n.vy *= -1;

        n.pulse += 0.05;
        const pSize = Math.sin(n.pulse) * 2;
        
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + pSize, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.4;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  const LEGEND = [
    { label: 'Money Mule', color: '#f43f5e', count: 6 },
    { label: 'Suspicious', color: '#f59e0b', count: 9 },
    { label: 'Normal', color: '#06b6d4', count: 33 },
  ];

  const STATS = [
    { label: 'Graph Nodes', value: '1,204', color: '#06b6d4' },
    { label: 'Relationships', value: '4,592', color: '#3b82f6' },
    { label: 'Anomalies', value: '48', color: '#f43f5e' },
    { label: 'P95 Latency', value: '24ms', color: '#10b981' },
  ];

  return (
    <div className="space-y-5 fade-up">
      <Panel>
        <PanelHeader
          icon={<Network size={18} className="text-rose-400" />}
          iconBg="rgba(244,63,94,0.12)"
          title="GNN Fraud Ring Visualization"
          badge={
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 uppercase tracking-widest">
              Simulated Topology
            </span>
          }
        />

        <canvas
          ref={canvasRef}
          id="network-canvas"
          className="w-full rounded-xl bg-black/20"
          style={{ height: '380px' }}
        />

        <p className="text-[11px] text-slate-500 italic mt-3 mb-2">
          Simulated fraud ring topology based on GNN embeddings — not live Neo4j data.
        </p>
        <div className="flex flex-wrap gap-5 mt-2">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-3 h-3 rounded-full shadow-lg" style={{ background: l.color, boxShadow: `0 0 8px ${l.color}` }} />
              <span>{l.label}</span>
              <span className="font-mono text-xs text-slate-600">({l.count})</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* GNN Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div
            key={s.label}
            className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center"
          >
            <div className="font-mono text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkTab;
