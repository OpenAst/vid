import React from 'react';

const LoginLayout = ({
  children,
  title,
  caption,
}: {
  children: React.ReactNode;
  title: string;
  caption: string;
}) => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="flex items-center bg-white p-8 rounded-lg shadow-lg space-x-12">
        {/* Caption */}
        <div className="w-1/2 text-center">
          <h1 className="text-2xl font-bold mb-4 text-primary-blue">
            {title}
          </h1>
          <p className="text-gray-600 text-lg">{caption}</p>
        </div>

        {/* Login Form */}
        <div className="w-1/2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LoginLayout;
