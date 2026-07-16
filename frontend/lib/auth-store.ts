export interface User { id: string; name: string; email: string; }

// ─── In-Memory User Store ───
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string; // In production, hash this!
}

// This resets on server restart — fine for demo/dev
const users: StoredUser[] = [
  {
    id: "1",
    name: "Priya Sharma",
    email: "priya@astrafinance.com",
    password: "demo1234",
  },
];

let nextId = 2;

export function findUserByEmail(email: string): StoredUser | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createUser(name: string, email: string, password: string): StoredUser {
  const user: StoredUser = {
    id: String(nextId++),
    name,
    email: email.toLowerCase(),
    password,
  };
  users.push(user);
  return user;
}

export function validateCredentials(email: string, password: string): User | null {
  const user = findUserByEmail(email);
  if (!user || user.password !== password) return null;
  return { id: user.id, name: user.name, email: user.email };
}
