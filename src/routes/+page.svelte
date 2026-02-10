<script>
    export let form;
    let loading = false;

    // Einfache Copy-Funktion mit visuellem Feedback
    let copyText = "COPY LATEX";
    function copyToClipboard() {
        if(!form?.latex) return;
        navigator.clipboard.writeText(form.latex);
        copyText = "COPIED! 🚀";
        setTimeout(() => copyText = "COPY LATEX", 2000);
    }
</script>

<div class="app-container">
    <header>
        <div class="brand">
            <span class="icon">🦄</span>
            <div class="titles">
                <h1>LATEX SCRAPER <span class="version">V3</span></h1>
                <p>Web to PDF Converter // Mobile Ready</p>
            </div>
        </div>

        <form method="POST" on:submit={() => loading = true}>
            <div class="input-group">
                <input 
                    type="url" 
                    name="url" 
                    placeholder="https://letterboxd.com/dein_profil/" 
                    required 
                    autocomplete="off"
                />
                <button disabled={loading}>
                    {#if loading}
                        <span class="spinner">⚙️</span> LOADING...
                    {:else}
                        SCRAPE IT 🔥
                    {/if}
                </button>
            </div>
        </form>

        {#if form?.error}
            <div class="status error">💀 ERROR: {form.error}</div>
        {/if}
    </header>

    {#if form?.success}
    <main class="grid-layout">
        
        <section class="panel code-panel">
            <div class="panel-header">
                <h2>📦 LaTeX Source</h2>
                <button class="copy-btn" on:click={copyToClipboard}>{copyText}</button>
            </div>
            <div class="editor-wrapper">
                <textarea readonly spellcheck="false">{form.latex}</textarea>
            </div>
        </section>

        <section class="panel preview-panel">
            <div class="panel-header">
                <h2>📄 Live Preview (A4)</h2>
                <span class="badge">Visual Check</span>
            </div>
            
            <div class="paper-scroll-wrapper">
                <div class="paper a4">
                    <div class="paper-header">Scrape God Output <br><small>{new Date().toLocaleDateString()}</small></div>
                    <hr class="paper-hr">
                    
                    <div class="paper-content">
                        {@html form.preview}
                    </div>
                </div>
            </div>
        </section>

    </main>
    {/if}
</div>

<style>
    /* --- VARIABLES & RESET --- */
    :global(*) { box-sizing: border-box; }
    :global(body) {
        margin: 0;
        background-color: #050505;
        color: #e0e0e0;
        font-family: 'JetBrains Mono', monospace;
        overflow-x: hidden;
    }

    /* --- LAYOUT --- */
    .app-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }

    /* --- HEADER --- */
    header {
        background: #0a0a0a;
        border-bottom: 2px solid #333;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        z-index: 10;
        box-shadow: 0 5px 20px rgba(0,0,0,0.8);
    }

    .brand { display: flex; align-items: center; gap: 15px; }
    .icon { font-size: 2.5rem; }
    h1 { margin: 0; font-size: 1.5rem; color: #fff; letter-spacing: -1px; }
    .version { color: magenta; font-size: 0.8em; vertical-align: super; }
    p { margin: 0; color: #666; font-size: 0.8rem; }

    .input-group {
        display: flex;
        width: 100%;
        max-width: 600px;
        gap: 10px;
    }

    input {
        flex: 1;
        padding: 12px;
        background: #111;
        border: 1px solid #333;
        color: cyan;
        font-family: inherit;
        font-size: 1rem;
        border-radius: 4px;
        outline: none;
    }
    input:focus { border-color: magenta; box-shadow: 0 0 10px rgba(255, 0, 255, 0.2); }

    button {
        padding: 0 25px;
        background: magenta;
        color: white;
        border: none;
        font-weight: bold;
        font-family: inherit;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
    }
    button:hover { background: #ff4dff; transform: translateY(-2px); }
    button:disabled { background: #555; cursor: wait; transform: none; }

    .status.error { color: #ff3333; font-weight: bold; margin-top: 10px; border: 1px solid #ff3333; padding: 10px; }

    /* --- MAIN GRID --- */
    .grid-layout {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr; /* Default: Desktop Split */
        overflow: hidden; /* Prevent body scroll */
    }

    .panel {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-right: 1px solid #222;
    }

    .panel-header {
        padding: 10px 20px;
        background: #0f0f0f;
        border-bottom: 1px solid #222;
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 50px;
    }

    .panel-header h2 { margin: 0; font-size: 1rem; color: #888; text-transform: uppercase; }

    /* --- EDITOR (LEFT) --- */
    .editor-wrapper {
        flex: 1;
        position: relative;
    }
    
    textarea {
        width: 100%;
        height: 100%;
        background: #080808;
        color: #0f0; /* Matrix Green */
        border: none;
        padding: 20px;
        resize: none;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.9rem;
        line-height: 1.5;
        white-space: pre;
        outline: none;
    }

    .copy-btn {
        background: #222;
        border: 1px solid #444;
        font-size: 0.7rem;
        padding: 5px 10px;
        color: cyan;
    }
    .copy-btn:hover { background: cyan; color: black; }

    /* --- PREVIEW (RIGHT) --- */
    .preview-panel {
        background: #1a1a1a;
        position: relative;
    }

    .paper-scroll-wrapper {
        flex: 1;
        overflow-y: auto; /* Vertikales Scrollen */
        overflow-x: auto; /* Horizontales Scrollen auf Mobile */
        padding: 40px;
        display: flex;
        justify-content: center; /* Zentriert Paper auf Desktop */
        align-items: flex-start;
    }

    .paper.a4 {
        /* PAPIER PHYSIK */
        background: white;
        color: black;
        width: 210mm; /* A4 Breite fix */
        min-width: 210mm; /* Damit es nicht schrumpft */
        min-height: 297mm;
        height: auto; /* Wächst mit Inhalt */
        padding: 25mm;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        
        /* TYPOGRAPHIE */
        font-family: 'Crimson Text', serif;
        font-size: 12pt;
        line-height: 1.4;
    }

    .paper-header { text-align: center; font-weight: bold; font-size: 1.2rem; margin-bottom: 10px; }
    .paper-hr { border: 0; border-top: 2px solid black; margin-bottom: 30px; }
    
    /* Paper Content Styling */
    .paper :global(h1) { font-size: 1.5em; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; }
    .paper :global(h2) { font-size: 1.3em; margin-top: 1.5em; }
    .paper :global(img) { display: none; } /* Bilder verstecken, da Platzhalter-Text da ist */
    .paper :global(.center) { text-align: center; }
    .paper :global(ul), .paper :global(ol) { padding-left: 20px; }
    .paper :global(a) { color: #0000cc; text-decoration: underline; }

    /* --- MOBILE RESPONSIVE --- */
    @media (max-width: 900px) {
        .grid-layout {
            grid-template-columns: 1fr; /* Alles untereinander */
            overflow-y: auto; /* Body scrollt jetzt */
            height: auto;
        }

        .app-container {
            height: auto; /* Container wächst */
        }

        .panel {
            height: 500px; /* Fixe Höhe für Editor */
            border-right: none;
            border-bottom: 1px solid #333;
        }

        .preview-panel {
            height: auto; /* Preview wächst */
            padding-bottom: 50px;
        }

        .paper-scroll-wrapper {
            padding: 20px;
            display: block; /* Auf Mobile Block, damit Scrollen geht */
        }
        
        /* WICHTIG: Auf Mobile ist A4 breiter als der Screen.
           Deshalb .paper-scroll-wrapper { overflow-x: auto } */
    }
</style>