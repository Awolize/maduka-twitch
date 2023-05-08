import * as dotenv from "dotenv";
dotenv.config();

import { TwitchApi } from "node-twitch";
import HttpServer from "./server.js";
import open from "open";
import { parseOptions } from "./utils.js";

let server: HttpServer;
const PORT = 3000;
const api = new TwitchApi({
    client_id: process.env.CLIENT_ID!,
    client_secret: process.env.CLIENT_SECRET!,
    redirect_uri: "http://localhost:" + PORT,
    scopes: ["channel:read:redemptions", "channel:manage:redemptions"],
    access_token: process.env.CLIENT_ACCESS_TOKEN ?? undefined,
});

server = new HttpServer({ port: PORT });

// --------------------------------------------------------

async function setup() {
    await new Promise(async (resolve) => {
        const authUrl = api.generateAuthUrl();
        await open(authUrl);

        server.on("code", async (code) => {
            await api.getUserAccess(code);
            console.log("code?:", code);
            console.log("access_token:", api.access_token);
            console.log("refresh_token:", api.refresh_token);

            resolve(undefined);
        });
    });
}

// --------------------------------------------------------

const customGet = async (endpoint: string): Promise<any> => {
    const url = api.base + endpoint;
    const options = {
        method: "GET",
        headers: {
            "Client-ID": api.client_id,
            Authorization: `Bearer ${api.access_token}`,
        },
    };

    const response = await fetch(url, options);
    const result = await response.json();
    return result;
};

// --------------------------------------------------------

export interface GetChannelRewardsOptions {
    /** User ID of the broadcaster */
    broadcaster_id: string;
    id?: string;
    only_manageable_rewards?: boolean;
}

/** Gets the channel stream key for a user. */
export const getChannelRewards = async (
    options: GetChannelRewardsOptions
): Promise<string> => {
    const query = "?" + parseOptions(options);
    const endpoint = `/channel_points/custom_rewards${query}`;

    const result = await customGet(endpoint);
    console.log(result);

    return result.data[0];
};

// --------------------------------------------------------

server.start();

await setup();
const result1 = await api.getCurrentUser();
console.log(result1);

if (result1) {
    const result2 = await getChannelRewards({ broadcaster_id: result1.id });
    console.log(result2);
}

server.stop();
