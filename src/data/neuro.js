/**
 * neuro.js — The mechanism layer.
 *
 * Rule of this file: a principle only earns a place if it CHANGES A MECHANIC.
 * Every entry names the study, the brain system, and the exact behaviour of
 * the game that it dictates. If you can delete the principle and the game
 * plays identically, it does not belong here.
 *
 * Science is the servant here, not the master: it describes the machinery the
 * Word already commanded. Each entry carries the verse it explains.
 */

export const PRINCIPLES = [
  // ── BE > DO > HAVE ───────────────────────────────────────────────────────
  {
    id: 'self_perception',
    name: 'Self-perception theory',
    finding:
      'People infer their own attitudes and identity by observing their own behaviour, exactly as an outside observer would. You do not act from who you are so much as learn who you are from how you act.',
    source: 'Bem, D. J. (1972). Self-Perception Theory. Advances in Experimental Social Psychology, 6, 1–62.',
    system: 'Medial prefrontal cortex — self-referential processing',
    mechanic:
      'Every completed quest is recorded as a VOTE for a named identity, and the tally is shown as a percentage. The game never says "you finished a task"; it says "the evidence now says you are a person who trains, 71% of the time."',
    verse: 'Romans 4:17',
    pillar: 'BE',
  },
  {
    id: 'possible_selves',
    name: 'Possible selves',
    finding:
      'Concrete representations of a future self function as motivational blueprints; vague ones do not. The specificity of the imagined self predicts effort toward it.',
    source: 'Markus, H., & Nurius, P. (1986). Possible Selves. American Psychologist, 41(9), 954–969.',
    system: 'Self-schema networks, vmPFC',
    mechanic:
      'The identity form refuses abstractions. "Successful" is rejected; it demands a sentence in the form "I am a person who ___" with an observable behaviour in the blank.',
    verse: 'Judges 6:12',
    pillar: 'BE',
  },
  {
    id: 'future_self_continuity',
    name: 'Future-self continuity',
    finding:
      'In fMRI, most people show neural activity toward their future self that resembles activity toward a STRANGER. The smaller that gap, the more they act in their future self\'s interest — including saving more money. Exposure to rendered future selves raised saving rates.',
    source:
      'Hershfield, H. E. et al. (2011). Increasing Saving Behavior Through Age-Progressed Renderings of the Future Self. Journal of Marketing Research, 48, S23–S37.',
    system: 'Rostral anterior cingulate / vmPFC self-continuity signal',
    mechanic:
      'The Letter From The Appointed Time: the player writes as their future self, and the app resurfaces that letter at decision points, closing the stranger-gap before a hard quest.',
    verse: 'Jeremiah 29:11',
    pillar: 'BE',
  },
  {
    id: 'values_affirmation',
    name: 'Values affirmation / self-transcendent purpose',
    finding:
      'Briefly writing about a core personal value before a threatening task buffers the stress response and improves performance; effects have persisted for months in field studies. Purpose beyond the self sustains effort on tedious work longer than self-focused motives.',
    source:
      'Cohen, G. L., & Sherman, D. K. (2014). The Psychology of Change: Self-Affirmation and Social Psychological Intervention. Annual Review of Psychology, 65, 333–371. Also Yeager, D. S. et al. (2014), JPSP 107(4).',
    system: 'vmPFC + ventral striatum; blunted cortisol reactivity',
    mechanic:
      'The Why Vault. Before any quest marked hard, the player\'s own private Why is surfaced full-screen with a forced dwell before the start button arms.',
    verse: 'Matthew 6:6',
    pillar: 'BE',
  },
  {
    id: 'enclothed_cognition',
    name: 'Enclothed cognition / embodied identity',
    finding:
      'Wearing a coat described as a doctor\'s coat improved sustained attention; the identical coat described as a painter\'s did not. Symbolic meaning attached to the body changes cognition.',
    source: 'Adam, H., & Galinsky, A. D. (2012). Enclothed Cognition. Journal of Experimental Social Psychology, 48(4), 918–925.',
    system: 'Embodied cognition; attention networks',
    mechanic:
      'The Vestment: an optional physical token or garment the player assigns to an identity, prompted as a pre-quest ritual so the body enters the role before the work starts.',
    verse: 'Ephesians 4:24',
    pillar: 'BE',
  },

  // ── DOPAMINE, REWARD, CALIBRATION ────────────────────────────────────────
  {
    id: 'reward_prediction_error',
    name: 'Reward prediction error',
    finding:
      'Midbrain dopamine neurons do not encode reward — they encode reward MINUS expectation. A fully predicted reward produces no dopamine response. Learning is driven by surprise.',
    source:
      'Schultz, W., Dayan, P., & Montague, P. R. (1997). A Neural Substrate of Prediction and Reward. Science, 275(5306), 1593–1599.',
    system: 'VTA / substantia nigra dopamine neurons → nucleus accumbens',
    mechanic:
      'Expected completion pays a flat, honest amount. On top of it, Manna drops on a variable schedule the player cannot predict. Predictable rewards are deliberately kept small precisely because they teach nothing.',
    verse: 'Exodus 16:4',
    pillar: 'DO',
  },
  {
    id: 'variable_ratio',
    name: 'Variable-ratio reinforcement',
    finding:
      'Of all reinforcement schedules, variable-ratio produces the highest and most persistent response rates and the greatest resistance to extinction.',
    source: 'Ferster, C. B., & Skinner, B. F. (1957). Schedules of Reinforcement. Appleton-Century-Crofts.',
    system: 'Mesolimbic dopamine; extinction resistance',
    mechanic:
      'Manna drops on an average 1-in-4 variable ratio, never on a fixed count. It also cannot be hoarded — unspent Manna decays, mirroring Exodus 16:20 and preventing the reward from becoming a predictable stockpile.',
    verse: 'Exodus 16:20',
    pillar: 'DO',
    ethics:
      'Used to sustain effort toward the player\'s OWN declared goals, and deliberately capped. This is the same mechanism slot machines exploit; the difference is who profits and whether the player can leave. There is a hard daily cap and no purchase path.',
  },
  {
    id: 'goal_gradient',
    name: 'Goal-gradient effect',
    finding:
      'Effort accelerates as perceived distance to a goal shrinks. Coffee-card holders given two "free" pre-stamps completed cards faster than those needing the same remaining number — illusory progress alone accelerated behaviour.',
    source:
      'Kivetz, R., Urminsky, O., & Zheng, Y. (2006). The Goal-Gradient Hypothesis Resurrected. Journal of Marketing Research, 43(1), 39–58. Originally Hull, C. L. (1932).',
    system: 'Striatal value coding scaled by proximity',
    mechanic:
      'XP per step RISES as a Stone nears completion, and the path visibly shortens and brightens. Progress is always framed as distance remaining, never as raw count.',
    verse: 'Matthew 25:21',
    pillar: 'DO',
  },
  {
    id: 'desirable_difficulty',
    name: 'Desirable difficulty / optimal challenge',
    finding:
      'Learning is maximised near ~85% success — hard enough to generate error signal, easy enough to stay trainable. Too easy yields no learning signal; too hard yields noise and withdrawal.',
    source:
      'Wilson, R. C. et al. (2019). The Eighty Five Percent Rule for Optimal Learning. Nature Communications, 10, 4646. Also Bjork, R. A. (1994) on desirable difficulties.',
    system: 'Error-driven learning; ACC conflict monitoring',
    mechanic:
      'The Calibration Engine tracks rolling completion rate and automatically resizes the next step. Above 90% it enlarges the ask; below 60% it shrinks it and says so out loud.',
    verse: 'Luke 16:10',
    pillar: 'DO',
  },

  // ── IF-THEN, HABIT, CONTEXT ──────────────────────────────────────────────
  {
    id: 'implementation_intentions',
    name: 'Implementation intentions',
    finding:
      'Specifying "when situation X arises, I will perform response Y" roughly doubles goal attainment versus goal intentions alone. Meta-analysis across 94 studies found d = 0.65.',
    source:
      'Gollwitzer, P. M., & Sheeran, P. (2006). Implementation Intentions and Goal Achievement: A Meta-Analysis. Advances in Experimental Social Psychology, 38, 69–119.',
    system: 'Delegates control from prefrontal deliberation to automatic cue-driven response',
    mechanic:
      'The quest composer will not accept a bare action. Every quest must be "When [cue], I will [action] at [place]." Bare verbs are rejected at validation with an explanation of why.',
    verse: 'Ecclesiastes 3:1',
    pillar: 'DO',
  },
  {
    id: 'mental_contrasting',
    name: 'Mental contrasting (WOOP)',
    finding:
      'Positive fantasy about a desired future, ALONE, predicts LOWER attainment — it discharges the energy of having already arrived. Contrasting the wish against the real internal obstacle converts it into energised commitment.',
    source:
      'Oettingen, G. (2012). Future Thought and Behaviour Change. European Review of Social Psychology, 23(1), 1–63. Also Kappes & Oettingen (2011), JESP 47(4).',
    system: 'Expectancy-dependent goal commitment',
    mechanic:
      'The WOOP Gate. A vision Stone stays veiled and inert until the player names the Outcome, the honest inner Obstacle, and an if-then Plan. This is the single hardest gate in the game and it is intentional — an uncontrasted vision board is a documented de-motivator.',
    verse: 'Luke 14:28',
    pillar: 'DO',
  },
  {
    id: 'context_dependent_memory',
    name: 'Context-dependent memory / encoding specificity',
    finding:
      'Divers who learned word lists underwater recalled them far better underwater than on land, and vice versa. Physical context becomes part of the memory trace and part of the habit cue.',
    source:
      'Godden, D. R., & Baddeley, A. D. (1975). Context-Dependent Memory in Two Natural Environments. British Journal of Psychology, 66(3), 325–331.',
    system: 'Hippocampal contextual binding',
    mechanic:
      'This is the scientific reason the game has a REAL map. Quests bind to real coordinates; the same behaviour in the same place builds automaticity far faster than the same behaviour scattered across contexts.',
    verse: 'Joshua 1:3',
    pillar: 'DO',
  },
  {
    id: 'habit_automaticity',
    name: 'Habit formation curve',
    finding:
      'Automaticity rises along an asymptotic curve, with a median of 66 days to plateau and a range of 18–254 days. Critically, a single missed day did NOT measurably harm the trajectory.',
    source:
      'Lally, P. et al. (2010). How Are Habits Formed: Modelling Habit Formation in the Real World. European Journal of Social Psychology, 40(6), 998–1009.',
    system: 'Dorsolateral striatum; chunking of action sequences',
    mechanic:
      'Each habit shows a real automaticity curve with its own estimated plateau, and one missed day explicitly does NOT reset it — because the data says it does not. This is where the science and Lamentations 3:23 say the same thing.',
    verse: 'Lamentations 3:23',
    pillar: 'DO',
  },
  {
    id: 'what_the_hell',
    name: 'The what-the-hell effect / abstinence violation',
    finding:
      'After a single perceived lapse, all-or-nothing framing triggers disproportionate abandonment of the whole goal. The lapse itself does little damage; the interpretation does.',
    source:
      'Cochran, W., & Tesser, A. (1996). The "What the Hell" Effect. In Striving and Feeling: Interactions Among Goals, Affect, and Self-Regulation. Also Polivy & Herman (1985), American Psychologist 40(2).',
    system: 'Self-regulatory collapse following goal-violation attribution',
    mechanic:
      'Streaks never zero out. A miss spends a Grace token and the streak continues at reduced momentum, with the framing "a just man falleth seven times, and riseth up again." Punitive streak-loss is the most common and most destructive mechanic in habit apps.',
    verse: 'Proverbs 24:16',
    pillar: 'DO',
  },

  // ── PLASTICITY, FOCUS, REST ──────────────────────────────────────────────
  {
    id: 'focused_attention_plasticity',
    name: 'Attention-gated plasticity',
    finding:
      'Cortical remapping occurs only for stimuli the animal ATTENDS to; identical unattended stimulation produces no map change. Focus is the gate on neuroplasticity, and it is chemically mediated.',
    source:
      'Recanzone, G. H., Schreiner, C. E., & Merzenich, M. M. (1993). Plasticity in the Frequency Representation of Primary Auditory Cortex. Journal of Neuroscience, 13(1), 87–103.',
    system: 'Acetylcholine (nucleus basalis) + norepinephrine gating of cortical plasticity',
    mechanic:
      'The Upper Room: distraction-free timed focus blocks. Time spent in a focus block is weighted far more heavily toward skill growth than the same minutes logged unfocused.',
    verse: 'Romans 12:2',
    pillar: 'DO',
  },
  {
    id: 'deliberate_rest_replay',
    name: 'Post-training rest and hippocampal replay',
    finding:
      'Immediately after practice, quiet waking rest produces compressed replay of the just-learned neural sequence — roughly 20× real speed — and the amount of replay predicts later performance. Rest is not the absence of learning; it is part of it.',
    source:
      'Foster, D. J., & Wilson, M. A. (2006). Reverse Replay of Behavioural Sequences in Hippocampal Place Cells During the Awake State. Nature, 440, 680–683. Also Tambini et al. (2010), Neuron 65(2).',
    system: 'Hippocampal sharp-wave ripples; sequence replay',
    mechanic:
      'A focus block does not end at the timer. It ends after a mandatory Stillness window with no input, framed by "Be still, and know that I am God." Skipping it forfeits part of the block\'s growth credit.',
    verse: 'Psalm 46:10',
    pillar: 'DO',
  },
  {
    id: 'sleep_consolidation',
    name: 'Sleep-dependent memory consolidation',
    finding:
      'Motor and declarative learning improve measurably ACROSS a night of sleep with no additional practice; sleep deprivation blocks the gain. Material reviewed before sleep is preferentially consolidated.',
    source:
      'Walker, M. P. et al. (2002). Practice with Sleep Makes Perfect. Neuron, 35(1), 205–211. Also Rasch & Born (2013), Physiological Reviews 93(2).',
    system: 'Slow-wave sleep; hippocampal–neocortical transfer',
    mechanic:
      'The Evening Altar: a short pre-sleep review of the day\'s single most important rep. Deliberately scheduled last so the material is the final thing entering sleep.',
    verse: 'Psalm 4:4',
    pillar: 'DO',
  },
  {
    id: 'ultradian_rhythm',
    name: 'Ultradian cycles and vigilance decrement',
    finding:
      'Arousal and attention cycle in roughly 90-minute periods; sustained vigilance degrades measurably well before that ceiling in demanding tasks.',
    source:
      'Kleitman, N. (1963). Sleep and Wakefulness. Univ. Chicago Press. Vigilance decrement: Mackworth, N. H. (1948), Quarterly Journal of Experimental Psychology 1(1).',
    system: 'Basic rest–activity cycle',
    mechanic:
      'Focus blocks are offered at 25 / 50 / 90 minutes and the app refuses to chain more than two without a real break.',
    verse: 'Isaiah 40:31',
    pillar: 'DO',
  },
  {
    id: 'sabbath_recovery',
    name: 'Recovery, overreaching and detachment',
    finding:
      'Continuous load without recovery degrades performance and elevates cortisol; psychological DETACHMENT from work during off-hours predicts recovery and next-day vigour better than mere physical rest.',
    source:
      'Sonnentag, S., & Fritz, C. (2007). The Recovery Experience Questionnaire. Journal of Occupational Health Psychology, 12(3), 204–221.',
    system: 'HPA axis; allostatic load',
    mechanic:
      'The Sabbath Lock. One day a week the game REFUSES to serve quests. It offers only reflection and the Circle. A game that will not let you play is the most counter-cultural mechanic in it, and it is both the fourth commandment and the recovery literature.',
    verse: 'Exodus 20:8',
    pillar: 'BE',
  },

  // ── PROGRESS, SOCIAL, COMPOUNDING ────────────────────────────────────────
  {
    id: 'progress_principle',
    name: 'The progress principle',
    finding:
      'Across ~12,000 daily diary entries, the single strongest driver of positive inner work life was making progress in meaningful work — and small wins accounted for most of it. NOTICING the progress is part of the effect.',
    source: 'Amabile, T. M., & Kramer, S. J. (2011). The Progress Principle. Harvard Business Review Press.',
    system: 'Daily affect regulation; reward learning',
    mechanic:
      'The Chronicle. After every session the app writes an automatic note of what was accomplished and what it built toward. Nothing is completed silently.',
    verse: 'Zechariah 4:10',
    pillar: 'HAVE',
  },
  {
    id: 'process_vs_outcome_simulation',
    name: 'Process vs. outcome simulation',
    finding:
      'Students who mentally simulated the PROCESS of studying got higher exam grades and studied more. Students who simulated the OUTCOME — getting the grade — did WORSE than the control group.',
    source:
      'Pham, L. B., & Taylor, S. E. (1999). From Thought to Action: Effects of Process- vs. Outcome-Based Mental Simulations. Personality and Social Psychology Bulletin, 25(2), 250–260.',
    system: 'Planning and self-regulation networks',
    mechanic:
      'This is why HAVE is demoted in the daily loop. The vision image is present as a memorial, but the daily screen shows the process — the next rep — and the Have unlocks automatically as evidence accrues. A vision board you stare at daily without contrasting is the exact condition this study found harmful.',
    verse: 'Matthew 6:33',
    pillar: 'HAVE',
  },
  {
    id: 'social_contagion',
    name: 'Social contagion of behaviour',
    finding:
      'Behaviours and states spread through real social networks up to three degrees of separation. Who you are connected to measurably shifts your own trajectory.',
    source:
      'Christakis, N. A., & Fowler, J. H. (2007). The Spread of Obesity in a Large Social Network over 32 Years. NEJM, 357, 370–379.',
    system: 'Social network effects on norms and behaviour',
    mechanic:
      'The Covenant Circle is a real multiplier in the growth maths, not decoration. Sowing into a friend generates Seed that compounds — this is the network term that makes the curve genuinely exponential rather than merely accelerating.',
    verse: 'Ecclesiastes 4:12',
    pillar: 'HAVE',
  },
  {
    id: 'public_commitment',
    name: 'Commitment and consistency',
    finding:
      'Commitments that are active, effortful and witnessed by others are far more likely to be honoured, because they become part of the committer\'s self-concept.',
    source: 'Cialdini, R. B. (2009). Influence: Science and Practice (5th ed.). Pearson.',
    system: 'Consistency drive; self-concept maintenance',
    mechanic:
      'Quests can be sealed to the Circle. A sealed quest is visible to the covenant partners and its completion is reported to them.',
    verse: 'Ecclesiastes 4:9',
    pillar: 'HAVE',
  },
  {
    id: 'power_law_practice',
    name: 'Power law of practice',
    finding:
      'Across an enormous range of skills, performance time improves as a power function of cumulative practice trials. Early gains are steep; the curve never fully flattens but returns diminish per rep — which is exactly why compounding must come from elsewhere.',
    source: 'Newell, A., & Rosenbloom, P. S. (1981). Mechanisms of Skill Acquisition and the Law of Practice. In Cognitive Skills and Their Acquisition.',
    system: 'Procedural learning; chunking',
    mechanic:
      'Drives the Increase curve\'s skill term. It is also the honest reason the game shows TWO lines: raw reps alone flatten. The exponential comes from consistency multipliers and network seed, not from grinding harder.',
    verse: 'Mark 4:8',
    pillar: 'HAVE',
  },
  {
    id: 'fresh_start_effect',
    name: 'The fresh start effect',
    finding:
      'Temporal landmarks — a new week, month, birthday — produce measurable spikes in goal-directed behaviour by creating a psychological break from an imperfect past self.',
    source:
      'Dai, H., Milkman, K. L., & Riis, J. (2014). The Fresh Start Effect. Management Science, 60(10), 2563–2582.',
    system: 'Temporal self-appraisal; mental accounting of time',
    mechanic:
      'Restoration after a fall is deliberately framed as a NEW SEASON with a dated landmark rather than a resumed failure, pairing the science with "his compassions... are new every morning."',
    verse: 'Isaiah 43:19',
    pillar: 'BE',
  },
  {
    id: 'temptation_bundling',
    name: 'Temptation bundling',
    finding:
      'Pairing a "should" behaviour with a "want" that is only available during it raised gym attendance significantly in a field experiment.',
    source: 'Milkman, K. L., Minson, J. A., & Volpp, K. G. M. (2014). Holding the Hunger Games Hostage at the Gym. Management Science, 60(2), 283–299.',
    system: 'Reward substitution',
    mechanic:
      'Quests support an optional Bundle field — a want that is permitted only during that quest.',
    verse: 'Colossians 3:23',
    pillar: 'DO',
  },
  {
    id: 'self_distancing',
    name: 'Self-distancing',
    finding:
      'Reflecting on difficulty in the third person ("why does he feel this?") reduces emotional reactivity and improves reasoning versus first-person rumination, with measurably lower physiological stress.',
    source:
      'Kross, E. et al. (2014). Self-Talk as a Regulatory Mechanism. Journal of Personality and Social Psychology, 106(2), 304–324.',
    system: 'Reduced amygdala reactivity; enhanced prefrontal control',
    mechanic:
      'When a quest fails twice the app switches the reflection prompt into third person, addressing the player by their New Name.',
    verse: 'Psalm 42:11',
    pillar: 'BE',
  },
];

