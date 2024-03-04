'use client'

import Image from 'next/image'
import { type Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateUserIsFirstLogin, updateUserPriceRange, updateUserLocation, addUserPreference, removeUserPreference, getUserAndPreferences } from '@/app/actions'

export interface UserMenuProps {
  user: Session['user']
}

function getUserInitials(name: string) {
  const [firstName, lastName] = name.split(' ')
  return lastName ? `${firstName[0]}${lastName[0]}` : firstName.slice(0, 2)
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [location, setLocation] = useState('')
  const [restrictions, setRestrictions] = useState([])
  const [newRestriction, setNewRestriction] = useState('')
  const [priceRange, setPriceRange] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { userData, preferences } = await getUserAndPreferences(user.email)
        if (userData.isFirstLogin) {
          await updateUserIsFirstLogin(userData.id, userData);
          setIsOpen(true);
        } else {
          setLocation(userData?.location || '')
          setPriceRange(userData?.priceRange || '');
          setRestrictions(preferences || [])
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error)
      }
    }

    fetchUserData()
  }, [user.email])

  const handleUpdateLocation = async () => {
    try {
      await updateUserLocation(user.email, location)
    } catch (error) {
      console.error('Error updating user location:', error)
    }
  }

  const handleAddRestriction = async () => {
    if (newRestriction.trim() !== '') {
      try {
        await addUserPreference(user.email, newRestriction.trim())
        setRestrictions([...restrictions, newRestriction.trim()])
        setNewRestriction('')
      } catch (error) {
        console.error('Error adding user preference:', error)
      }
    }
  }

  const handleUpdatePriceRange = async () => {
    try {
      await updateUserPriceRange(user.email, priceRange);
    } catch (error) {
      console.error('Error updating user price range:', error);
    }
  };

  const handleRemoveRestriction = async (preference: string) => {
    try {
      await removeUserPreference(user.email, preference)
      setRestrictions(restrictions.filter((item) => item !== preference))
    } catch (error) {
      console.error('Error removing user preference:', error)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="pl-0">
            {user?.image ? (
              <Image
                className="size-6 transition-opacity duration-300 rounded-full select-none ring-1 ring-zinc-100/10 hover:opacity-80"
                src={user?.image ? `${user.image}` : ''}
                alt={user.name ?? 'Avatar'}
                height={48}
                width={48}
              />
            ) : (
              <div className="flex items-center justify-center text-xs font-medium uppercase rounded-full select-none size-7 shrink-0 bg-muted/50 text-muted-foreground">
                {user?.name ? getUserInitials(user?.name) : null}
              </div>
            )}
            <span className="ml-2">{user?.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent sideOffset={8} align="start" className="w-[180px]">
          <DropdownMenuItem className="flex-col items-start">
            <div className="text-xs font-medium">{user?.name}</div>
            <div className="text-xs text-zinc-500">{user?.email}</div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsOpen(true)} className="text-xs">
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              signOut({
                callbackUrl: '/'
              })
            }
            className="text-xs"
          >
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-[640px] space-y-6">
    <DialogHeader>
      <DialogTitle className="text-2xl font-semibold">Profile</DialogTitle>
    </DialogHeader>
    <div className="space-y-6">
      <div className="flex items-center space-x-8">
        <Label htmlFor="location" className="w-1/4 text-sm font-medium">
          Location
        </Label>
        <div className="flex-1 flex items-center space-x-4">
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUpdateLocation();
              }
            }}
            className="w-full"
            placeholder="Enter location"
          />
          <Button onClick={handleUpdateLocation} className="w-24 shrink-0">
            Update
          </Button>
        </div>
      </div>
      <div className="flex items-center space-x-8">
        <Label htmlFor="priceRange" className="w-1/4 text-sm font-medium">
          Price Range
        </Label>
        <div className="flex-1 flex items-center space-x-4">
          <Input
            id="priceRange"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUpdatePriceRange();
              }
            }}
            className="w-full"
            placeholder="Enter price range"
          />
          <Button onClick={handleUpdatePriceRange} className="w-24 shrink-0">
            Update
          </Button>
        </div>
      </div>
      <div className="flex items-start space-x-8">
        <div className="w-1/4">
          <Label htmlFor="restrictions" className="text-sm font-medium">
            Restrictions/Preferences
          </Label>
          <p className="mt-1 text-xs text-gray-500">
            These preferences will automatically be added to any new group chats which you&rsquo;re added to! :)
          </p>
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center space-x-4">
            <Input
              id="newRestriction"
              value={newRestriction}
              onChange={(e) => setNewRestriction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddRestriction();
                }
              }}
              className="flex-1"
              placeholder="Enter restrictions/preferences"
            />
            <Button onClick={handleAddRestriction} className="w-24 shrink-0">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {restrictions.map((restriction, index) => (
              <div key={index} className="flex items-center bg-gray-200 rounded-md px-2 py-1">
                <span>{restriction}</span>
                <button
                  onClick={() => handleRemoveRestriction(restriction)}
                  className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)} className="w-24">
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  )
}