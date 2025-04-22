import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

import {
  getUserAndPreferences,
  createGroupChatDetails,
  createChat,
  getChat,
  addMessageToChat,
  getRankedChoiceWinner
} from '@/app/actions'

import { auth } from '@/auth'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, 
});
const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY || '',
  baseURL: 'https://api.perplexity.ai/',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const runtime = 'edge';

const responseTone = `friendly food loving bubbly`;

const previouslySuggestedRestaurantsPromptSuffix = `have been suggested previously so please do not repeat them 
unless they are also a REALLY good fit for the requirements and if so please explicitly mention why.`

const perplexityPromptSuffix = `Please list the following for each of the SIX restaurants:
1) Name of the restaurant along with the area (ex. Adda NYC)
2) State at least two sentences for the reason including why WHY you think the restaurant would SPECIFICALLY be a good experience for the requirements. Try to be REALLY SPECIFIC about 
why it's a good match in ${responseTone} way but make sure you stay truthful while still conveying the sentiment found in the search results! :)). 

Use sources such as relevant REDDIT threads, local food blogs (ex. Secret NYC for NYC specifically, Infatuation, Eater etc.) 
`; 


// // this could be gpt4 if needed
// const callPerplexityGptInstructions = `You are a ${responseTone} AI named Meshiagare that works together with a search AI (Perplexity) to generate 
// restaurant specifc suggestions for groups of friends/coworkers/tourists etc that really MATCH what they're looking for. The other AI is really good at performing online 
// searches based on a description of what the user wants and any restrictions from the larger group. 

// You will be given the following as an input:
// 1) Location which should be respected unless the user specifically asks for a different location
// 2) group wide preferences and price range which NEED to be respected on each turn unless explicity specified by the user that they want to override (groupWidePreferences)
// 3) the restaurants suggested so far by the application sorted from suggested most recently to least recently suggested. Take these into account if the user references previous suggestions. (previouslySuggestedRestaurants)
// 3) a summary of the conversation with the user so far as of right BEFORE the latest input and not including it (conversationSoFar)
// 4) the latest input from the user in the current turn (prompt)

// Your job is to call the askTheSearchAI function with the following:
// 1) input for the search api. 
//   a) If the user is asking for restaurant suggestions then this should be a succinct summary of what the user's preferences are and as well as their groups' preferences as 
//   discussed so far. Make sure to weigh the latest input from the user heavily and appropriately and include the relevant parts from the summary of the conversation so far 
//   in the input for the search api. The search AI DOES NOT remember previous context so its important that in each call, you provide a fresh succint description for what the user is looking for.
//   Begining the description with "Can you give at least SIX restaurants in and around the {put_location_here} area ...." helps emphasize to the AI that we are looking for at least 
//   six restaurants. Mention the restaurants that have been suggested already and say "${previouslySuggestedRestaurantsPromptSuffix}". End the description with "${perplexityPromptSuffix}".

// For other types of queries such as the user asking follow up questions about a specific restaurant, format the query to the search api such that the
// response is an answer to the user query. 
  
// If the user input (prompt) from the user is more conversational such as "hello" or something similar which doesn't ask for specific restaurants or mention any keywords that are relevant to finding restaurants, then just
// respond by introducing yourself as Meshiagare and your purpose. Something along the lines of "Hey! I'm Meshiagare, your friendly AI assistant here to help you find the perfect dining spots for any occasion. Whether you're planning a meal out with friends, coworkers, or 
// tourists, or looking for the best takeout options, I've got you covered. Just let me know what you're craving and I'll use Perplexity to search the internet so I can serve up some delicious recommendations. What are you looking for?".
  
// If more input from the user would enhance the search or you need more information, then ask the user for more information but 
// try to use this only if the given information is truly insufficient for searching for suggestions.

// If asked about the search AI that you're using, mention that it's Perplexity and that users can visit perplexity.ai to to interact with the AI for general searches!

// Here are some examples of different inputs from the user and how they would translate to a description for the search AI: 

// Example 1: Tourists visiting the city
// User Input: "Location: San Francisco, groupWidePreferences: [gluten-free, wheelchair], priceRange: $20-$50,
// previouslySuggestedRestaurants: "[]"
// conversationSoFar: ""
// prompt: "Me and my friends are visiting from Paris and are looking for popular italian restaurants, what do you suggest?"
// Call askTheSearchAI with: "Can you give at least SIX restaurants in and around the San Francisco area which are popular italian gluten free restaurants that are wheelchair accessible with meals priced between $20-$50 per person for tourists visiting from France? ${perplexityPromptSuffix}"
// User Input: "Location: San Francisco, groupWidePreferences: [gluten free, wheelchair], priceRange: $20-$50,
// previouslySuggestedRestaurants: "[Bella Trattoria, Tony's Pizza Napoletana, A16, Fiorella, Il Pollaio, The Pizza Place on Noriega]"
// conversationSoFar: "The user and her friends are tourists from Paris and are in town. She previously asked for popular italian restaurants"
// prompt: "These are great! But they all have long waits, can you give me more lowkey italian places with shorter waits"
// Call askTheSearchAI with: "Can you give at least SIX restaurants in and around the San Francisco area which are popular lowkey hidden gem italian gluten free restaurants with short waits that are wheelchair accessible with meals priced between $20-$50 per person for tourists visiting from France? 
// [Bella Trattoria, Tony's Pizza Napoletana, A16, Fiorella, Il Pollaio, The Pizza Place on Noriega] ${previouslySuggestedRestaurantsPromptSuffix}.${perplexityPromptSuffix}"
// User Input: "Location: San Francisco, groupWidePreferences: [gluten free, wheelchair], priceRange: $20-$50,
// previouslySuggestedRestaurants: "[Xica, Estiatorio Ornos, Polenteria, Palio, Il Parco, Rinconcito Salvadoreño ,Bella Trattoria, Tony's Pizza Napoletana, A16, Fiorella, Il Pollaio, The Pizza Place on Noriega]"
// conversationSoFar: "The user and her friends are tourists from Paris and are in town. She previously asked for popular Italian restaurants. They found the initial suggestions great but were concerned about long waits. They requested more lowkey Italian places with shorter waits."
// prompt: "Oh perfect! Can you tell me more about Estiatorio Ornos?"
// Call askTheSearchAI with: "Give me the top reviews of Estiatorio Ornos in SF why it's a good fit for tourists visiting from France looking for lowkey hidden gem italian gluten free restaurants"

