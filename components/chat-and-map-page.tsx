'use client'
import { nanoid } from '@/lib/utils';
import { Chat } from '@/components/chat';
import GoogleMaps from '@/components/google-maps';
import { type Message } from 'ai/react';
import MapContext from '@/components/map-context';
import { useState, useEffect } from 'react';
import { getAllPinsForGroup } from '@/app/actions';



export default function ChatAndMapPage( { id, initialMessages, groupChatDetailsId, user, isSignInPage, location} ) {

  // Full-screen container style
  const fullScreenStyle = {
    display: 'flex',
    flexDirection: 'row', // Align children in a row
    height: '100%', // Full viewport height
  };

  // Style for the Chat component container
  const chatStyle = {
    flex: 1, // Take up half of the space
    display: 'flex', // Use flexbox for the container
    justifyContent: 'center', // Center content horizontally
    padding: '3rem 2rem 2rem 2rem', // Add some space around the chat component
  };
                    
  // Style for the Map component container
  const mapContainerStyle = {
    flex: 1, // Take up half of the space
    display: 'flex', // Use flexbox for the container
    justifyContent: 'center', // Center content horizontally
    alignItems: 'center', // Center content vertically
    padding: '2rem', // Add some space around the map
  };

  // Map style for the GoogleMaps component
  const mapStyle = {
    border: '0.5px solid #e0e0e0', // Add a border for visual separation
    borderRadius: '1rem', // Round the corners of the map
    overflow: 'hidden', // Prevent anything from spilling outside the border-radius
    width: '100%', // Full width of the container
    height: 'calc(100% - 4rem)', // Height minus padding
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', // Optional: Add a subtle shadow for depth
  };

  const [mapState, setMapState] = useState({operation: "null"});

  const updateMapState = (newState) => {
    setMapState(newState);
  };


  return (
    <MapContext.Provider value={{ mapState, updateMapState }}>
      <div style={fullScreenStyle}>
        <div style={chatStyle}>
          <Chat
            id={id}
            userId={user?.id}
            initialMessages={initialMessages}
            isSignInPage={isSignInPage}
            groupChatDetailsId={groupChatDetailsId}
          />
        </div>
        <div style={mapContainerStyle}>
          <div style={mapStyle}>
            <GoogleMaps
              id={id}
              groupChatDetailsId={groupChatDetailsId}
              user={user}
              location={location}
            />
          </div>
        </div>
      </div>
    </MapContext.Provider>
  );
}