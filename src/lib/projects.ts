export const PROJECTS = {
  rok: { id: 1, slug: "rok", name: "万国觉醒执政官创作营" },
  tata: { id: 3, slug: "tata", name: "塔塔冒险队激励计划" },
} as const;

export type Project = (typeof PROJECTS)[keyof typeof PROJECTS];

export function activityFromSearch(search: string): number | null {
  const value = new URLSearchParams(search).get("act");
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function resolveProject(pathname: string, search = ""): Project | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search);
  if (!activityFromSearch(search) || params.getAll("act").length !== 1 || params.getAll("period").length > 1) return null;
  if (path === "/tata") return params.has("period") && params.get("period") !== "3" ? null : PROJECTS.tata;
  if (path !== "/q" && path !== "/") return null;
  return Object.values(PROJECTS).find(project => String(project.id) === params.get("period")) ?? null;
}
