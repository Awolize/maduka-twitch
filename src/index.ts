import * as dotenv from "dotenv";
dotenv.config();

import { TwitchApi } from "node-twitch";
import HttpServer from "./server.js";
import open from "open";
import { parseOptions } from "./utils.js";
import { rewardSchema } from "./schema.js";

let server: HttpServer;
const PORT = 3000;
const api = new TwitchApi({
    client_id: process.env.CLIENT_ID!,
    client_secret: process.env.CLIENT_SECRET!,
    redirect_uri: "http://localhost:" + PORT,
    scopes: ["channel:read:redemptions", "channel:manage:redemptions"],
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

import { z } from "zod";
const rewardsSchema = z.array(rewardSchema);

/** Gets the channel stream key for a user. */
export const getChannelRewards = async (
    options: GetChannelRewardsOptions
): Promise<typeof rewardsSchema> => {
    const query = "?" + parseOptions(options);
    const endpoint = `/channel_points/custom_rewards${query}`;

    const result = await customGet(endpoint);

    const valid = rewardsSchema.parse(result);

    return valid ? result : null;
};

export interface GetChannelRewardsRedemptionsOptions {
    /** User ID of the broadcaster */
    broadcaster_id: string;
    reward_id: string;
    status: "CANCELED" | "FULFILLED" | "UNFULFILLED";
    id?: string;
    sort?: "OLDEST" | "NEWEST"; // The default is OLDEST.
    after?: string;
    first?: string;
}

/** Gets the channel stream key for a user. */
export const getChannelRewardsRedemptions = async (
    options: GetChannelRewardsRedemptionsOptions
): Promise<any> => {
    const query = "?" + parseOptions(options);
    const endpoint = `/channel_points/custom_rewards/redemptions${query}`;

    const result = await customGet(endpoint);

    return result;
};

const customRewardBody = {
    title: "Sample: Follow me!",
    prompt: "Follows the requesting user!",
    cost: 10 * 1000 * 1000,
    is_enabled: true,
    is_global_cooldown_enabled: true,
    global_cooldown_seconds: 10 * 60,
};

// if the custom reward doesn't exist, creates it. returns true if successful, false if not
const addCustomReward = async ({
    broadcaster_id,
}: {
    broadcaster_id: string;
}) => {
    try {
        const response = await fetch(
            `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Client-ID": api.client_id,
                    Authorization: `Bearer ${api.access_token}`,
                },
                body: JSON.stringify(customRewardBody),
            }
        );

        const data = await response.json();
        console.log(data);

        return data.data[0].id;
    } catch (error) {
        console.log("Failed to add the reward. Please try again.");
        console.log(error);

        return false;
    }
};

// --------------------------------------------------------

server.start();

await setup();

const result1 = await api.getCurrentUser();
console.log(result1);

if (result1) {
    const rewardId = await addCustomReward({ broadcaster_id: result1.id });
    console.log("rewardId:", rewardId);

    // const result2 = await getChannelRewards({ broadcaster_id: result1.id });
    // console.log(result2);

    const result2 = await getChannelRewardsRedemptions({
        broadcaster_id: result1.id,
        reward_id: rewardId,
        status: "UNFULFILLED",
    });
    console.log(result2);

    console.log(result2?.length);
}

console.log("access_token:", api.access_token);
console.log("refresh_token:", api.refresh_token);

server.stop();
