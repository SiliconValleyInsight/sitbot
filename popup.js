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

  function initProgressIndicator(total_pages) {
    progress = $('.progress');
    progress.removeClass('hidden');
    progress.find('.progress__total_pages').text(total_pages);
  }

  function updateProgressIndicator(data) {
    if(typeof(progress) == "undefined") {
      initProgressIndicator(data.total_pages);
    }
    progress.find('.progress__current_page').text(data.current_page);
  }

  function generateDownloadLink(data) {
    var MIME_TYPE = 'text/plain';

    window.URL = window.webkitURL || window.URL;

    var data_blob = new Blob([data], {type: MIME_TYPE});

    var a = document.createElement('a');

    a.download = 'sitbot_results.csv';
    a.href = window.URL.createObjectURL(data_blob);
    a.textContent = 'Download ready';

    a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(':');
    a.draggable = true; // Don't really need, but good practice.

    $('.container').append(a);
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

