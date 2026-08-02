// VISUAILS — the standard model roster.
//
// WHY THIS FILE EXISTS
// Task #268 restored /models as a real page after Lucas asked for the
// standard-models entry point back (see AUDIT-TASK-0.md §H·8 for the
// original merge and its reasoning, and the note appended there on
// 2026-07-29 for why it un-merged). Before this file existed, the ten-model
// roster was typed once, inline, inside BrandModelPage.astro. Splitting the
// roster across two pages without a shared source would have meant editing
// the same ten names and photo paths in two files every time one changes —
// exactly the kind of drift src/data/pricing.js exists to prevent for euro
// figures. This is that same discipline for the model roster.
//
// Names and traits are ours, not clients' — the "never invent client names"
// rule is about attribution, and nothing here is attributed to anyone. The
// photos are our own output.
// `w`/`h` are the file's INTRINSIC pixel size, and they are here rather than
// typed at each call site because they were being typed at each call site and
// getting it wrong: /models declared 600x750 for a 1195x1600 file, the
// homepage rail declared 800x1071 for all ten when only Rae is that size.
// Nothing looked squashed — every one of them is object-fit: cover — but the
// box the browser reserved before the bytes landed had the wrong aspect ratio,
// which is layout shift on exactly the images a visitor is looking at.
// Rae is genuinely a different size from the other nine. That is the reason
// this cannot be one shared constant.
export const ROSTER = [
  { name: 'Aaron',  photo: '/img/model-aaron.webp',  traits: ['warm', 'approachable'], w: 1195, h: 1600 },
  { name: 'Ava',    photo: '/img/model-ava.webp',    traits: ['editorial', 'elegant'], w: 1195, h: 1600 },
  { name: 'Elias',  photo: '/img/model-elias.webp',  traits: ['refined', 'classic'], w: 1195, h: 1600 },
  { name: 'Ryan',   photo: '/img/model-ryan.webp',   traits: ['sporty', 'energetic'], w: 1195, h: 1600 },
  { name: 'Dana',   photo: '/img/model-dana.webp',   traits: ['confident', 'modern'], w: 1195, h: 1600 },
  { name: 'Lisa',   photo: '/img/model-lisa.webp',   traits: ['natural', 'approachable'], w: 1195, h: 1600 },
  { name: 'Maegan', photo: '/img/model-maegan.webp', traits: ['bold', 'statement'], w: 1195, h: 1600 },
  { name: 'Rae',    photo: '/img/model-rae.webp',    traits: ['soft', 'understated'], w: 800, h: 1071 },
  { name: 'Fabi',   photo: '/img/model-fabi.webp',   traits: ['clean', 'contemporary'], w: 1195, h: 1600 },
  { name: 'Seme',   photo: '/img/model-seme.webp',   traits: ['sharp', 'editorial'], w: 1195, h: 1600 },
];

// Trait keys -> label, per language. Kept here rather than duplicated in
// every page's own COPY object for the same reason ROSTER is centralized:
// two pages now render every trait key in ROSTER above, and a trait added to
// one roster entry without a matching label here would render blank rather
// than fail loudly, so keeping the two arrays beside each other is the
// point.
export const TRAITS = {
  en: {
    warm: 'Warm', approachable: 'Approachable', editorial: 'Editorial', elegant: 'Elegant',
    refined: 'Refined', classic: 'Classic', sporty: 'Sporty', energetic: 'Energetic',
    confident: 'Confident', modern: 'Modern', natural: 'Natural', bold: 'Bold',
    statement: 'Statement', soft: 'Soft', understated: 'Understated', clean: 'Clean',
    contemporary: 'Contemporary', sharp: 'Sharp',
  },
  nl: {
    warm: 'Warm', approachable: 'Toegankelijk', editorial: 'Editorial', elegant: 'Elegant',
    refined: 'Verfijnd', classic: 'Klassiek', sporty: 'Sportief', energetic: 'Energiek',
    confident: 'Zelfverzekerd', modern: 'Modern', natural: 'Natuurlijk', bold: 'Gedurfd',
    statement: 'Statement', soft: 'Zacht', understated: 'Ingetogen', clean: 'Clean',
    contemporary: 'Eigentijds', sharp: 'Scherp',
  },
};
