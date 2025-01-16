if (data.access && data.refresh) {
  localStorage.setItem('ACCESS_TOKEN', data.access);
  localStorage.setItem('REFRESH_TOKEN', data.refresh);

  localStorage.setItem('USER_ID', data.id);
  localStorage.setItem('FIRST_NAME', data.first_name);
  localStorage.setItem('LAST_NAME', data.last_name);
}

const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/jwt/create`, {
  method: 'POST',
  credentials: 'include', // Necessary for cookies
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const data = await response.json();
console.log('Response:', data);
console.log('First name', data.first_name)
