const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add Moon to lucide-react import
content = content.replace(
  /Sun,(\s+)TimerReset,/,
  'Moon,$1Sun,$1TimerReset,'
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
              title="Alternar tema"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>`;

content = content.replace(
  /\{\/span\}\s*\{\/div\}\s*<\/header>/s,
  (match) => {
    return match.replace(/\{\/div\}\s*<\/header>/, toggleButton + '\n          </div>\n        </div>\n      </header>');
  }
);
// Above regex might be tricky. Let's do it safer.

fs.writeFileSync('src/App.tsx', content);
