export interface Mention {
  id: string;
  source: string;
  content: string;
  date: string;
  author: string;
  reach: number;
}

export const MOCK_MENTIONS: Mention[] = [
  {
    id: "0",
    source: "Google Review",
    author: "Alex Rivera",
    content: "Discovered Kana Coffee during my trip. The atmosphere is so cozy and the latte art is amazing!",
    date: "2025-07-20T11:00:00Z",
    reach: 2100
  },
  {
    id: "1",
    source: "Instagram",
    author: "@coffee_lover_99",
    content: "Just tried the new Kana Coffee cold brew. Absolutely smooth and the packaging is 10/10! #KanaCoffee",
    date: "2025-08-15T10:30:00Z",
    reach: 1200
  },
  {
    id: "2",
    source: "Instagram",
    author: "daily_grind",
    content: "Kana Coffee's Ethiopian blend is a bit too acidic for my taste, but the aroma is incredible.",
    date: "2025-09-10T14:15:00Z",
    reach: 5400
  },
  {
    id: "3",
    source: "Google Review",
    author: "Sarah Jenkins",
    content: "Kana Coffee raises the bar for sustainable sourcing. A major win for ethical coffee lovers.",
    date: "2025-10-05T09:00:00Z",
    reach: 4500
  },
  {
    id: "4",
    source: "TikTok",
    author: "u/caffeine_addict",
    content: "Is it just me or has Kana Coffee's shipping been slower lately? Took 10 days for my last bag to arrive.",
    date: "2025-11-20T16:45:00Z",
    reach: 8000
  },
  {
    id: "5",
    source: "Google Review",
    author: "Michael Chen",
    content: "The subscription model is so convenient. Never running out of fresh beans again!",
    date: "2025-12-12T11:20:00Z",
    reach: 1200
  },
  {
    id: "6",
    source: "Instagram",
    author: "@barista_pro",
    content: "The roast consistency at Kana Coffee is unmatched. Every batch is perfect.",
    date: "2025-12-25T15:10:00Z",
    reach: 3200
  },
  {
    id: "7",
    source: "TikTok",
    author: "James W.",
    content: "Customer service was very helpful when my order got lost. They sent a replacement immediately with some free samples.",
    date: "2025-11-05T13:00:00Z",
    reach: 15000
  }
];
