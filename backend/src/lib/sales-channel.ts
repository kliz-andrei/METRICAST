const channelKey = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s-]+/g, " ");

const displayChannels = new Map<string, string>([
  ["dine in", "Dine In"],
  ["takeout", "Takeout"],
  ["take out", "Takeout"],
  ["delivery", "Delivery"],
  ["foodpanda", "Delivery"],
  ["food panda", "Delivery"],
  ["grabfood", "Delivery"],
  ["grab food", "Delivery"],
]);

const sourceAliases = new Map<string, string[]>([
  ["Dine In", ["Dine In", "Dine-in"]],
  ["Takeout", ["Takeout", "Take Out", "Take-out"]],
  ["Delivery", ["Delivery", "Foodpanda", "Grabfood"]],
]);

/** Converts known source/provider labels to a dashboard display channel. Unknown labels stay visible. */
export const normalizeSalesChannel = (value: string) =>
  displayChannels.get(channelKey(value)) ?? value.trim();

/** Expands a dashboard display-channel filter to its source values without classifying unknown values. */
export const salesChannelFilterValues = (channels?: string[]) => channels?.flatMap((channel) => {
  const displayChannel = normalizeSalesChannel(channel);
  return sourceAliases.get(displayChannel) ?? [channel.trim()];
});
