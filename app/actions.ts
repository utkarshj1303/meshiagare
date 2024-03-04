'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { kv } from '@vercel/kv'
import { nanoid } from 'nanoid'

import { auth } from '@/auth'
import { type Chat} from '@/lib/types'

type Group = {
  id: string,
  name: string,
}

interface GroupChatDetails {
  id: string
  title: string
  location: string
  priceRange: string
  preferences?: string[]
}

export async function createGroupChatDetails({
  location,
  title,
  preferences,
  priceRange,
}: any) {
  const groupChatDetailsId = nanoid();
  const groupChatDetails = {
    id: groupChatDetailsId,
    title,
    location,
    priceRange,
  };
  await kv.hset(`groupChatDetails:${groupChatDetailsId}`, groupChatDetails);
  await kv.sadd(`groupChatDetails:${groupChatDetailsId}:preferences`, ...preferences);
  return groupChatDetails;
}

export async function getGroupChatDetails(groupChatDetailsId: string) {
  const [details, preferences] = await Promise.all([
    kv.hgetall<GroupChatDetails>(`groupChatDetails:${groupChatDetailsId}`),
    kv.smembers(`groupChatDetails:${groupChatDetailsId}:preferences`),
  ]);
  return { ...details, preferences };
}

export async function addGroupChatPreferences(groupChatDetailsId, preference: string) {
  return await kv.sadd(`groupChatDetails:${groupChatDetailsId}:preferences`, preference);
}

export async function removeGroupChatPreferences(groupChatDetailsId, preference: string) {
  return await kv.srem(`groupChatDetails:${groupChatDetailsId}:preferences`, preference);
}

export async function updateGroupChatLocation(groupChatDetailsId, location) {
  const groupChatDetails = await getGroupChatDetails(groupChatDetailsId);

  if (!groupChatDetails) {
    throw new Error(`Group chat details with ID ${groupChatDetailsId} not found`);
  }

  groupChatDetails.location = location;

  await kv.hset(`groupChatDetails:${groupChatDetailsId}`, groupChatDetails);

  return groupChatDetails;
}

export async function updateGroupChatPriceRange(groupChatDetailsId, priceRange) {
  const groupChatDetails = await getGroupChatDetails(groupChatDetailsId);

  if (!groupChatDetails) {
    throw new Error(`Group chat details with ID ${groupChatDetailsId} not found`);
  }

  groupChatDetails.priceRange = priceRange;

  await kv.hset(`groupChatDetails:${groupChatDetailsId}`, groupChatDetails);

  return groupChatDetails;
}

export async function updateGroupChatTitle(groupChatDetailsId, title) {
  const groupChatDetails = await getGroupChatDetails(groupChatDetailsId);

  if (!groupChatDetails) {
    throw new Error(`Group chat details with ID ${groupChatDetailsId} not found`);
  }

  groupChatDetails.title = title;

  await kv.hset(`groupChatDetails:${groupChatDetailsId}`, groupChatDetails);

  return groupChatDetails;
}

export async function addPin(
  groupChatDetailsId: string,
  pinDetails: { userId:string, restaurantName: string; reason: string; image: string }
) {
  const pinId = nanoid();
  const pin = {
    pinId,
    ...pinDetails
  };
  await kv.hset(`groupChatDetails:${groupChatDetailsId}:pins`, {[`pin:${pinId}`]: pin});
  return pinId;
}

export async function removePin(groupChatDetailsId: string, pinId: string) {
  await kv.hdel(`groupChatDetails:${groupChatDetailsId}:pins`, `pin:${pinId}`);
}

