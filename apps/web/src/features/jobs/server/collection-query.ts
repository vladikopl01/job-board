import { boards, postings } from "@job-board/db/schema";
import { and, asc, desc, inArray, not, or, sql, type SQL } from "drizzle-orm";

import { isActiveFilter, type CollectionFilterItem } from "@/components/collection/query-schema";
import type { JobListInput } from "../schemas";

function filterColumn(id: string): SQL {
  switch (id) {
    case "title":
      return sql`${postings.title}`;
    case "company":
      return sql`${boards.displayName}`;
    case "boardId":
      return sql`${postings.boardId}`;
    case "provider":
      return sql`${boards.provider}`;
    case "workplaceType":
      return sql`${postings.workplaceType}`;
    case "readStatus":
      return sql`case when ${postings.readAt} is null then 'unread' else 'read' end`;
    case "availability":
      return sql`case when ${postings.unavailableAt} is null and ${boards.archivedAt} is null then 'open' else 'history' end`;
    case "locations":
      return sql`coalesce((select group_concat(json_extract(value, '$.text'), ', ') from json_each(${postings.locations})), '')`;
    default:
      throw new Error("Unvalidated job filter field.");
  }
}

function filterCondition(filter: CollectionFilterItem): SQL {
  const membership = discoveryColumn(filter.id);
  if (membership) return membershipCondition(membership, filter);
  const column = filterColumn(filter.id);
  const values = Array.isArray(filter.value) ? filter.value : [filter.value];
  switch (filter.operator) {
    case "isEmpty":
      return sql`coalesce(${column}, '') = ''`;
    case "isNotEmpty":
      return sql`coalesce(${column}, '') <> ''`;
    case "eq":
      return inArray(
        sql`lower(${column})`,
        values.map((value) => value.toLowerCase()),
      );
    case "ne":
      return not(
        inArray(
          sql`lower(${column})`,
          values.map((value) => value.toLowerCase()),
        ),
      );
    case "iLike":
    case "notILike": {
      const pattern = `%${values.join(", ").replace(/[!%_]/gu, "!$&")}%`;
      const contains = sql`${column} like ${pattern} escape '!'`;
      return filter.operator === "iLike" ? contains : not(contains);
    }
  }
}

function discoveryColumn(id: string): SQL | undefined {
  switch (id) {
    case "country":
      return sql`posting_countries(${postings.locations})`;
    case "region":
      return sql`posting_regions(${postings.locations})`;
    case "department":
      return sql`posting_departments(${postings.department}, ${postings.team})`;
    default:
      return undefined;
  }
}

function membershipCondition(column: SQL, filter: CollectionFilterItem): SQL {
  const empty = sql`json_array_length(${column}) = 0`;
  if (filter.operator === "isEmpty") return empty;
  if (filter.operator === "isNotEmpty") return not(empty);
  const values = Array.isArray(filter.value) ? filter.value : [filter.value];
  const known = values.filter((value) => value !== "unknown" && value !== "");
  const matches =
    or(
      ...(values.includes("unknown") ? [empty] : []),
      ...(known.length
        ? [
            sql`exists (select 1 from json_each(${column}) as facet where ${inArray(sql`facet.value`, known)})`,
          ]
        : []),
    ) ?? sql`0`;
  return filter.operator === "ne" ? not(matches) : matches;
}

export function jobFilterConditions(input: JobListInput) {
  const conditions = (input.filters ?? []).filter(isActiveFilter).map(filterCondition);
  return input.join === "or" ? or(...conditions) : and(...conditions);
}

export function jobOrdering(input: JobListInput) {
  const columns = {
    title: sql`${postings.title} collate nocase`,
    company: sql`${boards.displayName} collate nocase`,
    provider: sql`${boards.provider}`,
    workplaceType: sql`${postings.workplaceType}`,
    firstSeenAt: sql`${postings.firstSeenAt}`,
  };
  const byId = new Map<string, SQL>(Object.entries(columns));
  const order = (input.sort ?? []).map((sort) => {
    const column = byId.get(sort.id);
    if (!column) throw new Error("Unvalidated job sort field.");
    return sort.desc ? desc(column) : asc(column);
  });
  // The final unique key keeps equal values stable across pages.
  return [...(order.length ? order : [desc(postings.firstSeenAt)]), desc(postings.id)];
}
