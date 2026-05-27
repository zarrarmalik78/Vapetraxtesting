import { EmailAuthProvider, User, reauthenticateWithCredential } from 'firebase/auth';

export const BULK_DELETE_CONFIRM_WORD = 'Delete';

export function requiresPasswordReauth(user: User | null): boolean {
  if (!user) return false;
  return !!user.providerData?.some((p) => p.providerId === 'password');
}

export async function reauthenticateForSensitiveAction(user: User, password: string): Promise<void> {
  if (!user.email) throw new Error('No email is linked to this account.');
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

