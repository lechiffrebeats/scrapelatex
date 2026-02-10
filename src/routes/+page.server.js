import * as cheerio from 'cheerio';

function escapeLatex(text) {
    if (!text) return "";
    return text
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
                // Smart Whitespace: Newlines zu Spaces, aber keine Doppel-Spaces
                const clean = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
                if (clean.trim().length > 0) output += escapeLatex(clean);
            }
        } 
        else if (type === 'tag') {
            const tagName = el.tagName.toLowerCase();
            
            // Ignore Junk
            if (['script', 'style', 'svg', 'button', 'input', 'select', 'textarea', 'iframe', 'noscript'].includes(tagName)) return;

            const inner = walk($, el, { 
                ...context, 
                isPre: context.isPre || tagName === 'pre' || tagName === 'code' 
            });

            switch (tagName) {
                case 'div': case 'section': case 'article': case 'main': case 'span': 
                    output += inner; break;

                case 'h1': output += `\n\\section*{${inner}}\n`; break;
                case 'h2': output += `\n\\subsection*{${inner}}\n`; break;
                case 'h3': output += `\n\\subsubsection*{${inner}}\n`; break;
                case 'h4': case 'h5': case 'h6': output += `\n\\paragraph{${inner}} `; break;

                case 'b': case 'strong': output += `\\textbf{${inner}}`; break;
                case 'i': case 'em': output += `\\textit{${inner}}`; break;
                case 'u': output += `\\underline{${inner}}`; break;
                case 'small': output += `{\\footnotesize ${inner}}`; break;

                case 'p': 
                    if(inner.trim().length > 0) output += `\n\n${inner}\n\n`; 
                    break;
                case 'br': output += ` \\\\ \n`; break;
                case 'hr': output += `\n\\noindent\\rule{\\textwidth}{0.4pt}\n`; break;

                case 'ul': output += `\n\\begin{itemize}\n${inner}\\end{itemize}\n`; break;
                case 'ol': output += `\n\\begin{enumerate}\n${inner}\\end{enumerate}\n`; break;
                case 'li': output += `  \\item ${inner}\n`; break;
                
                case 'dl': output += `\n\\begin{description}\n${inner}\\end{description}\n`; break;
                case 'dt': output += `  \\item[${inner}] `; break;
                case 'dd': output += ` ${inner}\n`; break;

                case 'a':
                    const href = node.attr('href') || '';
                    if (href.startsWith('http')) {
                        output += `\\href{${escapeLatex(href)}}{${inner}}`;
                    } else {
                        output += inner; 
                    }
                    break;

                case 'img':
                    const alt = escapeLatex(node.attr('alt') || 'Bild');
                    // Minimaler Platzhalter
                    output += `\n\\begin{center}\\fbox{\\texttt{[IMG: ${alt}]}}\\end{center}\n`;
                    break;

                case 'table':
                     output += `\n\\begin{center}\\begin{tabular}{|l|}\n\\hline\n${inner}\\end{tabular}\\end{center}\n`;
                     break;
                case 'tr': output += `${inner} \\\\ \\hline\n`; break;
                case 'td': case 'th': output += `${inner} & `; break;

                default:
                    output += inner; 
            }
        }
    });
    // Fix table rows ending with &
    return output.replace(/& \s*\\\\/g, "\\\\");
}

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const url = formData.get('url');

        if (!url) return { error: "Keine URL." };

        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            const body = await response.text();
            const $ = cheerio.load(body);

            // Brutales Cleanup
            $('script, style, iframe, svg, noscript, nav, footer, header').remove();
            $('.hidden, .visually-hidden, .ad-container, #ad, .cookie-banner').remove();

            const contentRoot = $('body'); 
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
\\geometry{top=2cm, bottom=2cm, left=2.5cm, right=2.5cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

\\title{Scrape: ${escapeLatex(url)}}
\\date{\\today}

\\begin{document}
\\maketitle
${latexBody}
\\end{document}`;

            return { latex: fullLatex, preview: contentRoot.html(), success: true };

        } catch (err) {
            return { error: err.message };
        }
    }
};