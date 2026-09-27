'use strict';

/* =========================================================
   Configuration
   ========================================================= */

const STORAGE_KEY = 'rps-advanced-state';
const LEGACY_STORAGE_KEY = 'score';
const HISTORY_LIMIT = 100;
const AUTO_PLAY_INTERVAL = 1000;
const COUNTDOWN_STEP_MS = 280;

// Each move lists the moves it beats and the verb used to describe the win.
const MOVES = {
  rock: {
    label: 'Rock', key: 'r', icon: 'images/rock-emoji.png',
    beats: { scissors: 'crushes', lizard: 'crushes' }
  },
  paper: {
    label: 'Paper', key: 'p', icon: 'images/paper-emoji.png',
    beats: { rock: 'covers', spock: 'disproves' }
  },
  scissors: {
    label: 'Scissors', key: 's', icon: 'images/scissors-emoji.png',
    beats: { paper: 'cuts', lizard: 'decapitates' }
  },
  lizard: {
    label: 'Lizard', key: 'l', emoji: '🦎',
    beats: { spock: 'poisons', paper: 'eats' }
  },
  spock: {
    label: 'Spock', key: 'k', emoji: '🖖',
    beats: { scissors: 'smashes', rock: 'vaporizes' }
  }
};

const MODES = {
  classic: { label: 'Classic', moves: ['rock', 'paper', 'scissors'] },
  extended: { label: 'Lizard · Spock', moves: ['rock', 'paper', 'scissors', 'lizard', 'spock'] }
};

const DIFFICULTIES = {
  easy: { label: 'Easy', exploitRate: 0 },
  normal: { label: 'Normal', exploitRate: 0.6 },
  hard: { label: 'Hard', exploitRate: 0.85 }
};

const MATCH_LENGTHS = [0, 3, 5, 7];
const OUTCOMES = ['win', 'lose', 'tie'];

const ACHIEVEMENTS = [
  { id: 'first-win', icon: '🥇', name: 'First Blood', desc: 'Win your first round.' },
  { id: 'hat-trick', icon: '🎩', name: 'Hat Trick', desc: 'Win 3 rounds in a row.' },
  { id: 'unstoppable', icon: '🔥', name: 'Unstoppable', desc: 'Win 5 rounds in a row.' },
  { id: 'legendary', icon: '👑', name: 'Legendary', desc: 'Win 10 rounds in a row.' },
  { id: 'great-minds', icon: '🤝', name: 'Great Minds', desc: 'Tie 3 rounds in a row.' },
  { id: 'dedicated', icon: '🎯', name: 'Dedicated', desc: 'Play 50 rounds.' },
  { id: 'centurion', icon: '💯', name: 'Centurion', desc: 'Play 100 rounds.' },
  { id: 'match-winner', icon: '🏆', name: 'Champion', desc: 'Win a best-of match.' },
  { id: 'flawless', icon: '💎', name: 'Flawless Victory', desc: 'Win a best-of-5 or longer match without losing a round.' },
  { id: 'mind-reader', icon: '🧠', name: 'Mind Reader', desc: 'Win a match against the Hard AI.' },
  { id: 'spock', icon: '🖖', name: 'Live Long and Prosper', desc: 'Win a round with Spock.' },
  { id: 'explorer', icon: '🧭', name: 'Explorer', desc: 'Play every one of the five moves.' }
];

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   State & persistence
   ========================================================= */

function createDefaultState() {
  return {
    settings: {
      mode: 'classic',
      difficulty: 'normal',
      matchLength: 0,
      sound: true,
      theme: 'dark',
      countdown: true
    },
    stats: {
      wins: 0,
      losses: 0,
      ties: 0,
      currentStreak: 0,
      bestStreak: 0,
      matchesWon: 0,
      matchesLost: 0,
      moveCounts: {}
    },
    history: [],
    achievements: {},
    match: { player: 0, computer: 0, rounds: 0, over: false }
  };
}

function isValidRound(round) {
  return round && typeof round === 'object' &&
    Object.hasOwn(MOVES, round.player) &&
    Object.hasOwn(MOVES, round.computer) &&
    OUTCOMES.includes(round.outcome) &&
    Object.hasOwn(MODES, round.mode);
}

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

