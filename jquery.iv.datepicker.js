(function($) {
  
  // initialize iv if it doesn't exist yet
  $.fn.iv_datepicker = function(options) {
    var i = 0;
    return this.each(function() {
      new $.iv.datepicker(this, options);
    });
  };
  
  $.iv = $.iv || {};

  var month_cache         = [];
  var month_period_cache  = [];
  var html_cache          = [];
  var month_year_cache    = [];
  // create the global method
  $.iv.datepicker = function(el, options) {
    var id = el.id;
    var current_month;
    var selected_date = '';
    var months =  $("#" + id).find('.day').length / 42;
    var link_id = 'link_' + id;
    var initialized = false;
    var m_counter;

    options = $.extend({
      locale      : 'en-US',
      empty_by_default : false,
      begin_month : {
        'month' : Date.today().getMonth(),
        'year'  : Date.today().getFullYear()
      },
      selected_date: ''
    }, options);

    selected_date = options.selected_date;

    month_year_cache[options.locale] = [];

    var month_view = function(month, year) {
      // check the month_cache first
      if (month_cache[year + '-' + month] && month_cache[year+'-'+month].hasOwnProperty('length')) {
        return month_cache[year + '-' + month];
      }
      var i;
      var this_month = [];
      var start_date = Date.today().set({ 'month': month, 'year': year, 'day': 1 });
      var days_in_month_view = 0; // 7 days in 6 weeks = 42 days
      var extra_days = 0; // next month's days to show
      var days_in_month = start_date.getDaysInMonth();
      var day_of_week = Date.getDayNumberFromName(start_date.getDayName());

      start_date = start_date.add( { days: -day_of_week });

      // begin with the days of the previous month
      for (i = day_of_week; i > 0; i--) {
        days_in_month_view++;
        this_month.push(start_date.getDate());
        start_date.add( {days: 1} );
      }
      month_period_cache[year+'-'+month] = month_period_cache[year+'-'+month] || {};
      month_period_cache[year+'-'+month].begin = days_in_month_view;
      // continue with the days of the month in question
      for (i = 1; i <= days_in_month; i++) {
        days_in_month_view++;
        this_month.push(i);
      }
      month_period_cache[year+'-'+month].end = days_in_month_view;
        
      // finish with the days of the next month
      while (days_in_month_view < 42) {
        days_in_month_view++;
        extra_days++;
        this_month.push(extra_days);
      }
      // update the cache and return
      month_cache[year+'-'+month] = this_month;
      return this_month;
    };

    var populate_table = function(this_month) {
      var month             = this_month.getMonth();
      var year              = this_month.getFullYear();
      var this_month_data   = month_view(month, year);
      var month_year_format = Date.CultureInfo.formatPatterns['yearMonth'];
      var day_cells;
      var month_year = month + '_' + year;
      $("#" + id).find('.month_' + m_counter).find('.month_year').html(this_month.datetostring(month_year_format)).attr('month_year', month_year);
      month_year_cache[options.locale][month_year] = { 'year' : year, 'month' : month };
      if (html_cache[year+'-'+month]) {
        $("#" + id).find('.month_' + m_counter).find('tbody').html(html_cache[year+'-'+month]);
        var index_month = (month >= 9) ? month + 1 : '0' + (month + 1);
        if (selected_date && selected_date.substr(0,2) == index_month && selected_date.substr(6,4) == year) {
          index_day = parseInt(selected_date.substr(3,2), 10);
          $($("#" + id).find('.month_' + m_counter).find('.day').filter('.selectable')[index_day-1]).addClass('date_picked');
        }
        return;
      }

      // pretty straight forward, populate each table cell with this_month_data
      // and change CSS classes as needed
      day_cells = $("#" + id).find('.month_' + m_counter).find('.day');
      for (i = 0; i < 42; i++) {
        $(day_cells[i]).removeClass('selectable');
        $(day_cells[i]).removeClass('nonselectable');
        $(day_cells[i]).removeClass('date_picked');
        if (i >= month_period_cache[year + '-' + month].begin && i < month_period_cache[year + '-' + month].end) {
          $(day_cells[i]).addClass('selectable');
          var string_month = new String(month + 1);
          if (string_month.length == 1) {
            string_month = '0' + string_month;
          }
          var string_day = new String(this_month_data[i]);
          if (string_day.length == 1) {
            string_day = '0' + string_day;
          }
          var string_year = new String(year);
          var current_date = string_month + '-' + string_day + '-' + string_year;
          if (
              typeof selected_date != 'undefined' && 
              (
               !(selected_date < current_date) && 
               !(selected_date > current_date)
              )
             ) {
            $(day_cells[i]).addClass('date_picked');
          }
        }
        else {
          $(day_cells[i]).addClass('nonselectable');
        }
        $(day_cells[i]).html(this_month_data[i]);
      }
      html_cache[year+'-'+month] = $("#" + id).find('.month_' + m_counter).find('tbody').html();
    };
    
    var set_month_view = function(mm, yy) {
      var this_month = Date.today().set({ 'month': mm, 'year': yy, 'day': 1});
      for (m_counter = 1; m_counter <= months; m_counter++) {
        if (m_counter != 1) {
          this_month = this_month.addMonths(1);
        }
        populate_table(this_month);
        $('#'+id).find('.day').unbind('click');
        if (initialized) {
          // events get lost, so we have to rebind
          bind_click();
        }
      }
    };

    set_month_view(options['begin_month'].month, options['begin_month'].year);
    current_month = Date.today().set({ 'month' : options['begin_month'].month, 'year':  options['begin_month'].year, 'day' : 1})
    initialized = true;

   // set the day names
    var weekdays = $("#" + id).find('.weekdays').children();
    var weekday_counter = 0;
    for (i = 1; i <= months; i++) {
      for (j = 0; j < 7; j++) {      
        $(weekdays[weekday_counter]).html(Date.CultureInfo.shortestDayNames[j]);
        weekday_counter++;
      }
    }

    var day_width = new String(Math.floor(100/weekday_counter));
    day_width = day_width + '%';
    if ($.browser.msie) {
      $("#" + id).find('.day').attr({width: day_width});
    }
    else {
      $("#" + id).find('.day').css({width: day_width});
    }
    // show previous month
    $("#" + id).find(".prev").bind('click', function() {
      current_month = current_month.addMonths(-1);
      set_month_view(current_month.getMonth(), current_month.getFullYear());
    });

    // show next month
    $("#" + id).find(".next").bind('click', function() {
      current_month = current_month.addMonths(1);
      set_month_view(current_month.getMonth(), current_month.getFullYear());
    });

    var show_datepicker = function() {
      var dialog = $("#" + id).find(".datepicker_container");
      var close = $("#" + id).find(".close");
      var image = $(close).find("img");
      var open_pos;
      dialog.show();
      open_pos = $("#" + id).find(".open").offset({scroll: false});
      if (open_pos) {
        $(close).css({left: dialog.width() - image.width()});
      }
    };

    if (!$("#" + link_id)[0]) {
      var parsed_date;
      if ($("#" + id).find(".date_field")[0].value) {
        parsed_date = Date.parse($("#" + id).find(".date_field")[0].value);
        options.empty_by_default = false;
      }
      else {
        parsed_date = Date.today();
      }
      if(!options.empty_by_default && parsed_date) {
        $("#" + id).find(".date_field")[0].value = parsed_date.datetostring(
          Date.CultureInfo.formatPatterns['shortDate']
        );
      }
      // show the datepicker when the field gets focus, blur immediatly afterwards
      $("#" + id).find(".date_field").bind('click', function() {
        show_datepicker();
//        this.blur();
      });
    }

    // show the datepicker when you click the icon
    $("#" + id).find(".open").bind('click', function() {
      show_datepicker();
    });
    
    // close the popup
    $("#" + id).find(".close").bind('click', function() {
      $("#" + id).find(".datepicker_container").hide();
    });

    var bind_click = function() {
      // Pick a date
      $("#" + id).find(".day").bind('click', function() {
        var display_date, month_year, std_month_year, day, month, format;
        if ($(this).hasClass('selectable')) {
          // we're selecting another day, forget previous selection
          $(".date_picked", $("#" + id)).removeClass('date_picked');
          //                       td     tr     tbody    thead
          month_year = $(this).parent().parent().prev().find('.month_year').attr('month_year');
          std_month_year = month_year_cache[options.locale][month_year];
          display_date = Date.today().set({
            'month' : std_month_year.month, 
            'year': std_month_year.year, 
            'day': parseInt($(this).text(), 10)
          });

          // prepare de string for display
          day = new String($(this).text());
          if (day.length == 1) {
            day = new String('0' + day);
          }

          month = new String(std_month_year.month + 1);
          if (month.length == 1) {
            month = '0' + month;
          }

          selected_date = month + '-' + day + '-' + std_month_year.year;
          $(this).addClass('date_picked');
          format = Date.CultureInfo.formatPatterns['shortDate'];
          if (!$("#" + link_id)[0]) {
            $("#" + id).find(".date_field")[0].value = display_date.datetostring(format);
          }
          else {
            $("#" + link_id)[0].value = display_date.datetostring(format);
          }
          
          var container = $("#" + id).find(".datepicker_container");
          if (container.hasClass('popup')) {
            container.hide();
          }
          
          if (options.callback) {
            options.callback(selected_date);
          }
          $('.date_field', $("#" + id)).trigger('change');
        }
      });
    };
    bind_click();
    return;
  };
})(jQuery);
