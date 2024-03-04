'use client'

import * as React from 'react'
import { toast } from 'react-hot-toast'
import {
  clearChats,
  getChats,
  getGroupsForUser,
  createChat,
  createGroup,
  createGroupChatDetails,
  getUserAndPreferences,
  getGroupUsers,
  getPreferencesForGroup
} from '@/app/actions'
import { ClearHistory } from '@/components/clear-history'
import { SidebarItems } from '@/components/sidebar-items'
import { cache } from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { IconPlus } from '@/components/ui/icons'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface ChatHistoryProps {
  userId?: string
}

interface Group {
  id: string
  name: string
  userIds: string[]
}

interface User {
  id: string
  name: string
  image: string
  location: string
  restrictions: string
}

const loadChats = cache(async (userId?: string) => {
  return await getChats(userId)
})

const loadGroups = cache(async (userId?: string) => {
  return await getGroupsForUser(userId)
})


export function ChatHistory({ userId }: ChatHistoryProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [location, setLocation] = React.useState('')
  const [restrictions, setRestrictions] = React.useState([])
  const [newRestriction, setNewRestriction] = React.useState('')  
  const [priceRange, setPriceRange] = React.useState('')
  const [selectedGroup, setSelectedGroup] = React.useState('')
  const [addedGroups, setAddedGroups] = React.useState<Group[]>([])
  const [groupTitle, setGroupTitle] = React.useState('')
  const [memberInput, setMemberInput] = React.useState('')
  const [addedMembers, setAddedMembers] = React.useState<User[]>([])
  const [memberError, setMemberError] = React.useState('')
  const [groupError, setGroupError] = React.useState('')
  const [showMembersDialog, setShowMembersDialog] = React.useState(false)
  const [chats, setChats] = React.useState<Awaited<ReturnType<typeof getChats>>>([])
  const [existingGroups, setExistingGroups] = React.useState<Group[]>([])
  const [chatName, setChatName] = React.useState('')
  const router = useRouter()


  const fetchUserData = async () => {
    try {
      const { userData, preferences } = await getUserAndPreferences(userId)
      setLocation(userData?.location || '')
      setPriceRange(userData?.priceRange || '')
      setRestrictions(preferences || [])
    } catch (error) {
      console.error('Error fetching user preferences:', error)
    }
  }

  const fetchGroupData = async () => {
    const groupsData = await loadGroups(userId)
    setExistingGroups(groupsData)
  }

  React.useEffect(() => {
    const fetchData = async () => {
      const chatsData = await loadChats(userId)
      setChats(chatsData)
    }
    fetchData()
  }, [userId])

  React.useEffect(() => {
    if (isOpen) {
      fetchUserData()
      fetchGroupData()
    }
  }, [isOpen, userId])

  const handleAddMember = async () => {
    if (memberInput === userId) {
      setMemberError('You are already part of any groups you make! :)')
      return
    }

    if (addedMembers.some((member) => member.id === memberInput)) {
      setMemberError('Member already added')
      return
    }
    
    try {
      const { userData, preferences } = await getUserAndPreferences(memberInput)
      if (userData) {
        setAddedMembers([...addedMembers, userData])
        setLocation(location || userData.location)
        setRestrictions(preferences ? [...new Set([...restrictions, ...preferences])] : restrictions)        
        setMemberInput('')
        setMemberError('')
      } else {
        setMemberError('Invalid user')
      }
    } catch (error) {
      console.error('Error getting user:', error)
      setMemberError('An error occurred while getting the user')
    }
  }

  const handleCreateChat = async () => {
    if (!chatName.length) {
      toast.error('Please enter a chat name')
      return
    }

    if (!location.length) {
      toast.error('Please enter a location')
      return
    }

    if ((groupTitle && !addedMembers.length) || (!groupTitle && addedMembers.length)) {
      setGroupError('Both group title and members should be provided')
      return
    }

    let groupId = null;
    let userIds = [userId];
    try {
      if (!selectedGroup && groupTitle && addedMembers.length) {
        userIds = addedMembers.map((member) => member.id);
        userIds.push(userId); 
        groupId = await createGroup({ name: groupTitle, userIds });
      } else if (selectedGroup) {
        userIds = await getGroupUsers(selectedGroup);
        groupId = selectedGroup;
      }

      const groupChatDetails = await createGroupChatDetails({
        location,
        title: chatName,
        preferences: restrictions,
        priceRange,
      })
      const groupChatDetailsId = groupChatDetails.id
      let currentUserChatId = null;
      for (const user of userIds) {
        const chat = await createChat({
          userId: user,
          groupId,
          groupChatDetailsId,    
        });
        if (user === userId) {
          currentUserChatId = chat.id;
        }
      }

      resetFields()
      const updatedChats = await loadChats(userId)
      setChats(updatedChats)
      setIsOpen(false)
      
      router.push(`/chat/${currentUserChatId}`)
    } catch (error) {
      console.error('Error creating chat:', error)
      toast.error('An error occurred while creating the chat')
    }
  }

  const resetFields = () => {
    setLocation('')
    setRestrictions([])
    setPriceRange('')
    setSelectedGroup('')
    setAddedGroups([])
    setGroupTitle('')
    setMemberInput('')
    setAddedMembers([])
    setMemberError('')
    setGroupError('')
    setChatName('') 
  }

  const handleGroupSelect = async (groupId: string) => {
    try {
      setSelectedGroup(groupId);
      
      const preferences = await getPreferencesForGroup(groupId);
      
      setRestrictions(preferences ? [...new Set([...restrictions, ...preferences])] : restrictions)        
    } catch (error) {
      console.error('Error fetching group preferences:', error);
    }
  };
  

  const handleMemberInputKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      await handleAddMember()
    }
  }

  const handleAddRestriction = () => {
    if (newRestriction.trim() !== '') {
      setRestrictions([...restrictions, newRestriction.trim()])
      setNewRestriction('')
    }
  }

  const handleRemoveRestriction = (index: number) => {
    const updatedRestrictions = [...restrictions]
    updatedRestrictions.splice(index, 1)
    setRestrictions(updatedRestrictions)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 my-4">
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            buttonVariants({ variant: 'secondary' }),
            'h-10 w-full justify-start bg-zinc-50 px-4 shadow-none transition-colors hover:bg-zinc-200/40 dark:bg-zinc-900 dark:hover:bg-zinc-300/10'
          )}
        >
          <IconPlus className="-translate-x-2 stroke-2" />
          New Chat
        </Button>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          {chats?.length ? (
            <div className="space-y-2 px-4">
                  <SidebarItems chats={chats} />
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No chat history</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <ClearHistory clearChats={clearChats} isEnabled={chats?.length > 0} />
        </div>
      </div>
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          resetFields()
        }
      }}>
        <DialogContent className="sm:max-w-[720px] space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Create New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-8">
            <div>
              <div className="space-y-4">
              <div className="flex items-center space-x-4">
                  <Label htmlFor="chatName" className="w-1/4 text-sm font-medium">
                    Chat Name
                  </Label>
                  <Input
                    id="chatName"
                    value={chatName}
                    onChange={(e) => setChatName(e.target.value)}
                    className="flex-1"
                    placeholder="Enter a name for the chat"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="location" className="w-1/4 text-sm font-medium">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1"
                    placeholder="Enter location"
                  />
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-1/4">
                    <Label htmlFor="restrictions" className="text-sm font-medium">
                      Restrictions/Preferences
                    </Label>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center space-x-4">
                      <Input
                        id="newRestriction"
                        value={newRestriction}
                        onChange={(e) => setNewRestriction(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddRestriction()
                          }
                        }}
                        className="flex-1"
                        placeholder="Enter restrictions/preferences"
                      />
                      <Button onClick={handleAddRestriction}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                  {restrictions.map((restriction, index) => (
                    <div key={index} className="flex items-center bg-gray-200 rounded-md px-2 py-1">
                      <span>{restriction}</span>
                      <button
                        onClick={() => handleRemoveRestriction(index)}
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
                <div className="flex items-center space-x-4">
                  <Label htmlFor="priceRange" className="w-1/4 text-sm font-medium">
                    Price Range
                  </Label>
                  <Input
                    id="priceRange"
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="flex-1"
                    placeholder="Enter price range"
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Add Existing Group</h3>
                <select
                  value={selectedGroup}
                  onChange={(e) => handleGroupSelect(e.target.value)}
                  className="w-full max-w-xs px-4 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                >
                  <option value="">Select a group</option>
                  {existingGroups?.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-lg font-medium">Create Group</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Label htmlFor="groupTitle" className="w-1/4 text-sm font-medium">
                    Name
                  </Label>
                  <Input
                    id="groupTitle"
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    className={cn('flex-1', {
                      'text-gray-400': !!selectedGroup,
                    })}
                    placeholder="Enter a name for the group"
                    disabled={!!selectedGroup}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="memberInput" className="w-1/4 text-sm font-medium">
                    Add Member
                  </Label>
                  <div className="flex items-center justify-between flex-1 space-x-4">
                    <Input
                      id="memberInput"
                      value={memberInput}
                      onChange={(e) => setMemberInput(e.target.value)}
                      onKeyDown={handleMemberInputKeyDown}
                      className={cn('flex-1', {
                        'text-gray-400': !!selectedGroup,
                      })}
                      placeholder="Enter member"
                      disabled={!!selectedGroup}
                    />
                    <Button onClick={handleAddMember} disabled={!!selectedGroup}>
                      Add
                    </Button>
                  </div>
                </div>
                {memberError && <p className="text-sm text-red-500">{memberError}</p>}
                {groupError && <p className="text-sm text-red-500">{groupError}</p>}
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex -space-x-2">
                    {addedMembers.map((member) => (
                      <Image
                        key={member.id}
                        src={member.image}
                        alt={member.name}
                        width={40}
                        height={40}
                        className={cn(
                          'rounded-full border-2 border-white dark:border-gray-800',
                          { 'opacity-50': !!selectedGroup }
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleCreateChat}>
              Create Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-[640px] space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Added Members</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4">
            {addedMembers.map((member) => (
              <div key={member.id} className="flex flex-col items-center space-y-2">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-20 h-20 rounded-full border-2 border-white dark:border-gray-800"
                />
                <p className="text-sm font-medium">{member.name}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowMembersDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}