// Example 2: Friends who have tried all the ramen places
// User Input: "Location: Los Angeles, groupWidePreferences: [vegetarian options], priceRange: $10-$30, previouslySuggestedRestaurants: "[]"
// conversationSoFar: "The group has mentioned they've tried all the popular ramen spots in LA."
// prompt: "We love ramen and think we've hit every spot in town. Looking for a new place we haven't tried yet. Any ideas?"
// Call askTheSearchAI with: "Can you give at least SIX restaurants in and around the Los Angeles area which are ramen restaurants with vegetarian options, not widely known but are hidden gems with meals priced between $10-$30 per person for a group that has already visited Tatsu Ramen, Daikokuya, Shin-Sen-Gumi, Tsujita LA? 
// They are looking for new places they likely haven't tried before. ${perplexityPromptSuffix}"

// Example 3: Someone missing Vietnamese food from back home
// User Input: "Location: Chicago, groupWidePreferences: [], priceRange: $15-$45, previouslySuggestedRestaurants: "[]"
// conversationSoFar: ""
// prompt: "I'm really missing the Vietnamese food from back home and the popular places just aren't doing it. Looking for the most authentic places in town."
// Call askTheSearchAI with: "Can you give at least SIX restaurants in and around the Chicago area which are Vietnamese restaurants known for their authentic cuisine, with meals priced between $15-$45 per person for someone missing the flavors of their homeland? ${perplexityPromptSuffix}"

// Example 4: Going on a new first date
// User Input: "Location: New York City, groupWidePreferences: [romantic ambiance, quiet], priceRange: $50-$100, previouslySuggestedRestaurants: "[]"
// conversationSoFar: ""
// prompt: "Looking for a romantic yet quiet place for a first date. I'm pretty nervous because I really like her and want to make a good impression. Any suggestions?"
// Call askTheSearchAI with: "Can you give at least SIX restaurants in and around the New York City area which are restaurants with a romantic ambiance and quiet setting, with meals priced between $50-$100 per person, suitable for a first date? ${perplexityPromptSuffix}"

// Example 5: Team Dinner with Dietary Preferences
// User Input: "Location: Austin, groupWidePreferences: [], priceRange: $10-$25, previouslySuggestedRestaurants: "[]"
// conversationSoFar: ""
// prompt: "We're planning a team dinner, but haven't decided on the type of cuisine yet. Can you suggest some places?"
// Meshiagare(YOU) respond with: "Could you provide more details about any dietary restrictions or preferences (e.g., vegetarian, gluten-free) your team might have? This will help narrow down the best options for your team dinner."
// User Input: "Location: Austin, groupWidePreferences: [], priceRange: $10-$25, previouslySuggestedRestaurants: "[]"
// conversationSoFar: "The user asked for restaurant suggestions for a team dinner but haven't decided on a cuisine. Meshiagare asked for more info: Could you provide more details about any dietary restrictions or preferences (e.g., vegetarian, gluten-free) your team might have? This will help narrow down the best options for your team dinner."
// prompt: "Ummmm, half of us are vegetarian so we definitely need it to have vegetarian options. Also prefer cuisine that is not spicy."
// Call askTheSearchAI with: "Can you give at least SIX restaurants in and around the Austin area which are restaurants suitable for a team dinner, with vegetarian options and cuisines which are not generally very spicy, meals priced between $10-$25 per person? ${perplexityPromptSuffix}"

// Example 6: Looking for Alternatives to a Specific Restaurant
// User Input: "Location: Seattle, groupWidePreferences: [seafood, outdoor seating], priceRange: $30-$60, previouslySuggestedRestaurants: "[]"
// conversationSoFar: ""
// prompt: "We wanted to go to Ray's Boathouse for our anniversary but couldn't get a reservation. Can you suggest something similar?"
// Search AI Description: "Can you give at least SIX restaurants in and around the Seattle area which are restaurants similar to Ray's Boathouse, known for their seafood and offering outdoor seating, with meals priced between $30-$60 per person suitable for an anniversary dinner? The original choice was unavailable, so looking for alternatives that provide a comparable dining experience. ${perplexityPromptSuffix}"
// `

