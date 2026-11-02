export const STEPS = [
  {
    num: '01',
    title: 'Search',
    text: 'Browse by service, category, or place — including openings near you.',
  },
  {
    num: '02',
    title: 'Claim a slot',
    text: 'Pick from live calendar openings and confirm in seconds.',
  },
  {
    num: '03',
    title: 'Keep it tidy',
    text: 'Reschedule, pay, and manage every visit in one place.',
  },
];

export const CAPABILITIES = [
  {
    icon: 'fa-calendar-check',
    title: 'Live availability',
    text: 'Slots stay synced with staff calendars so you book what is actually open.',
  },
  {
    icon: 'fa-shield-halved',
    title: 'Conflict-safe booking',
    text: 'Double-booking protection is built into every reservation — for you and the provider.',
  },
  {
    icon: 'fa-credit-card',
    title: 'Flexible payments',
    text: 'Checkout with Stripe when available, or settle calmly at the venue.',
  },
  {
    icon: 'fa-store',
    title: 'Solo or multi-branch',
    text: 'Individuals list their craft. Businesses run teams, packages, and peak pricing together.',
  },
  {
    icon: 'fa-comments',
    title: 'Requests & quotes',
    text: 'Ask for custom work, compare quotes, and turn accepted offers into booked jobs.',
  },
  {
    icon: 'fa-circle-check',
    title: 'Verified listings',
    text: 'Businesses go through verification so customers can book with clearer trust signals.',
  },
];

export const TRUST_STATS = [
  { value: 'Live', label: 'Calendar openings' },
  { value: '3', label: 'Account paths' },
  { value: 'Safe', label: 'Conflict-free slots' },
  { value: '1', label: 'Shared workspace' },
];

export const PATHS = [
  {
    title: 'Customer',
    text: 'Discover nearby services, book honest openings, and manage visits without the chase.',
    href: '/auth/register?role=customer',
    cta: 'Create free account',
    icon: 'fa-user',
  },
  {
    title: 'Individual',
    text: 'Offer your own services with a clear profile, service areas, and bookings that stay yours.',
    href: '/auth/register?role=individual',
    cta: 'Start as a professional',
    icon: 'fa-screwdriver-wrench',
  },
  {
    title: 'Business',
    text: 'List venues, invite staff, set peak pricing, and fill the week from one dashboard.',
    href: '/auth/register?role=business',
    cta: 'List your business',
    icon: 'fa-store',
  },
];

export const VOICES = [
  {
    quote: 'I stopped chasing confirmation texts. Clients book the openings I actually have.',
    name: 'Amina R.',
    role: 'Independent stylist',
  },
  {
    quote: 'Branches and staff finally share one calendar. Peak pricing is clear before checkout.',
    name: 'Omar K.',
    role: 'Clinic owner',
  },
  {
    quote: 'Finding a verified spot near me and locking a time used to take forever. Now it is one search.',
    name: 'Sara L.',
    role: 'Customer',
  },
];

export const FAQ = [
  {
    q: 'Is Duemet free for customers?',
    a: 'Yes — browsing, booking, rescheduling, and reviews are free for customers. Businesses and individuals can list and start filling slots at no upfront cost.',
  },
  {
    q: 'What is the difference between individual and business?',
    a: 'Individuals offer their own services without a staffed venue. Businesses manage branches, teams, and shared operations — both use Duemet booking tools.',
  },
  {
    q: 'Can I pay at the venue?',
    a: 'Yes. Many listings offer pay-at-venue alongside online checkout when Stripe is configured.',
  },
  {
    q: 'How do staff invites work?',
    a: 'Business owners send email invites. Staff accept, set a password, and land in the dashboard with the right permissions.',
  },
  {
    q: 'Do I need an account to explore?',
    a: 'You can browse Explore freely. Creating an account unlocks booking, saved favorites, and visit history.',
  },
];

export const PROVIDER_POINTS = [
  'Live availability & staff calendars',
  'Peak pricing shown before checkout',
  'Packages, gallery, and service areas',
  'Requests, quotes, and job tracking',
  'Online pay or pay at the venue',
  'Verification for trusted listings',
];

export const STORY_POINTS = [
  'Live slots instead of guesswork',
  'Verified businesses and independents',
  'Pay online or at the venue',
  'Reschedule without the phone tag',
  'Favorites, history, and reminders in one place',
];
