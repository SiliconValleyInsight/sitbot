SITBOT_EXTENSION = (function() {
  var profiles = {}

  var progress;
  var scraping = false;


  function changeUrl(url) {
    chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
          chrome.tabs.update(tab.id, {url: url});
    });
  }

  function githubSearch(e){

    var url = 'https://github.com/search?type=users&q=';
    var params = convertFormToJSON(this);
    var query = '';
    var args = {};

    $.each(params, function(key, value){
      if (value.length > 0) {
        if (key == 's'){
          args[key] = value;
        } else {
          url += encodeURIComponent(key + ':' + value + ' ');
        }
      }
    })

    url += '&' + $.param(args);
    changeUrl(url);
    e.preventDefault();
  }

  function convertFormToJSON(form){
    var array = jQuery(form).serializeArray();
    var json = {};

    $.each(array, function() {
      let { name, value } = this;
      if (name === 'location') {
        originalCityName = getOriginalCityName(value)
        if (originalCityName.length > 0) {
          value = `${value} location:${originalCityName[0]['original']}`;
        }
      }
      json[name] = value || '';
    });

    return json;
  }

  function startScraping(e){
    var el_id;
    if (e.target.id) {
      el_id = e.target.id;
    } else {
      el_id = e.target.parentElement.id;
    }

    if (scraping) {
      return;
    } else {
      scraping = true;
    }

    //chrome.runtime.sendMessage({type: "start_scraping"});
    chrome.tabs.executeScript(null, {file: "jquery.min.js"});
    if (el_id == 'scrape-github') {
      chrome.tabs.executeScript(null, {file: "GitHubScraper.js"});
    } else if (el_id == 'scrape-behance') {
      chrome.tabs.executeScript(null, {file: "BehanceScraper.js"});
      var data = {
        current_page: 1,
        total_pages: 1,
      }
      updateProgressIndicator(data, '#scrape-behance');
    }

    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        if (request.type == 'scraped_profiles_github') {
          saveGitHubProfileBatch(request);
        } else if (request.type == 'scraped_profiles_behance') {
          saveBehanceProfiles(request);
        }
        return;
      });
  }

  function saveBehanceProfiles(data) {
    profiles = data.profiles;
    processAndShowBehanceResults();
  }

  function saveGitHubProfileBatch(data) {
      profiles[data.current_page] = data.profiles;
      updateProgressIndicator(data, '#scrape-github');
      if (data.current_page == data.total_pages) {
        processAndShowGitHubResults();
        return;
      }
      changeUrl(data.next_page_URL);
      window.setTimeout(injectContentScripts,3000);
  }

  function initProgressIndicator(total_pages, button_id) {
    progress = {
      current_page: 1,
      total_pages: total_pages,
      button: $(button_id),
      text: $(button_id + ' .btn-text')
    }
    progress.button.addClass('spinner--active');
  }

  function updateProgressIndicator(data, button_id) {
    if(typeof(progress) == "undefined") {
      initProgressIndicator(data.total_pages, button_id);
    }
    progress.current_page = data.current_page;
    progress.total_pages = data.total_pages;
    var text = progress.current_page + " pages out of " + progress.total_pages;
    progress.text.text(text);
  }

  function removeProgressIndicator(text) {
    progress.text.text(text);
    progress.button.removeClass('spinner--active');
  }

  function generateDownloadLink(data) {
    var MIME_TYPE = 'text/plain';

    window.URL = window.webkitURL || window.URL;

    var data_blob = new Blob([data], {type: MIME_TYPE});

    var a = progress.button[0];

    a.download = 'sitbot_results.csv';
    a.href = window.URL.createObjectURL(data_blob);

    removeProgressIndicator('Download Results');
    a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(':');
    a.draggable = true; // Don't really need, but good practice.
  }

  function processAndShowBehanceResults() {
    var data = "";
    var keys = ['url', 'first_name', 'last_name', 'location','stats'];
    for (index in profiles) {
      profile = profiles[index];
      data += JSONToCSV(keys, profile);
    }
    generateDownloadLink(data);
  }

  function processAndShowGitHubResults() {
    var keys = ['name', 'description', 'email', 'url', 'location'];
    var data = keys + '\n';

    for (page_no in profiles) {
      profiles[page_no].map(function(profile) {
        data += JSONToCSV(keys, profile);
      });
    }
    generateDownloadLink(data);
  }

  function JSONToCSV(keys, object) {
    var output = "";

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = object[key].replace(/\,/g,"");

      if (output != '') output += ','
      output += value
    }

    output += '\n';
    return output;
  }


  function injectContentScripts() {
      chrome.tabs.executeScript(null, {file: "jquery.min.js"});
      chrome.tabs.executeScript(null, {file: "GitHubScraper.js"});
  }

  function getOriginalCityName(cityNameInEnglish) {
    return TRANSLATIONS["translations"].filter(obj => {
      return obj["translation"] === cityNameInEnglish.toLowerCase();
    })
  }

  return {
    init: function() {
      $('#github-form').submit(githubSearch);
      $('#scrape-github').click(startScraping);
      $('#scrape-behance').click(startScraping);
    }
  }
});

SitbotExtension = SITBOT_EXTENSION();
document.addEventListener('DOMContentLoaded', function() {
  SitbotExtension.init();
});


