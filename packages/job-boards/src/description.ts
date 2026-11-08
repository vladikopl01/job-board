import { z } from "zod";

import { escapeHtml, htmlToText, textToHtml } from "./html.ts";

const optionalText = z.string().nullish();

export const leverDescriptionSchema = z.object({
  description: optionalText,
  descriptionPlain: optionalText,
  opening: optionalText,
  openingPlain: optionalText,
  descriptionBody: optionalText,
  descriptionBodyPlain: optionalText,
  lists: z.array(z.object({ text: z.string(), content: z.string() })).nullish(),
  additional: optionalText,
  additionalPlain: optionalText,
  salaryDescription: optionalText,
  salaryDescriptionPlain: optionalText,
});

function richSection(html: string | null | undefined, plain: string | null | undefined) {
  return html?.trim() || (plain ? textToHtml(plain) : "");
}

export function leverDescription(job: z.infer<typeof leverDescriptionSchema>) {
  const mainHtml =
    richSection(job.description, job.descriptionPlain) ||
    [
      richSection(job.opening, job.openingPlain),
      richSection(job.descriptionBody, job.descriptionBodyPlain),
    ]
      .filter(Boolean)
      .join("\n");
  const mainText = job.descriptionPlain?.trim() || htmlToText(mainHtml);
  const listText = (job.lists ?? [])
    .map((item) => [item.text, htmlToText(item.content)].filter(Boolean).join("\n"))
    .join("\n\n");
  const salaryText = job.salaryDescriptionPlain?.trim() || htmlToText(job.salaryDescription ?? "");
  return {
    descriptionPlain: [
      mainText,
      listText,
      job.additionalPlain?.trim() || htmlToText(job.additional ?? ""),
      salaryText,
    ]
      .filter(Boolean)
      .join("\n\n"),
    descriptionHtml:
      [
        mainHtml,
        ...(job.lists ?? []).map((item) => {
          // Lever supplies either bare list items or a complete list, depending on the feed.
          const content = /^\s*<(?:ul|ol)(?:\s|>)/iu.test(item.content)
            ? item.content
            : `<ul>${item.content}</ul>`;
          return `${item.text ? `<h2>${escapeHtml(item.text)}</h2>` : ""}${content}`;
        }),
        richSection(job.additional, job.additionalPlain),
        richSection(job.salaryDescription, job.salaryDescriptionPlain),
      ]
        .filter(Boolean)
        .join("\n") || null,
  };
}
