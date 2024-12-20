import React from 'react';

const Topbar = () => {
  return (
    <div className="p-4 bg-white shadow flex justify-between items-center">
      <div className="text-xl font-bold">Dashboard</div>
      <div>Profile | Logout</div>
    </div>
  );
};

export default Topbar;
