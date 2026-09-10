const fs = require('fs');

const EVENTS_API = 'https://gdg.community.dev/api/event_slim/for_chapter';
const PAGE_SIZE = 50;
// Small pause between chapters so the weekly scrape stays gentle on gdg.community.dev.
const DELAY_BETWEEN_CHAPTERS_MS = 300;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const AUDIENCE_LABELS = {
    IN_PERSON: 'In person',
    VIRTUAL: 'Virtual',
    HYBRID: 'Hybrid',
};

const parseCSVLine = (text) => {
    let ret = [''], i = 0, p = '', s = true;
    for (let l in text) {
        l = text[l];
        if ('"' === l) {
            s = !s;
            if ('"' === p) {
                ret[i] += '"';
                l = '-';
            } else if ('' === p) {
                l = '-';
            }
        } else if (s && ',' === l) {
            l = ret[++i] = '';
        } else {
            ret[i] += l;
        }
        p = l;
    }
    return ret;
};

function readChaptersFromCSV() {
    const csvData = fs.readFileSync('./chapters.csv', 'utf8');
    const lines = csvData.trim().split(/\r?\n/);
    const chapters = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length < 4) continue;
        if (values[0].trim() !== 'GDG') continue;

        let name = values[2].trim();
        if (name.startsWith('"') && name.endsWith('"')) {
            name = name.slice(1, -1);
        }
        chapters.push({
            type: name.toLowerCase().includes('cloud') ? 'GDG Cloud' : 'GDG',
            city: values[1].trim(),
            name,
            url: values[3].trim(),
            events: [],
        });
    }
    return chapters;
}

// Follows the API's `links.next` so chapters with more events than one page
// are fully captured.
async function fetchAllLiveEvents(chapterId) {
    const results = [];
    let url = `${EVENTS_API}/${chapterId}/?page_size=${PAGE_SIZE}&status=Live`;

    while (url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`events request failed with HTTP ${res.status}`);
        const data = await res.json();
        results.push(...(data.results || []));
        url = data.links && data.links.next ? data.links.next : null;
    }
    return results;
}

// `status=Live` means "published", not "upcoming", so past events come back
// too. Keep only events that start today or later (the site applies the same
// rule at render time, so this only keeps the committed file small).
function toUpcomingEvents(rawEvents, now) {
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    return rawEvents
        .filter(e => e.start_date && new Date(e.start_date) >= startOfToday)
        .map(e => ({
            title: e.title,
            start_date: e.start_date,
            end_date: e.end_date || null,
            url: e.static_url,
            type: AUDIENCE_LABELS[e.audience_type] || null,
        }))
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
}

async function scrapeEvents() {
    console.log('Parsing CSV and filtering GDG chapters...');
    const gdgChapters = readChaptersFromCSV();
    console.log(`Found ${gdgChapters.length} chapters. Fetching IDs and Events...`);

    const now = new Date();
    let failures = 0;

    for (const chapter of gdgChapters) {
        try {
            console.log(`Scraping ${chapter.name}...`);
            const response = await fetch(chapter.url);
            if (!response.ok) throw new Error(`chapter page returned HTTP ${response.status}`);
            const html = await response.text();

            const idMatch = html.match(/Globals\.chapter_id\s*=\s*['"](\d+)['"]/);
            if (!idMatch) throw new Error('chapter_id not found in page');

            const rawEvents = await fetchAllLiveEvents(idMatch[1]);
            chapter.events = toUpcomingEvents(rawEvents, now);
        } catch (err) {
            failures++;
            console.error(`Error scraping ${chapter.name}: ${err.message}`);
        }
        await sleep(DELAY_BETWEEN_CHAPTERS_MS);
    }

    const totalEvents = gdgChapters.reduce((n, c) => n + c.events.length, 0);
    console.log(`Collected ${totalEvents} upcoming events across ${gdgChapters.length} chapters (${failures} chapters failed).`);

    // Refuse to wipe existing data if most chapters could not be scraped;
    // a partial result would otherwise be committed as "no events".
    if (failures > gdgChapters.length / 2) {
        console.error('More than half of the chapters failed to scrape. Leaving src/data/chapters.json untouched.');
        process.exitCode = 1;
        return;
    }

    fs.mkdirSync('src/data', { recursive: true });
    fs.writeFileSync('src/data/chapters.json', JSON.stringify(gdgChapters, null, 2) + '\n');
    console.log('Successfully updated src/data/chapters.json with events.');
}

scrapeEvents();
