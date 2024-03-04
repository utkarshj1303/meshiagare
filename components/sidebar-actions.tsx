'use client'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'react-hot-toast'
import { ServerActionResult, type Chat } from '@/lib/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { IconSpinner, IconTrash } from '@/components/ui/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FiMoreVertical } from 'react-icons/fi'
import Image from 'next/image'
import {
  getGroupChatDetails,
  getGroupUsers,
  getUsers,
  updateGroupChatTitle,
  addGroupChatPreferences,
  removeGroupChatPreferences,
  updateGroupChatLocation,
  updateGroupChatPriceRange,
} from '@/app/actions'

interface SidebarActionsProps {
  chat: Chat
  removeChat: (args: { id: string; path: string }) => ServerActionResult<void>
}

export function SidebarActions({ chat, removeChat }: SidebarActionsProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = React.useState(false)
  const [isRemovePending, startRemoveTransition] = React.useTransition()

  const [chatName, setChatName] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [restrictions, setRestrictions] = React.useState([])
  const [newRestriction, setNewRestriction] = React.useState('')
  const [priceRange, setPriceRange] = React.useState('')
  const [members, setMembers] = React.useState([])

  React.useEffect(() => {
    const fetchData = async () => {
      if (settingsDialogOpen) {
        // Fetch chat details and set the state variables
        const groupChatDetails = (await getGroupChatDetails(chat.groupChatDetailsId))
        setChatName(groupChatDetails.title)
        setLocation(groupChatDetails.location)
        setRestrictions(groupChatDetails.preferences || [])
        setPriceRange(groupChatDetails.priceRange)

        // Fetch group members
        const groupUsers = await getGroupUsers(chat.groupId)
        const users = await getUsers(groupUsers)
        setMembers(users)
      }
    }

    fetchData()
  }, [settingsDialogOpen, chat])

  const handleAddRestriction = async () => {
    if (newRestriction.trim() !== '') {
      try {
        await addGroupChatPreferences(chat.groupChatDetailsId, newRestriction.trim())
        setNewRestriction('')
        setRestrictions([...restrictions, newRestriction.trim()])
        toast.success('Preference added')
      } catch (error) {
        console.error('Error adding preference:', error)
        toast.error('An error occurred while adding preference')
      }
    }
  }

  const handleRemoveRestriction = async (preference: string) => {
    try {
      await removeGroupChatPreferences(chat.groupChatDetailsId, preference)
      setRestrictions(restrictions.filter((item) => item !== preference))
      toast.success('Preference removed')
    } catch (error) {
      console.error('Error removing preference:', error)
      toast.error('An error occurred while removing preference')
    }
  }

  const handleUpdateChatTitle = async () => {
    try {
      await updateGroupChatTitle(chat.groupChatDetailsId, chatName)
      toast.success('Chat title updated')
    } catch (error) {
      console.error('Error updating chat title:', error)
      toast.error('An error occurred while updating chat title')
    }
  }


  const handleUpdatePriceRange = async () => {
    try {
      await updateGroupChatPriceRange(chat.groupChatDetailsId, priceRange)
      toast.success('Price range updated')
    } catch (error) {
      console.error('Error updating price range:', error)
      toast.error('An error occurred while updating price range')
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="size-6 p-0 hover:bg-background">
            <FiMoreVertical />
            <span className="sr-only">Chat Settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={isRemovePending}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={settingsDialogOpen} onOpenChange={(open) => {
        setSettingsDialogOpen(open)
        if (!open) {
          // Reset fields when dialog is closed
          setChatName('')
          setLocation('')
          setRestrictions([])
          setPriceRange('')
        }
      }}>
      <DialogContent className="sm:max-w-[720px] space-y-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Chat Settings</DialogTitle>
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
                <Button onClick={handleUpdateChatTitle} className="w-24">Update</Button>
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
                <Button onClick={handleUpdatePriceRange} className="w-24">Update</Button>
              </div>
            </div>
          </div>
          <div>
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
                  <Button onClick={handleAddRestriction} className="w-24">
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
              <div>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="location" className="w-1/4 text-sm font-medium">
                    Location
                  </Label>
                  <span className="flex-1">{location}</span>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-medium">Members</h3>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex -space-x-2">
                    {members.map((member) => (
                      <Image
                        key={member.id}
                        src={member.image}
                        alt={member.name}
                        width={40}
                        height={40}
                        className="rounded-full border-2 border-white dark:border-gray-800"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setSettingsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your chat message and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemovePending}
              onClick={(event) => {
                event.preventDefault()
                // @ts-ignore
                startRemoveTransition(async () => {
                  const result = await removeChat({ id: chat.id, path: chat.path })
                  if (result && 'error' in result) {
                    toast.error(result.error)
                    return
                  }
                  setDeleteDialogOpen(false)
                  router.refresh()
                  router.push('/')
                  toast.success('Chat deleted')
                })
              }}
            >
              {isRemovePending && <IconSpinner className="mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}