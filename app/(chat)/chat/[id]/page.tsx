import { type Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { auth } from '@/auth'
import { getChat, getAllPinsForGroup } from '@/app/actions'
import ChatAndMapPage from '@/components/chat-and-map-page'

export interface ChatPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({
  params
}: ChatPageProps): Promise<Metadata> {
  const session = await auth()

  if (!session?.user) {
    return {}
  }

  const {chat, _} = await getChat(params.id, session.user.id)
  return {
    title: chat?.title.toString().slice(0, 50) ?? 'Chat'
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = await auth()

  if (!session?.user) {
    redirect(`/sign-in?next=/chat/${params.id}`)
  }

  const chatData = await getChat(params.id, session.user.id)

  if (!chatData) {
    notFound()
  }

  const {chat, groupChatDetails} = chatData;

  if (chat?.userId !== session?.user?.id) {
    notFound()
  }
  return (
    <ChatAndMapPage id={chat.id} initialMessages={chat.messages} groupChatDetailsId={chat.groupChatDetailsId} user={session.user} location={groupChatDetails.location}/>
  );

}
