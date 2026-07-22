const BASE_Y = 112;
const MAX_TRUNK_HEIGHT = 78;

// MAX_PROGRESS = число майлстоунов в src/milestones.js (сутки ... 10 лет) — прогресс 0..12
// непрерывно интерполируется между соседними порогами, а не скачет по бейджам.
const MAX_PROGRESS = 12;

const BRANCHES = [
  { start: 1.5, angle: -40, length: 28 },
  { start: 3, angle: 38, length: 30 },
  { start: 5, angle: -32, length: 28 },
  { start: 6.5, angle: 30, length: 26 },
  { start: 8.5, angle: -24, length: 24 },
  { start: 10.5, angle: 22, length: 22 },
];

const LEAVES = [
  { start: 1, cx: 60, cy: 100, r: 8 },
  { start: 2, cx: 44, cy: 92, r: 9 },
  { start: 2, cx: 76, cy: 92, r: 9 },
  { start: 3.5, cx: 34, cy: 80, r: 10 },
  { start: 3.5, cx: 86, cy: 80, r: 10 },
  { start: 5, cx: 46, cy: 66, r: 12 },
  { start: 5, cx: 74, cy: 66, r: 12 },
  { start: 6.5, cx: 30, cy: 54, r: 12 },
  { start: 6.5, cx: 90, cy: 54, r: 12 },
  { start: 8, cx: 50, cy: 44, r: 14 },
  { start: 8, cx: 70, cy: 44, r: 14 },
  { start: 9.5, cx: 38, cy: 36, r: 13 },
  { start: 9.5, cx: 82, cy: 36, r: 13 },
  { start: 11, cx: 60, cy: 26, r: 15 },
];

const SPARKLES = [
  { cx: 60, cy: 12, delay: '0s' },
  { cx: 36, cy: 22, delay: '0.6s' },
  { cx: 84, cy: 20, delay: '1.2s' },
];

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// progress: 0 (только начали) .. 12 (10 лет и больше, дерево полностью выросло)
export default function GrowingTree({ progress }) {
  const trunkFrac = clamp01(progress / MAX_PROGRESS);
  const trunkTopY = BASE_Y - MAX_TRUNK_HEIGHT * (0.15 + 0.85 * trunkFrac);
  const trunkWidth = 3 + 3 * trunkFrac;
  const fullyGrown = progress >= MAX_PROGRESS - 0.2;

  return (
    <svg className="growing-tree" viewBox="0 0 120 120" aria-hidden="true">
      <ellipse className="tree-ground" cx="60" cy={BASE_Y} rx="24" ry="4" />

      <line
        className="tree-trunk"
        x1="60"
        y1={BASE_Y}
        x2="60"
        y2={trunkTopY}
        style={{ strokeWidth: trunkWidth }}
      />

      {BRANCHES.map((b, i) => {
        const factor = clamp01(progress - b.start);
        if (factor <= 0) return null;

        const originY = BASE_Y - MAX_TRUNK_HEIGHT * clamp01(b.start / MAX_PROGRESS);
        const rad = (b.angle * Math.PI) / 180;
        const len = b.length * factor;
        const x2 = 60 + Math.sin(rad) * len;
        const y2 = originY - Math.cos(rad) * len;

        return (
          <line
            key={i}
            className="tree-branch"
            x1="60"
            y1={originY}
            x2={x2}
            y2={y2}
            style={{ opacity: clamp01(factor * 2) }}
          />
        );
      })}

      {LEAVES.map((l, i) => {
        const factor = clamp01((progress - l.start) * 1.4);
        if (factor <= 0) return null;

        return (
          <circle key={i} className="tree-leaf" cx={l.cx} cy={l.cy} r={l.r * factor} style={{ opacity: factor }} />
        );
      })}

      {fullyGrown &&
        SPARKLES.map((s, i) => (
          <circle
            key={i}
            className="tree-sparkle"
            cx={s.cx}
            cy={s.cy}
            r="2.4"
            style={{ animationDelay: s.delay }}
          />
        ))}
    </svg>
  );
}
