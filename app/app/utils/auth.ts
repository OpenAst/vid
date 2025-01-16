import axios from "axios";


export const loginUser = async ({email, password}) => {
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/jwt/create`, 
      {
        email, password
      },
      {withCredentials: true}
    );

    const setCookieHeader = response.headers['set-cookie'];
    console.log('Set-Cookie Header', setCookieHeader);
    return response.data;
  }
  catch (e) {
    console.log('Failed !', e);
  }
}