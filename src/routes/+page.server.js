import * as cheerio from 'cheerio';

// 🛡️ Die Firewall gegen kaputtes LaTeX
function escapeLatex(text) {
    if (!text) return "";
    return text
        .replace(/\\/g, '\\textbackslash{}') // Backslash zuerst!
        .replace(/([#$%&_{}])/g, "\\$1")     // Special Chars
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/"/g, "''");                // Hübschere Quotes
}

// 🧠 Das Gehirn: Rekursiver Node-Walker für Inline-Styles (Bold, Italic, Links)
function parseContent($, element) {
    let latex = "";
    
    $(element).contents().each((i, el) => {
        const type = el.type;
        const node = $(el);

        if (type === 'text') {
            latex += escapeLatex(node.text());
        } else if (type === 'tag') {
            const tagName = el.tagName;

            // Rekursion: Geh tiefer rein (z.B. <b><i>Text</i></b>)
            const inner = parseContent($, el);

            switch (tagName) {
                case 'strong':
                case 'b':
                    latex += `\\textbf{${inner}}`;
                    break;
                case 'em':
                case 'i':
                    latex += `\\textit{${inner}}`;
                    break;
                case 'u':
                    latex += `\\underline{${inner}}`;
                    break;
                case 'code':
                    latex += `\\texttt{${inner}}`;
                    break;
                case 'a':
                    // Wir nehmen nur den Text, Links brechen oft im PDF
                    // Wer will, kann hier \\href{url}{text} bauen
                    latex += `\\underline{${inner}}`; 
                    break;
                case 'br':
                    latex += ` \\\\ \n`;
                    break;
                default:
                    latex += inner; // Unbekannte Tags einfach ignorieren, aber Inhalt behalten
            }
        }
    });
    return latex;
}

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const url = formData.get('url');

        if (!url) return { error: "Keine URL, Bruder." };

        try {
            // 1. Fetch mit User-Agent (damit wir nicht wie ein Bot aussehen)
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const body = await response.text();
            const $ = cheerio.load(body);
            
            let latexBody = "";
            let previewHtml = "";

            // 2. Wir suchen jetzt viel mehr Elemente!
            // Main Content Area suchen (optional, macht es sauberer)
            const root = $('article').length ? $('article') : $('body');

            root.find('h1, h2, h3, p, ul, ol, blockquote, pre').each((i, el) => {
                const $el = $(el);
                
                // Skip leere Elemente oder Navigation/Footer Müll (heuristisch)
                if ($el.text().trim().length === 0) return;
                if ($el.parents('nav, footer, script, style').length) return;

                const tagName = el.tagName;
                
                // Parse den Inhalt (mit Bold, Italic etc.)
                const content = parseContent($, el);

                // Block-Logik
                if (tagName === 'h1') {
                    latexBody += `\\section*{${content}}\n`;
                    previewHtml += `<h1>${$el.html()}</h1>`; // HTML lassen wir original für Preview
                } 
                else if (tagName === 'h2') {
                    latexBody += `\\subsection*{${content}}\n`;
                    previewHtml += `<h2>${$el.html()}</h2>`;
                } 
                else if (tagName === 'h3') {
                    latexBody += `\\subsubsection*{${content}}\n`;
                    previewHtml += `<h3>${$el.html()}</h3>`;
                } 
                else if (tagName === 'p') {
                    latexBody += `${content}\n\n`;
                    previewHtml += `<p>${$el.html()}</p>`;
                } 
                else if (tagName === 'blockquote') {
                    latexBody += `\\begin{quote}\n${content}\n\\end{quote}\n\n`;
                    previewHtml += `<blockquote>${$el.html()}</blockquote>`;
                }
                else if (tagName === 'ul') {
                    latexBody += `\\begin{itemize}\n`;
                    previewHtml += `<ul>`;
                    
                    $el.find('> li').each((j, li) => {
                        const liContent = parseContent($, li);
                        latexBody += `  \\item ${liContent}\n`;
                        previewHtml += `<li>${$(li).html()}</li>`;
                    });
                    
                    latexBody += `\\end{itemize}\n\n`;
                    previewHtml += `</ul>`;
                }
                else if (tagName === 'ol') {
                    latexBody += `\\begin{enumerate}\n`;
                    previewHtml += `<ol>`;
                    
                    $el.find('> li').each((j, li) => {
                        const liContent = parseContent($, li);
                        latexBody += `  \\item ${liContent}\n`;
                        previewHtml += `<li>${$(li).html()}</li>`;
                    });
                    
                    latexBody += `\\end{enumerate}\n\n`;
                    previewHtml += `</ol>`;
                }
            });

            // 3. Header Upgrade
            const fullLatex = `
\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{xcolor}
\\usepackage{listings}     % Für Code
\\usepackage{hyperref}     % Für Links
\\geometry{a4paper, margin=2.5cm}

\\title{Deep Scrape: ${escapeLatex(url)}}
\\author{Scrape God V2}
\\date{\\today}

\\begin{document}
\\maketitle

${latexBody}
\\end{document}`;

            return { latex: fullLatex, preview: previewHtml, success: true };

        } catch (err) {
            console.error(err);
            return { error: "Scrape Failed. Site has hands. " + err.message };
        }
    }
};