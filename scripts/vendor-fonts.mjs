import { mkdir, writeFile } from "node:fs/promises";
const fonts = [
  ["douyin", "https://cn-font.claude-code-best.win/packages/dymh/dist/DouyinSansBold/result.css"],
  ["chill", "https://cn-font.claude-code-best.win/packages/hcqyt/dist/ChillRoundFBold/result.css"],
  ["youshe", "https://cn-font.claude-code-best.win/packages/ysbth/dist/优设标题黑/result.css"],
];
for (const [name, source] of fonts) {
  if (process.argv[2] && name !== process.argv[2]) continue;
  const sourceUrl = new URL(source).href;
  const directory = new URL(`../public/tata/fonts/${name}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const response = await fetch(sourceUrl, { headers: { "Sec-Fetch-Dest": "style", Referer: "http://localhost:3000/", "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`Stylesheet HTTP ${response.status}`);
  const css = await response.text();
  const files = [...new Set([...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match => match[1]))];
  let bytes = 0;
  let index = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (;;) {
      const file = files[index++];
      if (!file) return;
      const result = await fetch(new URL(file, sourceUrl), { headers: { "Sec-Fetch-Dest": "font", Referer: sourceUrl, "User-Agent": "Mozilla/5.0" } });
      if (!result.ok) throw new Error(`Font HTTP ${result.status}`);
      const data = new Uint8Array(await result.arrayBuffer());
      bytes += data.byteLength;
      await writeFile(new URL(file, directory), data);
    }
  }));
  await writeFile(new URL("result.css", directory), css);
  console.log(`${name}: ${files.length} font subsets, ${bytes} bytes`);
}
