import "server-only";

import sanitizeHtml from "sanitize-html";

function descriptionLink(href: string | undefined, jobUrl: string) {
  if (!href?.trim()) return null;
  try {
    const url = new URL(href, jobUrl);
    return ["https:", "http:", "mailto:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function sanitizeDescription({ html, jobUrl }: { html: string | null; jobUrl: string }) {
  if (!html) return null;
  const clean = sanitizeHtml(html, {
    allowedTags: [
      "p",
      "div",
      "span",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "br",
      "a",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "blockquote",
      "pre",
      "code",
      "hr",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "caption",
      "dl",
      "dt",
      "dd",
      "sup",
      "sub",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      ol: ["start"],
      li: ["value"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
    nonTextTags: [
      "script",
      "style",
      "textarea",
      "option",
      "xmp",
      "noscript",
      "template",
      "iframe",
      "svg",
      "math",
    ],
    transformTags: {
      h1: "h2",
      a: (_tag, attributes) => {
        const href = descriptionLink(attributes.href, jobUrl);
        return {
          tagName: "a",
          attribs: href ? { href, target: "_blank", rel: "noopener noreferrer" } : {},
        };
      },
    },
  }).trim();
  return clean || null;
}
