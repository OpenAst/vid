export type RealtimeUser = {
    id: string;
    username: string | null;
    first_name: string;
    last_name: string;
    profile?: {
        avatar?: string | null;
        bio?: string | null;
        followers?: unknown;
    };
};
export type CommentHistoryResponse = {
    comments: unknown[];
};
export type CommentCreateResponse = {
    comment: unknown;
};
export type ReplyCreateResponse = {
    parentId: string;
    reply: unknown;
};
export type CommentVoteToggleResponse = {
    commentId: string;
    roomId: string;
    likes: number;
    liked: boolean;
};
export type VideoVoteToggleResponse = {
    videoId: string;
    likes: number;
    liked: boolean;
};
export declare function authenticateUser(token: string): Promise<RealtimeUser>;
export declare function fetchCommentHistory(token: string, roomId: string): Promise<CommentHistoryResponse>;
export declare function createComment(token: string, roomId: string, text: string): Promise<CommentCreateResponse>;
export declare function createReply(token: string, roomId: string, parentId: string, text: string): Promise<ReplyCreateResponse>;
export declare function toggleCommentVote(token: string, commentId: string): Promise<CommentVoteToggleResponse>;
export declare function toggleVideoVote(token: string, videoId: string): Promise<VideoVoteToggleResponse>;
//# sourceMappingURL=django.d.ts.map