<script>
    export let form;
    
    let loading = false;
    let editableLatex = ""; 
    let hasScraped = false; // State für Landing Page vs. Editor Mode

    // Wenn Daten vom Server kommen, laden wir sie
    $: if (form?.latex && !editableLatex) {
        editableLatex = form.latex;
        hasScraped = true; // Umschalten auf Editor Ansicht
    }

    // --- 🧠 FAKE COMPILER V3 (TABLE EDITION) ---
    function compileLatex(tex) {
        if (!tex) return "";

        // 1. Preamble Killer
        let bodyContent = tex;
        const startMatch = tex.match(/\\begin\{document\}/);
        const endMatch = tex.match(/\\end\{document\}/);
        if (startMatch) bodyContent = tex.substring(startMatch.index + startMatch[0].length);
        if (endMatch) bodyContent = bodyContent.substring(0, bodyContent.indexOf(endMatch[0]));

        let html = bodyContent
            .replace(/</g, "&lt;").replace(/>/g, "&gt;") // Safety First

            // --- TABELLEN MAGIE (Der schwere Teil) ---
            // Wir suchen nach tabular Umgebungen und parsen den Inhalt
            .replace(/\\begin\{tabular\}\{.*?\}([\s\S]*?)\\end\{tabular\}/g, (match, content) => {
                // Zeilen splitten bei \\ (aber Vorsicht bei Escaping, hier einfach gehalten)
                let rows = content.split('\\\\');
                let tableHtml = '<table class="preview-table">';
                
                rows.forEach(row => {
                    if (row.trim() === '') return;
                    if (row.includes('\\hline')) return; // Linien ignorieren wir visuell via CSS

                    tableHtml += '<tr>';
                    // Zellen splitten bei &
                    let cells = row.split('&');
                    cells.forEach(cell => {
                        // Cleanup pro Zelle
                        let cleanCell = cell.replace(/\\hline/g, '').trim();
                        tableHtml += `<td>${cleanCell}</td>`;
                    });
                    tableHtml += '</tr>';
                });
                tableHtml += '</table>';
                return tableHtml;
            })
            // Center Umgebung für Tabellen aufräumen
            .replace(/\\begin\{center\}/g, '<div class="center-wrapper">')
            .replace(/\\end\{center\}/g, '</div>')

            // --- STANDARD ZEUG ---
            .replace(/\\maketitle/g, '<div class="title-placeholder"></div>')
            .replace(/\\tableofcontents/g, '')
            .replace(/\\newpage/g, '<div class="page-break"></div>')
            
            // Text Styles
            .replace(/\\section\*?\{(.*?)\}/g, '<h1>$1</h1>')
            .replace(/\\subsection\*?\{(.*?)\}/g, '<h2>$1</h2>')
            .replace(/\\subsubsection\*?\{(.*?)\}/g, '<h3>$1</h3>')
            .replace(/\\paragraph\*?\{(.*?)\}/g, '<h4>$1</h4>')
            .replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>')
            .replace(/\\textit\{(.*?)\}/g, '<i>$1</i>')
            .replace(/\\underline\{(.*?)\}/g, '<u>$1</u>')
            .replace(/\\texttt\{(.*?)\}/g, '<code>$1</code>')

            // Links & Bilder
            .replace(/\\href\{.*?\}/g, '') // Links killen, Inhalt behalten (passiert automatisch durch Regex-Reste)
            .replace(/\\fbox\{.*?IMG: (.*?)\}\}/g, '<div class="img-placeholder">🖼️ $1</div>')
            .replace(/\\fbox\{.*?IMG: (.*?)\]/g, '<div class="img-placeholder">🖼️ $1</div>')

            // Listen
            .replace(/\\begin\{itemize\}/g, '<ul>')
            .replace(/\\end\{itemize\}/g, '</ul>')
            .replace(/\\begin\{enumerate\}/g, '<ol>')
            .replace(/\\end\{enumerate\}/g, '</ol>')
            .replace(/\\item\s/g, '<li>')
            .replace(/\\item\[(.*?)\]/g, '<li><b>$1:</b>')

            // Cleanup
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
            <input type="url" name="url" placeholder="Neue URL..." required autocomplete="off" />
            <button disabled={loading} class:stealing={loading}>
                {loading ? 'YOINKING...' : 'SCRAPE IT 🔥'}
            </button>
        </form>
    </header>
    {/if}

    {#if !hasScraped}
    <div class="landing-hero">
        <div class="hero-content">
            <img src="/logo.png" alt="ScrapeBoi Big Logo" class="logo-big" />
            <h1 class="hero-title">ScrapeBoi</h1>
            <p class="hero-subtitle">"Hippity Hoppity, your Data is my Property" 🦝</p>
            <span class="hero-badge">HTML TO LATEX CONVERTER // MEME EDITION</span>
            
            <form method="POST" class="hero-form" on:submit={() => { loading = true; editableLatex = ""; }}>
                <input type="url" name="url" placeholder="Paste link here (e.g. Letterboxd, DnD Beyond)..." required autocomplete="off" />
                <button disabled={loading} class:stealing={loading}>
                    {loading ? 'STEALING DATA...' : 'START HEIST 🚀'}
                </button>
            </form>
            
            {#if form?.error}
                <div class="hero-error">💀 {form.error}</div>
            {/if}
        </div>
    </div>
    {/if}

    {#if hasScraped}
    <main class="split-layout">
        <section class="panel editor-panel">
            <div class="toolbar">
                <span>📝 LaTeX Source</span>
                <button on:click={downloadTex}>⬇ .TEX</button>
            </div>
            <textarea bind:value={editableLatex} spellcheck="false"></textarea>
        </section>

        <section class="panel preview-panel">
            <div class="toolbar">
                <span>📄 Live Preview</span>
                <button on:click={printToPdf}>🖨 PDF</button>
            </div>
            <div class="scroll-container">
                <div class="paper a4">
                    <div class="paper-header">
                        <h1>Scrape Output</h1>
                        <small>{new Date().toLocaleDateString()}</small>
                        <hr>
                    </div>
                    <div class="paper-body">
                        {@html previewHtml}
                    </div>
                    <div class="paper-footer">
                        Generated by ScrapeBoi V4
                    </div>
                </div>
            </div>
        </section>
    </main>
    {/if}
</div>

<style>
    /* VARIABLES */
    :global(body) { margin: 0; background: #050505; color: #fff; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
    
    .app-container { display: flex; flex-direction: column; height: 100vh; }

    /* --- LANDING PAGE STYLES --- */
    .landing-hero {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at center, #1a1a1a 0%, #000 100%);
    }
    .hero-content { text-align: center; max-width: 600px; width: 100%; padding: 20px; }
    .logo-big { width: 150px; height: auto; margin-bottom: 20px; filter: drop-shadow(0 0 20px rgba(255,0,255,0.3)); animation: float 3s ease-in-out infinite; }
    @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
    
    .hero-title { font-size: 4rem; margin: 0; background: linear-gradient(to right, #ff00ff, #00ffff); -webkit-background-clip: text; color: transparent; font-weight: 900; letter-spacing: -2px; }
    .hero-subtitle { font-size: 1.2rem; color: #888; margin: 10px 0 30px; font-style: italic; }
    .hero-badge { background: #222; color: #00ff00; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem; font-family: monospace; letter-spacing: 1px; }

    .hero-form { margin-top: 40px; display: flex; flex-direction: column; gap: 15px; }
    .hero-form input { padding: 20px; font-size: 1.2rem; background: #111; border: 2px solid #333; border-radius: 8px; color: white; text-align: center; }
    .hero-form input:focus { border-color: magenta; outline: none; box-shadow: 0 0 30px rgba(255,0,255,0.2); }
    .hero-form button { padding: 20px; font-size: 1.2rem; background: magenta; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: transform 0.1s; }
    .hero-form button:hover { transform: scale(1.02); background: #ff33ff; }
    .hero-error { color: red; margin-top: 20px; background: rgba(255,0,0,0.1); padding: 10px; border-radius: 4px; }

    /* --- EDITOR STYLES --- */
    header { height: 60px; background: #000; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .logo-small { height: 30px; }
    .brand-text h1 { font-size: 1.2rem; margin: 0; }
    
    /* Header Form (Compact) */
    header form { display: flex; gap: 10px; }
    header input { background: #222; border: 1px solid #444; color: white; padding: 8px; border-radius: 4px; width: 300px; }
    header button { background: magenta; border: none; color: white; padding: 0 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }

    .split-layout { flex: 1; display: flex; overflow: hidden; }
    .panel { width: 50%; display: flex; flex-direction: column; border-right: 1px solid #222; }
    .toolbar { height: 40px; background: #111; display: flex; justify-content: space-between; align-items: center; padding: 0 15px; border-bottom: 1px solid #333; color: #666; font-size: 0.9rem; }
    .toolbar button { background: #333; border: 1px solid #444; color: white; padding: 4px 10px; cursor: pointer; font-size: 0.75rem; }

    textarea { flex: 1; background: #080808; color: #0f0; border: none; padding: 20px; resize: none; outline: none; font-family: 'Courier New', monospace; line-height: 1.5; }

    /* PREVIEW & TABLE FIXES */
    .preview-panel { background: #333; }
    .scroll-container { flex: 1; overflow-y: auto; padding: 40px; display: flex; justify-content: center; }
    
    .paper.a4 { 
        background-color: white; width: 210mm; min-height: 297mm; height: fit-content; 
        padding: 20mm; box-shadow: 0 0 20px rgba(0,0,0,0.5); color: black; font-family: 'Times New Roman', serif; line-height: 1.4;
        background-image: linear-gradient(to bottom, #fff 0mm, #fff 297mm, #ccc 297mm, #ccc 298mm);
        background-size: 100% 298mm; background-repeat: repeat-y;
    }

    .paper-header h1 { text-align: center; font-size: 24pt; margin: 0; }
    .paper-header small { display: block; text-align: center; color: #555; margin-bottom: 10px; }
    
    /* 🔥 TABLE STYLING 🔥 */
    .paper :global(.preview-table) { 
        width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt; 
    }
    .paper :global(.preview-table td) { 
        border: 1px solid #000; padding: 5px 10px; vertical-align: top;
    }
    .paper :global(.preview-table tr:first-child) { font-weight: bold; background: #eee; }

    .paper :global(h1) { font-size: 18pt; border-bottom: 1px solid black; margin-top: 1.5em; }
    .paper :global(h2) { font-size: 16pt; margin-top: 1.2em; font-weight: bold; }
    .paper :global(ul) { padding-left: 20px; }
    .paper :global(.img-placeholder) { border: 1px dashed #999; padding: 10px; background: #f5f5f5; text-align: center; font-size: 0.8rem; margin: 10px 0; }

    @media print {
        header, .landing-hero, .editor-panel { display: none !important; }
        .split-layout { display: block; }
        .preview-panel { width: 100%; background: white; }
        .scroll-container { padding: 0; display: block; }
        .paper.a4 { width: 100%; box-shadow: none; margin: 0; padding: 0; background: none; }
    }
</style>