// Loads saved state, validating every field so a corrupted or tampered
// localStorage entry can never break the game or inject markup.
function loadState() {
  const base = createDefaultState();

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (saved && typeof saved === 'object') {
      const s = { ...base.settings, ...saved.settings };
      base.settings = {
        mode: Object.hasOwn(MODES, s.mode) ? s.mode : 'classic',
        difficulty: Object.hasOwn(DIFFICULTIES, s.difficulty) ? s.difficulty : 'normal',
        matchLength: MATCH_LENGTHS.includes(Number(s.matchLength)) ? Number(s.matchLength) : 0,
        sound: s.sound !== false,
        theme: s.theme === 'light' ? 'light' : 'dark',
        countdown: s.countdown !== false
      };

      const st = saved.stats || {};
      const moveCounts = {};
      Object.keys(MOVES).forEach((move) => {
        moveCounts[move] = toCount(st.moveCounts && st.moveCounts[move]);
      });
      base.stats = {
        wins: toCount(st.wins),
        losses: toCount(st.losses),
        ties: toCount(st.ties),
        currentStreak: toCount(st.currentStreak),
        bestStreak: toCount(st.bestStreak),
        matchesWon: toCount(st.matchesWon),
        matchesLost: toCount(st.matchesLost),
        moveCounts
      };

      base.history = Array.isArray(saved.history)
        ? saved.history.filter(isValidRound).slice(-HISTORY_LIMIT)
        : [];

      if (saved.achievements && typeof saved.achievements === 'object') {
        ACHIEVEMENTS.forEach(({ id }) => {
          if (saved.achievements[id]) base.achievements[id] = Number(saved.achievements[id]) || Date.now();
        });
      }

      const m = saved.match || {};
      base.match = {
        player: toCount(m.player),
        computer: toCount(m.computer),
        rounds: toCount(m.rounds),
        over: Boolean(m.over)
      };
      return base;
    }

    // Migrate the score saved by the original version of the game.
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy && typeof legacy === 'object') {
      base.stats.wins = toCount(legacy.wins);
      base.stats.losses = toCount(legacy.losses);
      base.stats.ties = toCount(legacy.ties);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Saved game data was unreadable, starting fresh.', error);
  }

  return base;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Could not save game data.', error);
  }
}

let state = loadState();
let isAutoPlaying = false;
let autoPlayIntervalId = null;
let isBusy = false; // true while the countdown animation runs

/* =========================================================
   Game logic
   ========================================================= */

