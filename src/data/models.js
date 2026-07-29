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
export const ROSTER = [
  { name: 'Aaron',  photo: '/img/model-aaron.webp',  traits: ['warm', 'approachable'] },
  { name: 'Ava',    photo: '/img/model-ava.webp',    traits: ['editorial', 'elegant'] },
  { name: 'Elias',  photo: '/img/model-elias.webp',  traits: ['refined', 'classic'] },
  { name: 'Ryan',   photo: '/img/model-ryan.webp',   traits: ['sporty', 'energetic'] },
  { name: 'Dana',   photo: '/img/model-dana.webp',   traits: ['confident', 'modern'] },
  { name: 'Lisa',   photo: '/img/model-lisa.webp',   traits: ['natural', 'approachable'] },
  { name: 'Maegan', photo: '/img/model-maegan.webp', traits: ['bold', 'statement'] },
  { name: 'Rae',    photo: '/img/model-rae.webp',    traits: ['soft', 'understated'] },
  { name: 'Fabi',   photo: '/img/model-fabi.webp',   traits: ['clean', 'contemporary'] },
  { name: 'Seme',   photo: '/img/model-seme.webp',   traits: ['sharp', 'editorial'] },
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
