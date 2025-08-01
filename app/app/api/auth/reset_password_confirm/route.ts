export async function POST(uid: string, token: string, newPassword: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/reset_password_confirm/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uid, token, new_password: newPassword }),
  });

  const data = res.json();
  if (!res.ok) {
    throw new Error('Failed to verify account');
  }
  return data;
}