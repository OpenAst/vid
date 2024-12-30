export interface Post {
  id: string; 
  user: string;
  title: string;
  content: string;
  is_public: boolean,
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
}