function currentMoves() {
  return MODES[state.settings.mode].moves;
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getOutcome(playerMove, computerMove) {
  if (playerMove === computerMove) return 'tie';
  return MOVES[playerMove].beats[computerMove] ? 'win' : 'lose';
}

function describeRound(playerMove, computerMove, outcome) {
  if (outcome === 'tie') return 'Great minds think alike.';
  const [winner, loser] = outcome === 'win'
    ? [playerMove, computerMove]
    : [computerMove, playerMove];
  return `${MOVES[winner].label} ${MOVES[winner].beats[loser]} ${MOVES[loser].label}.`;
}

// Returns the key with the highest count, breaking ties randomly.
function argMax(counts) {
  let best = [];
  let bestCount = 0;
  Object.entries(counts).forEach(([key, count]) => {
    if (count > bestCount) {
      best = [key];
      bestCount = count;
    } else if (count === bestCount && count > 0) {
      best.push(key);
    }
  });
  return best.length ? randomItem(best) : null;
}

function mostFrequent(list) {
  const counts = {};
  list.forEach((item) => { counts[item] = (counts[item] || 0) + 1; });
  return argMax(counts);
}

/*
  Predicts the player's next move from their history in the current mode.
  - Normal: the player's most frequent move over the last 10 rounds.
  - Hard:   a Markov chain. It looks for the last 2 (then 1) moves the player
            made earlier in their history and checks what they played next.
            Falls back to frequency analysis when there is no match.
*/
function predictPlayerMove() {
  const past = state.history
    .filter((round) => round.mode === state.settings.mode)
    .map((round) => round.player);

  if (past.length < 3) return null;

  if (state.settings.difficulty === 'hard') {
    for (const order of [2, 1]) {
      if (past.length <= order) continue;
      const context = past.slice(-order).join('|');
      const nextCounts = {};

      for (let i = order; i < past.length; i++) {
        if (past.slice(i - order, i).join('|') === context) {
          nextCounts[past[i]] = (nextCounts[past[i]] || 0) + 1;
        }
      }

      const prediction = argMax(nextCounts);
      if (prediction) return prediction;
    }
    return mostFrequent(past.slice(-20));
  }

  return mostFrequent(past.slice(-10));
}

// The AI commits to its move before the player's move is revealed to it.
// It only ever looks at *previous* rounds, so it never cheats.
function pickComputerMove() {
  const moves = currentMoves();
  const { exploitRate } = DIFFICULTIES[state.settings.difficulty];

  if (exploitRate === 0 || Math.random() > exploitRate) {
    return { move: randomItem(moves), prediction: null };
  }

  const prediction = predictPlayerMove();
  if (!prediction) return { move: randomItem(moves), prediction: null };

  const counters = moves.filter((move) => MOVES[move].beats[prediction]);
  return { move: randomItem(counters), prediction };
}

function handleMove(playerMove) {
  if (isBusy || !currentMoves().includes(playerMove)) return;

  hideResetConfirmation();
  if (state.match.over) startNewMatch();

  const { move: computerMove, prediction } = pickComputerMove();

  if (state.settings.countdown && !isAutoPlaying) {
    runCountdown(() => resolveRound(playerMove, computerMove, prediction));
  } else {
    resolveRound(playerMove, computerMove, prediction);
  }
}

function runCountdown(onDone) {
  const countdownEl = document.querySelector('.js-countdown');
  const steps = ['Rock…', 'Paper…', 'Scissors…', 'Shoot!'];
  let index = 0;

  setBusy(true);

  const tick = () => {
    if (index < steps.length) {
      countdownEl.textContent = steps[index];
      countdownEl.classList.remove('pulse');
      void countdownEl.offsetWidth; // restart the CSS animation
      countdownEl.classList.add('pulse');
      playSound(index === steps.length - 1 ? 'shoot' : 'tick');
      index++;
      setTimeout(tick, COUNTDOWN_STEP_MS);
    } else {
      countdownEl.textContent = '';
      setBusy(false);
      onDone();
    }
  };

  tick();
}

function setBusy(busy) {
  isBusy = busy;
  document.querySelectorAll('.js-move-button').forEach((button) => {
    button.disabled = busy;
  });
}

function resolveRound(playerMove, computerMove, prediction) {
  const outcome = getOutcome(playerMove, computerMove);
  const { stats, match, settings } = state;

  stats.moveCounts[playerMove] = (stats.moveCounts[playerMove] || 0) + 1;

  if (outcome === 'win') {
    stats.wins++;
    stats.currentStreak++;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  } else if (outcome === 'lose') {
    stats.losses++;
    stats.currentStreak = 0;
  } else {
    stats.ties++; // ties don't break a win streak
  }

  state.history.push({
    player: playerMove,
    computer: computerMove,
    outcome,
    mode: settings.mode,
    difficulty: settings.difficulty,
    time: Date.now()
  });
  if (state.history.length > HISTORY_LIMIT) {
    state.history = state.history.slice(-HISTORY_LIMIT);
  }

  // Best-of-N match tracking
  let matchResult = null;
  if (settings.matchLength > 0) {
    match.rounds++;
    if (outcome === 'win') match.player++;
    if (outcome === 'lose') match.computer++;

    const target = Math.ceil(settings.matchLength / 2);
    if (match.player >= target) {
      matchResult = 'won';
      stats.matchesWon++;
    } else if (match.computer >= target) {
      matchResult = 'lost';
      stats.matchesLost++;
    }
    match.over = matchResult !== null;
  }

  const unlocked = checkAchievements({ playerMove, outcome, matchResult });

  saveState();
  renderRound(playerMove, computerMove, outcome, prediction);
  renderAll();

  // Feedback: sound + effects
  if (matchResult === 'won') {
    playSound('match');
    launchConfetti();
  } else {
    playSound(outcome);
  }

  unlocked.forEach((achievement, i) => {
    setTimeout(() => {
      showToast(`${achievement.icon} Achievement unlocked: ${achievement.name}`);
      playSound('achievement');
    }, 400 + i * 600);
  });
}

function startNewMatch() {
  state.match = { player: 0, computer: 0, rounds: 0, over: false };
  saveState();
  renderMatch();
}

/* =========================================================
   Achievements
   ========================================================= */

function checkAchievements({ playerMove, outcome, matchResult }) {
  // Auto play can't unlock achievements; you have to earn them.
  if (isAutoPlaying) return [];

  const { stats, history, settings, match } = state;
  const totalRounds = stats.wins + stats.losses + stats.ties;
  const lastThree = history.slice(-3);

  const conditions = {
    'first-win': stats.wins >= 1,
    'hat-trick': stats.currentStreak >= 3,
    'unstoppable': stats.currentStreak >= 5,
    'legendary': stats.currentStreak >= 10,
    'great-minds': lastThree.length === 3 && lastThree.every((r) => r.outcome === 'tie'),
    'dedicated': totalRounds >= 50,
    'centurion': totalRounds >= 100,
    'match-winner': matchResult === 'won',
    'flawless': matchResult === 'won' && settings.matchLength >= 5 && match.computer === 0,
    'mind-reader': matchResult === 'won' && settings.difficulty === 'hard',
    'spock': outcome === 'win' && playerMove === 'spock',
    'explorer': Object.keys(MOVES).every((move) => stats.moveCounts[move] > 0)
  };

  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach((achievement) => {
    if (!state.achievements[achievement.id] && conditions[achievement.id]) {
      state.achievements[achievement.id] = Date.now();
      newlyUnlocked.push(achievement);
    }
  });
  return newlyUnlocked;
}

/* =========================================================
   Rendering
   ========================================================= */

function moveIconHTML(move, className = 'move-icon') {
  const { label, icon, emoji } = MOVES[move];
  return icon
    ? `<img src="${icon}" class="${className}" alt="${label}">`
    : `<span class="${className} emoji-icon" role="img" aria-label="${label}">${emoji}</span>`;
}

function renderMoveButtons() {
  const container = document.querySelector('.js-move-buttons');
  container.innerHTML = currentMoves().map((move) => `
    <button type="button" class="move-button js-move-button" data-move="${move}"
      aria-label="${MOVES[move].label} (${MOVES[move].key.toUpperCase()})"
      title="${MOVES[move].label} (${MOVES[move].key.toUpperCase()})">
      ${moveIconHTML(move)}
      <kbd class="key-hint">${MOVES[move].key.toUpperCase()}</kbd>
    </button>
  `).join('');
  container.classList.toggle('five-moves', currentMoves().length === 5);
}

function renderRound(playerMove, computerMove, outcome, prediction) {
  const resultEl = document.querySelector('.js-result');
  const resultText = { win: 'You win.', lose: 'You lose.', tie: 'Tie.' }[outcome];

  resultEl.textContent = resultText;
  resultEl.className = `js-result result result-${outcome}`;
  if (!prefersReducedMotion) {
    void resultEl.offsetWidth;
    resultEl.classList.add(outcome === 'lose' ? 'shake' : 'pop');
  }

  document.querySelector('.js-result-detail').textContent =
    describeRound(playerMove, computerMove, outcome);

  document.querySelector('.js-moves').innerHTML = `
    <span class="moves-label">You</span>
    ${moveIconHTML(playerMove)}
    <span class="versus">vs</span>
    ${moveIconHTML(computerMove)}
    <span class="moves-label">Computer</span>
  `;

  let insight;
  if (state.settings.difficulty === 'easy') {
    insight = '🎲 The AI picked at random.';
  } else if (prediction) {
    insight = `🧠 The AI predicted you'd play ${MOVES[prediction].label}. ` +
      (prediction === playerMove ? 'It read you right.' : 'You outsmarted it.');
  } else {
    insight = '🎲 The AI played a random move this round.';
  }
  document.querySelector('.js-ai-insight').textContent = insight;
}

function renderScore() {
  const { wins, losses, ties } = state.stats;
  document.querySelector('.js-score').textContent =
    `Wins: ${wins}, Losses: ${losses}, Ties: ${ties}`;
}

function renderMatch() {
  const board = document.querySelector('.js-match-board');
  const { matchLength } = state.settings;
  board.hidden = matchLength === 0;
  if (matchLength === 0) return;

  const { player, computer, rounds, over } = state.match;
  const target = Math.ceil(matchLength / 2);

  document.querySelector('.js-match-player').textContent = player;
  document.querySelector('.js-match-computer').textContent = computer;
  document.querySelector('.js-match-label').textContent =
    `Best of ${matchLength} · first to ${target}`;

  let status;
  if (over) {
    status = player > computer
      ? `🏆 You won the match ${player}–${computer}! Make a move to play again.`
      : `💀 The AI won the match ${computer}–${player}. Make a move for a rematch.`;
  } else {
    status = rounds === 0 ? 'Make a move to start' : `Round ${rounds + 1}`;
  }
  document.querySelector('.js-match-status').textContent = status;
  board.classList.toggle('match-won', over && player > computer);
  board.classList.toggle('match-lost', over && computer > player);
}

function renderStats() {
  const { wins, losses, ties, currentStreak, bestStreak, matchesWon, matchesLost } = state.stats;
  const total = wins + losses + ties;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const items = [
    ['Rounds played', total],
    ['Win rate', `${winRate}%`],
    ['Current streak', `${currentStreak}${currentStreak >= 3 ? ' 🔥' : ''}`],
    ['Best streak', bestStreak],
    ['Matches won', matchesWon],
    ['Matches lost', matchesLost]
  ];

  document.querySelector('.js-stats-grid').innerHTML = items.map(([label, value]) => `
    <div class="stat">
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>
  `).join('');

  // Move distribution for the current mode
  const moves = currentMoves();
  const counts = moves.map((move) => state.stats.moveCounts[move] || 0);
  const totalMoves = counts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...counts);

  document.querySelector('.js-move-distribution').innerHTML = moves.map((move, i) => {
    const percent = totalMoves ? Math.round((counts[i] / totalMoves) * 100) : 0;
    return `
      <div class="bar-row">
        <span class="bar-label">${moveIconHTML(move, 'mini-icon')} ${MOVES[move].label}</span>
        <span class="bar-track" aria-hidden="true">
          <span class="bar-fill" style="width: ${(counts[i] / maxCount) * 100}%"></span>
        </span>
        <span class="bar-value">${percent}%</span>
      </div>
    `;
  }).join('');

  const hint = document.querySelector('.js-tendency-hint');
  if (totalMoves >= 10) {
    const favourite = moves[counts.indexOf(Math.max(...counts))];
    const share = Math.round((Math.max(...counts) / totalMoves) * 100);
    const expected = Math.round(100 / moves.length);
    hint.textContent = share > expected + 10
      ? `You lean on ${MOVES[favourite].label} (${share}%). The adaptive AI will notice.`
      : 'Nicely balanced. You are hard to predict.';
  } else {
    hint.textContent = 'Play a few more rounds to see your tendencies.';
  }
}

