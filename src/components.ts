// --------------------------------------------------------

import { z } from "zod";
import { customGet } from "./index.js";
import { GetChannelRewardsRedemptionsSchema, rewardsSchema } from "./schema.js";
import { parseOptions } from "./utils.js";

export interface GetChannelRewardsOptions {
    /** User ID of the broadcaster */
    broadcaster_id: string;
    id?: string;
    only_manageable_rewards?: boolean;
}

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

/** Gets the channel stream key for a user. */
export const getChannelRewardsRedemptions = async (
    options: GetChannelRewardsRedemptionsOptions
): Promise<
    z.infer<typeof GetChannelRewardsRedemptionsSchema> | { data: [] }
> => {
    const query = "?" + parseOptions(options);
    const endpoint = `/channel_points/custom_rewards/redemptions${query}`;

    const result = await customGet(endpoint);

    try {
        GetChannelRewardsRedemptionsSchema.parse(result);
    } catch (error) {
        console.log("No new redemptions");
        return { data: [] };
    }

    return result;
};

export const customRewardBody = {
    title: "Sample: Follow me!",
    prompt: "Follows the requesting user!",
    cost: 10 * 1000 * 1000,
    is_enabled: true,
};

// if the custom reward doesn't exist, creates it. returns true if successful, false if not
export const addCustomReward = async (
    api,
    {
        broadcaster_id,
    }: {
        broadcaster_id: string;
    }
) => {
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
