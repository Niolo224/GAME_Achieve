/**
 * scripture-fidelity.test.js
 *
 * The verses must read as they read in the Bible. Not trimmed to the clause
 * that suits a mechanic, not reworded, not paraphrased.
 *
 * The reference table below is transcribed independently of src/data/
 * scripture.js and compared character for character. If anyone ever shortens
 * a verse to make it land better, this file fails.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCRIPTURE, verseByRef } from '../../src/data/scripture.js';
import { DOMAINS, domain, normalizeDomain } from '../../src/core/state.js';

/** Authorized (King James) Version, complete verses. */
const KJV = {
  'Habakkuk 2:2':
    'And the LORD answered me, and said, Write the vision, and make it plain upon tables, that he may run that readeth it.',
  'Habakkuk 2:3':
    'For the vision is yet for an appointed time, but at the end it shall speak, and not lie: though it tarry, wait for it; because it will surely come, it will not tarry.',
  'Romans 4:17':
    '(As it is written, I have made thee a father of many nations,) before him whom he believed, even God, who quickeneth the dead, and calleth those things which be not as though they were.',
  'Judges 6:12':
    'And the angel of the LORD appeared unto him, and said unto him, The LORD is with thee, thou mighty man of valour.',
  'Genesis 17:5':
    'Neither shall thy name any more be called Abram, but thy name shall be Abraham; for a father of many nations have I made thee.',
  '2 Corinthians 5:17':
    'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.',
  'Romans 6:11':
    'Likewise reckon ye also yourselves to be dead indeed unto sin, but alive unto God through Jesus Christ our Lord.',
  'Proverbs 23:7':
    'For as he thinketh in his heart, so is he: Eat and drink, saith he to thee; but his heart is not with thee.',
  'Numbers 13:33':
    'And there we saw the giants, the sons of Anak, which come of the giants: and we were in our own sight as grasshoppers, and so we were in their sight.',
  'Numbers 13:30':
    'And Caleb stilled the people before Moses, and said, Let us go up at once, and possess it; for we are well able to overcome it.',
  'Luke 14:28':
    'For which of you, intending to build a tower, sitteth not down first, and counteth the cost, whether he have sufficient to finish it?',
  'Ecclesiastes 3:1':
    'To every thing there is a season, and a time to every purpose under the heaven:',
  'Zechariah 4:10':
    'For who hath despised the day of small things? for they shall rejoice, and shall see the plummet in the hand of Zerubbabel with those seven; they are the eyes of the LORD, which run to and fro through the whole earth.',
  'Luke 9:23':
    'And he said to them all, If any man will come after me, let him deny himself, and take up his cross daily, and follow me.',
  'Psalm 46:10':
    'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.',
  'Revelation 12:11':
    'And they overcame him by the blood of the Lamb, and by the word of their testimony; and they loved not their lives unto the death.',
  'Matthew 17:20':
    'And Jesus said unto them, Because of your unbelief: for verily I say unto you, If ye have faith as a grain of mustard seed, ye shall say unto this mountain, Remove hence to yonder place; and it shall remove; and nothing shall be impossible unto you.',
  'Ephesians 3:20':
    'Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us,',
  'John 10:27':
    'My sheep hear my voice, and I know them, and they follow me:',
  'Hebrews 10:24':
    'And let us consider one another to provoke unto love and to good works:',
  'Colossians 3:23':
    'And whatsoever ye do, do it heartily, as to the Lord, and not unto men;',
  '1 Peter 2:9':
    'But ye are a chosen generation, a royal priesthood, an holy nation, a peculiar people; that ye should shew forth the praises of him who hath called you out of darkness into his marvellous light:',
  'Exodus 16:4':
    'Then said the LORD unto Moses, Behold, I will rain bread from heaven for you; and the people shall go out and gather a certain rate every day, that I may prove them, whether they will walk in my law, or no.',
  'Exodus 16:20':
    'Notwithstanding they hearkened not unto Moses; but some of them left of it until the morning, and it bred worms, and stank: and Moses was wroth with them.',
  'Exodus 20:8': 'Remember the sabbath day, to keep it holy.',
  'Proverbs 24:16':
    'For a just man falleth seven times, and riseth up again: but the wicked shall fall into mischief.',
  'Lamentations 3:22':
    'It is of the LORD’S mercies that we are not consumed, because his compassions fail not.',
  'Lamentations 3:23': 'They are new every morning: great is thy faithfulness.',
  'Mark 4:8':
    'And other fell on good ground, and did yield fruit that sprang up and increased; and brought forth, some thirty, and some sixty, and some an hundred.',
  '1 Samuel 7:12':
    'Then Samuel took a stone, and set it between Mizpeh and Shen, and called the name of it Ebenezer, saying, Hitherto hath the LORD helped us.',
  'Joshua 1:3':
    'Every place that the sole of your foot shall tread upon, that have I given unto you, as I said unto Moses.',
  'Joshua 4:6':
    'That this may be a sign among you, that when your children ask their fathers in time to come, saying, What mean ye by these stones?',
  'Matthew 6:6':
    'But thou, when thou prayest, enter into thy closet, and when thou hast shut thy door, pray to thy Father which is in secret; and thy Father which seeth in secret shall reward thee openly.',
  'Matthew 6:33':
    'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.',
  'Hebrews 11:1':
    'Now faith is the substance of things hoped for, the evidence of things not seen.',
  'Matthew 25:21':
    'His lord said unto him, Well done, thou good and faithful servant: thou hast been faithful over a few things, I will make thee ruler over many things: enter thou into the joy of thy lord.',
  'Ecclesiastes 4:12':
    'And if one prevail against him, two shall withstand him; and a threefold cord is not quickly broken.',
  'Psalm 119:105': 'Thy word is a lamp unto my feet, and a light unto my path.',
  'Psalm 4:4':
    'Stand in awe, and sin not: commune with your own heart upon your bed, and be still. Selah.',
  // The four territories.
  'Proverbs 22:29':
    'Seest thou a man diligent in his business? he shall stand before kings; he shall not stand before mean men.',
  '1 Corinthians 6:19':
    'What? know ye not that your body is the temple of the Holy Ghost which is in you, which ye have of God, and ye are not your own?',
  'Joshua 24:15':
    'And if it seem evil unto you to serve the LORD, choose you this day whom ye will serve; whether the gods which your fathers served that were on the other side of the flood, or the gods of the Amorites, in whose land ye dwell: but as for me and my house, we will serve the LORD.',
  '2 Peter 3:18':
    'But grow in grace, and in the knowledge of our Lord and Saviour Jesus Christ. To him be glory both now and for ever. Amen.',
  'Luke 2:52':
    'And Jesus increased in wisdom and stature, and in favour with God and man.',
};

