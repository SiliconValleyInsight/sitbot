SITBOT_CRAWLER = (function () {
  var status;
  var cur_page = 1;
  var new_results_arrived = false;

  function getTotalPages() {
    var pagination_links = $('.pagination').children();
    var page_numbers = pagination_links.map(function() {
      var val = parseInt($(this).text());
      if (!isNaN(val)) {
        return val;
      }
    })
    return Math.max.apply(null, page_numbers);
  }

  function getNextPageURL() {
    var prefix = "https://github.com";
    var suffix = $('.next_page').attr('href');
    return prefix + suffix;
  }

  function getCurrentPage() {
    return parseInt($('.pagination .current').text());
  }

  function scrapePage(port) {
    var total_pages = getTotalPages();
    var cur_page = getCurrentPage();
    var next_page_URL = getNextPageURL();
    var profiles = scrapeProfiles(port);

    sendMessage({
      type: "scraped_profiles",
      next_page_URL: next_page_URL,
      current_page: cur_page,
      total_pages: total_pages,
      profiles: profiles
    });
  }

  function sendMessage(msg) {
    console.log('SENDING MSG!');
    console.log(msg);
    chrome.runtime.sendMessage(msg);
  }

  function chromeRuntimeMessageListener(port) {
    if (port.name == "scraper") {
      scrape_port = port;
      port.onMessage.addListener(function(msg) {
        if (msg.type == "start_scraping") {
          scrapePage(port);
        }
      });
    }
  }

  function scrapeProfiles(port) {
    var profiles = $('.user-list-item');
    var profs = []

    $.each(profiles, function(index, prof) {
      prof = $(prof);
      var p = {};
      p.email = prof.find('.email').text();
      prof.find('.user-list-meta').remove();
      p.username = prof.find('.user-list-info a').remove().text();
      p.name = $.trim(prof.find('.user-list-info').text());
      p.url = 'http://github.com/' + p.username
      profs.push(p);
    })
    return profs;
  }

  return {
    init: function() {
      scrapePage();
     /*chrome.runtime.sendMessage({type:"testmsg"});
      scrapePage();
      chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
          if (request.type == "start_scraping") {
            scrapePage();
          } else {
            console.log(request);
          }
      }); */
    }
  }
});

SitbotCrawler = SITBOT_CRAWLER();

$(function() {
  SitbotCrawler.init();
});

console.log("yo dis script chillz");
