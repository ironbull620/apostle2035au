var locale_maportal_uri_map = new Array();
var internal_update_default_price_page = false;

(function($) {
  if(!($.iv)){
    $.extend({ iv: {} });
  }

  // We need traditional param serialization.
  $.ajaxSettings.traditional = true;

  $.iv.post_json = function(uri, data, success, error) {
    if(typeof(data) === 'string') {
      data += '&_output=json';
    }
    else {
      data['_output'] = 'json';
    }
    return jQuery.ajax({ url: uri,
                         type: 'post',
                         data: data,
                         success: success,
                         error: error,
                         dataType: 'json' });
  };

  $.iv.post_json_sync = function(uri, data, callback) {
    if(typeof(data) === 'string') {
      data += '&_output=json';
    }
    else {
      data['_output'] = 'json';
    }
    return jQuery.ajax({ url: uri,
                         async: false,
                         type: 'post',
                         data: data,
                         success: callback,
                         dataType: 'json' });
  };

  $.iv.get_uri = function(uri, data) {
    if(data) {
      uri += '?' + jQuery.param(data);
    }
    location.href = uri;
  };
    
  $.iv.post_uri = function(uri, data) {
    if(typeof(uri) == 'object') {
      uri = uri['uri'];
      data = uri;
    }
    data = data || {};
    var form = jQuery('#action_form').attr({ action: uri }).empty();
    jQuery.each(data, function(key, val) {
      form.append('<input type="hidden" name="' + key + '" value="' + val + '"/>');
    });
    form.submit();
  };

  $.iv.load_uri_into_element = function(data) {
    var uri = data.uri || null;
    var element_id = data.element_id || null;
    var params = data.params || {};
    
    if(uri && element_id) {
      $('#' + element_id).load(uri, params);
    }
  };
    
  $.iv.get_key = function(e) {
    var key = null;
    switch(e.keyCode) {
    case 9: // tab
      key = 'tab';
      break;
    case 13: // return
      key = 'enter';
      break;
    case 16: // shift
      key = 'shift';
      break;
    case 27: // esc
      key = 'esc';
      break;
    }
    return key;
  };

  $.iv.popup_window = function(uri, window_name, options) {
    options = $.extend({
      width: 1010,
      height: 712,
      toolbar: 0,
      location: 0,
      directories: 0,
      status: 0,
      scrollbars: 1,
      resizable: 1
    }, options);
    
    var opt_str = '';
    $.each(options, function(name, val) {
      opt_str += name + '=' + val + ',';
    });
    opt_str = opt_str.slice(0, -1);
    
    window.open(uri, window_name, opt_str);
  };

  // Localize a string by hitting the server and getting the translated string.
  // Don't overuse this!!
  // You can pass 99.99% of the strings from your mason to the JS
  $.iv.loc_strings = {}; // cache the lookups for fast access if called twice for the same string.
  $.iv.loc = function(string) {
    var loc_string = '';
    if($.iv.loc_strings[string]) {
      return($.iv.loc_strings[string]);
    }
    
    $.iv.post_json_sync('/public/loc', { string: string }, function(json) {
      loc_string = json.loc_string;
    });
    $.iv.loc_strings[string] = loc_string;
    return(loc_string);
  };
  
  // takes a normal href link and does a popup
  $.fn.iv_href_popup = function() {
    return this.each(function() {
      $(this).click(function() {
        var name = this.target || 'hrefpopup';
        $.iv.popup_window(this.href, name);
        return(false);
      });
    });
  };
  
  // perform a synchronous load operation.  This is usually needed to ensure that IE
  // processes any embedded JS correctly.
  $.fn.iv_load_sync = function(uri, params, callback) {
    return this.each(function() {
      $.ajaxSetup( { async: false });
      $(this).load(uri, params, callback);
      $.ajaxSetup( { async: true });
    });
  };

  //----------------- Ajax ------------------------------
  $.ajaxSetup( {
    type: 'POST'
  });

  $.iv.loading_timeout = null;
  $.iv.show_loading    = true;
  
  $(document).ajaxStart(function() {
    if($.iv.show_loading) {
      $('body, span.button').addClass('loading');
      $.iv.loading_timeout = setTimeout(function() { $('#loading').show(); }, 1000);
    }
  });
  
  $(document).ajaxComplete(function(e, request, settings) {
    // The web server will set Ajax-Location if a redirect is needed.
    var loc = request.getResponseHeader('Ajax-Location')
    if(loc) {
      location.href = loc;
    }
  });
  
  $(document).ajaxStop(function() {
    if($.iv.show_loading) {
      clearTimeout($.iv.loading_timeout);
      $('#loading').hide();
      $('body, span.button').removeClass('loading');
    }
  });
  //----------------- End Ajax --------------------------
  
  //----------------- Delay -----------------------------
// Delay doesn't work right.  Commenting out for now.
//  $.fn.iv_delay = function(ms) {
//    ms = ms || 1000;
//    return this.each(function() {
//      var $$ = $(this);
//      $(this).queue(function() {
//        setTimeout(function() { $$.dequeue(); }, ms);
//      });
//    });
//  };
//  
//  $.fn.iv_clear_delay = function() {
//    return this.each(function() {
//      var $$ = $(this);
//      if($$.queue) {
//        $$.dequeue().stop();
//      }
//    });
//  };
  //----------------- End Delay --------------------------

  //----------------- Simple Drag -----------------------------
  $.fn.iv_simpledrag = function(options) {
    options = $.extend({
      handle: null,
      constrain: 1
    }, options);
  
    return this.each(function() {
      var handle = options.handle ? $(options.handle, this) : $(this);
      var $$ = $(this);
      var coordinates = {};
      handle.mousedown(function(e) {
        coordinates = {
          left:   parseInt($$.css('left')),
          top:    parseInt($$.css('top')),
          height: parseInt($$.height()),
          width:  parseInt($$.width()),
          page_x: e.pageX,
          page_y: e.pageY
        };
        $(document).mousemove( _drag ).mouseup( _stop );
        return(false);
      });

      if('ontouchend' in document) {
        var offset = null;
        handle.bind('touchstart', function(e) {
          e.preventDefault();
          var orig = e.originalEvent;
          var pos = handle.parent().offset();
          offset = {
            x: orig.changedTouches[0].pageX - pos.left,
            y: orig.changedTouches[0].pageY - pos.top
          };
        });
        handle.bind('touchmove', function(e) {
          e.preventDefault();
          var orig = e.originalEvent;
          var $parent = handle.parent().parent();
          if(handle.attr("tagName") == 'TD') {
            $parent = $parent.parent().parent();
          }
          $parent.css({
            top: orig.changedTouches[0].pageY - offset.y - $(window).scrollTop(),
            left: orig.changedTouches[0].pageX - offset.x - $(window).scrollLeft()
          });
        });
      }
  
      function _drag(e) {
        var new_left = coordinates.left + e.pageX - coordinates.page_x;
        var new_top  = coordinates.top  + e.pageY - coordinates.page_y;

        if(options.constrain) {
          var window_w = $(window).width();
          var window_h = $(window).height();
          var scroll_t = $(window).scrollTop();
          var scroll_l = $(window).scrollLeft();
          if(new_left < scroll_l) {
            new_left = scroll_l;
          }
          else if(new_left + coordinates.width > window_w + scroll_l) {
            new_left = (window_w + scroll_l) - coordinates.width;
          }
          if(new_top + coordinates.height > window_h) {
            new_top = window_h - coordinates.height;
          }
          
          if(new_top < 0) new_top = 0;
        }
        
        $$.css({ left: new_left, top: new_top });
        return(false);
      }
  
      function _stop(e) {
        $(document).unbind('mousemove', _drag).unbind('mouseup', _stop);
      }
  
    });        
  }
  //----------------- End Simple Drag -------------------------

  //----------------- Modal -----------------------------------
  // We use a stack array to track all the open modals.
  // $.iv.modal_stack[0] will always give you the active(on top) modal.
  $.iv.modal_stack = [];
  
  $.iv.modal = function(options) {
    var options = $.extend({
      callback: null,
      on_load: null,
      z_index: 2000,
      uri: false,
      auto_data_change: true,
      params: {},
      classes: [],
      max_height: '500px',
      confirm_close: false,
      close: false,
      sync: false,
      maximize: false,
      can_shade: true,
      can_close: true,
      hide_shade: false,
      hide_close: false,
      close_on_escape: true,
      flash: null
    }, options);

    $.iv.modal_stack.unshift(this);
    
    var id   = 'modal_' + ($.iv.modal_stack.length + 1);
    var shade_html = options.can_shade ? '<div id="' + id + '_shade" class="modal_shade float_r"></div>' : '';
    var close_html = options.can_close ? '<div id="' + id + '_close" class="modal_close float_r"></div>' : '';
    var html = '<div><div class="title_bar_container">' + close_html + shade_html + '<div class="title_bar"></div></div><div id="' + id + '_content" class="content"></div></div>';
    var z    = (options.z_index + ($.iv.modal_stack.length * 2));
    var is_visible = false;
    var overlay = null;
    
    // add the overlay right below the modal
    var $e_menu = $('#editor_menu');
    if($e_menu.length == 1) { // if we are in the editor, we just grey out the top of the page and keep the WYSIWYG clear.
      var overlay_top_height = parseInt($('#editor_content').css('top'));
      overlay = $('<div></div>').addClass('overlay').addClass('editor_overlay').css('z-index', (z - 1)).appendTo('body');
      $('<div></div>').addClass('overlay').addClass('editor_overlay_top').css({'z-index': (z - 1), height: overlay_top_height}).appendTo(overlay);
    }
    else {
      overlay = $('<div></div>').addClass('overlay').addClass('modal_overlay').css('z-index', (z - 1)).appendTo('body');
    }

    var $$ = $(html).attr({ id: id }).addClass('modal_dialog').css('z-index', z).appendTo('body');
    
    $.each(options.classes, function(i, n) {
      $$.addClass(n);
    });

    // Set maximized modal
    if(options.maximize) {
      $('#' + id + '_content').css('max-height', $(window).height() - 50);
      $('#' + id).css('width', $(window).width() - 50);
    }
    else if(options.max_height != '500px') {
      $('#' + id + '_content').css('max-height', options.max_height);
    }
    
    // allow for custom close functions
    if(options.can_close) {
      if(options.close) {
        $('#' + id + '_close').click(function() { options.close(); });
      }
      else {
        $('#' + id + '_close').click(function() { _close(); });
      }

      if(options.hide_close) { _hide_close(); }
    }

    if(options.can_shade) {
      $('#' + id + '_shade').click(function() { _shade(); });
      if(options.hide_shade) { _hide_shade(); }
    }

    _load(options.uri, options.params, options.on_load, options.flash);

    /********** Public Methods **************/

    this.load = _load;
    this.data_change = _data_change;
    this.close = _close;
    this.center = _center;
    this.confirm_close = _confirm_close;
    this.set_confirm = _set_confirm;
    this.shade = _shade;
    this.unshade = _unshade;
    this.hide = _hide;
    this.show = _show;
    this.hide_shade = _hide_shade;
    this.show_shade = _show_shade;
    this.hide_close = _hide_close;
    this.show_close = _show_close;
    this.close_on_escape = options.close_on_escape;
    this.is_visible = _is_visible;
    this.id = function () { return id; };

    /********** Private Methods *************/

    function _load(url, params, callback, flash) {
      $$.hide();
      is_visible = false;

      var on_load = function() {
        _center();
        if (callback) { callback(); }
        $$.trigger('loaded.modal');
        // Chrome is sometimes having trouble rendering modals in certain 
        // situations. No clue to the reason, but hiding and redisplaying 
        // the modal causes it to render properly
        _hide();
        setTimeout(function () { _show(); }, 10);
      };
      
      if (url) {
        // Use synchronous ajax calls
        if (options.sync) {
          $('#' + id + '_content').iv_load_sync(url, params, function() {
            //$('div.content .modal_close', $$).click(function() { _close(); });
            setTimeout(on_load, 600);
          });
        }
        else {
          $('#' + id + '_content').load(url, params, function() {
            //$('div.content .modal_close', $$).click(function() { _close(); });
            setTimeout(on_load, 600);
          });
        }
      }
      else {
        $('#' + id + '_content').html(flash);
        $('.modal_close').click(function() { _close(); });
        on_load();
      }
    }

    function _hide_close() { $('#' + id + '_close').hide(); }
    function _hide_shade() { $('#' + id + '_shade').hide(); }
    function _show_close() { $('#' + id + '_close').show(); }
    function _show_shade() { $('#' + id + '_shade').show(); }

    // set obj to false to disable a previously enabled confirm
    function _set_confirm(obj) {
      options.confirm_close = obj;
    }

    function _confirm_close(conf) {
      if ($.iv.modal_stack[1]) {
        if (conf) {
          $.iv.modal_stack[1].close(true);
        }
      }
      _close();
    }
    
    function _close(force) {
      if (!force && options.confirm_close) {
        new $.iv.modal({
          uri: options.confirm_close.uri,
          params: options.confirm_close.params
        });
        return false;
      }

      if (options.auto_data_change == true) {
        _data_change();
      }
      $$.remove();
      overlay.remove();
      $.iv.modal_stack.shift();
    }
    
    function _center() {
      var window_height = $(window).height();
      var modal_height = $$.height();
      var top  = parseInt((window_height / 2) - (modal_height / 2));
      var left = parseInt(($(window).width() / 2) - ($$.width() / 2));
      if(top < 0) top = 0;
      if(left < 0) left = 0;
      
      $$.css({ top: top + 'px', left: left + 'px' });

      if(window_height < modal_height) {
        var new_height = window_height - ( (parseInt($$.css('border-top-width')) * 2) + parseInt($('.title_bar', $$).css('height')) + 1 );
        $('div.content', $$).css({ 'max-height': new_height + 'px' });
      }
      
      if(!is_visible) {
        $$.show().iv_simpledrag({
          handle: 'div.title_bar'
        });
        is_visible = true;
      }
    }

    function _data_change() {
      if(options.callback) {
        options.callback();
      }
    }

    function _shade() {
      $('#' + id + '_content').hide();
      $('#' + id + '_shade').removeClass('modal_shade').addClass('modal_unshade');
      $('#' + id + '_shade').unbind('click').click(function() { _unshade(); });      
    }
    
    function _unshade() {
      $('#' + id + '_content').show();
      $('#' + id + '_shade').removeClass('modal_unshade').addClass('modal_shade');
      $('#' + id + '_shade').unbind('click').click(function() { _shade(); });      
    }

    function _hide() {
      $$.hide();
      is_visible = false;
    }

    function _show() {
      $$.show();
      is_visible = true;
    }

    function _is_visible() {
      return $$.css('display') != 'none';
    }
  }
  //----------------- End Modal -------------------------------
  
  //----------------- Button ----------------------------------
  $.fn.iv_button = function(options) {
    return this.each(function() {
      new $.iv.button(this, options);
    });
  }

  $.fn.iv_button_disable = function(options) {
    return this.each(function() {
      var btn = $.data(this, 'button');
      btn.disable();
    });
  }

  $.fn.iv_button_enable = function(options) {
    return this.each(function() {
      var btn = $.data(this, 'button');
      btn.enable();
    });
  }

  $.iv.button = function(el, options) {
  
    options = $.extend({
      value:       null,
      append_to:   null,
      click:       null,
      is_disabled: false
    }, options);
  
    var $$ = $(el);
    var is_disabled = options.is_disabled;
    var click_function = options.click;
    $.data(el, 'button', this);

    if(is_disabled) {
      _disable();
    }
    else {
      is_disabled = true;
      _enable();
    }
   
    this.enable  = _enable;
    this.disable = _disable;

    this.set_click = function(func) {
      click_function = func;
    }

    function _enable() {
      if(is_disabled) {
        is_disabled = false;
        $$.removeClass('disabled')
          .mousedown( function() { $$.addClass('mousedown')    })
          .mouseup(   function() { $$.removeClass('mousedown') })
          .mouseout(  function() { $$.removeClass('mousedown') });
        if(click_function) {
          $$.click( function() { click_function(); });
        }
        if($$.hasClass('modal_close') && $.iv.modal_stack[0]) {
          $$.click( function() { $.iv.modal_stack[0].close() });
        }
      }
    };
      
    function _disable() {
      is_disabled = true;
      $$.addClass('disabled')
        .unbind('click')
        .unbind('mousedown')
        .unbind('mouseup')
        .unbind('mouseout');
    };

  }
  //----------------- End Button ------------------------------

  //----------------- Link ------------------------------------
  $.fn.iv_link = function(options) {
    return this.each(function() {
      new $.iv.link(this, options);
    });
  };

  $.iv.link = function(el, options) {
  
    options = $.extend({
      action: null
    }, options);
  
    var $$ = $(el);
    $.data(el, 'link', this);

    _enable();

    function _enable() {
      $$.click(options.action);
    };
  };
  //----------------- End Link --------------------------------

  //---------------------------- Main Form Stuff ----------------------------
  $.fn.iv_form = function(options) {
    return this.each(function() {
      new $.iv.form(this, options);
    });
  }

  $.fn.iv_form_cancel = function() {
    return this.each(function() {
      var form = $.data(this, 'form');
      form.change_to_view();
    });
  }

  $.fn.iv_form_inline_results = function(data) {
    return this.each(function() {
      var form = $.data(this, 'form');
      form.inline_results(data);
    });
  }

  $.fn.iv_form_submit = function() {
    return this.each(function() {
      var form = $.data(this, 'form');
      form.submit();
    });
  }

  $.fn.iv_form_reload_modal = function(uri) {
    return $.iv.modal_stack[0].load(uri);
  }
  
  $.iv.form = function(el, options) {
  
    options = $.extend({
      mode:                   null,
      item_id:                null,
      submit_on_enter:        false,
      submit_on_enter_fields: [],
      title:                  [], // title is a 1 element array becuase it is passed in as json to escape the string
      uri:                    [],
      tracking_params:        {},
      extra_item_actions:     [],
      masks:                  null,
      load_success_uri_in:    null,
      reset_submit:           false,
      buttons_always_on:      false
    }, options);

    var self = this;
    var $$ = $(el);
    var $iframe = null;
    var iframe = null;
    var submitting = false;
    
    $.data(el, 'form', this);

    this.inline_results = _inline_results;

    _update_title();

    // Set the input masks if they are passed in.
    if(options.masks) {
      $.iv.masks = options.masks;
    }
    
    $('div.item_actions', $$.parent().parent()).each(function() {
      var container = $(this);

      if(options.mode == 'view') {
        if(options.uri['detail']) {
          $('span.edit', container).click(function() {
            _reload_main(options.uri['detail'], 'edit');          
          });
        }
        
        if(options.uri['delete']) {
          $('span.delete', container).click(function() {
            new $.iv.modal({
              callback: function() {
                if(options.uri['index']) {
                  location.href = options.uri['index'];
                }
              },
              uri: options.uri['delete'],
              params: { id: options.item_id }
            });
          });
        }

        if(options.extra_item_actions.length > 0) {
          $.each(options.extra_item_actions, function(i, n) {
            if(n.uri && n.name) {
              var params = $.extend({}, n.params);
              if(n.form_params) {
                $.each(n.form_params, function(j, p) {
                  params[p] = options[p];
                });
              }
              $('span.' + n.name, container).click(function() {
                if(n.type == 'post') {
                  $.iv.post_uri(n.uri, params);
                }
                else if(n.type == 'popup') {
                  $.iv.popup_window(n.uri, n.name);
                }
                else if(n.type == 'modal') {
                  new $.iv.modal({
                    uri: n.uri,
                    params: params,
                    callback: function() { eval(n.callback) }
                  });
                }
                else if(n.type == 'close_window') {
                  window.close();
                }
              });
            }
          });
        }
      }
      else { // edit or create
        $('span.save', container).click(function() {
          $$.submit();
        });
        
        $('span.cancel', container).click(function() {
          if(options.uri['cancel']) {
            var params = $.extend({}, options.tracking_params);
            $.iv.post_uri(options.uri['cancel'], params);
//            location.href = options.uri['cancel'];
          }
          else {
            $$.iv_form_cancel();
          }
        });
      }
      
    });
    
    // Show/Hide section events
    _init_collapsibles();

    // Show/Hide sub-section events
    $('div.sub_section_collapsible', $$).each(function() {
      var c = $(this);
      $('div.sub_collapsible_titlebar div.toggle', c).click(function() {
        if(c.is('.open')) {
          _hide_section(c);
        }
        else {
          _show_section(c);
        }
      });
    });

    // Expand All and Collapse All events
    $('div.section_actions span', $$.parent().parent()).click(function() {
      if($(this).is('.expand')) {
        $('div.section_collapsible').each(function() {
          _show_section( $(this) );
        });
      }
      else {
        $('div.section_collapsible').each(function() {
          _hide_section( $(this) );
        });
      }
    });
    
    // submit form when 'enter' hit
    if(options.submit_on_enter) {
      $$.keyup(function(e) {
        var key = $.iv.get_key(e);
        if(key == 'enter') {
          $$.submit();
        }
      });
    }

    // submit form when 'enter' hit for specific fields
    $.each(options.submit_on_enter_fields, function(i, n) {
      $('#' + n, $$).keyup(function(e) {
        var key = $.iv.get_key(e);
        if(key == 'enter') {
          $$.submit();
        }
      });
    });

    $$.unbind('submit').submit( function() {
      _submit();
//      return(false);
    });

    this.change_to_view = function() {
      var params = $.extend({}, options.tracking_params);
      if(options.mode === 'create') {
        if($.iv.modal_stack[0]) {
          $.iv.modal_stack[0].load(options.uri['index'], params);
        }
        else {
          $.iv.post_uri(options.uri['index'], params);
        }
      }
      else {
        _reload_main(options.uri['detail'], 'view');
      }
    }

    this.init_collapsibles = _init_collapsibles;
    this.submit = _submit;
    
    /************* Private Methods *************/

    function _update_title() {
      if(options.title.length == 1 && options.title[0] != null) {
        $('#page_title').html(options.title[0]);
      }
    }
    
    function _submit() {
      submitting = true;
      $('td.label.error, td.label div.label.error', $$).removeClass('error');
      $('div.form_errors', $$).remove();
      if(!options.buttons_always_on) {
        $('span.button', $$).iv_button_disable();
      }
      if($('#'+$$[0].id+' #_output').length == 0) {
        $('<input id="_output" type="hidden" name="_output" value="json_iframe">').appendTo($$);
      }

      if($iframe === null) {
        $iframe = $('iframe#form_submitter').unbind('load').load(_submit_return);
        // We need the DOM object for stuff below.
        iframe = $iframe[0];
      }
    }

    function _reset_submit() {
      if($('#_output', $$).length != 0) {
        $('#_output', $$).remove();
      }
      $iframe = null;
    }

    function _inline_results(json) {
      if(json.fatal_err) {
        var error_box = $('<div></div>').addClass('form_errors');
        error_box.append('<div>' + json.fatal_err + '</div>');
        $$.prepend(error_box);
        $.scrollTo('div.form_errors', 500, { offset: -100 });
        if(!options.buttons_always_on) { 
          $('span.button', $$).iv_button_enable();
        }
      }
      else if(json.errors) {
        var messages = {};
        $.each(json.errors, function(i, n) {
          messages[n.message] = 1;
          if(n.field) {
            // If doesn't select anything, look for radio buttons
            var element = $('#' + n.field)[0] ? $('#' + n.field) : $('input[type="radio"][name="' + n.field + '"]:first' );
            element.parent().prev().addClass('error');
          }
        });

        var error_box = $('<div></div>').addClass('form_errors');
        $.each(messages, function(key, val) {
          error_box.append('<div>' + key + '</div>');
        });
        $$.prepend(error_box);
        if(!$.iv.modal_stack[0]) {
          $.scrollTo('div.form_errors', 500, { offset: -100 });
        }
        if(!options.buttons_always_on) {
          $('span.button', $$).iv_button_enable();
        }
      }
      else if(json.success_inline) {
        var messages = {};
        $.each(json.successes, function(i, n) {
          messages[n.message] = 1;
        });

        var msg_box = $('div.form_success').empty();
        if (!msg_box.length) {
          msg_box = $('<div></div>').addClass('form_success');
        }

        $.each(messages, function(key, val) {
          msg_box.append('<div>' + key + '</div>');
        });
        $$.prepend(msg_box);

        if($.iv.modal_stack[0]) {        
          $.scrollTo('.modal_dialog div.content', 500, { offset: -500 });
        }
        if(!options.buttons_always_on) {
          $('span.button', $$).iv_button_enable();
        }

        var to_id =  window.setTimeout(function() {
          window.clearTimeout(to_id);
          msg_box.remove();
        }, 5000);
      }
      else if(json.success_uri) {
        var params = $.extend(options.tracking_params, json.params);
        var load_success_uri_in = json.load_success_uri_in || options.load_success_uri_in;
        if(load_success_uri_in) {
          $('#' + load_success_uri_in).load(json.success_uri, params);
          $.scrollTo('#' + load_success_uri_in, 500, { offset: -100 });
        }
        else if($.iv.modal_stack[0] && json.post_success_uri != 1) {
          $.iv.modal_stack[0].load(json.success_uri, params);
        }
        else {
          $.iv.post_uri(json.success_uri, params);
        }
      }
    }

    function _submit_return() {
      var args = $$.data('_data');

      if (args) {
        if (args['callback']) { args.callback(); }
      }

      // This function will be triggered if the user hits 'back' after the form has generated errors.
      // So, we explicitly send them back in the history when that happens.
      if(!submitting) {
        history.go(-1);
        return;
      }
      
      // extract the server response from the iframe. jQuery doesn't seem to work for this.
      // So, we have to do raw JS.
      var doc = iframe.contentWindow ? iframe.contentWindow.document : iframe.contentDocument ? iframe.contentDocument : iframe.document;
      var ta = doc.getElementsByTagName('textarea')[0];
      if(!ta) {
        alert('System Error');
        return;
      }
      
      json = eval('data = ' + ta.value);
      
      if(json.updates) {
        $.each(json.updates, function(key, val) {
          options.values[key] = val;
        });
      }

      _inline_results(json);

      submitting = false;
      // reset submit to allow subsequent submits
      if (options.reset_submit) { _reset_submit(); }
    }
    
    function _show_section(section) {
      $('span.spawn', section).show();
      $('div.table_container', section).show();
      section.removeClass('closed').addClass('open');
    }
    
    function _hide_section(section) {
      $('span.spawn', section).hide(); // hide link to create a new form
      $('div.table_container', section).hide();
      section.removeClass('open').addClass('closed');
    }

    function _init_collapsibles () {
      $('div.section_collapsible').each(function() {
        var c = $(this);
        $('div.collapsible_titlebar div.toggle', c).click(function() {
          if(c.is('.open')) {
            _hide_section(c);
          }
          else {
            _show_section(c);
          }
        });
      });
    }

    function _reload_main(uri, mode) {
      if(uri) {
        var params = $.extend({
          id: options.item_id,
          _mode: mode
        }, options.tracking_params);
        
        if($.iv.modal_stack[0]) {
          $.iv.modal_stack[0].load(uri, params);
        }
        else {
          $.iv.post_uri(uri, params);
        }
      }
    }
  }
  //---------------------------- End Main Form Stuff ----------------------------

  //---------------------------- Sub Form Stuff ---------------------------------
  
  $.fn.iv_sub_form = function(options) {
    return this.each(function() {
      new $.iv.sub_form(this, options);
    });
  }
  
  $.fn.iv_sub_form_replace = function(form_div, params) {
    return this.each(function() {
      var sub_form = $.data(this, 'sub_form');
      sub_form.spawn(form_div, params);
    });
  }
  
  $.iv.sub_form = function(el, options) {

    options = $.extend({
      uri:         null,
      delete_uri:  null,
      parent_id:   null,
      require_one: 1,
      collapse:    false,
      modal:       false,
      modal_params: {},
      modal_callback: null
    }, options);

    var $$ = $(el);
    var index = ($('table', $$).length - 1);
    $.data(el, 'sub_form', this);

    if(options.uri != null) {
      $('span.spawn', $$).click(function() {
        if(!options.modal) {
          _spawn();
        }
        else {
          new $.iv.modal({
            callback: options.modal_callback,
            uri: options.uri,
            params: options.modal_params || {},
            auto_data_change: options.modal_params.auto_data_change
          });
        }
      });
    }

    _setup_delete_events();
    _setup_primary_events();

    this.spawn = _spawn;

    function _spawn(form_div, params) {
      if(!form_div) {
        form_div = $('<div></div>').addClass('table_container');
        $$.append(form_div);
        ++index;
      }

      var load_params = $.extend({
        index: index
      }, params);
      
      if(options.parent_id > 0) {
        load_params[options.parent_id] = options.parent_id;
      }
      
      form_div.iv_load_sync(options.uri, load_params);

      _setup_delete_events();
      _setup_primary_events();
    }

    function _remove(tbody) {
      tbody.parent().parent().remove();
      if(options.require_one === 1 && $('div.table_container', $$).length < 2) {
        $('tbody.sub_form_actions', $$).hide();
      }
      
      if($('input:checkbox.primary:checked', $$).length == 0) {
        $('input:checkbox.primary', $$).eq(0).attr('checked', true);
      }
    }
    
    function _setup_primary_events() {
      $('input:checkbox.primary', $$).unbind('click').click(function() {
        if($(this).attr('checked')) {
          $('input:checkbox.primary', $$).not($(this)).attr('checked', false);
        }
        else {
          $(this).attr('checked', true);
        }
      });

      if($('input:checkbox.primary:checked', $$).length == 0) {
        $('input:checkbox.primary', $$).eq(0).attr('checked', true);
      }

      if (options.collapse == 1) {
        $('#'+el.id+" div.collapsible_titlebar div.toggle").trigger('click');
      }
    }

    function _setup_delete_events() {
      if(options.require_one === 1 && $('div.table_container', $$).length < 2) {
        $('tbody.sub_form_actions', $$).hide();
      }
      else {
        $('tbody.sub_form_actions', $$).show();
      }
      $('tbody.sub_form_actions', $$).each( function() {
        var tbody = $(this);
        var parts = this.id.split('-');
        var id    = parts[2];
        $('tr td span.delete', this).unbind('click').click( function() {
          var params = {};
          if(id) {
            params['id'] = id;
          }
          new $.iv.modal({
            callback: function() { _remove(tbody) },
            uri: options.delete_uri,
            params: params,
            auto_data_change: false
          });
        });
      });
    }

  }
  //---------------------------- End Sub Form Stuff -----------------------------

  //---------------------------- Form Utils -------------------------------------
  
  $.fn.iv_country_change = function(options) {
    return this.each(function() {
      new $.iv.country_change(this, options);
    });
  }

  $.fn.iv_update_countries = function(options) {
    return this.each(function() {
      new $.iv.update_countries(this, options);
    });
  }

  $.fn.iv_update_default_price_page = function(options) {
    return this.each(function() {
      new $.iv.update_default_price_page(this, options);
    });
  }

  $.fn.iv_toggle_button_state_checkbox = function(options) {
    return this.each(function() {
      new $.iv.toggle_button_state_checkbox(this, options);
    });
  }

  $.fn.iv_quantity_pricing = function(options) {
    return this.each(function() {
      new $.iv.quantity_pricing(this, options);
    });
  }

  $.fn.iv_conditional_option = function(options) {
    return this.each(function() {
      new $.iv.conditional_option(this, options);
    });
  }

  $.fn.iv_show_address_form = function(options) {
    return this.each(function() {
      new $.iv.show_address_form(this, options);
    });
  }

  $.fn.iv_populate_child_select = function(options) {
    return this.each(function() {
      new $.iv.populate_child_select(this, options);
    });
  }

  $.fn.iv_change_thumbnails = function(options) {
    return this.each(function() {
      new $.iv.change_thumbnails(this, options);
    });
  }

  $.fn.iv_change_maportal_uri = function(options) {
    return this.each(function() {
      new $.iv.change_maportal_uri(this, options);
    });
  }

  $.fn.iv_change_security_question = function(options) {
    return this.each(function() {
      new $.iv.change_security_question(this, options);
    });
  }

  $.fn.iv_select_with_other = function(options) {
    return this.each(function() {
      new $.iv.select_with_other(this, options);
    });
  }

  $.fn.iv_jump_to_next_field = function(options) {
    return this.each(function() {
      var $$ = $(this);
      $$.keyup(function(e) {
        var key = $.iv.get_key(e);
        if(key != 'tab' && key != 'shift') {
          var maxlength = $$.attr('maxlength');
          if(maxlength > 0 && maxlength === $$.val().length) {
            $$.next('input').focus();
          }
        }
      });
    });
  }

  $.fn.iv_alphanumeric = function(options) { 
    options = $.extend({
      ichars: "!@#$%^&*()+=[]\\\';,/{}|\":<>?~`.- ",
      nchars: "",
      allow: ""
    }, options);
    
    return this.each(function() {
      if(options.nocaps) options.nchars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if(options.allcaps) options.nchars += "abcdefghijklmnopqrstuvwxyz";
      
      s = options.allow.split('');
      for(i=0; i < s.length; i++) if(options.ichars.indexOf(s[i]) != -1) s[i] = "\\" + s[i];
      options.allow = s.join('|');
      
      var reg = new RegExp(options.allow,'gi');
      var ch = options.ichars + options.nchars;
      ch = ch.replace(reg,'');
      
      $(this).keypress(function (e) {
        if(!e.charCode) k = String.fromCharCode(e.which);
        else k = String.fromCharCode(e.charCode);
        
        if(ch.indexOf(k) != -1) e.preventDefault();
        if(e.ctrlKey&&k=='v') e.preventDefault();
      });
      
      $(this).bind('contextmenu',function () {return true});
      
    });

  };

  $.fn.iv_numeric = function(options) {
    var az = "abcdefghijklmnopqrstuvwxyz";
    az += az.toUpperCase();
    
    options = $.extend({
      nchars: az
    }, options);      
    
    return this.each (function() {
      $(this).iv_alphanumeric(options);
    });
  };
        
  $.fn.iv_alpha = function(options) {
    var nm = "1234567890";
    options = $.extend({
      nchars: nm
    }, options);      
    
    return this.each (function() {
      $(this).iv_alphanumeric(options);
    });
  };    
  
  $.iv.many_many_swap = function(dir, in_field, out_field, in_value_name) {
    var $from = dir == 'add' ? $('#' + out_field) : $('#' + in_field);
    var $to   = dir == 'add' ? $('#' + in_field)  : $('#' + out_field);
    $('option:selected', $from).each( function() {
      $to.append($(this));
    });

    var $table = $('#' + in_field).parents('table').eq(0);
    var $td = $('tbody.hidden_fields tr td', $table).empty();
    
    // We need a 'null' value in case there are no other values in the list.
    // If only this 'null' value is passed over, the server knows to remove everything.
    $td.append( $('<input type="hidden" name="' + in_value_name + '" value="" />'));
    
    $('#' + in_field + ' option').each( function() {
      $td.append( $('<input type="hidden" name="' + in_value_name + '" value="' + this.value + '" />'));
    });
  }
 
  $.iv.country_change = function(el, options) {
  
    options = $.extend({
      id_field: null
    }, options);

    var self = this;
    var $$ = $(el);
    var geo_country_id = $$.val();
    var index = options.id_field.substr((options.id_field.length - 1), 1);

    var params = {
      item_id: $('#' + options.id_field).val(),
      geo_country_id: geo_country_id,
      index: index
    };
    var form_div = $$.parent().parent().parent().parent().parent();
    form_div.parent().iv_sub_form_replace(form_div, params);
  }

  $.iv.update_countries = function(el, options) {
  
    options = $.extend({
      id_field: null
    }, options);

    var self = this;
    var $$ = $(el);

    var params = { reseller_id: $$.val() };
    $.iv.post_json(options.action, params, function(json) {
      if(json.options) {
        $('select.country_select').each(function() {
          $.iv.update_select_options($(this), json);
        }).change();
      }
    });    
    
  }

  $.iv.update_default_price_page = function (el, options) {

    options = $.extend({
      id_field:        null,
      reseller_field:  null,
      retail_field:    null,
      wholesale_field: null,
      dc_retail_field: null,
      incentive_field: null,
      profit_field:    null,
      hosting_field:   null,
      action:          null
    }, options);

    if (internal_update_default_price_page == true) {
      return(true);
    }

    var self = this;
    var $$ = $(el);

    internal_update_default_price_page = true;

    var params   = { 
                     website_id: $('#' + options.id_field).val(),
                     reseller_id: $('#' + options.reseller_field).children('option:selected').val() || 'null',
                     selected_price_id: $('#' + options.retail_field).children('option:selected').val() || 'null',
                     selected_design_center_id: $('#' + options.dc_retail_field).children('option:selected').val() || 'null',
                     changed_element: $$.attr('id')
                   };
    $.iv.post_json_sync(options.action, params, function(json) {
      var select = $('#' + options.retail_field);
      $.iv.update_select_options($('#' + options.retail_field), json.pricing_options);
      $.iv.update_select_options($('#' + options.dc_retail_field), json.design_center_options);
      $.iv.update_select_options($('#' + options.hosting_field), json.hosting_options);
      $('#' + options.wholesale_field).text(json.wholesale_price);
      $('#' + options.profit_field).text(json.profit).show();
    });

    internal_update_default_price_page = false;

  }

  $.iv.toggle_button_state_checkbox = function (el, options) {

    options = $.extend({
      button_id: null
    }, options);

    var self = this;
    var $$   = $(el);

    $$.bind('change', function (e) {
      if (!this.checked) {
        $('#' + options.button_id).iv_button_disable();
      }
      else {
        $('#' + options.button_id).iv_button_enable();
      }
    });

  }

  $.iv.quantity_pricing = function (el, options) {

    options = $.extend({
      price_field: null,
      unit_price: null
    }, options);

    var self = this;
    var $$ = $(el);

    $$.bind('change', function(e) {
      var amt_text = options.unit_price;
      var quantity = $(this).val();
      var amount   = new Number(amt_text.replace(',', '').match(/\d+\.*\d+/));
      var price    = (quantity * amount).toString();
      if (amt_text.match(/\d\./) && !price.match(/\d\./)) {
        price += '.00';
      }

      $('#' + options.price_field).text($('#' + options.price_field).text().replace(/(\d+\,+)*\d+\.*\d{0,2}/, price));

    });

  }

  $.iv.conditional_option = function (el, options) {

    options = $.extend({
      toggle_field: null,
      toggle_value: null
    }, options);

    var $$ = $(el);
    $(':radio:checked.' + options.toggle_field).each(function() {
      if ($(this).val() == options.toggle_value) {
        $$.attr('disabled','disabled');
        $$.removeAttr('selected');
      }
      else {
        $$.removeAttr('disabled');
      }
    });

    $(':radio.' + options.toggle_field).bind('change', function(e) {
      var select_value = $(this).val();
      if (select_value == options.toggle_value) {
        $$.attr('disabled','disabled');
        $$.removeAttr('selected');
      }
      else {
        $$.removeAttr('disabled');
      }
    });

  }

  $.iv.show_address_form = function (el, options) {
    options = $.extend({
    }, options);

    var self = this;
    var $$ = $(el);
    var selected = $$.children('option:selected');

    if (selected.val() == 'new') {
      $('#section_user_address > div.table_container').show();
    }
    else {
      $('#section_user_address > div.table_container').hide();
    }
  }

  $.iv.populate_child_select = function(el, options) {
  
    options = $.extend({
      action: null,
      id_field: null,
      select_field: null,
      name: null,
      parent: null
    }, options);

    var self = this;
    var $$ = $(el);
    var parent_id = $$.val();    
    if(parent_id == null) {
      setTimeout(function() { parent_id = $$.val(); _post(); }, 1000);
    }
    else {
      _post();
    }
    
    function _post() {
      var params = {
        id: $('#' + options.id_field).val(),
        name: options.name,
        parent: options.parent,
        parent_id: parent_id
      };
      
      $.iv.post_json(options.action, params, _update_form);
    }

    function _update_form(json) {
      $.iv.update_select_options($('#' + options.select_field), json);
    }
  }

  $.iv.update_select_options = function(select, data) {
    if(select[0] && data.options.length > 0) {
      select.empty();
      $.each(data.options, function(i, n) {
        $('<option></option>').attr({ value: n.id }).html(n.name).appendTo(select);
      });
      if(data.selected) {
        select.val(data.selected);
      }
      else {
        select[0].selectedIndex = 0;
      }
    }
    select.trigger('change');
  }
  
  $.iv.change_thumbnails = function(el, options) {
    options = $.extend({
      param_key: null,
      target_field: null
    }, options);

    if(options.param_key) {
      var $$ = $(el);
      var params = {};
      params[options.param_key] = $$.val();
      $('#thumbnails_' + options.target_field).iv_thumbnails_change_list(params);
    }
  }

  $.iv.change_maportal_uri = function(el, options) {
    options = $.extend({
      param_key: null,
      target_field: null
    }, options);

    if(options.param_key) {
      var $$ = $(el);
      $('span.ma_portal_base_uri').text('http://' + locale_maportal_uri_map[$$.val()] + '/');
    }
  }

  $.iv.thumbnail_preview = function(options) {
    options = $.extend({
      selector: null
    }, options);
    
    $(options.selector).iv_thumbnails_show_preview();
  }

  $.iv.change_security_question = function(el, options) {
    options = $.extend({
    }, options);
    
    var $$ = $(el);
    var $row = $$.parent().parent().next();
    if($$.val() == 100) {
      $row.show();
    }
    else {
      $row.hide();
    }
  }

  $.iv.select_with_other = function(el, options) {
    options = $.extend({
                       }, options);
    
    var $$ = $(el);
    var $input = $('div', $$.parent());
    _change();
    $$.bind('change', _change);
    
    function _change() {
      if($$.val() == 'other') {
        $input.show();
      }
      else {
        $input.hide();
      }
    }
  }

  //---------------------------- End Form Utils ---------------------------------

  //---------------------------- Masked Input -----------------------------------

  if($.mask) {
    $.mask.definitions['d'] = '[0-9]'; // change the placeholder for number to 'd'
    $.mask.definitions['p'] = '[0-9() -]'; // change the placeholder for phone number to 'p'
    $.mask.definitions['A'] = '[A-Z]';
    $.mask.definitions['z'] = '[A-Za-z]'; // the z map will auto uppercase all letters
  }

  $.iv.masks = {};

  $.fn.iv_set_input_mask = function(options) {
    return this.each(function() {
      options = $.extend({
        type:     null,
        type_key: null,
        name:     null,
        update_field: null
      }, options);

      var $$ = $(this);
      
      if(options.update_field) {
        options.type_key = $$.val();
      }
      
      if(!$.iv.masks[options.type]) {
        $.iv.post_json_sync('/public/helpers/get_formatting_masks', { _output: 'json' }, _set_masks);
      }
      
      if($.iv.masks[options.type] && $.iv.masks[options.type][options.type_key][options.name]) {
        var $obj = options.update_field ? $('#' + options.update_field) : $$;
        var mask = $.iv.masks[options.type][options.type_key][options.name];
        $obj.unmask().mask(mask, { placeholder: '' });
      }

      function _set_masks(json) {
        $.iv.masks = json.masks;
      }

    });
  }
  //---------------------------- End Masked Input -------------------------------

  //---------------------------- Tooltip ----------------------------------------
  $.fn.iv_tooltip = function(options) {
    return this.each(function() {
      new $.iv.tooltip(this, options);
    });
  }

  $.iv.tooltip = function(el, options) {
    var options = $.extend({
    }, options);
    
    var $$ = $(el);
    $.data(el, 'tooltip', this);

    var $img = $('img', $$);
    var $div = $('div', $$);
    
    $$.hover(
      function() {
        $$.addClass('hover');
        _set_position();
        $div.show();
      },
      function() {
        $$.removeClass('hover');
        $div.hide();
      }
    );
    
    function _set_position() {
      var offset = $img.offset();
      var top  = (offset.top - $(window).scrollTop()) + $img.height();
      var left = (offset.left - $(window).scrollLeft()) + $img.width();
      if($(window).width() < (left + $('div', $$).outerWidth())) {
        left = $(window).width() - $('div', $$).outerWidth();
      }
      if($(window).height() < (top + $('div', $$).outerHeight())) {
        top = $(window).height() - $('div', $$).outerHeight();
      }
      $div.css({top: top, left: left });
    }
    
  }
  //---------------------------- End Tooltip -----------------------------------

  $.iv.camel_case = function(name) {
    return name.replace(/\-(\w)/g, function(all, letter) {
      return letter.toUpperCase();
    });
  };

  $.iv.rgb_to_hex = function(r,g,b) {
    return $.iv.to_hex(r) + $.iv.to_hex(g) + $.iv.to_hex(b);
  };

  $.iv.to_hex = function(color) {
    color = parseInt(color).toString(16);
    return color.length<2?"0"+color:color;
  };
  
  $.iv.mouse_coord = function(e) {
    if (e.pageX || e.pageY) {
      return {x:e.pageX, y:e.pageY};
    }
    return {
      x:e.clientX + document.body.scrollLeft - document.body.clientLeft,
      y:e.clientY + document.body.scrollTop - document.body.clientTop
    };
  };

  $.fn.iv_ucfirst = function(options) {
    return this.each(function() {
      var str = this.value;
      if (options.lc == 1) {
        // Do it for each word in the string
        if (options.each_word == 1) {
          var pieces = str.split(" ");
          for ( var i = 0; i < pieces.length; i++ ) {
            pieces[i] = pieces[i].charAt(0).toUpperCase() + pieces[i].substring(1).toLowerCase();
          }
          this.value = pieces.join(" ");
        }
        // If string has a space, only convert if asked to
        else if (str.split(" ").length == 1 || options.spaces_ok == 1) {
          this.value = str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
        }
      }
      else {
        // Default action, only convert first char and leave rest alone
        this.value = str.charAt(0).toUpperCase() + str.substring(1);
      }
    });
  };

})(jQuery);

String.prototype.escapeHTML = function () {                                       
  return(                                                                 
    this.replace(/&/g,'&amp;').                                         
    replace(/>/g,'&gt;').                                           
    replace(/</g,'&lt;').                                           
    replace(/"/g,'&quot;')                                         
  );                                                                     
};