describe('THE VERSES MUST READ AS THEY READ IN THE BIBLE', () => {
  for (const [ref, expected] of Object.entries(KJV)) {
    test(`${ref} is verbatim and complete`, () => {
      const v = verseByRef(ref);
      assert.ok(v, `${ref} is missing from the bank`);
      assert.equal(v.text, expected, `${ref} does not match the Authorized Version`);
    });
  }

  test('the reference table covers a real share of the bank', () => {
    const covered = Object.keys(KJV).length;
    assert.ok(covered >= 40, `only ${covered} verses independently verified`);
  });
});

describe('no verse may be trimmed to the clause that suits a mechanic', () => {
  test('no verse text ends mid-clause with an ellipsis or a bare dash', () => {
    for (const v of SCRIPTURE) {
      assert.ok(!/[…]|\.\.\.$/.test(v.text), `${v.ref} appears elided`);
      assert.ok(!/[—-]\s*$/.test(v.text), `${v.ref} ends on a dash`);
    }
  });

  test('every verse ends on real sentence punctuation', () => {
    for (const v of SCRIPTURE) {
      assert.match(v.text, /[.?!:;,]$/, `${v.ref} ends without punctuation: "${v.text.slice(-40)}"`);
    }
  });

  test('no verse carries an editorial insertion in square brackets', () => {
    for (const v of SCRIPTURE) {
      assert.ok(!/\[.*\]/.test(v.text), `${v.ref} contains an inserted gloss`);
    }
  });
});

describe('commentary is labelled as commentary, never mixed into the verse', () => {
  test('the field is named `context`, and no entry still uses `note`', () => {
    for (const v of SCRIPTURE) {
      assert.equal(v.note, undefined, `${v.ref} still has an unlabelled note field`);
    }
  });

  test('commentary states the passage in its own setting before any application', () => {
    const withContext = SCRIPTURE.filter((v) => v.context);
    assert.ok(withContext.length > 15, 'the load-bearing verses should carry context');
    for (const v of withContext) {
      assert.match(
        v.context, /^In context:/,
        `${v.ref} commentary must open by describing the passage itself, not the game`,
      );
    }
  });

  test('commentary never claims a verse is about this app', () => {
    for (const v of SCRIPTURE.filter((x) => x.context)) {
      assert.ok(
        !/^(The|This) (original|verse) (vision board|ping)/i.test(v.context),
        `${v.ref} commentary reframes the verse as being about the game`,
      );
    }
  });
});

