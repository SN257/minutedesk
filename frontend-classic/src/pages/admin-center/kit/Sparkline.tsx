// Lightweight inline SVG sparkline — no charting library overhead for a tiny trend line.
const Sparkline = ({
  data,
  width = 100,
  height = 32,
  color = '#0f172a',
  fillOpacity = 0.18,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
}) => {
  if (data.length < 2) return <div style={{ width, height }} />;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={areaPath} fill={color} fillOpacity={fillOpacity} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={2.5} fill={color} />
    </svg>
  );
};

export default Sparkline;