function renderHistory() {
  const list = document.querySelector('.js-history');
  const recent = state.history.slice(-10).reverse();

  if (!recent.length) {
    list.innerHTML = '<li class="empty">No rounds played yet.</li>';
    return;
  }

  const labels = { win: 'Win', lose: 'Loss', tie: 'Tie' };
  list.innerHTML = recent.map((round) => `
    <li class="history-item outcome-${round.outcome}">
      <span class="history-moves">
        ${moveIconHTML(round.player, 'mini-icon')}
        <span class="versus">vs</span>
        ${moveIconHTML(round.computer, 'mini-icon')}
      </span>
      <span class="history-outcome">${labels[round.outcome]}</span>
    </li>
  `).join('');
}

function renderAchievements() {
  const unlockedCount = ACHIEVEMENTS.filter(({ id }) => state.achievements[id]).length;
  document.querySelector('.js-achievement-count').textContent =
    `${unlockedCount}/${ACHIEVEMENTS.length}`;

  document.querySelector('.js-achievements').innerHTML = ACHIEVEMENTS.map(({ id, icon, name, desc }) => {
    const unlockedAt = state.achievements[id];
    const status = unlockedAt
      ? `Unlocked ${new Date(unlockedAt).toLocaleDateString()}`
      : 'Locked';
    return `
      <li class="achievement ${unlockedAt ? 'unlocked' : 'locked'}" title="${desc} (${status})">
        <span class="achievement-icon" aria-hidden="true">${unlockedAt ? icon : '🔒'}</span>
        <span class="achievement-text">
          <strong>${name}</strong>
          <small>${desc}</small>
        </span>
        <span class="visually-hidden">${status}</span>
      </li>
    `;
  }).join('');
}

