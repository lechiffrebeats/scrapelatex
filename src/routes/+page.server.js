import * as cheerio from 'cheerio';

function escapeLatex(text) {
    if (!text) return "";
    return text
        .replace(/[\u2013\u2014]/g, "-") // Em-Dashes to hyphens
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
            
            // --- CLEANUP: Skip unwanted tags ---
            if (['script', 'style', 'svg', 'button', 'input', 'select', 'textarea', 'iframe', 'noscript', 'nav', 'footer', 'header', 'aside', 'form'].includes(tagName)) return;

            // Check if we are inside a table or link
            const newContext = { 
                ...context, 
                isPre: context.isPre || tagName === 'pre' || tagName === 'code',
                inTable: context.inTable || tagName === 'table' || tagName === 'tr' || tagName === 'td' || tagName === 'th',
                inLink: context.inLink || tagName === 'a'
            };

            const inner = walk($, el, newContext);

            switch (tagName) {
                // --- BLOCK ELEMENTS ---
                case 'div': case 'section': case 'article': case 'main': case 'span': 
                    output += inner; break;

                // --- HEADINGS ---
                case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
                    // 🔥 FIX: No Sections inside Tables! Just Bold.
                    if (newContext.inTable) {
                         output += `\\textbf{${inner}}`;
                    } else {
                         // Map h1-h6 to LaTeX hierarchy
                         if (tagName === 'h1') output += `\n\\section*{${inner}}\n`;
                         else if (tagName === 'h2') output += `\n\\subsection*{${inner}}\n`;
                         else if (tagName === 'h3') output += `\n\\subsubsection*{${inner}}\n`;
                         else output += `\n\\paragraph{${inner}} `;
                    }
                    break;

                // --- TEXT STYLES ---
                case 'b': case 'strong': output += `\\textbf{${inner}}`; break;
                case 'i': case 'em': output += `\\textit{${inner}}`; break;
                case 'u': output += `\\underline{${inner}}`; break;
                case 'small': output += `{\\footnotesize ${inner}}`; break;

                // --- BLOCKS ---
                case 'p': 
                    if(inner.trim().length > 0) output += `\n\n${inner}\n\n`; 
                    break;
                case 'br': output += ` \\\\ \n`; break;
                case 'hr': output += `\n\\noindent\\rule{\\textwidth}{0.4pt}\n`; break;

                // --- LISTS ---
                case 'ul': 
                    // Compact lists inside tables to save space
                    output += `\n\\begin{itemize}\n${inner}\\end{itemize}\n`; 
                    break;
                case 'ol': 
                    output += `\n\\begin{enumerate}\n${inner}\\end{enumerate}\n`; 
                    break;
                case 'li': 
                    output += `  \\item ${inner}\n`; 
                    break;
                
                // --- DEFINITION LISTS ---
                case 'dl': output += `\n\\begin{description}\n${inner}\\end{description}\n`; break;
                case 'dt': output += `  \\item[${inner}] `; break;
                case 'dd': output += ` ${inner}\n`; break;

                // --- LINKS ---
                case 'a':
                    const href = node.attr('href') || '';
                    // Prevent nested links or empty links
                    if (context.inLink || !href) {
                        output += inner;
                    } else if (href.startsWith('http') || href.startsWith('www')) {
                        // Safe LaTeX Link
                        output += `\\href{${escapeLatex(href)}}{${inner}}`;
                    } else {
                        output += inner; 
                    }
                    break;

                // --- IMAGES ---
                case 'img':
                    const alt = escapeLatex(node.attr('alt') || 'Image');
                    
                    // 🔥 FIX: LaTeX crashes if \begin{center} is inside \href
                    // We simply render a text placeholder.
                    if (context.inLink) {
                         output += ` [IMG: ${alt}] `;
                    } else if (context.inTable) {
                        output += `\\fbox{\\texttt{[IMG]}}`;
                    } else {
                        output += `\n\\begin{center}\\fbox{\\texttt{[IMG: ${alt}]}}\\end{center}\n`;
                    }
                    break;

                // --- TABELLEN ---
                case 'table':
                     let colCount = 0;
                     // Count max columns in first few rows to be safe
                     node.find('tr').slice(0, 3).each((j, row) => {
                        const cells = $(row).find('td, th').length;
                        if(cells > colCount) colCount = cells;
                     });
                     if (colCount === 0) colCount = 1;

                     const colSpec = "|" + "p{0.2\\linewidth}|".repeat(colCount).replace("p{", "l|"); // Simple l columns

                     // Use tabularx or standard tabular. longtable is best for scrape.
                     output += `\n\\begin{center}\\begin{tabular}{|${"l|".repeat(colCount)}}\n\\hline\n${inner}\\end{tabular}\\end{center}\n`;
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
    
    // Cleanup: Remove last & in table rows
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

            // --- 🧹 AGGRESSIVE CLEANUP 🧹 ---
            // Remove navigation, ads, sidebars, popups
            const badSelectors = [
                'script', 'style', 'iframe', 'svg', 'noscript',
                'nav', 'footer', 'header', 'aside', 'form',
                '.hidden', '.visually-hidden', '.sr-only', 
                '#skip-link', '.skip-link', '.skip-to-content', // "Skip to content"
                '.ad-container', '#ad', '.cookie-banner',
                '.site-bar', '.main-menu', '.megamenu', // D&D Beyond / generic menus
                '.user-interactions', '.social-share', 
                '.breadcrumbs', '.listing-header', '.listing-footer',
                '.login-widget', '.signup-widget'
            ];
            
            $(badSelectors.join(', ')).remove();

            // Find best content root
            let contentRoot = $('main');
            if (contentRoot.length === 0) contentRoot = $('article');
            if (contentRoot.length === 0) contentRoot = $('.content'); // Generic
            if (contentRoot.length === 0) contentRoot = $('body'); // Fallback

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
\\usepackage{longtable} % Better for long scrapes
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