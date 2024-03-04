'use client'

import { type Message } from 'ai';
import { ChatMessage } from '@/components/chat-message';
import { getAllPinsForGroup } from '@/app/actions'
import React, { useEffect, useState } from 'react';
import { auth } from '@/auth';

export interface ChatList {
  messages: Message[],
  groupChatDetailsId?: string,
  userId?: string
}

export function ChatList({ messages, userId, groupChatDetailsId}: ChatList) {

  const [userRestaurantNames, setUserRestaurantNames] = useState<Set<string>>();

  useEffect(() => {
    const initUserRestaurantNames = async () => {
      if (groupChatDetailsId){
        let allPins = await getAllPinsForGroup(groupChatDetailsId);

        setUserRestaurantNames(new Set(
          allPins
            .filter((pin) => pin.userId === userId)
            .map((pin) => pin.restaurantName)
        ));
      }
    };
    initUserRestaurantNames();
  }, []);


  return (
    <div className="relative mx-auto px-4">
      {messages.map((message, index) => (
        <div key={index}>
          <ChatMessage message={message} userRestaurantNames={userRestaurantNames}/>
        </div>
      ))}
    </div>
  );
}