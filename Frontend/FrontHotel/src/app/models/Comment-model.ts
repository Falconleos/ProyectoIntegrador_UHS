export interface CommentDtoResponse {
  id: number;
  content: string;
  rating: number;
  showable:boolean;
  createdAt: string;
  name: string;
  surname: string;
  username: string;
}

export interface CommentDtoRequest {
  content: string;
  rating: number;
}