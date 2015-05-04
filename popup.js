SITBOT_EXTENSION = (function() {

  function changeUrl(url) {
    chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
          chrome.tabs.update(tab.id, {url: url});
    });
  }

  function githubSearch(e){
    console.log('asdf');
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
      json[this.name] = this.value || '';
    });

    return json;
  }

  function startScraping(){
    chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
      var port = chrome.tabs.connect(tab[0].id, {name: "scraper"});
      port.postMessage({type: "start_scraping"});
      port.onMessage.addListener(function(msg) {
        if (msg.type == "scraped_profiles") {
          saveProfiles(msg);
        }
      });
    });
  }

  function saveProfiles(data) {
      //alert("I received the following DOM content:\n" + element);
      console.log('and here we are');
      console.log(data);
  }

  return {
    init: function() {
      $('#github-form').submit(githubSearch);
      $('#scrape-button').click(startScraping);
      chrome.tabs.executeScript(null, {file: "jquery.min.js"});
      chrome.tabs.executeScript(null, {file: "sitbot.js"});
    }
  }
});

SitbotExtension = SITBOT_EXTENSION();
document.addEventListener('DOMContentLoaded', function() {
  SitbotExtension.init();
});

