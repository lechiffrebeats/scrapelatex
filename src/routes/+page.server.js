import * as cheerio from 'cheerio';

// --- FEATURE: AGENT ROTATION ---
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

function getRandomAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function escapeLatex(text) {
    if (!text) return "";
    return text
        .replace(/[\u2013\u2014]/g, "-") 
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/([#$%&_{}])/g, "\\$1")
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/"/g, "''");
}

// --- FEATURE: MATH DETECTION & PARSING ---
function detectMath(text) {
    // Sehr simpler Check: Wenn Text von $ oder $$ umschlossen ist, nicht escapen!
    // Wir gehen davon aus, dass der Scraper einfachen Text holt, also lassen wir das Escaping erst mal strikt.
    // Aber wir könnten später hier ansetzen.
    return escapeLatex(text);
}

function walk($, element, context = {}) {
    let output = "";

    $(element).contents().each((i, el) => {
        const type = el.type;
        const node = $(el);

        if (type === 'text') {
            const text = node.text();
            if (context.isPre) {
                output += text; 
            } else {
                const clean = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
                if (clean.trim().length > 0) output += detectMath(clean);
            }
        } 
        else if (type === 'tag') {
            const tagName = el.tagName.toLowerCase();
            
            if (['script', 'style', 'svg', 'button', 'input', 'select', 'textarea', 'iframe', 'noscript', 'nav', 'footer', 'header', 'aside', 'form'].includes(tagName)) return;

            const newContext = { 
                ...context, 
                isPre: context.isPre || tagName === 'pre' || tagName === 'code',
                inTable: context.inTable || tagName === 'table' || tagName === 'tr' || tagName === 'td' || tagName === 'th',
                inLink: context.inLink || tagName === 'a'
            };

            const inner = walk($, el, newContext);

            switch (tagName) {
                case 'div': case 'section': case 'article': case 'main': case 'span': output += inner; break;

                // Headings
                case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
                    if (newContext.inTable) output += `\\textbf{${inner}}`;
                    else {
                         if (tagName === 'h1') output += `\n\\section*{${inner}}\n`;
                         else if (tagName === 'h2') output += `\n\\subsection*{${inner}}\n`;
                         else if (tagName === 'h3') output += `\n\\subsubsection*{${inner}}\n`;
                         else output += `\n\\paragraph{${inner}} `;
                    }
                    break;

                // Styles
                case 'b': case 'strong': output += `\\textbf{${inner}}`; break;
                case 'i': case 'em': output += `\\textit{${inner}}`; break;
                case 'u': output += `\\underline{${inner}}`; break;
                case 'small': output += `{\\footnotesize ${inner}}`; break;
                case 'sup': output += `\\textsuperscript{${inner}}`; break; // Math Style

                // Blocks
                case 'p': if(inner.trim().length > 0) output += `\n\n${inner}\n\n`; break;
                case 'br': output += ` \\\\ \n`; break;
                case 'hr': output += `\n\\noindent\\rule{\\textwidth}{0.4pt}\n`; break;
                case 'blockquote': output += `\n\\begin{quote}${inner}\\end{quote}\n`; break;

                // Lists
                case 'ul': output += `\n\\begin{itemize}\n${inner}\\end{itemize}\n`; break;
                case 'ol': output += `\n\\begin{enumerate}\n${inner}\\end{enumerate}\n`; break;
                case 'li': output += `  \\item ${inner}\n`; break;
                case 'dl': output += `\n\\begin{description}\n${inner}\\end{description}\n`; break;
                case 'dt': output += `  \\item[${inner}] `; break;
                case 'dd': output += ` ${inner}\n`; break;

                // Links (Collecting for Bibliography happens in main action)
                case 'a':
                    const href = node.attr('href') || '';
                    if (context.inLink || !href) output += inner;
                    else if (href.startsWith('http')) output += `\\href{${escapeLatex(href)}}{${inner}}\\cite{${escapeLatex(inner.substring(0,10).replace(/\s/g,''))}}`; // Hacky Cite Key
                    else output += inner; 
                    break;

                // Images
                case 'img':
                    const alt = escapeLatex(node.attr('alt') || 'Img');
                    if (context.inLink) output += ` \\texttt{[IMG: ${alt}]} `;
                    else if (context.inTable) output += `\\fbox{\\texttt{[IMG]}}`;
                    else output += `\n\\begin{center}\\fbox{\\texttt{[IMG: ${alt}]}}\\end{center}\n`;
                    break;

                // Tables
                case 'table':
                     let colCount = 0;
                     node.find('tr').slice(0, 3).each((j, row) => {
                        const cells = $(row).find('td, th').length;
                        if(cells > colCount) colCount = cells;
                     });
                     if (colCount === 0) colCount = 1;
                     const width = (0.9 / colCount).toFixed(2);
                     const colSpec = "|" + `p{${width}\\linewidth}|`.repeat(colCount);
                     output += `\n\\begin{center}\\begin{longtable}{${colSpec}}\n\\hline\n${inner}\\end{longtable}\\end{center}\n`;
                     break;
                case 'tr': output += `${inner} \\\\ \\hline\n`; break;
                case 'td': case 'th': output += `${inner} & `; break;

                default: output += inner; 
            }
        }
    });
    return output.replace(/&\s*\\\\/g, "\\\\");
}

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const url = formData.get('url');
        if (!url) return { error: "Keine URL." };

        try {
            // 1. FETCH MIT AGENT ROTATION
            const response = await fetch(url, {
                headers: { 'User-Agent': getRandomAgent() }
            });
            const body = await response.text();
            const $ = cheerio.load(body);

            // 2. CLEANUP
            const badSelectors = [
                'script', 'style', 'iframe', 'svg', 'noscript', 'nav', 'footer', 'header', 'aside', 'form',
                '.hidden', '.visually-hidden', '#skip-link', '.ad-container', '#ad', '.cookie-banner',
                '.mega-menu', '.site-bar', '.social-share', '.breadcrumbs', '.login-widget'
            ];
            $(badSelectors.join(', ')).remove();

            let contentRoot = $('main').length ? $('main') : ($('article').length ? $('article') : $('body'));

            // 3. WALK & GENERATE LATEX
            const latexBody = walk($, contentRoot);

            // --- FEATURE: ACADEMIC WEAPON (BIBLIOGRAPHY) ---
            // Wir suchen alle Links im Content und machen daraus eine Fake-Bibliographie
            let bibTex = "\n\\begin{thebibliography}{9}\n";
            let linkCount = 0;
            
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim().substring(0, 20);
                if (href && href.startsWith('http') && linkCount < 10) { // Limit auf 10 Quellen
                    const key = text.replace(/\s/g, '') || `source${i}`;
                    bibTex += `\\bibitem{${escapeLatex(key)}} ${escapeLatex(text)}, \\url{${escapeLatex(href)}}\n`;
                    linkCount++;
                }
            });
            bibTex += "\\end{thebibliography}";

            // 4. PREAMBLE
            const fullLatex = `
\\documentclass[10pt, a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage{longtable}
\\usepackage{multicol} % Für Cheat Sheet Mode
\\geometry{top=2cm, bottom=2cm, left=2.5cm, right=2.5cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

\\title{Scrape: ${escapeLatex(url)}}
\\date{\\today}

\\begin{document}
\\maketitle
${latexBody}

${linkCount > 0 ? '\\newpage' + bibTex : ''}
\\end{document}`;

            return { latex: fullLatex, success: true };

        } catch (err) {
            return { error: "Scrape Failed: " + err.message };
        }
    }
};