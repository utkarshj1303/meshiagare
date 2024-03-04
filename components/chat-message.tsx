import { Message } from 'ai'
import { cn } from '@/lib/utils'
import { ChatMessageActions } from '@/components/chat-message-actions'
import { RestaurantCard } from "./restaurant-card"

export interface ChatMessageProps {
  message: Message,
  userRestaurantNames: Set<string>
}

interface Source {
  name: string;
  url: string;
}

interface Restaurant {
  name: string;
  reason: string;
  sources: Source[];
}

interface claudeParsedResponse {
  restaurantList: Restaurant[] | null;
  aiResponse: string;
}

export function ChatMessage({ message, userRestaurantNames, ...props }: ChatMessageProps) {
  let responseData: claudeParsedResponse = {
    restaurantList: null,
    aiResponse: "Seems like we're facing some issues. Please refresh and try again in a bit! :)",
  };
  if (message.role === 'assistant') {
    responseData = JSON.parse(message.content) as claudeParsedResponse;
  }
  return (
    <div className={cn('group relative mb-4 flex items-start')} {...props}>
      <div className="flex-1 px-1 ml-4 space-y-2 break-words">
        <div className="flex items-start">
          <div className={`font-sans ${message.role === 'assistant' ? 'italic text-gray-700 whitespace-pre-line' : ''} flex-1 mr-2`}>
            {message.role === 'assistant' ? responseData.aiResponse : message.content}
          </div>
        </div>
        {responseData.restaurantList?.map((restaurant, index) => (
          <RestaurantCard
            key={index}
            id={restaurant.name}
            name={restaurant.name}
            reason={restaurant.reason}
            sources={restaurant.sources}
            isClicked={userRestaurantNames?.has(restaurant.name)}
          />
        ))}
      </div>
    </div>
  )
}