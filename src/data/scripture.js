/**
 * scripture.js — The mainframe.
 *
 * Text is the Authorized (King James) Version, which is in the public domain.
 * Every verse here is bound to a specific STATE of the player, not sprinkled
 * decoratively. The engine asks "where is this person right now?" and the
 * Word answers. Neuroscience explains the mechanism underneath; it never
 * replaces the voice.
 *
 * `moments` are the machine-readable hooks the guidance selector matches on.
 */

export const SCRIPTURE = [
  // ── THE COMMISSION: write the vision ─────────────────────────────────────
  {
    ref: 'Habakkuk 2:2',
    text: 'And the LORD answered me, and said, Write the vision, and make it plain upon tables, that he may run that readeth it.',
    moments: ['onboarding', 'vision_created', 'board_uploaded'],
    note: 'The original vision board. Written, made plain, so that it can be RUN with.',
  },
  {
    ref: 'Habakkuk 2:3',
    text: 'For the vision is yet for an appointed time, but at the end it shall speak, and not lie: though it tarry, wait for it; because it will surely come, it will not tarry.',
    moments: ['waiting', 'plateau', 'slow_progress'],
    note: 'Delay is not denial. The appointed time is a real category.',
  },
  {
    ref: 'Proverbs 29:18',
    text: 'Where there is no vision, the people perish: but he that keepeth the law, happy is he.',
    moments: ['onboarding', 'no_stones'],
  },

  // ── BE: identity before behaviour (Be > Do > Have) ────────────────────────
  {
    ref: 'Romans 4:17',
    text: 'As it is written, I have made thee a father of many nations, before him whom he believed, even God, who quickeneth the dead, and calleth those things which be not as though they were.',
    moments: ['identity_created', 'be_teaching', 'onboarding'],
    note: 'The BE>DO>HAVE verse. God addresses the unseen reality as present fact — and it becomes.',
  },
  {
    ref: 'Judges 6:12',
    text: 'And the angel of the LORD appeared unto him, and said unto him, The LORD is with thee, thou mighty man of valour.',
    moments: ['identity_created', 'low_evidence', 'be_teaching', 'discouraged'],
    note: 'Gideon is hiding in a winepress, threshing wheat in fear, when he is called a mighty man of valour. The name comes BEFORE the behaviour matches it.',
  },
  {
    ref: 'Genesis 17:5',
    text: 'Neither shall thy name any more be called Abram, but thy name shall be Abraham; for a father of many nations have I made thee.',
    moments: ['new_name', 'identity_created'],
    note: 'Renamed "father of many" while still childless. The name was the assignment.',
  },
  {
    ref: '2 Corinthians 5:17',
    text: 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.',
    moments: ['identity_created', 'restoration', 'new_name'],
  },
  {
    ref: 'Romans 6:11',
    text: 'Likewise reckon ye also yourselves to be dead indeed unto sin, but alive unto God through Jesus Christ our Lord.',
    moments: ['be_teaching', 'identity_drift'],
    note: '"Reckon" is an accounting word: count it as already true on the books, then live from the balance.',
  },
  {
    ref: 'Proverbs 23:7',
    text: 'For as he thinketh in his heart, so is he.',
    moments: ['be_teaching', 'identity_drift'],
  },
  {
    ref: 'Ephesians 4:24',
    text: 'And that ye put on the new man, which after God is created in righteousness and true holiness.',
    moments: ['identity_created', 'daily_open'],
  },
  {
    ref: 'Numbers 13:33',
    text: 'And there we saw the giants, the sons of Anak, which come of the giants: and we were in our own sight as grasshoppers, and so we were in their sight.',
    moments: ['limiting_identity', 'fear', 'obstacle_named'],
    note: 'Self-image ran ahead of reality and set the ceiling. "In our OWN sight" came first — then "so we were in their sight."',
  },
  {
    ref: 'Numbers 13:30',
    text: 'And Caleb stilled the people before Moses, and said, Let us go up at once, and possess it; for we are well able to overcome it.',
    moments: ['limiting_identity', 'courage', 'quest_hard'],
  },
  {
    ref: 'Galatians 2:20',
    text: 'I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.',
    moments: ['be_teaching', 'striving', 'identity_created'],
    note: 'The engine of the new identity is not willpower. It is Christ living in you.',
  },
  {
    ref: '1 Peter 2:9',
    text: 'But ye are a chosen generation, a royal priesthood, an holy nation, a peculiar people; that ye should shew forth the praises of him who hath called you out of darkness into his marvellous light.',
    moments: ['identity_created', 'low_evidence'],
  },

  // ── DO: works, evidence, if-then obedience ───────────────────────────────
  {
    ref: 'James 2:17',
    text: 'Even so faith, if it hath not works, is dead, being alone.',
    moments: ['do_teaching', 'stalled', 'no_quests'],
  },
  {
    ref: 'James 1:22',
    text: 'But be ye doers of the word, and not hearers only, deceiving your own selves.',
    moments: ['do_teaching', 'stalled'],
  },
  {
    ref: 'Hebrews 11:1',
    text: 'Now faith is the substance of things hoped for, the evidence of things not seen.',
    moments: ['evidence', 'do_teaching', 'vote_cast'],
    note: 'Evidence is the scriptural word for what your actions deposit toward the unseen thing.',
  },
  {
    ref: 'Ecclesiastes 3:1',
    text: 'To every thing there is a season, and a time to every purpose under the heaven.',
    moments: ['if_then', 'quest_created'],
    note: 'A purpose without an appointed time is a wish. The cue IS the season.',
  },
  {
    ref: 'Luke 16:10',
    text: 'He that is faithful in that which is least is faithful also in much: and he that is unjust in the least is unjust also in much.',
    moments: ['small_step', 'quest_complete'],
  },
  {
    ref: 'Zechariah 4:10',
    text: 'For who hath despised the day of small things?',
    moments: ['small_step', 'linear_only', 'discouraged'],
  },
  {
    ref: 'Colossians 3:23',
    text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.',
    moments: ['quest_start', 'focus_block'],
  },
  {
    ref: 'Luke 9:23',
    text: 'If any man will come after me, let him deny himself, and take up his cross daily, and follow me.',
    moments: ['daily_open', 'streak'],
    note: 'Daily. The word is in the verse.',
  },
  {
    ref: 'Proverbs 21:5',
    text: 'The thoughts of the diligent tend only to plenteousness; but of every one that is hasty only to want.',
    moments: ['planning', 'woop'],
  },
  {
    ref: '1 Corinthians 9:24',
    text: 'Know ye not that they which run in a race run all, but one receiveth the prize? So run, that ye may obtain.',
    moments: ['quest_start', 'competition'],
  },

  // ── COUNTING THE COST: mental contrasting / WOOP ─────────────────────────
  {
    ref: 'Luke 14:28',
    text: 'For which of you, intending to build a tower, sitteth not down first, and counteth the cost, whether he have sufficient to finish it?',
    moments: ['woop', 'obstacle_named', 'stone_created'],
    note: 'Mental contrasting, spoken by Christ. Sit down FIRST and count. Dreaming without costing is the thing He warns about.',
  },
  {
    ref: 'Proverbs 16:9',
    text: 'A man’s heart deviseth his way: but the LORD directeth his steps.',
    moments: ['planning', 'woop', 'plan_written'],
  },
  {
    ref: 'Proverbs 16:3',
    text: 'Commit thy works unto the LORD, and thy thoughts shall be established.',
    moments: ['plan_written', 'daily_open'],
  },
  {
    ref: 'Proverbs 4:23',
    text: 'Keep thy heart with all diligence; for out of it are the issues of life.',
    moments: ['obstacle_named', 'why_vault'],
  },

  // ── THE WHY, KEPT IN SECRET ──────────────────────────────────────────────
  {
    ref: 'Matthew 6:6',
    text: 'But thou, when thou prayest, enter into thy closet, and when thou hast shut thy door, pray to thy Father which is in secret; and thy Father which seeth in secret shall reward thee openly.',
    moments: ['why_vault', 'privacy'],
    note: 'The Why is sealed by design. Secret before God, rewarded openly in the world.',
  },
  {
    ref: 'Matthew 6:33',
    text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.',
    moments: ['why_vault', 'have_teaching', 'onboarding'],
    note: 'The order is fixed. Seek first — the "all these things" are ADDED, never chased.',
  },

  // ── THE MAP: taking ground, Ebenezer stones ──────────────────────────────
  {
    ref: 'Joshua 1:3',
    text: 'Every place that the sole of your foot shall tread upon, that have I given unto you, as I said unto Moses.',
    moments: ['map', 'territory_taken', 'geo_ping'],
    note: 'The promise is real but it is claimed by treading. Feet on ground. That is why this game has a real map.',
  },
  {
    ref: 'Joshua 1:9',
    text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.',
    moments: ['fear', 'quest_hard', 'map'],
  },
  {
    ref: '1 Samuel 7:12',
    text: 'Then Samuel took a stone, and set it between Mizpeh and Shen, and called the name of it Ebenezer, saying, Hitherto hath the LORD helped us.',
    moments: ['geo_ping', 'ebenezer', 'recap'],
    note: 'The original ping on the map: a stone that says "this far the Lord has brought me."',
  },
  {
    ref: 'Joshua 4:6',
    text: 'That this may be a sign among you, that when your children ask their fathers in time to come, saying, What mean ye by these stones?',
    moments: ['stone_created', 'board_uploaded', 'recap'],
    note: 'Twelve stones out of the Jordan, set as memorial. Your vision board is a pile of stones.',
  },
  {
    ref: 'Psalm 37:23',
    text: 'The steps of a good man are ordered by the LORD: and he delighteth in his way.',
    moments: ['daily_open', 'next_step'],
  },
  {
    ref: 'Psalm 119:105',
    text: 'Thy word is a lamp unto my feet, and a light unto my path.',
    moments: ['guidance', 'daily_open', 'uncertain'],
    note: 'A lamp for the FEET — enough light for the next step, not the whole road. This is why the game shows you one step.',
  },

  // ── MANNA: the daily provision, and why it cannot be hoarded ─────────────
  {
    ref: 'Exodus 16:4',
    text: 'Then said the LORD unto Moses, Behold, I will rain bread from heaven for you; and the people shall go out and gather a certain rate every day, that I may prove them, whether they will walk in my law, or no.',
    moments: ['manna', 'daily_open', 'streak'],
    note: 'A certain rate EVERY DAY. Daily gathering is the test.',
  },
  {
    ref: 'Exodus 16:20',
    text: 'Notwithstanding they hearkened not unto Moses; but some of them left of it until the morning, and it bred worms, and stank: and Moses was wroth with them.',
    moments: ['hoarding', 'stale_xp'],
    note: 'Hoarded manna rots. Banked motivation you never spend does the same.',
  },

  // ── GRACE: falling, rising, restoration ──────────────────────────────────
  {
    ref: 'Proverbs 24:16',
    text: 'For a just man falleth seven times, and riseth up again: but the wicked shall fall into mischief.',
    moments: ['missed_day', 'restoration', 'streak_broken'],
    note: 'The righteous man is DEFINED by rising, not by never falling. Seven times is expected.',
  },
  {
    ref: 'Lamentations 3:22',
    text: 'It is of the LORD’S mercies that we are not consumed, because his compassions fail not.',
    moments: ['missed_day', 'grace_token'],
  },
  {
    ref: 'Lamentations 3:23',
    text: 'They are new every morning: great is thy faithfulness.',
    moments: ['missed_day', 'grace_token', 'daily_open', 'restoration'],
    note: 'The reset is built into the covenant. This is why a missed day does not zero you.',
  },
  {
    ref: 'Philippians 1:6',
    text: 'Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ.',
    moments: ['discouraged', 'restoration', 'plateau'],
  },
  {
    ref: 'Isaiah 43:19',
    text: 'Behold, I will do a new thing; now it shall spring forth; shall ye not know it? I will even make a way in the wilderness, and rivers in the desert.',
    moments: ['restoration', 'stuck', 'new_season'],
  },
  {
    ref: 'Galatians 6:9',
    text: 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.',
    moments: ['plateau', 'slow_progress', 'linear_only'],
  },

  // ── REST: Sabbath, stillness, consolidation ──────────────────────────────
  {
    ref: 'Exodus 20:8',
    text: 'Remember the sabbath day, to keep it holy.',
    moments: ['sabbath', 'rest'],
  },
  {
    ref: 'Psalm 46:10',
    text: 'Be still, and know that I am God.',
    moments: ['rest', 'nsdr', 'overload'],
  },
  {
    ref: 'Psalm 4:4',
    text: 'Stand in awe, and sin not: commune with your own heart upon your bed, and be still. Selah.',
    moments: ['evening', 'consolidation'],
    note: 'Evening review, on the bed, before sleep. Consolidation is an ancient instruction.',
  },
  {
    ref: 'Matthew 11:28',
    text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
    moments: ['overload', 'burnout', 'rest'],
  },
  {
    ref: 'Matthew 11:29',
    text: 'Take my yoke upon you, and learn of me; for I am meek and lowly in heart: and ye shall find rest unto your souls.',
    moments: ['burnout', 'striving'],
  },
  {
    ref: 'Isaiah 40:31',
    text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
    moments: ['rest', 'depleted', 'sabbath'],
  },

  // ── INCREASE: the exponential curve ──────────────────────────────────────
  {
    ref: 'Mark 4:8',
    text: 'And other fell on good ground, and did yield fruit that sprang up and increased; and brought forth, some thirty, and some sixty, and some an hundred.',
    moments: ['exponential', 'yield', 'seed_sown'],
    note: 'Thirty, sixty, a hundredfold. Multiplication is a named biblical category, not a metaphor.',
  },
  {
    ref: 'Ephesians 3:20',
    text: 'Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us.',
    moments: ['exponential', 'yield', 'breakthrough'],
    note: 'The curve that outruns the ask. Note: "according to the power that worketh IN us" — the compounding is internal.',
  },
  {
    ref: 'Matthew 17:20',
    text: 'If ye have faith as a grain of mustard seed, ye shall say unto this mountain, Remove hence to yonder place; and it shall remove; and nothing shall be impossible unto you.',
    moments: ['exponential', 'small_step', 'obstacle_named'],
  },
  {
    ref: 'Psalm 1:3',
    text: 'And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season; his leaf also shall not wither; and whatsoever he doeth shall prosper.',
    moments: ['compounding', 'streak', 'yield'],
  },
  {
    ref: 'Proverbs 13:11',
    text: 'Wealth gotten by vanity shall be diminished: but he that gathereth by labour shall increase.',
    moments: ['compounding', 'linear_only'],
    note: 'Gathering by labour is the slow line. It is the one that increases.',
  },
  {
    ref: 'Matthew 25:21',
    text: 'His lord said unto him, Well done, thou good and faithful servant: thou hast been faithful over a few things, I will make thee ruler over many things: enter thou into the joy of thy lord.',
    moments: ['territory_taken', 'stone_complete', 'yield'],
    note: 'Faithful over a FEW → ruler over MANY. That is the exponential promotion rule.',
  },
  {
    ref: 'Deuteronomy 8:18',
    text: 'But thou shalt remember the LORD thy God: for it is he that giveth thee power to get wealth, that he may establish his covenant which he sware unto thy fathers, as it is at this day.',
    moments: ['have_teaching', 'provision'],
  },

  // ── THE CIRCLE: two are better than one ──────────────────────────────────
  {
    ref: 'Ecclesiastes 4:9',
    text: 'Two are better than one; because they have a good reward for their labour.',
    moments: ['circle', 'friend_added'],
  },
  {
    ref: 'Ecclesiastes 4:10',
    text: 'For if they fall, the one will lift up his fellow: but woe to him that is alone when he falleth; for he hath not another to help him up.',
    moments: ['circle', 'friend_fell', 'missed_day'],
  },
  {
    ref: 'Ecclesiastes 4:12',
    text: 'And if one prevail against him, two shall withstand him; and a threefold cord is not quickly broken.',
    moments: ['circle', 'friend_added', 'shared_quest'],
  },
  {
    ref: 'Proverbs 27:17',
    text: 'Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.',
    moments: ['circle', 'chat'],
  },
  {
    ref: 'Revelation 12:11',
    text: 'And they overcame him by the blood of the Lamb, and by the word of their testimony.',
    moments: ['recap', 'testimony', 'circle'],
    note: 'The recap screen is a testimony. Rehearsing where you came from is spiritual warfare.',
  },
  {
    ref: 'Hebrews 10:24',
    text: 'And let us consider one another to provoke unto love and to good works.',
    moments: ['circle', 'chat', 'nudge'],
  },
  {
    ref: 'Galatians 6:2',
    text: 'Bear ye one another’s burdens, and so fulfil the law of Christ.',
    moments: ['circle', 'friend_fell'],
  },

  // ── THE SHEPHERD: Christ leading ─────────────────────────────────────────
  {
    ref: 'John 10:27',
    text: 'My sheep hear my voice, and I know them, and they follow me.',
    moments: ['guidance', 'daily_open', 'onboarding'],
    note: 'The guide of this game is a Person, not an algorithm. The app only carries the lamp.',
  },
  {
    ref: 'John 15:5',
    text: 'I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing.',
    moments: ['striving', 'guidance', 'burnout'],
  },
  {
    ref: 'Philippians 4:13',
    text: 'I can do all things through Christ which strengtheneth me.',
    moments: ['quest_hard', 'fear', 'courage'],
  },
  {
    ref: 'Romans 12:2',
    text: 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.',
    moments: ['be_teaching', 'neuroplasticity', 'onboarding'],
    note: 'Transformation BY the renewing of the mind. Neuroplasticity is the mechanism this verse describes.',
  },
  {
    ref: 'Jeremiah 29:11',
    text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
    moments: ['discouraged', 'uncertain', 'future_self'],
    note: '"An expected end" — a future self that God already sees.',
  },
  {
    ref: 'Hebrews 12:1',
    text: 'Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight, and the sin which doth so easily beset us, and let us run with patience the race that is set before us.',
    moments: ['obstacle_named', 'circle', 'quest_start'],
  },
  {
    ref: 'Psalm 42:11',
    text: 'Why art thou cast down, O my soul? and why art thou disquieted within me? hope thou in God: for I shall yet praise him, who is the health of my countenance, and my God.',
    moments: ['discouraged', 'self_distancing', 'quest_failed', 'restoration'],
    note: 'David speaks TO his own soul rather than FROM it. Self-distanced self-talk, three thousand years before the fMRI confirmed it lowers amygdala reactivity.',
  },
  {
    ref: 'Isaiah 41:10',
    text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.',
    moments: ['fear', 'quest_hard', 'discouraged'],
  },
  {
    ref: '3 John 1:2',
    text: 'Beloved, I wish above all things that thou mayest prosper and be in health, even as thy soul prospereth.',
    moments: ['have_teaching', 'onboarding', 'wellbeing'],
    note: 'Prosperity is tethered to the soul’s condition. The order matters here too.',
  },
];

/** Every distinct moment tag present in the bank. */
export const MOMENTS = [...new Set(SCRIPTURE.flatMap((v) => v.moments))].sort();

/**
 * Pick a verse for a moment. Deterministic given a seed so the same day
 * yields the same word (a person should be able to sit with one verse),
 * but rotates across days so it never goes stale.
 */
export function verseFor(moment, seed = 0) {
  const pool = SCRIPTURE.filter((v) => v.moments.includes(moment));
  if (!pool.length) return null;
  const idx = Math.abs(Math.floor(seed)) % pool.length;
  return pool[idx];
}

/** All verses matching any of the given moments, highest specificity first. */
export function versesFor(moments) {
  const wanted = Array.isArray(moments) ? moments : [moments];
  return SCRIPTURE.map((v) => ({
    verse: v,
    hits: v.moments.filter((m) => wanted.includes(m)).length,
  }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.verse);
}

export function verseByRef(ref) {
  return SCRIPTURE.find((v) => v.ref === ref) || null;
}
