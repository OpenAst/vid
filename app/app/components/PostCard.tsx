import Link from 'next/link';
import { Post } from '../types/post';

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  return (
    <div>
      <h2>{post.title}</h2>
      <p>{post.content.substring(0, 100)}...</p>
      <Link href={`/posts/${post.id}`}>Read More..</Link>
    </div>
  )
}

export default PostCard;