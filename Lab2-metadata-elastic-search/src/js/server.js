import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import Controller from '../api/Controller.js'
import multer from 'multer';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ dest:'uploads/' });
app.use(express.json());

const port = 3000;

app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

app.post('/api/games/create', upload.none(), Controller.apiCreateGame);
// app.get('/api/games', Controller.apiGetAllGames);
// app.put('/api/games/:id', Controller.apiUpdateGameByID);
app.get('/api/games/filter', Controller.apiGetGamesByFilters);
app.get('/api/games/fulltext', Controller.apiGetGamesByFulltext);
app.delete('/api/games/delete/:id', Controller.apiDeleteGameByID);

app.get('/', (req, res) => {
  res.sendFile(path.resolve('./src/html/index.html'));
});

app.use('*', (req, res) => { // fallback case
  res.status(404).json({
    error: "not found"
  });
});

app.listen(port, () => {
  console.log(`Listening to http://localhost:${port}`);
});