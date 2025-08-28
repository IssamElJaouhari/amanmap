// Simple profanity filter for MVP
// In production, use a more comprehensive solution

const profanityWords = [
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap',
  'piss', 'cock', 'dick', 'pussy', 'whore', 'slut', 'nigger',
  'faggot', 'retard', 'cunt', 'twat', 'motherfucker'
]

export function containsProfanity(text: string): boolean {
  if (!text) return false
  
  const lowerText = text.toLowerCase()
  return profanityWords.some(word => lowerText.includes(word))
}

export function filterProfanity(text: string): string {
  if (!text) return text
  
  let filtered = text
  profanityWords.forEach(word => {
    const regex = new RegExp(word, 'gi')
    filtered = filtered.replace(regex, '*'.repeat(word.length))
  })
  
  return filtered
}
