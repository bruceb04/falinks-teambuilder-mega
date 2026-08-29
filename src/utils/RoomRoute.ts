/**
 * A static export (GitHub Pages) has no server to resolve `fallback` for the
 * /room/[name] dynamic route, so that build ships /room/?name=<name> instead.
 * Both shapes render the same RoomView, which reads `name` off `router.query`
 * either way. Use this helper instead of hand-building /room links.
 */
const useQueryParamRoom = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

export const buildRoomHref = (roomName: string, params: Record<string, string | undefined> = {}): string => {
  const search = new URLSearchParams();
  if (useQueryParamRoom) {
    search.set('name', roomName);
  }
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });

  const path = useQueryParamRoom ? '/room/' : `/room/${encodeURIComponent(roomName)}/`;
  const queryString = search.toString();
  return queryString ? `${path}?${queryString}` : path;
};
