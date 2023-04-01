import ESCGames from '../../elastic_client/esclient.js';

export default class Controller {
  // default CRUD:
  static async apiCreateGame(req, res) {
    const gameData = req.body;
    console.log('gameData before creation:');
    console.log(gameData);
    const gameExists = await ESCGames.gameExists(gameData.title);
    if (!gameExists) {
      const created = await ESCGames.createGame(gameData);
      if (created === 'created') {
        res.status(201).json({
          result: 'success',
          message: `Game '${gameData.title}' has been successfully added`
        });
      } else {
        res.status(500).json({
          result: 'fail',
          message: `Game  has not been added: internal server error`
        });
      }
    } else {
      res.status(409).json({
        result: 'fail',
        message: `Game has not been added: title '${gameData.title}' already exists`
      });
    }
  }

  static async apiDeleteGameByID(req, res) {
    const gameTitleID = decodeURIComponent(req.params.id);
    const deleted = await ESCGames.deleteGame(gameTitleID);
    if (deleted === 'deleted') {
      res.sendStatus(204);
    } else {
      res.status(404).json({
        result: 'fail',
        message: `Game with ID '${gameTitleID}' does not exist`
      });
    }
  }
  // extra READ operations based on simple search filters: (lab 2)
  static async apiGetGamesByFilters(req, res) {
    const filtersData = req.query;
    for (let key in filtersData) {
      if (!Array.isArray(filtersData[key])) {
        filtersData[key] = [filtersData[key]];
      }
    }
    console.log('filtersData: ');
    console.log(filtersData);
    const retrievedGames = await ESCGames.searchGamesByFilters(filtersData);
    res.status(200).json({
      result: retrievedGames,
      message: 'Search successfull'
    });
  }

  // extra READ operations based on full-text search: (lab 3)
  static async apiGetGamesByFulltext(req, res) {
    const fulltextData = req.query;
    const retrievedGames = await ESCGames.searchGamesByFulltext(fulltextData);
    res.status(200).json({
      result: retrievedGames,
      message: 'Search successfull'
    });
  }
}