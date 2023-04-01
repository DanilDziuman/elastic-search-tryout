'use strict'
import fs from 'fs';
import ElasticSearch from '@elastic/elasticsearch';
// import test from '../../elasticsearch-8.6.2/'

const esclient = new ElasticSearch.Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'fA*9_b0y*lD_=ptMvXdc'
  },
  tls: {
    ca: fs.readFileSync('../elasticsearch-8.6.2/config/certs/http_ca.crt'),
    rejectUnauthorized: false
  }
});

class ESCGames {
  // initializing, setting and mapping 'games' index
  static async initGamesIndex() {
    try {
      let gamesExists = await esclient.indices.exists({
        index: 'games'
      });
      console.log('exists in init?:');
      console.log(gamesExists); // 1) true
      if (!gamesExists) {
        const created = await esclient.indices.create({
          index: 'games',
          settings: {
            index: {
              number_of_shards: 1,
              number_of_replicas: 2
            },
            analysis: {
              char_filter: { // for the custom analyzer of 'title' field
                title_char_filter: {
                  type: "mapping",
                  mappings: [
                    "Ⅰ => 1",
                    "Ⅱ => 2",
                    "Ⅲ => 3",
                    "Ⅳ => 4",
                    "Ⅴ => 5",
                    "Ⅵ => 6",
                    "Ⅶ => 7",
                    "Ⅷ => 8",
                    "Ⅸ => 9",
                    "Ⅹ => 10",
                    "Ⅺ => 11",
                    "Ⅻ => 12"
                  ]
                },
                title_punctuation_replace_filter: {
                  type: "pattern_replace",
                }
              },
              filter: { // ["a", "osdlfo", "sdfsd", "sdfsdf", "sdfs", "a", "the", fdfs]
                english_stop: { // stop-words like 'be', 'I', etc.
                  type: "stop",
                  stopwords: "_english_"
                },                          // [closes closing closed] => [close, closi, close]. Query: closing => [closi]   
                english_original_stemmer: { // rooting of words (overweight -> weight, closes -> close, etc.)
                  type: "stemmer",
                  language: "english"
                },
                english_possessive_stemmer: {
                  type: "stemmer",
                  language: "possessive_english"
                }
              },
              analyzer: {
                standard_analyzer: { // for 'about' field
                  type: "standard",
                  stopwords: "_english_"
                },

                english_analyzer: { // for 'review' field
                  tokenizer: "standard", // "a osdkfo sa sod os sosd dd" => ["a", "osdlfo"]
                  filter: [
                    "lowercase",
                    "english_stop",
                    "english_original_stemmer",
                    "english_possessive_stemmer"
                  ]
                },

                custom_title_analyzer: { // for 'title' field
                  type: "custom",
                  char_filter: [
                    "title_char_filter"
                  ],
                  tokenizer: "classic", // "asdasd  N.E.O.N. sdfsodfsod" => "neon". "N", "E", "O", "N"
                  filter: [
                    "lowercase", 
                    "asciifolding", // diacritic symbols -> normal symbols o.. => o, e.. => e
                    "classic", // interpret punctual characters differently (neon example) + remove 's
                    "english_original_stemmer",
                    "english_possessive_stemmer",
                    "trim" // not implied by default due to 'classic' tokenizer
                  ]
                }
              }
            }
          },
          mappings: {
            properties: {
              // lab3
              title: { 
                type: 'text',
                analyzer: 'custom_title_analyzer'
              },
              about: {
                type: 'text',
                analyzer: 'english_analyzer'
              },
              review: {
                type: 'text',
                analyzer: 'standard_analyzer'
              },
              // lab2
              company: { type: 'keyword' },
              platforms: { type: 'keyword' }, // an Array
              released: { type: 'date' },
              rating: { type: 'double' }, // 0-5
            }
          }
        });
        gamesExists = created.acknowledged;
        console.log('exists after create?:');
        console.log(gamesExists);
      }
    } catch (e) {
      console.log('test');
      console.log(e);
      return null;
    }
  }