function renderRules() {
  const moves = currentMoves();
  const rules = [];
  moves.forEach((winner) => {
    Object.entries(MOVES[winner].beats).forEach(([loser, verb]) => {
      if (moves.includes(loser)) {
        rules.push(`<li>${moveIconHTML(winner, 'mini-icon')} ${MOVES[winner].label} ${verb} ${MOVES[loser].label}</li>`);
      }
    });
  });
  document.querySelector('.js-rules').innerHTML = rules.join('');
}

function renderSettings() {
  const { mode, difficulty, matchLength, sound, theme, countdown } = state.settings;

  document.querySelector('.js-mode-select').value = mode;
  document.querySelector('.js-difficulty-select').value = difficulty;
  document.querySelector('.js-match-select').value = String(matchLength);
  document.querySelector('.js-countdown-toggle').checked = countdown;

  const soundButton = document.querySelector('.js-sound-toggle');
  soundButton.textContent = sound ? '🔊' : '🔇';
  soundButton.setAttribute('aria-pressed', String(sound));

  document.documentElement.dataset.theme = theme;
  document.querySelector('.js-theme-toggle').textContent = theme === 'dark' ? '🌙' : '☀️';
}

function renderAll() {
  renderSettings();
  renderScore();
  renderMatch();
  renderStats();
  renderHistory();
  renderAchievements();
  renderRules();
}

