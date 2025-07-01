// Guitar Chord Application
class GuitarSongbook {
    constructor() {
        this.songs = JSON.parse(localStorage.getItem('guitarSongs')) || [];
        this.currentSong = null;
        this.currentTranspose = 0;
        this.currentView = 'songList';
        this.editingIndex = -1;
        this.currentFilter = 'all';
        this.currentLetter = null;
        this.sidebarCollapsed = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.showView('songList');
        this.generateAlphabetTabs();
        this.renderSongs();
        this.updateStats();
    }

    bindEvents() {
        // Navigation
        document.getElementById('addSongBtn').addEventListener('click', () => this.showAddSong());
        document.getElementById('viewSongsBtn').addEventListener('click', () => this.showView('songList'));
        document.getElementById('backBtn').addEventListener('click', () => this.showView('songList'));
        document.getElementById('backFromAddBtn').addEventListener('click', () => this.showView('songList'));

        // Transpose
        document.getElementById('transposeUp').addEventListener('click', () => this.transpose(1));
        document.getElementById('transposeDown').addEventListener('click', () => this.transpose(-1));

        // Form
        document.getElementById('songForm').addEventListener('submit', (e) => this.saveSong(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.showView('songList'));
        document.getElementById('keyInput').addEventListener('change', () => this.updateChordSuggestions());

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.searchSongs(e.target.value));

        // Modal
        document.getElementById('closeChordModal').addEventListener('click', () => this.closeChordModal());
        document.getElementById('chordModal').addEventListener('click', (e) => {
            if (e.target.id === 'chordModal') this.closeChordModal();
        });

        // Edit song
        document.getElementById('editSongBtn').addEventListener('click', () => this.editCurrentSong());

        // Sidebar
        document.getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar());

