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
): Promise<z.infer<typeof rewardsSchema>> => {
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

export const GetChannelRewardsRedemptionsSchema = z.object({
    data: z.array(
        z.object({
            broadcaster_name: z.string(),
            broadcaster_login: z.string(),
            broadcaster_id: z.string(),
            id: z.string(),
            user_login: z.string(),
            user_id: z.string(),
            user_name: z.string(),
            user_input: z.string(),
            status: z.string(),
            redeemed_at: z.string(),
            reward: z.object({
                id: z.string(),
                title: z.string(),
                prompt: z.string(),
                cost: z.number(),
            }),
        })
    ),
    pagination: z.object({ cursor: z.string() }),
});

/** Gets the channel stream key for a user. */
export const getChannelRewardsRedemptions = async (
    options: GetChannelRewardsRedemptionsOptions
): Promise<z.infer<typeof GetChannelRewardsRedemptionsSchema>> => {
    const query = "?" + parseOptions(options);
    const endpoint = `/channel_points/custom_rewards/redemptions${query}`;

    const result = await customGet(endpoint);

    const valid = GetChannelRewardsRedemptionsSchema.parse(result);

    return valid ? result : null;
};

const customRewardBody = {
    title: "Sample: Follow me!",
    prompt: "Follows the requesting user!",
    cost: 10 * 1000 * 1000,
    is_enabled: true,
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

const fulfillRewards = async (
    broadcaster_id,
    rewardId,
    redemptionIds: string[],
    status: "FULFILLED" | "CANCELED"
) => {
    // if empty, just cancel
    if (redemptionIds.length == 0) {
        return;
    }

    // transforms the list of redemptionIds to redemptionIds=id for the API call
    redemptionIds = redemptionIds.map((v) => `id=${v}`);

    try {
        await fetch(
            `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${broadcaster_id}&reward_id=${rewardId}&${redemptionIds.join(
                "&"
            )}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Client-ID": api.client_id,
                    Authorization: `Bearer ${api.access_token}`,
                },
                body: JSON.stringify({ status: status }),
            }
        );
    } catch (error) {
        console.log(error);
    }
};

// --------------------------------------------------------

class Main {
    async init() {
        server.start();
    }

    async checkRedemptions(rewardId) {
        if (!currentUser) {
            return;
        }
        // const rewardId = await addCustomReward({ broadcaster_id: result1.id });

        console.log("rewardId:", rewardId);

        // const result2 = await getChannelRewards({ broadcaster_id: result1.id });
        // console.log(result2);

        const { data: redemptions } = await getChannelRewardsRedemptions({
            broadcaster_id: currentUser.id,
            reward_id: rewardId,
            status: "UNFULFILLED",
        });

        console.log("new redemptions:", redemptions.length);

        if (!redemptions) {
            return;
        }

        // let successfulRedemptions: string[] = [];
        // let failedRedemptions: string[] = [];
        //
        // for (let redemption of redemptions) {
        //     // can't follow yourself :)
        //     if (redemption.broadcaster_id == redemption.user_id) {
        //         failedRedemptions.push(redemption.id);
        //         continue;
        //     }
        //     // if failed, add to the failed redemptions
        //     if (
        //         (await followUser(
        //             redemption.broadcaster_id,
        //             redemption.user_id
        //         )) == false
        //     ) {
        //         failedRedemptions.push(redemption.id);
        //         continue;
        //     }
        //     // otherwise, add to the successful redemption list
        //     successfulRedemptions.push(redemption.id);
        // }

        // do this in parallel
        await Promise.all([
            fulfillRewards(
                currentUser.id,
                rewardId,
                redemptions.map((el) => el.id),
                "FULFILLED"
            ),
            // fulfillRewards(failedRedemptions, "CANCELED"),
        ]);
    }

    async destructor() {
        console.log("access_token:", api.access_token);
        console.log("refresh_token:", api.refresh_token);

        if (server) {
            server.stop();
        }
    }
}

const specificRewardId = "08a5d17f-5161-4e56-99ea-2a05fa50f423";
const currentUser = await api.getCurrentUser();
const mainInstance = new Main();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
    await mainInstance.init();
    while (true) {
        try {
            await mainInstance.checkRedemptions(specificRewardId);
            await delay(15000); // Delay for 15 seconds
        } catch (error) {
            console.error("An error occurred:", error);
            break;
        }
    }
} catch (error) {
    console.error("An error occurred:", error);
} finally {
    await mainInstance.destructor();
}
