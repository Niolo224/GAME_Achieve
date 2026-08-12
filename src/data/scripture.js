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
 *
 * `context` is COMMENTARY WRITTEN BY THIS APP, never scripture. It states what
 * is happening in the passage on its own terms, and where the app borrows a
 * name from it, it says so plainly. Verse `text` is the Authorized Version
 * verbatim and complete — never trimmed to the clause that suits a mechanic.
 */

export const SCRIPTURE = [
  // ── THE COMMISSION: write the vision ─────────────────────────────────────
  {
    ref: 'Habakkuk 2:2',
    text: 'And the LORD answered me, and said, Write the vision, and make it plain upon tables, that he may run that readeth it.',
    moments: ['onboarding', 'vision_created', 'board_uploaded'],
    context: 'In context: Habakkuk is given a revelation about Babylon and told to inscribe it on tablets so a herald could carry and read it at speed. This app borrows the instruction to write and make plain; the passage itself is about God\'s word being recorded and trusted.',
  },
  {
    ref: 'Habakkuk 2:3',
    text: 'For the vision is yet for an appointed time, but at the end it shall speak, and not lie: though it tarry, wait for it; because it will surely come, it will not tarry.',
    moments: ['waiting', 'plateau', 'slow_progress'],
    context: 'In context: the LORD\'s answer to Habakkuk continues — the vision has a set time and will not fail, though it seems slow.',
  },
  {
    ref: 'Proverbs 29:18',
    text: 'Where there is no vision, the people perish: but he that keepeth the law, happy is he.',
    moments: ['onboarding', 'no_stones'],
  },

  // ── BE: identity before behaviour (Be > Do > Have) ────────────────────────
  {
    ref: 'Romans 4:17',
    text: '(As it is written, I have made thee a father of many nations,) before him whom he believed, even God, who quickeneth the dead, and calleth those things which be not as though they were.',
    moments: ['identity_created', 'be_teaching', 'onboarding'],
    context: 'In context: Paul is arguing that Abraham was justified by faith before the promise was fulfilled, describing the God he believed. The app points to the pattern of God naming what is not yet visible.',
  },
  {
    ref: 'Judges 6:12',
    text: 'And the angel of the LORD appeared unto him, and said unto him, The LORD is with thee, thou mighty man of valour.',
    moments: ['identity_created', 'low_evidence', 'be_teaching', 'discouraged'],
    context: 'In context: Gideon is threshing wheat in a winepress to hide it from the Midianites when the angel of the LORD greets him this way.',
  },
  {
    ref: 'Genesis 17:5',
    text: 'Neither shall thy name any more be called Abram, but thy name shall be Abraham; for a father of many nations have I made thee.',
    moments: ['new_name', 'identity_created'],
    context: 'In context: God establishes His covenant with Abram and changes his name to Abraham, before Isaac was born.',
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
    context: 'In context: Paul\'s argument in Romans 6 that the believer, united with Christ in His death and resurrection, is to consider himself dead to sin and alive to God.',
  },
  {
    ref: 'Proverbs 23:7',
    text: 'For as he thinketh in his heart, so is he: Eat and drink, saith he to thee; but his heart is not with thee.',
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
    context: 'In context: the report of the ten spies who discouraged Israel from entering Canaan. Their account of themselves precedes their account of how they were seen.',
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
    context: 'In context: Paul, recounting his confrontation with Peter at Antioch, states the ground of his own life in Christ. The passage is about union with Christ, not self-improvement.',
  },
  {
    ref: '1 Peter 2:9',
    text: 'But ye are a chosen generation, a royal priesthood, an holy nation, a peculiar people; that ye should shew forth the praises of him who hath called you out of darkness into his marvellous light:',
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
    context: 'In context: the opening definition of faith in Hebrews 11, followed by a roll call of those who acted on God\'s promises before seeing them. The app uses the word "evidence" for its vote tally; in the passage, faith itself is the evidence.',
  },
  {
    ref: 'Ecclesiastes 3:1',
    text: 'To every thing there is a season, and a time to every purpose under the heaven:',
    moments: ['if_then', 'quest_created'],
    context: 'In context: the opening of Ecclesiastes 3, a meditation on the seasons appointed to every human activity. The app cites it alongside its if-then timing, but the passage is about God\'s ordering of time, not scheduling technique.',
  },
  {
    ref: 'Luke 16:10',
    text: 'He that is faithful in that which is least is faithful also in much: and he that is unjust in the least is unjust also in much.',
    moments: ['small_step', 'quest_complete'],
  },
  {
    ref: 'Zechariah 4:10',
    text: 'For who hath despised the day of small things? for they shall rejoice, and shall see the plummet in the hand of Zerubbabel with those seven; they are the eyes of the LORD, which run to and fro through the whole earth.',
    moments: ['small_step', 'linear_only', 'discouraged'],
  },
  {
    ref: 'Colossians 3:23',
    text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men;',
    moments: ['quest_start', 'focus_block'],
  },
  {
    ref: 'Luke 9:23',
    text: 'And he said to them all, If any man will come after me, let him deny himself, and take up his cross daily, and follow me.',
    moments: ['daily_open', 'streak'],
    context: 'In context: Christ tells the disciples what following Him requires — self-denial, and taking up a cross daily. The app notes the daily pattern; the passage is about discipleship, not habit streaks.',
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
    context: 'In context: Christ is teaching the cost of discipleship to a large crowd, warning that following Him is not to be undertaken lightly. The app applies the counting principle to planning; the passage is about counting the cost of following Him.',
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
    context: 'In context: from the Sermon on the Mount, where Christ contrasts prayer offered privately to the Father with prayer performed for an audience. The app cites it for keeping your reason private; the passage is about prayer.',
  },
  {
    ref: 'Matthew 6:33',
    text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.',
    moments: ['why_vault', 'have_teaching', 'onboarding'],
    context: 'In context: Christ has just told the crowd not to be anxious about food and clothing, pointing to the birds and the lilies. The promise of things added follows the command to seek God\'s kingdom first.',
  },

  // ── THE MAP: taking ground, Ebenezer stones ──────────────────────────────
  {
    ref: 'Joshua 1:3',
    text: 'Every place that the sole of your foot shall tread upon, that have I given unto you, as I said unto Moses.',
    moments: ['map', 'territory_taken', 'geo_ping'],
    context: 'In context: God\'s commissioning of Joshua before Israel entered Canaan, promising the land they would walk through. The app cites it on its map of real ground.',
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
    context: 'In context: Israel had just been delivered from the Philistines at Mizpeh. Samuel set a stone to mark the place of that deliverance. This app names its location markers after it; the stone in the passage commemorates God\'s help, not a personal milestone.',
  },
  {
    ref: 'Joshua 4:6',
    text: 'That this may be a sign among you, that when your children ask their fathers in time to come, saying, What mean ye by these stones?',
    moments: ['stone_created', 'board_uploaded', 'recap'],
    context: 'In context: twelve stones were taken from the dry riverbed of the Jordan after Israel crossed over, set up so that future generations would ask what they meant and be told what God did. This app borrows the word "stone" for the things on your board.',
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
    context: 'In context: from Psalm 119, on the sufficiency of God\'s word for the way ahead. The app takes the image of light at the feet as the reason it shows a single next step.',
  },

  // ── MANNA: the daily provision, and why it cannot be hoarded ─────────────
  {
    ref: 'Exodus 16:4',
    text: 'Then said the LORD unto Moses, Behold, I will rain bread from heaven for you; and the people shall go out and gather a certain rate every day, that I may prove them, whether they will walk in my law, or no.',
    moments: ['manna', 'daily_open', 'streak'],
    context: 'In context: God promises bread from heaven for Israel in the wilderness, to be gathered daily as a test of obedience. The app borrows the name for its rewards.',
  },
  {
    ref: 'Exodus 16:20',
    text: 'Notwithstanding they hearkened not unto Moses; but some of them left of it until the morning, and it bred worms, and stank: and Moses was wroth with them.',
    moments: ['hoarding', 'stale_xp'],
    context: 'In context: Israel was told to gather only a day\'s portion. Some kept it overnight against instruction and it spoiled. The app borrows this as the reason its rewards do not stockpile.',
  },

  // ── GRACE: falling, rising, restoration ──────────────────────────────────
  {
    ref: 'Proverbs 24:16',
    text: 'For a just man falleth seven times, and riseth up again: but the wicked shall fall into mischief.',
    moments: ['missed_day', 'restoration', 'streak_broken'],
    context: 'In context: a proverb contrasting the just and the wicked — the just man rises again after falling. The app cites it as the reason a missed day does not end a streak.',
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
    context: 'In context: Jeremiah, in the middle of lamenting Jerusalem\'s destruction, turns to God\'s unfailing mercies. The app cites it when grace covers a missed day.',
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
    text: 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.',
    moments: ['rest', 'nsdr', 'overload'],
  },
  {
    ref: 'Psalm 4:4',
    text: 'Stand in awe, and sin not: commune with your own heart upon your bed, and be still. Selah.',
    moments: ['evening', 'consolidation'],
    context: 'In context: a psalm of David calling the reader to reverence and self-examination before sleep. The app schedules its evening review at the same hour.',
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
    context: 'In context: part of the parable of the sower, describing seed that fell on good ground. The app borrows the thirty/sixty/hundredfold language to label its yield tiers.',
  },
  {
    ref: 'Ephesians 3:20',
    text: 'Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us,',
    moments: ['exponential', 'yield', 'breakthrough'],
    context: 'In context: the close of Paul\'s prayer for the Ephesians, ascribing glory to God. The app cites it where its growth curve exceeds expectation.',
  },
  {
    ref: 'Matthew 17:20',
    text: 'And Jesus said unto them, Because of your unbelief: for verily I say unto you, If ye have faith as a grain of mustard seed, ye shall say unto this mountain, Remove hence to yonder place; and it shall remove; and nothing shall be impossible unto you.',
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
    context: 'In context: a proverb contrasting wealth got hastily with wealth gathered by labour.',
  },
  {
    ref: 'Matthew 25:21',
    text: 'His lord said unto him, Well done, thou good and faithful servant: thou hast been faithful over a few things, I will make thee ruler over many things: enter thou into the joy of thy lord.',
    moments: ['territory_taken', 'stone_complete', 'yield'],
    context: 'In context: the parable of the talents, where a servant who traded faithfully is commended by his returning lord. The app cites it when a Stone is completed.',
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
    text: 'And they overcame him by the blood of the Lamb, and by the word of their testimony; and they loved not their lives unto the death.',
    moments: ['recap', 'testimony', 'circle'],
    context: 'In context: from Revelation, describing how the saints overcame the accuser. The app cites it on the recap, where you can see where you began.',
  },
  {
    ref: 'Hebrews 10:24',
    text: 'And let us consider one another to provoke unto love and to good works:',
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
    text: 'My sheep hear my voice, and I know them, and they follow me:',
    moments: ['guidance', 'daily_open', 'onboarding'],
    context: 'In context: Christ is speaking of Himself as the good shepherd, in the temple at the feast of dedication. This app does not speak for Him; it only shows His words.',
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
    context: 'In context: Paul\'s appeal at the opening of Romans 12, urging believers to present themselves to God rather than be shaped by the world.',
  },
  {
    ref: 'Jeremiah 29:11',
    text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
    moments: ['discouraged', 'uncertain', 'future_self'],
    context: 'In context: part of Jeremiah\'s letter to the Jews already carried captive to Babylon, promising restoration after seventy years. It is a covenant promise to a people in exile, not a general assurance about personal plans.',
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
    context: 'In context: the psalmist, cut off from the house of God and taunted by his enemies, questions his own soul and turns it back toward hope in God.',
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
    context: 'In context: the opening greeting of John\'s letter to Gaius, a personal wish for his friend\'s health and wellbeing. It is a greeting, not a formula.',
  },
  // ── THE FOUR TERRITORIES ─────────────────────────────────────────────────
  {
    ref: 'Joshua 24:15',
    text: 'And if it seem evil unto you to serve the LORD, choose you this day whom ye will serve; whether the gods which your fathers served that were on the other side of the flood, or the gods of the Amorites, in whose land ye dwell: but as for me and my house, we will serve the LORD.',
    moments: ['family', 'household', 'covenant'],
  },
  {
    ref: 'Psalm 127:1',
    text: 'Except the LORD build the house, they labour in vain that build it: except the LORD keep the city, the watchman waketh but in vain.',
    moments: ['family', 'business', 'striving'],
  },
  {
    ref: '2 Peter 3:18',
    text: 'But grow in grace, and in the knowledge of our Lord and Saviour Jesus Christ. To him be glory both now and for ever. Amen.',
    moments: ['spiritual_growth', 'compounding', 'daily_open'],
  },
  {
    ref: '1 Corinthians 9:27',
    text: 'But I keep under my body, and bring it into subjection: lest that by any means, when I have preached to others, I myself should be a castaway.',
    moments: ['health', 'discipline'],
  },
  {
    ref: '1 Corinthians 6:19',
    text: 'What? know ye not that your body is the temple of the Holy Ghost which is in you, which ye have of God, and ye are not your own?',
    moments: ['health', 'wellbeing'],
  },
  {
    ref: 'Proverbs 22:29',
    text: 'Seest thou a man diligent in his business? he shall stand before kings; he shall not stand before mean men.',
    moments: ['business', 'craft', 'compounding'],
  },
  {
    ref: 'Esther 4:14',
    text: 'For if thou altogether holdest thy peace at this time, then shall there enlargement and deliverance arise to the Jews from another place; but thou and thy father\'s house shall be destroyed: and who knoweth whether thou art come to the kingdom for such a time as this?',
    moments: ['assignment', 'business', 'courage'],
  },
  {
    ref: 'Luke 2:52',
    text: 'And Jesus increased in wisdom and stature, and in favour with God and man.',
    moments: ['spiritual_growth', 'health', 'family', 'business', 'compounding'],
    context: 'In context: Luke\'s summary of Jesus\' years in Nazareth after the visit to the temple at twelve. The app notes that the growth described is not confined to one area of life.',
  },
  {
    ref: '1 Timothy 5:8',
    text: 'But if any provide not for his own, and specially for those of his own house, he hath denied the faith, and is worse than an infidel.',
    moments: ['business', 'family', 'provision'],
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