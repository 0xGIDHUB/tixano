import { useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@meshsdk/react';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { connected } = useWallet();
  const { toast, showToast, closeToast } = useToast();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const C = 'rgba(0,229,255,';

    const nodes = [
      { x: 100, y: 30, w: 24, h: 24, filled: false },
      { x: 230, y: 10, w: 44, h: 44, filled: false },
      { x: 360, y: 30, w: 28, h: 28, filled: false },
      { x: 450, y: 25, w: 18, h: 18, filled: false },
      { x: 30, y: 130, w: 35, h: 35, filled: false },
      { x: 150, y: 110, w: 30, h: 30, filled: false },
      { x: 290, y: 115, w: 22, h: 22, filled: false },
      { x: 420, y: 108, w: 40, h: 40, filled: false },
      { x: 60, y: 220, w: 30, h: 30, filled: false },
      { x: 190, y: 190, w: 46, h: 46, filled: false },
      { x: 340, y: 215, w: 24, h: 24, filled: false },
      { x: 460, y: 208, w: 34, h: 34, filled: false },
      { x: 45, y: 310, w: 18, h: 18, filled: false },
      { x: 140, y: 300, w: 28, h: 28, filled: false },
      { x: 260, y: 295, w: 48, h: 48, filled: false },
      { x: 425, y: 305, w: 22, h: 22, filled: false },
      { x: 60, y: 400, w: 40, h: 40, filled: false },
      { x: 190, y: 430, w: 20, h: 20, filled: false },
      { x: 300, y: 395, w: 38, h: 38, filled: false },
      { x: 440, y: 405, w: 20, h: 20, filled: false },
    ];

    const connections: [number, number, 'h' | 'v'][] = [
      [0, 1, 'h'], [1, 2, 'h'], [2, 3, 'h'],
      [4, 5, 'h'], [5, 6, 'h'], [6, 7, 'h'],
      [8, 9, 'h'], [9, 10, 'h'], [10, 11, 'h'],
      [12, 13, 'h'], [13, 14, 'h'], [14, 15, 'h'],
      [16, 17, 'h'], [17, 18, 'h'], [18, 19, 'h'],
      [0, 4, 'v'], [0, 5, 'v'], [4, 8, 'v'], [8, 12, 'v'], [12, 16, 'v'],
      [1, 5, 'v'], [5, 8, 'v'], [5, 9, 'v'], [8, 13, 'v'], [9, 13, 'v'], [13, 17, 'v'],
      [1, 6, 'v'], [6, 9, 'v'], [6, 10, 'v'], [9, 14, 'v'], [14, 17, 'v'],
      [2, 6, 'v'], [2, 7, 'v'], [7, 10, 'v'], [10, 14, 'v'], [10, 15, 'v'], [14, 18, 'v'], [15, 18, 'v'],
      [3, 7, 'v'], [7, 11, 'v'], [11, 15, 'v'], [15, 19, 'v'],
    ];

    type Laser = { edgeIndex: number; t: number; speed: number; len: number; rev: boolean };

    function makeLaser(activeLasers: Laser[]): Laser {
      const activeEdges = new Set(activeLasers.map(l => l.edgeIndex));
      const available = connections
        .map((_, i) => i)
        .filter(i => !activeEdges.has(i));
      const pool = available.length > 0 ? available : connections.map((_, i) => i);
      return {
        edgeIndex: pool[Math.floor(Math.random() * pool.length)],
        t: 0,
        speed: 0.003 + Math.random() * 0.001,
        len: 0.08 + Math.random() * 0.2,
        rev: Math.random() > 0.2,
      };
    }

    const lasers: Laser[] = [];
    for (let i = 0; i < 12; i++) {
      const l = makeLaser(lasers);
      l.t = Math.random();
      lasers.push(l);
    }
    let time = 0;
    let raf: number;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      const grd = ctx.createRadialGradient(250, 280, 10, 250, 280, 240);
      grd.addColorStop(0, 'rgba(0,229,255,0.04)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      const animated = nodes.map((n, i) => ({
        x: n.x + Math.cos(time * 0.3 + i * 0.5) * 4,
        y: n.y + Math.sin(time * 0.4 + i * 0.8) * 6,
        w: n.w,
        h: n.h,
        filled: n.filled,
      }));

      connections.forEach(([ai, bi, dir]) => {
        const a = animated[ai], b = animated[bi];
        const acx = a.x + a.w / 2, acy = a.y + a.h / 2;
        const bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
        let ax, ay, bx, by;
        if (dir === 'h') {
          ax = a.x + a.w; ay = acy; bx = b.x; by = bcy;
        } else {
          ax = acx; ay = a.y + a.h; bx = bcx; by = b.y;
        }
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = C + '0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      animated.forEach((n) => {
        ctx.save();
        if (n.filled) {
          const g = ctx.createLinearGradient(n.x, n.y, n.x + n.w, n.y + n.h);
          g.addColorStop(0, C + '0.85)');
          g.addColorStop(1, C + '0.25)');
          ctx.fillStyle = g;
          ctx.fillRect(n.x, n.y, n.w, n.h);
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fillRect(n.x + 1, n.y + 1, n.w * 0.38, n.h * 0.38);
        } else {
          ctx.strokeStyle = C + '0.5)';
          ctx.lineWidth = 1.0;
          ctx.strokeRect(n.x, n.y, n.w, n.h);
        }
        ctx.restore();
      });

      lasers.forEach((l, idx) => {
        l.t += l.speed;
        if (l.t > 1 + l.len) { lasers[idx] = makeLaser(lasers); return; }
        const [ai, bi, dir] = connections[l.edgeIndex];
        const a = animated[ai], b = animated[bi];
        const acx = a.x + a.w / 2, acy = a.y + a.h / 2;
        const bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
        let eax, eay, ebx, eby;
        if (dir === 'h') {
          eax = a.x + a.w; eay = acy; ebx = b.x; eby = bcy;
        } else {
          eax = acx; eay = a.y + a.h; ebx = bcx; eby = b.y;
        }
        const t0 = Math.max(0, l.t - l.len);
        const t1 = Math.min(1, l.t);
        if (t1 <= t0) return;
        let sx, sy, ex2, ey2;
        if (!l.rev) {
          sx = eax + (ebx - eax) * t0; sy = eay + (eby - eay) * t0;
          ex2 = eax + (ebx - eax) * t1; ey2 = eay + (eby - eay) * t1;
        } else {
          sx = ebx + (eax - ebx) * t0; sy = eby + (eay - eby) * t0;
          ex2 = ebx + (eax - ebx) * t1; ey2 = eby + (eay - eby) * t1;
        }
        const lg = ctx.createLinearGradient(sx, sy, ex2, ey2);
        lg.addColorStop(0, C + '0)');
        lg.addColorStop(0.6, C + '0.5)');
        lg.addColorStop(1, 'rgba(255,255,255,1)');
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex2, ey2);
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.0;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ex2, ey2, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        const halo = ctx.createRadialGradient(ex2, ey2, 0, ex2, ey2, 8);
        halo.addColorStop(0, C + '0.4)');
        halo.addColorStop(1, C + '0)');
        ctx.beginPath();
        ctx.arc(ex2, ey2, 8, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();
      });

      time += 0.016;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <Head>
        <title>TIXANO — Events Built for the Decentralized World</title>
      </Head>

      <section className="relative min-h-screen bg-black flex items-center px-[6%] overflow-hidden">
        <div className="flex flex-col lg:flex-row w-full items-center gap-8 py-24 lg:py-0">

          {/* Left — full width on mobile, half on desktop */}
          <div className="w-full lg:flex-1 min-w-0 z-10">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 border border-[#00e5ff]/25 bg-[#00e5ff]/5 rounded-full px-4 py-1.5 mb-6">
              <span className="text-[#00e5ff]/80 text-[10px] tracking-[0.13em] uppercase font-medium">
                Powered by Cardano
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-black text-white leading-[1.05] tracking-tight mb-4 uppercase text-[12vw] sm:text-[9vw] md:text-[7vw] lg:text-[4.5vw] xl:text-[52px]">
              Events Built<br />
              for the<br />
              <span className="text-[#00e5ff]">Decentralized</span><br />
              World.
            </h1>

            {/* Subtext */}
            <p className="text-white/40 text-[14px] md:text-[15px] leading-[1.75] max-w-[400px] mb-8 font-medium">
              Organise events on-chain, issue NFT tickets, and verify every entry with a single scan.
            </p>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (!connected) {
                    showToast('Connect your wallet to create an event', {
                      title: 'Wallet Required',
                      type: 'info',
                      duration: 5000,
                    });
                  } else {
                    window.location.href = '/events/create';
                  }
                }}
                className="inline-flex items-center bg-[#00e5ff] text-black text-[12px] md:text-[13px] font-bold pl-6 md:pl-7 pr-5 md:pr-6 py-3 md:py-3.5 rounded-md uppercase tracking-[0.06em] transition-all duration-300 group hover:pr-9 md:hover:pr-10 cursor-pointer"
              >
                Create Your First Event
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="ml-2 transition-transform duration-300 group-hover:translate-x-3"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <Link
                href="/events"
                className="inline-flex items-center border border-white/30 text-white/70 hover:text-white hover:border-white/60 text-[12px] md:text-[13px] font-bold px-6 md:px-7 py-3 md:py-3.5 rounded-md uppercase tracking-[0.06em] transition-all duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Right — full width on mobile (shown below text), half on desktop */}
          <div className="w-full lg:flex-1 min-w-0 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={500}
              height={560}
              className="w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[500px] h-auto opacity-80 lg:opacity-100"
            />
          </div>

        </div>
      </section>
      
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          title={toast.title}
          type={toast.type}
          duration={toast.duration}
          onClose={closeToast}
        />
      )}
    </>
  );
}