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
    var keys = ['url', 'first_name', 'last_name', 'location', 'fields', 'thumbs_ups', 'views'];
    for (index in profiles) {
      profile = profiles[index];
      data += JSONToCSV(keys, profile);
    }
    generateDownloadLink(data);
  }

  function processAndShowGitHubResults() {
    var data = "";
    var keys = ['url', 'name', 'email']
    for (page_no in profiles) {
      profiles[page_no].map(function(profile) {
        data += JSONToCSV(keys, profile);
      });
    }
    generateDownloadLink(data);
  }

  function JSONToCSV(keys, object) {
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
      chrome.tabs.executeScript(null, {file: "GitHubScraper.js"});
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

