/** The Refine simple-rest pagination/sort params every list DTO carries. */
export interface ListQueryParams {
  _start?: number;
  _end?: number;
  _sort?: string;
  _order?: string;
}

export interface ResolvedListQuery<T> {
  skip: number;
  take?: number;
  sort: keyof T;
  order: 'ASC' | 'DESC';
}

/** Translate Refine simple-rest _start/_end/_sort/_order into TypeORM options. */
export function resolveListQuery<T>(
  query: ListQueryParams,
  sortable: ReadonlyArray<keyof T>,
  defaultSort: keyof T,
  defaultOrder: 'ASC' | 'DESC' = 'DESC',
): ResolvedListQuery<T> {
  const skip = query._start ?? 0;
  const take =
    query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
  const sort = sortable.includes(query._sort as keyof T)
    ? (query._sort as keyof T)
    : defaultSort;
  const upper = query._order?.toUpperCase();
  const order = upper === 'ASC' || upper === 'DESC' ? upper : defaultOrder;
  return { skip, take, sort, order };
}