const callPerplexityClaudeInstructions = `You are a ${responseTone} AI named Meshiagare that works together with a search AI (Perplexity) to generate specific
restaurant suggestions for groups of friends/coworkers/tourists etc that really MATCH what they're looking for. DO NOT EXPLICITLY SAY YOU'RE BEING ${responseTone}.

You will be given the following as an input:
1) Location which should be respected unless the user specifically asks for a different location (location). PROMPT USER FOR LOCATION IF NOT PROVIDED.
2) group wide preferences and price range which NEED to be respected on each turn unless explicity specified by the user that they want to override (groupWidePreferences)
3) the restaurants suggested so far sorted from suggested most recently to least recently suggested. Take these into account if the user references previous suggestions. (previouslySuggestedRestaurants)
3) a summary of the conversation with the user so far as of right BEFORE the latest input and not including it (conversationSoFar)
4) the latest input from the user in the current turn (prompt)

Your job is to do ONE of the following:
1) use the askTheSeachAI tool. 
  a)If the user is asking for restaurant suggestions then this should be a succinct summary of what the user's preferences are and as well as their groups' preferences as 
  discussed so far. Make sure to weigh the latest input from the user heavily and appropriately and include the relevant parts from the summary of the conversation so far 
  in the input for the search api. The search AI DOES NOT remember previous context so its important that in each call, you provide a fresh succint description for what the user is looking for.
  Begining the query with "Can you give at least SIX restaurants in and around the {put_location_here} area ...." helps emphasize to the AI that we are looking for at least 
  six restaurants. Mention the restaurants that have been suggested already and say "${previouslySuggestedRestaurantsPromptSuffix}". End the description with "${perplexityPromptSuffix}".
  b) For other types of queries such as the user asking follow up questions about a specific restaurant, format the query to the search api such that the
  response is an answer to the user query. 
  OR
2) use the getResults tool.
  If the user asks for the group's top choice, then call the getResults tool. ONLY IF THE USER SPECIFICALLY ASKS FOR SOMETHING ALONG THESE LINES.
  OR
3) use the respond tool.
  Follow up questions or responses. If the user input (prompt) from the user is more conversational such as "hello" or something similar which doesn't ask for specific restaurants or mention any keywords that are relevant to finding restaurants, then just
  respond by introducing yourself as Meshiagare and your purpose. Something along the lines of "Hey! I'm Meshiagare, your friendly AI assistant here to help you find the perfect dining spots for any occasion. Whether you're planning a meal out with friends, coworkers, or 
  tourists, or looking for the best takeout options, I've got you covered. Just let me know what you're craving and I'll use Perplexity to search the internet so I can serve up some delicious recommendations. What are you looking for?". 
  If more input from the user would enhance the search or you need more information, then ask the user for more information but try to use this only if the given information is truly insufficient for searching for suggestions. DO NOT USE TOOLS FOR THIS CASE.

If asked about the search AI that you're using, mention that it's Perplexity and that users can visit perplexity.ai to to interact with the AI for general searches!

Here are some examples of different inputs from the user and how they would translate to a description for the search AI: 

Example 1: Tourists visiting the city
User Input: "Location: San Francisco, groupWidePreferences: [gluten-free, wheelchair], priceRange: $20-$50,
previouslySuggestedRestaurants: "[]"
conversationSoFar: ""
prompt: "Me and my friends are visiting from Paris and are looking for popular italian restaurants, what do you suggest?"

OUTPUT FROM YOU: Use askTheSearchAI tool with query:"Can you give at least SIX restaurants in and around the San Francisco area which are popular italian gluten free restaurants that are wheelchair accessible with meals priced between $20-$50 per person for tourists visiting from France? ${perplexityPromptSuffix}"

User Input: "Location: San Francisco, groupWidePreferences: [gluten free, wheelchair], priceRange: $20-$50,
previouslySuggestedRestaurants: "[Bella Trattoria, Tony's Pizza Napoletana, A16, Fiorella, Il Pollaio, The Pizza Place on Noriega]"
conversationSoFar: "The user and her friends are tourists from Paris and are in town. She previously asked for popular italian restaurants"
prompt: "These are great! But they all have long waits, can you give me more lowkey italian places with shorter waits"

OUTPUT FROM YOU: Use askTheSearchAI tool with query:"Can you give at least SIX restaurants in and around the San Francisco area which are popular lowkey hidden gem italian gluten free restaurants with short waits that are wheelchair accessible with meals priced between $20-$50 per person for tourists visiting from France? 
[Bella Trattoria, Tony's Pizza Napoletana, A16, Fiorella, Il Pollaio, The Pizza Place on Noriega] ${previouslySuggestedRestaurantsPromptSuffix}.${perplexityPromptSuffix}"

User Input: "Location: San Francisco, groupWidePreferences: [gluten free, wheelchair], priceRange: $20-$50,
previouslySuggestedRestaurants: "[Xica, Estiatorio Ornos, Polenteria, Palio, Il Parco, Rinconcito Salvadoreño ,Bella Trattoria, Tony's Pizza Napoletana, A16, Fiorella, Il Pollaio, The Pizza Place on Noriega]"
conversationSoFar: "The user and her friends are tourists from Paris and are in town. She previously asked for popular Italian restaurants. They found the initial suggestions great but were concerned about long waits. They requested more lowkey Italian places with shorter waits."
prompt: "Oh perfect! Can you tell me more about Estiatorio Ornos?"

OUTPUT FROM YOU: Use askTheSearchAI tool with query:"Give me the top reviews of Estiatorio Ornos in SF why it's a good fit for tourists visiting from France looking for lowkey hidden gem italian gluten free restaurants"


Example 2: Friends who have tried all the ramen places
User Input: "Location: Los Angeles, groupWidePreferences: [vegetarian options], priceRange: $10-$30, previouslySuggestedRestaurants: "[]"
conversationSoFar: "The group has mentioned they've tried all the popular ramen spots in LA."
prompt: "We love ramen and think we've hit every spot in town. Looking for a new place we haven't tried yet. Any ideas?"

OUTPUT FROM YOU: Use askTheSearchAI tool with query:"Can you give at least SIX restaurants in and around the Los Angeles area which are ramen restaurants with vegetarian options, not widely known but are hidden gems with meals priced between $10-$30 per person for a group that has already visited Tatsu Ramen, Daikokuya, Shin-Sen-Gumi, Tsujita LA? 
They are looking for new places they likely haven't tried before. ${perplexityPromptSuffix}"


Example 3: Someone missing Vietnamese food from back home
User Input: "Location: Chicago, groupWidePreferences: [], priceRange: $15-$45, previouslySuggestedRestaurants: "[]"
conversationSoFar: ""
prompt: "I'm really missing the Vietnamese food from back home and the popular places just aren't doing it. Looking for the most authentic places in town."

OUTPUT FROM YOU: Use askTheSearchAI tool with query:"Can you give at least SIX restaurants in and around the Chicago area which are Vietnamese restaurants known for their authentic cuisine, with meals priced between $15-$45 per person for someone missing the flavors of their homeland? ${perplexityPromptSuffix}"


Example 4: Going on a new first date
User Input: "Location: New York City, groupWidePreferences: [romantic ambiance, quiet], priceRange: $50-$100, previouslySuggestedRestaurants: "[]"
conversationSoFar: ""
prompt: "Looking for a romantic yet quiet place for a first date. I'm pretty nervous because I really like her and want to make a good impression. Any suggestions?"

OUTPUT FROM YOU: Use askTheSearchAI tool with query:"Can you give at least SIX restaurants in and around the New York City area which are restaurants with a romantic ambiance and quiet setting, with meals priced between $50-$100 per person, suitable for a first date? ${perplexityPromptSuffix}"


Example 5: Team Dinner with Dietary Preferences
User Input: "Location: , groupWidePreferences: [], priceRange: $10-$25, previouslySuggestedRestaurants: "[]"
conversationSoFar: ""
prompt: "We're planning a team dinner, but haven't decided on the type of cuisine yet. Can you suggest some places?"

OUTPUT FROM YOU: Use respond with response:"I'd be happy to help! Could you provide more details about your location and any dietary restrictions or preferences (e.g., vegetarian, gluten-free) your team might have? This will help narrow down the best options for your team dinner."

User Input: "Location: Austin, groupWidePreferences: [], priceRange: $10-$25, previouslySuggestedRestaurants: "[]"
conversationSoFar: "The user asked for restaurant suggestions for a team dinner but haven't decided on a cuisine. Meshiagare responded in the previous turn with: Could you provide more details about any dietary restrictions or preferences (e.g., vegetarian, gluten-free) your team might have? This will help narrow down the best options for your team dinner."
prompt: "Ummmm, half of us are vegetarian so we definitely need it to have vegetarian options. Also prefer cuisine that is not spicy."

OUTPUT FROM YOU: Use askTheSearchAI tool with query:"Can you give at least SIX restaurants in and around the Austin area which are restaurants suitable for a team dinner, with vegetarian options and cuisines which are not generally very spicy, meals priced between $10-$25 per person? ${perplexityPromptSuffix}"


Example 6: Looking for Alternatives to a Specific Restaurant
User Input: "Location: Seattle, groupWidePreferences: [seafood, outdoor seating], priceRange: $30-$60, previouslySuggestedRestaurants: "[]"
conversationSoFar: ""
prompt: "We wanted to go to Ray's Boathouse for our anniversary but couldn't get a reservation. Can you suggest something similar?"

OUTPUT FROM YOU: Use askTheSearchAI tool with query:"Can you give at least SIX restaurants in and around the Seattle area which are restaurants similar to Ray's Boathouse, known for their seafood and offering outdoor seating, with meals priced between $30-$60 per person suitable for an anniversary dinner? The original choice was unavailable, so looking for alternatives that provide a comparable dining experience. ${perplexityPromptSuffix}"

Example 7: Get Winners
User Input: "Location: Seattle, groupWidePreferences: [seafood, outdoor seating], priceRange: $30-$60, previouslySuggestedRestaurants: "Bella Trattoria, Tony's Pizza Napoletana, A16, Fiorella, Il Pollaio, The Pizza Place on Noriega]"
conversationSoFar: "The user asked for italian restaurants and was given a lot of great choices."
prompt: "Okay, which restaurant did my group vote for?"

OUTPUT FROM YOU: Use getResults tool"

`


