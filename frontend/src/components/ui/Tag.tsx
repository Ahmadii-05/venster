interface TagProps {
  label: string;
  onClick?: () => void;
}

export default function Tag({ label, onClick }: TagProps) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
        onClick ? "cursor-pointer hover:opacity-80" : ""
      }`}
      style={{
        backgroundColor: "var(--color-accent-dim)",
        color: "var(--color-accent)",
      }}
    >
      {label.startsWith("#") ? label : `#${label}`}
    </span>
  );
}
