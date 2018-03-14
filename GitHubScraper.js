SITBOT_GITHUB_CRAWLER = (function () {
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

    chrome.runtime.sendMessage({
      type: "scraped_profiles_github",
      next_page_URL: next_page_URL,
      current_page: cur_page,
      total_pages: total_pages,
      profiles: profiles
    });
  }

function scrapeProfiles(port) {
  var profiles = $('.user-list-item');
  var profs = []

  $.each(profiles, function(index, prof) {
    prof = $(prof);
    var p = {};
    p.name = $.trim(prof.find('.f4').text().replace(/\s+/g,' ').trim());
    p.description = $.trim(prof.find('.f5').text().replace(/\s+/g,' ').trim());
    p.email = prof.find('.muted-link').text();  
    p.location = $.trim(prof.find('.user-list-meta').text().replace(prof.find('.muted-link').text(),' ').replace(/\s+/g,' ').trim());
    p.url = 'http://github.com/' + $.trim(prof.find('.d-flex a').text().replace(prof.find('.muted-link').text(),' ').trim());  
    profs.push(p);
  })
  return profs;
}
  return {
    init: function() {
      scrapePage();
    }
  }
});

SitbotGitHubCrawler = SITBOT_GITHUB_CRAWLER();

$(function() {
  SitbotGitHubCrawler.init();
});
