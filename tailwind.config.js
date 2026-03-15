/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        seed: {
          bg: {
            base: '#EDE8DF',
            sidebar: '#E4DDD2',
            card: '#F7F3EC',
            section: '#EFEADF',
            input: '#FAF7F3',
          },
          olive: {
            DEFAULT: '#7A8C42',
            light: '#C8D4A0',
            dark: '#586830',
          },
          orange: {
            DEFAULT: '#C8622A',
            light: '#F0C9A8',
            dark: '#A34E20',
          },
          text: {
            strong: '#3D3529',
            body: '#6B5F50',
            sub: '#9A8C7E',
            placeholder: '#BFB3A5',
          },
          border: {
            card: '#DDD7CE',
            divider: '#E8E3D8',
          },
        },
      },
    },
  },
  plugins: [],
}
