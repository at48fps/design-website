/** The eight frames on the film strip (photos, magazine cover, journal spread, social wall). Swap images / copy here. */
export type FrameLayoutKind = 'photo' | 'magazine-cover' | 'editorial-spread' | 'social-contact';

export interface FilmFrameItem {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  story: string;
  imageUrl: string;
  secondaryImageUrl?: string;
  layoutKind: FrameLayoutKind;
  location: string;
  filmStock: string;
  lens: string;
  year: string;
  accentColor: string;
}

export const INITIAL_FILM_FRAMES: FilmFrameItem[] = [
  {
    id: 0,
    code: '01A',
    title: 'Alabaster Studio Study',
    subtitle: 'Quiet morning light in neutral tones',
    story:
      'Shot beside a north-facing steel casement window before noon. Minimalist monochrome tailoring meets warm natural shadows on medium-grain 35mm stock.',
    imageUrl: '/images/film/iara/studio_portrait.jpg',
    layoutKind: 'photo',
    location: 'Mumbai Studio',
    filmStock: 'Kodak Portra 400',
    lens: '50mm f/1.8',
    year: '2026',
    accentColor: '#9b968e',
  },
  {
    id: 1,
    code: '02A',
    title: 'Editorial Feature — Issue 09',
    subtitle: 'Print monograph cover & profile notes',
    story:
      'An editorial monograph exploring contemporary visual identity, analog tactile aesthetics, and the resurgence of physical print photography in modern fashion storytelling.',
    imageUrl: '/images/film/iara/editorial_closeup.jpg',
    secondaryImageUrl: '/images/film/iara/studio_portrait.jpg',
    layoutKind: 'magazine-cover',
    location: 'New Delhi Press',
    filmStock: 'Ilford Delta 400',
    lens: '85mm f/2.0',
    year: '2026',
    accentColor: '#1f2328',
  },
  {
    id: 2,
    code: '03A',
    title: 'Field Notes & Proof Sheet',
    subtitle: 'Behind the frames — essay & contact excerpts',
    story:
      'A curated double-column journal excerpt documenting morning rituals, natural lighting notes, and contact-sheet selects from a three-week autumn residency.',
    imageUrl: '/images/film/iara/matcha_doorway.jpg',
    secondaryImageUrl: '/images/film/iara/cafe_afternoon.jpg',
    layoutKind: 'editorial-spread',
    location: 'Jaipur Archive',
    filmStock: 'Kodak Gold 200',
    lens: '35mm f/2.0',
    year: '2026',
    accentColor: '#c48f5a',
  },
  {
    id: 3,
    code: '04A',
    title: 'Sandstone & Matcha Hour',
    subtitle: 'Carved teak doorway in golden afternoon glare',
    story:
      'Captured in late afternoon sandstone warmth as low sun grazed centuries-old carved wooden panels. Unposed, luminous, and framed for natural color depth.',
    imageUrl: '/images/film/iara/matcha_doorway.jpg',
    layoutKind: 'photo',
    location: 'Jaipur Old Quarter',
    filmStock: 'Kodak Portra 400',
    lens: '35mm f/1.4',
    year: '2026',
    accentColor: '#c28d4b',
  },
  {
    id: 4,
    code: '05A',
    title: 'Baseline — Pastel Court',
    subtitle: 'Mint acrylic, terracotta clay, and crisp daylight',
    story:
      'A graphic color study between sunlit mint-green court surfaces and terracotta borders, balancing relaxed athletic poise with geometric court lines.',
    imageUrl: '/images/film/iara/tennis_editorial.jpg',
    layoutKind: 'photo',
    location: 'Bandstand Club',
    filmStock: 'CineStill 50D',
    lens: '50mm f/2.0',
    year: '2026',
    accentColor: '#4c9e84',
  },
  {
    id: 5,
    code: '06A',
    title: 'Digital Dispatch — Contact Wall',
    subtitle: 'Curated social frames & behind-the-scenes selects',
    story:
      'A visual collage pairing candid mobile captures, polaroid contact strips, and color-graded stills from the autumn campaign rollout.',
    imageUrl: '/images/film/iara/tennis_editorial.jpg',
    secondaryImageUrl: '/images/film/iara/golden_terrace.jpg',
    layoutKind: 'social-contact',
    location: 'Editorial Desk',
    filmStock: 'Fuji Pro 400H',
    lens: '40mm f/2.0',
    year: '2026',
    accentColor: '#d04a42',
  },
  {
    id: 6,
    code: '07A',
    title: 'Terrace Espresso & Shade',
    subtitle: 'Dappled olive-tree light at a coastal bistro',
    story:
      'Unscripted laughter across a cool marble table, surrounded by terracotta planters and Mediterranean afternoon breeze.',
    imageUrl: '/images/film/iara/cafe_afternoon.jpg',
    layoutKind: 'photo',
    location: 'Amalfi Terrace',
    filmStock: 'Kodak Portra 800',
    lens: '35mm f/1.8',
    year: '2026',
    accentColor: '#8f6d52',
  },
  {
    id: 7,
    code: '08A',
    title: 'Limestone Twilight Horizon',
    subtitle: 'Monochrome resort linen overlooking dusk water',
    story:
      'The closing frame of the roll: warm horizon rim-light catching travertine steps as evening settles softly over the cliffside coast.',
    imageUrl: '/images/film/iara/golden_terrace.jpg',
    layoutKind: 'photo',
    location: 'Positano Cliffs',
    filmStock: 'Kodak Portra 160',
    lens: '50mm f/1.4',
    year: '2026',
    accentColor: '#6d8299',
  },
];
