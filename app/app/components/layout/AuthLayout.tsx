import React from 'react';

const AuthLayout = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => {
  return (
    <div className="flex justify-center items-center mt-4 min-h-screen bg-base-200 transition-colors">
      <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-md p-4 sm:p-2 border border-base-300">
        <h1 className="text-2xl font-bold mb-6 text-center text-base-content">{title}</h1>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;