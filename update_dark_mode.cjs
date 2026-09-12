const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add Moon to lucide-react import
content = content.replace(
  /Sun,/,
  'Moon,\n  Sun,'
);

// Add isDarkMode state and useEffect
const stateHook = `  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

`;
content = content.replace(/  \/\/ Firestore Data State/, stateHook + '  // Firestore Data State');

// Add toggle button to header
const toggleButton = `
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="ml-2 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Alternar modo noturno"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>`;

content = content.replace(
  /          <\/div>\n        <\/div>\n      <\/header>/g,
  toggleButton
);

// Colors replacements
content = content.replace(/bg-\[\#F7F8FC\]/g, 'bg-[#F7F8FC] dark:bg-slate-950');
content = content.replace(/bg-white(?!\/)/g, 'bg-white dark:bg-slate-900');
content = content.replace(/bg-slate-50(?!\/)/g, 'bg-slate-50 dark:bg-slate-800/50');
content = content.replace(/bg-slate-50\/80/g, 'bg-slate-50/80 dark:bg-slate-900/80');
content = content.replace(/bg-slate-50\/70/g, 'bg-slate-50/70 dark:bg-slate-800/70');
content = content.replace(/bg-slate-50\/60/g, 'bg-slate-50/60 dark:bg-slate-800/60');
content = content.replace(/bg-slate-100(?!\/)/g, 'bg-slate-100 dark:bg-slate-800');
content = content.replace(/bg-white\/80/g, 'bg-white/80 dark:bg-slate-950/80');

// text colors
content = content.replace(/text-slate-900/g, 'text-slate-900 dark:text-white');
content = content.replace(/text-slate-800/g, 'text-slate-800 dark:text-slate-200');
content = content.replace(/text-slate-700/g, 'text-slate-700 dark:text-slate-300');
content = content.replace(/text-slate-600/g, 'text-slate-600 dark:text-slate-300');
content = content.replace(/text-slate-500/g, 'text-slate-500 dark:text-slate-400');
content = content.replace(/text-slate-400/g, 'text-slate-400 dark:text-slate-500');
content = content.replace(/text-slate-300/g, 'text-slate-300 dark:text-slate-600');

// border colors
content = content.replace(/border-slate-200(?!\/)/g, 'border-slate-200 dark:border-slate-800');
content = content.replace(/border-slate-200\/70/g, 'border-slate-200/70 dark:border-slate-800/70');
content = content.replace(/border-slate-100(?!\/)/g, 'border-slate-100 dark:border-slate-800/50');
content = content.replace(/border-slate-100\/80/g, 'border-slate-100/80 dark:border-slate-800/80');

// shadow
content = content.replace(/shadow-\[0_8px_24px_rgba\(15,23,42,0\.04\)\]/g, 'shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)]');

// specific adjustments for blue/amber contrast
content = content.replace(/bg-blue-50(?!\/)/g, 'bg-blue-50 dark:bg-blue-900/30');
content = content.replace(/text-blue-700/g, 'text-blue-700 dark:text-blue-400');
content = content.replace(/bg-amber-50(?!\/)/g, 'bg-amber-50 dark:bg-amber-900/20');
content = content.replace(/border-amber-200/g, 'border-amber-200 dark:border-amber-900/40');
content = content.replace(/text-amber-700/g, 'text-amber-700 dark:text-amber-500');
content = content.replace(/text-amber-900/g, 'text-amber-900 dark:text-amber-400');
content = content.replace(/text-amber-800/g, 'text-amber-800 dark:text-amber-500');
content = content.replace(/bg-amber-100(?!\/)/g, 'bg-amber-100 dark:bg-amber-900/40');

// Hover states
content = content.replace(/hover:bg-slate-50(?!\/)/g, 'hover:bg-slate-50 dark:hover:bg-slate-800');
content = content.replace(/hover:border-slate-300/g, 'hover:border-slate-300 dark:hover:border-slate-700');
content = content.replace(/hover:bg-slate-100/g, 'hover:bg-slate-100 dark:hover:bg-slate-700');

// specific black/slate 900 backgrounds (buttons/headers)
content = content.replace(/bg-slate-900(?!\/)/g, 'bg-slate-900 dark:bg-slate-100');
content = content.replace(/text-white(?!\/)/g, 'text-white dark:text-slate-900');
content = content.replace(/bg-slate-800(?!\/)/g, 'bg-slate-800 dark:bg-slate-200');

// Fix the header bg-slate-900 icon invert
content = content.replace(/bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900/g, 'bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900');

fs.writeFileSync('src/App.tsx', content);
