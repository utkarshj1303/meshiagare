"use client"

import { useContext, useState, useEffect } from "react"
import MapContext from '@/components/map-context';

interface Source {
  name: string;
  url: string;
}

interface RestaurantCard {
  id: string
  name: string
  reason: string
  sources: Source[]
  isClicked: boolean
}

export function RestaurantCard({ id, name, reason, sources, isClicked}: RestaurantCard) {

  const [clicked, setClicked] = useState(isClicked);
  const { updateMapState } = useContext(MapContext);
  
  // Toggle the clicked state
  const handleClick = () => {
    let pinOperation = clicked ? 'remove' : 'add';
    updateMapState({operation: pinOperation, restaurantName: name, reason: reason})
    setClicked(!clicked);
  };

  useEffect(() => {
    setClicked(isClicked);
  }, [isClicked]);

  return (
    <div
      id={id}
      className={`flex flex-col py-4 px-4 rounded-xl ${clicked ? 'bg-gray-200 bg-opacity-55' : 'bg-transparent hover:bg-gray-200 hover:bg-opacity-55'} transition duration-200 ease-out cursor-pointer w-full relative group outline-none`}
      onClick={handleClick}
      tabIndex={0}
      onFocus={(event) => event.target.blur()}
    >
      <div className="flex flex-row items-center gap-2 mb-2">
        {}
      </div>
      <div className="flex italic flex-col gap-1 p-2">
        <h3 className="font-sans font-semibold truncate text-gray-700">{name}</h3>
        <p className="font-sans text-gray-700" style={{ fontSize: '0.95rem' }}>{reason}</p>
        {sources && sources.length > 0 && (
          <>
            <h4 className="font-sans text-sm font-semibold text-gray-600" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Learn more:</h4>
            <ul className="space-y-1">
              {sources.slice(0, 4).map((source, index) => (
                <li key={index} className="font-sans text-sm text-gray-500 hover:text-gray-700" style={{ fontSize: '0.875rem' }}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.name}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default RestaurantCard;