export const PILLARS = {
  BE: {
    key: 'BE',
    title: 'BE',
    line: 'Identity is assigned before the behaviour matches it.',
    verse: 'Romans 4:17',
    blurb:
      'The world teaches HAVE → DO → BE: when I have the money, I will do the things, and then I will be free. Scripture reverses it, and so does the evidence. God renamed Abram before the child came and called Gideon a mighty man of valour while he hid in a winepress. You are named first, you act from the name, and the result follows.',
  },
  DO: {
    key: 'DO',
    title: 'DO',
    line: 'Each action is a vote. The tally becomes the self.',
    verse: 'Hebrews 11:1',
    blurb:
      'You do not become the person by deciding harder. You become them by accumulating evidence you can watch yourself producing. Faith without works is dead; identity without reps is a mood.',
  },
  HAVE: {
    key: 'HAVE',
    title: 'HAVE',
    line: 'The result is added, never chased.',
    verse: 'Matthew 6:33',
    blurb:
      'This is the part the game deliberately keeps quiet about day to day. Staring at outcomes measurably lowers performance; simulating the process raises it. Your board is kept as a memorial, not a daily craving.',
  },
};

export function principle(id) {
  return PRINCIPLES.find((p) => p.id === id) || null;
}

export function principlesForPillar(pillar) {
  return PRINCIPLES.filter((p) => p.pillar === pillar);
}