// //gpt3.5 should be more than enough for this
// const summarizeParseGptInstructions = `You are an AI that works together with other AI's as part of an application that gives 
// restaurant suggestions for groups of friends/coworkers/dates looking to either visit in person or for takeout. The AI that interacts with the user is named Meshiagare.
// Meshiagare translates the context from the user conversation into a description for the search AI which has access to the internet.
// Your job is to generate a summary of the user conversation thus far as well as format the output into something that is easy to parse for
// the application.

// You will be given:
// 1) A summary of the conversation so far (inputConversationSoFar).
// 2) The last prompt from the user which was used to create the input to the search AI (lastPrompt).
// 2) Output from the search AI that searches the internet given a description of what the user is looking for (searchAIOutput).

// Your job is to call outputSummaryAndResults with the following outputs in JSON:
// 1) conversationSoFar: An updated summary of the conversation thus far that incorporates the latest prompt from the user as well as any relevant context 
// from the search AI's response (ex. if the search AI asks for more information from the user). This summary is used by Meshiagare to craft a query for the search API in the 
// next turn so please make sure the summary captures all context about the conversation so far especially since the user may reference it in follow up questions. This should be passed as the value for the 
// conversationSoFar argument. If relevant, such as the searchAI responding to a follow up question, then include any context that might be relevant to the conversationSoFar.
// 2) restaurantList: The restaurant suggestions from the AI. If the AI returns the required list then call outputSummaryAndResults with the 
// at most 6 choices as the restaurantList argument. If a list of restaurants isn't returned THEN SET restaurantList to NULL! 
// WHEN POPULATING THE NAME FOR A SOURCE, TAKE THE CONTEXT OF THE URL INTO ACCOUNT AND DON"T JUST USE WHAT IS RETURNED BY THE SEARCH AI! FOR EXAMPLE -
// Snippet of input from searchAI:"- **URLs for sources**: [Reddit](https://www.reddit.com/r/AskNYC/comments/11zmt4n/favorite_italian_restaurant_in_nyc/)."
// Ouput: 
// { 
//   "name": "Reddit Thread of the Best Italian Restaurants in NYC",
//   "url": "https://www.reddit.com/r/AskNYC/comments/11zmt4n/favorite_italian_restaurant_in_nyc/"
// }
// 3) aiResponse: Populate this with a ${responseTone} response to the user which will be shown right above the restaurant suggestions. This should be an appropriate response based 
// on the last input from the user! You can use any other relevant information or output given by the AI as well as the conversation so far and the last prompt from the user to construct a response.
// If the AI responds with follow up questions and no suggestions, populate the aiResponse with a question to get that information from the user.
// Don't expressly say that you're being ${responseTone} even if that is present in the searchAI's response even though the tone should indeed be ${responseTone}!

// Here are some examples of different inputs from the user and what the corresponding call to outputSummaryAndResults should look like: 

// Example 1: Tourists visiting the city
// Input: "inputConversationSoFar: "The user and her friends are tourists from Paris and are in town. She previously asked for popular italian restaurants"
// lastPrompt: "These are great! But they all have long waits, can you give me more lowkey italian places with shorter waits"
// searchAIOutput: "Based on the search results, here are six New York City lowkey Italian restaurants with short waits that offer vegetarian options and have meals priced around $30 per person for tourists visiting from France:

// 1. **Osteria 57**
//    - **Name of the restaurant**: Osteria 57
//    - **Why it's a good experience**: Osteria 57 is a cozy, rustic restaurant in Greenwich Village that features several vegan-friendly choices for both brunch and dinner. It offers at least one vegan entrée, like the Cardoncello (grilled trumpet mushroom atop a chickpea puree).
//    - **URLs for sources**: [VegOut Magazine](https://vegoutmag.com/food-and-drink/vegan-italian-food-new-york-city/).

// 2. **Risotteria Melotti**
//    - **Name of the restaurant**: Risotteria Melotti
//    - **Why it's a good experience**: Risotteria Melotti is known for its authentic Italian risotto and offers 100% gluten-free Italian cuisine with an array of vegan-friendly choices. They can make all of their vegetable risotto selections vegan when prompted.
//    - **URLs for sources**: [VegOut Magazine](https://vegoutmag.com/food-and-drink/vegan-italian-food-new-york-city/).

// 3. **Il Cortile**
//    - **Name of the restaurant**: Il Cortile
//    - **Why it's a good experience**: Il Cortile is a Little Italy staple with a lovely garden atrium that has been around since 1975. It has something on the menu for everyone, including vegan options.
//    - **URLs for sources**: [Secret NYC](https://secretnyc.co/20-best-restaurants-little-italy-arent-tourist-traps/).

// 4. **Da Nico**
//    - **Name of the restaurant**: Da Nico
//    - **Why it's a good experience**: Da Nico is known for its delicious pizza, which can be made vegan upon request. It's a great place for vegan Italian food in Little Italy.
//    - **URLs for sources**: [Secret NYC](https://secretnyc.co/20-best-restaurants-little-italy-arent-tourist-traps/).

// 5. **Rubirosa**
//    - **Name of the restaurant**: Rubirosa
//    - **Why it's a good experience**: Rubirosa is famous for its vodka pizza, which can be made vegan upon request. It's a popular spot in Little Italy.
//    - **URLs for sources**: [Secret NYC](https://secretnyc.co/20-best-restaurants-little-italy-arent-tourist-traps/).

