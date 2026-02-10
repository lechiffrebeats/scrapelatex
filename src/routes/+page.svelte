<script>
    export let form;
    
    let loading = false;
    let editableLatex = ""; 
    let hasScraped = false;
    let copyText = "COPY";

    $: if (form?.latex && !editableLatex) {
        editableLatex = form.latex;
        hasScraped = true;
    }

    // --- 🧠 FAKE COMPILER V4 (ROBUST TABLES) ---
    function compileLatex(tex) {
        if (!tex) return "";

        // 1. Preamble Killer
        let bodyContent = tex;
        const startMatch = tex.match(/\\begin\{document\}/);
        const endMatch = tex.match(/\\end\{document\}/);
        if (startMatch) bodyContent = tex.substring(startMatch.index + startMatch[0].length);
        if (endMatch) bodyContent = bodyContent.substring(0, bodyContent.indexOf(endMatch[0]));

        let html = bodyContent
            .replace(/</g, "&lt;").replace(/>/g, "&gt;") 

            // --- TABELLEN (More flexible Regex) ---
            // Matches \begin{tabular}{...} CONTENT \end{tabular}
            // [\s\S]*? ensures we match newlines inside the table
            .replace(/\\begin\{tabular\}\{.*?\}([\s\S]*?)\\end\{tabular\}/g, (match, content) => {
                let rows = content.split('\\\\');
                let tableHtml = '<div class="table-wrapper"><table class="preview-table">';
                
                rows.forEach(row => {
                    if (row.trim() === '' || row.includes('\\hline')) return; 

                    tableHtml += '<tr>';
                    let cells = row.split('&');
                    cells.forEach(cell => {
                        // Strip LaTeX formatting inside cells for preview
                        let cleanCell = cell
                            .replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>')
                            .replace(/\\textit\{(.*?)\}/g, '<i>$1</i>')
                            .trim();
                        tableHtml += `<td>${cleanCell}</td>`;
                    });
                    tableHtml += '</tr>';
                });
                tableHtml += '</table></div>';
                return tableHtml;
            })
            // Clean up center wrappers around tables
            .replace(/\\begin\{center\}/g, '<div class="center-wrapper">')
            .replace(/\\end\{center\}/g, '</div>')

            // --- HEADINGS ---
            .replace(/\\section\*?\{(.*?)\}/g, '<h1>$1</h1>')
            .replace(/\\subsection\*?\{(.*?)\}/g, '<h2>$1</h2>')
            .replace(/\\subsubsection\*?\{(.*?)\}/g, '<h3>$1</h3>')
            .replace(/\\paragraph\*?\{(.*?)\}/g, '<h4>$1</h4>')
            
            // --- STYLES ---
            .replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>')
            .replace(/\\textit\{(.*?)\}/g, '<i>$1</i>')
            .replace(/\\underline\{(.*?)\}/g, '<u>$1</u>')
            .replace(/\\texttt\{(.*?)\}/g, '<code>$1</code>')

            // --- LINKS & IMAGES ---
            .replace(/\\href\{(.*?)\}\{(.*?)\}/g, '<a href="$1" target="_blank">$2</a>')
            .replace(/\[IMG: (.*?)\]/g, '<span class="img-tag">🖼️ $1</span>')
            .replace(/\\fbox\{(.*?)\}/g, '$1') // remove fbox

            // --- LISTS ---
            .replace(/\\begin\{itemize\}/g, '<ul>')
            .replace(/\\end\{itemize\}/g, '</ul>')
            .replace(/\\begin\{enumerate\}/g, '<ol>')
            .replace(/\\end\{enumerate\}/g, '</ol>')
            .replace(/\\item\s/g, '<li>')
            .replace(/\\item\[(.*?)\]/g, '<li><b>$1:</b>')

            // --- CLEANUP ---
            .replace(/\\\\/g, '<br>')
            .replace(/\\/g, '') 
            .replace(/}/g, '')
            .replace(/{/g, '')
            .replace(/\n\s*\n/g, '<br><br>');

        return html;
    }

    $: previewHtml = compileLatex(editableLatex);

    function downloadTex() {
        const blob = new Blob([editableLatex], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scrapeboi_export.tex';
        a.click();
    }

    function printToPdf() { window.print(); }

    function copyToClipboard() {
        navigator.clipboard.writeText(editableLatex);
        copyText = "COPIED!";
        setTimeout(() => copyText = "COPY", 2000);
    }
</script>

<div class="app-container" class:centered-mode={!hasScraped}>
    
    {#if hasScraped}
    <header>
        <div class="header-left">
            <img src="/logo.png" alt="ScrapeBoi" class="logo-small" />
            <div class="brand-text">
                <h1>ScrapeBoi <span class="v-tag">V4</span></h1>
            </div>
        </div>
        <form method="POST" on:submit={() => { loading = true; editableLatex = ""; }}>
            <input type="url" name="url" placeholder="Paste Link..." required autocomplete="off" />
            <button disabled={loading} class:stealing={loading}>
                {loading ? 'YOINKING...' : 'SCRAPE IT 🔥'}
            </button>
        </form>
    </header>
    {/if}

    {#if !hasScraped}
    <div class="landing-hero">
        <div class="hero-content">
            <img src="/logo.png" alt="Logo" class="logo-big" />
            <h1 class="hero-title">ScrapeBoi</h1>
            <p class="hero-subtitle">"Hippity Hoppity, your Data is my Property" 🦝</p>
            
            <form method="POST" class="hero-form" on:submit={() => { loading = true; editableLatex = ""; }}>
                <input type="url" name="url" placeholder="https://letterboxd.com/..." required autocomplete="off" />
                <button disabled={loading} class:stealing={loading}>
                    {loading ? 'STEALING DATA...' : 'START HEIST 🚀'}
                </button>
            </form>
            {#if form?.error}<div class="hero-error">💀 {form.error}</div>{/if}
        </div>
    </div>
    {/if}

    {#if hasScraped}
    <main class="split-layout">
        <section class="panel editor-panel">
            <div class="toolbar">
                <span>📝 Source</span>
                <div class="btn-group">
                    <button class="action-btn" on:click={copyToClipboard}>{copyText}</button>
                    <button class="action-btn" on:click={downloadTex}>⬇ .TEX</button>
                </div>
            </div>
            <textarea bind:value={editableLatex} spellcheck="false"></textarea>
        </section>

        <section class="panel preview-panel">
            <div class="toolbar">
                <span>📄 Preview</span>
                <button class="action-btn" on:click={printToPdf}>🖨 PDF</button>
            </div>
            <div class="scroll-container">
                <div class="paper a4">
                    <div class="paper-header">
                        <h1>Output Preview</h1>
                        <small>{new Date().toLocaleDateString()}</small>
                        <hr>
                    </div>
                    <div class="paper-body">
                        {@html previewHtml}
                    </div>
                    <div class="paper-footer">Generated by ScrapeBoi V4</div>
                </div>
            </div>
        </section>
    </main>
    {/if}
</div>

<style>
    :global(body) { margin: 0; background: #050505; color: #fff; font-family: 'Inter', monospace; overflow: hidden; }
    .app-container { display: flex; flex-direction: column; height: 100vh; }
    
    /* LANDING */
    .landing-hero { flex: 1; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #1a1a1a 0%, #000 100%); }
    .hero-content { text-align: center; width: 100%; max-width: 600px; padding: 20px; }
    .logo-big { width: 150px; margin-bottom: 20px; filter: drop-shadow(0 0 15px magenta); }
    .hero-title { font-size: 3rem; margin: 0; color: white; }
    .hero-subtitle { color: #888; font-style: italic; margin-bottom: 30px; }
    .hero-form { display: flex; flex-direction: column; gap: 15px; }
    .hero-form input { padding: 15px; font-size: 1.1rem; background: #111; border: 1px solid #333; color: white; border-radius: 5px; text-align: center; }
    .hero-form button { padding: 15px; font-size: 1.1rem; background: magenta; border: none; color: white; border-radius: 5px; cursor: pointer; font-weight: bold; }

    /* HEADER */
    header { height: 60px; background: #000; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
    .header-left { display: flex; gap: 10px; align-items: center; }
    .logo-small { height: 30px; }
    header input { background: #222; border: 1px solid #444; color: white; padding: 8px; border-radius: 4px; width: 300px; }
    header button { background: magenta; border: none; padding: 8px 15px; color: white; border-radius: 4px; font-weight: bold; cursor: pointer; }

    /* SPLIT LAYOUT */
    .split-layout { flex: 1; display: flex; overflow: hidden; }
    .panel { width: 50%; display: flex; flex-direction: column; border-right: 1px solid #222; }
    
    .toolbar { height: 40px; background: #111; display: flex; justify-content: space-between; align-items: center; padding: 0 15px; border-bottom: 1px solid #333; color: #888; }
    .btn-group { display: flex; gap: 10px; }
    .action-btn { background: #333; border: 1px solid #444; color: white; padding: 4px 10px; cursor: pointer; font-size: 0.8rem; border-radius: 3px; }
    .action-btn:hover { background: #444; }

    textarea { flex: 1; background: #080808; color: #0f0; border: none; padding: 20px; resize: none; outline: none; font-family: 'Courier New', monospace; line-height: 1.5; }

    /* PREVIEW */
    .preview-panel { background: #333; }
    .scroll-container { flex: 1; overflow-y: auto; padding: 40px; display: flex; justify-content: center; }
    .paper.a4 { 
        background: white; width: 210mm; min-height: 297mm; height: fit-content; 
        padding: 20mm; box-shadow: 0 0 20px rgba(0,0,0,0.5); color: black; font-family: serif; line-height: 1.4;
        background-image: linear-gradient(to bottom, #fff 0mm, #fff 297mm, #ccc 297mm, #ccc 298mm);
        background-size: 100% 298mm; background-repeat: repeat-y;
    }

    /* PREVIEW CONTENT STYLES */
    .paper :global(h1) { font-size: 18pt; border-bottom: 1px solid black; margin-top: 1.5em; }
    .paper :global(h2) { font-size: 16pt; margin-top: 1.2em; font-weight: bold; }
    .paper :global(.preview-table) { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
    .paper :global(.preview-table td) { border: 1px solid #000; padding: 5px; vertical-align: top; }
    .paper :global(.preview-table tr:first-child) { font-weight: bold; background: #eee; }
    .paper :global(.img-tag) { background: #eee; border: 1px dashed #555; padding: 2px 5px; font-family: monospace; font-size: 0.9em; }

    @media print {
        header, .editor-panel { display: none; }
        .split-layout { display: block; }
        .preview-panel { width: 100%; }
        .scroll-container { padding: 0; display: block; }
        .paper.a4 { box-shadow: none; width: 100%; margin: 0; padding: 0; background: none; }
    }
</style>