        // Interactive lyrics system
        document.getElementById('manualTab').addEventListener('click', () => this.switchInputMethod('manual'));
        document.getElementById('interactiveTab').addEventListener('click', () => this.switchInputMethod('interactive'));
        document.getElementById('processTextBtn').addEventListener('click', () => this.processPlainText());
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => this.closeChordDropdowns(e));
    }

    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
        
        // Show target view
        document.getElementById(viewName + 'View').classList.remove('hidden');
        this.currentView = viewName;
        
        // Update sidebar visibility and functionality based on current view
        this.updateSidebarForView(viewName);
    }

    updateSidebarForView(viewName) {
        const sidebar = document.getElementById('sidebar');
        const alphabetTabs = document.getElementById('alphabetTabs');
        const sidebarStats = document.getElementById('sidebarStats');
        
        if (viewName === 'songList') {
            // Show alphabet tabs and stats for song list view
            alphabetTabs.style.display = 'flex';
            sidebarStats.style.display = 'block';
            sidebar.style.opacity = '1';
        } else {
            // Keep sidebar visible but with reduced functionality for other views
            alphabetTabs.style.display = 'flex';
            sidebarStats.style.display = 'block';
            sidebar.style.opacity = '0.7';
        }
    }

    showAddSong(editIndex = -1) {
        this.editingIndex = editIndex;
        
        if (editIndex >= 0) {
            const song = this.songs[editIndex];
            document.getElementById('addSongTitle').textContent = 'Editar Canción';
            document.getElementById('titleInput').value = song.title;
            document.getElementById('artistInput').value = song.artist;
            document.getElementById('keyInput').value = song.key;
            document.getElementById('tempoInput').value = song.tempo || 120;
            document.getElementById('lyricsInput').value = song.lyrics;
        } else {
            document.getElementById('addSongTitle').textContent = 'Nueva Canción';
            document.getElementById('songForm').reset();
        }
        
        this.showView('addSong');
    }

    saveSong(e) {
        e.preventDefault();
        
        // Make sure lyrics are updated from interactive method if that's being used
        if (!document.getElementById('interactiveMethod').classList.contains('hidden')) {
            this.updateLyricsFromInteractive();
        }
        
        const song = {
            title: document.getElementById('titleInput').value,
            artist: document.getElementById('artistInput').value,
            key: document.getElementById('keyInput').value,
            tempo: parseInt(document.getElementById('tempoInput').value) || 120,
            lyrics: document.getElementById('lyricsInput').value,
            chords: this.extractChords(document.getElementById('lyricsInput').value),
            createdAt: this.editingIndex >= 0 ? this.songs[this.editingIndex].createdAt : new Date().toISOString()
        };

        if (this.editingIndex >= 0) {
            this.songs[this.editingIndex] = song;
        } else {
            this.songs.push(song);
        }

        this.saveSongs();
        this.updateAlphabetTabs();
        this.updateStats();
        this.renderSongs();
        this.showView('songList');
        
        // Reset form
        document.getElementById('songForm').reset();
        document.getElementById('plainTextInput').value = '';
        document.getElementById('syllableEditor').innerHTML = '';
        this.editingIndex = -1;
    }

    extractChords(lyrics) {
        const chordRegex = /\[([^\]]+)\]/g;
        const chords = new Set();
        let match;
        
        while ((match = chordRegex.exec(lyrics)) !== null) {
            chords.add(match[1]);
        }
        
        return Array.from(chords);
    }

    renderSongs() {
        const container = document.getElementById('songsGrid');
        const filteredSongs = this.getFilteredSongs();
        
        // Sort songs alphabetically
        const sortedSongs = [...filteredSongs].sort((a, b) => 
            a.title.localeCompare(b.title, 'es', { sensitivity: 'base' })
        );
        
        if (sortedSongs.length === 0) {
            const emptyMessage = this.currentFilter === 'all' 
                ? 'No hay canciones aún'
                : `No hay canciones que empiecen con "${this.currentFilter}"`;
                
            const emptyDescription = this.currentFilter === 'all'
                ? 'Agrega tu primera canción para empezar'
                : 'Prueba con otra letra o agrega una nueva canción';
                
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-music"></i>
                    <h3>${emptyMessage}</h3>
                    <p>${emptyDescription}</p>
                    <button class="btn-primary" onclick="app.showAddSong()">
                        <i class="fas fa-plus"></i>
                        Agregar Canción
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedSongs.map((song) => {
            const originalIndex = this.songs.indexOf(song);
            return `
                <div class="song-card" onclick="app.viewSong(${originalIndex})">
                    <h3>${song.title}</h3>
                    <p>${song.artist}</p>
                    <div class="song-meta">
                        <span>${song.chords.length} acordes</span>
                        <span class="song-key">${song.key}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    searchSongs(query) {
        if (!query.trim()) {
            this.renderSongs();
            return;
        }

        // Apply search to current filter
        const baseFilteredSongs = this.getFilteredSongs();
        const searchFiltered = baseFilteredSongs.filter(song => 
            song.title.toLowerCase().includes(query.toLowerCase()) ||
            song.artist.toLowerCase().includes(query.toLowerCase())
        );
        
        // Sort results alphabetically
        const sortedResults = [...searchFiltered].sort((a, b) => 
            a.title.localeCompare(b.title, 'es', { sensitivity: 'base' })
        );
        
        const container = document.getElementById('songsGrid');
        
        if (sortedResults.length === 0) {
            const searchContext = this.currentFilter === 'all' 
                ? 'en todas las canciones'
                : `en canciones con "${this.currentFilter}"`;
                
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No se encontraron resultados</h3>
                    <p>No hay canciones que coincidan con "${query}" ${searchContext}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedResults.map((song) => {
            const actualIndex = this.songs.indexOf(song);
            return `
                <div class="song-card" onclick="app.viewSong(${actualIndex})">
                    <h3>${song.title}</h3>
                    <p>${song.artist}</p>
                    <div class="song-meta">
                        <span>${song.chords.length} acordes</span>
                        <span class="song-key">${song.key}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    viewSong(index) {
        this.currentSong = this.songs[index];
        this.currentTranspose = 0;
        
        document.getElementById('songTitle').textContent = this.currentSong.title;
        document.getElementById('songArtist').textContent = this.currentSong.artist;
        document.getElementById('currentKey').textContent = this.currentSong.key;
        
        this.renderChordDiagrams();
        this.renderLyrics();
        
        // Set edit button handler
        document.getElementById('editSongBtn').onclick = () => this.showAddSong(index);
        
        this.showView('song');
    }

    editCurrentSong() {
        const index = this.songs.indexOf(this.currentSong);
        if (index >= 0) {
            this.showAddSong(index);
        }
    }

    renderChordDiagrams() {
        const container = document.getElementById('chordDiagrams');
        const chords = this.getTransposedChords();
        
        container.innerHTML = chords.map(chord => `
            <div class="chord-item" onclick="app.showChordModal('${chord}')">
                ${this.getChordDiagram(chord)}
            </div>
        `).join('');
    }

    renderLyrics() {
        const container = document.getElementById('lyricsContainer');
        let lyrics = this.currentSong.lyrics;
        
        if (this.currentTranspose !== 0) {
            lyrics = this.transposeLyrics(lyrics);
        }
        
        // Process lyrics to show chords above text
        const processedLyrics = this.processLyricsWithChords(lyrics);
        container.innerHTML = processedLyrics;
    }

    processLyricsWithChords(lyrics) {
        const lines = lyrics.split('\n');
        const processedLines = [];

        lines.forEach(line => {
            if (line.trim() === '') {
                processedLines.push('<div class="lyrics-line-empty"></div>');
                return;
            }

            // Extract chords and their positions in the original line
            const chordMatches = [];
            const chordRegex = /\[([^\]]+)\]/g;
            let match;

            while ((match = chordRegex.exec(line)) !== null) {
                chordMatches.push({
                    chord: match[1],
                    originalPosition: match.index,
                    fullMatch: match[0]
                });
            }

            // Remove chord brackets to get clean text
            const cleanText = line.replace(/\[([^\]]+)\]/g, '');

            if (chordMatches.length === 0) {
                processedLines.push(`<div class="lyrics-line-text">${cleanText}</div>`);
                return;
            }

            // Calculate actual positions in clean text
            const chordPositions = [];
            let offset = 0;

            chordMatches.forEach(chordMatch => {
                const positionInCleanText = chordMatch.originalPosition - offset;
                chordPositions.push({
                    chord: chordMatch.chord,
                    position: Math.max(0, positionInCleanText)
                });
                offset += chordMatch.fullMatch.length;
            });

            // Build the aligned lines
            const result = this.buildAlignedLines(cleanText, chordPositions);

            processedLines.push(`
                <div class="lyrics-line">
                    <div class="chord-line">${result.chordLine}</div>
                    <div class="text-line">${result.textLine}</div>
                </div>
            `);
        });

        return processedLines.join('');
    }

    buildAlignedLines(text, chordPositions) {
        // Create arrays to build the lines character by character
        const maxLength = text.length + chordPositions.reduce((sum, chord) => sum + chord.chord.length, 0);
        const chordLineArray = new Array(maxLength).fill(' ');
        const textLineArray = new Array(maxLength).fill(' ');

        // Place the text first
        for (let i = 0; i < text.length; i++) {
            textLineArray[i] = text[i];
        }

        // Place chords at their correct positions
        chordPositions.forEach(chordInfo => {
            const chordStartPos = chordInfo.position;
            const chord = chordInfo.chord;
            
            // Place chord above the text position
            for (let i = 0; i < chord.length; i++) {
                if (chordStartPos + i < chordLineArray.length) {
                    chordLineArray[chordStartPos + i] = chord[i];
                }
            }
        });

        // Convert arrays back to strings and trim
        let chordLine = chordLineArray.join('').trimEnd();
        let textLine = textLineArray.join('').trimEnd();

        // Ensure both lines have the same length for proper alignment
        const maxLen = Math.max(chordLine.length, textLine.length);
        chordLine = chordLine.padEnd(maxLen, ' ');
        textLine = textLine.padEnd(maxLen, ' ');

        // Create clickable chords
        const chordLineHTML = this.makeChordLineClickable(chordLine, chordPositions);

        return {
            chordLine: chordLineHTML,
            textLine: textLine
        };
    }

    makeChordLineClickable(chordLine, chordPositions) {
        let html = '';
        let processedChords = [];

        // Sort chord positions to process them in order
        const sortedChords = [...chordPositions].sort((a, b) => a.position - b.position);

        let currentIndex = 0;

        sortedChords.forEach(chordInfo => {
            const chordStart = chordInfo.position;
            const chordEnd = chordStart + chordInfo.chord.length;

            // Add any spaces/text before this chord
            if (chordStart > currentIndex) {
                html += chordLine.substring(currentIndex, chordStart);
            }

            // Add the clickable chord
            html += `<span class="chord-above" onclick="app.showChordModal('${chordInfo.chord}')">${chordInfo.chord}</span>`;

            currentIndex = chordEnd;
        });

        // Add any remaining content
        if (currentIndex < chordLine.length) {
            html += chordLine.substring(currentIndex);
        }

        return html;
    }

    transpose(semitones) {
        this.currentTranspose += semitones;
        const newKey = this.transposeChord(this.currentSong.key, this.currentTranspose);
        document.getElementById('currentKey').textContent = newKey;
        
        this.renderChordDiagrams();
        this.renderLyrics();
    }

    transposeChord(chord, semitones) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const chordPattern = /^([A-G][#b]?)(.*)$/;
        const match = chord.match(chordPattern);
        
        if (!match) return chord;
        
        const rootNote = match[1].replace('b', '#'); // Convert flats to sharps
        const suffix = match[2];
        
        let noteIndex = notes.indexOf(rootNote);
        if (noteIndex === -1) return chord;
        
        noteIndex = (noteIndex + semitones + 12) % 12;
        return notes[noteIndex] + suffix;
    }

    transposeLyrics(lyrics) {
        return lyrics.replace(/\[([^\]]+)\]/g, (match, chord) => {
            return `[${this.transposeChord(chord, this.currentTranspose)}]`;
        });
    }

    getTransposedChords() {
        if (this.currentTranspose === 0) {
            return this.currentSong.chords;
        }
        
        return this.currentSong.chords.map(chord => 
            this.transposeChord(chord, this.currentTranspose)
        );
    }

    showChordModal(chordName) {
        document.getElementById('chordModalTitle').textContent = `Acorde ${chordName}`;
        document.getElementById('chordDiagramLarge').innerHTML = this.getLargeChordDiagram(chordName);
        document.getElementById('chordModal').classList.remove('hidden');
    }

    getLargeChordDiagram(chordName) {
        const chordPositions = {
            // Major chords
            'C': [null, 3, 2, 0, 1, 0],
            'C#': [null, 4, 6, 6, 6, 4],
            'D': [null, null, 0, 2, 3, 2],
            'D#': [null, null, 1, 3, 4, 3],
            'E': [0, 2, 2, 1, 0, 0],
            'F': [1, 3, 3, 2, 1, 1],
            'F#': [2, 4, 4, 3, 2, 2],
            'G': [3, 2, 0, 0, 0, 3],
            'G#': [4, 6, 6, 5, 4, 4],
            'A': [null, 0, 2, 2, 2, 0],
            'A#': [null, 1, 3, 3, 3, 1],
            'B': [null, 2, 4, 4, 4, 2],
            
            // Minor chords
            'Cm': [null, 3, 5, 5, 4, 3],
            'C#m': [null, 4, 6, 6, 5, 4],
            'Dm': [null, null, 0, 2, 3, 1],
            'D#m': [null, null, 1, 3, 4, 2],
            'Em': [0, 2, 2, 0, 0, 0],
            'Fm': [1, 3, 3, 1, 1, 1],
            'F#m': [2, 4, 4, 2, 2, 2],
            'Gm': [3, 5, 5, 3, 3, 3],
            'G#m': [4, 6, 6, 4, 4, 4],
            'Am': [null, 0, 2, 2, 1, 0],
            'A#m': [null, 1, 3, 3, 2, 1],
            'Bm': [null, 2, 4, 4, 3, 2],
            
            // 7th chords
            'C7': [null, 3, 2, 3, 1, 0],
            'C#7': [null, 4, 3, 4, 2, 4],
            'D7': [null, null, 0, 2, 1, 2],
            'D#7': [null, null, 1, 3, 2, 3],
            'E7': [0, 2, 2, 1, 3, 0],
            'F7': [1, 3, 1, 2, 1, 1],
            'F#7': [2, 4, 2, 3, 2, 2],
            'G7': [3, 2, 0, 0, 0, 1],
            'G#7': [4, 6, 4, 5, 4, 4],
            'A7': [null, 0, 2, 0, 2, 0],
            'A#7': [null, 1, 3, 1, 3, 1],
            'B7': [null, 2, 1, 2, 0, 2],
            
            // Minor 7th chords
            'Cm7': [null, 3, 5, 3, 4, 3],
            'C#m7': [null, 4, 6, 4, 5, 4],
            'Dm7': [null, null, 0, 2, 1, 1],
            'D#m7': [null, null, 1, 3, 2, 2],
            'Em7': [0, 2, 2, 0, 3, 0],
            'Fm7': [1, 3, 1, 1, 1, 1],
            'F#m7': [2, 4, 2, 2, 2, 2],
            'Gm7': [3, 5, 3, 3, 3, 3],
            'G#m7': [4, 6, 4, 4, 4, 4],
            'Am7': [null, 0, 2, 0, 1, 0],
            'A#m7': [null, 1, 3, 1, 2, 1],
            'Bm7': [null, 2, 4, 2, 3, 2],
            
            // Major 7th chords
            'CMaj7': [null, 3, 2, 0, 0, 0],
            'C#Maj7': [null, 4, 3, 1, 1, 1],
            'DMaj7': [null, null, 0, 2, 2, 2],
            'D#Maj7': [null, null, 1, 3, 3, 3],
            'EMaj7': [0, 2, 1, 1, 0, 0],
            'FMaj7': [1, 3, 3, 2, 1, 0],
            'F#Maj7': [2, 4, 4, 3, 2, 1],
            'GMaj7': [3, 2, 0, 0, 0, 2],
            'G#Maj7': [4, 3, 1, 1, 1, 3],
            'AMaj7': [null, 0, 2, 1, 2, 0],
            'A#Maj7': [null, 1, 3, 2, 3, 1],
            'BMaj7': [null, 2, 4, 3, 4, 2],
            
            // Suspended 2nd chords
            'Csus2': [null, 3, 0, 0, 1, 0],
            'Dsus2': [null, null, 0, 2, 3, 0],
            'Esus2': [0, 2, 4, 4, 0, 0],
            'Fsus2': [1, 3, 0, 0, 1, 1],
            'Gsus2': [3, 2, 0, 0, 0, 0],
            'Asus2': [null, 0, 2, 2, 0, 0],
            'Bsus2': [null, 2, 4, 4, 2, 2],
            
            // Suspended 4th chords
            'Csus4': [null, 3, 3, 0, 1, 1],
            'Dsus4': [null, null, 0, 2, 3, 3],
            'Esus4': [0, 2, 2, 2, 0, 0],
            'Fsus4': [1, 3, 3, 3, 1, 1],
            'Gsus4': [3, 2, 0, 0, 1, 1],
            'Asus4': [null, 0, 2, 2, 3, 0],
            'Bsus4': [null, 2, 4, 4, 5, 2],
        };

        const positions = chordPositions[chordName];
        if (!positions) {
            return this.createLargeChordDiagramSVG(chordName, [null, null, null, null, null, null], true);
        }
        
        return this.createLargeChordDiagramSVG(chordName, positions);
    }

    createLargeChordDiagramSVG(chordName, positions, isUnavailable = false) {
        const width = 200;
        const height = 260;
        const stringSpacing = 24;
        const fretSpacing = 30;
        const startX = 30;
        const startY = 50;
        const numFrets = 5;
        const numStrings = 6;

        let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Background
        svg += `<rect width="${width}" height="${height}" fill="white" stroke="var(--border-color)" stroke-width="2" rx="12"/>`;
        
        // Chord name
        svg += `<text x="${width/2}" y="30" text-anchor="middle" font-family="var(--font-title)" font-size="18" font-weight="bold" fill="var(--color-dark)">${chordName}</text>`;
        
        if (isUnavailable) {
            svg += `<text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="var(--font-body)" font-size="14" fill="var(--color-info)">No disponible</text>`;
            svg += `</svg>`;
            return svg;
        }

        // Draw frets (horizontal lines)
        for (let i = 0; i <= numFrets; i++) {
            const y = startY + i * fretSpacing;
            const strokeWidth = i === 0 ? 4 : 2; // Nut is thicker
            svg += `<line x1="${startX}" y1="${y}" x2="${startX + (numStrings - 1) * stringSpacing}" y2="${y}" stroke="var(--color-dark)" stroke-width="${strokeWidth}"/>`;
        }

        // Draw strings (vertical lines)
        for (let i = 0; i < numStrings; i++) {
            const x = startX + i * stringSpacing;
            svg += `<line x1="${x}" y1="${startY}" x2="${x}" y2="${startY + numFrets * fretSpacing}" stroke="var(--color-dark)" stroke-width="2"/>`;
        }

        // Draw finger positions and markers
        for (let stringIndex = 0; stringIndex < numStrings; stringIndex++) {
            const x = startX + stringIndex * stringSpacing;
            const fret = positions[stringIndex];
            
            if (fret === null) {
                // X for muted string
                svg += `<text x="${x}" y="${startY - 15}" text-anchor="middle" font-family="var(--font-title)" font-size="16" font-weight="bold" fill="var(--color-accent)">×</text>`;
            } else if (fret === 0) {
                // O for open string
                svg += `<circle cx="${x}" cy="${startY - 15}" r="8" fill="none" stroke="var(--color-primary)" stroke-width="3"/>`;
            } else if (fret <= numFrets) {
                // Finger position
                const y = startY + (fret - 0.5) * fretSpacing;
                svg += `<circle cx="${x}" cy="${y}" r="10" fill="var(--color-primary)" stroke="white" stroke-width="2"/>`;
                // Add finger number
                svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-family="var(--font-title)" font-size="12" font-weight="bold" fill="white">${fret}</text>`;
            }
        }

        // Fret numbers on the side
        for (let i = 1; i <= numFrets; i++) {
            const y = startY + (i - 0.5) * fretSpacing;
            svg += `<text x="${startX + (numStrings - 1) * stringSpacing + 20}" y="${y + 5}" text-anchor="middle" font-family="var(--font-body)" font-size="14" fill="var(--color-info)">${i}</text>`;
        }

        // String names at the bottom
        const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];
        for (let i = 0; i < numStrings; i++) {
            const x = startX + i * stringSpacing;
            svg += `<text x="${x}" y="${startY + numFrets * fretSpacing + 20}" text-anchor="middle" font-family="var(--font-title)" font-size="12" font-weight="bold" fill="var(--color-info)">${stringNames[i]}</text>`;
        }

        svg += `</svg>`;
        return svg;
    }

    closeChordModal() {
        document.getElementById('chordModal').classList.add('hidden');
    }

    getChordDiagram(chordName) {
        const chordPositions = {
            // Major chords
            'C': [null, 3, 2, 0, 1, 0],
            'C#': [null, 4, 6, 6, 6, 4],
            'D': [null, null, 0, 2, 3, 2],
            'D#': [null, null, 1, 3, 4, 3],
            'E': [0, 2, 2, 1, 0, 0],
            'F': [1, 3, 3, 2, 1, 1],
            'F#': [2, 4, 4, 3, 2, 2],
            'G': [3, 2, 0, 0, 0, 3],
            'G#': [4, 6, 6, 5, 4, 4],
            'A': [null, 0, 2, 2, 2, 0],
            'A#': [null, 1, 3, 3, 3, 1],
            'B': [null, 2, 4, 4, 4, 2],
            
            // Minor chords
            'Cm': [null, 3, 5, 5, 4, 3],
            'C#m': [null, 4, 6, 6, 5, 4],
            'Dm': [null, null, 0, 2, 3, 1],
            'D#m': [null, null, 1, 3, 4, 2],
            'Em': [0, 2, 2, 0, 0, 0],
            'Fm': [1, 3, 3, 1, 1, 1],
            'F#m': [2, 4, 4, 2, 2, 2],
            'Gm': [3, 5, 5, 3, 3, 3],
            'G#m': [4, 6, 6, 4, 4, 4],
            'Am': [null, 0, 2, 2, 1, 0],
            'A#m': [null, 1, 3, 3, 2, 1],
            'Bm': [null, 2, 4, 4, 3, 2],
            
            // 7th chords
            'C7': [null, 3, 2, 3, 1, 0],
            'C#7': [null, 4, 3, 4, 2, 4],
            'D7': [null, null, 0, 2, 1, 2],
            'D#7': [null, null, 1, 3, 2, 3],
            'E7': [0, 2, 2, 1, 3, 0],
            'F7': [1, 3, 1, 2, 1, 1],
            'F#7': [2, 4, 2, 3, 2, 2],
            'G7': [3, 2, 0, 0, 0, 1],
            'G#7': [4, 6, 4, 5, 4, 4],
            'A7': [null, 0, 2, 0, 2, 0],
            'A#7': [null, 1, 3, 1, 3, 1],
            'B7': [null, 2, 1, 2, 0, 2],
            
            // Minor 7th chords
            'Cm7': [null, 3, 5, 3, 4, 3],
            'C#m7': [null, 4, 6, 4, 5, 4],
            'Dm7': [null, null, 0, 2, 1, 1],
            'D#m7': [null, null, 1, 3, 2, 2],
            'Em7': [0, 2, 2, 0, 3, 0],
            'Fm7': [1, 3, 1, 1, 1, 1],
            'F#m7': [2, 4, 2, 2, 2, 2],
            'Gm7': [3, 5, 3, 3, 3, 3],
            'G#m7': [4, 6, 4, 4, 4, 4],
            'Am7': [null, 0, 2, 0, 1, 0],
            'A#m7': [null, 1, 3, 1, 2, 1],
            'Bm7': [null, 2, 4, 2, 3, 2],
            
            // Major 7th chords
            'CMaj7': [null, 3, 2, 0, 0, 0],
            'C#Maj7': [null, 4, 3, 1, 1, 1],
            'DMaj7': [null, null, 0, 2, 2, 2],
            'D#Maj7': [null, null, 1, 3, 3, 3],
            'EMaj7': [0, 2, 1, 1, 0, 0],
            'FMaj7': [1, 3, 3, 2, 1, 0],
            'F#Maj7': [2, 4, 4, 3, 2, 1],
            'GMaj7': [3, 2, 0, 0, 0, 2],
            'G#Maj7': [4, 3, 1, 1, 1, 3],
            'AMaj7': [null, 0, 2, 1, 2, 0],
            'A#Maj7': [null, 1, 3, 2, 3, 1],
            'BMaj7': [null, 2, 4, 3, 4, 2],
            
            // Suspended 2nd chords
            'Csus2': [null, 3, 0, 0, 1, 0],
            'Dsus2': [null, null, 0, 2, 3, 0],
            'Esus2': [0, 2, 4, 4, 0, 0],
            'Fsus2': [1, 3, 0, 0, 1, 1],
            'Gsus2': [3, 2, 0, 0, 0, 0],
            'Asus2': [null, 0, 2, 2, 0, 0],
            'Bsus2': [null, 2, 4, 4, 2, 2],
            
            // Suspended 4th chords
            'Csus4': [null, 3, 3, 0, 1, 1],
            'Dsus4': [null, null, 0, 2, 3, 3],
            'Esus4': [0, 2, 2, 2, 0, 0],
            'Fsus4': [1, 3, 3, 3, 1, 1],
            'Gsus4': [3, 2, 0, 0, 1, 1],
            'Asus4': [null, 0, 2, 2, 3, 0],
            'Bsus4': [null, 2, 4, 4, 5, 2],
        };

        const positions = chordPositions[chordName];
        if (!positions) {
            return this.createChordDiagramSVG(chordName, [null, null, null, null, null, null], true);
        }
        
        return this.createChordDiagramSVG(chordName, positions);
    }

    createChordDiagramSVG(chordName, positions, isUnavailable = false) {
        const width = 120;
        const height = 160;
        const stringSpacing = 16;
        const fretSpacing = 20;
        const startX = 20;
        const startY = 30;
        const numFrets = 5;
        const numStrings = 6;

        let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Background
        svg += `<rect width="${width}" height="${height}" fill="white" stroke="var(--border-color)" stroke-width="1" rx="8"/>`;
        
        // Chord name
        svg += `<text x="${width/2}" y="20" text-anchor="middle" font-family="var(--font-title)" font-size="12" font-weight="bold" fill="var(--color-dark)">${chordName}</text>`;
        
        if (isUnavailable) {
            svg += `<text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="var(--font-body)" font-size="10" fill="var(--color-info)">No disponible</text>`;
            svg += `</svg>`;
            return svg;
        }

        // Draw frets (horizontal lines)
        for (let i = 0; i <= numFrets; i++) {
            const y = startY + i * fretSpacing;
            const strokeWidth = i === 0 ? 3 : 1; // Nut is thicker
            svg += `<line x1="${startX}" y1="${y}" x2="${startX + (numStrings - 1) * stringSpacing}" y2="${y}" stroke="var(--color-dark)" stroke-width="${strokeWidth}"/>`;
        }

        // Draw strings (vertical lines)
        for (let i = 0; i < numStrings; i++) {
            const x = startX + i * stringSpacing;
            svg += `<line x1="${x}" y1="${startY}" x2="${x}" y2="${startY + numFrets * fretSpacing}" stroke="var(--color-dark)" stroke-width="1"/>`;
        }

        // Draw finger positions and markers
        for (let stringIndex = 0; stringIndex < numStrings; stringIndex++) {
            const x = startX + stringIndex * stringSpacing;
            const fret = positions[stringIndex];
            
            if (fret === null) {
                // X for muted string
                svg += `<text x="${x}" y="${startY - 8}" text-anchor="middle" font-family="var(--font-title)" font-size="12" font-weight="bold" fill="var(--color-accent)">×</text>`;
            } else if (fret === 0) {
                // O for open string
                svg += `<circle cx="${x}" cy="${startY - 8}" r="6" fill="none" stroke="var(--color-primary)" stroke-width="2"/>`;
            } else if (fret <= numFrets) {
                // Finger position
                const y = startY + (fret - 0.5) * fretSpacing;
                svg += `<circle cx="${x}" cy="${y}" r="6" fill="var(--color-primary)" stroke="white" stroke-width="1"/>`;
            }
        }

        // Fret numbers on the side
        for (let i = 1; i <= numFrets; i++) {
            const y = startY + (i - 0.5) * fretSpacing;
            svg += `<text x="${startX + (numStrings - 1) * stringSpacing + 15}" y="${y + 3}" text-anchor="middle" font-family="var(--font-body)" font-size="10" fill="var(--color-info)">${i}</text>`;
        }

        svg += `</svg>`;
        return svg;
    }

    saveSongs() {
        localStorage.setItem('guitarSongs', JSON.stringify(this.songs));
    }

    // Sidebar and Alphabet Navigation
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleIcon = document.querySelector('#sidebarToggle i');
        
        this.sidebarCollapsed = !this.sidebarCollapsed;
        
        if (this.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            toggleIcon.classList.remove('fa-chevron-left');
            toggleIcon.classList.add('fa-chevron-right');
        } else {
            sidebar.classList.remove('collapsed');
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-left');
        }
    }

    generateAlphabetTabs() {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const container = document.getElementById('alphabetTabs');
        
        // Add "All" tab
        const allTab = this.createAlphabetTab('Todas', 'all', this.songs.length);
        container.appendChild(allTab);
        
        // Add separator
        const separator = document.createElement('div');
        separator.style.height = '1px';
        separator.style.background = 'rgba(102, 126, 234, 0.2)';
        separator.style.margin = '0.5rem 0';
        container.appendChild(separator);
        
        // Generate letter tabs
        alphabet.forEach(letter => {
            const count = this.getSongsForLetter(letter).length;
            const tab = this.createAlphabetTab(letter, letter, count);
            container.appendChild(tab);
        });
        
        // Eliminar cualquier tooltip no deseado después de crear las pestañas
        this.removeTooltips();
    }

    // Función para eliminar tooltips no deseados
    removeTooltips() {
        // Eliminar todos los atributos title de la aplicación
        document.querySelectorAll('[title]').forEach(element => {
            element.removeAttribute('title');
        });
        
        // Eliminar específicamente de las pestañas del alfabeto
        document.querySelectorAll('.alphabet-tab, .alphabet-tab *').forEach(element => {
            element.removeAttribute('title');
            element.removeAttribute('data-title');
            element.removeAttribute('aria-label');
        });
    }

    createAlphabetTab(letter, value, count) {
        const tab = document.createElement('div');
        tab.className = `alphabet-tab ${count === 0 ? 'disabled' : ''}`;
        if (this.currentFilter === value) {
            tab.classList.add('active');
        }
        
        // Remover cualquier atributo title que pueda causar tooltips
        tab.removeAttribute('title');
        
        // Choose icon based on type
        const icon = value === 'all' ? 'fas fa-list' : 'fas fa-book';
        
        tab.innerHTML = `
            <i class="tab-icon ${icon}"></i>
            <span class="tab-letter">${letter}</span>
            <span class="tab-count">${count}</span>
        `;
        
        // Asegurar que los elementos internos no tengan title
        tab.querySelectorAll('*').forEach(el => {
            el.removeAttribute('title');
        });
        
        if (count > 0) {
            tab.addEventListener('click', () => this.filterByLetter(value));
        }
        
        return tab;
    }

    getSongsForLetter(letter) {
        return this.songs.filter(song => 
            song.title.charAt(0).toUpperCase() === letter.toUpperCase()
        );
    }

    filterByLetter(letter) {
        // If not in song list view, go back to song list first
        if (this.currentView !== 'songList') {
            this.showView('songList');
        }
        
        this.currentFilter = letter;
        this.currentLetter = letter;
        
        // Update active tab
        document.querySelectorAll('.alphabet-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = Array.from(document.querySelectorAll('.alphabet-tab')).find(tab => {
            const tabLetter = tab.querySelector('.tab-letter').textContent;
            return (letter === 'all' && tabLetter === 'Todas') || tabLetter === letter;
        });
        
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update header
        this.updateSectionHeader();
        
        // Render filtered songs
        this.renderSongs();
        
        // Clear search
        document.getElementById('searchInput').value = '';
    }

    updateSectionHeader() {
        const titleElement = document.getElementById('sectionTitle');
        const filterElement = document.getElementById('currentFilter');
        
        if (this.currentFilter === 'all') {
            titleElement.textContent = 'Mis Canciones';
            filterElement.textContent = '';
        } else {
            titleElement.textContent = `Canciones con "${this.currentFilter}"`;
            const count = this.getFilteredSongs().length;
            filterElement.textContent = `${count} ${count === 1 ? 'canción' : 'canciones'}`;
        }
    }

    getFilteredSongs() {
        if (this.currentFilter === 'all') {
            return this.songs;
        }
        return this.getSongsForLetter(this.currentFilter);
    }

    updateStats() {
        document.getElementById('totalSongs').textContent = this.songs.length;
    }

    updateAlphabetTabs() {
        const container = document.getElementById('alphabetTabs');
        container.innerHTML = '';
        this.generateAlphabetTabs();
    }

    // Interactive Lyrics System
    switchInputMethod(method) {
        const manualTab = document.getElementById('manualTab');
        const interactiveTab = document.getElementById('interactiveTab');
        const manualMethod = document.getElementById('manualMethod');
        const interactiveMethod = document.getElementById('interactiveMethod');

        if (method === 'manual') {
            manualTab.classList.add('active');
            interactiveTab.classList.remove('active');
            manualMethod.classList.remove('hidden');
            interactiveMethod.classList.add('hidden');
        } else {
            manualTab.classList.remove('active');
            interactiveTab.classList.add('active');
            manualMethod.classList.add('hidden');
            interactiveMethod.classList.remove('hidden');
            
            // Update chord suggestions when switching to interactive
            this.updateChordSuggestions();
        }
    }

    processPlainText() {
        const plainText = document.getElementById('plainTextInput').value.trim();
        if (!plainText) {
            alert('Por favor, ingresa la letra de la canción');
            return;
        }

        const syllableEditor = document.getElementById('syllableEditor');
        syllableEditor.innerHTML = '';

        const lines = plainText.split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                const lineDiv = this.createSyllableLine(line);
                syllableEditor.appendChild(lineDiv);
            } else {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'syllable-line';
                emptyDiv.innerHTML = '&nbsp;';
                syllableEditor.appendChild(emptyDiv);
            }
        });

        this.updateChordSuggestions();
    }

    createSyllableLine(line) {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'syllable-line';

        const words = line.split(' ');
        words.forEach((word, wordIndex) => {
            if (word.trim()) {
                const syllables = this.splitIntoSyllables(word);
                syllables.forEach((syllable, syllableIndex) => {
                    const syllableSpan = this.createSyllableElement(syllable, wordIndex, syllableIndex);
                    lineDiv.appendChild(syllableSpan);
                });
            }
            
            // Add space between words
            if (wordIndex < words.length - 1) {
                const space = document.createElement('span');
                space.className = 'space-syllable';
                space.innerHTML = '&nbsp;';
                lineDiv.appendChild(space);
            }
        });

        return lineDiv;
    }

    splitIntoSyllables(word) {
        // Función simple para dividir palabras en sílabas (aproximada para español)
        word = word.toLowerCase();
        
        const vowels = 'aeiouáéíóúü';
        const syllables = [];
        let currentSyllable = '';
        
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            currentSyllable += char;
            
            if (vowels.includes(char)) {
                // Si encontramos una vocal, verificamos si es el final de la sílaba
                let nextChar = word[i + 1];
                let nextNextChar = word[i + 2];
                
                if (!nextChar || vowels.includes(nextChar)) {
                    // Final de palabra o siguiente es vocal
                    syllables.push(currentSyllable);
                    currentSyllable = '';
                } else if (!nextNextChar || vowels.includes(nextNextChar)) {
                    // Siguiente es consonante y después vocal o fin
                    syllables.push(currentSyllable);
                    currentSyllable = '';
                } else {
                    // Dos consonantes seguidas, dividir después de la primera
                    if (i + 2 < word.length) {
                        currentSyllable += nextChar;
                        syllables.push(currentSyllable);
                        currentSyllable = '';
                        i++; // Saltamos la consonante que ya agregamos
                    }
                }
            }
        }
        
        if (currentSyllable) {
            syllables.push(currentSyllable);
        }
        
        return syllables.length > 0 ? syllables : [word];
    }

    createSyllableElement(syllable, wordIndex, syllableIndex) {
        const span = document.createElement('span');
        span.className = 'syllable';
        span.textContent = syllable;
        span.dataset.word = wordIndex;
        span.dataset.syllable = syllableIndex;
        
        span.addEventListener('click', (e) => this.showChordDropdown(e, span));
        
        return span;
    }

    showChordDropdown(event, syllableElement) {
        event.stopPropagation();
        
        // Close other dropdowns
        this.closeChordDropdowns();
        
        const dropdown = document.createElement('div');
        dropdown.className = 'chord-dropdown';
        
        const chords = this.getAllChords();
        const scaleChords = this.getScaleChords();
        
        // Add scale chords first
        scaleChords.forEach(chord => {
            const option = document.createElement('div');
            option.className = 'chord-option in-scale';
            option.textContent = chord;
            option.addEventListener('click', () => this.assignChord(syllableElement, chord));
            dropdown.appendChild(option);
        });
        
        // Add separator
        const separator = document.createElement('div');
        separator.style.borderTop = '1px solid #ddd';
        separator.style.margin = '0.25rem 0';
        dropdown.appendChild(separator);
        
        // Add other chords
        const otherChords = chords.filter(chord => !scaleChords.includes(chord));
        otherChords.forEach(chord => {
            const option = document.createElement('div');
            option.className = 'chord-option out-scale';
            option.textContent = chord;
            option.addEventListener('click', () => this.assignChord(syllableElement, chord));
            dropdown.appendChild(option);
        });
        
        // Add remove option if syllable has a chord
        if (syllableElement.dataset.chord) {
            const removeOption = document.createElement('div');
            removeOption.className = 'chord-option remove';
            removeOption.textContent = '❌ Quitar acorde';
            removeOption.addEventListener('click', () => this.removeChord(syllableElement));
            dropdown.appendChild(removeOption);
        }
        
        syllableElement.appendChild(dropdown);
    }

    assignChord(syllableElement, chord) {
        syllableElement.dataset.chord = chord;
        syllableElement.classList.add('has-chord');
        this.closeChordDropdowns();
        this.updateLyricsFromInteractive();
    }

    removeChord(syllableElement) {
        delete syllableElement.dataset.chord;
        syllableElement.classList.remove('has-chord');
        this.closeChordDropdowns();
        this.updateLyricsFromInteractive();
    }

    closeChordDropdowns(event) {
        if (event && event.target.closest('.chord-dropdown')) {
            return; // Don't close if clicking inside dropdown
        }
        
        document.querySelectorAll('.chord-dropdown').forEach(dropdown => {
            dropdown.remove();
        });
    }

    updateLyricsFromInteractive() {
        const syllableEditor = document.getElementById('syllableEditor');
        const lines = syllableEditor.querySelectorAll('.syllable-line');
        const lyricsLines = [];
        
        lines.forEach(line => {
            let lineText = '';
            const syllables = line.querySelectorAll('.syllable');
            const spaces = line.querySelectorAll('.space-syllable');
            
            let elementIndex = 0;
            const allElements = Array.from(line.children);
            
            allElements.forEach(element => {
                if (element.classList.contains('syllable')) {
                    const chord = element.dataset.chord;
                    if (chord) {
                        lineText += `[${chord}]${element.textContent}`;
                    } else {
                        lineText += element.textContent;
                    }
                } else if (element.classList.contains('space-syllable')) {
                    lineText += ' ';
                }
            });
            
            lyricsLines.push(lineText || '');
        });
        
        document.getElementById('lyricsInput').value = lyricsLines.join('\n');
    }

    getScaleChords() {
        const key = document.getElementById('keyInput').value;
        const majorScales = {
            'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
            'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
            'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
            'F': ['F', 'Gm', 'Am', 'A#', 'C', 'Dm', 'Edim'],
            'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
            'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
            'B': ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'],
            'C#': ['C#', 'D#m', 'E#m', 'F#', 'G#', 'A#m', 'B#dim'],
            'D#': ['D#', 'E#m', 'F##m', 'G#', 'A#', 'B#m', 'C##dim'],
            'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim'],
            'G#': ['G#', 'A#m', 'B#m', 'C#', 'D#', 'E#m', 'F##dim'],
            'A#': ['A#', 'B#m', 'C##m', 'D#', 'E#', 'F##m', 'G##dim']
        };
        
        return majorScales[key] || majorScales['C'];
    }

    getAllChords() {
        return [
            // Major chords
            'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
            // Minor chords
            'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
            // 7th chords
            'C7', 'C#7', 'D7', 'D#7', 'E7', 'F7', 'F#7', 'G7', 'G#7', 'A7', 'A#7', 'B7',
            // Minor 7th
            'Cm7', 'C#m7', 'Dm7', 'D#m7', 'Em7', 'Fm7', 'F#m7', 'Gm7', 'G#m7', 'Am7', 'A#m7', 'Bm7',
            // Major 7th
            'CMaj7', 'C#Maj7', 'DMaj7', 'D#Maj7', 'EMaj7', 'FMaj7', 'F#Maj7', 'GMaj7', 'G#Maj7', 'AMaj7', 'A#Maj7', 'BMaj7',
            // Suspended
            'Csus2', 'Csus4', 'Dsus2', 'Dsus4', 'Esus2', 'Esus4', 'Fsus2', 'Fsus4', 'Gsus2', 'Gsus4', 'Asus2', 'Asus4', 'Bsus2', 'Bsus4'
        ];
    }

    updateChordSuggestions() {
        const container = document.getElementById('chordSuggestions');
        const scaleChords = this.getScaleChords();
        
        container.innerHTML = '';
        
        scaleChords.forEach((chord, index) => {
            const span = document.createElement('span');
            span.className = `chord-suggestion ${index < 3 ? 'primary' : ''}`;
            span.textContent = chord;
            container.appendChild(span);
        });
    }

    // Add sample songs for demo
    addSampleSongs() {
        const sampleSongs = [
            {
                title: "Wonderwall",
                artist: "Oasis",
                key: "Em",
                tempo: 87,
                lyrics: `[Em7]Today is [G]gonna be the day that they're [D]gonna throw it back to [C]you
[Em7]By now you [G]should have somehow real[D]ized what you gotta [C]do
[Em7]I don't believe that [G]anybody [D]feels the way I [C]do about you [D]now

And [C]all the roads we [D]have to walk are [Em7]winding
And [C]all the lights that [D]lead us there are [Em7]blinding
[C]There are many [D]things that I would [G]like to [D/F#]say to [Em7]you
But I don't know [A]how

Because [C]maybe [D]you're gonna be the one that [Em7]saves me
And [C]after [D]all you're my wonder[Em7]wall`,
                chords: ["Em7", "G", "D", "C", "D/F#", "A"],
                createdAt: new Date().toISOString()
            },
            {
                title: "Let It Be",
                artist: "The Beatles",
                key: "C",
                tempo: 73,
                lyrics: `[C]When I find myself in [G]times of trouble
[Am]Mother Mary [F]comes to me
[C]Speaking words of [G]wisdom, let it [F]be [C]

[C]And in my hour of [G]darkness
She is [Am]standing right in [F]front of me
[C]Speaking words of [G]wisdom, let it [F]be [C]

Let it [Am]be, let it [G]be, let it [F]be, let it [C]be
[G]Whisper words of [F]wisdom, let it [C]be`,
                chords: ["C", "G", "Am", "F"],
                createdAt: new Date().toISOString()
            }
        ];

        if (this.songs.length === 0) {
            this.songs = sampleSongs;
            this.saveSongs();
            this.updateAlphabetTabs();
            this.updateStats();
            this.renderSongs();
        }
    }
}

// Initialize the application
let app;

// Add sample songs if there are none
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que el sistema de autenticación esté listo
    const initApp = () => {
        if (typeof authSystem !== 'undefined' && authSystem.isAuthenticated()) {
            if (!app) {
                app = new GuitarSongbook();
                app.addSampleSongs();
            }
        } else {
            // Si no está autenticado, esperar un poco más
            setTimeout(initApp, 100);
        }
    };
    
    // Intentar inicializar inmediatamente o esperar
    initApp();
}); 