/* =========================================================
   Auto play, reset & export
   ========================================================= */

function toggleAutoPlay() {
  const button = document.querySelector('.js-auto-play-button');

  if (!isAutoPlaying) {
    isAutoPlaying = true;
    autoPlayIntervalId = setInterval(() => {
      handleMove(randomItem(currentMoves()));
    }, AUTO_PLAY_INTERVAL);
    button.textContent = 'Stop Playing';
  } else {
    clearInterval(autoPlayIntervalId);
    isAutoPlaying = false;
    button.textContent = 'Auto Play';
  }
  button.setAttribute('aria-pressed', String(isAutoPlaying));
  button.classList.toggle('active', isAutoPlaying);
}

function resetScore() {
  // Keep the player's preferences, wipe everything else.
  const { settings } = state;
  state = createDefaultState();
  state.settings = settings;
  saveState();

  document.querySelector('.js-result').textContent = 'Make your move';
  document.querySelector('.js-result').className = 'js-result result';
  document.querySelector('.js-result-detail').textContent = '';
  document.querySelector('.js-moves').innerHTML = '';
  document.querySelector('.js-ai-insight').textContent = '';
  renderAll();
  showToast('Score and progress reset.');
}

function showResetConfirmation() {
  const container = document.querySelector('.js-reset-confirmation');
  container.innerHTML = `
    <span>Reset score, history and achievements?</span>
    <button type="button" class="js-reset-confirm-yes reset-confirm-button danger">Yes</button>
    <button type="button" class="js-reset-confirm-no reset-confirm-button">No</button>
  `;

  document.querySelector('.js-reset-confirm-yes').addEventListener('click', () => {
    resetScore();
    hideResetConfirmation();
  });
  document.querySelector('.js-reset-confirm-no').addEventListener('click', hideResetConfirmation);
  document.querySelector('.js-reset-confirm-no').focus();
}

function hideResetConfirmation() {
  document.querySelector('.js-reset-confirmation').innerHTML = '';
}

function exportStats() {
  const data = { exportedAt: new Date().toISOString(), ...state };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rock-paper-scissors-stats-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('📁 Stats exported.');
}

