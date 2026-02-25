import express from 'express';
import bodyParser from 'body-parser';
import sqlite3 from 'better-sqlite3';
import { z } from 'zod';
import dotenv from 'dotenv';
import Papa from 'papaparse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PassThrough } from 'stream';

// --- CONFIGURATION ---
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// --- DATABASE INITIALIZATION ---
const db = sqlite3('kana_insights.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT,
    content TEXT,
    date TEXT,
    sentiment TEXT,
    entity TEXT,
    score REAL,
    uploaded_at TEXT DEFAULT (datetime('now'))
  );
`);

const reviewColumns = db.prepare(`PRAGMA table_info(reviews)`).all() as Array<{ name: string }>;
const hasUploadedAt = reviewColumns.some((column) => column.name === 'uploaded_at');
if (!hasUploadedAt) {
  db.exec(`ALTER TABLE reviews ADD COLUMN uploaded_at TEXT`);
  db.exec(`UPDATE reviews SET uploaded_at = datetime('now') WHERE uploaded_at IS NULL`);
}

// --- MIDDLEWARE ---
// We use the JSON parser for other routes. The CSV route will handle the raw stream.
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('dist'));

// --- SCHEMAS ---
const ReviewSchema = z.object({
  platform: z.string(),
  content: z.string(),
  date: z.string(), // YYYY-MM-DD
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  entity: z.string(),
  score: z.number(),
});
const UploadRequestSchema = z.object({
  reviews: z.array(ReviewSchema),
});

// --- GEMINI AI SERVICE (SERVER-SIDE) ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is not defined in your .env file");
  console.error("⚠️  Please create a .env file with: GEMINI_API_KEY=your_actual_api_key");
  console.error("⚠️  Get your API key from: https://makersuite.google.com/app/apikey");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

interface Mention {
  id: string;
  source: string;
  content: string;
  date: string;
}
interface SentimentAnalysis {
  mentionId: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  entity: string;
}

const normalizeSentiment = (value: unknown): SentimentAnalysis['sentiment'] => {
  if (value === 'positive' || value === 'negative' || value === 'neutral') {
    return value;
  }
  return 'neutral';
};

function safeJSONParse<T>(text: string, fallback: T): T {
  if (typeof text !== 'string' || !text.trim().length) return fallback;
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("❌ Failed to parse JSON:", e, "Raw text:", text);
    return fallback;
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const analyzeBatch = async (mentions: Mention[], retryCount = 0): Promise<SentimentAnalysis[]> => {
  if (!apiKey) return mentions.map(m => ({ mentionId: m.id, sentiment: 'neutral', score: 0, entity: 'General' }));

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Build reviews list for prompt
  const reviewsList = mentions.map(m => `ID: ${m.id}\nReview: "${m.content}"`).join('\n\n');

  const prompt = `Analyze sentiment for these ${mentions.length} customer reviews of Kana Coffee. Reviews may be in Indonesian or English.

${reviewsList}

SENTIMENT CLASSIFICATION RULES:

POSITIVE = Komentar yang mengandung ungkapan kepuasan, apresiasi, atau pengalaman baik terhadap layanan/produk.
Keywords: bagus, enak, mantap, puas, recommended, keren, love, suka, luar biasa, ramah, cepat, nikmat, lezat, top, oke, sipp

NEGATIVE = Komentar yang menunjukkan ketidakpuasan, keluhan, kritik, atau pengalaman buruk.
Keywords: jelek, lambat, lelet, gajelas, ga jelas, mahal, kecewa, buruk, tidak puas, mengecewakan, payah, lama, ribet, zonk, kotor, jorok, tidak enak, mengecewakan
IMPORTANT: Words like "lelet" (slow), "lama" (takes long time), "lambat" (slow), "gajelas" (unclear) = NEGATIVE
IMPORTANT: If review contains complaint or criticism about waiting time → NEGATIVE + Service entity

NEUTRAL = Komentar yang bersifat informatif, deskriptif, atau tidak menunjukkan kecenderungan emosi yang jelas (tidak dominan positif maupun negatif).
Only use neutral when review is purely informational with NO positive or negative indicators.

ENTITY CLASSIFICATION STRICT RULES:
- "Quality" - rasa, taste, menu, makanan, minuman, food, drink quality, enak (when talking about food/drink taste)
- "Service" - pelayanan, staff, kasir, waiters, karyawan, customer service, lama, lambat, lelet (waiting time issues)
- "Price" - harga, mahal, murah, pricing, value, cost
- "Ambiance" - tempat (place), nyaman (comfortable place), cozy, suasana, interior, decoration, wifi, atmosphere, ruang
- "Location" - lokasi, parking, accessibility, alamat
- "General" - only when review covers multiple topics or is too general

