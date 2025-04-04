import 'dotenv/config'; 
import app from "./app";
import cookieParser from "cookie-parser";
import createAppwriteClient from "./appwrite";
import { OAuthProvider } from 'node-appwrite';
import type { Request, Response } from 'express';
import express from 'express';

app.use(cookieParser());
app.use(express.json());

const PORT = process.env.PORT || 5173;

app.get('/', async (req: Request, res: Response): Promise<void> => {
    res.status(200).send('Authentication using Appwrite');
})

app.get('/auth', async (req: Request, res: Response): Promise<void> => {
    try {
        const { account } = await createAppwriteClient('admin', null);
        const redirectUrl = await account.createOAuth2Token(
            OAuthProvider.Google,
            "http://localhost:5173/success",
            "http://localhost:5173/fail"
        )

        const button = `<button><a href="${redirectUrl}">Login with Google</a></button>`;
        res.set('Content-Type', 'text/html');

        res.status(200).send(button);
    } catch (error) {
        res.status(500).json({ error });
    }
})

app.get('/success', async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, secret } = req.query;

        const { account } = await createAppwriteClient('admin', null);
        const session = await account.createSession(userId as string, secret as string);

        res.cookie('session', session.secret, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            expires: new Date(session.expire),
            path: '/'
        })

        res.send("Session set successfully");
    } catch (error) {
        res.status(500).json({ error });
    }
})

app.get('/user', async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionCookie = req.cookies.session;
        if (!sessionCookie) {
            res.status(401).json({ error: 'Unauthorized' });
        }

        const { account } = await createAppwriteClient('session', sessionCookie);
        const user = await account.get();

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error });
    }
})

app.post('/register', async (req, res): Promise<void> => {
    // Ensure req.body exists
    if (!req.body) {
        res.status(400).json({ error: 'Request body is missing.' });
        return;
    }
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
    }

    try {
        // Create an Appwrite client using admin credentials
        const appwrite = await createAppwriteClient('admin', null);

        // Create the user account in Appwrite
        const user = await appwrite.account.create('unique()', email, password, name || '');

        // OPTIONAL: You can also store additional user data in your own database here

        res.status(201).json({
            message: 'User registered successfully',
            user,
        });
    } catch (error: any) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Error registering user', details: error.message });
    }
});

app.post('/login', async (req, res): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
    }

    try {
        // Create an Appwrite client using admin credentials.
        const appwrite = await createAppwriteClient('admin', null);

        // Validate credentials by creating a session.
        // This returns a session object which contains the userId.
        const sessionResponse = await appwrite.account.createEmailPasswordSession(email, password);

        // Use the userId from the session response directly.
        const userId = sessionResponse.userId;

        // Generate a JWT token for the user using the valid userId.
        const jwtResponse = await appwrite.users.createJWT(userId);

        res.status(200).json({
            message: 'Login successful.',
            token: jwtResponse.jwt,
        });
    } catch (error: any) {
        console.error('Error during login:', error);
        res.status(401).json({
            error: 'Invalid credentials or error during login',
            details: error.message,
        });
    }
});


app.get('/logout', (req: Request, res: Response): void => {
    const button = `
        <form action="/logout" method="POST">
            <button type="submit" style="padding: 10px 20px; cursor: pointer;">
                Logout
            </button>
        </form>
    `;
    res.set('Content-Type', 'text/html');
    res.status(200).send(button);
});

app.post('/logout', async (req: Request, res: Response): Promise<void> => {
    const sessionCookie = req.cookies.session;
    let sessionToken: string | null = null;

    if (sessionCookie) {
        sessionToken = sessionCookie;
    } else {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(400).json({ error: 'No session found.' });
            return;
        }
        sessionToken = authHeader.split(" ")[1];
    }

    try {
        const appwrite = await createAppwriteClient('session', sessionToken);
        await appwrite.account.deleteSession('current');

        if (sessionCookie) {
            res.clearCookie('session', {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'strict'
            });
        }

        res.status(200).send(`
            <p>Logged out successfully</p>
            <a href="/">Return home</a>
        `);
    } catch (error: any) {
        res.status(500).send(`
            <p>Error logging out: ${error.message}</p>
            <a href="/">Return home</a>
        `);
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});