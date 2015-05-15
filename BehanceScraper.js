SITBOT_BEHANCE_CRAWLER = (function () {

  function scrapeResults(port) {
    var profiles = $('.user-row');
    var profs = [];
    $.each(profiles, function(index, profile) {
      profile = $(profile);
      var p = {};
      var names = profile.find('.user-name').text().split(' ');
      p.last_name = names.splice(1).join(' ');
      p.first_name = names[0];
      p.location = profile.find('.location-link').text();
      p.fields = profile.find('.field-link').map(function(index, el) {
         return el.innerText;
      }).toArray().join(', ');
      p.url = profile.find('.user-name').attr('href');
      p.thumbs_ups = profile.find('.cover-stat-appreciations').text().trim();
      p.views = profile.find('.cover-stat-views').text().trim();
      profs.push(p);
    });

    console.log(profs);
    chrome.runtime.sendMessage({
      type: "scraped_profiles_behance",
      profiles: profs
    });
  }

  // Call delay(callback, ms, force) to call the callback after a ms millisecond
  // delay. Set force to run the callback even if other functions are delayed
  var delay = (function(){
    var timer = 0;
    return function(callback, ms, force){
      if (force !== true) {
        clearTimeout (timer);
      }
      timer = setTimeout(callback, ms);
    };
  })();

  function scrollToBottom() {
    window.scrollTo(0,document.body.scrollHeight);
  }

  function fetchMoreResults() {
    scrollToBottom();
    delay(function() {
      scrapeResults();
    }, 5000);
  }

  function spinnerAttrModified(mutation) {
    var newValue = mutation.target.getAttribute('style');
    if (newValue == "display: none;") {
      fetchMoreResults();
    }
  }

  function addSpinnerEventListeners() {
    var spinner = $('.loading-spinner')[0];
    var observer = new WebKitMutationObserver(function (mutations) {
      mutations.forEach(spinnerAttrModified);
    });
    observer.observe(spinner, { attributes: true, subtree: false });
  }

  return {
    init: function() {
      addSpinnerEventListeners();
      fetchMoreResults();
    }
  }
});

SitbotBehanceCrawler = SITBOT_BEHANCE_CRAWLER();

$(function() {
  SitbotBehanceCrawler.init();
});