CRITICAL RULES:
- "lelet" alone = NEGATIVE, Service
- "tempat" = Ambiance (NOT General)
- "pelayanan" = Service (NOT General or Ambiance)

Score: 0.0-0.3 (very negative), 0.3-0.49 (negative), 0.5 (neutral), 0.51-0.7 (positive), 0.7-1.0 (very positive)

Return ONLY a valid JSON array with NO markdown, one object per review:
[
  {"mentionId": "csv-row-1", "sentiment": "positive", "score": 0.8, "entity": "Quality"},
  {"mentionId": "csv-row-2", "sentiment": "negative", "score": 0.2, "entity": "Service"}
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log(`[Gemini Batch Response]:`, text.substring(0, 300));
    
    // Try to parse as JSON array
    let parsed: SentimentAnalysis[];
    try {
      const cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
      parsed = JSON.parse(cleanText);
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }
    } catch (e) {
      console.error('Failed to parse batch response, using fallback');
      return mentions.map((m): SentimentAnalysis => ({ mentionId: m.id, sentiment: 'neutral', score: 0.5, entity: 'General' }));
    }
    
    // Ensure all mentions have results
    const results: SentimentAnalysis[] = mentions.map((mention) => {
      const found = parsed.find(p => p.mentionId === mention.id);
      if (!found) {
        return { mentionId: mention.id, sentiment: 'neutral', score: 0.5, entity: 'General' };
      }

      return {
        mentionId: found.mentionId || mention.id,
        sentiment: normalizeSentiment(found.sentiment),
        score: typeof found.score === 'number' ? found.score : 0.5,
        entity: typeof found.entity === 'string' && found.entity.trim() ? found.entity : 'General'
      };
    });
    
    console.log(`[Parsed Batch Results]: ${results.length} reviews analyzed`);
    return results;
  } catch (error: any) {
    // Handle rate limit errors with retry
    if (error?.status === 429 && retryCount < 3) {
      const waitTime = Math.pow(2, retryCount) * 15000; // 15s, 30s, 60s
      console.log(`Rate limit hit, retrying batch in ${waitTime/1000}s...`);
      await sleep(waitTime);
      return analyzeBatch(mentions, retryCount + 1);
    }
    console.error(`Error analyzing batch:`, error);
    return mentions.map((m): SentimentAnalysis => ({ mentionId: m.id, sentiment: 'neutral', score: 0.5, entity: 'General' }));
  }
};


// --- API ENDPOINTS ---

