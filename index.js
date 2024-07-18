require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const shortid = require('shortid');
const mongoose = require('mongoose');

const app = express();

const port = process.env.PORT || 3000;
const mongo_url = process.env.MONGO_URL;

mongoose.connect(mongo_url).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
});

const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortUrl: { type: String, required: true, unique: true },
});

const Url = mongoose.model('Url', urlSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', async (req, res) => {
  let originalUrl = req.body.url;

  if (!/^https?:\/\//i.test(originalUrl)) {
    originalUrl = 'http://' + originalUrl;
  }

  try {
    new URL(originalUrl);
  } catch (_) {
    return res.json({ error: 'invalid url' });
  }

  const host = new URL(originalUrl).hostname;

  dns.lookup(host, async (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    try {
      let existingUrl = await Url.findOne({ originalUrl });
      if (existingUrl) {
        return res.json({ original_url: existingUrl.originalUrl, short_url: existingUrl.shortUrl });
      }

      const shortUrl = shortid.generate();
      const newUrl = new Url({ originalUrl, shortUrl });
      const savedUrl = await newUrl.save();

      res.json({ original_url: savedUrl.originalUrl, short_url: savedUrl.shortUrl });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save URL' });
    }
  });
});

app.get('/api/shorturl/:shortUrl', async (req, res) => {
  let shortUrl = req.params.shortUrl;

  try {
    const doc = await Url.findOne({ shortUrl });
    if (doc) {
      res.redirect(doc.originalUrl);
    } else {
      res.status(404).json({ error: 'No URL found for the given short URL' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