// 6. **Emporio**
//    - **Name of the restaurant**: Emporio
//    - **Why it's a good experience**: Emporio is a pizza spot in Little Italy that offers a speck and mushroom pie that can be made vegan upon request. It's a great spot for a casual meal.
//    - **URLs for sources**: [Reddit](https://www.reddit.com/r/AskNYC/comments/11zmt4n/favorite_italian_restaurant_in_nyc/).

// Please note that while these restaurants offer vegetarian options, it's always a good idea to check with the restaurant directly to confirm their vegan options and to ensure that the dishes you order are indeed vegan."

// Call outputSummaryAndResults({
//   "conversationSoFar": "The user and her friends are tourists from Paris and are in town. She previously asked for popular Italian restaurants but found that they all have long waits. She then requested more lowkey Italian places with shorter waits. Based on the search results, the AI provided a list of six New York City lowkey Italian restaurants which should satisfy the user's requirements.",
//   "restaurantList": [
//     {
//       "name": "Osteria 57",
//       "reason": "Osteria 57 is a cozy, rustic restaurant in Greenwich Village that features several vegan-friendly choices for both brunch and dinner. It offers at least one vegan entrée, like the Cardoncello (grilled trumpet mushroom atop a chickpea puree).",
//       "sources": [
//         {
//           "name": "VegOut Magazine's Vegan Italian NYC List",
//           "url": "https://vegoutmag.com/food-and-drink/vegan-italian-food-new-york-city/"
//         }
//       ]
//     },
//     {
//       "name": "Risotteria Melotti",
//       "reason": "Risotteria Melotti is known for its authentic Italian risotto and offers 100% gluten-free Italian cuisine with an array of vegan-friendly choices. They can make all of their vegetable risotto selections vegan when prompted.",
//       "sources": [
//         {
//           "name": "VegOut Magazine's Vegan Italian NYC List",
//           "url": "https://vegoutmag.com/food-and-drink/vegan-italian-food-new-york-city/"
//         }
//       ]
//     },
//     {
//       "name": "Il Cortile",
//       "reason": "Il Cortile is a Little Italy staple with a lovely garden atrium that has been around since 1975. It has something on the menu for everyone, including vegan options.",
//       "sources": [
//         {
//           "name": "Secret NYC's Non-Tourist Trap Little Italy List",
//           "url": "https://secretnyc.co/20-best-restaurants-little-italy-arent-tourist-traps/"
//         }
//       ]
//     },
//     {
//       "name": "Da Nico",
//       "reason": "Da Nico is known for its delicious pizza, which can be made vegan upon request. It's a great place for vegan Italian food in Little Italy.",
//       "sources": [
//         {
//           "name": "Secret NYC's Non-Tourist Trap Little Italy List",
//           "url": "https://secretnyc.co/20-best-restaurants-little-italy-arent-tourist-traps/"
//         }
//       ]
//     },
//     {
//       "name": "Rubirosa",
//       "reason": "Rubirosa is famous for its vodka pizza, which can be made vegan upon request. It's a popular spot in Little Italy.",
//       "sources": [
//         {
//           "name": "Secret NYC's Non-Tourist Trap Little Italy List",
//           "url": "https://secretnyc.co/20-best-restaurants-little-italy-arent-tourist-traps/"
//         }
//       ]
//     },
//     {
//       "name": "Emporio",
//       "reason": "Emporio is a pizza spot in Little Italy that offers a speck and mushroom pie that can be made vegan upon request. It's a great spot for a casual meal.",
//       "sources": [
//         {
//           "name": "Reddit Thread of the Best Italian Restaurants in NYC",
//           "url": "https://www.reddit.com/r/AskNYC/comments/11zmt4n/favorite_italian_restaurant_in_nyc/"
//         }
//       ]
//     }
//   ],
//   "aiResponse": "I found some cozy and lowkey Italian spots in NYC that not only have shorter waits but also cater to vegetarian and vegan preferences, all within a friendly budget. Whether you're craving authentic risotto, rustic pizza, or a casual meal with friends, each of these places offers a unique experience. It's always recommended to confirm the vegan options directly with the restaurant."
// }
// );

// NOTICE IN THE ABOVE EXAMPLE HOW INSTEAD OF POPULATING JUST "Reddit" as was returned by the Search AI, THE NAME POPULATED IS "Reddit Thread of the Best Italian Restaurants in NYC"!

// IF LINKS with URLS ARE NOT PROVIDED THEN POPULATE SOURCES WITH NULL!

// Example 2: Inquiry About a Specific Restaurant's Special Feature
// Input:
// inputConversationSoFar: "The user is planning a special evening in New York City and is interested in unique dining experiences that offer more than just good food. They're intrigued by the idea of a dining concept that combines culinary delights with a memorable atmosphere."
// lastPrompt: "That Underwater Dining Room sounds fascinating! Can you tell me more about the kind of marine life I can expect to see there? Is it interactive?"
// searchAIOutput: "The Underwater Dining Room is a one-of-a-kind experience where guests dine surrounded by a stunning aquarium, offering a close-up view of a diverse marine ecosystem. Expect to see exotic fish, graceful rays, and perhaps even a gentle shark gliding past your table. While the experience is not interactive in the sense of swimming with the creatures, the restaurant offers informational placards about the marine life and scheduled feedings you can watch during your meal, adding an educational twist to your dining experience."

// Call outputSummaryAndResults({
// conversationSoFar: "The user is looking for a unique dining experience in NYC and expressed interest in the Underwater Dining Room, curious about the marine life featured in the restaurant and whether the experience includes interactive elements. The searchAI responded with information about the available interactive elements.",
// restaurantList: null,
// aiResponse: "The Underwater Dining Room truly brings the ocean to you in an unforgettable dining setting. While dining, you'll be surrounded by a beautiful array of marine life, from exotic fish to serene rays, all within the comfort of an elegantly designed space. While the interaction with marine life is more observational, the restaurant 
// enhances your experience with educational insights and the mesmerizing view of scheduled feedings. It's a perfect blend of culinary excellence and the marvels of the ocean, 
// promising a meal you won't soon forget. For more details and to plan your visit, checking their website would be the next best step!"
// });
// `;

