// src/components/BorderPattern.jsx

export default function BorderPattern() {
  return (
    <div className="flex items-center gap-2 w-full my-3">
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
      <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: 'var(--accent)' }} />
      <div className="w-2 h-2 rotate-45 border" style={{ borderColor: 'var(--accent)' }} />
      <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: 'var(--accent)' }} />
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
    </div>
  );
}