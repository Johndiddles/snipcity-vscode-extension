import { User } from "./user";

export type Snippet = {
  _id: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  isPublic: boolean;
  author: User;
  upvotes: number;
  downvotes: number;
  tags?: string;
};
