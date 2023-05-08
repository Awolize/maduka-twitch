import * as dotenv from "dotenv";
dotenv.config();

import { TwitchApi } from "node-twitch";
import HttpServer from "./server.js";
import open from "open";
import { getChannelRewardsRedemptions } from "./components.js";

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

export const customGet = async (endpoint: string): Promise<any> => {
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

export const fulfillRewards = async (
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

const init = async () => {
    server.start();
};

const checkRedemptions = async (rewardId) => {
    if (!currentUser) {
        return;
    }
    console.log("rewardId:", rewardId);

    const { data: redemptions } = await getChannelRewardsRedemptions({
        broadcaster_id: currentUser.id,
        reward_id: rewardId,
        status: "UNFULFILLED",
    });

    console.log("new redemptions:", redemptions.length);

    if (!redemptions) {
        return;
    }

    // do this in parallel
    await fulfillRewards(
        currentUser.id,
        rewardId,
        redemptions.map((el) => el.id),
        "FULFILLED"
    );
};

const destructor = async () => {
    console.log("access_token:", api.access_token);
    console.log("refresh_token:", api.refresh_token);

    if (server) {
        server.stop();
    }
};

await init();
await setup();

const specificRewardId = "08a5d17f-5161-4e56-99ea-2a05fa50f423";
const currentUser = await api.getCurrentUser();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
    while (true) {
        await checkRedemptions(specificRewardId);
        await delay(15000); // Delay for 15 seconds
    }
} catch (error) {
    console.error("An error occurred:", error);
} finally {
    await destructor();
}
