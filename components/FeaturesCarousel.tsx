'use client'
import { Bell, Map, MessageCircle, Languages, Shield, ClipboardList } from 'lucide-react'
import { OfferCarousel, type Offer } from '@/components/ui/offer-carousel'

const features: Offer[] = [
  {
    id: 1,
    imageSrc: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop&q=80',
    imageAlt: 'Wildfire at night in a forest',
    tag: 'Alerts',
    title: 'Real-Time Wildfire Alerts',
    description: 'Get notified the moment a fire is detected near your loved ones — before official orders are issued.',
    brandName: 'Minutes Matter',
    href: '/auth/login?mode=signup',
    icon: <Bell className="w-4 h-4" />,
  },
  {
    id: 2,
    imageSrc: 'https://images.unsplash.com/photo-1476842634003-7dcca8f832de?w=600&auto=format&fit=crop&q=80',
    imageAlt: 'Aerial map view of roads and terrain',
    tag: 'Navigation',
    title: 'Evacuation Route Guidance',
    description: 'Accessible, turn-by-turn routes optimised for those who need more time to move.',
    brandName: 'Safe Path',
    href: '/auth/login?mode=signup',
    icon: <Map className="w-4 h-4" />,
  },
  {
    id: 3,
    imageSrc: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=600&auto=format&fit=crop&q=80',
    imageAlt: 'Person using a smartphone chat app',
    tag: 'AI Assistant',
    title: 'Flameo AI',
    description: 'Ask anything. Flameo helps you plan, prioritise, and act — in plain language, any time.',
    brandName: 'Flameo',
    href: '/auth/login?mode=signup',
    icon: <MessageCircle className="w-4 h-4" />,
  },
  {
    id: 4,
    imageSrc: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&auto=format&fit=crop&q=80',
    imageAlt: 'Diverse group of people communicating',
    tag: 'Accessibility',
    title: '30+ Language Support',
    description: 'Emergency information in the language your family speaks — no barriers when it counts.',
    brandName: 'Multilingual',
    href: '/auth/login?mode=signup',
    icon: <Languages className="w-4 h-4" />,
  },
  {
    id: 5,
    imageSrc: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&auto=format&fit=crop&q=80',
    imageAlt: 'Person checking in on an elderly relative',
    tag: 'Check-Ins',
    title: 'Caregiver Check-In Tools',
    description: 'Confirm your loved ones are safe with one tap. Know immediately if they need help.',
    brandName: 'Stay Connected',
    href: '/auth/login?mode=signup',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    id: 6,
    imageSrc: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&auto=format&fit=crop&q=80',
    imageAlt: 'Go-bag and emergency supplies laid out',
    tag: 'Preparation',
    title: 'Go-Bag & Prep Checklists',
    description: 'Personalised checklists so you and your family are ready before an emergency starts.',
    brandName: 'Be Ready',
    href: '/auth/login?mode=signup',
    icon: <ClipboardList className="w-4 h-4" />,
  },
]

export function FeaturesCarousel() {
  return <OfferCarousel offers={features} />
}