export async function getRankedChoiceWinner(groupChatDetailsId: string): Promise<string> {
  // Fetch all votes for the group
  const votesData = await getAllVotesForGroup(groupChatDetailsId);
  
  if (Object.keys(votesData).length === 0) {
    return 'No votes have been cast.';
  }

  // Prepare the user votes
  const userVotes = Object.entries(votesData).map(([userKey, votes]) => ({
    userId: userKey.replace('user:', ''),
    votes: votes
  }));

  // Fetch all pins for the group to map pin IDs to restaurant names
  const pinsData = await getAllPinsForGroup(groupChatDetailsId);
  const pinIdToRestaurantName = pinsData.reduce((acc, pin) => {
    acc[pin.pinId] = pin.restaurantName;
    return acc;
  }, {});

  // Initialize variables to store first choices and all unique restaurant options
  let firstChoices = {};
  let allOptions = new Set<string>();

  // Helper function to count first choices
  const countFirstChoices = (userVotes) => {
    firstChoices = {};
    userVotes.forEach(({ votes }) => {
      const topChoices = Object.entries(votes)
        .filter(([_, rank]) => rank === Math.min(...Object.values(votes)))
        .map(([pinId]) => pinId);
      
      topChoices.forEach(topChoice => {
        firstChoices[topChoice] = (firstChoices[topChoice] || 0) + 1;
        allOptions.add(topChoice);
      });
    });
  };

  // Count the initial first choices
  countFirstChoices(userVotes);

  // Function to redistribute votes
  const redistributeVotes = (eliminatedOptions) => {
    userVotes.forEach(userVote => {
      eliminatedOptions.forEach(option => {
        delete userVote.votes[option];
      });
    });
    countFirstChoices(userVotes);
  };

  // Helper function to format votes
  const formatVotes = (votes) => {
    return votes.map(vote => `${vote.userId} voted ${vote.voteValue}`).join('\n');
  };

  // Main IRV loop
  while (true) {
    const totalVotes = Object.values(firstChoices).reduce((acc, val) => acc + val, 0);
    const majority = totalVotes / 2;

    // Check if any option has a majority
    for (const [option, count] of Object.entries(firstChoices)) {
      if (count > majority) {
        // Collect vote details for the winner
        const winnerVotes = userVotes
          .filter(userVote => {
            const topChoices = Object.entries(userVote.votes)
              .filter(([_, rank]) => rank === Math.min(...Object.values(userVote.votes)))
              .map(([pinId]) => pinId);
            return topChoices.includes(option);
          })
          .map(userVote => ({
            userId: userVote.userId,
            voteValue: userVote.votes[option]
          }));
        const restaurantName = pinIdToRestaurantName[option];
        const formattedWinnerVotes = formatVotes(winnerVotes);
        return `The top choice is ${restaurantName} with the following votes:\n${formattedWinnerVotes}\nTotal votes received: ${count}`;
      }
    }

    // Find the options with the fewest votes
    const minVoteCount = Math.min(...Object.values(firstChoices));
    const optionsToEliminate = Object.entries(firstChoices)
      .filter(([_, count]) => count === minVoteCount)
      .map(([option]) => option);

    // If all remaining options are tied, declare a tie and print vote details for all tied options
    if (optionsToEliminate.length === Object.keys(firstChoices).length) {
      const tiedRestaurantNames = Array.from(allOptions).map(option => pinIdToRestaurantName[option]);
      const tiedVotesDetails = tiedRestaurantNames.map(name => {
        const tiedOption = Object.keys(pinIdToRestaurantName).find(pinId => pinIdToRestaurantName[pinId] === name);
        const tiedVotes = userVotes
          .filter(userVote => {
            const topChoices = Object.entries(userVote.votes)
              .filter(([_, rank]) => rank === Math.min(...Object.values(userVote.votes)))
              .map(([pinId]) => pinId);
            return topChoices.includes(tiedOption);
          })
          .map(userVote => ({
            userId: userVote.userId,
            voteValue: userVote.votes[tiedOption]
          }));
        const tiedVoteCount = tiedVotes.length;
        const formattedTiedVotes = formatVotes(tiedVotes);
        return `${name} with the following votes:\n${formattedTiedVotes}\nTotal votes received: ${tiedVoteCount}`;
      }).join('\n\n');
      return `It's a tie between:\n${tiedVotesDetails}`;
    }

    // Eliminate the options with the fewest votes and redistribute votes
    redistributeVotes(optionsToEliminate);
    optionsToEliminate.forEach(option => allOptions.delete(option));

    // If there are no more options to eliminate, declare a tie
    if (Object.keys(firstChoices).length === 0) {
      const tiedRestaurantNames = Array.from(allOptions).map(option => pinIdToRestaurantName[option]);
      const tiedVotesDetails = tiedRestaurantNames.map(name => {
        const tiedOption = Object.keys(pinIdToRestaurantName).find(pinId => pinIdToRestaurantName[pinId] === name);
        const tiedVotes = userVotes
          .filter(userVote => {
            const topChoices = Object.entries(userVote.votes)
              .filter(([_, rank]) => rank === Math.min(...Object.values(userVote.votes)))
              .map(([pinId]) => pinId);
            return topChoices.includes(tiedOption);
          })
          .map(userVote => ({
            userId: userVote.userId,
            voteValue: userVote.votes[tiedOption]
          }));
        const tiedVoteCount = tiedVotes.length;
        const formattedTiedVotes = formatVotes(tiedVotes);
        return `${name} with the following votes:\n${formattedTiedVotes}\nTotal votes received: ${tiedVoteCount}`;
      }).join('\n\n');
      return `It's a tie between:\n${tiedVotesDetails}`;
    }
  }
}

async function getAllVotesForGroup(groupChatDetailsId: string) {
  return await kv.hgetall(`groupChatDetails:${groupChatDetailsId}:votes`);
}


