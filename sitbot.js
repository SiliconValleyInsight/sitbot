SITBOT_CRAWLER = (function () {
  var total_pages;
  var cur_page = 1;
  var new_results_arrived = false;

  function getTotalPages() {
    var pagination_links = $('.pagination a');
    var page_numbers = pagination_links.map(function() {
      var val = parseInt($(this).text());
      if (!isNaN(val)) {
        return val;
      }
    })
    return Math.max.apply(null, page_numbers);
  }

  function startScraping(port) {
    total_pages = getTotalPages();
    scrapeAndSendProfiles(port);
    clickNextPage();
    listenToPageUpdate(port);
  }

  function clickNextPage() {
    window.location.href = "http://google.com"
    $('.next_page').click();
    new_results_arrived = false;
  }

  function listenToPageUpdate(port) {
    $('#site-container').on('DOMNodeInserted', function(e) {
      if (!new_results_arrived) {
        new_results_arrived = true;
        //scrapeAndSendProfiles(port);
        clickNextPage();
      }
    });
  }

  function chromeRuntimeMessageListener(port) {
    if (port.name == "scraper") {
      scrape_port = port;
      port.onMessage.addListener(function(msg) {
        if (msg.type == "start_scraping") {
          startScraping(port);
        }
      });
    }
  }

  function scrapeAndSendProfiles(port) {
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

//    port.postMessage({
 //     type: "scraped_profiles",
  //    current_page: cur_page,
   //   total_pages: total_pages,
    //  profiles: profs
   // });
  }

  return {
    init: function() {
      chrome.runtime.onConnect.addListener(chromeRuntimeMessageListener);
    }
  }
});

SitbotCrawler = SITBOT_CRAWLER();
SitbotCrawler.init();
