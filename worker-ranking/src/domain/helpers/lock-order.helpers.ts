import type { ComputeRequest } from '../interfaces/compute-request.interface.js';

/**
 * Les demandes d'un meme lot verrouillent chacune une ligne ranking_request jusqu'au commit.
 * Deux lots concurrents qui parcourent les memes utilisateurs dans un ordre different se
 * bloquent mutuellement (deadlock detected) : tous les lots suivent donc le meme ordre total
 * (utilisateur puis liste). Les doublons sont retires, la premiere raison est conservee.
 */
export const orderForLocking = (
  requests: readonly ComputeRequest[],
): ComputeRequest[] => {
  const unique = new Map<string, ComputeRequest>();
  for (const request of requests) {
    const key = `${request.userId}:${request.listKind}`;
    if (!unique.has(key)) {
      unique.set(key, request);
    }
  }
  return [...unique.values()].sort((a, b) => {
    if (a.userId !== b.userId) {
      return a.userId < b.userId ? -1 : 1;
    }
    if (a.listKind === b.listKind) {
      return 0;
    }
    return a.listKind < b.listKind ? -1 : 1;
  });
};