export async function getAllPinsForGroup(groupChatDetailsId: string) {
  const pins = await kv.hgetall(`groupChatDetails:${groupChatDetailsId}:pins`);
  if (pins) {
    const pinsArray = Object.values(pins).map((pin) => {
      if (typeof pin === 'string') {
        return JSON.parse(pin);
      } else {
        return pin;
      }
    });
    return pinsArray
  }
  return [];
}

export async function vote(
  groupChatDetailsId: string,
  pinId: string,
  vote: number,
  userId: string
) {
  const key = `groupChatDetails:${groupChatDetailsId}:votes`;
  const userKey = `user:${userId}`;
  const existingVotes = await kv.hget(key, userKey);
  const updatedVotes = existingVotes ? { ...existingVotes } : {};

  updatedVotes[pinId] = vote;

  await kv.hset(key, { [userKey]: updatedVotes });
}

export async function removeVote(
  groupChatDetailsId: string,
  pinId: string,
  userId: string
) {
  const key = `groupChatDetails:${groupChatDetailsId}:votes`;
  const userKey = `user:${userId}`;
  const existingVotes = await kv.hget(key, userKey);

  if (existingVotes && existingVotes[pinId] !== undefined) {
    delete existingVotes[pinId];
    await kv.hset(key, { [userKey]: existingVotes });
  }
}

export async function getAllVotesForUserInGroup(
  groupChatDetailsId: string,
  userId: string
): Promise<{ pinId: string; vote: number }[]> {
  const key = `groupChatDetails:${groupChatDetailsId}:votes`;
  const userKey = `user:${userId}`;

  const votes = await kv.hget(key, userKey);
  if (!votes) {
    return [];
  }

  return Object.entries(votes).map(([pinId, vote]) => ({
    pinId,
    vote: Number(vote),
  }));
}

export async function getChats(userId?: string | null) {
  if (!userId) {
    return [];
  }

  try {
    const pipeline = kv.pipeline();
    const chats: string[] = await kv.zrange(`user:chat:${userId}`, 0, -1, { rev: true });

    for (const chat of chats) {
      pipeline.hgetall(chat);
    }

    const results = await pipeline.exec();

    const chatsWithTitles = await Promise.all(
      (results as Chat[]).map(async (chat) => {
        let title = '';
        if (chat.groupChatDetailsId) {
          const groupChatDetails = await kv.hgetall<GroupChatDetails>(`groupChatDetails:${chat.groupChatDetailsId}`);
          title = groupChatDetails?.title || '';
        }
        return {
          ...chat,
          title,
        };
      })
    );

    return chatsWithTitles;
  } catch (error) {
    return [];
  }
}

interface User {
  id: string;
  name: string;
  image: string;
  isFirstLogin: boolean,
  location?: string;
  priceRange?: number;
}

export async function updateUserIsFirstLogin(email: string, user: User) {
    user.isFirstLogin = false;
    await kv.set(`user:${email}`, user);
}

export async function updateUserLocation(email: string, location: string) {
  const user = await kv.get<User>(`user:${email}`);
  if (user) {
    user.location = location ? location : "";
    await kv.set(`user:${email}`, user);
  }
}

export async function updateUserPriceRange(email: string, priceRange: number) {
  const user = await kv.get<User>(`user:${email}`);
  if (user) {
    user.priceRange = priceRange? priceRange : "";
    await kv.set(`user:${email}`, user);
  }
}


export async function addUserPreference(email: string, preference: string) {
  try {
    const key = `user:${email}:preferences`;
    await kv.sadd(key, preference);
  } catch (error) {
    console.error('Error adding preference:', error);
    throw error;
  }
}

export async function removeUserPreference(email: string, preference: string) {
  try {
    const key = `user:${email}:preferences`;
    await kv.srem(key, preference);
  } catch (error) {
    console.error('Error removing preference:', error);
    throw error;
  }
}

export async function getUserPreferences(email: string) {
  try {
    const key = `user:${email}:preferences`;
    const preferences = await kv.smembers(key);
    return preferences;
  } catch (error) {
    console.error('Error retrieving user preferences:', error);
    throw error;
  }
}

export async function getUser(email: string) {
  try {
    const user = await kv.get(`user:${email}`)
    if (user) {
      return user
    } else {
      return null 
    }
  } catch (error) {
    console.error('Error getting user:', error)
    throw error 
  }
}

export async function getUsers(userIds: string[]) {
  if (userIds.length == 0) {
    return [];
  }

  const pipeline = kv.pipeline()

  for (const userId of userIds) {
    pipeline.get(`user:${userId}`)
  }

  const users = await pipeline.exec()
  return users
}

