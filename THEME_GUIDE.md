# BookFlix Theme Guide

This document outlines the theme configuration used throughout the BookFlix project.

## Theme Colors

### Primary Colors
- `primary` / `primary-DEFAULT`: `#aa1fef` - Main brand purple
- `primary-hover`: `#9216d1` - Hover state for primary buttons
- `primary-light`: `#b791ca` - Light purple variant
- `primary-dark`: `#7000ff` - Dark purple variant

### Background Colors
- `background-light`: `#f7f6f8` - Light mode background
- `background-dark`: `#121212` - Dark mode background

### Surface Colors
- `surface-dark`: `#1c1c1c` - Dark surface for cards/panels
- `surface-hover`: `#2a2a2a` - Hover state for surfaces

### Card Colors
- `card-dark`: `#2b1934` - Dark card background
- `border-dark`: `#553267` - Dark border color

### Text Colors
- `text-muted`: `#b791ca` - Muted text color

### Purple Variants
- `purple-50`: `#3c2348` - Light purple shade
- `purple-100`: `#352140` - Medium-light purple
- `purple-200`: `#22152e` - Medium purple
- `purple-300`: `#1c1122` - Dark purple

## Typography

### Font Families
- `font-display`: Inter, sans-serif
- `font-sans`: Inter, sans-serif

## Border Radius

- `rounded` (DEFAULT): `0.375rem` (6px)
- `rounded-lg`: `0.5rem` (8px)
- `rounded-xl`: `0.75rem` (12px)
- `rounded-2xl`: `1rem` (16px)
- `rounded-full`: `9999px`

## Background Images

- `hero-gradient`: Linear gradient for hero sections

## Usage Examples

### Buttons
```jsx
<button className="bg-primary hover:bg-primary-hover text-white">
  Click Me
</button>
```

### Cards
```jsx
<div className="bg-surface-dark border border-white/10 rounded-xl p-6">
  Card Content
</div>
```

### Backgrounds
```jsx
<div className="bg-background-dark text-white">
  Dark Background
</div>
```

## Best Practices

1. **Always use theme colors** - Never use hardcoded hex values like `bg-[#aa1fef]`
2. **Use semantic names** - Prefer `bg-primary` over `bg-purple-500`
3. **Consistent spacing** - Use Tailwind's spacing scale
4. **Dark mode support** - Use `dark:` prefix for dark mode variants

