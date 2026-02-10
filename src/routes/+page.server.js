import * as cheerio from 'cheerio';

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const url = formData.get('url');
        if (!url) return { error: "Keine URL, kein Spaß." };

        try {
            const response = await fetch(url);
            const body = await response.text();
            const $ = cheerio.load(body);
            
            let latexBody = "";
            let previewHtml = ""; // NEU: Für die Live Preview

            $('h1, h2, p').each((i, el) => {
                const text = $(el).text().trim();
                if(!text) return;

                // LaTeX Safe Text
                const safeText = text.replace(/([#$%&_{}])/g, "\\$1");

                // Aufbauen
                if ($(el).is('h1')) {
                    latexBody += `\\section*{${safeText}}\n`;
                    previewHtml += `<h1>${text}</h1>`; // HTML für Preview behalten
                } else if ($(el).is('h2')) {
                    latexBody += `\\subsection*{${safeText}}\n`;
                    previewHtml += `<h2>${text}</h2>`;
                } else {
                    latexBody += `${safeText}\n\n`;
                    previewHtml += `<p>${text}</p>`;
                }
            });

            const fullLatex = `
\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{geometry}
\\geometry{a4paper, margin=1in}
\\title{Scrape God Output}
\\begin{document}
\\maketitle
${latexBody}
\\end{document}`;

            // Wir geben beides zurück
            return { latex: fullLatex, preview: previewHtml, success: true };

        } catch (err) {
            return { error: "Fetch failed. Skill issue." };
        }
    }
};