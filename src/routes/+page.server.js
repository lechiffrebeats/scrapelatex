import * as cheerio from 'cheerio';

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
                if (clean.trim().length > 0) output += escapeLatex(clean);
            }
        } 
        else if (type === 'tag') {
            const tagName = el.tagName.toLowerCase();
            
            // --- CLEANUP LISTE (Erweitert für D&D Beyond) ---
            if (['script', 'style', 'svg', 'button', 'input', 'select', 'textarea', 'iframe', 'noscript', 'nav', 'footer', 'header', 'aside', 'form'].includes(tagName)) return;

            // Kontext Update
            const newContext = { 
                ...context, 
                isPre: context.isPre || tagName === 'pre' || tagName === 'code',
                inTable: context.inTable || tagName === 'table' || tagName === 'tr' || tagName === 'td' || tagName === 'th',
                inLink: context.inLink || tagName === 'a'
            };

            const inner = walk($, el, newContext);

            switch (tagName) {
                // Block Elemente
                case 'div': case 'section': case 'article': case 'main': case 'span': 
                    output += inner; break;

                // --- HEADINGS (Der Fix!) ---
                case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
                    // 🔥 WICHTIG: In Tabellen darf KEIN \section oder \paragraph stehen.
                    // Stattdessen machen wir es einfach fett und groß.
                    if (newContext.inTable) {
                         output += `\\textbf{${inner}}`;
                    } else {
                         if (tagName === 'h1') output += `\n\\section*{${inner}}\n`;
                         else if (tagName === 'h2') output += `\n\\subsection*{${inner}}\n`;
                         else if (tagName === 'h3') output += `\n\\subsubsection*{${inner}}\n`;
                         else output += `\n\\paragraph{${inner}} `; // h4-h6
                    }
                    break;

                // Text Styles
                case 'b': case 'strong': output += `\\textbf{${inner}}`; break;
                case 'i': case 'em': output += `\\textit{${inner}}`; break;
                case 'u': output += `\\underline{${inner}}`; break;
                case 'small': output += `{\\footnotesize ${inner}}`; break;

                // Blocks
                case 'p': 
                    if(inner.trim().length > 0) output += `\n\n${inner}\n\n`; 
                    break;
                case 'br': output += ` \\\\ \n`; break;
                case 'hr': output += `\n\\noindent\\rule{\\textwidth}{0.4pt}\n`; break;

                // Listen
                case 'ul': 
                    output += `\n\\begin{itemize}\n${inner}\\end{itemize}\n`; 
                    break;
                case 'ol': 
                    output += `\n\\begin{enumerate}\n${inner}\\end{enumerate}\n`; 
                    break;
                case 'li': 
                    output += `  \\item ${inner}\n`; 
                    break;
                
                // Definition Lists
                case 'dl': output += `\n\\begin{description}\n${inner}\\end{description}\n`; break;
                case 'dt': output += `  \\item[${inner}] `; break;
                case 'dd': output += ` ${inner}\n`; break;

                // Links
                case 'a':
                    const href = node.attr('href') || '';
                    if (context.inLink || !href) { // Keine verschachtelten Links
                        output += inner;
                    } else if (href.startsWith('http') || href.startsWith('www')) {
                        output += `\\href{${escapeLatex(href)}}{${inner}}`;
                    } else {
                        output += inner; 
                    }
                    break;

                // Bilder
                case 'img':
                    const alt = escapeLatex(node.attr('alt') || 'Img');
                    // 🔥 FIX: Wenn Bild im Link ist, kein \begin{center} nutzen!
                    if (context.inLink) {
                         output += ` \\texttt{[IMG: ${alt}]} `;
                    } else if (context.inTable) {
                        output += `\\fbox{\\texttt{[IMG]}}`;
                    } else {
                        output += `\n\\begin{center}\\fbox{\\texttt{[IMG: ${alt}]}}\\end{center}\n`;
                    }
                    break;

                // --- TABELLEN FIX (Wrap Text) ---
                case 'table':
                     let colCount = 0;
                     // Zähle Spalten in den ersten Reihen
                     node.find('tr').slice(0, 3).each((j, row) => {
                        const cells = $(row).find('td, th').length;
                        if(cells > colCount) colCount = cells;
                     });
                     if (colCount === 0) colCount = 1;

                     // 🔥 FIX: Nutze 'p' (Paragraph) Spalten statt 'l' (Left).
                     // Das sorgt dafür, dass Text automatisch umbricht.
                     // Wir teilen die Seitenbreite durch die Anzahl der Spalten (z.B. 0.9 / 2 = 0.45)
                     const width = (0.9 / colCount).toFixed(2);
                     const colSpec = "|" + `p{${width}\\linewidth}|`.repeat(colCount);

                     output += `\n\\begin{center}\\begin{longtable}{${colSpec}}\n\\hline\n${inner}\\end{longtable}\\end{center}\n`;
                     break;
                
                case 'tr': 
                    output += `${inner} \\\\ \\hline\n`; 
                    break;
                
                case 'td': case 'th': 
                    output += `${inner} & `; 
                    break;

                default:
                    output += inner; 
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
            const response = await fetch(url, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
                }
            });
            const body = await response.text();
            const $ = cheerio.load(body);

            // --- 🧹 AGGRESSIVE CLEANUP FÜR D&D BEYOND & CO 🧹 ---
            const badSelectors = [
                'script', 'style', 'iframe', 'svg', 'noscript',
                'nav', 'footer', 'header', 'aside', 'form',
                '.hidden', '.visually-hidden', '.sr-only', 
                '#skip-link', '.skip-link', '.skip-to-content',
                '.ad-container', '#ad', '.cookie-banner',
                // D&D Specifics
                '.mega-menu', '.main-navigation', '.site-bar', 
                '.mobile-site-header', '.site-footer', '.social-share',
                '.breadcrumbs', '.listing-header', '.listing-footer',
                '.login-widget', '.signup-widget', '.more-info'
            ];
            
            $(badSelectors.join(', ')).remove();

            // Content Root finden
            let contentRoot = $('main');
            if (contentRoot.length === 0) contentRoot = $('article');
            if (contentRoot.length === 0) contentRoot = $('.content'); 
            if (contentRoot.length === 0) contentRoot = $('body');

            const latexBody = walk($, contentRoot);

            const fullLatex = `
\\documentclass[10pt, a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage{longtable} % Wichtig für Tabellen über mehrere Seiten
\\geometry{top=2cm, bottom=2cm, left=2.5cm, right=2.5cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

\\title{Scrape: ${escapeLatex(url)}}
\\date{\\today}

\\begin{document}
\\maketitle
${latexBody}
\\end{document}`;

            return { latex: fullLatex, success: true };

        } catch (err) {
            return { error: err.message };
        }
    }
};