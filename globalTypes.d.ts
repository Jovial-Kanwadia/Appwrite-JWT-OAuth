// types/express.d.ts
import { User } from 'node-appwrite'; // Import the User type from Appwrite (if applicable)

declare global {
  namespace Express {
    interface Request {
      user?: User | any; // Define the `user` property
    }
  }
}