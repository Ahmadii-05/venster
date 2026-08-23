import { Link } from "react-router-dom";
import type { Capsule } from "../types";
import StatusBadge from "./ui/StatusBadge";
import Avatar from "./ui/Avatar";
import Tag from "./ui/Tag";
import Icon from "./ui/Icon";

interface CapsuleCardProps {
  capsule: Capsule;
  replyCount?: number;
  upvoteCount?: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const TAG_POOL = ["Java", "Spring Boot", "PostgreSQL", "React", "JWT", "TypeScript", "Docker", "Redis"];

function getAutoTags(capsule: Capsule): string[] {
  const filePath =
    capsule.artifactAnchor?.artifactVersion?.artifact?.filePath || "";
  const tags: string[] = [];
  if (/\.java$/i.test(filePath)) tags.push("Java");
  if (/\.tsx?$/i.test(filePath)) tags.push("TypeScript");
  if (/\.py$/i.test(filePath)) tags.push("Python");
  if (/\.go$/i.test(filePath)) tags.push("Go");
  if (/\.rs$/i.test(filePath)) tags.push("Rust");
  if (filePath.toLowerCase().includes("spring")) tags.push("Spring Boot");
  if (filePath.toLowerCase().includes("react")) tags.push("React");
  if (filePath.toLowerCase().includes("docker")) tags.push("Docker");
  if (tags.length === 0) tags.push(TAG_POOL[Math.floor(Math.random() * TAG_POOL.length)]);
  return tags.slice(0, 3);
}

export default function CapsuleCard({ capsule, replyCount = 0, upvoteCount = 0 }: CapsuleCardProps) {
  const tags = getAutoTags(capsule);
  const fileName =
    capsule.artifactAnchor?.artifactVersion?.artifact?.filePath
      ?.split("/")
      .pop() || "unknown";
  const snippet =
    capsule.artifactAnchor?.selectedText?.substring(0, 80) ||
    `Review needed in ${fileName}`;
  const author = capsule.author;

  return (
    <Link
      to={`/capsules/${capsule.id}`}
      className="block rounded-xl border p-5 transition-all hover:scale-[1.01] hover:shadow-lg group"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Top row: status + visibility */}
      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={capsule.status} />
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.12)",
            color: "var(--color-status-resolved)",
          }}
        >
          <Icon name="eye" size={10} />
          Public
        </span>
        <span
          className="ml-auto text-[10px] font-mono"
          style={{ color: "var(--color-text-muted)" }}
        >
          {capsule.priority}
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-sm font-semibold mb-1.5 group-hover:text-[var(--color-accent)] transition-colors"
        style={{ color: "var(--color-text-primary)" }}
      >
        {capsule.title}
      </h3>

      {/* Question preview */}
      <p
        className="text-xs leading-relaxed mb-3 line-clamp-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {snippet}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {tags.map((t) => (
          <Tag key={t} label={t} />
        ))}
      </div>

      {/* Footer: author, time, counts */}
      <div
        className="flex items-center justify-between pt-3 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <Avatar user={author} size="sm" />
          <div>
            <span className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
              {author?.name || author?.email?.split("@")[0] || "Unknown"}
            </span>
            <span className="text-[10px] ml-2" style={{ color: "var(--color-text-muted)" }}>
              {timeAgo(capsule.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          <span className="flex items-center gap-1">
            <Icon name="reply" size={12} />
            {replyCount}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="arrowUp" size={12} />
            {upvoteCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
