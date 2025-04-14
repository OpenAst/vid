'use client';

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/app/store/store";
import { refresh } from "@/app/store/authSlice";

const RefreshPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [newToken, setNewToken] = useState<string | null>(null);

  const handleRefresh = async () => {
    try {
      const token = await dispatch(refresh()).unwrap();
      setNewToken(token);
    } catch (error) {
      console.error("Refresh failed:", error);
      setNewToken("Failed to refresh token");
    }
  };

  return (
    <div>
      <h2 className="text-center">Refresh token test</h2>
      <button onClick={handleRefresh}>Refresh Token</button>
      <p>New token: {newToken || "No token received"}</p>
    </div>
  );
};

export default RefreshPage;
