import Link from 'next/link';
import React from 'react';


const Navbar = () => {
  return (
    <header className='navbar border-b border-white/50 bg-base-100/70 shadow-md shadow-primary/5 backdrop-blur-2xl'>
      <div className='navbar-start'>
        <Link href="/feed" 
          className='btn btn-ghost normal-case text-xl text-primary'>
            OneClyq
        </Link>
      </div>
      <div className="navbar-center w-full max-w-lg">
        <div className="form-control w-full">
          <input
            type="text"
            placeholder="Search"
            className="input input-bordered w-full"
          />
        </div>
      </div>  
    </header>
  )
}

export default Navbar;
