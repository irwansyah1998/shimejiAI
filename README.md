# Shimeji AI Assistant

This project contains a Tampermonkey user script that adds a small floating Shimeji-style mascot to any webpage. Double-click the character to open a chat panel, then type a question to send it to the OpenAI API.

## Files

- `shimeji-ai.user.js` — the Tampermonkey userscript

## Install

1. Open Tampermonkey in your browser.
2. Create a new script.
3. Copy the contents of `shimeji-ai.user.js` into it.
4. Replace the placeholder API key with a valid OpenAI key.
5. Save and enable the script.

## Configuration

Edit these values at the top of the file:

- `API_KEY`
- `API_URL`
- `MODEL`

## Notes

- The script is designed for browser use only.
- The default model is `gpt-3.5-turbo`.
- The chat window is opened by double-clicking the character.
