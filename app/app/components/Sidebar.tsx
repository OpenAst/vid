import React from 'react'
// import Link from 'next/link'
import { FaPlay, FaPlus, FaUsers, FaUserFriends} from 'react-icons/fa'

export default function Sidebar() {
  return (
    <div className='h-screen w-20 bg-gray-100 flex flex-col items-center py-4 space-y-8'>
      <button className='p-2 hover:text-red-200'>
        <FaPlay size={24} />
        <p className='text-xs mt-1'>Shorts</p>
      </button>
      <button className="p-2 hover:text-red-200">
        <FaPlus size={24} />
        <p className="text-xs mt-1">Create</p>
      </button>
      <button className="p-2 hover:text-red-200">
        <FaUsers size={24} />
        <p className="text-xs mt-1">Followers</p>
      </button>
      <button className="p-2 hover:text-red-200">
        <FaUserFriends size={24} />
        <p className="text-xs mt-1">Following</p>
      </button> 
    </div>
  )
}
