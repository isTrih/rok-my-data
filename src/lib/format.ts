/** 千分位整数。 */
export const formatInt = (value: number) => Math.round(value).toLocaleString("zh-CN");

/** 加权 ACU* 保留一位小数。 */
export const formatAcu = (value: number) => (value >= 100 ? formatInt(value) : value.toFixed(1));

/** 标题脱敏：前 5 字符 + ... + 后 5 字符。 */
export function truncateTitle(title: string | null | undefined): string {
  const text = (title ?? "").trim();
  if (!text) return "—";
  const chars = [...text];
  if (chars.length <= 13) return text;
  return `${chars.slice(0, 5).join("")}...${chars.slice(-5).join("")}`;
}

/** 秒 → HH:MM:SS。 */
export function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.round(seconds ?? 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return [hours, minutes, total % 60].map(part => String(part).padStart(2, "0")).join(":");
}

/** 时长（小时，一位小数）。 */
export const formatHours = (seconds: number) => (seconds / 3600).toFixed(1);

/** 接口时间为北京时间字符串，替换 T 便于阅读。 */
export const formatDateTime = (value: string | null | undefined) =>
  value ? value.slice(0, 19).replace("T", " ") : "—";

/** 抖音视频与直播回放链接。 */
export const videoUrl = (videoId: string) => `https://www.douyin.com/video/${videoId}`;
export const liveReplayUrl = (roomId: string) => `https://live.douyin.com/${roomId}`;