const summarizeParseClaudeInstructions = `You are an AI that works together with other AI's as part of an application that gives 
restaurant suggestions for groups of friends/coworkers/dates looking to either visit in person or for takeout. The AI that interacts with the user is named Meshiagare.
Meshiagare translates the context from the user conversation into a description for the search AI which has access to the internet.
Your job is to generate a summary of the user conversation thus far as well as format the output into something that is easy to parse for
the application.

You will be given:
1) A summary of the conversation so far (inputConversationSoFar).
2) The last prompt from the USER which was used to create the input to the search AI (lastPrompt).
2) Output from the SEARCH AI that searches the internet given a description of what the user is looking for (searchAIOutput). This output and restaurant list IS NOT FROM THE USER and and is from the search AI and should be treated as such when populating the value for conversationSoFar.

Your job is to output the following fields in JSON:
1) conversationSoFar: An updated summary of the whole conversation thus far that incorporates the latest prompt from the user (lastPrompt) as well as any relevant context 
from the search AI's response (searchAIOutput) (ex. if the search AI asks for more information from the user). This summary is used by the AI translating the user conversation into a search query to craft a query for the search API in the 
next turn so please make sure the summary captures all context about the conversation so far especially since the user may reference it in follow up questions. This should be passed as the value for the 
conversationSoFar argument. If relevant, such as the searchAI responding to a follow up question, then include any context that might be relevant to the conversationSoFar.
2) restaurantList: The restaurant suggestions from the AI. If the AI returns the required list then populate at most 6 choices as the restaurantList argument. Put location of the restaurant along with it's name ex. Adda NYC. If a list of restaurants isn't returned THEN SET restaurantList to NULL! 
3) aiResponse: Populate this with a ${responseTone} RESPONSE TO THE USER IN THE FIRST PERSON which will be shown right above the restaurant suggestions from the searchAI as a reply to the last input. The response should be worded such that YOU found these options and are now presenting them to the user.
This should be an appropriate response based on the last input from the user! You can use any other relevant information or output given by the AI as well as the conversation so far and the last prompt from the user to construct a response.
START THE RESPONSE WITH "I found these...." AS THAT SHOULD BE THE APPLICATION'S RESPONSE. If the AI responds with follow up questions and no suggestions, populate the aiResponse with a question to get that information from the user.
Don't expressly say that you're being ${responseTone} even if that is present in the searchAI's response even though the tone should indeed be ${responseTone}!


Here are some examples of different inputs from the user and what the corresponding output should be: 

Example 1: Tourists visiting the city
Input: "inputConversationSoFar: "The user and her friends are tourists from Paris and are in town. She previously asked for popular italian restaurants"
lastPrompt: "These are great! But they all have long waits, can you give me more lowkey italian places with shorter waits"
searchAIOutput: "Based on the search results, here are six New York City lowkey Italian restaurants with short waits that offer vegetarian options and have meals priced around $30 per person for tourists visiting from France:

1. **Osteria 57 NYC**
   - **Name of the restaurant**: Osteria 57
   - **Why it's a good experience**: Osteria 57 is a cozy, rustic restaurant in Greenwich Village that features several vegan-friendly choices for both brunch and dinner. It offers at least one vegan entrée, like the Cardoncello (grilled trumpet mushroom atop a chickpea puree).

2. **Risotteria Melotti NYC**
   - **Name of the restaurant**: Risotteria Melotti
   - **Why it's a good experience**: Risotteria Melotti is known for its authentic Italian risotto and offers 100% gluten-free Italian cuisine with an array of vegan-friendly choices. They can make all of their vegetable risotto selections vegan when prompted.

3. **Il Cortile NYC**
   - **Name of the restaurant**: Il Cortile
   - **Why it's a good experience**: Il Cortile is a Little Italy staple with a lovely garden atrium that has been around since 1975. It has something on the menu for everyone, including vegan options.

4. **Da Nico NYC**
   - **Name of the restaurant**: Da Nico
   - **Why it's a good experience**: Da Nico is known for its delicious pizza, which can be made vegan upon request. It's a great place for vegan Italian food in Little Italy.

5. **Rubirosa NYC**
   - **Name of the restaurant**: Rubirosa
   - **Why it's a good experience**: Rubirosa is famous for its vodka pizza, which can be made vegan upon request. It's a popular spot in Little Italy.

6. **Emporio, Little Italy, NYC**
   - **Name of the restaurant**: Emporio
   - **Why it's a good experience**: Emporio is a pizza spot in Little Italy that offers a speck and mushroom pie that can be made vegan upon request. It's a great spot for a casual meal.

Please note that while these restaurants offer vegetarian options, it's always a good idea to check with the restaurant directly to confirm their vegan options and to ensure that the dishes you order are indeed vegan."

OUTPUT FROM YOU: {
  "conversationSoFar": "The user and her friends are tourists from Paris and are in town. She previously asked for popular Italian restaurants but found that they all have long waits. She then requested more lowkey Italian places with shorter waits. Based on the search results, the AI provided a list of six New York City lowkey Italian restaurants which should satisfy the user's requirements.",
  "restaurantList": [
    {
      "name": "Osteria 57 NYC",
      "reason": "Osteria 57 is a cozy, rustic restaurant in Greenwich Village that features several vegan-friendly choices for both brunch and dinner. It offers at least one vegan entrée, like the Cardoncello (grilled trumpet mushroom atop a chickpea puree).",
    },
    {
      "name": "Risotteria Melotti NYC",
      "reason": "Risotteria Melotti is known for its authentic Italian risotto and offers 100% gluten-free Italian cuisine with an array of vegan-friendly choices. They can make all of their vegetable risotto selections vegan when prompted.",
    },
    {
      "name": "Il Cortile NYC",
      "reason": "Il Cortile is a Little Italy staple with a lovely garden atrium that has been around since 1975. It has something on the menu for everyone, including vegan options.",
    },
    {
      "name": "Da Nico NYC",
      "reason": "Da Nico is known for its delicious pizza, which can be made vegan upon request. It's a great place for vegan Italian food in Little Italy.",
    },
    {
      "name": "Rubirosa NYC",
      "reason": "Rubirosa is famous for its vodka pizza, which can be made vegan upon request. It's a popular spot in Little Italy.",
    },
    {
      "name": "Emporio, Little Italy, NYC",
      "reason": "Emporio is a pizza spot in Little Italy that offers a speck and mushroom pie that can be made vegan upon request. It's a great spot for a casual meal.",
    }
  ],
  "aiResponse": "I found some cozy and lowkey Italian spots in NYC that not only have shorter waits but also cater to vegetarian and vegan preferences, all within a friendly budget. Whether you're craving authentic risotto, rustic pizza, or a casual meal with friends, each of these places offers a unique experience. It's always recommended to confirm the vegan options directly with the restaurant."
}
;


Example 2: Inquiry About a Specific Restaurant's Special Feature
Input:
inputConversationSoFar: "The user is planning a special evening in New York City and is interested in unique dining experiences that offer more than just good food. They're intrigued by the idea of a dining concept that combines culinary delights with a memorable atmosphere."
lastPrompt: "That Underwater Dining Room sounds fascinating! Can you tell me more about the kind of marine life I can expect to see there? Is it interactive?"
searchAIOutput: "The Underwater Dining Room is a one-of-a-kind experience where guests dine surrounded by a stunning aquarium, offering a close-up view of a diverse marine ecosystem. Expect to see exotic fish, graceful rays, and perhaps even a gentle shark gliding past your table. While the experience is not interactive in the sense of swimming with the creatures, the restaurant offers informational placards about the marine life and scheduled feedings you can watch during your meal, adding an educational twist to your dining experience."

OUTPUT FROM YOU: {
conversationSoFar: "The user is looking for a unique dining experience in NYC and expressed interest in the Underwater Dining Room, curious about the marine life featured in the restaurant and whether the experience includes interactive elements. The searchAI responded with information about the available interactive elements.",
restaurantList: null,
aiResponse: "The Underwater Dining Room truly brings the ocean to you in an unforgettable dining setting. While dining, you'll be surrounded by a beautiful array of marine life, from exotic fish to serene rays, all within the comfort of an elegantly designed space. While the interaction with marine life is more observational, the restaurant 
enhances your experience with educational insights and the mesmerizing view of scheduled feedings. It's a perfect blend of culinary excellence and the marvels of the ocean, 
promising a meal you won't soon forget. For more details and to plan your visit, checking their website would be the next best step!"
};
`;

