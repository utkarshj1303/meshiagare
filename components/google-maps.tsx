'use client';

import React, { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import process from 'process';
import { useTheme } from 'next-themes';
import MapContext from '@/components/map-context';
import { useContext } from 'react';
import { addPin, removePin, getAllPinsForGroup, getAllVotesForUserInGroup, vote, getRankedChoiceWinner, removeVote } from '@/app/actions'
import ReactDOMServer from 'react-dom/server';
import toast from 'react-hot-toast';


const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

async function downloadImage(url: string, userId: string): Promise<string> {
  const cacheKey = `image:${userId}`;
  const cachedDataUrl = localStorage.getItem(cacheKey);

  if (cachedDataUrl) {
    return cachedDataUrl;
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    localStorage.setItem(cacheKey, dataUrl);
    return dataUrl;
  } catch (error) {
    
    return '';
  }
}

interface Pin {
  pinId: string,
  userId:string, 
  restaurantName: string,
  reason: string,
  image: string
}

export default function GoogleMaps({groupChatDetailsId, user, location}) {
  
  const mapRef = React.useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const mapInstanceRef = React.useRef<google.maps.Map | null>(null);
  const markersRef = React.useRef<Map<string, google.maps.Marker>>(new Map());
  const { mapState } = useContext(MapContext);
  const restaurantToPinIdMap = React.useRef<Map<string, string>>(new Map());
  const pinIdToVotesMap = React.useRef<Map<string, number>>(new Map());
  const currentUserRestaurants = React.useRef<Set<string>>(new Set());

  const loader = new Loader({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
    version: 'quarterly',
  });
  
  const updateInfoWindowContent = (marker, place, reason, pinId) => {
    marker.infoWindow.setContent(
      ReactDOMServer.renderToString(
        <InfoWindowContent
          place={place}
          pinId={pinId}
          reason={reason}
          numRatingOptions={restaurantToPinIdMap.current.size}
        />
      )
    );
  
    google.maps.event.addListenerOnce(marker.infoWindow, 'domready', function() {
      Array.from({ length: restaurantToPinIdMap.current.size }, (_, index) => index + 1).forEach((rating) => {
        const voteButton = document.getElementById(`vote-button-${pinId}-${rating}`);
        if (voteButton && !voteButton.hasAttribute('data-listener')) {
          voteButton.setAttribute('data-listener', 'true');
          voteButton.addEventListener('click', async function() {
            if (pinIdToVotesMap.current.get(pinId)) {
              const previousRating = pinIdToVotesMap.current.get(pinId);
              const previousVoteButton = document.getElementById(`vote-button-${pinId}-${previousRating}`);
              if (previousVoteButton) {
                previousVoteButton.className = `flex items-center justify-center w-8 h-8 rounded-full bg-white text-gray-600 hover:bg-gray-100 transition duration-200 ease-out cursor-pointer focus:outline-none`;
                if (rating === previousRating) {
                  pinIdToVotesMap.current.delete(pinId);
                  await removeVote(groupChatDetailsId, pinId, user.id);
                  return;
                }
              }
            }
            pinIdToVotesMap.current.set(pinId, rating);
            await vote(groupChatDetailsId, pinId, rating, user.id);
            voteButton.className = `flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white transition duration-200 ease-out cursor-pointer focus:outline-none`;
          });
        }
      });
    });
  };
  
  
  const InfoWindowContent = ({ place, pinId, reason, numRatingOptions }) => {
    return (
      <div className="max-w-sm mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4">
          <div className="font-bold text-xl mb-2 flex items-center">
            {place.website ? (
              <a href={place.website} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline">
                {place.name}
              </a>
            ) : (
              place.name
            )}
            {place.formatted_phone_number && (
              <span className="ml-2 text-gray-600 text-sm">{place.formatted_phone_number}</span>
            )}
          </div>
          <div className="text-gray-700 text-base">
            {place.rating && (
              <span>
                Google Rating: {place.rating} ({place.user_ratings_total} reviews)
              </span>
            )}
          </div>
          {reason && <p className="text-gray-900 text-sm mt-2">{reason}</p>}
          {groupChatDetailsId && <div className="flex justify-center space-x-2 mt-4">
            {Array.from({ length: numRatingOptions }, (_, index) => index + 1).map((rating) => (
              <button
                id={`vote-button-${pinId}-${rating}`}
                key={rating}
                type="button"
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  pinIdToVotesMap.current.get(pinId) === rating
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                } transition duration-200 ease-out cursor-pointer focus:outline-none`}
              >
                <span className="text-sm font-medium">{rating}</span>
              </button>
            ))}
          </div>
          }
        </div>
      </div>
    );
  };
  
  
  const addMarker = async (restaurantName: string, imageUrl: string, userId: string, reason: string, pinId: string, isInitialLoad: boolean) => {
    if (mapInstanceRef.current && !markersRef.current.has(restaurantName)) {
      const { PlacesService } = await loader.importLibrary('places');
      const service = new PlacesService(mapInstanceRef.current);
      const restaurantNameQuery = restaurantName + (user && location ? ` ${location}` : '');
      const request = {
        query: restaurantNameQuery,
        fields: ["name", "place_id"],
      };

      service.findPlaceFromQuery(
        request,
        async (
          results: google.maps.places.PlaceResult[] | null,
          status: google.maps.places.PlacesServiceStatus
        ) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const placeId = results[0].place_id;
            const detailsRequest = {
              placeId: placeId,
              fields: [
                "name",
                "geometry",
                "rating",
                "user_ratings_total",
                "website",
                "formatted_phone_number",
              ],
            };

            await service.getDetails(detailsRequest, async (place, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                let svgMarkup;
                if (user) {
                  const dataUrl = await downloadImage(imageUrl, userId);

                  svgMarkup = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100">
                      <path fill="#800020" d="M40 0C17.9 0 0 17.9 0 40c0 27.1 40 60 40 60s40-32.9 40-60C80 17.9 62.1 0 40 0z"/>
                      <circle cx="40" cy="40" r="28" fill="#FFFFFF"/>
                      <defs>
                        <clipPath id="circleClip">
                          <circle cx="40" cy="40" r="24"/>
                        </clipPath>
                      </defs>
                      <image x="16" y="16" width="48" height="48" href="${dataUrl}" clip-path="url(#circleClip)"/>
                    </svg>
                  `;
                } else {
                  svgMarkup = `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100">
                  <path fill="#800020" d="M40 0C17.9 0 0 17.9 0 40c0 27.1 40 60 40 60s40-32.9 40-60C80 17.9 62.1 0 40 0z"/>
                </svg>                
                  `;
                }

                const marker = new google.maps.Marker({
                  map: mapInstanceRef.current,
                  position: place.geometry!.location,
                  animation: google.maps.Animation.BOUNCE,
                  icon: {
                    url: `data:image/svg+xml,${encodeURIComponent(svgMarkup)}`,
                    scaledSize: new google.maps.Size(40, 60),
                    labelOrigin: new google.maps.Point(20, 20),
                  },
                });

                setTimeout(() => {
                  marker.setAnimation(null);
                }, 700);
                
                marker.infoWindow = new google.maps.InfoWindow({
                  content: ReactDOMServer.renderToString(
                    <InfoWindowContent
                      place={place}
                      pinId={pinId}
                      reason={reason}
                      numRatingOptions={markersRef.current.size}
                    />
                  ),
                  maxWidth: 384,
                });

                marker.infoWindow.addListener("closeclick", () => {
                  marker.infoWindow.close();
                });

                marker.addListener("click", () => {
                  if (groupChatDetailsId) {
                    updateInfoWindowContent(marker, place, reason, pinId);
                  }
                  marker.infoWindow.open(mapInstanceRef.current, marker);
                });

                markersRef.current.set(restaurantName, marker);
                if (!isInitialLoad) {
                  mapInstanceRef.current.setCenter(place.geometry!.location!);
                  mapInstanceRef.current.setZoom(15);
                }
              }
            });
          }
        }
      );
    }
  };


  useEffect(() => {
    const initMap = async () => {
      if (mapInstanceRef.current) {
        // Remove the existing map instance from the DOM
        mapInstanceRef.current.unbindAll();
        mapInstanceRef.current.setMap(null);
        mapInstanceRef.current = null;
      }
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markersRef.current.clear();
      const { Map } = await loader.importLibrary('maps');
      if (location) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: location }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
            const locationInMap = {
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            };
  
            const options: google.maps.MapOptions = {
              center: locationInMap,
              zoom: 12,
            };
  
            const map = new Map(mapRef.current as HTMLDivElement, options);
            mapInstanceRef.current = map;
          }
        });
      } else {
        const locationInMap = {
          lat: 40.754932,
          lng: -73.984016,
        };
  
        const options: google.maps.MapOptions = {
          center: locationInMap,
          zoom: 12,
        };
  
        const map = new Map(mapRef.current as HTMLDivElement, options);
        mapInstanceRef.current = map;
      }
      if (groupChatDetailsId){
        const [initialPins, userVotes] = await Promise.all([
          getAllPinsForGroup(groupChatDetailsId),
          getAllVotesForUserInGroup(groupChatDetailsId, user.id)
        ]);
        userVotes.forEach(({ pinId, vote }) => {
          pinIdToVotesMap.current.set(pinId, vote);
        });
        for (const pin of initialPins) {
          if (!(pin.restaurantName in restaurantToPinIdMap.current)){
            restaurantToPinIdMap.current.set(pin.restaurantName, pin.pinId);
            if (pin.userId === user.id){
              currentUserRestaurants.current.add(pin.restaurantName);
            }
            await addMarker(pin.restaurantName, pin.image, pin.userId, pin.reason, pin.pinId, true);
          }
        }
      }
    };
    initMap();
  }, [groupChatDetailsId]);

  // useEffect(() => {
  //   const updateMapStyle = () => {
  //     if (mapInstanceRef.current) {
  //       mapInstanceRef.current.setOptions({ styles: theme === 'dark' ? darkMapStyles : [] });
  //     }
  //   };

  //   updateMapStyle();
  // }, [theme]);

  useEffect(() => {
    const removeMarker = (restaurantName: string) => {
      const marker = markersRef.current.get(restaurantName);
      marker.setMap(null);
      markersRef.current.delete(restaurantName);
      if (groupChatDetailsId) {
        restaurantToPinIdMap.current.delete(mapState.restaurantName);
      }
    };


    if (mapState.operation === 'add') {
      if (!(markersRef.current.has(mapState.restaurantName))) {
        if (user) {
          (async () => {
            const pinId = await addPin(groupChatDetailsId, {
              userId: user.id,
              restaurantName: mapState.restaurantName,
              reason: mapState.reason,
              image: user.image,
            });
            restaurantToPinIdMap.current.set(mapState.restaurantName, pinId);
            currentUserRestaurants.current.add(mapState.restaurantName);
            await addMarker(mapState.restaurantName, user?.image, user?.id, mapState.reason, pinId, false);
          })();
         } else {
          (async () => {
            currentUserRestaurants.current.add(mapState.restaurantName);
            await addMarker(mapState.restaurantName, undefined, undefined, mapState.reason, undefined, false);
          })();
         }
      } else {
        toast.error("This restaurant has already been added");
      }
    } else if (mapState.operation === 'remove') {
      if ((currentUserRestaurants.current.has(mapState.restaurantName))) {
        currentUserRestaurants.current.delete(mapState.restaurantName);
        if (user) {
          (async () => {
            await removePin(groupChatDetailsId, restaurantToPinIdMap.current.get(mapState.restaurantName));
          })();
        }
        removeMarker(mapState.restaurantName);
      }
  }}, [mapState]);

  const mapContainerStyle = {
    width: '100%',
    height: '100%',
  };

  return <div style={mapContainerStyle} ref={mapRef} />;
}