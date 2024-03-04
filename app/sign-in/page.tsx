import { auth } from '@/auth'
import ChatAndMapPage from '@/components/chat-and-map-page'
import { redirect } from 'next/navigation'
import { nanoid } from 'nanoid'

export default async function SignInPage() {
  const session = await auth()

  // redirect to home if user is already logged in
  if (session?.user) {
    redirect('/')
  }

  const id = nanoid();

  // Add styles to make the page take up the full viewport
  const pageStyle = {
    height: '93dvh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'fixed'
  };

  return (
    <div style={pageStyle}>
        <ChatAndMapPage id={id} isSignInPage={true}/>
    </div>
  );
}