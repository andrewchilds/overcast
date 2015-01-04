$(function () {
  var headers = $('section > h2');
  var parent = $('#subnav');
  var anchors;

  function renderNav() {
    var html = '';
    headers.each(function () {
      var text = $.trim($(this).text());
      var anchor = $(this).find('a')[0].id;
      var className = $(this).is('h2') ? 'link-is-h2' : 'link-is-h3';
      html += '<div class="subnav-link"><a href="#' + anchor + '" class="' + className + '">' + text + '</a></div>';
    });
    parent.html(html);
    anchors = parent.find('.subnav-link');
  }

  function onScroll() {
    var scrollTop = $(document).scrollTop();
    if (scrollTop > 270) {
      parent.addClass('fixed');
    } else {
      parent.removeClass('fixed');
    }

    anchors.filter('.active').removeClass('active');
    anchors.each(function (i) {
      var offset = headers.eq(i).offset();
      if (scrollTop < offset.top - 100) {
        $(this).prev().addClass('active');
        return false;
      }
    });
  }

  function onNavClick() {
    var me = $(this);
    var i = $(this).index();
    var top = headers.eq(i).offset().top;
    $('body').animate({ scrollTop: top - 26 }, 300, function () {
      anchors.filter('.active').removeClass('active');
      me.addClass('active');
    });

    return false;
  }

  function init() {
    renderNav();
    onScroll();
    $(window).scroll(onScroll);
    anchors.click(onNavClick);
  }

  init();

});
