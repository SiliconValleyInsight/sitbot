SITBOT_EXTENSION = (function() {
  var profiles = {}
  var progress;

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
    //chrome.runtime.sendMessage({type: "start_scraping"});
    chrome.tabs.executeScript(null, {file: "jquery.min.js"});
    chrome.tabs.executeScript(null, {file: "sitbot.js"});

    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        if (request.type == 'scraped_profiles') {
          saveProfileBatch(request);
        }
        return;
      });
  }

  function saveProfileBatch(data) {
      //alert("I received the following DOM content:\n" + element);
      profiles[data.current_page] = data.profiles;
      updateProgressIndicator(data);
      if (data.current_page == data.total_pages) {
        processAndShowResults();
        return;
      }
      changeUrl(data.next_page_URL);
      window.setTimeout(injectContentScripts,3000);
  }

  function initProgressIndicator(current_page, total_pages) {
    progress = {
      current_page: current_page,
      total_pages: total_pages,
      button: $('#scrape-button'),
      text: $('#scrape-button .btn-text')
    }
    progress.button.addClass('spinner--active');
  }

  function updateProgressIndicator(data) {
    if(typeof(progress) == "undefined") {
      initProgressIndicator(data.total_pages);
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

  function processAndShowResults() {
    var data = "";
    for (page_no in profiles) {
      profiles[page_no].map(function(profile) {
        data += JSONToCSV(profile);
      });
    }
    generateDownloadLink(data);
  }

  function JSONToCSV(object) {
    var keys = ['url', 'name', 'email']
    var output = "";
    var i;

    for (i = 0; i < keys.length; i++) {
      var key = keys[i];
      output += '\"' + object[key] + '\"' +','
    }

    output += '\n';
    return output;
  }


  function injectContentScripts() {
      chrome.tabs.executeScript(null, {file: "jquery.min.js"});
      chrome.tabs.executeScript(null, {file: "sitbot.js"});
  }

  return {
    init: function() {
      $('#github-form').submit(githubSearch);
      $('#scrape-button').click(startScraping);
    }
  }
});

SitbotExtension = SITBOT_EXTENSION();
document.addEventListener('DOMContentLoaded', function() {
  SitbotExtension.init();
});