app.post('/api/upload-csv', async (req, res) => {
  console.log('Received CSV upload request (streaming).');
  const platform = (req.query.platform as string) || 'CSV';

  // Set a long timeout for this request
  req.setTimeout(10 * 60 * 1000); // 10 minutes

  const mentionsToAnalyze: Mention[] = [];

  const csvStream = req.pipe(new PassThrough());

  let rowCount = 0;

  const parser = Papa.parse(Papa.NODE_STREAM_INPUT, {
    header: true,
    skipEmptyLines: true,
  });

  csvStream.pipe(parser);

  parser.on('data', (row: any) => {
    rowCount++;
    // Prepare the mention object
    const dateKeys = ['date', 'publish_date', 'created_at', 'timestamp', 'published_at', 'time', 'created', 'published', 'tanggal', 'waktu'];
    const foundDateKey = Object.keys(row).find(k => dateKeys.includes(k.toLowerCase().trim()));
    let rawDate = foundDateKey ? row[foundDateKey] : new Date().toISOString();
    let normalizedDate = String(rawDate).split('T')[0].split(' ')[0];
    if (normalizedDate.match(/^\d{4}-\d{2}-\d{2}/)) {
      normalizedDate = normalizedDate.substring(0, 10);
    }
    const content = row.content || row.text || row.Review || row.comment || row.caption || '';
    
    if (content) {
      const mention = {
        id: `csv-row-${rowCount}`,
        content,
        date: normalizedDate,
        source: platform,
      };
      mentionsToAnalyze.push(mention);
    }
  });

  parser.on('end', async () => {
    try {
      console.log(`CSV parsing complete. Found ${mentionsToAnalyze.length} valid rows. Starting batch analysis...`);
      
      // Process reviews in batches (15 reviews per batch, 5 batches per minute = 75 reviews/minute)
      const BATCH_SIZE = 15;
      const analyses: SentimentAnalysis[] = [];
      
      for (let i = 0; i < mentionsToAnalyze.length; i += BATCH_SIZE) {
        const batch = mentionsToAnalyze.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(mentionsToAnalyze.length / BATCH_SIZE);
        
        console.log(`Analyzing batch ${batchNum}/${totalBatches} (${batch.length} reviews)...`);
        const batchResults = await analyzeBatch(batch);
        analyses.push(...batchResults);
        
        // Add delay between batches to stay within rate limit (12 seconds = 5 batches per minute)
        if (i + BATCH_SIZE < mentionsToAnalyze.length) {
          console.log(`Waiting 12s before next batch...`);
          await sleep(12000);
        }
      }
      
      console.log(`Analysis complete. Preparing to store ${analyses.length} results.`);
      
      const reviewsToStore = mentionsToAnalyze.map((mention) => {
        const analysis = analyses.find(a => a.mentionId === mention.id);
        return {
          platform: mention.source,
          content: mention.content,
          date: mention.date,
          sentiment: analysis?.sentiment || 'neutral',
          entity: analysis?.entity || 'General',
          score: analysis?.score || 0,
        };
      });
      
      console.log('Storing results in the database...');
      const insert = db.prepare(
        'INSERT INTO reviews (platform, content, date, sentiment, entity, score) VALUES (@platform, @content, @date, @sentiment, @entity, @score)'
      );
      const transaction = db.transaction((items) => {
        for (const item of items) {
          try {
            insert.run(item);
          } catch(e) {
            console.error('Failed to insert item:', item, e);
          }
        }
      });
      
      transaction(reviewsToStore);
      console.log('Successfully stored reviews.');
      
      res.status(200).json({ message: `Successfully analyzed and stored ${reviewsToStore.length} reviews.` });
    } catch (error) {
      console.error('--- ERROR DURING STREAM COMPLETION ---', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'An unexpected error occurred on the server during stream processing.' });
      }
    }
  });

  parser.on('error', (error) => {
    console.error('--- CSV PARSING STREAM ERROR ---', error);
    if (!res.headersSent) {
      res.status(400).json({ error: 'Failed to parse CSV stream.', details: error.message });
    }
  });

  req.on('error', (error) => {
    console.error('--- REQUEST STREAM ERROR ---', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An error occurred with the request stream.' });
    }
  });
});

// Other endpoints remain the same
app.get('/api/data', (req, res) => {
  const sentimentFilter = req.query.sentiment as string;
  let whereClause = '';
  let params = [];

  if (['positive', 'negative', 'neutral'].includes(sentimentFilter)) {
    whereClause = 'WHERE sentiment = ?';
    params.push(sentimentFilter);
  }

  const reviews = db.prepare(`SELECT * FROM reviews ${whereClause} ORDER BY date DESC`).all(params);
  
  const summaryStmt = `
    SELECT
      (SELECT COUNT(*) FROM reviews WHERE sentiment = 'positive') as total_positive,
      (SELECT COUNT(*) FROM reviews WHERE sentiment = 'negative') as total_negative,
      (SELECT COUNT(*) FROM reviews WHERE sentiment = 'neutral') as total_neutral,
      (
        SELECT
          CASE
            WHEN COUNT(*) > 0 THEN strftime('%Y-%m-%dT%H:%M:%SZ', MAX(uploaded_at))
            ELSE NULL
          END
        FROM reviews
      ) as last_updated;
  `;
  const summary = db.prepare(summaryStmt).get();

  res.json({ reviews, summary });
});

app.delete('/api/data', (req, res) => {
  try {
    db.prepare('DELETE FROM reviews').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'reviews'").run();
    res.status(200).send({ message: 'All data cleared.' });
  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).send({ message: 'Failed to clear data.' });
  }
});

app.get('/api/topics', (req, res) => {
  const topics = db.prepare(`
    SELECT
      entity,
      COUNT(*) as total,
      SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
      SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative
    FROM reviews
    GROUP BY entity
    ORDER BY total DESC
    LIMIT 5;
  `).all();
  res.json(topics);
});

app.get('/api/trends', (req, res) => {
  const trends = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      COUNT(*) as count,
      SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
      SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative
    FROM reviews
    WHERE date >= strftime('%Y-%m-%d', 'now', '-6 months')
    GROUP BY month
    ORDER BY month;
  `).all();
  res.json(trends);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Serve index.html for all other routes to enable client-side routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile('index.html', { root: 'dist' });
  }
});