  static async deleteGamesIndex() {
    try {
      let gamesExists = await esclient.indices.exists({
        index: 'games'
      });
      console.log('exists before delete?:');
      if (gamesExists) {
        const deleted = await esclient.indices.delete({
          index: 'games'
        });
        console.log('deleted?:');
        console.log(deleted.acknowledged);
      }
    } catch (e) {
      console.log('test');
      console.log(e);
      return null;
    }
  }
  // RESTful API methods (lab2 CRUD)
  static async gameExists(title) {  
    try {
      const uniqueField = 'title';
      const response = await esclient.search({
        index: 'games',
        query: {
          match: {
            [uniqueField]: title
          }
        }
      });
      return response.hits.total.value > 0;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  static async createGame(gameData) {
    try {
      console.log('isArray: ');
      console.log(Array.isArray(gameData.platforms));
      const response = await esclient.create({
        index: 'games',
        id: gameData.title,
        document: {
          title: gameData.title,
          about: gameData.about,
          review: gameData.review,
          company: gameData.company,
          platforms: gameData.platforms,
          released: new Date(gameData.released),
          rating: Number(gameData.rating)
        }
      });
      return response.result;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  static async deleteGame(titleID) {
    try {
      const response = await esclient.delete({
        index: 'games',
        id: titleID
      });
      console.log('deletion result from Elastic: ');
      console.log(response.result);
      return response.result;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  // filter-queries (lab2 search)
  
  static async searchGamesByFilters(filterData) {
    const { company, companyincludes, platforms, released, rating } = filterData;
    let filterClauses = [];

    if (company) {
      filterClauses.push({
        terms: {
          company: company
        }
      });
    }

    if (companyincludes) {
      const companyIncludesRegexpClauses = companyincludes.map(includeTerm => {
        const clause = {
          regexp: {
            company: {
              value: `.*${includeTerm}.*`,
              flags: 'ALL',
              case_insensitive: true
            }
          }
        }
        return clause;
      })
      filterClauses.push({
        bool: {
          should: companyIncludesRegexpClauses
        }
      });
    }

    if (platforms) {
      filterClauses.push({
        terms: {
          platforms: platforms
        }
      });
    }

    if (released) {
      let rangeReleasedClauses = released.map(releaseRange => {
        let [releaseStart, releaseEnd] = releaseRange.split('/');
        if (releaseEnd === 'now') {
          releaseEnd = (new Date()).toISOString().slice(0, 10);
        }
        const clause = {
          range: {
            released: {
              gte: releaseStart,
              lte: releaseEnd
            }
          }
        };
        return clause;
      });

      filterClauses.push({
        bool: {
          should: rangeReleasedClauses
        }
      });
    }
    
    if (rating) {
      let rangeRatingClauses = rating.map(ratingRange => {
        const [ratingStart, ratingEnd] = ratingRange.split('-');
        const clause = {
          range: {
            rating: {
              gte: ratingStart,
              lte: ratingEnd
            }
          }
        };
        return clause;
      });

      filterClauses.push({
        bool: {
          should: rangeRatingClauses
        }
      });
    }
    
    let response;
    if (filterClauses.length === 0) {
      response = await esclient.search({
        index: 'games',
        query: {
          match_all: {}
        }
      });
    } else {
      response = await esclient.search({
        index: 'games',
        query: {
          constant_score: { // means the default filter behaviour, with no variable 'weight' for documents
            filter: { // means the exact 100% matching, with no weights
              bool: { // 'bool' means a logical compounded query of multiple queries linked by boolean logic
                should: filterClauses,
                
                // [ // 'OR' filtering (at least 1 'true' to go)
                //   {
                //     terms: {
                //       company: company // ['FromSoftware', 'Activision Blizzard'], for example
                //     }
                //   },
                //   {
                //     terms: {
                //       platforms: platforms
                //     }
                //   },
                //   {
                //     // range: {
                //     //   relesaed: {
                //     //     or: rangeReleasedClauses
                //     //       /* [
                //     //           { "gte": "1970-01-01", "lte": "2000-01-01" },
                //     //           { "gte": "2000-01-01", "lte": "2005-01-01" },
                //     //          ] */
                //     //   }
                //     // }
                //     bool: {
                //       should: rangeReleasedClauses
                //     }
                //   },
                //   {
                //     // range: {
                //     //   rating: {
                //     //     or: rangeRatingClauses
                //     //     /* [
                //     //           { "gte": "0.2", "lte": "4.7" },
                //     //           { "gte": "1.2", "lte": "7.2" },
                //     //          ] */
                //     //   }
                //     // }
                //     bool: {
                //       should: rangeRatingClauses
                //     }
                //   }
                // ],
                minimum_should_match: 1
              }
            }
          }
        }
      });
    }
    console.log(response.hits.hits);
    return response.hits.hits;
  }

  // full-text-queries-methods (lab3 search)

  static async searchGamesByFulltext(fulltextData) {
    const { title, about, review } = fulltextData;
    let fulltextClauses = [];

    if (title) {
      fulltextClauses.push({
        match_phrase: {
          title: {
            query: title,
            slop: 1
          }
        }
      });
    }

    if (about) {
      fulltextClauses.push({
        match: {
          about: {
            query: about
          }
        }
      });
    }

    if (review) {
      fulltextClauses.push({
        match: { 
          review: {
            query: review
          }
        }
      });
    }

    let response;
    if (fulltextClauses.length === 0) {
      response = await esclient.search({
        index: 'games',
        query: {
          match_all: {}
        }
      });
    } else {
      response = await esclient.search({
        index: 'games',
        query: {
          bool: {
            should: fulltextClauses // []
          }
        }
      });
    }
    console.log(response.hits.hits);
    return response.hits.hits;
  }
}

// await ESCGames.deleteGamesIndex();
await ESCGames.initGamesIndex();

export default ESCGames;