export type User = {
  _id: string;
  user_provider_id: string;
  username: string;
  email: string;
  authProvider: "google" | "github";
  profileImage?: string;
};
