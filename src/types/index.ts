export interface User {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  created_at: string;
}

export interface Query {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  status: 'pending' | 'completed';
}

export interface Response {
  id: string;
  query_id: string;
  model_name: string;
  content: string;
  created_at: string;
}

export interface Rating {
  id: string;
  response_id: string;
  user_id: string;
  score: number;
  feedback?: string;
  created_at: string;
}
