export function buildSortQuery(sortBy, order, useTextSearch) {
  const sortOrder = order === 'asc' ? 1 : -1;
  const sortQuery = {};

  switch (sortBy) {
    case 'relevance':
      if (useTextSearch) {
        sortQuery.score = { $meta: 'textScore' };
      }
      sortQuery.createdAt = -1; // Fallback
      break;
    case 'views':
      sortQuery.views = sortOrder;
      sortQuery.createdAt = -1; // Secondary sort
      break;
    case 'downloads':
      sortQuery.downloads = sortOrder;
      sortQuery.createdAt = -1; // Secondary sort
      break;
    case 'favorites':
      sortQuery.favorites = sortOrder;
      sortQuery.createdAt = -1; // Secondary sort
      break;
    case 'date':
    default:
      sortQuery.createdAt = sortOrder;
      break;
  }

  return sortQuery;
}