describe('ONE SOURCE OF TRUTH for verse text', () => {
  const files = ['src/app.js', 'src/ui/views.js', 'src/core/state.js', 'src/core/engine.js', 'src/core/guide.js'];

  test('no module outside data/scripture.js hard-codes verse text', () => {
    for (const f of files) {
      const src = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
      assert.ok(
        !/verseBlock\(\{\s*ref:/.test(src),
        `${f} builds a verse object inline — it will drift from the bank`,
      );
    }
  });

  test('domain descriptions are plain prose, not clipped verse fragments', () => {
    for (const d of DOMAINS) {
      assert.ok(d.blurb, `${d.key} has no description`);
      assert.equal(d.line, undefined, `${d.key} still carries a verse fragment in .line`);
      // A blurb must not be a substring of any verse in the bank.
      for (const v of SCRIPTURE) {
        assert.ok(
          !v.text.includes(d.blurb),
          `${d.key} description is a fragment of ${v.ref}`,
        );
      }
    }
  });
});

describe('the territories', () => {
  test('are exactly the pillars on this vision board', () => {
    assert.deepEqual(DOMAINS.map((d) => d.name),
      ['Faith', 'Family & Legacy', 'Enterprise', 'Body', 'Global', 'Brotherhood']);
  });

  test('each carries a verse that resolves, in full, in the bank', () => {
    for (const d of DOMAINS) {
      const v = verseByRef(d.ref);
      assert.ok(v, `${d.key} points at ${d.ref}, which is not in the bank`);
      assert.ok(v.text.length > 30, `${d.ref} looks truncated`);
    }
  });

  test('saves from every earlier territory layout still open', () => {
    // The original six.
    assert.equal(normalizeDomain('provision'), 'enterprise');
    assert.equal(normalizeDomain('household'), 'family');
    assert.equal(normalizeDomain('communion'), 'faith');
    assert.equal(normalizeDomain('craft'), 'enterprise');
    assert.equal(normalizeDomain('assignment'), 'enterprise');
    // The interim four.
    assert.equal(normalizeDomain('health'), 'body');
    assert.equal(normalizeDomain('business'), 'enterprise');
    assert.equal(normalizeDomain('spirit'), 'faith');
  });

  test('an unknown domain resolves rather than crashing', () => {
    assert.ok(domain('nonsense').name);
    assert.ok(domain(undefined).name);
  });

  test('current keys pass through untouched', () => {
    for (const d of DOMAINS) assert.equal(normalizeDomain(d.key), d.key);
  });
});

describe('NO CLIPPED VERSES ANYWHERE IN THE UI', () => {
  const uiFiles = ['src/app.js', 'src/ui/views.js', 'src/core/state.js', 'src/core/guide.js', 'src/core/engine.js'];

  /** Distinctive phrases lifted from the bank; if one appears in UI source
   *  outside of a scripture reference, something is quoting a fragment. */
  function verseFragments() {
    const out = [];
    for (const v of SCRIPTURE) {
      // Take substantial interior phrases — six or more words.
      const words = v.text.replace(/[^A-Za-z' ]/g, ' ').split(/\s+/).filter(Boolean);
      for (let i = 0; i + 6 <= words.length; i += 3) {
        out.push({ ref: v.ref, phrase: words.slice(i, i + 6).join(' ') });
      }
    }
    return out;
  }

  test('no UI module contains a six-word phrase copied out of a verse', () => {
    const frags = verseFragments();
    for (const f of uiFiles) {
      const src = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
      const flat = src.replace(/[^A-Za-z' ]/g, ' ').replace(/\s+/g, ' ');
      for (const { ref, phrase } of frags) {
        assert.ok(
          !flat.includes(phrase),
          `${f} quotes ${ref} directly ("${phrase}…"). Verses belong in data/scripture.js so they are shown whole, with their reference.`,
        );
      }
    }
  });

  test('canvas captions do not carry curly-quoted scripture', () => {
    const src = readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');
    const quoted = [...src.matchAll(/[“"']([^“”"']{25,})[”"']\s*(?:—|--)\s*\d?\s?[A-Za-z]+ \d+:\d+/g)];
    assert.deepEqual(quoted.map((m) => m[1]), [], 'a verse drawn on a canvas cannot carry its reference and context');
  });
});
