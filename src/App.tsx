import { useEffect } from "react";
import { PROJECTS, resolveProject } from "./lib/projects";
import { QueryPage } from "./QueryPage";

export function App() {
  const home = window.location.pathname === "/";
  const project = home ? PROJECTS.rok : resolveProject(window.location.pathname);
  useEffect(() => {
    if (home) window.history.replaceState(null, "", `/rok${window.location.search}${window.location.hash}`);
    document.title = project ? `${project.name} · 活动数据查询` : "创作营 · 活动数据查询";
    document.documentElement.dataset.project = project?.slug ?? "home";
    if (project?.slug === "tata") {
      for (const [id, href] of [
        ["tata-font-douyin", "/tata/fonts/douyin/result.css"],
        ["tata-font-chill", "/tata/fonts/chill/result.css"],
        ["tata-font-youshe", "/tata/fonts/youshe/result.css"],
      ]) {
        const existing = document.getElementById(id!) as HTMLLinkElement | null;
        if (existing) existing.href = href!;
        else {
          const link = document.createElement("link"); link.id = id!; link.rel = "stylesheet"; link.href = href!; document.head.append(link);
        }
      }
    }
    document.querySelector('meta[name="description"]')?.setAttribute("content", project ? `${project.name}视频与直播活动数据查询` : "选择创作营活动，查询视频与直播数据");
  }, [project, home]);
  if (project) return <QueryPage key={project.id} project={project} />;
  return <main className="project-home">
    <h1>页面不存在</h1>
    <p>请检查活动查询页地址。</p>
  </main>;
}