/* =========================================================
   Settings
   ========================================================= */

function updateSetting(key, value, { resetMatch = false } = {}) {
  state.settings[key] = value;
  if (resetMatch) state.match = { player: 0, computer: 0, rounds: 0, over: false };
  saveState();
  renderAll();
}

function toggleSound() {
  updateSetting('sound', !state.settings.sound);
  if (state.settings.sound) playSound('tick');
}

function toggleTheme() {
  updateSetting('theme', state.settings.theme === 'dark' ? 'light' : 'dark');
}

/* =========================================================
   Sound (Web Audio API, no audio files needed)
   ========================================================= */

let audioContext = null;

const SOUND_PATTERNS = {
  // [frequency Hz, start offset s, duration s]
  tick: [[660, 0, 0.06]],
  shoot: [[880, 0, 0.1]],
  win: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.2]],
  lose: [[392, 0, 0.15], [311, 0.14, 0.25]],
  tie: [[494, 0, 0.12], [494, 0.14, 0.12]],
  match: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.35]],
  achievement: [[784, 0, 0.1], [988, 0.1, 0.1], [1175, 0.2, 0.25]]
};

function playSound(type) {
  if (!state.settings.sound || !SOUND_PATTERNS[type]) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    audioContext = audioContext || new AudioCtx();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;

    SOUND_PATTERNS[type].forEach(([frequency, start, duration]) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.15, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now + start);
      oscillator.stop(now + start + duration + 0.02);
    });
  } catch (error) {
    // Audio is a nice-to-have; never let it break the game.
  }
}

/* =========================================================
   Toasts & confetti
   ========================================================= */

function showToast(message) {
  const container = document.querySelector('.js-toasts');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('hide'), 3200);
  setTimeout(() => toast.remove(), 3600);
}

let confettiFrameId = null;

function launchConfetti() {
  if (prefersReducedMotion) return;

  const canvas = document.querySelector('.js-confetti');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ffffff'];
  const particles = Array.from({ length: 160 }, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * window.innerHeight * 0.4,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    size: 6 + Math.random() * 6,
    color: randomItem(colors),
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.3
  }));

  cancelAnimationFrame(confettiFrameId);
  const startTime = performance.now();

  const frame = (now) => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rotation += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });

    if (now - startTime < 3500) {
      confettiFrameId = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  };
  confettiFrameId = requestAnimationFrame(frame);
}

/* =========================================================
   Event listeners
   ========================================================= */

document.querySelector('.js-move-buttons').addEventListener('click', (event) => {
  const button = event.target.closest('.js-move-button');
  if (button) handleMove(button.dataset.move);
});

document.querySelector('.js-auto-play-button').addEventListener('click', toggleAutoPlay);
document.querySelector('.js-reset-score-button').addEventListener('click', showResetConfirmation);
document.querySelector('.js-export-button').addEventListener('click', exportStats);
document.querySelector('.js-sound-toggle').addEventListener('click', toggleSound);
document.querySelector('.js-theme-toggle').addEventListener('click', toggleTheme);

document.querySelector('.js-mode-select').addEventListener('change', (event) => {
  updateSetting('mode', event.target.value, { resetMatch: true });
  renderMoveButtons();
});

document.querySelector('.js-difficulty-select').addEventListener('change', (event) => {
  updateSetting('difficulty', event.target.value, { resetMatch: true });
});

document.querySelector('.js-match-select').addEventListener('change', (event) => {
  updateSetting('matchLength', Number(event.target.value), { resetMatch: true });
});

document.querySelector('.js-countdown-toggle').addEventListener('change', (event) => {
  updateSetting('countdown', event.target.checked);
});

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;

  const key = event.key.toLowerCase();
  const move = currentMoves().find((m) => MOVES[m].key === key);

  if (move) {
    handleMove(move);
    return;
  }

  switch (key) {
    case 'a': toggleAutoPlay(); break;
    case 'm': toggleSound(); break;
    case 't': toggleTheme(); break;
    case 'backspace': showResetConfirmation(); break;
    case 'escape': hideResetConfirmation(); break;
    default: break;
  }
});

/* =========================================================
   Init
   ========================================================= */

renderMoveButtons();
renderAll();
