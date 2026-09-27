# ✊✋✌️ Rock Paper Scissors · Advanced Edition

A modern take on the classic game, built with plain HTML, CSS and JavaScript. No frameworks, no build step, no dependencies.

The computer isn't just rolling dice anymore. On higher difficulties it **studies your play history and predicts your next move**, so the real challenge is staying unpredictable.

![Gameplay screenshot](https://github.com/user-attachments/assets/4f531a22-e088-4cba-bce3-c258d42a6a08)

---

## ✨ Features

### 🧠 Adaptive AI with three difficulty levels
| Level | How the AI thinks |
|-------|-------------------|
| **Easy** | Picks completely at random. |
| **Normal** | Tracks your most frequent move over the last 10 rounds and counters it about 60% of the time. |
| **Hard** | Uses a **Markov chain** over your history: it finds the last 2 (or 1) moves you made, looks at what you played after that sequence before, and counters it about 85% of the time. |

After every round an **AI insight** line tells you what the AI predicted and whether it read you right.

> The AI commits to its move using only *previous* rounds. It never sees your current move.

### 🦎🖖 Two game modes
- **Classic**: Rock, Paper, Scissors.
- **Lizard · Spock**: the five-move variant, popularised by *The Big Bang Theory*.

### 🏆 Match play
Play **free rounds** or a **Best of 3 / 5 / 7** match with a live scoreboard. Winning a match triggers a confetti celebration.

### 📊 Stats dashboard
- Rounds played, win rate, current and best win streak (ties don't break a streak)
- Matches won and lost
- **Move tendency chart** showing how often you pick each move, with a warning when you get predictable
- **Recent rounds** history (last 10 rounds, color-coded)
- **Export stats** as a JSON file

### 🎖️ Achievements
12 unlockable achievements, including *Hat Trick*, *Flawless Victory*, *Mind Reader* (beat the Hard AI in a match) and *Live Long and Prosper*. Auto Play can't unlock achievements, so you have to earn them.

### 🎨 Polish
- 🌙 / ☀️ Dark and light themes
- 🔊 Sound effects generated with the Web Audio API (no audio files)
- ⏱️ Optional "Rock… Paper… Scissors… Shoot!" countdown
- Win / lose animations, toast notifications and confetti
- Responsive layout for phones, tablets and desktops
- Everything is saved in `localStorage` and survives page reloads (scores from the original version are migrated automatically)

### ♿ Accessibility
- Full keyboard support with visible focus styles
- Screen-reader friendly labels and live regions for results
- Respects the `prefers-reduced-motion` setting

---

## ⌨️ Keyboard shortcuts

| Key | Action |
|-----|--------|
| <kbd>R</kbd> | Rock |
| <kbd>P</kbd> | Paper |
| <kbd>S</kbd> | Scissors |
| <kbd>L</kbd> | Lizard *(Lizard · Spock mode)* |
| <kbd>K</kbd> | Spock *(Lizard · Spock mode)* |
| <kbd>A</kbd> | Toggle Auto Play |
| <kbd>M</kbd> | Toggle sound |
| <kbd>T</kbd> | Toggle theme |
| <kbd>Backspace</kbd> | Reset score (asks for confirmation) |
| <kbd>Esc</kbd> | Cancel reset |

---

## 🚀 Getting started

1. Clone or download this repository.
2. Open `Rock-Paper-Scissors.html` in any modern browser.

That's it. If you'd rather serve it locally:

```bash
npx serve .
# or
python -m http.server 8000
```

---

## 🎮 How to play

1. Choose a **mode**, **AI difficulty** and **match length** at the top.
2. Click a move (or press its key).
3. The AI reveals its move, the winner is shown along with the reason (e.g. *"Paper covers Rock"*), and your stats update.
4. Try to beat the Hard AI. Tip: the more predictable you are, the faster it learns.

### Rules (Lizard · Spock mode)
- ✂️ Scissors cuts Paper and decapitates Lizard
- 📄 Paper covers Rock and disproves Spock
- 🪨 Rock crushes Lizard and crushes Scissors
- 🦎 Lizard poisons Spock and eats Paper
- 🖖 Spock smashes Scissors and vaporizes Rock

---

## 🗂️ Project structure

```
Rock-Paper-Scissors/
├── Rock-Paper-Scissors.html        # Page layout
├── Rock-Paper-Scissors Project.css # Themes, layout and animations
├── Rock-Paper-Scissors Project.js  # Game logic, AI, stats, achievements, effects
├── images/                         # Move icons
└── README.md
```

---

## 💻 Tech stack

- **HTML5** for semantic structure
- **CSS3** with custom properties (theming), grid/flexbox and keyframe animations
- **JavaScript (ES2022)** for game logic, the prediction AI, and state management
- **Web Audio API** for sound effects
- **Canvas API** for the confetti effect
- **localStorage** for persistence

---

## 🛣️ Ideas for the future
- Online two-player mode
- Leaderboards
- Custom move sets

---

![Screenshot 2](https://github.com/user-attachments/assets/55708817-0a01-40a0-84e7-eb23b3ec7a95)

> Note: the screenshots show the original version. They'll be updated to show the new UI.
