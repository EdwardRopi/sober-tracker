// 100 атмосферных фонов-градиентов для карточки на вкладке "Мотивация".
// Настоящие фото использовать нельзя (не вытащить из картинок, вставленных в чат),
// поэтому фоны генерируются из палитр — чтобы не приедались, а не потому что лень.
const PALETTES = [
  ['#3ac6d9', '#1a92a8', '#eaf3ef', '#f4ddbb'], // тропический океан
  ['#0c2f33', '#145b64', '#6fa39f', '#d7e6df'], // туманный берег
  ['#24405a', '#3e6478', '#7c8567', '#cf9f66'], // закатный песок
  ['#1b1035', '#4b2e83', '#7c5cbf', '#c9a6e0'], // ночная аврора
  ['#2b1b0e', '#6b3e26', '#b97a4b', '#e8c399'], // пустынный закат
  ['#0a1f3d', '#1e3a5f', '#3d6b96', '#a8c8e0'], // зимний рассвет
  ['#1a2e1a', '#2d4a2d', '#5a7a4a', '#a8c98a'], // лесная поляна
  ['#3d0e1f', '#7a1f3d', '#c94f6d', '#f2a8bc'], // алый закат
  ['#0d1b2a', '#1b3a4b', '#2f6690', '#8ecae6'], // ледяной фьорд
  ['#2e1a05', '#5c3a0e', '#a8681f', '#e8b04d'], // осенний огонь
  ['#111827', '#1f2937', '#374151', '#9ca3af'], // грозовое небо
  ['#160b28', '#3d1f5c', '#7b3fa0', '#d88fd6'], // сумеречная аврора
];

const ANGLE_STEP = 47;

function sceneForIndex(i) {
  const palette = PALETTES[i % PALETTES.length];
  const cycle = Math.floor(i / PALETTES.length);
  const angle = 110 + ((i * ANGLE_STEP + cycle * 13) % 140);
  return `linear-gradient(${angle}deg, ${palette[0]} 0%, ${palette[1]} 35%, ${palette[2]} 70%, ${palette[3]} 100%)`;
}

const SCENES = Array.from({ length: 100 }, (_, i) => sceneForIndex(i));

export default SCENES;
