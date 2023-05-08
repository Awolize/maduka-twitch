import { z } from "zod";

export const rewardSchema = z.object({
    broadcaster_name: z.string(),
    broadcaster_login: z.string(),
    broadcaster_id: z.string(),
    id: z.string(),
    image: z.any(),
    background_color: z.string(),
    is_enabled: z.boolean(),
    cost: z.number(),
    title: z.string(),
    prompt: z.string(),
    is_user_input_required: z.boolean(),
    max_per_stream_setting: z.any(),
    max_per_user_per_stream_setting: z.any(),
    global_cooldown_setting: z.any(),
    is_paused: z.boolean(),
    is_in_stock: z.boolean(),
    default_image: z.any(),
    should_redemptions_skip_request_queue: z.boolean(),
    redemptions_redeemed_current_stream: z.null(),
    cooldown_expires_at: z.null(),
});
export const rewardsSchema = z.array(rewardSchema);

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
