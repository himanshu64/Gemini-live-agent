import type { ConversationEntry } from "@/components/ConversationLog";

export function exportAsText(entries: ConversationEntry[]) {
  const lines = entries.map((e) => {
    const time = new Date(e.timestamp).toLocaleTimeString();
    const role = e.role === "user" ? "You" : e.role === "system" ? "System" : "SightLine";
    const bookmark = e.bookmarked ? " ⭐" : "";
    return `[${time}] ${role}${bookmark}: ${e.text}`;
  });
  const text = `SightLine Conversation — ${new Date().toLocaleDateString()}\n${"=".repeat(50)}\n\n${lines.join("\n\n")}`;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sightline-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
