import { useState, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

interface ScrollIndicatorProps {
  scrollableRef: React.RefObject<HTMLDivElement>;
  scrollableRefPosition: React.RefObject<HTMLDivElement>;
  messages: any[]; // Replace `any[]` with your actual message type if necessary
}

export const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({
  scrollableRef,
  scrollableRefPosition,
  messages
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const checkScrollIndicatorVisibility = () => {
    if (scrollableRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollableRef.current;
      const threshold = 5; // Small threshold for considering it at the bottom
      const isScrollable = scrollHeight > clientHeight;
      const isAtBottom = scrollTop + clientHeight + threshold >= scrollHeight;
      setIsVisible(isScrollable && !isAtBottom);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      checkScrollIndicatorVisibility();
    };

    const scrollElement = scrollableRef.current;
    scrollElement?.addEventListener('scroll', handleScroll);

    // Check visibility initially and on messages change
    checkScrollIndicatorVisibility();

    // Clean up event listener on component unmount
    return () => {
      scrollElement?.removeEventListener('scroll', handleScroll);
    };
  }, [scrollableRef, messages]);

  const indicatorStyle = {
    position: 'absolute',
    bottom: scrollableRefPosition.current ? `${scrollableRefPosition.current.offsetHeight + 5}px` : '5px',
    left: '50%',
    transform: 'translateX(-50%)',
  };

  return (
    isVisible && (
      <button
        style={indicatorStyle}
        className="bg-white text-gray-800 rounded-full p-2 shadow-lg cursor-pointer focus:outline-none"
        onClick={() => {
          scrollableRef.current?.scrollTo({
            top: scrollableRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }}
      >
        <FaChevronDown />
      </button>
    )
  );
};
