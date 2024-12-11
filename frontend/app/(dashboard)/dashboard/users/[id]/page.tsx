import React from 'react'

const User = ({ params }: { params: { id: string }}) => {

  const { id } = params;
  return (
    <h2 className='text-2xl'>User Profile: {id}</h2>
  )
}

export default User