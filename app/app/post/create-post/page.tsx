'use client';

import { usePostsMutation } from '@/app/(auth)/apiAuth';
export default function CreatePostPage () {
  const [post, { isLoading, isError }] = usePostsMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());


    try {
      await post(data).unwrap();
      alert('Post successfully created.!');
      e.currentTarget.reset();
      } catch (error) {
        console.error('Error creating post:', error);
        alert('Failed to create post.');
      };
  };
    
  return (
    <div className='max-w-md mx-auto mt-10 p-4 border rounded-lg'>
      <h1 className='text-center text-xl font- bold mb-6'>Create a Post</h1>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label htmlFor='title' className='block font-medium mb-1'>Title</label>
          <input 
            id='title'
            name='title'
            required
            className='border rounded p-2 w-full'
            />
        </div>
        <div>
          <label htmlFor='content' className='block font-medium mb-1'>Content</label>
          <input 
            id='content'
            name='content'
            required
            className='border rounded p-2 w-full'
            />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`bg-blue-500 text-white py-2 px-4 rounded ${
            isLoading && 'opacity-50 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Creating...' : 'Create Post'}
        </button>
        {isError && <p className="text-red-500 mt-2">Error creating post.</p>}
      </form>
    </div>
  )
}