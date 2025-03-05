import { Client, Account, OAuthProvider, Databases, Users } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config({
    path: './.env'
});

const createAppwriteClient = async(type: any, session: any) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT as string)
        .setProject(process.env.APPWRITE_PROJECT_ID as string);

    if(type === 'admin'){
        // console.log('Initializing Appwrite client with admin API key', process.env.APPWRITE_API_KEY);
        client.setKey(process.env.APPWRITE_API_KEY as string);
    }
    if(type === 'session' && session){
        client.setSession(session);
    }  

    return {
        get account(){
            return new Account(client);
        },
        get databases(){
            return new Databases(client);
        },
        get users() {
            return new Users(client);
        }
    }
}

export default createAppwriteClient