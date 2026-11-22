# TypePop

TypePop is a browser-based typing arcade featuring bubble popping, timed typing tests, live statistics, and unlockable badges.

## Features

- 60-second Bubble Pop game with combos and lives
- Live WPM and accuracy tracking
- One-minute typing test with character-level feedback
- Persistent best scores, progress, and badge data
- Optional sound effects
- Responsive interface for desktop and mobile

## Project Structure

- `index.html` - Page structure and content
- `styles.css` - Layout, responsive styles, animations, and visual theme
- `script.js` - Game logic, typing test, navigation, sounds, and saved progress

## Run Locally

Open `index.html` directly in a browser, or start a small local server:

```powershell
py -m http.server 8000
```

Then visit `http://localhost:8000`.

## Controls

- Use the navigation tabs to switch between Home, Bubble Pop, Typing Test, and Progress.
- In Bubble Pop, type the letters shown on a bubble before it leaves the screen.
- In the Typing Test, start typing into the displayed passage. The timer begins with the first keystroke.
- Use Backspace to correct the current character in the typing test or Bubble Pop buffer.

## Saved Data

Progress is stored in browser `localStorage` under `typepop.save.v1`. Use the **Reset everything** button on the Progress page to clear the saved stats and badges.
