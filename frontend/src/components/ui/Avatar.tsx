import type { User } from "../../types";

interface AvatarProps {
  user?: User | null;
  name?: string;
  email?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "w-6 h-6 text-[9px]",
  md: "w-8 h-8 text-[11px]",
  lg: "w-10 h-10 text-sm",
};

export default function Avatar({ user, name, email, size = "md" }: AvatarProps) {
  const displayName = user?.name || name || email?.split("@")[0] || "U";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`rounded-lg flex items-center justify-center font-bold shrink-0 ${SIZES[size]}`}
      style={{
        backgroundColor: "var(--color-accent-dim)",
        color: "var(--color-accent)",
      }}
      title={displayName}
    >
      {initials}
    </div>
  );
}
