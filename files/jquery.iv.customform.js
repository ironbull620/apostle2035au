(function($) {

  // Init customform
  $.fn.iv_customform = function (options) {
    return this.each(function() {
        new $.iv.customform(this, options);
    });
  };

  $.iv.customform = function (el, options) {
    var options = $.extend({
      required_message: '',
      number_message: '',
      phone_message: '',
      required_message: '',
      email_message: '',
      file_extension_message: 'file bad',
      decimal_a_message: '',
      decimal_b_message: '',
      regions: '',
      js_view: null,
      extension: '.html'
    }, options);

    var $$ = $(el);
    var $iframe;
    var errors = [];
    var regions = {}
    _init();
    
    function _init() {
      // Initialize regions
      regions = JSON.parse(decodeURIComponent(options.regions));
      $("select[linked]", $$).each(function () {
        var $select = $(this);
        var country_id = $(this).attr('linked');
        var $country_sel = $("#"+country_id);

        $country_sel.change(function () {
          var country = $("option:selected", $country_sel).text();
          // see if we have regions defined for country
          if (country && regions[country]) {
            var country_regions = regions[country];
            $select.empty();
            $select.append($("<option value=''></option>"));
            for (var j = 0; j < country_regions.length; j++) {
              var $option = $("<option value='"+country_regions[j]['id']+"'>"+country_regions[j]['name']+"</option>");
              // Set default value
              if ($select.attr('default_value') == country_regions[j]['name']) {
                $option.attr('selected', true);
              }
              $select.append($option);
            }
            $select.show().removeClass('disabled');
            $select.next().hide().addClass('disabled');
          }
          else {
            $select.empty();
            $select.hide().addClass('disabled');
            var $input = $select.next();
            $input.show().removeClass('disabled');
          }
        });

        $country_sel.change();        
      });

      // Add phone number
      $.validator.addMethod("phone", function (phone_number, element) {
        return phone_number.match(/^[0-9\(\)\- ]*$/);
      }, options.phone_message);
      // Add decimal number
      $.validator.addMethod("decimal", function (number, element) {
        var decimals = parseInt($(element).attr('decimal_places'));
        if (decimals > 0) {
          var regex = new RegExp("^\\d*\\.?\\d{0,"+decimals+"}$");
          return regex.test(number);
        } else {
          return number.match(/^[0-9]*$/);
        }
      }, function (result, element) {
        var decimals = parseInt($(element).attr('decimal_places'));
        if (decimals > 0) {
          return options.decimal_a_message + decimals + options.decimal_b_message + Array(decimals+1).join('1');
        } else {
          return options.number_message;
        }
      });
      // Check for valid extension (reject .exe .pif . bat .scr .lnk .com .vbs)
      $.validator.addMethod('file_upload', function (filename, element) {
        return ! filename.match(/\.(exe|pif|bat|scr|lnk|com|vbs)$/);
      }, options.file_extension_message);
      $.extend($.validator.messages, {
        required: options.required_message,
        email:    options.email_message
      });
      $$.validate({
        rules: {
          ".phone": {
            phone: true
          }
        },
        errorClass: "invalid"
      });
      $$.submit(_on_submit);

      // Enable/disable other option in radio & checkboxes
      $("input[other][type=radio]").each(function () {
        var input_other = this;
        var label = $(this).attr('name');
        $('input[name="'+label+'"]').change(function () {
          if ($(input_other).is(":checked")) {
            $(input_other).next().removeAttr("disabled").removeClass("disabled");
          } else {
            $(input_other).next().attr('disabled', 'disabled').addClass('disabled');
          }
        });
      }).change();
      $("input[other][type=checkbox]").change(function () {
        if ($(this).is(":checked")) {
          $(this).next().removeAttr("disabled").removeClass("disabled");
        } else {
          $(this).next().attr('disabled', 'disabled').addClass("disabled");
        }
      }).change();

      // If using javascript to display form, create iframe and set properties
      if (options.js_view) {
        var iframe_id = $$.attr('id')+'_iframe';
        $iframe = $('<iframe id="'+iframe_id+'" name="'+iframe_id+'" src="#"></iframe>').hide();
        $$.after($iframe);
        $$.attr('target', iframe_id);
        $$.attr('action', '/public/customform/js_view');
      }
    }

    function _on_submit () {
      if ($$.valid()) {

        // Check for prototype.js.  Prototype is conflicting and extending array's adding toJSON which
        // messes up the JSON.stringify call
        if (window.Prototype) {
          delete Array.prototype.toJSON;
        }

        // Group contact fields
        var contact_fields = $('[contact_field]', $$);
        var contact_groups = {};
        for (var i=0; i < contact_fields.length; i++) {
          var field = contact_fields[i];
          var cf_id = $(field).attr('contact_field');
          var column = $(field).attr('column_name');
          if (! contact_groups[cf_id]) { contact_groups[cf_id] = {} }
          contact_groups[cf_id][column] = $(field).attr('name');
        }
        if ($("input[name='_contact_groups']")[0]) {
          $("input[name='_contact_groups']").val(JSON.stringify(contact_groups));
        } else {
          $("<input />").attr('type', 'hidden')
            .attr('name', '_contact_groups')
            .attr('value', JSON.stringify(contact_groups))
            .appendTo($$);
        }

        // Mark country fields
        var $country_fields = $('[custom_country]', $$);
        var custom_countries = [];
        for (var i=0; i < $country_fields.length; i++) {
          var $field = $($country_fields[i]);
          custom_countries.push($field.attr('name'));
        }
        if ($("input[name='_custom_countries']", $$)[0]) {
          $("input[name='_custom_countries']", $$).val(JSON.stringify(custom_countries));
        } else {
          $("<input />").attr('type', 'hidden')
            .attr('name', '_custom_countries')
            .val(JSON.stringify(custom_countries))
            .appendTo($$);
        }

        // Mark state fields
        var $state_fields = $('[custom_state]', $$);
        var custom_states = [];
        for (var i=0; i < $state_fields.length; i++) {
          var $field = $($state_fields[i]);
          custom_states.push($field.attr('name'));
        }
        if ($("input[name='_custom_states']", $$)[0]) {
          $("input[name='_custom_states']", $$).val(JSON.stringify(custom_states));
        } else {
          $("<input />").attr('type', 'hidden')
            .attr('name', '_custom_states')
            .val(JSON.stringify(custom_states))
            .appendTo($$);
        }
        

        // Mark upload file fields
        var $upload_fields = $('input[type="file"]', $$);
        var uploads = [];
        for (var i=0; i < $upload_fields.length; i++) {
          var $field = $($upload_fields[i]);
          uploads.push($field.attr('name'));
        }
        if ($("input[name='_uploads']", $$)[0]) {
          $("input[name='_uploads']", $$).val(JSON.stringify(uploads));
        } else {
          $("<input />").attr('type', 'hidden')
            .attr('name', '_uploads')
            .val(JSON.stringify(uploads))
            .appendTo($$);
        }

        $(".disabled", $$).remove();

        // If using javascript for displaying forms, submit to iframe
        if (options.js_view) {
          var $iv = $$.parents('div[type="iv"]');

          // Add __data & __block_id
          $("<input />").attr('type', 'hidden')
            .attr('name', '__data')
            .val($iv.attr('data'))
            .appendTo($$);
          $("<input />").attr('type', 'hidden')
            .attr('name', '__block_id')
            .val($iv.attr('block_id'))
            .appendTo($$);

          // After iframe is loaded...
          $iframe.load(function () {
            var data = JSON.parse(decodeURIComponent($iv.attr('data')));
            var iframe_content = $iframe.contents().find('body');
            if (data['values']['confirm_message']) {
              $iv.html(iframe_content.html());
            }
            else if (data['values']['confirm_page']) {
              // We need to do some checking to see if file exists, if not, try ../page
              var page = data['values']['confirm_page'] + '.' + options.extension;
              $.ajax({
                url: page,
                type: "get",
                error: function () {
                  page = '../'+ page;
                  window.location = page;
                },
                success: function () {
                  window.location = page;
                }
              });
            }
            else if (data['values']['confirm_url']) {
              window.location = data['values']['confirm_url'];
            }
            else {
              // we shouldn't get here, but ...
              $iv.html('Form submitted');
            }
            $iframe.unbind('load');
            setTimeout(function () {
              iframe_content.html('');
            }, 1);
          });
        }
      }
    }

    function _check_number (value) {
      if (!isNaN(parseFloat(value)) && isFinite(value)) {
        return true;
      } else {
        return false;
      }
    }

    function _check_required (value) {
      if (value == '') {
        return false;
      } else {
        return true;
      }
    }
  };
  
})(jQuery);

  
