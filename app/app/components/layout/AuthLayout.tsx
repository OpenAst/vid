import React from 'react';

const AuthLayout = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => {
  return (
    <div className="flex justify-center items-center mt-4 min-h-screen">
      <div className="bg-white p-8 rounded-md shadow-sm w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{title}</h1>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;