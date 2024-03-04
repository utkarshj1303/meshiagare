'use client'

import { useChat, type Message } from 'ai/react'
import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'react-hot-toast'
import { usePathname, useRouter } from 'next/navigation'
import { ScrollIndicator } from './scroll-indicator';
import { useRef } from 'react';

const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string,
  userRestaurantNames: Set<string>
  isSignInPage:boolean,
  groupChatDetailsId?: string
  userId?: string
}

export function Chat({ id, userId, initialMessages, className, groupChatDetailsId, isSignInPage=false }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      initialMessages,
      id,
      body: {
        id,
        previewToken,
      },
      onResponse(response) {
        if (response.status === 401) {
          toast.error(response.statusText)
        }
      },
      onFinish() {
        if (!path.includes('chat') && userId) {
          window.history.pushState({}, '', `/chat/${id}`);
          window.location.reload();
        }
      }
    })

  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const scrollableRefPosition = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <div className={cn('flex flex-col w-full relative', className)}>
        {/* Ensure the parent container takes full width */}
        <div ref={scrollableRef} className="flex-1 w-full overflow-y-auto scrollbar-hidden relative">
          {/* Remove overflow-x-auto to prevent horizontal scrolling */}
          {messages.length ? (
            <>
              <ChatList messages={messages} userId={userId} groupChatDetailsId={groupChatDetailsId}/>
              <ChatScrollAnchor trackVisibility={isLoading} />
            </>
          ) : (
            <EmptyScreen setInput={setInput} isSignInPage={isSignInPage} />
          )}
        </div>
        <div ref={scrollableRefPosition}>
          <ChatPanel
            id={id}
            isLoading={isLoading}
            stop={stop}
            append={append}
            reload={reload}
            messages={messages}
            input={input}
            setInput={setInput}
          />
        </div>
        <ScrollIndicator scrollableRef={scrollableRef} scrollableRefPosition={scrollableRefPosition} messages={messages} />
        </div>

      <Dialog open={previewTokenDialog} onOpenChange={setPreviewTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your OpenAI Key</DialogTitle>
            <DialogDescription>
              If you have not obtained your OpenAI API key, you can do so by{' '}
              <a
                href="https://platform.openai.com/signup/"
                className="underline"
              >
                signing up
              </a>{' '}
              on the OpenAI website. This is only necessary for preview
              environments so that the open source community can test the app.
              The token will be saved to your browser&apos;s local storage under
              the name <code className="font-mono">ai-token</code>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={previewTokenInput}
            placeholder="OpenAI API key"
            onChange={e => setPreviewTokenInput(e.target.value)}
          />
          <DialogFooter className="items-center">
            <Button
              onClick={() => {
                setPreviewToken(previewTokenInput)
                setPreviewTokenDialog(false)
              }}
            >
              Save Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}