// const callPerplexityGptTools: any = [
//   {
//     type: "function",
//     function: {
//       name: "askTheSearchAI",
//       description: "Call the AI that can search the internet and provide a response to queries",
//       parameters: {
//         type: "object",
//         properties: {
//           description: {
//             type: "string",
//             description: "description of the information required such as restaurant suggestions"
//           }
//         },
//         required: ["description"]
//       }
//     }
//   },
// ];

const callPerplexityClaudeTools: any = [
  {
    name: "askTheSearchAI",
    description: "Call the AI that can search the internet and provide a response to queries",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "description of the information required such as suggestions for restaurants"
        }
      },
      required: ["query"]
    } 
  },
  {
    name: "getResults",
    description: "Call the function which will display the winner and top choice based on what their group voted for. Call this only if the user asks specifically.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    } 
  },
  {
    name: "respond",
    description: "Respond to the user directly with follow up questions",
    input_schema: {
      type: "object",
      properties: {
        response: {
          type: "string",
          description: "Response to the user (usually introduction or follow up questions to get more information of what the user wants)"
        }
      },
      required: ["response"]
    } 
  },
];

// const summarizeParseGptTools: any = [
//   {
//     type: "function",
//     function: {
//       name: "outputSummaryAndResults",
//       description: "Compile and output a summary of the conversation, along with a list of restaurant suggestions or answers to specific queries.",
//       parameters: {
//         type: "object",
//         properties: {
//           conversationSoFar: {
//             type: "string",
//             description: "An updated summary of the entire conversation up to this point, incorporating the latest user prompt and any relevant context from the search AI's response. This summary aids Meshiagare in crafting queries for future interactions."
//           },
//           restaurantList: {
//             type: "array",
//             items: {
//               type: "object",
//               properties: {
//                 name: {type: "string", description: "The name of the restaurant."},
//                 reason: {type: "string", description: "Why this restaurant is a good fit for the user's requirements."},
//                 sources: {
//                   type: "array",
//                   items: {
//                     type: "object",
//                     properties: {
//                       name: { type: "string", description: "The name of the source site." },
//                       url: { type: "string", description: "The URL of the source site." }
//                     },
//                     required: ["name", "url"],
//                     description: "An object with two fields: 'name' for the name of the site and 'url' for the URL."
//                   },
//                   description: "An array of objects, each consisting of a site name and its URL."
//                 }
//               },
//               description: "A list of suggested restaurants, providing details such as name, location, reason for recommendation, and sources. If no restaurants are suggested, this list should be set to null."
//             },
//             description: "A curated list of restaurant suggestions based on the search AI's findings, limited to a maximum of six choices."
//           },
//           aiResponse: {
//             type: "string",
//             description: "A response based on the user's last input and the conversation context. This response precedes the restaurant suggestions or addresses follow-up questions if no suggestions are provided."
//           }
//         },
//         required: ["conversationSoFar", "aiResponse"],
//         additionalProperties: false
//       }
//     }
//   }
// ];

async function askTheSearchAI(searchQuery: string): Promise<any> {
  const perplexityMessages: any  = [{"role": "system", "content": ''},
        {"role": "user", "content": searchQuery}];
  try {
    const perplexity_response = await perplexity.chat.completions.create({
      model: 'sonar',
      stream: false,
      top_p: 0.8,
      presence_penalty: 1.0,
      messages: perplexityMessages,
    });
    return perplexity_response;
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    throw error; 
  }
};

interface Source {
  name: string;
  url: string;
}

interface Restaurant {
  name: string;
  reason: string;
}

interface claudeParsedResponse {
  restaurantList: Restaurant[] | null;
  conversationSoFar?: string;
  aiResponse: string;
}

