# Lottie Animations for Error Pages

This directory contains Lottie animation JSON files used in the error pages.

## Current Files

- `404-error.json` - Animation for the 404 Not Found page
- `empty-books.json` - Animation for the Books Not Found page
- `auth-error.json` - Animation for the Authentication Error page

## Replacing Animations

The current JSON files are minimal placeholders. To use better animations:

1. Visit [LottieFiles](https://lottiefiles.com/) and search for suitable animations
2. Download the JSON file for your chosen animation
3. Replace the corresponding file in this directory
4. Ensure the animation loops properly for error pages

### Recommended Animation Themes

- **404 Error**: Search for "404", "lost", "missing page" animations
- **Empty Books**: Search for "empty", "search", "books", "library" animations
- **Auth Error**: Search for "lock", "security", "access denied" animations

## Usage

Animations are loaded dynamically in the error page components using the `lottie-react` library.
