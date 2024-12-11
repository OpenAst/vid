import React from 'react'

const layout = ({ children }: { children: React.ReactNode}) => {
  return (
    <div>
      <h2>Dashboard</h2>
      {children}
    </div>
  )
}

export default layout