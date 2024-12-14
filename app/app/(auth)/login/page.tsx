"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLoginMutation } from '../apiAuth';


export default function LoginPage() {
  const [email, setemail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [ login, { isLoading }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await login({ email, password}).unwrap();
      if (res) {
        router.push("/dashboard");
      } else {
        alert ("Invalid credentials");
      }
  } catch (err) {
    console.error(err);
    alert("Something went wrong!");
  };
  }
  return (
    <div className="flex h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-6 bg-white rounded shadow"
      >
        <h1 className="mb-4 text-2xl font-bold">Login</h1>
        <div className="mb-4">
          <label className="block mb-2">Email</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setemail(e.target.value)}
            className="w-full input input-bordered"
          />
        </div>
        <div className="mb-6">
          <label className="block mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full input input-bordered"
          />
        </div>
        {/* Show loading state when submitting */}
        { isLoading && <div className="mb-4 text-center">Loading...</div>}
        

        <button type="submit" className="w-full btn btn-primary">
          Login
        </button>
      </form>
    </div>
  );
};

