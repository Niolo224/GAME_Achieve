/**
 * board.js — the player's actual vision board, written in.
 *
 * Every Stone here comes from a real panel on the uploaded board. Nothing is
 * invented and nothing is editorialised: the titles are the things named on
 * the board, and the `note` is the board's own description of that panel.
 *
 * These arrive VEILED, like every other Stone. Seeding them does not skip the
 * WOOP gate — Oettingen's finding does not care where a wish came from, and a
 * pre-loaded uncontrasted board would be exactly the de-motivator the gate
 * exists to prevent. What seeding removes is typing, not thinking.
 *
 * Each suggested identity is a STARTING POINT the player edits or replaces.
 * It still has to pass validateIdentity() like anything typed by hand.
 */

export const BOARD_TITLE = 'Faith. Family. Freedom. Financial Abundance. Global Impact. Legacy.';

/** Suggested identities, one per area. Editable, and validated normally. */
export const SEED_IDENTITIES = [
  {
    domain: 'faith',
    statement: 'I am a man who keeps God at the center of what he builds',
    prompt: 'The board says faith is the foundation of everything. What does that look like on a Tuesday?',
  },
  {
    domain: 'family',
    statement: 'I am a man who builds what will outlive him',
    prompt: 'The board says the goal is not to become successful, but to build something that impacts generations.',
  },
  {
    domain: 'enterprise',
    statement: 'I am a man who builds companies that solve real problems',
    prompt: 'Robotics, eVTOL, mecha, real estate, funds, schools. What is the daily behaviour underneath all of it?',
  },
  {
    domain: 'body',
    statement: 'I am a man who trains because his body carries an assignment',
    prompt: 'The board says the goal is not appearance — it is discipline, endurance, and longevity.',
  },
  {
    domain: 'global',
    statement: 'I am a man who studies a language every day',
    prompt: 'Twenty-plus languages is not a wish, it is a daily rep repeated for years.',
  },
  {
    domain: 'brotherhood',
    statement: 'I am a man who gathers people and keeps them',
    prompt: 'The board says success means little without people to share it with.',
  },
];

/**
 * The Stones. `panel` names where each one sits on the board so the player
 * can match them up when they tap their own image.
 */
