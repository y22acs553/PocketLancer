export interface User {
  _id: string;
  name: string;
  email: string;
  role: "client" | "freelancer" | "admin";
  phone?: string;
  honorScore?: number;
}