//// CITIES ORIGINAL NAMES AND ENGLISH TRANSLATIONS
let TRANSLATIONS = {
  "translations": [
    {
      "original": "tiranë",
      "translation": "tirana"
    },
    {
      "original": "al-jazā'ir (الجزاٮُر)",
      "translation": "algiers"
    },
    {
      "original": "erevan (երևան or երեւան)",
      "translation": "yerevan"
    },
    {
      "original": "uluru",
      "translation": "ayers rock"
    },
    {
      "original": "parramatta",
      "translation": "rose hill"
    },
    {
      "original": "austria",
      "translation": "österreich"
    },
    {
      "original": "allgäuer alpen",
      "translation": "allgäu alps"
    },
    {
      "original": "alpen",
      "translation": "(the) alps"
    },
    {
      "original": "ammergebirge",
      "translation": "ammergau alps"
    },
    {
      "original": "bayerische voralpen",
      "translation": "bavarian prealps"
    },
    {
      "original": "berchtesgadener alpen",
      "translation": "berchtesgaden alps"
    },
    {
      "original": "bodensee",
      "translation": "lake constance"
    },
    {
      "original": "böhmische masse or böhmisches massiv",
      "translation": "bohemian massif"
    },
    {
      "original": "brennerpass",
      "translation": "brenner pass"
    },
    {
      "original": "chiemgauer alpen",
      "translation": "chiemgau alps"
    },
    {
      "original": "donau",
      "translation": "(the) danube"
    },
    {
      "original": "drau",
      "translation": "river drava or drave"
    },
    {
      "original": "große ungarische tiefebene",
      "translation": "great hungarian plain"
    },
    {
      "original": "kärnten",
      "translation": "carinthia>"
    },
    {
      "original": "neusiedler see",
      "translation": "lake neusiedl"
    },
    {
      "original": "niederösterreich",
      "translation": "lower austria"
    },
    {
      "original": "nördliche kalkalpen",
      "translation": "northern limestone alps"
    },
    {
      "original": "oberösterreich",
      "translation": "upper austria"
    },
    {
      "original": "pannonische tiefebene, pannonisches becken or karpatenbecken",
      "translation": "pannonian basin or carpathian basin"
    },
    {
      "original": "rätische alpen",
      "translation": "rhaetian alps"
    },
    {
      "original": "steiermark",
      "translation": "styria"
    },
    {
      "original": "südliche kalkalpen",
      "translation": "southern limestone alps"
    },
    {
      "original": "tannheimer berge",
      "translation": "tannheim mountains"
    },
    {
      "original": "wien",
      "translation": "vienna"
    },
    {
      "original": "tirol",
      "translation": "(the) tyrol"
    },
    {
      "original": "wettersteingebirge",
      "translation": "wetterstein (mountains)"
    },
    {
      "original": "azerbaijan",
      "translation": "azərbaycan"
    },
    {
      "original": "bakı",
      "translation": "baku"
    },
    {
      "original": "qafqaz",
      "translation": "caucasus"
    },
    {
      "original": "belgium",
      "translation": "belgië / belgique"
    },
    {
      "original": "antwerpen/anvers",
      "translation": "antwerp"
    },
    {
      "original": "brugge/bruges",
      "translation": "bruges*"
    },
    {
      "original": "brussel/bruxelles",
      "translation": "brussels"
    },
    {
      "original": "gent/gand",
      "translation": "ghent; also gaunt"
    },
    {
      "original": "ieper/ypres",
      "translation": "ypres*"
    },
    {
      "original": "kortrijk/courtrai",
      "translation": "courtrai* or courtray"
    },
    {
      "original": "leuven/louvain",
      "translation": "louvain*"
    },
    {
      "original": "mechelen/malines",
      "translation": "mechlin"
    },
    {
      "original": "oostende/ostende",
      "translation": "ostend"
    },
    {
      "original": "vilvoorde/vilvorde",
      "translation": "filford"
    },
    {
      "original": "vlaanderen/flandres",
      "translation": "flanders"
    },
    {
      "original": "wallonië/wallonie",
      "translation": "wallonia"
    },
    {
      "original": "brussels hoofdstedelijk gewest/région de bruxelles-capitale",
      "translation": "brussels-capital region"
    },
    {
      "original": "bosna i hercegovina",
      "translation": "bosnia & herzegovina"
    },
    {
      "original": "bosna (босна)",
      "translation": "bosnia"
    },
    {
      "original": "hercegovina (херцеговина)",
      "translation": "herzegovina"
    },
    {
      "original": "bulgaria",
      "translation": "българия (balgariya)"
    },
    {
      "original": "dobrudzha (добруджа)",
      "translation": "southern dobruja"
    },
    {
      "original": "dunav (дунав)",
      "translation": "danube"
    },
    {
      "original": "plovdiv (пловдив)",
      "translation": "philippopolis"
    },
    {
      "original": "rodopi (родопи)",
      "translation": "rhodopes"
    },
    {
      "original": "sofiya (софия)",
      "translation": "sofia"
    },
    {
      "original": "stara planina (стара планина)",
      "translation": "balkan mountains"
    },
    {
      "original": "trakiya (тракия)",
      "translation": "thrace"
    },
    {
      "original": "deline, nt",
      "translation": "fort franklin (archaic)"
    },
    {
      "original": "deux-montagnes, qc",
      "translation": "two mountains (archaic)"
    },
    {
      "original": "eabametoong, on",
      "translation": "fort hope"
    },
    {
      "original": "haida gwaii, bc",
      "translation": "queen charlotte islands (now unofficial)"
    },
    {
      "original": "igluligaarjuk, nu",
      "translation": "chesterfield inlet"
    },
    {
      "original": "iqaluit, nu",
      "translation": "frobisher bay (archaic)"
    },
    {
      "original": "iqaluktuuttiaq, nu",
      "translation": "cambridge bay"
    },
    {
      "original": "kangiqiniq, nu",
      "translation": "rankin inlet"
    },
    {
      "original": "kitchenuhmaykoosib, on",
      "translation": "big trout lake"
    },
    {
      "original": "montréal-nord, qc",
      "translation": "montreal north"
    },
    {
      "original": "mont-royal, qc",
      "translation": "mount royal"
    },
    {
      "original": "neskantaga, on",
      "translation": "lansdowne house"
    },
    {
      "original": "nibinamik, on",
      "translation": "summer beaver"
    },
    {
      "original": "québec, qc",
      "translation": "quebec city"
    },
    {
      "original": "rivière-du-loup, qc",
      "translation": "fraserville (archaic)"
    },
    {
      "original": "saint-andré-d'argenteuil, qc",
      "translation": "saint andrews (archaic)"
    },
    {
      "original": "saint-jean-sur-richelieu, qc",
      "translation": "saint john (archaic)"
    },
    {
      "original": "tikirarjuaq, nu",
      "translation": "whale cove"
    },
    {
      "original": "trois-rivières, qc",
      "translation": "three rivers (archaic)"
    },
    {
      "original": "tsiigehtchic, nt",
      "translation": "arctic red river (archaic)"
    },
    {
      "original": "tulita, nt",
      "translation": "fort norman (archaic)"
    },
    {
      "original": "ulukhaktok, nt",
      "translation": "holman (archaic)"
    },
    {
      "original": "uqsuqtuuq, nu",
      "translation": "gjoa haven"
    },
    {
      "original": "cape verde",
      "translation": "cabo verde"
    },
    {
      "original": "نجامينا (nijāmīnā) / ndjamena",
      "translation": "n'djamena"
    },
    {
      "original": "rapa nui / isla de pascua",
      "translation": "easter island"
    },
    {
      "original": "beijing",
      "translation": "peking"
    },
    {
      "original": "guangzhou",
      "translation": "canton"
    },
    {
      "original": "nanjing",
      "translation": "nanking"
    },
    {
      "original": "xiamen",
      "translation": "amoy"
    },
    {
      "original": "chongqing",
      "translation": "chungking"
    },
    {
      "original": "shantou",
      "translation": "swatow"
    },
    {
      "original": "fuzhou",
      "translation": "foochow"
    },
    {
      "original": "shenyang",
      "translation": "mukden or mookden"
    },
    {
      "original": "zhangjiakou",
      "translation": "kalgan"
    },
    {
      "original": "lüshun",
      "translation": "port arthur"
    },
    {
      "original": "chang jiang",
      "translation": "yangtze river"
    },
    {
      "original": "cantonese hoeng gong",
      "translation": "hong kong"
    },
    {
      "original": "cantonese ou mun",
      "translation": "macau"
    },
    {
      "original": "northeast china / dongbei",
      "translation": "manchuria[14]"
    },
    {
      "original": "croatia",
      "translation": "hrvatska"
    },
    {
      "original": "dalmacija",
      "translation": "dalmatia"
    },
    {
      "original": "dubrovnik",
      "translation": "ragusa (historic)"
    },
    {
      "original": "dunav",
      "translation": "danube"
    },
    {
      "original": "istra",
      "translation": "istria"
    },
    {
      "original": "slavonija",
      "translation": "slavonia"
    },
    {
      "original": "zadar",
      "translation": "zara (historic)"
    },
    {
      "original": "habana",
      "translation": "havana"
    },
    {
      "original": "cyprus",
      "translation": "κύπρος (kýpros) / kıbrıs"
    },
    {
      "original": "ammochostos/gazimağusa",
      "translation": "famagusta"
    },
    {
      "original": "keryneia/girne",
      "translation": "kyrenia"
    },
    {
      "original": "lemesos/limasol",
      "translation": "limassol"
    },
    {
      "original": "lefkosía/lefkoşa",
      "translation": "nicosia"
    },
    {
      "original": "česká republika (česko)",
      "translation": "czech republic"
    },
    {
      "original": "beskydy",
      "translation": "beskids"
    },
    {
      "original": "čechy",
      "translation": "bohemia (refers to only the western half of the modern czech republic)"
    },
    {
      "original": "české budějovice",
      "translation": "budweis*"
    },
    {
      "original": "české švýcarsko ",
      "translation": "bohemian switzerland"
    },
    {
      "original": "česko",
      "translation": "czechia (recent coinage in english for bohemia plus moravia and czech silesia)"
    },
    {
      "original": "český kras",
      "translation": "bohemian karst"
    },
    {
      "original": "český les",
      "translation": "upper palatine forest"
    },
    {
      "original": "český ráj",
      "translation": "bohemian paradise"
    },
    {
      "original": "františkovy lázně",
      "translation": "franzensbad*"
    },
    {
      "original": "haná",
      "translation": "hanakia"
    },
    {
      "original": "karlovy vary",
      "translation": "carlsbad"
    },
    {
      "original": "krkonoše",
      "translation": "giant mountains"
    },
    {
      "original": "krušné hory",
      "translation": "ore mountains"
    },
    {
      "original": "labe",
      "translation": "elbe*"
    },
    {
      "original": "lašsko",
      "translation": "lachia"
    },
    {
      "original": "mariánské lázně",
      "translation": "marienbad*"
    },
    {
      "original": "morava",
      "translation": "moravia"
    },
    {
      "original": "odra",
      "translation": "oder*"
    },
    {
      "original": "plzeň",
      "translation": "pilsen*"
    },
    {
      "original": "praha",
      "translation": "prague"
    },
    {
      "original": "slezsko",
      "translation": "silesia (also used for the polish part of silesia)"
    },
    {
      "original": "slovácko",
      "translation": "moravian slovakia"
    },
    {
      "original": "smrčiny",
      "translation": "fichtel mountains*"
    },
    {
      "original": "sudety",
      "translation": "sudeten* or sudetes"
    },
    {
      "original": "sudety",
      "translation": "sudetenland*"
    },
    {
      "original": "šumava",
      "translation": "bohemian forest"
    },
    {
      "original": "valašsko",
      "translation": "moravian wallachia"
    },
    {
      "original": "denmark",
      "translation": "danmark"
    },
    {
      "original": "fyn",
      "translation": "funen"
    },
    {
      "original": "helsingør",
      "translation": "elsinore"
    },
    {
      "original": "jylland",
      "translation": "jutland"
    },
    {
      "original": "københavn",
      "translation": "copenhagen"
    },
    {
      "original": "sjælland",
      "translation": "zealand"
    },
    {
      "original": "skagen",
      "translation": "the scaw"
    },
    {
      "original": "slesvig",
      "translation": "sleswick, schleswig (matches german)"
    },
    {
      "original": "faroe islands",
      "translation": "føroyar / færøerne"
    },
    {
      "original": "kangerlussuaq",
      "translation": "kalaallit nunaat"
    },
    {
      "original": "ilulissat",
      "translation": "jacobshaven"
    },
    {
      "original": "nuuk",
      "translation": "godthab"
    },
    {
      "original": "paamiut",
      "translation": "frederikshab"
    },
    {
      "original": "qaanaaq",
      "translation": "thule"
    },
    {
      "original": "būr sā'id (بور سعݐد)",
      "translation": "port said"
    },
    {
      "original": "al-ğīzah (الجݐزة)",
      "translation": "giza"
    },
    {
      "original": "al-iskandariyya (الإسکندرݐة)",
      "translation": "alexandria"
    },
    {
      "original": "an-nīl (النݐل)",
      "translation": "nile"
    },
    {
      "original": "al-qāhira (القاهرة)",
      "translation": "cairo"
    },
    {
      "original": "as-suways (السوݐس)",
      "translation": "suez"
    },
    {
      "original": "al-uqşur (الاقصر)",
      "translation": "luxor"
    },
    {
      "original": "estonia",
      "translation": "eesti"
    },
    {
      "original": "peipsi järv",
      "translation": "lake peipus"
    },
    {
      "original": "finland",
      "translation": "suomi"
    },
    {
      "original": "häme / tavastland",
      "translation": "tavastia"
    },
    {
      "original": "karjala / karelen",
      "translation": "karelia"
    },
    {
      "original": "lappi / lappland",
      "translation": "lapland (finland), also laponia or lapponia"
    },
    {
      "original": "pohjanmaa / österbotten",
      "translation": "ostrobothnia"
    },
    {
      "original": "savo / savolax",
      "translation": "savonia"
    },
    {
      "original": "varsinais-suomi / egentliga finland",
      "translation": "finland proper"
    },
    {
      "original": "alpes",
      "translation": "alps"
    },
    {
      "original": "bretagne/breizh",
      "translation": "brittany"
    },
    {
      "original": "bourgogne",
      "translation": "burgundy"
    },
    {
      "original": "calais",
      "translation": "kælɨs"
    },
    {
      "original": "corse",
      "translation": "corsica, english uses local corsican and italian name"
    },
    {
      "original": "côte d'azur",
      "translation": "the french riviera"
    },
    {
      "original": "crécy-en-ponthieu",
      "translation": "cressy"
    },
    {
      "original": "dunkerque",
      "translation": "dunkirk"
    },
    {
      "original": "flandre",
      "translation": "flanders"
    },
    {
      "original": "gascogne",
      "translation": "gascony"
    },
    {
      "original": "golfe de gascogne",
      "translation": "bay of biscay"
    },
    {
      "original": "lyon",
      "translation": "lyons (archaic)"
    },
    {
      "original": "la manche",
      "translation": "the english channel"
    },
    {
      "original": "marseille",
      "translation": "marseilles"
    },
    {
      "original": "normandie",
      "translation": "normandy"
    },
    {
      "original": "ouessant",
      "translation": "island of ushant, also ouessant"
    },
    {
      "original": "picardie",
      "translation": "picardy"
    },
    {
      "original": "pyrénées",
      "translation": "pyrenees"
    },
    {
      "original": "reims",
      "translation": "rheims (archaic)"
    },
    {
      "original": "rhin",
      "translation": "rhine"
    },
    {
      "original": "savoie",
      "translation": "savoy"
    },
    {
      "original": "kavkasioni (კავკასიონი)",
      "translation": "caucasus"
    },
    {
      "original": "tbilisi (თბილისი)",
      "translation": "tiflis"
    },
    {
      "original": "germany",
      "translation": "deutschland"
    },
    {
      "original": "aachen",
      "translation": "aix-la-chapelle[16]"
    },
    {
      "original": "alpen",
      "translation": "(the) alps"
    },
    {
      "original": "bayerischer wald",
      "translation": "(the) bavarian forest"
    },
    {
      "original": "bayern",
      "translation": "bavaria"
    },
    {
      "original": "beetzsee-riewendsee-wasserstraße",
      "translation": "beetzsee-riewendsee waterway"
    },
    {
      "original": "berchtesgadener alpen",
      "translation": "berchtesgaden alps"
    },
    {
      "original": "bodensee",
      "translation": "lake constance"
    },
    {
      "original": "braunschweig",
      "translation": "brunswick[16]"
    },
    {
      "original": "calenberger bergland",
      "translation": "calenberg uplands"
    },
    {
      "original": "chiemgauer alpen",
      "translation": "chiemgau alps"
    },
    {
      "original": "chiemsee",
      "translation": "lake chiem"
    },
    {
      "original": "deutsche bucht",
      "translation": "german bay"
    },
    {
      "original": "donau",
      "translation": "(the) danube"
    },
    {
      "original": "eggegebirge",
      "translation": "egge hills"
    },
    {
      "original": "erzgebirge",
      "translation": "ore mountains"
    },
    {
      "original": "fichtelgebirge",
      "translation": "fichtel mountains"
    },
    {
      "original": "flensburger förde",
      "translation": "flensburg firth"
    },
    {
      "original": "franken",
      "translation": "franconia"
    },
    {
      "original": "frankenalb or frankenjura",
      "translation": "franconian jura"
    },
    {
      "original": "frankenwald",
      "translation": "franconian forest"
    },
    {
      "original": "frankfurt am main",
      "translation": "frankfort"
    },
    {
      "original": "fränkische schweiz",
      "translation": "franconian switzerland"
    },
    {
      "original": "friesische inseln",
      "translation": "(the) frisian islands"
    },
    {
      "original": "greifswalder bodden",
      "translation": "greifswald bodden or bay of greifswald"
    },
    {
      "original": "hameln",
      "translation": "hamelin"
    },
    {
      "original": "hannover",
      "translation": "hanover"
    },
    {
      "original": "harz",
      "translation": "(the) harz mountains"
    },
    {
      "original": "haßberge",
      "translation": "haßberge hills"
    },
    {
      "original": "helgoland",
      "translation": "heligoland"
    },
    {
      "original": "helgoländer bucht",
      "translation": "heligoland bight or helgoland bight"
    },
    {
      "original": "hessen",
      "translation": "hesse or hessia"
    },
    {
      "original": "hocheifel",
      "translation": "high eifel"
    },
    {
      "original": "hochrhein",
      "translation": "high rhine"
    },
    {
      "original": "holsteinische schweiz",
      "translation": "(the) holstein switzerland"
    },
    {
      "original": "hohwachter bucht",
      "translation": "hohwacht bay"
    },
    {
      "original": "jadebusen",
      "translation": "(the) jade bay"
    },
    {
      "original": "kaufunger wald",
      "translation": "kaufungen forest"
    },
    {
      "original": "koblenz",
      "translation": "coblenz, coblence"
    },
    {
      "original": "kieler bucht",
      "translation": "bay of kiel"
    },
    {
      "original": "kleve",
      "translation": "cleves"
    },
    {
      "original": "knüllgebirge",
      "translation": "knüll or knüllgebirge"
    },
    {
      "original": "köln",
      "translation": "cologne"
    },
    {
      "original": "konstanz",
      "translation": "constance"
    },
    {
      "original": "lausitz/łužica/łužyca",
      "translation": "lusatia"
    },
    {
      "original": "leinebergland",
      "translation": "leine uplands"
    },
    {
      "original": "leipziger tieflandsbucht",
      "translation": "leipzig bay or leipzig basin"
    },
    {
      "original": "lübecker bucht",
      "translation": "bay of lübeck"
    },
    {
      "original": "lüneburg",
      "translation": "lunenburg"
    },
    {
      "original": "lüneburger heide",
      "translation": "(the) lüneburg heath"
    },
    {
      "original": "mecklenburger bucht",
      "translation": "(the) bay of mecklenburg"
    },
    {
      "original": "meldorfer bucht",
      "translation": "bay of meldorf"
    },
    {
      "original": "mitteldeutschland",
      "translation": "middle germany"
    },
    {
      "original": "mittellandkanal",
      "translation": "(the) mittelland canal"
    },
    {
      "original": "mittelrhein",
      "translation": "(the) middle rhine"
    },
    {
      "original": "mosel",
      "translation": "mosella"
    },
    {
      "original": "münchen",
      "translation": "munich"
    },
    {
      "original": "niederbayern",
      "translation": "lower bavaria"
    },
    {
      "original": "niederbayerisches hügelland",
      "translation": "lower bavarian upland"
    },
    {
      "original": "niederlausitz",
      "translation": "lower lusatia"
    },
    {
      "original": "niedersachsen",
      "translation": "lower saxony"
    },
    {
      "original": "niederschlesien",
      "translation": "lower silesia"
    },
    {
      "original": "nordbaden",
      "translation": "north baden"
    },
    {
      "original": "norddeutschland",
      "translation": "north(ern) germany"
    },
    {
      "original": "norddeutsche tiefebene or norddeutsche tiefland",
      "translation": "north german plain or northern lowland"
    },
    {
      "original": "nordeifel",
      "translation": "north eifel"
    },
    {
      "original": "nordfriesische inseln",
      "translation": "(the) north frisian islands"
    },
    {
      "original": "nordfriesland",
      "translation": "north frisia or northern friesland"
    },
    {
      "original": "nordostseekanal",
      "translation": "(the) kiel canal"
    },
    {
      "original": "nordpfälzer bergland",
      "translation": "north palatine uplands"
    },
    {
      "original": "nordrhein-westfalen",
      "translation": "north rhine-westphalia"
    },
    {
      "original": "nürnberg",
      "translation": "nuremberg"
    },
    {
      "original": "oberbayern",
      "translation": "upper bavaria"
    },
    {
      "original": "oberhessen",
      "translation": "upper hesse"
    },
    {
      "original": "oberpfalz",
      "translation": "upper palatinate"
    },
    {
      "original": "oberrheinische tiefebene",
      "translation": "(the) upper rhine plain"
    },
    {
      "original": "oberschlesien",
      "translation": "upper silesia"
    },
    {
      "original": "oldenburger münsterland",
      "translation": "oldenburg münsterland"
    },
    {
      "original": "ost-berlin",
      "translation": "east berlin"
    },
    {
      "original": "ostdeutschland",
      "translation": "east germany"
    },
    {
      "original": "ostfriesische inseln",
      "translation": "(the) east frisians"
    },
    {
      "original": "ostfriesland",
      "translation": "east friesland or east frisia"
    },
    {
      "original": "ostpommern",
      "translation": "eastern pomerania"
    },
    {
      "original": "ostpreußen",
      "translation": "east prussia"
    },
    {
      "original": "ostsee",
      "translation": "(the) baltic sea"
    },
    {
      "original": "pareyer-verbindungskanal",
      "translation": "parey junction canal"
    },
    {
      "original": "partnachklamm",
      "translation": "partnach gorge"
    },
    {
      "original": "pfalz",
      "translation": "(the) palatinate"
    },
    {
      "original": "pfälzerwald",
      "translation": "(the) palatinate forest or palatine forest"
    },
    {
      "original": "pommern",
      "translation": "pomerania"
    },
    {
      "original": "pommersche bucht",
      "translation": "(the) bay of pomerania"
    },
    {
      "original": "preußen",
      "translation": "prussia"
    },
    {
      "original": "regensburg",
      "translation": "ratisbon"
    },
    {
      "original": "rhein",
      "translation": "rhine"
    },
    {
      "original": "rheingau",
      "translation": "(the) rhinegau"
    },
    {
      "original": "rheinhessen",
      "translation": "rhinehessen or rhenish hesse"
    },
    {
      "original": "rheinisches schiefergebirge",
      "translation": "(the) rhenish slate mountains"
    },
    {
      "original": "rheinland",
      "translation": "(the) rhineland"
    },
    {
      "original": "rheinland-pfalz",
      "translation": "rhineland-palatinate"
    },
    {
      "original": "rhein-main-donau-kanal",
      "translation": "rhine-main-danube canal"
    },
    {
      "original": "ruhrgebiet",
      "translation": "(the) ruhr (district)"
    },
    {
      "original": "sachsen-anhalt",
      "translation": "saxony-anhalt"
    },
    {
      "original": "sachsen-coburg und gotha",
      "translation": "saxe-coburg-gotha"
    },
    {
      "original": "sächsische schweiz",
      "translation": "saxon switzerland"
    },
    {
      "original": "sachsen",
      "translation": "saxony"
    },
    {
      "original": "sächsische schweiz ",
      "translation": "saxon switzerland"
    },
    {
      "original": "schwaben",
      "translation": "swabia"
    },
    {
      "original": "schwarzwald",
      "translation": "black forest"
    },
    {
      "original": "starnberger see",
      "translation": "lake starnberg"
    },
    {
      "original": "stettiner haff",
      "translation": "bay of szczecin"
    },
    {
      "original": "südwürttemberg-hohenzollern",
      "translation": "south württemberg-hohenzollern"
    },
    {
      "original": "teutoburger wald",
      "translation": "(the) teutoburg forest"
    },
    {
      "original": "thüringen",
      "translation": "thuringia"
    },
    {
      "original": "thüringer becken",
      "translation": "(the) thuringian basin"
    },
    {
      "original": "thüringerwald",
      "translation": "thuringian forest"
    },
    {
      "original": "trier",
      "translation": "treves"
    },
    {
      "original": "unterfranken",
      "translation": "lower franconia"
    },
    {
      "original": "vorpommern",
      "translation": "western pomerania or hither pomerania"
    },
    {
      "original": "weserbergland",
      "translation": "(the) weser uplands,[18] (the) weser mountains[19]"
    },
    {
      "original": "west-berlin",
      "translation": "west berlin"
    },
    {
      "original": "westdeutschland",
      "translation": "west germany"
    },
    {
      "original": "westfälische pforte",
      "translation": "(the) porta westfalica or westphalian gate"
    },
    {
      "original": "westfalen",
      "translation": "westphalia"
    },
    {
      "original": "westpreußen",
      "translation": "west prussia"
    },
    {
      "original": "wismarbucht",
      "translation": "bay of wismar"
    },
    {
      "original": "athina (αθήνα)",
      "translation": "athens"
    },
    {
      "original": "attiki (αττική)",
      "translation": "attica"
    },
    {
      "original": "dhodhekanisa (δωδεκάνησα)",
      "translation": "dodecanese"
    },
    {
      "original": "evvia (εύβοια)",
      "translation": "euboea"
    },
    {
      "original": "ikaria (ικαρία)",
      "translation": "icaria"
    },
    {
      "original": "ionia nisia (ιόνια νησιά)",
      "translation": "ionian islands"
    },
    {
      "original": "ipeiros (ήπειρος)",
      "translation": "epirus"
    },
    {
      "original": "irakleio (ηράκλειο)",
      "translation": "heraklion or iraklion"
    },
    {
      "original": "kríti (κρήτη)",
      "translation": "crete"
    },
    {
      "original": "kerkyra (κέρκυρα)",
      "translation": "corfu"
    },
    {
      "original": "korinthos (κόρινθος)",
      "translation": "corinth"
    },
    {
      "original": "kykladhes (κυκλάδες)",
      "translation": "cyclades"
    },
    {
      "original": "makedonía (μακεδονία)",
      "translation": "macedonia"
    },
    {
      "original": "mesologgi (μεσολόγγι)",
      "translation": "missolonghi"
    },
    {
      "original": "nafpaktos (νάυπακτος)",
      "translation": "naupactus or, historically, lepanto"
    },
    {
      "original": "patrai (πάτρα)",
      "translation": "patras"
    },
    {
      "original": "peiraeas (πειραιάς)",
      "translation": "piraeus"
    },
    {
      "original": "peloponnisos (πελοπόννησος)",
      "translation": "peloponnese"
    },
    {
      "original": "pylos (πύλος)",
      "translation": "navarino"
    },
    {
      "original": "rodhopi (ροδόπη)",
      "translation": "rhodopes"
    },
    {
      "original": "rodos (ρόδος)",
      "translation": "rhodes"
    },
    {
      "original": "samothraki (σαμοθράκη)",
      "translation": "samothrace"
    },
    {
      "original": "thessalia (θεσσαλία)",
      "translation": "thessaly"
    },
    {
      "original": "thessaloniki (θεσσαλονίκη)",
      "translation": "thessalonica or, historically, salonica"
    },
    {
      "original": "thiva (θήβα)",
      "translation": "thebes"
    },
    {
      "original": "thraki (θράκη)",
      "translation": "thrace"
    },
    {
      "original": "viotía (βοιωτία)",
      "translation": "boeotia"
    },
    {
      "original": "zakynthos (ζάκυνθος)",
      "translation": "zakynthos or zante"
    },
    {
      "original": "duna",
      "translation": "danube"
    },
    {
      "original": "kárpátok",
      "translation": "carpathians"
    },
    {
      "original": "vestmannaeyjar",
      "translation": "westman islands"
    },
    {
      "original": "भारत (bhārat)"
    },
    {
      "original": "bengaluru in kannada language",
      "translation": "still bangalore in english"
    },
    {
      "original": "chennai in tamil language and now english",
      "translation": "traditionally madras"
    },
    {
      "original": "jaipur",
      "translation": "jaypore"
    },
    {
      "original": "kanpur",
      "translation": "cawnpore"
    },
    {
      "original": "kolkata in bengali language",
      "translation": "traditionally calcutta"
    },
    {
      "original": "lakshadweep",
      "translation": "the laccadive islands"
    },
    {
      "original": "mumbai in marathi language and now english",
      "translation": "traditionally bombay"
    },
    {
      "original": "pune",
      "translation": "poona"
    },
    {
      "original": "shimla",
      "translation": "simla"
    },
    {
      "original": "varanasi",
      "translation": "benares"
    },
    {
      "original": "iran",
      "translation": "اݐران (iran)"
    },
    {
      "original": "bushehr (بوشهر)",
      "translation": "bushire"
    },
    {
      "original": "eşfahān (اصفهان)",
      "translation": "isfahan"
    },
    {
      "original": "mashhad (مشهد)",
      "translation": "meshed"
    },
    {
      "original": "tehran (تهران)",
      "translation": "teheran"
    },
    {
      "original": "iraq",
      "translation": "العراق (al-irāq)"
    },
    {
      "original": "dijla (دجله)",
      "translation": "tigris"
    },
    {
      "original": "al-furāt (الفرات)",
      "translation": "euphrates"
    },
    {
      "original": "al-mawşil (الموصل)",
      "translation": "mosul"
    },
    {
      "original": "ireland",
      "translation": "éire"
    },
    {
      "original": "akko (עַכּוֹ)",
      "translation": "acre"
    },
    {
      "original": "be'er sheva (בְּאֵר שֶׁבַע)",
      "translation": "beersheba"
    },
    {
      "original": "ha-galil (הַגָּלִיל)",
      "translation": "galilee (from latin)"
    },
    {
      "original": "kfar nahum (כְּפַר נֵחוּם)",
      "translation": "capernaum (from latin)"
    },
    {
      "original": "natzrat (נָצְרַת)",
      "translation": "nazareth (from greek)"
    },
    {
      "original": "tzfat (צְפַת)",
      "translation": "safed (from arabic)"
    },
    {
      "original": "tverya (טְבֶריָה)",
      "translation": "tiberias (from latin)"
    },
    {
      "original": "yafo (יָפוֹ)",
      "translation": "jaffa (from arabic)"
    },
    {
      "original": "yerushalayim (יְרוּשָׁלַיִם)",
      "translation": "jerusalem (from latin)"
    },
    {
      "original": "ariha (أريحا)",
      "translation": "jericho"
    },
    {
      "original": "bayt lehm (بيت لحم)",
      "translation": "bethlehem"
    },
    {
      "original": "al-ḫalīl (الخليل)",
      "translation": "hebron"
    },
    {
      "original": "al-quds (القُدس)",
      "translation": "jerusalem"
    },
    {
      "original": "yahudia (يهودا)",
      "translation": "judea"
    },
    {
      "original": "valle d'aosta",
      "translation": "aosta valley"
    },
    {
      "original": "alpi",
      "translation": "alps"
    },
    {
      "original": "appennini",
      "translation": "apennine mountains"
    },
    {
      "original": "puglia",
      "translation": "apulia"
    },
    {
      "original": "campidoglio",
      "translation": "capitoline hill"
    },
    {
      "original": "dolomiti",
      "translation": "dolomites"
    },
    {
      "original": "ercolano (present day)",
      "translation": "herculaneum (ancient city)"
    },
    {
      "original": "firenze",
      "translation": "florence"
    },
    {
      "original": "genova",
      "translation": "genoa"
    },
    {
      "original": "gianicolo",
      "translation": "janiculum"
    },
    {
      "original": "lazio",
      "translation": "latium"
    },
    {
      "original": "livorno",
      "translation": "leghorn"
    },
    {
      "original": "lombardia",
      "translation": "lombardy"
    },
    {
      "original": "mantova",
      "translation": "mantua"
    },
    {
      "original": "marche",
      "translation": "the marches"
    },
    {
      "original": "milano",
      "translation": "milan"
    },
    {
      "original": "monferrato",
      "translation": "montferrat"
    },
    {
      "original": "napoli",
      "translation": "naples"
    },
    {
      "original": "padova",
      "translation": "padua"
    },
    {
      "original": "piemonte",
      "translation": "piedmont"
    },
    {
      "original": "pompei",
      "translation": "pompeii"
    },
    {
      "original": "roma",
      "translation": "rome"
    },
    {
      "original": "rubicone",
      "translation": "rubicon"
    },
    {
      "original": "sardegna",
      "translation": "sardinia"
    },
    {
      "original": "sicilia",
      "translation": "sicily"
    },
    {
      "original": "siena",
      "translation": "sienna"
    },
    {
      "original": "siracusa",
      "translation": "syracuse"
    },
    {
      "original": "tevere",
      "translation": "tiber"
    },
    {
      "original": "torino",
      "translation": "turin"
    },
    {
      "original": "toscana",
      "translation": "tuscany"
    },
    {
      "original": "trento",
      "translation": "trent"
    },
    {
      "original": "tirolo",
      "translation": "tyrol."
    },
    {
      "original": "venezia",
      "translation": "venice"
    },
    {
      "original": "vesuvio",
      "translation": "vesuvius"
    },
    {
      "original": "japan",
      "translation": "日本 (nihon / nippon)"
    },
    {
      "original": "南西諸島 (nansei-shotō) or 琉球諸島 (ryūkyū-shotō)",
      "translation": "ryukyu islands"
    },
    {
      "original": "小笠原群島 (ogasawara guntō)",
      "translation": "bonin islands"
    },
    {
      "original": "火山列島 (kazan rettō)",
      "translation": "volcano islands"
    },
    {
      "original": "竹島 (takeshima)",
      "translation": "liancourt islands"
    },
    {
      "original": "jordan",
      "translation": "الاردن (al-'urdunn)"
    },
    {
      "original": "kŭmgangsan",
      "translation": "diamond mountain"
    },
    {
      "original": "geomundo",
      "translation": "port hamilton"
    },
    {
      "original": "jeju",
      "translation": "quelpart"
    },
    {
      "original": "amnok gang",
      "translation": "yalu river"
    },
    {
      "original": "tuman gang",
      "translation": "tumen river"
    },
    {
      "original": "kosovo",
      "translation": "kosova"
    },
    {
      "original": "latvia",
      "translation": "latvija"
    },
    {
      "original": "kurzeme",
      "translation": "courland"
    },
    {
      "original": "latgale",
      "translation": "lettgallia"
    },
    {
      "original": "rīga",
      "translation": "riga,"
    },
    {
      "original": "zemgale",
      "translation": "semigallia"
    },
    {
      "original": "lebanon",
      "translation": "لبنان (lubnān)"
    },
    {
      "original": "ṣaydā (صيدا)",
      "translation": "sidon"
    },
    {
      "original": "ṣūr (صور)",
      "translation": "tyre"
    },
    {
      "original": "ṭarābulus (طرابلس)",
      "translation": "tripoli, lebanon"
    },
    {
      "original": "libya",
      "translation": "ليبيا (libiyā)"
    },
    {
      "original": "barqah (برقة)",
      "translation": "cyrenaica"
    },
    {
      "original": "fizzān (فزان)",
      "translation": "fezzan"
    },
    {
      "original": "miṣrātah (مصراتة)",
      "translation": "misrata"
    },
    {
      "original": "sirt (سرت)",
      "translation": "sirte"
    },
    {
      "original": "ṭarābulus (طرابلس)",
      "translation": "tripoli, also tripolitania"
    },
    {
      "original": "lithuania",
      "translation": "lietuva"
    },
    {
      "original": "mažoji lietuva",
      "translation": "lithuania minor"
    },
    {
      "original": "nemunas",
      "translation": "neman or niemen"
    },
    {
      "original": "suvalkija",
      "translation": "sudovia"
    },
    {
      "original": "žemaitija",
      "translation": "samogitia"
    },
    {
      "original": "melaka",
      "translation": "malacca"
    },
    {
      "original": "pulau pinang",
      "translation": "penang island"
    },
    {
      "original": "ciudad de méxico",
      "translation": "mexico city"
    },
    {
      "original": "puerto peñasco",
      "translation": "rocky point"
    },
    {
      "original": "chişinău",
      "translation": "kishinev (from russian кишинёв/kishinyov)"
    },
    {
      "original": "mongolia",
      "translation": "монгол улс (mongol uls)"
    },
    {
      "original": "montenegro",
      "translation": "црна гора (crna gora)"
    },
    {
      "original": "morocco",
      "translation": "المغرب (al-maghrib)"
    },
    {
      "original": "ad-dār al-beiḍāʼ (الدار البيضاء)",
      "translation": "casablanca"
    },
    {
      "original": "fās (فاس)",
      "translation": "fez"
    },
    {
      "original": "ṭanjah (طنجة)",
      "translation": "tangier"
    },
    {
      "original": "myanmar/burma",
      "translation": "myanma / bama"
    },
    {
      "original": "yangon",
      "translation": "rangoon"
    },
    {
      "original": "netherlands",
      "translation": "nederland"
    },
    {
      "original": "brielle (also",
      "translation": "brill"
    },
    {
      "original": "den haag (also",
      "translation": "the hague"
    },
    {
      "original": "dordrecht",
      "translation": "dort"
    },
    {
      "original": "gelderland",
      "translation": "guelders"
    },
    {
      "original": "hoek van holland",
      "translation": "hook of holland"
    },
    {
      "original": "leiden",
      "translation": "leyden"
    },
    {
      "original": "maas",
      "translation": "meuse"
    },
    {
      "original": "rijn",
      "translation": "rhine"
    },
    {
      "original": "rijswijk",
      "translation": "ryswick"
    },
    {
      "original": "vlissingen",
      "translation": "old name flushing"
    },
    {
      "original": "new zealand",
      "translation": "aotearoa / new zealand"
    },
    {
      "original": "whanganui",
      "translation": "wanganui"
    },
    {
      "original": "north macedonia",
      "translation": "северна македонија (severna makedonija)"
    },
    {
      "original": "norway",
      "translation": "norge, noreg"
    },
    {
      "original": "nordkapp (norwegian); davvenjárga (northern sami)",
      "translation": "north cape"
    },
    {
      "original": "bjørnøya",
      "translation": "bear island"
    },
    {
      "original": "poland",
      "translation": "polska"
    },
    {
      "original": "beskidy",
      "translation": "beskids"
    },
    {
      "original": "beskidy wschodnie",
      "translation": "eastern beskids"
    },
    {
      "original": "beskidy środkowe",
      "translation": "central beskids"
    },
    {
      "original": "beskidy zachodnie",
      "translation": "western beskids"
    },
    {
      "original": "gdańsk",
      "translation": "danzig (archaic, from german)"
    },
    {
      "original": "galicja",
      "translation": "galicia (eastern europe)"
    },
    {
      "original": "karkonosze",
      "translation": "giant mountains"
    },
    {
      "original": "karpaty",
      "translation": "carpathians"
    },
    {
      "original": "kaszuby/kaszëbë",
      "translation": "kashubia"
    },
    {
      "original": "kraków",
      "translation": "cracow"
    },
    {
      "original": "kujawy",
      "translation": "kuyavia"
    },
    {
      "original": "małopolska",
      "translation": "lesser poland"
    },
    {
      "original": "mazowsze",
      "translation": "mazovia"
    },
    {
      "original": "mazury",
      "translation": "masuria"
    },
    {
      "original": "nizina śląska",
      "translation": "silesian lowlands"
    },
    {
      "original": "odra",
      "translation": "oder, english uses the german name"
    },
    {
      "original": "oświęcim",
      "translation": "auschwitz, english uses the german name"
    },
    {
      "original": "przedgórze sudeckie",
      "translation": "sudeten foreland"
    },
    {
      "original": "pomorze",
      "translation": "pomerania"
    },
    {
      "original": "sudety",
      "translation": "sudeten or sudetes"
    },
    {
      "original": "śląsk",
      "translation": "silesia"
    },
    {
      "original": "dolny śląsk",
      "translation": "lower silesia"
    },
    {
      "original": "górny śląsk",
      "translation": "upper silesia"
    },
    {
      "original": "warmia",
      "translation": "warmia"
    },
    {
      "original": "warszawa",
      "translation": "warsaw"
    },
    {
      "original": "wielkopolska",
      "translation": "greater poland"
    },
    {
      "original": "wisła",
      "translation": "vistula"
    },
    {
      "original": "açores",
      "translation": "azores (from spanish)"
    },
    {
      "original": "bragança",
      "translation": "braganza (from spanish)"
    },
    {
      "original": "lisboa",
      "translation": "lisbon"
    },
    {
      "original": "porto",
      "translation": "oporto (old fashioned)"
    },
    {
      "original": "tejo",
      "translation": "tagus (from latin)"
    },
    {
      "original": "romania",
      "translation": "românia"
    },
    {
      "original": "bucurești",
      "translation": "bucharest"
    },
    {
      "original": "carpați",
      "translation": "carpathians (from latin)"
    },
    {
      "original": "carpați meridionali",
      "translation": "southern carpathians"
    },
    {
      "original": "dobrogea",
      "translation": "northern dobruja, romanian section of former dobruja region"
    },
    {
      "original": "dunărea",
      "translation": "danube"
    },
    {
      "original": "iași",
      "translation": "(used primarily in historical contexts) jassy[21]"
    },
    {
      "original": "transilvania",
      "translation": "transylvania"
    },
    {
      "original": "țara românească / valahia",
      "translation": "wallachia"
    },
    {
      "original": "russia",
      "translation": "россия (rossiya)"
    },
    {
      "original": "arkhangel'sk (архангельск)",
      "translation": "archangel"
    },
    {
      "original": "kavkaz (кавказ)",
      "translation": "caucasus"
    },
    {
      "original": "komsomol'sk-na-amure (комсомольск-на-амуре)",
      "translation": "komsomolsk-on-amur"
    },
    {
      "original": "moskva (москва)",
      "translation": "moscow"
    },
    {
      "original": "oryol (орёл)",
      "translation": "orel"
    },
    {
      "original": "pskov (псков)",
      "translation": "plescow"
    },
    {
      "original": "rostov-na-donu (ростов-на-дону)",
      "translation": "rostov-on-don"
    },
    {
      "original": "sankt-peterburg (санкт-петербург)",
      "translation": "saint petersburg"
    },
    {
      "original": "saudi arabia",
      "translation": "السعودية (as-saʿūdīyah)"
    },
    {
      "original": "jiddah (جدة)",
      "translation": "jeddah"
    },
    {
      "original": "al-madīnah (المدينة)",
      "translation": "medina"
    },
    {
      "original": "makkah (مکة)",
      "translation": "mecca"
    },
    {
      "original": "ar-riyāḍ (الرياض)",
      "translation": "riyadh"
    },
    {
      "original": "serbia",
      "translation": "србија (srbija)"
    },
    {
      "original": "beograd (београд)",
      "translation": "belgrade (from french)"
    },
    {
      "original": "dunav (дунав)",
      "translation": "danube"
    },
    {
      "original": "stara planina (стара планина)",
      "translation": "balkan mountains"
    },
    {
      "original": "slovakia",
      "translation": "slovensko"
    },
    {
      "original": "beskydy",
      "translation": "beskids"
    },
    {
      "original": "biele karpaty",
      "translation": "white carpathians"
    },
    {
      "original": "dunaj",
      "translation": "danube"
    },
    {
      "original": "gerlachovský štít",
      "translation": "gerlach peak"
    },
    {
      "original": "javorníky",
      "translation": "maple mountains"
    },
    {
      "original": "karpaty",
      "translation": "carpathians"
    },
    {
      "original": "košice",
      "translation": "cassow"
    },
    {
      "original": "kysucké beskydy",
      "translation": "kysuce beskids"
    },
    {
      "original": "malá fatra",
      "translation": "little/lesser fatra"
    },
    {
      "original": "malé karpaty",
      "translation": "little/lesser carpathians"
    },
    {
      "original": "nízke beskydy",
      "translation": "low/lower beskids"
    },
    {
      "original": "nízke tatry",
      "translation": "low tatras"
    },
    {
      "original": "oravské beskydy",
      "translation": "orava beskids"
    },
    {
      "original": "podunajská nížina",
      "translation": "danubian lowland"
    },
    {
      "original": "podunajská pahorkatina",
      "translation": "danubian hills"
    },
    {
      "original": "podunajská rovina",
      "translation": "danubian flat"
    },
    {
      "original": "slovenské rudohorie",
      "translation": "slovak ore mountains"
    },
    {
      "original": "slovenské stredohorie",
      "translation": "slovak central mountains"
    },
    {
      "original": "stredné beskydy",
      "translation": "central beskids"
    },
    {
      "original": "veľká fatra",
      "translation": "great/greater fatra"
    },
    {
      "original": "východné beskydy",
      "translation": "eastern beskids"
    },
    {
      "original": "východoslovenská nížina",
      "translation": "eastern slovak lowland"
    },
    {
      "original": "vysoké tatry",
      "translation": "high tatras"
    },
    {
      "original": "slovenia",
      "translation": "slovenija"
    },
    {
      "original": "alpe",
      "translation": "alps"
    },
    {
      "original": "dolenjska",
      "translation": "lower carniola"
    },
    {
      "original": "gorenjska",
      "translation": "upper carniola"
    },
    {
      "original": "karavanke",
      "translation": "karawanks"
    },
    {
      "original": "koroška",
      "translation": "carinthia"
    },
    {
      "original": "kras",
      "translation": "karst"
    },
    {
      "original": "notranjska",
      "translation": "inner carniola"
    },
    {
      "original": "primorska",
      "translation": "slovenian littoral"
    },
    {
      "original": "štajerska",
      "translation": "styria"
    },
    {
      "original": "south africa",
      "translation": "suid-afrika"
    },
    {
      "original": "alexanderbaai",
      "translation": "alexander bay"
    },
    {
      "original": "aliwal-noord",
      "translation": "aliwal north"
    },
    {
      "original": "grahamstad",
      "translation": "grahamstown"
    },
    {
      "original": "kaapstad",
      "translation": "cape town"
    },
    {
      "original": "mooirivier",
      "translation": "mooi river (vaal), mooi river (kwazulu-natal) and mooi river (town)"
    },
    {
      "original": "plettenbergbaai",
      "translation": "plettenberg bay"
    },
    {
      "original": "simonstad",
      "translation": "simon's town"
    },
    {
      "original": "vishoek",
      "translation": "fish hoek"
    },
    {
      "original": "spain",
      "translation": "españa"
    },
    {
      "original": "andalucía",
      "translation": "andalusia"
    },
    {
      "original": "aragón",
      "translation": "aragon in historical context, also aragón referring to modern spain"
    },
    {
      "original": "país vasco",
      "translation": "basque country"
    },
    {
      "original": "castilla",
      "translation": "castile"
    },
    {
      "original": "catalunya / cataluña",
      "translation": "catalonia"
    },
    {
      "original": "córdoba",
      "translation": "cordova"
    },
    {
      "original": "galician",
      "translation": "the groyne"
    },
    {
      "original": "duero",
      "translation": "river douro, english uses the portuguese name"
    },
    {
      "original": "gran canaria",
      "translation": "grand canary"
    },
    {
      "original": "islas baleares",
      "translation": "balearic islands"
    },
    {
      "original": "islas canarias",
      "translation": "canary islands"
    },
    {
      "original": "mallorca",
      "translation": "used, but english traditionally uses majorca, compare french majorque, italian maiorca"
    },
    {
      "original": "menorca",
      "translation": "english formerly used the italian spelling minorca"
    },
    {
      "original": "navarra / nafarroa",
      "translation": "navarre"
    },
    {
      "original": "pamplona",
      "translation": "pampeluna"
    },
    {
      "original": "pireneos / pirineus / pirinioak ",
      "translation": "pyrenees"
    },
    {
      "original": "sevilla",
      "translation": "seville"
    },
    {
      "original": "tajo",
      "translation": "tagus"
    },
    {
      "original": "tenerife",
      "translation": "english formerly used teneriffe"
    },
    {
      "original": "vizcaya / bizkaia",
      "translation": "biscay"
    },
    {
      "original": "zaragoza",
      "translation": "saragossa"
    },
    {
      "original": "sri lanka",
      "translation": "ශ්‍රී ලංකා (shri lanka) / இலங்கை (ilaṅkai)"
    },
    {
      "original": "galla (ගාල්ල) / kali (காலி)",
      "translation": "galle"
    },
    {
      "original": "halawata (හලාවත) / cilāpam (சிலாபம்)",
      "translation": "chilaw"
    },
    {
      "original": "kolamba (කොළඹ) / kolumpu (கொழும்பு)",
      "translation": "colombo"
    },
    {
      "original": "madakalapuwa (මඩකලපුව) / maṭṭakkaḷappu (மட்டக்களப்பு)",
      "translation": "batticaloa"
    },
    {
      "original": "mahanuwara (මහනුවර) / kanti (கண்டி)",
      "translation": "kandy"
    },
    {
      "original": "meegamuwa (මීගමුව) / nirkolompu (நீர்கொழும்பு)",
      "translation": "negombo"
    },
    {
      "original": "modara (මෝදර) / mukattuvāram (முகத்துவாரம்)",
      "translation": "mutwal"
    },
    {
      "original": "yapanaya (යාපනය) / yalpanam (யாழ்ப்பாணம்)",
      "translation": "jaffna"
    },
    {
      "original": "sudan",
      "translation": "السودان (as-sūdān)"
    },
    {
      "original": "al-ḫarṭūm (الخَرطوم)",
      "translation": "khartoum"
    },
    {
      "original": "an-nīl (النيل)",
      "translation": "nile"
    },
    {
      "original": "umm durmān (أُم درمان)",
      "translation": "omdurman"
    },
    {
      "original": "sweden",
      "translation": "sverige"
    },
    {
      "original": "dalarna",
      "translation": "dalecarlia"
    },
    {
      "original": "göteborg",
      "translation": "gothenburg"
    },
    {
      "original": "norrbotten",
      "translation": "north bothnia"
    },
    {
      "original": "skåne",
      "translation": "scania"
    },
    {
      "original": "västerbotten",
      "translation": "west bothnia"
    },
    {
      "original": "switzerland",
      "translation": "schweiz / suisse / svizzera"
    },
    {
      "original": "alpen/alpes/alpi",
      "translation": "alps"
    },
    {
      "original": "basel",
      "translation": "basle/basel"
    },
    {
      "original": "bern",
      "translation": "berne*/bern"
    },
    {
      "original": "genève/genf",
      "translation": "geneva"
    },
    {
      "original": "luzern",
      "translation": "lucerne*"
    },
    {
      "original": "rhein",
      "translation": "rhine"
    },
    {
      "original": "rheinfall",
      "translation": "(the) rhine falls or (the) schaffhausen falls"
    },
    {
      "original": "wallis",
      "translation": "valais"
    },
    {
      "original": "zürich",
      "translation": "zurich"
    },
    {
      "original": "syria",
      "translation": "ية ,sūrīyah"
    },
    {
      "original": "dimašq (دمشق)",
      "translation": "damascus"
    },
    {
      "original": "al-furāt (الفرات)",
      "translation": "euphrates"
    },
    {
      "original": "ḥalab (حلب)",
      "translation": "aleppo"
    },
    {
      "original": "al-lāḏiqīyah (اللاذقية)",
      "translation": "latakia"
    },
    {
      "original": "ประเทศไทย",
      "translation": "(prathet thai)"
    },
    {
      "original": "krung thep maha nakon (กรุงเทพมหานคร)",
      "translation": "bangkok"
    },
    {
      "original": "songkhla (สงขลา)",
      "translation": "singora"
    },
    {
      "original": "taiwan",
      "translation": "historicallyformosa"
    },
    {
      "original": "penghu islands",
      "translation": "pescadores"
    },
    {
      "original": "kinmen / jinmen",
      "translation": "quemoy"
    },
    {
      "original": "tunisia",
      "translation": "تونس (tūnis)"
    },
    {
      "original": "qābis (قابس)",
      "translation": "gabès"
    },
    {
      "original": "şafāqus (صفاقس)",
      "translation": "sfax"
    },
    {
      "original": "sūsah (سوسة)",
      "translation": "sousse"
    },
    {
      "original": "turkey",
      "translation": "türkiye"
    },
    {
      "original": "i̇stanbul",
      "translation": "istanbul"
    },
    {
      "original": "alaşehir",
      "translation": "philadelphia"
    },
    {
      "original": "anamur",
      "translation": "anemurium"
    },
    {
      "original": "antakya",
      "translation": "antioch"
    },
    {
      "original": "antalya",
      "translation": "adalia"
    },
    {
      "original": "aydın",
      "translation": "tralles"
    },
    {
      "original": "bergama",
      "translation": "pergamon"
    },
    {
      "original": "bodrum",
      "translation": "halicarnassus"
    },
    {
      "original": "bursa",
      "translation": "prusa"
    },
    {
      "original": "edirne",
      "translation": "adrianople"
    },
    {
      "original": "istanbul",
      "translation": "constantinople and byzantium"
    },
    {
      "original": "karadeniz ereğli",
      "translation": "heraclea pontica"
    },
    {
      "original": "kayseri",
      "translation": "caesarea"
    },
    {
      "original": "gelibolu",
      "translation": "gallipoli"
    },
    {
      "original": "giresun",
      "translation": "kerasous"
    },
    {
      "original": "i̇skenderun",
      "translation": "alexandretta"
    },
    {
      "original": "i̇zmir",
      "translation": "smyrna"
    },
    {
      "original": "izmit",
      "translation": "nicomedia"
    },
    {
      "original": "iznik",
      "translation": "nicaea"
    },
    {
      "original": "karaman",
      "translation": "laranda"
    },
    {
      "original": "konya",
      "translation": "iconium"
    },
    {
      "original": "manisa",
      "translation": "magnesia ad sipylum"
    },
    {
      "original": "mut",
      "translation": "claudiopolis"
    },
    {
      "original": "silifke",
      "translation": "seleucia"
    },
    {
      "original": "şanlıurfa (also urfa)",
      "translation": "edessa"
    },
    {
      "original": "trabzon",
      "translation": "trebizond"
    },
    {
      "original": "üsküdar",
      "translation": "scutari[25]"
    },
    {
      "original": "bozcaada",
      "translation": "tenedos"
    },
    {
      "original": "gökçeada",
      "translation": "imbros"
    },
    {
      "original": "boğaziçi",
      "translation": "bosphorus"
    },
    {
      "original": "çanakkale boğazı",
      "translation": "dardanelles"
    },
    {
      "original": "dicle town",
      "translation": "dicle nehri"
    },
    {
      "original": "fırat nehri",
      "translation": "still river euphrates"
    },
    {
      "original": "kapadokya",
      "translation": "cappadocia"
    },
    {
      "original": "kilikya",
      "translation": "cilicia"
    },
    {
      "original": "trakya",
      "translation": "thrace"
    },
    {
      "original": "ukraine",
      "translation": "україна (ukrayina)"
    },
    {
      "original": "chornobyl (чорнобиль)",
      "translation": "chernobyl"
    },
    {
      "original": "horlivka (горлівка)",
      "translation": "gorlovka"
    },
    {
      "original": "kharkiv (харків)",
      "translation": "kharkov"
    },
    {
      "original": "kryvyi rih (кривиі ріг)",
      "translation": "krivoy rog"
    },
    {
      "original": "kyiv",
      "translation": "kiev"
    },
    {
      "original": "krym (крим)",
      "translation": "crimea"
    },
    {
      "original": "halychyna (галичина)",
      "translation": "galicia"
    },
    {
      "original": "karpats'ka ukrayina (карпатська україна)",
      "translation": "carpathian ukraine or carpatho-ukraine"
    },
    {
      "original": "pidkarpats'ka rus' (підкарпатська русь)",
      "translation": "subcarpathian ruthenia"
    },
    {
      "original": "zakarpats'ka ukrayina (закарпатська україна)",
      "translation": "transcarpathian ukraine"
    },
    {
      "original": "zakarpattya (закарпаття)",
      "translation": "transcarpathia"
    },
    {
      "original": "àird a bhàsair",
      "translation": "ardvasar"
    },
    {
      "original": "àird shlèite",
      "translation": "aird of sleat"
    },
    {
      "original": "an t-acha mòr",
      "translation": "achmore"
    },
    {
      "original": "an t-aodann bàn",
      "translation": "edinbane"
    },
    {
      "original": "an t-àth leathann",
      "translation": "broadford"
    },
    {
      "original": "an t-òb",
      "translation": "leverburgh"
    },
    {
      "original": "an t-sàilean",
      "translation": "salen"
    },
    {
      "original": "àirigh na gobhar",
      "translation": "arinagour"
    },
    {
      "original": "bàgh a chaisteal",
      "translation": "castlebay"
    },
    {
      "original": "baile a ghràna",
      "translation": "ballygrant"
    },
    {
      "original": "baile a mhanaich",
      "translation": "balivanich"
    },
    {
      "original": "barabhas",
      "translation": "barvas"
    },
    {
      "original": "barraigh",
      "translation": "barra"
    },
    {
      "original": "beàrnasdal",
      "translation": "bernisdale"
    },
    {
      "original": "beinn na fadhla",
      "translation": "benbecula"
    },
    {
      "original": "beul an àtha",
      "translation": "bridgend, islay"
    },
    {
      "original": "bhatarsaigh",
      "translation": "vatersay"
    },
    {
      "original": "bogh mòr",
      "translation": "bowmore"
    },
    {
      "original": "bracadal",
      "translation": "bracadale"
    },
    {
      "original": "breascleit",
      "translation": "breasclete"
    },
    {
      "original": "càirinis",
      "translation": "carinish"
    },
    {
      "original": "calanais",
      "translation": "callanish"
    },
    {
      "original": "calgarraidh",
      "translation": "calgary, mull"
    },
    {
      "original": "camas dìonabhaig",
      "translation": "camastianavaig"
    },
    {
      "original": "caol àcain",
      "translation": "kyleakin"
    },
    {
      "original": "caol reatha",
      "translation": "kylerhea"
    },
    {
      "original": "càrlabhagh",
      "translation": "carloway"
    },
    {
      "original": "clèadail",
      "translation": "cleadale"
    },
    {
      "original": "colbhasa",
      "translation": "colonsay"
    },
    {
      "original": "cola",
      "translation": "coll"
    },
    {
      "original": "craig an iobhair",
      "translation": "craignure"
    },
    {
      "original": "dalabrog",
      "translation": "daliburgh"
    },
    {
      "original": "diùra",
      "translation": "jura"
    },
    {
      "original": "dùn bheagain",
      "translation": "dunvegan"
    },
    {
      "original": "ealaghol",
      "translation": "elgol"
    },
    {
      "original": "eige",
      "translation": "eigg"
    },
    {
      "original": "eilean iarmain",
      "translation": "isleornsay"
    },
    {
      "original": "èirisgeigh",
      "translation": "eriskay"
    },
    {
      "original": "heàrrlois",
      "translation": "harlosh"
    },
    {
      "original": "ì chaluim chille",
      "translation": "iona"
    },
    {
      "original": "ìle",
      "translation": "islay"
    },
    {
      "original": "lacadal",
      "translation": "laxdale"
    },
    {
      "original": "leodhas",
      "translation": "isle of lewis"
    },
    {
      "original": "liùrbost",
      "translation": "leurbost"
    },
    {
      "original": "loch baghasdail",
      "translation": "lochboisdale"
    },
    {
      "original": "loch nam madadh",
      "translation": "lochmaddy"
    },
    {
      "original": "miolabhaig",
      "translation": "milovaig"
    },
    {
      "original": "muc",
      "translation": "muck"
    },
    {
      "original": "muile",
      "translation": "isle of mull"
    },
    {
      "original": "na hearadh",
      "translation": "harris"
    },
    {
      "original": "na torrain",
      "translation": "torrin"
    },
    {
      "original": "orasaigh",
      "translation": "oronsay"
    },
    {
      "original": "pabail",
      "translation": "bayble"
    },
    {
      "original": "port asgaig",
      "translation": "port askaig"
    },
    {
      "original": "port ìlain",
      "translation": "port ellen"
    },
    {
      "original": "port na h-abhainn",
      "translation": "portnahaven"
    },
    {
      "original": "port nan giùran",
      "translation": "portnaguran"
    },
    {
      "original": "port nan long",
      "translation": "newton ferry"
    },
    {
      "original": "port nis",
      "translation": "port of ness"
    },
    {
      "original": "port rìgh",
      "translation": "portree"
    },
    {
      "original": "port sgioba",
      "translation": "port charlotte"
    },
    {
      "original": "ratharsair",
      "translation": "raasay"
    },
    {
      "original": "roghadal",
      "translation": "rodel"
    },
    {
      "original": "sgalpaigh",
      "translation": "scalpay, inner hebrides"
    },
    {
      "original": "sgalpaigh",
      "translation": "scalpay, outer hebrides"
    },
    {
      "original": "sgairinis",
      "translation": "scarinish"
    },
    {
      "original": "sgiogarstaigh",
      "translation": "skigersta"
    },
    {
      "original": "sgitheanach",
      "translation": "isle of skye"
    },
    {
      "original": "sòdhaigh",
      "translation": "soay"
    },
    {
      "original": "stafa",
      "translation": "staffa"
    },
    {
      "original": "staoinebrig",
      "translation": "stoneybridge"
    },
    {
      "original": "steinn",
      "translation": "stein"
    },
    {
      "original": "steòrnabhagh",
      "translation": "stornoway"
    },
    {
      "original": "taigh a'ghearraidh",
      "translation": "tigharry"
    },
    {
      "original": "taigh na creige",
      "translation": "craighouse"
    },
    {
      "original": "tairbeart",
      "translation": "tarbert"
    },
    {
      "original": "tarsgabhaig",
      "translation": "tarskavaig"
    },
    {
      "original": "tiriodh",
      "translation": "tiree"
    },
    {
      "original": "tobha mòr",
      "translation": "howmore"
    },
    {
      "original": "tobar mhoire",
      "translation": "tobermory"
    },
    {
      "original": "uibhist a deas",
      "translation": "south uist"
    },
    {
      "original": "uibhist a tuath",
      "translation": "north uist"
    },
    {
      "original": "ulbha",
      "translation": "ulva"
    },
    {
      "original": "aberdaugleddau",
      "translation": "milford haven"
    },
    {
      "original": "aberdyfi",
      "translation": "aberdovey (antiquated)"
    },
    {
      "original": "abergwaun",
      "translation": "fishguard"
    },
    {
      "original": "aberhonddu",
      "translation": "brecon"
    },
    {
      "original": "abermaw",
      "translation": "barmouth"
    },
    {
      "original": "aberpennar",
      "translation": "mountain ash, rhondda cynon taf"
    },
    {
      "original": "abertawe",
      "translation": "swansea"
    },
    {
      "original": "aberteifi",
      "translation": "cardigan (town)"
    },
    {
      "original": "afon gwy",
      "translation": "river wye"
    },
    {
      "original": "afon menai",
      "translation": "menai strait"
    },
    {
      "original": "afon tywi",
      "translation": "river towy"
    },
    {
      "original": "afon wysg",
      "translation": "river usk"
    },
    {
      "original": "bannau brycheiniog",
      "translation": "brecon beacons"
    },
    {
      "original": "biwmaris",
      "translation": "beaumaris"
    },
    {
      "original": "bro morgannwg",
      "translation": "vale of glamorgan"
    },
    {
      "original": "brycheiniog",
      "translation": "brecknockshire"
    },
    {
      "original": "brynbuga",
      "translation": "usk"
    },
    {
      "original": "bwcle",
      "translation": "buckley"
    },
    {
      "original": "caerfyrddin",
      "translation": "carmarthen"
    },
    {
      "original": "caerdydd",
      "translation": "cardiff"
    },
    {
      "original": "caergybi",
      "translation": "holyhead"
    },
    {
      "original": "caerllion",
      "translation": "caerleon"
    },
    {
      "original": "caernarfon",
      "translation": "caernarvon/carnarvon (antiquated)"
    },
    {
      "original": "cas-gwent",
      "translation": "chepstow"
    },
    {
      "original": "casnewydd",
      "translation": "newport"
    },
    {
      "original": "castell-nedd",
      "translation": "neath"
    },
    {
      "original": "ceredigion",
      "translation": "cardiganshire (antiquated)"
    },
    {
      "original": "conwy",
      "translation": "conway (antiquated)"
    },
    {
      "original": "dinbych",
      "translation": "denbigh"
    },
    {
      "original": "dinbych-y-pysgod",
      "translation": "tenby"
    },
    {
      "original": "dindyrn",
      "translation": "tintern"
    },
    {
      "original": "dolgellau",
      "translation": "dolgelley (antiquated)"
    },
    {
      "original": "eryri",
      "translation": "snowdonia"
    },
    {
      "original": "glyn ebwy",
      "translation": "ebbw vale"
    },
    {
      "original": "gŵyr",
      "translation": "gower peninsula"
    },
    {
      "original": "hendy-gwyn",
      "translation": "whitland"
    },
    {
      "original": "hafren",
      "translation": "river severn"
    },
    {
      "original": "hwlffordd",
      "translation": "haverfordwest"
    },
    {
      "original": "llanandras",
      "translation": "presteigne"
    },
    {
      "original": "llanbedr pont steffan",
      "translation": "lampeter"
    },
    {
      "original": "llanelwy",
      "translation": "st asaph"
    },
    {
      "original": "llaneurgain",
      "translation": "northop"
    },
    {
      "original": "llanfair-ym-muallt",
      "translation": "builth wells"
    },
    {
      "original": "llanilltud fawr",
      "translation": "llantwit major"
    },
    {
      "original": "llanymddyfri",
      "translation": "llandovery"
    },
    {
      "original": "llyn tegid",
      "translation": "bala lake"
    },
    {
      "original": "maesyfed",
      "translation": "radnorshire"
    },
    {
      "original": "meirionnydd",
      "translation": "merionethshire"
    },
    {
      "original": "morgannwg",
      "translation": "glamorgan"
    },
    {
      "original": "trefynwy",
      "translation": "monmouth"
    },
    {
      "original": "sir fynwy",
      "translation": "monmouthshire"
    },
    {
      "original": "penarlâg",
      "translation": "hawarden"
    },
    {
      "original": "penfro",
      "translation": "pembrokeshire"
    },
    {
      "original": "pen-y-bont ar ogwr",
      "translation": "bridgend"
    },
    {
      "original": "pontarfynach",
      "translation": "devil's bridge"
    },
    {
      "original": "pontneddfechan",
      "translation": "pont neath vaughan"
    },
    {
      "original": "porthaethwy",
      "translation": "menai bridge"
    },
    {
      "original": "porthmadog",
      "translation": "portmadoc"
    },
    {
      "original": "rhydaman",
      "translation": "ammanford"
    },
    {
      "original": "rhymni",
      "translation": "rhymney"
    },
    {
      "original": "trecelyn",
      "translation": "newbridge"
    },
    {
      "original": "trefaldwyn",
      "translation": "montgomeryshire"
    },
    {
      "original": "treffynnon",
      "translation": "holywell"
    },
    {
      "original": "tref-y-clawdd",
      "translation": "knighton"
    },
    {
      "original": "tresimwn",
      "translation": "bonvilston"
    },
    {
      "original": "tyddewi",
      "translation": "st david's"
    },
    {
      "original": "tywyn",
      "translation": "towyn (antiquated)"
    },
    {
      "original": "wdig",
      "translation": "goodwick"
    },
    {
      "original": "wrecsam",
      "translation": "wrexham"
    },
    {
      "original": "y bont-faen",
      "translation": "cowbridge"
    },
    {
      "original": "y drenewydd",
      "translation": "newtown, powys"
    },
    {
      "original": "y felinheli",
      "translation": "port dinorwic"
    },
    {
      "original": "y feni",
      "translation": "abergavenny"
    },
    {
      "original": "y fflint",
      "translation": "flint"
    },
    {
      "original": "y gelli gandryll",
      "translation": "hay-on-wye"
    },
    {
      "original": "y gogarth",
      "translation": "great orme"
    },
    {
      "original": "ynys bŷr",
      "translation": "caldey island"
    },
    {
      "original": "ynys enlli",
      "translation": "bardsey island"
    },
    {
      "original": "ynys seiriol",
      "translation": "puffin island, anglesey"
    },
    {
      "original": "ynys môn",
      "translation": "isle of anglesey"
    },
    {
      "original": "yr wyddfa",
      "translation": "snowdon"
    },
    {
      "original": "yr wyddgrug",
      "translation": "mold, flintshire"
    },
    {
      "original": "y trallwng",
      "translation": "welshpool"
    },
    {
      "original": "y waun",
      "translation": "chirk"
    },
    {
      "original": "ohio",
      "translation": "allegheny river"
    },
    {
      "original": "joe'hesta",
      "translation": "red house"
    },
    {
      "original": "civitas vaticana",
      "translation": "vatican city"
    },
    {
      "original": "vietnam",
      "translation": "việt nam"
    },
    {
      "original": "hà nội",
      "translation": "hanoi, french hanoï"
    },
    {
      "original": "thành phố hồ chí minh",
      "translation": "ho chi minh city"
    },
    {
      "original": "sài gòn",
      "translation": "saigon (still used for district), french saïgon"
    },
    {
      "original": "chợ lớn",
      "translation": "cholon, ho chi minh city"
    },
    {
      "original": "hải phòng",
      "translation": "haiphong, french haïphong"
    },
    {
      "original": "đà lạt",
      "translation": "dalat"
    },
    {
      "original": "đà nẵng",
      "translation": "danang, french tourane"
    },
    {
      "original": "hội an",
      "translation": "former name faifo]"
    },
    {
      "original": "cần thơ",
      "translation": "cantho"
    },
    {
      "original": "điện biên phủ",
      "translation": "dienbienphu"
    },
    {
      "original": "dãy trường sơn",
      "translation": "annamite range"
    },
    {
      "original": "ngũ hành sơn",
      "translation": "marble mountains"
    },
    {
      "original": "mê kông",
      "translation": "mekong river"
    },
    {
      "original": "vịnh bắc bộ",
      "translation": "gulf of tonkin"
    },
    {
      "original": "sông hồng",
      "translation": "red river"
    },
    {
      "original": "sông đà",
      "translation": "black river"
    },
    {
      "original": "sông hương",
      "translation": "perfume river"
    },
    {
      "original": "tây hồ",
      "translation": "west lake"
    }
  ]
};
