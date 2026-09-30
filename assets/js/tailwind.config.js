// Tailwind (Play CDN) configuration for the workshop pages.
// Colors resolve to CSS variables in assets/css/workshop.css, so dark mode
// follows prefers-color-scheme without dark: variants.
// tide = deep cyan ink, ember = warm orange accent.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        paper: token('paper'),
        surface: token('surface'),
        ink: { DEFAULT: token('ink'), soft: token('ink-soft') },
        rule: token('rule'),
        line: token('line'),
        tide: {
          50: token('tide-50'),
          100: token('tide-100'),
          300: token('tide-300'),
          700: token('tide-700'),
          900: token('tide-900'),
        },
        ember: {
          50: token('ember-50'),
          200: token('ember-200'),
          400: token('ember-400'),
          500: token('ember-500'),
          700: token('ember-700'),
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            '--tw-prose-body': 'rgb(var(--ink))',
            '--tw-prose-headings': 'rgb(var(--tide-900))',
            '--tw-prose-links': 'rgb(var(--tide-700))',
            '--tw-prose-bold': 'rgb(var(--ink))',
            '--tw-prose-bullets': 'rgb(var(--ember-400))',
            '--tw-prose-counters': 'rgb(var(--ember-700))',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
            fontWeight: '400',
            lineHeight: '1.625',
            p: { marginTop: '1em', marginBottom: '1em' },
            a: {
              fontWeight: '600',
              textDecorationColor: 'rgb(var(--tide-300))',
              textUnderlineOffset: '0.2em',
              '&:hover': { color: 'rgb(var(--ember-700))', textDecorationColor: 'currentColor' },
            },
            em: { color: 'rgb(var(--tide-900))', fontWeight: '600' },
          },
        },
      },
    },
  },
};