export async function getUserAndPreferences(email: string) {
  try {
    const pipeline = kv.pipeline();
    pipeline.get(`user:${email}`);
    pipeline.smembers(`user:${email}:preferences`);

    const [user, preferences] = await pipeline.exec();
    return { userData: user, preferences };
  } catch (error) {
    console.error('Error retrieving user data:', error);
    throw error;
  }
}

interface CreateGroupParams {
  name: string;
  userIds: string[];
}

export async function createGroup({ name, userIds }: CreateGroupParams) {
  const groupId = nanoid();

  const pipeline = kv.pipeline();
  for (const userId of userIds) {
    pipeline.hset(`user:${userId}:groups`, {[groupId]: name});
  }

  pipeline.sadd(`group:${groupId}:users`, ...userIds);
   
  await pipeline.exec();

  return groupId;
}

export async function getGroupUsers(groupId: string): Promise<string[]> {
  const userIds:string[] = await kv.smembers(`group:${groupId}:users`);
  if (userIds) {
    return userIds;
  }
  return [];
}


export async function getGroupsForUser(userId: string) {
  try {
    const groupsMap = await kv.hgetall(`user:${userId}:groups`);
    if (groupsMap) {
      const groups = Object.entries(groupsMap).map(
        ([groupId, groupName]) => ({
          id: groupId,
          name: groupName,
        })
      );
      return groups;
    }
    return [];
  } catch (error) {
    console.error(`Error retrieving groups for user ${userId}:`, error);
    throw error;
  }
}

export async function getPreferencesForGroup(groupId: string) {
  try {
    // Retrieve all user IDs in the group
    const userIds: string[] = await getGroupUsers(groupId);

    if (userIds.length === 0) {
      return [];
    }

    const pipeline = kv.pipeline();

    // Fetch preferences for each user
    for (const userId of userIds) {
      pipeline.smembers(`user:${userId}:preferences`);
    }

    const preferencesResults = await pipeline.exec();
    
    // Flatten preferences
    const allPreferences = preferencesResults.flat();

    return allPreferences;
  } catch (error) {
    console.error(`Error retrieving preferences for group ${groupId}:`, error);
    throw error;
  }
}


export async function createChat({ chatId=null, userId, groupId, groupChatDetailsId }) {
  let id;
  if (!chatId) {
   id = nanoid();
  } else {
    id = chatId;
  }
  const createdAt = Date.now()
  const path = `/chat/${id}`
  
  const payload = {
    id,
    userId,
    createdAt,
    path,
    messages: [],
    conversationSoFar: '',
    previouslySuggestedRestaurants: [],
    groupId: groupId || '',
    groupChatDetailsId: groupChatDetailsId || '',
  }

  await kv.hmset(`chat:${id}`, payload)
  if (userId) {
    await kv.zadd(`user:chat:${userId}`, { score: createdAt, member: `chat:${id}` })
  }
  return payload;
}

export async function addMessageToChat(chatId, chat) {
  await kv.hmset(`chat:${chatId}`, chat)
}


export async function getChat(id: string, userId: string | null) {
  const chat = await kv.hgetall<Chat>(`chat:${id}`);
  if (!chat || (userId && chat.userId !== userId)) {
    return null;
  }

  let groupChatDetails = null;
  if (chat.groupChatDetailsId) {
    groupChatDetails = await kv.hgetall<GroupChatDetails>(`groupChatDetails:${chat.groupChatDetailsId}`);
    chat.title = groupChatDetails?.title || '';
  }

  return {chat, groupChatDetails};
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = await auth()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  //Convert uid to string for consistent comparison with session.user.id
  const uid = String(await kv.hget(`chat:${id}`, 'userId'))

  if (uid !== session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  await kv.del(`chat:${id}`)
  await kv.zrem(`user:chat:${session.user.id}`, `chat:${id}`)

  revalidatePath('/')
  return revalidatePath(path)
}

export async function clearChats() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const chats: string[] = await kv.zrange(`user:chat:${session.user.id}`, 0, -1)
  if (!chats.length) {
    return redirect('/')
  }
  const pipeline = kv.pipeline()

  for (const chat of chats) {
    pipeline.del(chat)
    pipeline.zrem(`user:chat:${session.user.id}`, chat)
  }

  await pipeline.exec()

  revalidatePath('/')
  return redirect('/')
}

export async function getSharedChat(id: string) {
  const chat = await kv.hgetall<Chat>(`chat:${id}`)

  if (!chat || !chat.sharePath) {
    return null
  }

  return chat
}

export async function shareChat(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const chat = await kv.hgetall<Chat>(`chat:${id}`)

  if (!chat || chat.userId !== session.user.id) {
    return {
      error: 'Something went wrong'
    }
  }

  const payload = {
    ...chat,
    sharePath: `/share/${chat.id}`
  }

  await kv.hmset(`chat:${chat.id}`, payload)

  return payload
}