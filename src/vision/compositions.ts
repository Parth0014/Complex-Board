export function compositionGoals(theme: string): string[] {
  const goals: Record<string, string[]> = {
    Career: [
      'Find meaningful work',
      'Learn a new skill',
      'Lead with confidence',
      'Build a thriving business',
      'Celebrate milestones',
      'Create work-life balance',
    ],
    Fitness: [
      'Move every day',
      'Build strength',
      'Nourish my body',
      'Sleep peacefully',
      'Spend time outdoors',
      'Feel energized',
    ],
    Travel: [
      'Explore Japan',
      'Visit the mountains',
      'Relax by the ocean',
      'Discover new cultures',
      'Travel with loved ones',
      'Make lifelong memories',
    ],
    'Financial Goals': [
      'Build financial freedom',
      'Grow my savings',
      'Invest in my future',
      'Buy my dream home',
      'Reduce debt',
      'Give generously',
    ],
    Relationships: [
      'Connect with family',
      'Nurture friendships',
      'Create loving rituals',
      'Be present',
      'Share adventures',
      'Build a happy home',
    ],
    'Personal Growth': [
      'Read and learn',
      'Practice gratitude',
      'Find inner peace',
      'Build confidence',
      'Try something new',
      'Make time for reflection',
    ],
    Education: [
      'Graduate with pride',
      'Master my craft',
      'Build a study routine',
      'Explore new ideas',
      'Find a mentor',
      'Open new doors',
    ],
    Manifestation: [
      'Trust my journey',
      'Welcome abundance',
      'Live with purpose',
      'Create my dream life',
      'Grow every day',
      'Celebrate who I am',
    ],
  };
  return (
    goals[theme] || [
      'Grow my career',
      'Travel and explore',
      'Prioritize health',
      'Build financial freedom',
      'Connect with family',
      'Find peace',
    ]
  );
}
