import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";

const blocks = new Set([
  "p",
  "div",
  "section",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "br",
  "tr",
]);
const hidden = new Set(["script", "style", "template", "noscript"]);

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/u)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

export function htmlToText(html: string): string {
  const output: string[] = [];
  function visit(node: DefaultTreeAdapterTypes.Node) {
    if ("tagName" in node && hidden.has(node.tagName)) return;
    if ("value" in node) output.push(node.value);
    const block = "tagName" in node && blocks.has(node.tagName);
    if (block) output.push("\n");
    if ("tagName" in node && node.tagName === "li") output.push("• ");
    if ("childNodes" in node) node.childNodes.forEach(visit);
    if (block) output.push("\n");
  }
  visit(parseFragment(html));
  return output
    .join("")
    .replace(/[\t\r ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
