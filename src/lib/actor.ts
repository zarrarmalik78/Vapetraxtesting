export function buildActorMeta(params: { userRole?: string | null; currentUser?: any }) {
  const role = params.userRole === 'cashier' ? 'cashier' : 'admin';
  const displayName =
    params.currentUser?.displayName ||
    params.currentUser?.email?.split('@')?.[0] ||
    'Unknown';

  return {
    createdBy: params.currentUser?.uid || null,
    actorRole: role,
    actorName: displayName
  };
}

