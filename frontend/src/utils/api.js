export function normalizeListResponse(payload, preferredKeys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  for (const key of preferredKeys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  const firstArrayValue = Object.values(payload).find(Array.isArray);
  return Array.isArray(firstArrayValue) ? firstArrayValue : [];
}
