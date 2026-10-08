const fs = require('fs');
const file = 'src/components/tv/TvDashboardView.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /<span className="bg-\[#FFFF00\] text-black px-2 py-0.5 font-bold">Warning Replace Count<\/span>/;
const replacement = `<span className="bg-[#FFFF00] text-black px-2 py-0.5 font-bold">Warning</span>
            <span className="bg-[#f97316] text-white px-2 py-0.5 font-bold">Prepare</span>`;

if(regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
    console.log("Patched legend");
} else {
    console.log("Could not find regex");
}
