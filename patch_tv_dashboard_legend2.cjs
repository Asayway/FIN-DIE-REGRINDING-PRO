const fs = require('fs');
const file = 'src/components/tv/TvDashboardView.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /<span className="px-2 py-0.5 bg-\[#ffff00\] text-black rounded font-black text-\[10px\] sm:text-xs whitespace-nowrap">\s*Warning Replace Count\s*<\/span>/;
const replacement = `<span className="px-2 py-0.5 bg-[#ffff00] text-black rounded font-black text-[10px] sm:text-xs whitespace-nowrap">
              Warning Replace Count
            </span>
            <span className="px-2 py-0.5 bg-[#f97316] text-white rounded font-black text-[10px] sm:text-xs whitespace-nowrap">
              Prepare Replace Count
            </span>`;

if(regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
    console.log("Patched legend");
} else {
    console.log("Could not find regex");
}
