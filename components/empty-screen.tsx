import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
//  {
//    heading: 'It\'s 1AM and we want some cookies, help?',
//    message: 'It\'s 1AM and we want some cookies, help?'
//  },
  {
    heading: 'Where can I get some vegetarian pho?',
    message: 'Where can I get some vegetarian pho?'
  },
  {
    heading: 'I\'m craving indian street food, help me find some AUTHENTIC pani puri?',
    message: 'I\'m craving indian street food, help me find some AUTHENTIC pani puri?'
  },
  {
    heading: 'Lowkey places for a team lunch which is gluten free?',
    message: 'Lowkey places for a team lunch which is gluten free?'
  },
  {
    heading: 'I want to find a place with a view for my aniversary, what are my options?',
    message: 'I want to find a place with a view for my aniversary, what are my options?'
  },
  {
    heading: 'Help us find a bottomless brunch place?',
    message: 'Help us find a bottomless brunch place?'
  },
//  {
//    heading: 'IDK, HELP ME DECIDE!',
//    message: `I need help deciding. Can you suggest some new and trending restaurants and some lesser known hidden gems?`
//  }
]

export function EmptyScreen({ setInput, isSignInPage }: Pick<UseChatHelpers, 'setInput'>) {
  const heading = isSignInPage
    ? 'Sign in to set up preferences, create groups and find places to eat together!'
    : '';
  
  const additionalText = isSignInPage
    ? ''
    : ` After everyone's voted, ask me for the group's top choice!`;

  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold">{heading}</h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          Hey, I&apos;m Meshiagare, powered by{' '}
          <ExternalLink href="https://www.perplexity.ai/">Perplexity</ExternalLink>,
          I can scour the internet to help you and your friends find new places to eat! :)
          Click on the suggestions within my responses to learn more about each restaurant.
          Make sure to contact the restaurant and verify that they meet your requirements.
          {additionalText}
        </p>
        <p className="leading-normal text-muted-foreground">
          Get started with the following examples:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base text-left"
              onClick={() => setInput(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}