export const SEED_STONES = [
  // ── FAITH ──────────────────────────────────────────────────────────────
  {
    domain: 'faith',
    title: 'Faith as the foundation, growing every day',
    panel: 'FAITH IS MY FOUNDATION',
    note: 'God at the center of life, family, businesses, investments, relationships, health and future.',
  },

  // ── FAMILY & LEGACY ────────────────────────────────────────────────────
  {
    domain: 'family',
    title: 'The family trust, built to last for generations',
    panel: 'MY FAMILY & OUR TRUST FUND',
    note: 'Businesses, investments, intellectual property, real estate and funds held through structures designed for long-term stewardship.',
  },
  {
    domain: 'family',
    title: 'A strong, loving household',
    panel: 'OUR LEGACY. OUR FREEDOM. OUR IMPACT.',
    note: 'A life centered on faith, love, trust, purpose and generational impact.',
  },

  // ── ENTERPRISE: real estate ────────────────────────────────────────────
  {
    domain: 'enterprise',
    title: 'Retail commercial real estate in strong markets',
    panel: 'MULTIPLE PROPERTIES IN CRE — RETAIL',
    note: 'High-quality retail property.',
  },
  {
    domain: 'enterprise',
    title: 'Industrial property: warehouses, manufacturing, logistics',
    panel: 'MULTIPLE PROPERTIES IN CRE — INDUSTRIAL',
    note: 'Productive real estate that supports the operating businesses.',
  },
  {
    domain: 'enterprise',
    title: '20+ rental and multifamily properties across countries',
    panel: '20+ RENTING & MULTIFAMILY',
    note: 'USA, Canada, UK, Germany, UAE, Australia, Singapore, Japan, France and other markets.',
  },

  // ── ENTERPRISE: the three technology companies ─────────────────────────
  {
    domain: 'enterprise',
    title: 'The robotics company',
    panel: 'I OWN VARIOUS SUCCESSFUL BUSINESSES — ROBOTICS',
    note: 'Designing and manufacturing advanced robotic systems.',
  },
  {
    domain: 'enterprise',
    title: 'The eVTOL company',
    panel: 'I OWN VARIOUS SUCCESSFUL BUSINESSES — eVTOL',
    note: 'Next-generation electric vertical takeoff and landing aircraft.',
  },
  {
    domain: 'enterprise',
    title: 'Giant robotics and mecha manufacturing',
    panel: 'GUNDAM-LIKE ROBOTS MANUFACTURING WAREHOUSE',
    note: 'Industrial mechs, advanced vehicles and next-generation robotic systems, with the facilities to research, test and produce them.',
  },

  // ── ENTERPRISE: the funds ──────────────────────────────────────────────
  {
    domain: 'enterprise',
    title: 'The venture capital fund',
    panel: 'I OWN MY FUNDS — VC',
    note: 'Backing ambitious founders building technologies that shape the future.',
  },
  {
    domain: 'enterprise',
    title: 'The private equity arm',
    panel: 'I OWN MY FUNDS — PE',
    note: 'Acquire, improve, grow and hold strong businesses.',
  },
  {
    domain: 'enterprise',
    title: 'The private credit book',
    panel: 'I OWN MY FUNDS — PRIVATE CREDIT',
    note: 'Capital to businesses, entrepreneurs, developers and investors.',
  },
  {
    domain: 'enterprise',
    title: 'The family office',
    panel: 'I OWN MY FUNDS — FAMILY OFFICE',
    note: 'Managing the family’s investments, companies, real estate, philanthropy and long-term wealth.',
  },
  {
    domain: 'enterprise',
    title: 'Philanthropy that opens doors for people',
    panel: 'I OWN MY FUNDS — PHILANTHROPY',
    note: 'Communities, education, innovation, humanitarian work and people who need opportunity.',
  },
  {
    domain: 'enterprise',
    title: 'Regenerative finance',
    panel: 'I OWN MY FUNDS — REGENERATIVE FINANCE',
    note: 'Systems that improve communities, ecosystems, infrastructure and long-term economic sustainability.',
  },
  {
    domain: 'enterprise',
    title: 'Hard money and private lending',
    panel: 'I OWN MY FUNDS — HARD MONEY',
    note: 'Strategic capital for qualified real estate investors, operators and projects.',
  },

  // ── ENTERPRISE: education ──────────────────────────────────────────────
  {
    domain: 'enterprise',
    title: 'Schools that grow the next generation of builders',
    panel: 'I OWN EDUCATION INSTITUTIONS',
    note: 'Entrepreneurship, innovation, leadership, technology and AI, finance and investing, global minds and impact. Educate. Empower. Elevate.',
  },

  // ── BODY ───────────────────────────────────────────────────────────────
  {
    domain: 'body',
    title: 'A body built for discipline, strength and longevity',
    panel: 'SUPER-SOLDIER BODY',
    note: 'Strong body. Strong mind. Strong purpose. Not appearance — capacity to keep serving for decades.',
  },

  // ── GLOBAL ─────────────────────────────────────────────────────────────
  {
    domain: 'global',
    title: 'Live in Shanghai, spend real time in South Korea',
    panel: 'I TRAVEL THE WORLD',
    note: 'Experience cultures, industries, food, architecture and ways of life firsthand.',
  },
  {
    domain: 'global',
    title: 'Speak more than 20 languages',
    panel: 'I SPEAK OVER 20 LANGUAGES',
    note: 'Mandarin, Korean, Japanese, Spanish, French, German, Arabic, Hindi, Portuguese, Russian and more.',
  },

  // ── BROTHERHOOD ────────────────────────────────────────────────────────
  {
    domain: 'brotherhood',
    title: 'A table that stays full',
    panel: 'GRATEFUL HEART. STRONG FAITH. UNBREAKABLE BONDS.',
    note: 'Family, trusted friends, mentors and partners. We eat, celebrate, pray, challenge and build together.',
  },
];

/** The seven principles written down the right-hand side of the board. */
export const PRINCIPLES_STRIP = [
  { key: 'vision', label: 'Vision', line: 'Know where I am going.' },
  { key: 'plan', label: 'Plan', line: 'Turn the vision into measurable goals.' },
  { key: 'execute', label: 'Execute', line: 'Take consistent action.' },
  { key: 'discipline', label: 'Discipline', line: 'Continue even when motivation changes.' },
  { key: 'faith', label: 'Faith', line: 'Trust God while doing the work in front of me.' },
  { key: 'success', label: 'Success', line: 'Become capable of carrying greater responsibility.' },
  { key: 'legacy', label: 'Legacy', line: 'Build something worth passing forward.' },
];

/** The declaration under the board. Shown once, on the opening screen. */
export const DECLARATION = 'I build. I invest. I impact. I create legacy.';
