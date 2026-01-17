export const MultiColorProgressBar = ({ colors }: { colors: string[] }) => {
  if (!colors || colors.length === 0) return null;

  const total = colors.length;

  // Generate linear-gradient stops
  const gradientStops = colors
    .map((color, idx) => {
      const start = (idx / total) * 100;
      const end = ((idx + 1) / total) * 100;
      return `${color} ${start}%, ${color} ${end}%`;
    })
    .join(', ');

  return (
    <div className="mt-2 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
      <div
        className="h-full transition-all duration-300"
        style={{
          width: '100%',
          background: `linear-gradient(to right, ${gradientStops})`,
        }}
      />
    </div>
  );
};

export default MultiColorProgressBar;
