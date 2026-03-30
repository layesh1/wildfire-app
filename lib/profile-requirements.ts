/** Consumer (evacuee) flows need a profile home address for hub + Flameo anchor. */
export function requiresConsumerHomeAddress(role: string): boolean {
  return role === 'evacuee' || role === 'caregiver'
}