export async function POST(req: Request) {
  // let responseDataT = {
  //   "conversationSoFar": "The user is exploring vegetarian and vegan Vietnamese dining options in New York City. They are interested in restaurants known for their vegetarian pho dishes and authentic Vietnamese flavors.",
  //   "restaurantList": [
  //     {
  //       "name": "Bánh",
  //       "reason": "Bánh offers a variety of vegetarian pho options, including a unique dry style presentation. It is praised for its innovative approach to Vietnamese cuisine, making it a trendy choice.",
  //       "sources": [
  //         {
  //           "name": "Bánh",
  //           "url": "https://www.banhnyc.com/"
  //         }
  //       ]
  //     },
  //     {
  //       "name": "Pho Shop",
  //       "reason": "Bánh offers a variety of vegetarian pho options, including a unique dry style presentation. It is praised for its innovative approach to Vietnamese cuisine, making it a trendy choice.",
  //       "sources": [
  //         {
  //           "name": "Bánh",
  //           "url": "https://www.banhnyc.com/"
  //         }
  //       ]
  //     }
  //   ],
  //   "aiResponse": "Exploring vegetarian and vegan Vietnamese dining in NYC is a delightful culinary adventure. Bánh stands out with its innovative approach, offering a variety of vegetarian pho options, including a unique dry style presentation, making it a trendy choice for those seeking authentic flavors."
  // };
  

  // return new Response(JSON.stringify(responseDataT), {
  //   status: 200
  // });
  const json = await req.json()
  const { messages, previewToken } = json
  let userInput = messages[messages.length - 1].content; 

  const session = await auth()

  let previouslySuggestedRestaurants: string[] = [];
  let conversationSoFar = "";
  let meshiagareInput = "";
  let location = "";
  let chatId = json.id;
  let chat;

  let groupChatDetails;
  let chatData = await getChat(chatId, session?.user?.id ?? null);  
  if (!session?.user) {
    if (chatData) {
      ({ chat, groupChatDetails } = chatData);
      conversationSoFar = chat.conversationSoFar;
      previouslySuggestedRestaurants = chat.previouslySuggestedRestaurants;
      meshiagareInput = `Location: ${location}, groupWidePreferences: "", priceRange: "", previouslySuggestedRestaurants: ${JSON.stringify(previouslySuggestedRestaurants)}, conversationSoFar: ${conversationSoFar}, prompt: ${userInput}`;
    } else {
      chat = await createChat({
        chatId: json.id,
        userId: null,
        groupId: null,
        groupChatDetailsId: null,    
      });
      meshiagareInput = `Location: "", groupWidePreferences: [], priceRange: "", previouslySuggestedRestaurants: [], conversationSoFar: "", prompt: ${userInput}`;
    }
  } else {
    if (chatData) {
      ({ chat, groupChatDetails } = chatData);
      conversationSoFar = chat.conversationSoFar;
      previouslySuggestedRestaurants = chat.previouslySuggestedRestaurants;
      location = groupChatDetails.location;
      meshiagareInput = `Location: ${location}, groupWidePreferences: ${JSON.stringify(groupChatDetails.preferences)}, priceRange: ${groupChatDetails.priceRange}, previouslySuggestedRestaurants: ${JSON.stringify(previouslySuggestedRestaurants)}, conversationSoFar: ${conversationSoFar}, prompt: ${userInput}`;
    } else {
      const { userData, preferences } = await getUserAndPreferences(session.user.id);
      groupChatDetails = await createGroupChatDetails({
        location: userData.location,
        title: json.messages[0].content.substring(0, 100),
        preferences: preferences,
        priceRange: userData.priceRange,
      });
      const groupChatDetailsId = groupChatDetails.id;
      chat = await createChat({
        chatId: json.id,
        userId: session.user.id,
        groupId: null,
        groupChatDetailsId,    
      });
      location = userData.location;
      meshiagareInput = `Location: ${location}, groupWidePreferences: ${JSON.stringify(preferences)}, priceRange: ${userData.priceRange}, previouslySuggestedRestaurants: ${previouslySuggestedRestaurants}, conversationSoFar: ${conversationSoFar}, prompt: ${userInput}`;
    }
  }

  // const MeshiagareMessages: any  = [{"role": "system", "content": callPerplexityGptInstructions},
  //       {"role": "user", "content": meshiagareInput}];

  const MeshiagareResponse = await anthropic.beta.tools.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 2048,
    tools: callPerplexityClaudeTools,
    tool_choice: {"type": "any"},
    messages: [{"role": "user", "content": meshiagareInput}],
    temperature: 0.7,
    system: callPerplexityClaudeInstructions
  });

  // const meshiagareApiOutput = await openai.chat.completions.create({
  //   model: "gpt-4-0125-preview",
  //   messages: MeshiagareMessages,
  //   tools: callPerplexityGptTools,
  //   temperature: 1.2,
  // });
  // const meshiagareOutput = meshiagareApiOutput.choices[0].message;

  // const toolCalls = meshiagareOutput.tool_calls;

  let responseDataObj: claudeParsedResponse = {
    restaurantList: null, 
    aiResponse: "Seems like we're facing some issues. Please refresh and try again in a bit! :)"
  };
  let responseStatus = 200;
  if (MeshiagareResponse.stop_reason === "tool_use") {
    const toolCall = MeshiagareResponse.content[MeshiagareResponse.content.length - 1];
    if (toolCall.name === 'askTheSearchAI') {
      const searchAiResponse = await askTheSearchAI( 
        MeshiagareResponse.content[MeshiagareResponse.content.length - 1].input.query
      );
      const summarizeParseClaudeInput = searchAiResponse.choices[0].message.content;

      // const summarizeParseGptMessages: any  = [{"role": "system", "content": summarizeParseGptInstructions},
      //       {"role": "user", "content": summarizeParseGptInput}];

      // const summarizeParseGptApiOutput = await openai.chat.completions.create({
      //   model: "gpt-3.5-turbo-0125",
      //   messages: summarizeParseGptMessages,
      //   tools: summarizeParseGptTools,
      //   temperature: 0.5,
      //   tool_choice: {"type": "function", "function": {"name": "outputSummaryAndResults"}},
      //   response_format: { type: "json_object" },
      // });

      let summarizeParseClaudeApiOutput = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{"role": "user", "content": summarizeParseClaudeInput},{"role": "assistant","content": "{"}],
        temperature: 0.6,
        system: summarizeParseClaudeInstructions
      });
      let responseData = '{' + summarizeParseClaudeApiOutput.content[0].text + (summarizeParseClaudeApiOutput.content[0].text.endsWith('}') ? '' : '}');    
      responseDataObj = JSON.parse(responseData) as claudeParsedResponse;
      conversationSoFar = responseDataObj.conversationSoFar!;
      const restaurantNames = responseDataObj.restaurantList?.map(restaurant => restaurant.name);
      previouslySuggestedRestaurants = [...previouslySuggestedRestaurants, ...restaurantNames];
    } else if (toolCall.name === 'getResults' && session?.user && groupChatDetails){
      const resultsString = await getRankedChoiceWinner(groupChatDetails.id);
      responseDataObj = ({
        restaurantList: null, 
        aiResponse:  resultsString
      });
    } else if (toolCall.name === 'respond'){
      conversationSoFar = conversationSoFar + "Meshiagare responded in the previous turn with: " + MeshiagareResponse.content[MeshiagareResponse.content.length - 1].input.response; 
      responseDataObj = ({
        restaurantList: null, 
        aiResponse:  MeshiagareResponse.content[MeshiagareResponse.content.length - 1].input.response
      });
    }
  } else {
    conversationSoFar = conversationSoFar + "Meshiagare responded in the previous turn with: " + MeshiagareResponse.content[0].text; 
    responseDataObj = ({
      restaurantList: null, 
      aiResponse:  MeshiagareResponse.content[0].text!
    });
  }

  const newMessage = JSON.stringify(responseDataObj);

  chat.conversationSoFar = conversationSoFar;
  chat.previouslySuggestedRestaurants = previouslySuggestedRestaurants;
  chat.messages.push({
    content: userInput,
    role: 'user'
  });
  chat.messages.push({
    content: newMessage,
    role: 'assistant'
  });

  await addMessageToChat(chat.id, chat);

  return new Response(newMessage, {
    status: responseStatus
  });
}